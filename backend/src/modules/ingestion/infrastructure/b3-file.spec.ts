import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readB3File } from './b3-file';

describe('readB3File (F9)', () => {
  it('decodes the B3 bytes as Windows-1252: accents as in the seed and 0x96 as an en dash, not a control character', () => {
    const dir = mkdtempSync(join(tmpdir(), 'b3-file-'));
    const path = join(dir, 'sample.csv');
    // "TELEFÔNICA" and "IMOB – RESPONS" as the Cadastro publishes them.
    writeFileSync(
      path,
      Buffer.from([
        0x54, 0x45, 0x4c, 0x45, 0x46, 0xd4, 0x4e, 0x49, 0x43, 0x41, 0x20, 0x96,
      ]),
    );
    try {
      expect(readB3File(path)).toBe('TELEFÔNICA –');
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
