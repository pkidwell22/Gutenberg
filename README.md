# Scripture Library

A local, Genesis-first academic reading library. The reading text is the **King James Version**. Theological appendices take a **comparative academic approach**, with Luther as a major historical voice rather than the single governing interpretation.

## Start the app on this Mac

**Already set up? Use this section.** First-time installation is below. The app needs both PostgreSQL and the local API. Nothing starts automatically at login.

### 1. Start the database if it is stopped

Paste into Terminal:

```sh
PG_BIN="$(brew --prefix postgresql@18)/bin"
DB_ROOT="$HOME/Library/Application Support/Scripture Library"

if "$PG_BIN/pg_ctl" -D "$DB_ROOT/postgres" status; then
  printf 'Database is already running.\n'
else
  LC_ALL=en_US.UTF-8 "$PG_BIN/pg_ctl" \
    -D "$DB_ROOT/postgres" \
    -l "$DB_ROOT/postgres.log" \
    -o "-k \"$DB_ROOT/run\" -p 65432 -h '' -c unix_socket_permissions=0700 -c max_connections=30" \
    -w start
fi
```

`pg_ctl` starts the database in the background and waits for readiness. You can close this terminal afterward. It uses the existing cluster; it does **not** initialize, import or erase data. The log is outside the repository. If startup fails, inspect that log; do not delete `postmaster.pid` or the data directory.

### 2. Start the app

In Terminal:

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
export PATH="$(brew --prefix)/opt/node@22/bin:$PATH"
npm start
```

**Leave this terminal open.** Stop the app with **Ctrl-C**. If it says the port is already in use, do not start a second copy or kill an unknown process: run the health check below. A healthy existing copy can be used as-is.

### 3. Open and check it

In another terminal:

```sh
curl --fail --silent --show-error http://127.0.0.1:64817/api/health
open 'http://127.0.0.1:64817/index.html#read/3/15'
```

Expected health response: `{"ok":true,"database":"ready"}`. If you see **Database unavailable**, repeat step 1. If the connection is refused, repeat step 2. Refresh an already-open browser tab after rebuilding.

This address is local to this Mac. Tailscale sharing is not enabled. Once dependencies and data are installed, reading and search do not need internet access.

## First-time setup from GitHub (macOS)

Skip this section on the already-configured Mac. These commands use a **dedicated PostgreSQL 18 cluster**, OS-user authentication and a private Unix socket; they do not expose PostgreSQL over TCP or install a login service. The current runtime intentionally requires this home-directory socket path, port and database names. Do not substitute a remote database URL.

Prerequisites: Homebrew, Python **3.9+**, and access to the private [pkidwell22/Gutenberg repository](https://github.com/pkidwell22/Gutenberg). Node **22.12+ in the 22.x line, 24.x, or 26+** is supported by the locked test/build dependencies. The commands below install Node 22. On a managed Mac, obtain any required approval before installing packages; Homebrew itself must already be installed.

### 1. Install missing tools and clone

Only on a fresh machine/check-out location:

```sh
brew install node@22 postgresql@18
export PATH="$(brew --prefix)/opt/node@22/bin:$PATH"
node --version
npm --version
python3 --version

mkdir -p "$HOME/Desktop/Repositories"
git clone https://github.com/pkidwell22/Gutenberg.git \
  "$HOME/Desktop/Repositories/Scripture Library"
cd "$HOME/Desktop/Repositories/Scripture Library/application"
npm ci
```

GitHub must already be authenticated for the private clone. If using GitHub CLI, `gh auth login` is the interactive login command. Do not place an access token in the clone URL. Do not clone over the existing project folder.

### 2. Initialize the private cluster only if it does not exist

```sh
PG_BIN="$(brew --prefix postgresql@18)/bin"
DB_ROOT="$HOME/Library/Application Support/Scripture Library"
umask 077
mkdir -p "$DB_ROOT/run"
chmod 700 "$DB_ROOT/run"

if [ -f "$DB_ROOT/postgres/PG_VERSION" ]; then
  printf 'Existing database cluster retained.\n'
else
  LC_ALL=en_US.UTF-8 "$PG_BIN/initdb" \
    -D "$DB_ROOT/postgres" \
    --encoding=UTF8 --locale=C \
    --auth-local=peer --auth-host=reject
fi
```

An existing nonempty but incomplete directory causes `initdb` to fail rather than overwrite it. Investigate that failure; do not remove the directory to make setup proceed. Never use `brew services start postgresql@18` for this project: it would select a different runtime arrangement.

Now run **“Start the database if it is stopped”** above before continuing.

### 3. Create the application and test databases if missing

```sh
PG_BIN="$(brew --prefix postgresql@18)/bin"
PG_SOCKET="$HOME/Library/Application Support/Scripture Library/run"

