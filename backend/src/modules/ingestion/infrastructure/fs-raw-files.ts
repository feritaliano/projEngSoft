import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import type { Readable } from 'node:stream';
import type { WorkerEnv } from '../../../config/env';
import {
  type Download,
  RawFiles,
  type SourceFile,
} from '../domain/ingestion-run';
import { SourceFileError } from '../domain/instruments-file';
import { openZipEntry } from './zip-entry';

/** Folder and file names come from the adapters; anything else is refused before touching the disk. */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

function sha256Of(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** Lines of a Latin-1 text stream (CRLF or LF), without holding the whole file. */
async function* splitLines(stream: Readable): AsyncIterable<string> {
  stream.setEncoding('latin1');
  let rest = '';
  for await (const chunk of stream as AsyncIterable<string>) {
    const parts = (rest + chunk).split('\n');
    rest = parts.pop() ?? '';
    for (const part of parts) yield part.replace(/\r$/, '');
  }
  if (rest !== '') yield rest.replace(/\r$/, '');
}

/**
 * The bronze zone on disk (arquitetura 3.1) under RAW_DATA_DIR: files as downloaded, immutable, named with the SHA-256 so
 * two versions of a file never overwrite each other. The one exception is the IBOV CSV, saved decoded from the base64 of
 * the answer, as the Download button of the B3 page delivers it (HttpMarketSources.ibovYear).
 */
@Injectable()
export class FsRawFiles extends RawFiles {
  private readonly root: string;

  constructor(config: ConfigService<WorkerEnv, true>) {
    super();
    this.root = config.get('RAW_DATA_DIR', { infer: true });
  }

  async save(
    folder: string,
    year: number,
    download: Download,
  ): Promise<SourceFile> {
    if (!SAFE_NAME.test(folder) || !SAFE_NAME.test(download.fileName)) {
      throw new Error(`Unsafe bronze path: ${folder}/${download.fileName}`);
    }
    const sha256 = createHash('sha256').update(download.bytes).digest('hex');
    const extension = extname(download.fileName);
    const name = `${folder}/${year}/${basename(download.fileName, extension)}_${sha256}${extension}`;
    const path = join(this.root, name);
    const exists = await stat(path).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return false;
        throw error;
      },
    );
    if (!exists) {
      await mkdir(join(this.root, folder, String(year)), { recursive: true });
      // Written aside and renamed: a crash never leaves a half file under the final name.
      const partial = `${path}.partial`;
      await writeFile(partial, download.bytes);
      await rename(partial, path);
    }
    return { path, name, sha256 };
  }

  async open(path: string): Promise<SourceFile> {
    return { path, name: basename(path), sha256: await sha256Of(path) };
  }

  async readText(
    file: SourceFile,
    encoding: 'latin1' | 'utf8',
  ): Promise<string> {
    const bytes = await readFile(file.path);
    // B3 "Latin-1" is Windows-1252 in practice (F9); the WHATWG label "latin1" decodes it so, and never fails.
    if (encoding === 'latin1') return new TextDecoder('latin1').decode(bytes);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      // The only error of a fatal decoder: bytes that are not UTF-8.
      throw new SourceFileError(`${file.name} is not valid UTF-8`);
    }
  }

  async *lines(file: SourceFile): AsyncIterable<string> {
    const stream = /\.zip$/i.test(file.path)
      ? await openZipEntry(file.path)
      : createReadStream(file.path);
    yield* splitLines(stream);
  }
}
