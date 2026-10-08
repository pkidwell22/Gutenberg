import { describe, expect, it } from 'vitest';
import { loadValidatedCorpus } from './corpus.js';
import { normalizeLibrary, reconstructLibrary } from './records.js';

describe('lossless normalized records', () => {
  it('roundtrips every original field, source offset, array order, and exact CRLF', async () => {
    const { library } = await loadValidatedCorpus();
    // Unknown future metadata must not disappear at any normalization level.
    const enhanced = JSON.parse(JSON.stringify(library));
    enhanced.extra = { appendix: ['one', 'two'] };
    enhanced.book.extra = true;
    enhanced.book.chapters[0].extra = 'chapter';
    enhanced.book.chapters[0].verses[0].extra = { x: 1 };
    enhanced.notes[0].quotes[0].extra = ['quote'];
    enhanced.notes[0].passages[0].extra = false;
    const rows = normalizeLibrary(enhanced);
    expect(rows.verses).toHaveLength(1533);
    expect(rows.sources).toHaveLength(4);
    expect(rows.editorial_quotes).toHaveLength(12);
    expect(reconstructLibrary(rows)).toEqual(enhanced);
  });
});
