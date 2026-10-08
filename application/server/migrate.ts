import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Pool, PoolClient } from 'pg';

// A shared transaction-scoped lock serializes migrations and imports, even across processes.
export const corpusLock = 64819001;
export async function withWriteTransaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [corpusLock]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function migrate(pool: Pool): Promise<void> {
  const migrations = await Promise.all(['001_initial.sql', '002_commentaries.sql'].map(async (file, index) => {
    const sql = await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8');
    return { version: index + 1, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
  await withWriteTransaction(pool, async client => {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const { rows } = await client.query<{ version: number; checksum: string }>(
      'SELECT version, checksum FROM schema_migrations ORDER BY version');
    for (const row of rows) {
      const migration = migrations.find(item => item.version === row.version);
      if (!migration) throw new Error('Unknown database schema version');
      if (row.checksum !== migration.checksum) throw new Error('Migration checksum mismatch');
    }
    for (const { version, sql, checksum } of migrations) {
      if (rows.some(row => row.version === version)) continue;
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)', [version, checksum]);
    }
  });
}
