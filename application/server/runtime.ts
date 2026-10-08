import { config } from 'dotenv';
import pg from 'pg';
import { homedir, userInfo } from 'node:os';
import { isAbsolute, normalize } from 'node:path';
import { applicationRoot } from './corpus.js';
import { createApp } from './app.js';

export function parseRuntimeEnvironment(env: NodeJS.ProcessEnv) {
  try {
    if (!env.DATABASE_URL || env.DATABASE_URL.includes('#')) throw new Error();
    const url = new URL(env.DATABASE_URL);
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);
    // Only the single socket selector is supported. Never let pg reparse a URL:
    // its last-value query semantics differ from URLSearchParams.get().
    const parameters = [...url.searchParams];
    if (parameters.length !== 1 || parameters[0][0] !== 'host') throw new Error();
    const host = parameters[0][1];
    const user = userInfo().username;
    const database = decodeURIComponent(url.pathname.slice(1));
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !loopback.has(url.hostname) ||
        !isAbsolute(host) || normalize(host) !== host ||
        host !== `${homedir()}/Library/Application Support/Scripture Library/run` ||
        url.port !== '65432' || url.password || decodeURIComponent(url.username) !== user ||
        !['scripture_library', 'scripture_library_test'].includes(database)) throw new Error();
    const databaseConfig = { host, user, database, port: 65432, ssl: false } satisfies pg.PoolConfig;
    const portText = env.PORT ?? '64819';
    const port = Number(portText);
    if (!/^\d+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error();
    return { databaseConfig, port };
  } catch { throw new Error('Invalid local database or port configuration'); }
}

export function loadRuntimeEnvironment() {
  config({ path: `${applicationRoot}/.env`, quiet: true });
  return parseRuntimeEnvironment(process.env);
}

export function createDatabasePool(databaseConfig: ReturnType<typeof parseRuntimeEnvironment>['databaseConfig']) {
  const { host, user, database, port, ssl } = databaseConfig;
  const pool = new pg.Pool({ host, user, database, port, ssl, max: 5, connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000, statement_timeout: 15_000, idle_in_transaction_session_timeout: 15_000 });
  // An idle connection error must not crash the process or print credentials/details.
  pool.on('error', () => console.error('Database connection unavailable.'));
  return pool;
}

export function startServer(pool: pg.Pool, port = 64819) {
  return createApp(pool, { port }).listen(port, '127.0.0.1');
}
