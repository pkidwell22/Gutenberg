# Local database and API

Run commands from `application/` with the parent-managed dependencies and private `.env` in place:

```sh
npm run db:migrate
npm run db:import
npm start
# For the parent-managed original-origin handoff only:
PORT=64817 npm start
```

The API binds **127.0.0.1 only** (default port 64819). It does not provision PostgreSQL, run migrations on startup, or fall back to generated/static corpus data. `.env` is resolved relative to the application, not the caller's working directory. The runtime requires the dedicated home-derived `Library/Application Support/Scripture Library/run` Unix socket, port 65432, the current OS username, and either `scripture_library` or `scripture_library_test`. It rejects TCP destinations, embedded passwords, duplicate or unsupported URL parameters, fragments, and alternate sockets. Only explicit validated connection fields reach `pg.Pool`; the original URL is not forwarded. Connection values and raw database errors are never logged.

## Exports and API

- `server/app.ts`: `createApp(pool, options?)` for HTTP integration and production asset serving.
- `server/migrate.ts`: `migrate(pool)` and the shared advisory-lock transaction wrapper.
- `server/library.ts`: `importCorpus(pool, corpusRoot?)`, `readLibrary(pool)`.
- `server/corpus.ts`: strict JSON-assignment parsing and Python-validated corpus loading.
- `GET /api/library`: exact `Library` object reconstructed from relational rows and JSONB metadata.
- `GET /api/health`: `{ "ok": true, "database": "ready" }` only after a successful complete database read; otherwise both API endpoints return 503 `{ "error": "Database unavailable" }`.
- `/` and `/index.html`: built `application/dist/index.html`. Hash routes remain browser-local.
- `/raw/*` and `/notes/*`: only paths explicitly present in imported source/note metadata. Directory listings, dotfiles, traversal and escaping symlinks are rejected. Archived HTML is sandboxed with CSP.

Only expected loopback Host/Origin values are accepted (ports 64817/64818/64819 and an explicit runtime override). No wildcard CORS or annotation write API exists.

## Data and concurrency

`001_initial.sql` creates normalized sources, books, chapters, verses, editorial notes, note-source links, quotations, passage references and related-note links. JSONB holds all remaining metadata, including future extra fields. Explicit ordinals preserve every original array order; text is not whitespace-normalized, so CRLF and original decoded character offsets survive. Top-level appendix/coverage metadata survives in `library_state`; the existing appendix catalogue derives from editorial notes.

`personal_annotations` is separate and untouched by import. Its verse foreign key prevents removal of an annotated verse: an incompatible corpus change fails and rolls back rather than discarding the annotation.

Migrations use a SHA-256 ledger and a transaction-scoped advisory lock shared with import. Never edit a migration already applied; add a new version and extend the explicit migration runner. Import first runs `python3 tools/build_corpus.py --check` against the frozen sources, then safely parses generated JSON without executing JS. Imports upsert normalized corpus rows in one transaction; editorial records are replaced independently of annotations. Reads use a repeatable-read, read-only transaction so concurrent imports cannot produce a torn payload. A simple-language GIN index is available for future DB discovery but **does not replace the frontend's literal search**.

## Verification

```sh
./node_modules/.bin/vitest run server
./node_modules/.bin/tsc --noEmit
```

Real integration tests require `TEST_DATABASE_URL` in `.env`. They assert `current_database() = 'scripture_library_test'`, create a randomly named isolated schema, and remove only that schema afterward. They never drop or reset `public` or the main database. Without the test URL the live suite is explicitly skipped, not represented as live verification.

Coverage includes full-corpus PostgreSQL deep equality, repeated migrations, repeated/concurrent imports, annotation preservation, intentional write-failure rollback, foreign-key rejection, checksum drift, actual CLI subprocesses, DB-backed HTTP responses/readiness failures, byte-exact allowlisted sources, static fixture serving, Host/Origin security and loopback binding. The separate migration protocol tests use a mock only to assert BEGIN/lock/rollback/release ordering; those are not a substitute for live SQL tests. Static fixture tests do not verify the final React build; parent integration verifies the actual `dist` and browser.
