import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Library } from '../shared/library.js';

export const applicationRoot = fileURLToPath(new URL('../', import.meta.url));
export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const execute = promisify(execFile);

/** The generator emits a single assignment whose RHS is JSON, never code. */
export function parseGeneratedLibrary(text: string): Library {
  const match = /^window\.SCRIPTURE_LIBRARY\s*=\s*([\s\S]+);\s*$/.exec(text);
  if (!match) throw new Error('Invalid generated corpus wrapper');
  const value = JSON.parse(match[1]) as Library;
  if (!value || value.schemaVersion !== 1 || !value.book?.id ||
      !Array.isArray(value.book.chapters) || !Array.isArray(value.sources) || !Array.isArray(value.notes)) {
    throw new Error('Invalid corpus shape');
  }
  return value;
}

export async function loadValidatedCorpus(root = repositoryRoot) {
  // Read before and after validation to reject an artifact changed during validation.
  const filename = `${root}/data/library.js`;
  const before = await readFile(filename);
  await execute('python3', [`${root}/tools/build_corpus.py`, '--check'], {
    cwd: root, timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  const after = await readFile(filename);
  if (!before.equals(after)) throw new Error('Corpus changed during validation');
  return { library: parseGeneratedLibrary(after.toString('utf8')),
    sha256: createHash('sha256').update(after).digest('hex') };
}
