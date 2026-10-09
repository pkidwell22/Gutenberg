# Scripture Library — React and PostgreSQL application

This is the React application layer. The original file-based reader and preserved scholarly sources remain in the parent directory. Genesis and its four editorial appendices retain their original corpus. A separate historical-text collection adds full Luther volumes, Augustine’s *Confessions* and *City of God*, and Basil’s nine creation homilies; see [editions, coverage and rights](docs/COMMENTARY-SOURCES.md).

## Historical-text reader

Open **Commentaries** in the navigation (`#commentaries`). Select a work, then a section from its contents. The reader provides previous/next navigation, text size, section printing, exact-source offsets, edition/translator attribution and archived-source links. Search all historical works or only the selected work; this remains separate from Genesis search. Genesis chapters link to relevant acquired sections through curated associations, not claimed verse-by-verse mappings.

The catalog loads metadata only; full texts load one work at a time. Sections reproduce the archived translation exactly rather than an AI summary. Editorial material is labeled separately. The two Luther volumes reach Genesis 9 with overlap in chapter 4—not the complete Genesis lectures.

To rebuild and import deliberate commentary-source changes:

```sh
npm run corpus:commentaries
npm run corpus:check
npm run db:migrate
npm run db:import-commentaries
```

The commentary import replaces only its separate collection tables, transactionally. It does not rewrite Genesis, editorial appendices or personal annotations. Migration `002` is additive; do not edit applied migration files. Run `npm run test:corpus` and `npm test` for source and application checks.

## Architecture

- React + TypeScript, built with Vite; Radix Select supplies keyboard-accessible, styled menus.
- A loopback-only Node/Express API serves both the compiled frontend and the database-backed library.
- PostgreSQL stores sources, books, chapters, verses, editorial notes, quotations and passage links. Exact source text and provenance are preserved.
- Original texts, catalogue snapshots, manifests and corpus-building tools stay as files outside this directory.
- Personal annotations have a separate reserved table. There is **no annotation editor or write API yet**.
- Search currently retains the original literal, case-insensitive, whitespace-normalized Genesis search. A database full-text index does not silently change that behavior.

All application assets are bundled locally. Reading needs the local API and PostgreSQL running, but does not need internet access. External bibliography links do require internet. Unlike the legacy reader, this application is not opened directly through `file://`.

## Local runtime on this Mac

For copy-paste **daily startup, first-time installation, configuration, health checks and shutdown**, use the [root README](../README.md#start-the-app-on-this-mac). It is the primary terminal-command guide; the sections here explain the application and data contracts.

PostgreSQL 18 is installed through Homebrew. Scripture Library uses its own cluster, **not** Homebrew's default cluster:

```text
~/Library/Application Support/Scripture Library/postgres
~/Library/Application Support/Scripture Library/run
```

The runtime directory and socket are private to your OS user. PostgreSQL uses peer authentication and **no TCP listener**; the socket's numeric port identifier is 65432. No database password is embedded in frontend code, and no login/startup service was installed. Do not replace this setup with `brew services start` without deliberately changing the runtime arrangement.

Databases: `scripture_library` (application) and `scripture_library_test` (tests). Test suites create isolated, randomly named schemas inside the test database and remove only those schemas. Database files are outside Git and outside the HTTP-served app.

The root README's `pg_ctl start` command starts this dedicated database in the background with a log outside Git. The API's `npm start` remains a foreground command: keep its terminal open, and use Ctrl-C to stop it. Check the documented health URL before starting a second API instance. Existing browser preferences stay on the original 64817 origin.

## Development and rebuild

The local `.env` is ignored by Git. `.env.example` describes the format; do not place credentials in frontend `VITE_*` variables. Runtime configuration accepts only local database endpoints. Dependency installation requires internet, but subsequent builds and reading use local packages/data.

```sh
npm ci
npm run corpus:check
npm run db:migrate
npm run db:import
npm run db:import-commentaries
npm run build
npm start
```

Only run imports after deliberate source/editorial changes. Import validates the preserved corpus with `../tools/build_corpus.py --check`, uses transactions, is repeatable, and does not erase personal annotations. An incompatible removal of an annotated verse fails instead of deleting the annotation. Never edit an already-applied migration; add a new migration.

For frontend development, start a development API with `PORT=64819 npm start` and run `npm run dev` in another terminal; Vite listens on 127.0.0.1:64818 and proxies API/source requests to 64819. The compiled production app on 64817 needs only the API, not Vite.

Preferences use the original `scripture-library:` localStorage keys. Browser storage is **origin-specific**: changing ports does not transfer settings. The React application now owns the original 64817 origin; theme, text-size and reading-position keys were verified unchanged during handoff.

The full historical-text collection’s test, import, browser and independent-review evidence is recorded separately in [docs/COMMENTARY-VERIFICATION.md](docs/COMMENTARY-VERIFICATION.md).

## Verification

```sh
npm test
npm run build
node --test ../tests/core.test.cjs
python3 -m unittest discover -s ../tests -p test_corpus.py -v
python3 ../tools/build_corpus.py --check
```

The real SQL tests require `TEST_DATABASE_URL`; if it is absent, those tests are skipped rather than counted as live integration. Component tests use labeled fixtures; separate browser validation is required.

See `db/README.md` for the data/API contract, `docs/QWEN-EVALUATION.md` for the local-model worker assessments, and `docs/VERIFICATION.md` for final migration evidence and limitations. Parent verification passed 88 application tests plus 20 verifier tests, full live API/corpus equality, all rendered Genesis verses and quotations, keyboard/menu-layout checks, and the original-origin handoff. Focused independent re-review found no blocking issues.

## Backup and recovery

Use `pg_dump`, not a live copy of the database directory:

```sh
/opt/homebrew/opt/postgresql@18/bin/pg_dump \
  -h "$HOME/Library/Application Support/Scripture Library/run" -p 65432 \
  -Fc -d scripture_library \
  -f "$HOME/Library/Application Support/Scripture Library/library-backup.dump"
```

Choose a new filename when preserving earlier backups. The initial `initial-library.dump` was restored into a separate verification database and its complete corpus compared successfully with the application database. This verifies the current backup path, not future backups.

Restore into a **new, empty database**, verify it, then deliberately choose whether to use it. Do not restore destructively over the working database. The source archive can rebuild imported material, but it cannot reconstruct future personal annotations; those require database backups. Keep backups private and out of Git.
