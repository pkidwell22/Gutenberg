import { importCommentaries } from './commentaries.js';
import { importCorpus } from './library.js';
import { migrate } from './migrate.js';
import { createDatabasePool, loadRuntimeEnvironment } from './runtime.js';

const command = process.argv[2];
if (process.argv.length !== 3 || (command !== 'migrate' && command !== 'import' && command !== 'import-commentaries')) {
  console.error('Usage: tsx server/cli.ts migrate|import|import-commentaries');
  process.exitCode = 2;
} else {
  let pool: ReturnType<typeof createDatabasePool> | undefined;
  try {
    const { databaseConfig } = loadRuntimeEnvironment();
    pool = createDatabasePool(databaseConfig);
    if (command === 'migrate') {
      await migrate(pool);
      console.log('Migrations complete.');
    } else if (command === 'import-commentaries') {
      const report = await importCommentaries(pool);
      console.log(`Commentary import complete: ${JSON.stringify(report)}`);
    } else {
      const report = await importCorpus(pool);
      console.log(`Import complete: ${JSON.stringify(report)}`);
    }
  } catch {
    // DB/Python errors may contain filesystem locations or connection details.
    console.error('Database operation failed. Check local database configuration, availability, migration checksums, and corpus validation.');
    process.exitCode = 1;
  } finally { await pool?.end(); }
}