for DATABASE in scripture_library scripture_library_test; do
  EXISTS=$("$PG_BIN/psql" -h "$PG_SOCKET" -p 65432 -d postgres \
    -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DATABASE'") || break
  if [ "$EXISTS" != '1' ]; then
    "$PG_BIN/createdb" -h "$PG_SOCKET" -p 65432 "$DATABASE" || break
  fi
done
```

Existing databases are retained. Do not use `dropdb`, reset the cluster or restore a backup over working data as a setup shortcut.

### 4. Create local configuration without overwriting an existing `.env`

Run from the application directory:

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
python3 - <<'PY'
import os
import pwd
from pathlib import Path
from urllib.parse import quote

filename = Path('.env')
user = quote(pwd.getpwuid(os.getuid()).pw_name, safe='')
socket = quote(str(Path.home() / 'Library/Application Support/Scripture Library/run'), safe='')
content = (
    f'DATABASE_URL=postgresql://{user}@localhost:65432/scripture_library?host={socket}\n'
    f'TEST_DATABASE_URL=postgresql://{user}@localhost:65432/scripture_library_test?host={socket}\n'
    'PORT=64817\n'
)
try:
    descriptor = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('Existing .env retained; no values displayed or overwritten.')
else:
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(content)
    print('Created private local .env using OS-user authentication.')
PY
```

No password is needed. `.env` is ignored by Git; never put connection settings in frontend `VITE_*` variables. The generated port is **64817**; `.env.example` is only a placeholder template, not a ready-to-run configuration. An existing `.env` is retained unchanged; if it uses another HTTP port, these 64817 links will not reach that instance. Change it deliberately rather than overwriting working configuration.

### 5. Validate, migrate, import and build

Run once for initial setup, with the database running:

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
export PATH="$(brew --prefix)/opt/node@22/bin:$PATH"
npm run corpus:check && \
  npm run db:migrate && \
  npm run db:import && \
  npm run db:import-commentaries && \
  npm run build
```

This installs both Genesis/appendices and the six-work historical collection from the preserved source corpus. Imports are transactional and preserve personal annotations. They are deliberate data updates, **not daily startup commands**. Do not edit applied migration files.

Then use **“Start the app”** above, followed by its health check.

## Rebuild, test and stop

### Apply local frontend changes

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
export PATH="$(brew --prefix)/opt/node@22/bin:$PATH"
npm run build
```

Refresh the browser. Frontend-only changes do not need a database import or API restart. If backend code changed, stop only your app's `npm start` with Ctrl-C and start it again. Do not change source archives just to alter presentation.

### Verify the project

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
export PATH="$(brew --prefix)/opt/node@22/bin:$PATH"
npm run corpus:check && npm run test:corpus && npm test && npm run build
npm run verify:live
```

`verify:live` requires the API and database running. Real SQL tests use isolated schemas in `scripture_library_test`; without `TEST_DATABASE_URL`, they are skipped, not verified. No test should use the application database for destructive fixtures.

### Shut down deliberately

First press **Ctrl-C** in the terminal running `npm start`. Then, only if you also want to stop this project's database:

```sh
"$(brew --prefix postgresql@18)/bin/pg_ctl" \
  -D "$HOME/Library/Application Support/Scripture Library/postgres" \
  -m fast -w stop
```

This performs a clean database shutdown; it does not delete data. Other API instances using this same project cluster will lose their database connection until it is started again. There is no automatic reboot/login startup.

See [application/README.md](application/README.md) for architecture, historical-text imports, development and backups. Source texts, import recipes and generated corpus remain independent of the React interface. The complete initial library was pushed to the private GitHub repository on `feat/scripture-library`; later local edits require a separate commit/push.

## Preserved file-based reader

The original `index.html`, `app.js`, `core.js`, `style.css` and `data/` folder remain unchanged. Open that `index.html` directly as a file for the original read-only reader, without PostgreSQL or an API. Keep those files together. This is the legacy fallback, not the React application.

Do not start the former Python server on 64817: that port now belongs to the React/API application. The new API serves only the compiled frontend and allowlisted source files, not the entire repository.

## How to use it

- **Genesis overview:** an editorial narrative guide linked to actual chapters and verses.
- **Chapter reader:** biblical text with a separate contextual margin. Select any chapter, change type size, toggle light/dark mode, or print the chapter.
- **Verse links:** click a verse number to get a stable hash reference such as `index.html#read/12/3`.
- **Search:** searches the entire Genesis reading text, case-insensitively, using the literal word or phrase entered. It does not currently search appendix essays.
- **Reading position:** the most recently opened verse is remembered when browser storage is available. The overview offers a Continue link. This is not automatic scroll-position tracking.
- **Appendices:** editorial comparisons, linked biblical passages, primary-source extracts, and edition-specific references.
- **Sources and method:** provenance, rights notes, coverage, publisher links, and preserved local files.

The browser's storage remembers preferences only. The current app reads imported text from PostgreSQL; preserved originals and editorial recipes remain in project files, not browser storage. Storage restrictions must not prevent reading. Preferences under `file://` can vary by browser; local HTTP gives a consistent origin.

## Academic boundaries

The KJV is a historical English translation, not a substitute for the Hebrew text or a critical apparatus. This reading edition must not be described as a facsimile of the 1611 printing.

Scripture, historical quotation, and editorial commentary are visibly separate. Editorial notes are AI-assisted starting points for study, not peer-reviewed conclusions. Historical interpretations remain attributed, including disagreements. A small selection of historical Christian sources is not a comprehensive survey of Jewish interpretation or modern historical-critical scholarship.

The complete Genesis text and the selective appendices have different coverage. An appendix links only the passages it actually discusses. No commentary is silently manufactured for uncovered chapters. Exodus, Leviticus, Numbers, and Deuteronomy are labeled **Not yet added**.

Check source-specific permissions and jurisdiction before redistribution. Public-domain status for an older work does not establish the rights of a modern translation. Preserved downloads retain their source notices.

## Project layout

- `application/`: current React/TypeScript frontend, local API, SQL migrations and application tests.
- `data/commentaries.json`: separate exact-text historical collection; recipes in `tools/commentary-recipes.json`.
- `application/docs/`: editions/rights, verification evidence and messianic-highlight criteria.
- `index.html`, `style.css`, `app.js`: independent static interface.
- `core.js`: testable search and reference routing.
- `data/library.js`: generated library data; not the editorial source of truth.
- `raw/`: preserved source files and provenance records.
- `tools/notes.json`: editable editorial input and quotation selections.
- `notes/`: generated, source-linked Markdown appendices for reading in an editor or Obsidian.
- `tools/`: source parsing, building, and verification.
- `tests/core.test.cjs`: Node built-in tests; no npm install.
- `tests/test_corpus.py`: source pipeline tests.
- `tests/browser_checks.py`: browser integration checks for the real corpus, runnable through Hermes `browser_exec` with its pre-imported browser helpers. This is not a standalone Playwright script.
- `SCHEMA.md`, `index.md`, `log.md`: editorial conventions, content catalogue, and work log.
- `DESIGN.md`: visual direction and accessibility/layout decisions.

## Rebuild and verify the corpus

Python 3.9 or later; standard library only. All source files are already preserved locally.

```sh
python3 -m unittest discover -s tests -p test_corpus.py -v
python3 tools/build_corpus.py
python3 tools/build_corpus.py --check
```

The read-only `--check` verifies source hashes, all chapters and verses, quotation slices and locators, and deterministic output. The starter corpus contains 50 chapters, 1,533 verses, and four comparative appendices with 12 quotations from Luther and Augustine. The appendices cover selected Genesis 1–2 passages only. Luther’s second volume is archived for future use, not quoted in the current notes.

## Interface tests

```sh
node --test tests/core.test.cjs
node --check app.js
```

The browser checks cover actual chapter text, deep links, chapter navigation, search, verse selection, appendices, bibliography, invalid routes, and the theme control. A separate visual check is needed for presentation, mobile layout, and readability.

## Extending the library

Read `SCHEMA.md`, `index.md`, and the recent `log.md` entries first. Add sources before claims. Preserve downloaded originals, record their editions and rights, and keep every quotation traceable to a locator and exact source text. Edit `tools/notes.json` and rebuild rather than hand-editing the generated Markdown or JavaScript. Rebuilding overwrites `notes/*.md`; keep personal notes in separate files.

Add later biblical books as a deliberate extension: the first implementation's reader and navigation are Genesis-specific. It does not claim support for importing another book merely by dropping in a file.

## Reference project

Inspired by the organization of <https://github.com/0xSero/augustine-wiki>: overview, passage catalogue, and source-grounded chapter reading. This project uses an independent implementation; it does not copy the repository's code or Wikipedia identity.
