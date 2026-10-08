import type { Library } from '../shared/library.js';

type Metadata = Record<string, unknown>;
interface SourceRow { id: string; ordinal: number; metadata: Metadata }
interface BookRow { id: string; source_id: string; metadata: Metadata }
interface ChapterRow { book_id: string; chapter_number: number; ordinal: number; metadata: Metadata }
interface VerseRow extends ChapterRow { verse_number: number; verse_text: string; source_start: number; source_end: number }
interface NoteSourceRow { note_id: string; source_id: string; ordinal: number }
interface QuoteRow extends NoteSourceRow { quote_text: string; source_start: number; source_end: number; metadata: Metadata }
interface PassageRow { note_id: string; ordinal: number; book_id: string; chapter_number: number; start_verse: number; end_verse: number; metadata: Metadata }
interface RelatedRow { note_id: string; related_id: string; ordinal: number }
export interface LibraryRecords {
  library_state: { book_id: string; metadata: Metadata }[];
  sources: SourceRow[];
  books: BookRow[];
  chapters: ChapterRow[];
  verses: VerseRow[];
  editorial_notes: SourceRow[];
  editorial_note_sources: NoteSourceRow[];
  editorial_quotes: QuoteRow[];
  editorial_passages: PassageRow[];
  editorial_related: RelatedRow[];
}

/** Extract only relational fields; retain all other (including future) metadata. */
export function normalizeLibrary(library: Library): LibraryRecords {
  const { book, sources, notes, ...metadata } = library;
  const { id: book_id, sourceId: source_id, chapters, ...bookMetadata } = book;
  const rows: LibraryRecords = {
    library_state: [{ book_id, metadata }],
    sources: sources.map(({ id, ...metadata }, ordinal) => ({ id, ordinal, metadata })),
    books: [{ id: book_id, source_id, metadata: bookMetadata }],
    chapters: [], verses: [], editorial_notes: [], editorial_note_sources: [],
    editorial_quotes: [], editorial_passages: [], editorial_related: [],
  };
  chapters.forEach(({ number: chapter_number, verses, ...metadata }, ordinal) => {
    rows.chapters.push({ book_id, chapter_number, ordinal, metadata });
    verses.forEach(({ number: verse_number, text: verse_text, sourceStart: source_start,
      sourceEnd: source_end, ...metadata }, ordinal) => {
      rows.verses.push({ book_id, chapter_number, verse_number, verse_text, source_start, source_end, ordinal, metadata });
    });
  });
  notes.forEach(({ id: note_id, quotes, passages, sourceIds, relatedIds, ...metadata }, ordinal) => {
    rows.editorial_notes.push({ id: note_id, ordinal, metadata });
    sourceIds.forEach((source_id, ordinal) => rows.editorial_note_sources.push({ note_id, source_id, ordinal }));
    relatedIds.forEach((related_id, ordinal) => rows.editorial_related.push({ note_id, related_id, ordinal }));
    passages.forEach(({ chapter: chapter_number, start: start_verse, end: end_verse, ...metadata }, ordinal) =>
      rows.editorial_passages.push({ note_id, book_id, chapter_number, start_verse, end_verse, ordinal, metadata }));
    quotes.forEach(({ sourceId: source_id, text: quote_text, sourceStart: source_start,
      sourceEnd: source_end, ...metadata }, ordinal) =>
      rows.editorial_quotes.push({ note_id, source_id, quote_text, source_start, source_end, ordinal, metadata }));
  });
  return rows;
}

const ordered = <T extends { ordinal: number }>(rows: T[]): T[] => [...rows].sort((a, b) => a.ordinal - b.ordinal);

/** Reconstruct from DB rows, never from files or a serialized fallback payload. */
export function reconstructLibrary(rows: LibraryRecords): Library {
  const state = rows.library_state[0];
  const book = rows.books.find(book => book.id === state?.book_id);
  if (!state || !book || !rows.chapters.length || !rows.verses.length) throw new Error('Library is not imported');
  return {
    ...state.metadata,
    book: {
      ...book.metadata, id: book.id, sourceId: book.source_id,
      chapters: ordered(rows.chapters.filter(c => c.book_id === book.id)).map(chapter => ({
        ...chapter.metadata, number: chapter.chapter_number,
        verses: ordered(rows.verses.filter(v => v.book_id === book.id && v.chapter_number === chapter.chapter_number))
          .map(v => ({ ...v.metadata, number: v.verse_number, text: v.verse_text, sourceStart: v.source_start, sourceEnd: v.source_end })),
      })),
    },
    sources: ordered(rows.sources).map(s => ({ ...s.metadata, id: s.id })),
    notes: ordered(rows.editorial_notes).map(note => ({
      ...note.metadata, id: note.id,
      sourceIds: ordered(rows.editorial_note_sources.filter(s => s.note_id === note.id)).map(s => s.source_id),
      relatedIds: ordered(rows.editorial_related.filter(r => r.note_id === note.id)).map(r => r.related_id),
      passages: ordered(rows.editorial_passages.filter(p => p.note_id === note.id)).map(p => ({
        ...p.metadata, chapter: p.chapter_number, start: p.start_verse, end: p.end_verse,
      })),
      quotes: ordered(rows.editorial_quotes.filter(q => q.note_id === note.id)).map(q => ({
        ...q.metadata, sourceId: q.source_id, text: q.quote_text, sourceStart: q.source_start, sourceEnd: q.source_end,
      })),
    })),
  } as Library;
}
