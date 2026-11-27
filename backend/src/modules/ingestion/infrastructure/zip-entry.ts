import { createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { pipeline, Readable, Transform } from 'node:stream';
import { crc32, createInflateRaw } from 'node:zlib';
import { SourceFileError } from '../domain/instruments-file';

const EOCD = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const EOCD_SIZE = 22;
const ZIP64_MARK = 0xffffffff;

interface Entry {
  readonly dataStart: number;
  readonly compressedSize: number;
  readonly size: number;
  readonly crc: number;
  readonly deflated: boolean;
}

/** Reads the central directory of a ZIP with exactly one file (the B3 COTAHIST): where its data is and how. */
async function singleEntry(path: string): Promise<Entry> {
  const file = await open(path, 'r');
  try {
    const { size: fileSize } = await file.stat();
    const tailSize = Math.min(fileSize, EOCD_SIZE + 0xffff);
    const tail = Buffer.alloc(tailSize);
    await file.read(tail, 0, tailSize, fileSize - tailSize);
    const eocd = tail.lastIndexOf(EOCD);
    if (eocd < 0) throw new SourceFileError(`${path} is not a ZIP file`);
    if (eocd + EOCD_SIZE > tail.length) {
      throw new SourceFileError(`${path} has a broken ZIP end record`);
    }
    const entries = tail.readUInt16LE(eocd + 10);
    if (entries !== 1) {
      throw new SourceFileError(`${path} has ${entries} files; expected one`);
    }
    const central = Buffer.alloc(46);
    await file.read(central, 0, 46, tail.readUInt32LE(eocd + 16));
    if (central.readUInt32LE(0) !== CENTRAL_SIGNATURE) {
      throw new SourceFileError(`${path} has a broken ZIP directory`);
    }
    const flags = central.readUInt16LE(8);
    const method = central.readUInt16LE(10);
    const compressedSize = central.readUInt32LE(20);
    const size = central.readUInt32LE(24);
    const localOffset = central.readUInt32LE(42);
    if ((flags & 1) !== 0 || (method !== 0 && method !== 8)) {
      throw new SourceFileError(`${path} is encrypted or not deflated`);
    }
    if ([compressedSize, size, localOffset].includes(ZIP64_MARK)) {
      throw new SourceFileError(`${path} is a ZIP64 file, not supported`);
    }
    const local = Buffer.alloc(30);
    await file.read(local, 0, 30, localOffset);
    if (local.readUInt32LE(0) !== LOCAL_SIGNATURE) {
      throw new SourceFileError(`${path} has a broken ZIP entry`);
    }
    return {
      dataStart:
        localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28),
      compressedSize,
      size,
      crc: central.readUInt32LE(16),
      deflated: method === 8,
    };
  } finally {
    await file.close();
  }
}

/**
 * Streams the content of a ZIP with one file, without unpacking it to disk or memory (the annual COTAHIST has about 1
 * GB). The downloaded file is untrusted: size and CRC-32 are checked against the directory, so a corrupt or lying
 * archive fails. The CRC is known only at the end: a reader that writes as it goes (LoadQuotes) has written the earlier
 * batches by then; they are real quotes of the file, and loading it again after the fix is safe.
 */
export async function openZipEntry(path: string): Promise<Readable> {
  const entry = await singleEntry(path);
  let bytes = 0;
  let crc = 0;
  const check = new Transform({
    transform(chunk: Buffer, _encoding, done) {
      bytes += chunk.length;
      crc = crc32(chunk, crc);
      done(
        bytes > entry.size
          ? new SourceFileError(
              `${path} has more data than its ZIP directory says`,
            )
          : null,
        chunk,
      );
    },
    flush(done) {
      done(
        bytes === entry.size && crc === entry.crc
          ? null
          : new SourceFileError(
              `${path} fails the ZIP size or CRC check: the file is corrupt`,
            ),
      );
    },
  });
  const data = createReadStream(path, {
    start: entry.dataStart,
    end: entry.dataStart + entry.compressedSize - 1,
  });
  const streams = entry.deflated
    ? [data, createInflateRaw(), check]
    : [data, check];
  // pipeline destroys `check` with the first error of any stream, so whoever reads it sees the error; the callback has
  // nothing left to do.
  pipeline(streams, () => undefined);
  return check;
}
