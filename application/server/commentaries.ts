import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import type { Pool } from 'pg';
import type { CommentaryCatalog, CommentaryCorpus, CommentaryWork, CommentarySearchResponse } from '../shared/commentaries.js';
import { repositoryRoot } from './corpus.js';
import { migrate, withWriteTransaction } from './migrate.js';

const normalizeWhitespace = (text: string) => text.replace(/\s+/gu, ' ').trim();
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const validCommentaryId = (id: unknown): id is string => typeof id === 'string' && id.length <= 200 && slug.test(id);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');
const validUrl = (value: unknown) => {
  try { return nonempty(value) && ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
};
function assertValid(condition: unknown): asserts condition {
  if (!condition) throw new Error('Invalid commentary corpus or provenance');
}

async function validateCorpus(corpus: CommentaryCorpus, root: string) {
  assertValid(corpus?.schemaVersion === 1 && Array.isArray(corpus.works) && Array.isArray(corpus.gaps));
  for (const gap of corpus.gaps) assertValid(gap && nonempty(gap.author) && nonempty(gap.title) && nonempty(gap.reason) && (gap.sourceUrl === undefined || validUrl(gap.sourceUrl)));
  const ids = new Set<string>();
  for (const work of corpus.works) {
    assertValid(work && validCommentaryId(work.id) && !ids.has(work.id)); ids.add(work.id);
    for (const key of ['author', 'title', 'edition', 'translator', 'coverage', 'completeness', 'rights', 'textPolicy'] as const) assertValid(nonempty(work[key]));
    assertValid(validUrl(work.sourceUrl) && /^[0-9a-f]{64}$/.test(work.sourceSha256));
    assertValid(['text', 'html'].includes(work.sourceFormat) && Array.isArray(work.sections));
    assertValid(typeof work.localPath === 'string' && work.localPath.startsWith('raw/') && !/[\\\u0000]/.test(work.localPath) && work.localPath.split('/').every(part => part && !part.startsWith('.')));
    const rawRoot = await realpath(path.join(root, 'raw'));
    const filename = await realpath(path.join(root, work.localPath));
    assertValid(filename.startsWith(rawRoot + path.sep));
    const bytes = await readFile(filename);
    assertValid(createHash('sha256').update(bytes).digest('hex') === work.sourceSha256);
    // HTML extraction fidelity is checked by the canonical Python builder above.
    const chars = work.sourceFormat === 'text' ? [...new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)] : undefined;
    const sectionIds = new Set<string>();
    let end = 0;
    let ordinal = -1;
    for (const section of work.sections) {
      assertValid(section && validCommentaryId(section.id) && !sectionIds.has(section.id)); sectionIds.add(section.id);
      assertValid(nonempty(section.title) && ['frontmatter', 'commentary', 'meditation', 'treatise'].includes(section.kind));
      assertValid(Number.isSafeInteger(section.ordinal) && section.ordinal > ordinal); ordinal = section.ordinal;
      assertValid(Number.isSafeInteger(section.sourceStart) && section.sourceStart >= end && Number.isSafeInteger(section.sourceEnd) && section.sourceEnd > section.sourceStart); end = section.sourceEnd;
      assertValid(nonempty(section.text) && [...section.text].length === section.sourceEnd - section.sourceStart);
      assertValid(Array.isArray(section.genesisChapters) && section.genesisChapters.every(chapter => Number.isInteger(chapter) && chapter >= 1 && chapter <= 50));
      if (chars) assertValid(section.sourceEnd <= chars.length && chars.slice(section.sourceStart, section.sourceEnd).join('') === section.text);
    }
  }
}

