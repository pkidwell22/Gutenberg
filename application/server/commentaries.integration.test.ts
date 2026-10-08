import { describe, expect, it } from 'vitest';
import { config } from 'dotenv';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { CommentaryCorpus } from '../shared/commentaries.js';
import { importCommentaries, readCommentaryCatalog, readCommentaryWork, loadValidatedCommentaries } from './commentaries.js';
import { importCorpus, readLibrary } from './library.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import { applicationRoot, repositoryRoot } from './corpus.js';
import { createApp } from './app.js';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { migrate } from './migrate.js';

async function withHttp(pool: pg.Pool, root: string, work: (request: (pathname: string, headers?: Record<string, string>, method?: string) => Promise<Response>) => Promise<void>) {
  const server = createApp(pool, { corpusRoot: root }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const request = (pathname: string, headers: Record<string, string> = {}, method = 'GET') => new Promise<Response>((resolve, reject) => {
    const outgoing = httpRequest(base + pathname, { method, headers: { host: '127.0.0.1:64819', ...headers } }, incoming => {
      const chunks: Buffer[] = [];
      incoming.on('data', chunk => chunks.push(Buffer.from(chunk)));
      incoming.on('error', reject);
      incoming.on('end', () => resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers: incoming.headers as Record<string, string> })));
    });
    outgoing.on('error', reject); outgoing.end();
  });
  try { await work(request); }
  finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}

config({ path: `${applicationRoot}/.env`, quiet: true });
const url = process.env.TEST_DATABASE_URL;
async function isolated(work: (pool: pg.Pool) => Promise<void>) {
  const admin = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
  const schema = `commentary_test_${randomUUID().replaceAll('-', '')}`;
  let pool: pg.Pool | undefined;
  let created = false;
  try {
    if ((await admin.query('SELECT current_database() AS name')).rows[0].name !== 'scripture_library_test') {
      throw new Error('Refusing tests outside dedicated test database');
    }
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, connectionTimeoutMillis: 3000 });
    await work(pool);
  } finally {
    await pool?.end();
    if (created) {
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      expect((await admin.query('SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS present', [schema])).rows[0].present).toBe(false);
    }
    await admin.end();
  }
}

const fixtureText = 'Fixture 😀 exact — beginning\n\nLiteral 100% _ \\ [x].\n';
function fixtureCorpus(): CommentaryCorpus {
  return { schemaVersion: 1, gaps: [{ author: 'Fixture author', title: 'Absent fixture', reason: 'Test-only gap' }], works: [{
    id: 'fixture-work', author: 'Fixture author', title: 'Fixture work', edition: 'Test edition', translator: 'Test translator',
    coverage: 'Fixture only', completeness: 'One test section', rights: 'Synthetic test fixture', sourceUrl: 'https://example.invalid/fixture',
    localPath: 'raw/commentaries/fixture.txt', sourceSha256: createHash('sha256').update(fixtureText).digest('hex'), sourceFormat: 'text', textPolicy: 'Exact decoded UTF-8 text',
    sections: [{ id: 'section-one', title: 'Fixture section', kind: 'commentary', ordinal: 0, sourceStart: 0, sourceEnd: [...fixtureText].length, genesisChapters: [1], text: fixtureText }],
  }] };
}
async function fixture(work: (root: string, corpus: CommentaryCorpus) => Promise<void>) {
  const root = await mkdtemp(path.join(tmpdir(), 'commentary-fixture-'));
  try {
    for (const directory of ['raw/commentaries', 'tools', 'data']) await mkdir(path.join(root, directory), { recursive: true });
    const corpus = fixtureCorpus();
    await writeFile(path.join(root, corpus.works[0].localPath), fixtureText);
    await writeFile(path.join(root, 'data/commentaries.json'), JSON.stringify(corpus));
    // This fixture check is NOT the canonical corpus builder or a provenance authority.
    await writeFile(path.join(root, 'tools/build_commentaries.py'), "import sys\nassert sys.argv[1:] == ['--check']\n");
    await work(root, corpus);
  } finally { await rm(root, { recursive: true, force: true }); }
}

