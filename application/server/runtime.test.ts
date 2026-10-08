import { describe, expect, it } from 'vitest';
import { once } from 'node:events';
import pg, { type Pool } from 'pg';
import { createDatabasePool, parseRuntimeEnvironment, startServer } from './runtime.js';
import { homedir, userInfo } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { applicationRoot } from './corpus.js';

const socket = `${homedir()}/Library/Application Support/Scripture Library/run`;
const localUrl = `postgresql://${encodeURIComponent(userInfo().username)}@localhost:65432/scripture_library?host=${encodeURIComponent(socket)}`;

describe('local runtime configuration', () => {
  it('defaults to loopback port 64819 and accepts the original-origin handoff port', () => {
    expect(parseRuntimeEnvironment({ DATABASE_URL: localUrl }).port).toBe(64819);
    expect(parseRuntimeEnvironment({ DATABASE_URL: localUrl, PORT: '64817' }).port).toBe(64817);
  });
  it.each([
    'postgresql://localhost/library?host=localhost&host=remote.example',
    'postgresql://localhost/library?host=remote.example&host=localhost',
    `${localUrl}&host=remote.example`, `${localUrl}&host=${encodeURIComponent(socket)}`,
    ...['hostaddr=127.0.0.1', 'user=other', 'password=private-secret', 'port=65432',
      'dbname=other', 'database=other', 'options=-c%20search_path%3Dpublic', 'sslmode=disable',
      'connectionString=postgresql%3A%2F%2Fremote.example%2Flibrary'].map(parameter => `${localUrl}&${parameter}`),
    localUrl.replace('localhost', 'remote.example'),
    localUrl.replace('localhost', '127.0.0.1.evil.example'),
    localUrl.replace(encodeURIComponent(socket), encodeURIComponent('/tmp')),
    localUrl.replace(encodeURIComponent(socket), encodeURIComponent(`${socket}/../run`)),
    localUrl.replace(encodeURIComponent(socket), encodeURIComponent(`${socket}/`)),
    localUrl.replace(encodeURIComponent(socket), encodeURIComponent('relative/run')),
    localUrl.replace(encodeURIComponent(socket), '127.0.0.1'),
    localUrl.split('?')[0],
    localUrl.replace(':65432', ':5432'),
    localUrl.replace(':65432', ''),
    localUrl.replace('/scripture_library?', '/other?'),
    localUrl.replace(`${encodeURIComponent(userInfo().username)}@`, 'other@'),
    localUrl.replace('@localhost', ':private-secret@localhost'),
    `${localUrl}#private-secret`, `${localUrl}#`,
  ])('rejects unsafe connection configuration case %# without exposing values', databaseUrl => {
    expect(() => parseRuntimeEnvironment({ DATABASE_URL: databaseUrl })).toThrow('Invalid local database or port configuration');
  });
  it.each(['scripture_library', 'scripture_library_test'])('passes only explicit private socket fields to pg for %s', async database => {
    const runtime = parseRuntimeEnvironment({ DATABASE_URL: localUrl.replace('/scripture_library?', `/${database}?`) });
    expect(runtime).not.toHaveProperty('connectionString');
    const pool = createDatabasePool(runtime.databaseConfig);
    try {
      expect(pool.options).not.toHaveProperty('connectionString');
      expect(pool.options).toMatchObject({ host: socket, user: userInfo().username, database, port: 65432, ssl: false });
      // Client construction is connection-free and exercises pg's actual option resolution.
      const client = new pg.Client(pool.options);
      expect(client.host).toBe(socket);
      expect(client.user).toBe(userInfo().username);
      expect(client.database).toBe(database);
      expect(client.port).toBe(65432);
    } finally { await pool.end(); }
  });
  it('rejects missing/remote DB config and malformed ports without exposing values', () => {
    for (const env of [ {}, { DATABASE_URL: 'postgresql://secret:password@remote.example/library' },
      { DATABASE_URL: 'postgresql://localhost/library?host=remote.example' },
      { DATABASE_URL: localUrl, PORT: '64819oops' } ]) {
      expect(() => parseRuntimeEnvironment(env)).toThrow(/configuration/i);
      try { parseRuntimeEnvironment(env); } catch (error) { expect(String(error)).not.toContain('password'); }
    }
  });
  it('exits cleanly from the entrypoint on invalid configuration without secrets', async () => {
    await expect(promisify(execFile)(process.execPath, ['--import', 'tsx', 'server/index.ts'], {
      cwd: applicationRoot, env: { ...process.env, PORT: 'not-a-port', DATABASE_URL: 'postgresql://private:secret@localhost/library' },
    })).rejects.toMatchObject({ code: 1, stderr: 'Server configuration is invalid. Check application/.env.\n', stdout: '' });
  });
  it('binds a real ephemeral HTTP test server only to IPv4 loopback', async () => {
    const server = startServer({} as Pool, 0);
    try {
      await once(server, 'listening');
      expect(server.address()).toMatchObject({ address: '127.0.0.1', family: 'IPv4' });
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
