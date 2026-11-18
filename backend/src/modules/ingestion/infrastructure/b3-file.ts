import { readFileSync } from 'node:fs';

/**
 * B3 files (Cadastro de Instrumentos, COTAHIST) are Latin-1 in practice Windows-1252 (F9): byte 0x96 is "–". Read as
 * UTF-8, "TELEFÔNICA" would not match the seed; read as ISO-8859-1, "–" would become an invisible control character.
 * The WHATWG label "latin1" decodes as Windows-1252.
 */
export function readB3File(path: string): string {
  return new TextDecoder('latin1').decode(readFileSync(path));
}
