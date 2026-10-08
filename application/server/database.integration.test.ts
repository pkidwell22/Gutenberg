import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { applicationRoot, loadValidatedCorpus } from './corpus.js';
import { migrate } from './migrate.js';
import { importCorpus, readLibrary } from './library.js';
import { createApp } from './app.js';
import { once } from 'node:events';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

config({ path: `${applicationRoot}/.env`, quiet: true });
const url = process.env.TEST_DATABASE_URL;
// Opt-in real PostgreSQL suite; never substitute mocks or touch the public schema.
describe.skipIf(!url)('real PostgreSQL corpus integration', () => {
  let admin: pg.Pool;
  let pool: pg.Pool;
  let server: Server;
  let endpoint: string;
  // Node fetch ignores custom Host; raw HTTP is needed to exercise DNS-rebinding protection.
  const request = (path: string, headers: Record<string, string> = {}) => new Promise<Response>((resolve, reject) => {
    const outgoing = httpRequest(`${endpoint}${path}`, { headers: { host: '127.0.0.1:64819', ...headers } }, incoming => {
      const chunks: Buffer[] = [];
      incoming.on('data', chunk => chunks.push(Buffer.from(chunk)));
      incoming.on('error', reject);
      incoming.on('end', () => {
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (value !== undefined) responseHeaders.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: incoming.statusCode, headers: responseHeaders }));
      });
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
  const schema = `test_${randomUUID().replaceAll('-', '')}`;
  beforeAll(async () => {
    admin = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 3000 });
    const result = await admin.query('SELECT current_database() AS name');
    if (result.rows[0].name !== 'scripture_library_test') throw new Error('Refusing integration tests outside dedicated test database');
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, connectionTimeoutMillis: 3000 });
    server = createApp(pool, { distRoot: fileURLToPath(new URL('./test-fixtures/static/', import.meta.url)) }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(async () => {
    if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (pool) {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      expect((await admin.query('SELECT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = $1) AS present', [schema])).rows[0].present).toBe(false);
    }
    await admin?.end();
  });
  it('is not ready before the corpus is imported', async () => {
    const response = await request('/api/health');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Database unavailable' });
  });
  it('migrates twice and returns the entire real corpus from normalized PostgreSQL rows', async () => {
    await migrate(pool);
    await migrate(pool);
    await importCorpus(pool);
    const { library } = await loadValidatedCorpus();
    expect(await readLibrary(pool)).toEqual(library);
    expect((await pool.query('SELECT count(*)::integer AS count FROM verses')).rows[0].count).toBe(1533);
    expect((await pool.query('SELECT version FROM schema_migrations ORDER BY version')).rows).toEqual([{ version: 1 }, { version: 2 }]);
  }, 30_000);
  it('preserves personal annotations through repeated and concurrent imports', async () => {
    const inserted = await pool.query(`INSERT INTO personal_annotations
      (book_id, chapter_number, verse_number, body, metadata)
      VALUES ('genesis', 1, 1, 'Personal note — keep me', '{"color":"blue"}') RETURNING *`);
    await importCorpus(pool);
    await Promise.all([importCorpus(pool), importCorpus(pool), readLibrary(pool)]);
    expect((await pool.query('SELECT * FROM personal_annotations')).rows).toEqual(inserted.rows);
    expect(await readLibrary(pool)).toEqual((await loadValidatedCorpus()).library);
  }, 30_000);
  it('rolls back all imported changes when a database write fails', async () => {
    await pool.query(`UPDATE editorial_notes SET metadata = metadata || '{"rollbackMarker":true}'::jsonb`);
    const before = await readLibrary(pool);
    await pool.query(`CREATE FUNCTION reject_import() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'intentional integration failure'; END; $$;
      CREATE TRIGGER reject_import BEFORE UPDATE ON library_state FOR EACH ROW EXECUTE FUNCTION reject_import()`);
    try {
      await expect(importCorpus(pool)).rejects.toThrow('intentional integration failure');
      expect(await readLibrary(pool)).toEqual(before);
      expect((await pool.query('SELECT count(*)::integer AS count FROM personal_annotations')).rows[0].count).toBe(1);
    } finally {
      await pool.query('DROP TRIGGER reject_import ON library_state; DROP FUNCTION reject_import()');
    }
    await importCorpus(pool);
  }, 30_000);
  it('enforces source and verse references and detects edited migrations', async () => {
    await expect(pool.query(`INSERT INTO personal_annotations
      (book_id, chapter_number, verse_number, body) VALUES ('genesis', 1, 9999, 'invalid')`)).rejects.toMatchObject({ code: '23503' });
    await expect(pool.query(`UPDATE books SET source_id = 'missing'`)).rejects.toMatchObject({ code: '23503' });
    const saved = (await pool.query('SELECT checksum FROM schema_migrations WHERE version = 1')).rows[0].checksum;
    await pool.query(`UPDATE schema_migrations SET checksum = 'tampered' WHERE version = 1`);
    try { await expect(migrate(pool)).rejects.toThrow('Migration checksum mismatch'); }
    finally { await pool.query('UPDATE schema_migrations SET checksum = $1 WHERE version = 1', [saved]); }
  });
  it('serves the complete DB payload and checks readiness on each HTTP request', async () => {
    const response = await request('/api/library');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual((await loadValidatedCorpus()).library);
    const health = await request('/api/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ ok: true, database: 'ready' });
    await pool.query('ALTER TABLE library_state RENAME TO unavailable_state');
    try {
      for (const path of ['/api/library', '/api/health']) {
        const failed = await request(path);
        expect(failed.status).toBe(503);
        expect(await failed.json()).toEqual({ error: 'Database unavailable' });
      }
    } finally { await pool.query('ALTER TABLE unavailable_state RENAME TO library_state'); }
  });
  it('serves only allowlisted source/note files and built assets', async () => {
    const { library } = await loadValidatedCorpus();
    for (const path of [...library.sources.flatMap(s => [s.localPath, String(s.metadataPath)]), ...library.notes.map(n => n.localPath)]) {
      const response = await request(`/${path}`);
      expect(response.status).toBe(200);
      const bytes = await readFile(`${applicationRoot}/../${path}`);
      expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
    }
    for (const path of ['/application/.env', '/.env', '/raw/', '/raw/manifest.json', '/notes/', '/server/index.ts', '/package.json', '/raw/%2e%2e%2fapplication%2f.env']) {
      expect((await request(path)).status).toBe(404);
    }
    await pool.query('ALTER TABLE commentary_state RENAME TO unavailable_commentary_state');
    try {
      expect((await request(`/${library.sources[0].localPath}`)).status).toBe(200);
      expect((await request('/api/commentaries')).status).toBe(503);
    } finally { await pool.query('ALTER TABLE unavailable_commentary_state RENAME TO commentary_state'); }
    for (const path of ['/', '/index.html']) {
      const response = await request(path);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('Static serving test fixture');
    }
  });
  it('runs the migrate/import CLI against the isolated test schema', async () => {
    // URL parameters cannot override connection fields; scope this test process via PGOPTIONS.
    for (const operation of ['migrate', 'import']) {
      const result = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'server/cli.ts', operation], {
        cwd: applicationRoot, env: { ...process.env, DATABASE_URL: url!, PGOPTIONS: `-c search_path=${schema}` }, timeout: 30_000,
      });
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain(operation === 'migrate' ? 'Migrations complete' : 'Import complete');
    }
    expect(await readLibrary(pool)).toEqual((await loadValidatedCorpus()).library);
  }, 30_000);
  it('rejects hostile Host, Origin and fetch metadata without permissive CORS', async () => {
    const hostileHeaders: Record<string, string>[] = [{ host: 'attacker.example' }, { origin: 'https://attacker.example' }, { origin: 'null' }, { 'sec-fetch-site': 'cross-site' }];
    for (const headers of hostileHeaders) {
      expect((await request('/api/library', headers)).status).toBe(403);
    }
    const response = await request('/api/library', { origin: 'http://127.0.0.1:64819' });
    expect(response.status).toBe(200);
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
