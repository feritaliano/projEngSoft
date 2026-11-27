import type { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';
import {
  COTAHIST_DAILY_TXT,
  COTAHIST_DAILY_ZIP,
  COTAHIST_LINES,
} from '../../../../test/factories/market-files.factory';
import type { WorkerEnv } from '../../../config/env';
import { FsRawFiles } from './fs-raw-files';
import { openZipEntry } from './zip-entry';

const collect = async (lines: AsyncIterable<string>) => {
  const all: string[] = [];
  for await (const line of lines) all.push(line);
  return all;
};

describe('FsRawFiles and openZipEntry (bronze zone, K6)', () => {
  let root: string;
  let raw: FsRawFiles;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'k6-raw-'));
    raw = new FsRawFiles({
      get: () => root,
    } as unknown as ConfigService<WorkerEnv, true>);
  });

  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it('saves a download once, named with its SHA-256 under <folder>/<year>/', async () => {
    const bytes = Buffer.from('conteúdo', 'latin1');
    const sha = createHash('sha256').update(bytes).digest('hex');

    const file = await raw.save('b3-cotahist', 2026, {
      fileName: 'COTAHIST_D25112026.ZIP',
      bytes,
    });
    const before = statSync(file.path).mtimeMs;
    const again = await raw.save('b3-cotahist', 2026, {
      fileName: 'COTAHIST_D25112026.ZIP',
      bytes,
    });

    expect(file).toEqual({
      path: join(root, `b3-cotahist/2026/COTAHIST_D25112026_${sha}.ZIP`),
      name: `b3-cotahist/2026/COTAHIST_D25112026_${sha}.ZIP`,
      sha256: sha,
    });
    expect(readFileSync(file.path)).toEqual(bytes);
    expect(again).toEqual(file);
    expect(statSync(file.path).mtimeMs).toBe(before);
  });

  it.each([
    ['../escape', 'f.zip'],
    ['b3-cotahist', '../../f.zip'],
  ])('refuses an unsafe path (%s, %s)', async (folder, fileName) => {
    await expect(
      raw.save(folder, 2026, { fileName, bytes: new Uint8Array() }),
    ).rejects.toThrow('Unsafe bronze path');
  });

  it('fails when the bronze folder cannot be read', async () => {
    writeFileSync(join(root, 'b3-cotahist'), 'a file where a folder should be');

    await expect(
      raw.save('b3-cotahist', 2026, {
        fileName: 'f.zip',
        bytes: new Uint8Array([1]),
      }),
    ).rejects.toThrow();
  });

  it('opens a local file with its hash', async () => {
    const file = await raw.open(COTAHIST_DAILY_TXT);

    expect(file.name).toBe('COTAHIST_D25112026.sample.TXT');
    expect(file.sha256).toBe(
      createHash('sha256')
        .update(readFileSync(COTAHIST_DAILY_TXT))
        .digest('hex'),
    );
  });

  it('fails to open a missing file', async () => {
    await expect(raw.open(join(root, 'missing.zip'))).rejects.toThrow(/ENOENT/);
  });

  it('reads the lines of a COTAHIST from the TXT and from the ZIP alike', async () => {
    const fromTxt = await collect(
      raw.lines(await raw.open(COTAHIST_DAILY_TXT)),
    );
    const fromZip = await collect(
      raw.lines(await raw.open(COTAHIST_DAILY_ZIP)),
    );

    expect(fromTxt).toEqual(COTAHIST_LINES);
    expect(fromZip).toEqual(COTAHIST_LINES);
  });

  it('reads CRLF lines and a last line without newline', async () => {
    const path = join(root, 'crlf.TXT');
    writeFileSync(path, 'a\r\nb\r\nc');

    expect(await collect(raw.lines(await raw.open(path)))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('reads Latin-1 text as Windows-1252 (F9) and refuses invalid UTF-8', async () => {
    const latin = join(root, 'latin.csv');
    writeFileSync(latin, Buffer.from([0x4d, 0xcd, 0x4e, 0x96]));
    const file = await raw.open(latin);

    expect(await raw.readText(file, 'latin1')).toBe('MÍN–');
    await expect(raw.readText(file, 'utf8')).rejects.toThrow(
      'latin.csv is not valid UTF-8',
    );
  });

  it('propagates a read error that is not about the encoding', async () => {
    await expect(
      raw.readText(
        { path: join(root, 'missing'), name: 'missing', sha256: '' },
        'utf8',
      ),
    ).rejects.toThrow(/ENOENT/);
  });

  describe('openZipEntry (untrusted archives)', () => {
    const zip = readFileSync(COTAHIST_DAILY_ZIP);
    const write = (bytes: Buffer) => {
      const path = join(root, 'x.zip');
      writeFileSync(path, bytes);
      return path;
    };
    const read = async (path: string) => {
      const chunks: Buffer[] = [];
      for await (const chunk of await openZipEntry(path))
        chunks.push(chunk as Buffer);
      return Buffer.concat(chunks);
    };
    /** Offset of the central directory entry of the fixture. */
    const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));

    it('fails a corrupt archive on the CRC check', async () => {
      const corrupt = Buffer.from(zip);
      corrupt.writeUInt32LE(
        (corrupt.readUInt32LE(central + 16) + 1) >>> 0,
        central + 16,
      );

      await expect(read(write(corrupt))).rejects.toThrow(
        'fails the ZIP size or CRC check',
      );
    });

    it('fails an archive with more data than its directory says', async () => {
      const lying = Buffer.from(zip);
      lying.writeUInt32LE(10, central + 24);

      await expect(read(write(lying))).rejects.toThrow(
        'has more data than its ZIP directory says',
      );
    });

    it('fails an archive cut inside its end record', async () => {
      const cut = Buffer.concat([
        Buffer.alloc(30),
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        Buffer.alloc(4),
      ]);

      await expect(openZipEntry(write(cut))).rejects.toThrow(
        'has a broken ZIP end record',
      );
    });

    it('fails a file that is not a ZIP', async () => {
      await expect(openZipEntry(COTAHIST_DAILY_TXT)).rejects.toThrow(
        'is not a ZIP file',
      );
    });

    it('fails an archive with more than one file', async () => {
      const two = Buffer.from(zip);
      const eocd = two.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
      two.writeUInt16LE(2, eocd + 10);

      await expect(openZipEntry(write(two))).rejects.toThrow(
        'has 2 files; expected one',
      );
    });

    it.each([
      [
        'a broken directory',
        (b: Buffer) => b.writeUInt32LE(0, central),
        'has a broken ZIP directory',
      ],
      [
        'an encrypted entry',
        (b: Buffer) => b.writeUInt16LE(1, central + 8),
        'is encrypted or not deflated',
      ],
      [
        'another method',
        (b: Buffer) => b.writeUInt16LE(12, central + 10),
        'is encrypted or not deflated',
      ],
      [
        'ZIP64 sizes',
        (b: Buffer) => b.writeUInt32LE(0xffffffff, central + 24),
        'is a ZIP64 file',
      ],
      [
        'a broken local entry',
        (b: Buffer) => b.writeUInt32LE(0, 0),
        'has a broken ZIP entry',
      ],
    ])('fails %s', async (_case, change, message) => {
      const bytes = Buffer.from(zip);
      change(bytes);

      await expect(openZipEntry(write(bytes))).rejects.toThrow(message);
    });

    it('reads a stored (not deflated) entry', async () => {
      const text = Buffer.from('00COTAHIST\n99COTAHIST\n');
      const stored = storedZip('a.TXT', text);

      expect(await read(write(stored))).toEqual(text);
    });
  });
});

/** A minimal ZIP with one stored entry (method 0). */
function storedZip(name: string, data: Buffer): Buffer {
  const nameBytes = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt32LE(crc32(data), 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  const centralOffset = 30 + nameBytes.length + data.length;
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt32LE(crc32(data), 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(0, 42);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + nameBytes.length, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, nameBytes, data, central, nameBytes, eocd]);
}
