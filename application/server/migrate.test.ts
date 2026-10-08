import { describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { migrate } from './migrate.js';

// Protocol-only tests. The separate integration suite executes SQL on real PostgreSQL.
function fakePool(fail = false) {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (fail && sql.includes('CREATE TABLE sources')) throw new Error('SQL failure');
      return { rows: [] };
    },
    release: () => calls.push('RELEASE'),
  };
  return { pool: { connect: async () => client } as unknown as Pool, calls };
}
describe('migration transaction protocol (not live SQL verification)', () => {
  it('locks before schema writes and commits a checksummed migration ledger', async () => {
    const { pool, calls } = fakePool();
    await migrate(pool);
    expect(calls[0]).toBe('BEGIN');
    expect(calls[1]).toContain('pg_advisory_xact_lock');
    expect(calls.some(sql => sql.includes('INSERT INTO schema_migrations'))).toBe(true);
    expect(calls.slice(-2)).toEqual(['COMMIT', 'RELEASE']);
  });
  it('rolls back a migration failure and always releases the connection', async () => {
    const { pool, calls } = fakePool(true);
    await expect(migrate(pool)).rejects.toThrow('SQL failure');
    expect(calls.slice(-2)).toEqual(['ROLLBACK', 'RELEASE']);
    expect(calls).not.toContain('COMMIT');
  });
});
