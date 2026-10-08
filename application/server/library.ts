import type { Pool, PoolClient } from 'pg';
import { loadValidatedCorpus, repositoryRoot } from './corpus.js';
import { migrate, withWriteTransaction } from './migrate.js';
import { normalizeLibrary, reconstructLibrary, type LibraryRecords } from './records.js';

type CorpusTable = Exclude<keyof LibraryRecords, 'library_state'>;
// SQL identifiers come only from these source-code constants, never corpus data or HTTP input.
const tables: Record<CorpusTable, { columns: string[]; keys: string[] }> = {
  sources: { columns: ['id', 'ordinal', 'metadata'], keys: ['id'] },
  books: { columns: ['id', 'source_id', 'metadata'], keys: ['id'] },
  chapters: { columns: ['book_id', 'chapter_number', 'ordinal', 'metadata'], keys: ['book_id', 'chapter_number'] },
  verses: { columns: ['book_id', 'chapter_number', 'verse_number', 'ordinal', 'verse_text', 'source_start', 'source_end', 'metadata'], keys: ['book_id', 'chapter_number', 'verse_number'] },
  editorial_notes: { columns: ['id', 'ordinal', 'metadata'], keys: ['id'] },
  editorial_note_sources: { columns: ['note_id', 'source_id', 'ordinal'], keys: ['note_id', 'source_id'] },
  editorial_quotes: { columns: ['note_id', 'ordinal', 'source_id', 'quote_text', 'source_start', 'source_end', 'metadata'], keys: ['note_id', 'ordinal'] },
  editorial_passages: { columns: ['note_id', 'ordinal', 'book_id', 'chapter_number', 'start_verse', 'end_verse', 'metadata'], keys: ['note_id', 'ordinal'] },
  editorial_related: { columns: ['note_id', 'related_id', 'ordinal'], keys: ['note_id', 'ordinal'] },
};
const tableNames = Object.keys(tables) as CorpusTable[];

async function upsert(client: PoolClient, table: CorpusTable, rows: LibraryRecords[CorpusTable]) {
  const { columns, keys } = tables[table];
  const updates = columns.filter(c => !keys.includes(c)).map(c => `${c} = EXCLUDED.${c}`);
  await client.query(`INSERT INTO ${table} (${columns.join(', ')})
    SELECT ${columns.join(', ')} FROM jsonb_populate_recordset(NULL::${table}, $1::jsonb)
    ON CONFLICT (${keys.join(', ')}) DO UPDATE SET ${updates.join(', ')}`, [JSON.stringify(rows)]);
}

/** Always validates frozen sources and artifacts before any database write. */
export async function importCorpus(pool: Pool, root = repositoryRoot) {
  const { library, sha256 } = await loadValidatedCorpus(root);
  const records = normalizeLibrary(library);
  await migrate(pool);
  await withWriteTransaction(pool, async client => {
    // Imported editorial material has no ownership relationship to personal annotations.
    await client.query('DELETE FROM editorial_notes');
    for (const table of tableNames) await upsert(client, table, records[table]);
    await client.query(`INSERT INTO library_state (singleton, book_id, metadata, corpus_sha256)
      VALUES (true, $1, $2::jsonb, $3)
      ON CONFLICT (singleton) DO UPDATE SET book_id = EXCLUDED.book_id,
      metadata = EXCLUDED.metadata, corpus_sha256 = EXCLUDED.corpus_sha256, imported_at = now()`,
    [records.library_state[0].book_id, JSON.stringify(records.library_state[0].metadata), sha256]);
    // Remove stale corpus rows in dependency order; annotated verses cannot be removed.
    for (const table of ['verses', 'chapters', 'books', 'sources'] as const) {
      const match = tables[table].keys.map(k => `incoming.${k} = existing.${k}`).join(' AND ');
      await client.query(`DELETE FROM ${table} existing WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_populate_recordset(NULL::${table}, $1::jsonb) incoming WHERE ${match}
      )`, [JSON.stringify(records[table])]);
    }
  });
  return { chapters: records.chapters.length, verses: records.verses.length,
    sources: records.sources.length, notes: records.editorial_notes.length, quotes: records.editorial_quotes.length };
}

/** Repeatable-read prevents a multi-table response mixing two concurrent imports. */
export async function readLibrary(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const records = {} as LibraryRecords;
    for (const table of ['library_state', ...tableNames] as const) {
      const result = await client.query(`SELECT * FROM ${table}`);
      Object.assign(records, { [table]: result.rows });
    }
    const library = reconstructLibrary(records);
    await client.query('COMMIT');
    return library;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
