import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { parseGeneratedLibrary, loadValidatedCorpus, repositoryRoot } from './corpus.js';

describe('frozen corpus boundary', () => {
  it('parses generated JSON without executing JavaScript and preserves CRLF', async () => {
    const text = await readFile(`${repositoryRoot}/data/library.js`, 'utf8');
    const library = parseGeneratedLibrary(text);
    expect(library.book.chapters).toHaveLength(50);
    expect(library.book.chapters.flatMap(c => c.verses)).toHaveLength(1533);
    expect(library.book.chapters.flatMap(c => c.verses).some(v => v.text.includes('\r\n'))).toBe(true);
    expect(() => parseGeneratedLibrary('window.SCRIPTURE_LIBRARY = (() => { throw 1; })();')).toThrow();
    expect(() => parseGeneratedLibrary(text + '\nprocess.exit()')).toThrow();
  });
  it('runs the read-only Python validator before accepting the real corpus', async () => {
    const result = await loadValidatedCorpus();
    expect(result.library.notes).toHaveLength(4);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