export async function loadValidatedCommentaries(root = repositoryRoot) {
  const filename = `${root}/data/commentaries.json`;
  const before = await readFile(filename);
  await promisify(execFile)('python3', [`${root}/tools/build_commentaries.py`, '--check'], {
    cwd: root, timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  const after = await readFile(filename);
  if (!before.equals(after)) throw new Error('Commentary corpus changed during validation');
  const corpus = JSON.parse(after.toString('utf8')) as CommentaryCorpus;
  await validateCorpus(corpus, root);
  return { corpus, sha256: createHash('sha256').update(after).digest('hex') };
}

/** Validation precedes all writes; only independent commentary tables are replaced. */
export async function importCommentaries(pool: Pool, root = repositoryRoot) {
  const { corpus, sha256 } = await loadValidatedCommentaries(root);
  await migrate(pool);
  await withWriteTransaction(pool, async client => {
    await client.query('DELETE FROM commentary_works');
    for (const [ordinal, work] of corpus.works.entries()) {
      const { sections, ...metadata } = work;
      await client.query('INSERT INTO commentary_works(id, ordinal, metadata) VALUES ($1,$2,$3::jsonb)',
        [work.id, ordinal, JSON.stringify(metadata)]);
      for (const section of sections) {
        const { text, ...summary } = section;
        await client.query(`INSERT INTO commentary_sections(work_id,id,ordinal,metadata,section_text,search_text)
          VALUES ($1,$2,$3,$4::jsonb,$5,$6)`, [work.id, section.id, section.ordinal, JSON.stringify(summary), text, normalizeWhitespace(text)]);
      }
    }
    await client.query(`INSERT INTO commentary_state(singleton,schema_version,gaps,corpus_sha256)
      VALUES (true,1,$1::jsonb,$2) ON CONFLICT(singleton) DO UPDATE SET
      gaps=EXCLUDED.gaps, corpus_sha256=EXCLUDED.corpus_sha256, imported_at=now()`, [JSON.stringify(corpus.gaps), sha256]);
  });
  return { works: corpus.works.length, sections: corpus.works.reduce((sum, work) => sum + work.sections.length, 0) };
}

/** One statement gives a consistent snapshot even during concurrent imports. */
async function readCorpus(pool: Pool, includeText: boolean, id?: string): Promise<CommentaryCorpus> {
  const { rows } = await pool.query(`SELECT schema_version, gaps,
    COALESCE((SELECT jsonb_agg(w.metadata || jsonb_build_object('sections',
      COALESCE((SELECT jsonb_agg(s.metadata || CASE WHEN $1 THEN jsonb_build_object('text', s.section_text)
        ELSE '{}'::jsonb END ORDER BY s.ordinal) FROM commentary_sections s WHERE s.work_id=w.id), '[]'::jsonb))
      ORDER BY w.ordinal) FROM commentary_works w WHERE ($2::text IS NULL OR w.id=$2)), '[]'::jsonb) AS works
    FROM commentary_state WHERE singleton`, [includeText, id ?? null]);
  if (rows.length !== 1) throw new Error('Commentaries not imported');
  return { schemaVersion: rows[0].schema_version, works: rows[0].works, gaps: rows[0].gaps };
}
export async function readCommentaryCatalog(pool: Pool): Promise<CommentaryCatalog> {
  return readCorpus(pool, false);
}
/** Literal substring matching: no LIKE wildcards, regex, stemming, or semantic search. */
export async function searchCommentaries(pool: Pool, query: string, workId?: string): Promise<CommentarySearchResponse> {
  if (typeof query !== 'string' || query.length > 500 || query.includes('\0') || (workId !== undefined && !validCommentaryId(workId))) {
    throw new Error('Invalid commentary search');
  }
  const normalized = normalizeWhitespace(query);
  const { rows } = await pool.query(`WITH matches AS MATERIALIZED (
    SELECT w.id AS work_id, w.ordinal AS work_ordinal, w.metadata AS work_metadata,
      s.id AS section_id, s.ordinal AS section_ordinal, s.metadata AS section_metadata,
      substring(s.search_text FROM greatest(1, strpos(lower(s.search_text), lower($1)) - 80) FOR 680) AS snippet
    FROM commentary_sections s JOIN commentary_works w ON w.id=s.work_id
    WHERE $1 <> '' AND ($2::text IS NULL OR w.id=$2) AND strpos(lower(s.search_text), lower($1)) > 0
  ) SELECT (SELECT count(*)::integer FROM matches) AS total,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('workId', m.work_id, 'workTitle', m.work_metadata->>'title',
      'author', m.work_metadata->>'author', 'sectionId', m.section_id, 'sectionTitle', m.section_metadata->>'title',
      'snippet', m.snippet) ORDER BY m.work_ordinal, m.section_ordinal)
      FROM (SELECT * FROM matches ORDER BY work_ordinal, section_ordinal LIMIT 50) m), '[]'::jsonb) AS results
    FROM commentary_state WHERE singleton`, [normalized, workId ?? null]);
  if (rows.length !== 1) throw new Error('Commentaries not imported');
  return { query: normalized, total: rows[0].total, results: rows[0].results, limited: rows[0].total > 50 };
}

export async function readCommentaryWork(pool: Pool, id: string): Promise<CommentaryWork | null> {
  return (await readCorpus(pool, true, id)).works[0] ?? null;
}
