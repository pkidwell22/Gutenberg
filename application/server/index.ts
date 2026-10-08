import { createDatabasePool, loadRuntimeEnvironment, startServer } from './runtime.js';

try {
  const { databaseConfig, port } = loadRuntimeEnvironment();
  const pool = createDatabasePool(databaseConfig);
  const server = startServer(pool, port);
  server.once('listening', () => console.log(`Scripture Library: http://127.0.0.1:${port}`));
  server.once('error', async () => {
    console.error('Server could not listen on the configured loopback port.');
    await pool.end();
    process.exitCode = 1;
  });
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    server.close(() => { void pool.end(); });
    // Bound shutdown even if a client keeps a request open indefinitely.
    setTimeout(() => { server.closeAllConnections(); }, 5000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
} catch {
  console.error('Server configuration is invalid. Check application/.env.');
  process.exitCode = 1;
}
