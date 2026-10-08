import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CommentaryCorpus } from '../shared/commentaries.js';
import { loadValidatedCommentaries } from './commentaries.js';

it('validates BOM-prefixed UTF-8 sections with Python Unicode character offsets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'commentary-bom-fixture-'));
  try {
    for (const directory of ['raw/commentaries', 'tools', 'data']) {
      await mkdir(path.join(root, directory), { recursive: true });
    }
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('A😀', 'utf8')]);
    const corpus: CommentaryCorpus = { schemaVersion: 1, gaps: [], works: [{
      id: 'bom-fixture', author: 'Fixture author', title: 'BOM fixture', edition: 'Test edition', translator: 'Test translator',
      coverage: 'Fixture only', completeness: 'Two test sections', rights: 'Synthetic test fixture',
      sourceUrl: 'https://example.invalid/bom-fixture', localPath: 'raw/commentaries/fixture.txt',
      sourceSha256: createHash('sha256').update(bytes).digest('hex'), sourceFormat: 'text', textPolicy: 'Exact UTF-8 text without BOM',
      sections: [
        { id: 'letter', title: 'Letter', kind: 'commentary', ordinal: 0, sourceStart: 0, sourceEnd: 1, genesisChapters: [1], text: 'A' },
        { id: 'supplementary', title: 'Supplementary character', kind: 'commentary', ordinal: 1, sourceStart: 1, sourceEnd: 2, genesisChapters: [1], text: '😀' },
      ],
    }] };
    const artifact = JSON.stringify(corpus);
    await writeFile(path.join(root, corpus.works[0].localPath), bytes);
    await writeFile(path.join(root, 'data/commentaries.json'), artifact);
    // Test-only reference check, not the canonical builder or a provenance authority.
    await writeFile(path.join(root, 'tools/build_commentaries.py'), [
      'import json, sys',
      'from pathlib import Path',
      "assert sys.argv[1:] == ['--check']",
      "work = json.loads(Path('data/commentaries.json').read_text(encoding='utf-8'))['works'][0]",
      "text = Path(work['localPath']).read_bytes().decode('utf-8-sig')",
      "assert text == 'A😀' and len(text) == 2",
      "for section in work['sections']:",
      "    assert text[section['sourceStart']:section['sourceEnd']] == section['text']",
      '',
    ].join('\n'));

    await expect(loadValidatedCommentaries(root)).resolves.toEqual({
      corpus, sha256: createHash('sha256').update(artifact).digest('hex'),
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