describe.skipIf(!url)('commentary PostgreSQL (random test schema only)', () => {
  it('imports exact fixture sections and provenance and reads catalog without text', async () => isolated(async pool => fixture(async (root, corpus) => {
    await importCommentaries(pool, root);
    expect(await readCommentaryWork(pool, 'fixture-work')).toEqual(corpus.works[0]);
    const catalog = await readCommentaryCatalog(pool);
    const { text: _text, ...summary } = corpus.works[0].sections[0];
    expect(catalog).toEqual({ ...corpus, works: [{ ...corpus.works[0], sections: [summary] }] });
    expect(await readCommentaryWork(pool, 'missing')).toBeNull();
  })));

  it('rejects invalid provenance or corpus before database writes', async () => isolated(async pool => fixture(async (root, corpus) => {
    await migrate(pool);
    await writeFile(path.join(root, corpus.works[0].localPath), 'tampered');
    await expect(importCommentaries(pool, root)).rejects.toThrow();
    expect((await pool.query('SELECT * FROM commentary_state')).rows).toEqual([]);
    await writeFile(path.join(root, corpus.works[0].localPath), fixtureText);
    const mutations = [
      (c: CommentaryCorpus) => { c.schemaVersion = 2 as 1; },
      (c: CommentaryCorpus) => { c.works[0].localPath = 'raw/../application/.env'; },
      (c: CommentaryCorpus) => { c.works[0].id = 'UPPER'; },
      (c: CommentaryCorpus) => { c.works[0].sections[0].text += 'invented'; },
      (c: CommentaryCorpus) => { c.works[0].sections[0].sourceEnd++; },
      (c: CommentaryCorpus) => { c.works[0].sections[0].genesisChapters = [51]; },
      (c: CommentaryCorpus) => { c.works[0].sections.push({ ...c.works[0].sections[0], id: 'overlap', ordinal: 1 }); },
      (c: CommentaryCorpus) => { c.gaps[0].reason = ''; },
    ];
    for (const mutate of mutations) {
      const invalid = structuredClone(corpus); mutate(invalid);
      await writeFile(path.join(root, 'data/commentaries.json'), JSON.stringify(invalid));
      await expect(importCommentaries(pool, root)).rejects.toThrow();
      expect((await pool.query('SELECT * FROM commentary_state')).rows).toEqual([]);
    }
  })));

  it('serves read-only catalog/detail with distinct unimported, empty, missing and failure states', async () => isolated(async pool => fixture(async (root, corpus) => withHttp(pool, root, async request => {
    expect((await request('/api/commentaries')).status).toBe(503);
    await migrate(pool);
    expect((await request('/api/commentaries')).status).toBe(503);
    await importCommentaries(pool, root);
    const catalog = await request('/api/commentaries');
    expect(catalog.status).toBe(200);
    expect(await catalog.json()).toEqual(await readCommentaryCatalog(pool));
    expect(catalog.headers.get('cache-control')).toBe('no-store');
    expect(await (await request('/api/commentaries/fixture-work')).json()).toEqual(corpus.works[0]);
    expect((await request('/api/commentaries/missing')).status).toBe(404);
    expect((await request('/api/commentaries/UPPER')).status).toBe(400);
    expect((await request('/api/commentaries/%E0%A4%A')).status).toBe(400);
    expect((await request('/api/commentaries/' + 'a'.repeat(201))).status).toBe(400);
    expect((await request('/api/commentaries', { host: 'attacker.example' })).status).toBe(403);
    expect((await request('/api/commentaries', { origin: 'https://attacker.example' })).status).toBe(403);
    expect((await request('/api/commentaries', {}, 'POST')).status).toBe(405);
    await writeFile(path.join(root, 'data/commentaries.json'), JSON.stringify({ ...corpus, works: [] }));
    await importCommentaries(pool, root);
    expect(await (await request('/api/commentaries')).json()).toEqual({ ...corpus, works: [] });
    expect((await request('/api/commentaries/fixture-work')).status).toBe(404);
    expect(await (await request('/api/commentaries/search?q=fixture')).json()).toEqual({ query: 'fixture', total: 0, results: [], limited: false });
    await pool.query('ALTER TABLE commentary_state RENAME TO unavailable_state');
    expect((await request('/api/commentaries')).status).toBe(503);
    expect((await request('/api/commentaries/fixture-work')).status).toBe(503);
  }))));

  it('searches literal normalized text with true totals, bounded results and validated HTTP input', async () => isolated(async pool => fixture(async (root, corpus) => withHttp(pool, root, async request => {
    expect((await request('/api/commentaries/search?q=fixture')).status).toBe(503);
    const base = corpus.works[0];
    base.sections = Array.from({ length: 61 }, (_, ordinal) => ({ ...base.sections[0], id: `section-${ordinal}`, ordinal,
      sourceStart: ordinal * [...fixtureText].length, sourceEnd: (ordinal + 1) * [...fixtureText].length }));
    const source = fixtureText.repeat(base.sections.length);
    base.sourceSha256 = createHash('sha256').update(source).digest('hex');
    corpus.works.push({ ...base, id: 'other-work', sections: [base.sections[0]] });
    await writeFile(path.join(root, base.localPath), source);
    await writeFile(path.join(root, 'data/commentaries.json'), JSON.stringify(corpus));
    await importCommentaries(pool, root);
    const search = async (query: string, suffix = '') => {
      const response = await request('/api/commentaries/search?q=' + encodeURIComponent(query) + suffix);
      expect(response.status).toBe(200); return response.json();
    };
    const found = await search('   BEGINNING\n\tLiteral ');
    expect(found).toMatchObject({ query: 'BEGINNING Literal', total: 62, limited: true });
    expect(found.results).toHaveLength(50);
    expect(found.results[0]).toEqual({ workId: base.id, workTitle: base.title, author: base.author, sectionId: 'section-0', sectionTitle: 'Fixture section', snippet: fixtureText.replace(/\s+/gu, ' ').trim() });
    for (const literal of ['%', '_', '\\', '[x]', '😀']) expect((await search(literal)).total).toBe(62);
    for (const literal of ['', ' \n\t ', 'not-present', "' OR 1=1 --", '%missing%']) expect((await search(literal))).toMatchObject({ total: 0, results: [], limited: false });
    expect((await search('literal', '&work=other-work'))).toMatchObject({ total: 1, limited: false });
    expect((await search('literal', '&work=missing'))).toMatchObject({ total: 0, limited: false });
    for (const suffix of ['q=' + 'x'.repeat(501), 'q=x&q=y', 'q=x&work=UPPER', 'q=x&work=x&work=y', 'q=%00']) {
      expect((await request('/api/commentaries/search?' + suffix)).status).toBe(400);
    }
    expect((await request('/api/commentaries/search')).status).toBe(200);
    expect((await readCommentaryWork(pool, base.id))?.sections[0].text).toBe(fixtureText);
    await pool.query('ALTER TABLE commentary_sections RENAME TO unavailable_sections');
    expect((await request('/api/commentaries/search?q=fixture')).status).toBe(503);
  }))));

  it('serves only imported commentary source paths without exposing directories or breaking legacy sources', async () => isolated(async pool => fixture(async (root, corpus) => withHttp(pool, root, async request => {
    await importCommentaries(pool, root);
    const response = await request('/' + corpus.works[0].localPath);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(fixtureText);
    expect(response.headers.get('content-security-policy')).toContain('sandbox');
    await writeFile(path.join(root, 'raw/commentaries/secret.txt'), 'not allowlisted');
    for (const pathname of ['/raw/commentaries/', '/raw/commentaries/secret.txt', '/raw/manifest.json', '/raw/%2e%2e%2fapplication%2f.env']) expect((await request(pathname)).status).toBe(404);
    await rm(path.join(root, corpus.works[0].localPath));
    await symlink(path.join(root, 'data/commentaries.json'), path.join(root, corpus.works[0].localPath));
    expect((await request('/' + corpus.works[0].localPath)).status).toBe(404);
    await expect(importCommentaries(pool, root)).rejects.toThrow();
  }))));

  it('imports the canonical corpus through the CLI only in the isolated test schema', async () => isolated(async pool => {
    const schema = (await pool.query('SELECT current_schema() AS name')).rows[0].name;
    const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'server/cli.ts', 'import-commentaries'], {
      cwd: applicationRoot, env: { ...process.env, DATABASE_URL: url!, PGOPTIONS: `-c search_path=${schema}` }, timeout: 30_000,
    });
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Commentary import complete');
    const { corpus } = await loadValidatedCommentaries();
    for (const work of corpus.works) expect(await readCommentaryWork(pool, work.id)).toEqual(work);
    expect((await readCommentaryCatalog(pool)).gaps).toEqual(corpus.gaps);
    await withHttp(pool, repositoryRoot, async request => {
      for (const work of corpus.works) {
        const detail = await request('/api/commentaries/' + work.id);
        expect(detail.status).toBe(200);
        expect(await detail.json()).toEqual(work);
        const source = await request('/' + work.localPath);
        expect(source.status).toBe(200);
        expect(createHash('sha256').update(Buffer.from(await source.arrayBuffer())).digest('hex')).toBe(work.sourceSha256);
      }
    });
  }), 30_000);

  it('preserves Scripture and annotations through concurrent imports and rolls back failed replacement', async () => isolated(async pool => fixture(async (root, corpus) => {
    await importCorpus(pool);
    const libraryBefore = await readLibrary(pool);
    const annotations = (await pool.query(`INSERT INTO personal_annotations(book_id, chapter_number, verse_number, body)
      VALUES ('genesis',1,1,'Preserve this personal note') RETURNING *`)).rows;
    await importCommentaries(pool, root);
    await Promise.all([importCommentaries(pool, root), importCommentaries(pool, root), readCommentaryCatalog(pool)]);
    expect(await readCommentaryWork(pool, corpus.works[0].id)).toEqual(corpus.works[0]);
    const before = (await pool.query('SELECT * FROM commentary_state')).rows;
    await pool.query(`CREATE FUNCTION reject_commentary() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'intentional commentary failure'; END; $$;
      CREATE TRIGGER reject_commentary BEFORE UPDATE ON commentary_state FOR EACH ROW EXECUTE FUNCTION reject_commentary()`);
    try {
      await writeFile(path.join(root, 'data/commentaries.json'), JSON.stringify({ ...corpus, works: [] }));
      await expect(importCommentaries(pool, root)).rejects.toThrow('intentional commentary failure');
      expect((await pool.query('SELECT * FROM commentary_state')).rows).toEqual(before);
      expect(await readCommentaryWork(pool, corpus.works[0].id)).toEqual(corpus.works[0]);
    } finally { await pool.query('DROP TRIGGER reject_commentary ON commentary_state; DROP FUNCTION reject_commentary()'); }
    expect(await readLibrary(pool)).toEqual(libraryBefore);
    expect((await pool.query('SELECT * FROM personal_annotations')).rows).toEqual(annotations);
  })), 30_000);

  it('refuses either altered migration checksum and unknown versions without changing commentary', async () => isolated(async pool => fixture(async (root, corpus) => {
    await importCommentaries(pool, root);
    const ledger = (await pool.query('SELECT version,checksum FROM schema_migrations ORDER BY version')).rows;
    for (const row of ledger) {
      await pool.query("UPDATE schema_migrations SET checksum='tampered' WHERE version=$1", [row.version]);
      try { await expect(migrate(pool)).rejects.toThrow('Migration checksum mismatch'); }
      finally { await pool.query('UPDATE schema_migrations SET checksum=$1 WHERE version=$2', [row.checksum, row.version]); }
    }
    await pool.query("INSERT INTO schema_migrations(version,checksum) VALUES (999,'unknown')");
    await expect(migrate(pool)).rejects.toThrow('Unknown database schema version');
    expect(await readCommentaryWork(pool, corpus.works[0].id)).toEqual(corpus.works[0]);
  })));

  it('fails closed on builder failure and concurrent artifact changes before touching tables', async () => isolated(async pool => fixture(async (root, corpus) => {
    await importCommentaries(pool, root);
    for (const script of ['raise SystemExit(1)\n', "from pathlib import Path\np=Path('data/commentaries.json')\np.write_bytes(p.read_bytes()+b' ')\n"]) {
      await writeFile(path.join(root, 'tools/build_commentaries.py'), script);
      await expect(importCommentaries(pool, root)).rejects.toThrow();
      expect(await readCommentaryWork(pool, corpus.works[0].id)).toEqual(corpus.works[0]);
    }
  })));

  it('adds migration 002 to an intact 001 database and repeats safely', async () => isolated(async pool => {
    const sql = await readFile(new URL('../db/001_initial.sql', import.meta.url), 'utf8');
    await pool.query(sql);
    await pool.query('CREATE TABLE schema_migrations(version integer PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz DEFAULT now())');
    await pool.query('INSERT INTO schema_migrations(version, checksum) VALUES (1,$1)', [createHash('sha256').update(sql).digest('hex')]);
    await pool.query(`INSERT INTO sources VALUES ('sentinel', 0, '{"keep":true}')`);
    await migrate(pool);
    await migrate(pool);
    expect((await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows).toEqual([{ version: 1 }, { version: 2 }]);
    expect((await pool.query('SELECT * FROM sources')).rows).toEqual([{ id: 'sentinel', ordinal: 0, metadata: { keep: true } }]);
    expect((await pool.query('SELECT * FROM commentary_state')).rows).toEqual([]);
  }));
});
