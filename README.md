# Scripture Library

A local, Genesis-first academic reading library. The reading text is the **King James Version**. Theological appendices take a **comparative academic approach**, with Luther as a major historical voice rather than the single governing interpretation.

## Open the current application

The React/PostgreSQL application is served locally at <http://127.0.0.1:64817/index.html#read/2/4>. The API and the dedicated local PostgreSQL cluster must be running; no internet is needed for reading or search. The original URL, reading font, hash links and browser preference keys are preserved.

```sh
cd "$HOME/Desktop/Repositories/Scripture Library/application"
npm start
```

See [application/README.md](application/README.md) for database startup, development, rebuilding, tests and backups. Source texts, import recipes and generated corpus remain independent of the React interface. The local Git repository is initialized; no remote repository or commit has been created.

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

The browser's storage remembers preferences only. Notes and imported texts live in the project files, not in browser storage. Storage restrictions must not prevent reading. Preferences under `file://` can vary by browser; local HTTP gives a consistent origin.

## Academic boundaries

The KJV is a historical English translation, not a substitute for the Hebrew text or a critical apparatus. This reading edition must not be described as a facsimile of the 1611 printing.

Scripture, historical quotation, and editorial commentary are visibly separate. Editorial notes are AI-assisted starting points for study, not peer-reviewed conclusions. Historical interpretations remain attributed, including disagreements. A small selection of historical Christian sources is not a comprehensive survey of Jewish interpretation or modern historical-critical scholarship.

The complete Genesis text and the selective appendices have different coverage. An appendix links only the passages it actually discusses. No commentary is silently manufactured for uncovered chapters. Exodus, Leviticus, Numbers, and Deuteronomy are labeled **Not yet added**.

Check source-specific permissions and jurisdiction before redistribution. Public-domain status for an older work does not establish the rights of a modern translation. Preserved downloads retain their source notices.

## Project layout

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
