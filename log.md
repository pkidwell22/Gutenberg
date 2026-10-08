---
title: Scripture Library corpus log
created: 2026-10-08
updated: 2026-10-08
type: log
tags: [log, provenance]
sources: [raw/manifest.json]
---

# Corpus log

Append-only. Dates below are UTC. Scope, limits and maintenance instructions: [[SCHEMA]]. Catalog and note navigation: [[index]].

## [2026-10-08] ingest | Frozen public-domain primary sources

- Downloaded full original UTF-8 response bytes for Project Gutenberg eBooks 10, 48193, 27978 and 3296 into `raw/kjv.txt`, `raw/luther1.txt`, `raw/luther2.txt` and `raw/augustine.txt`.
- Saved original catalog HTML as `raw/metadata-10.html`, `raw/metadata-48193.html`, `raw/metadata-27978.html`, `raw/metadata-3296.html`. Each catalog expressly states public domain in the USA; no worldwide rights claim is made.
- Created `raw/manifest.json` with URL provenance, edition and translator details, UTC retrieval date, coverage, byte counts and SHA-256 for both text and catalog files. Original Gutenberg notices and licenses retained. No source text was edited or normalized.
- Luther volume II is archived for expansion, not cited by the initial notes. Augustine's underlying print impression is not identified in the electronic file, and is not guessed.

## [2026-10-08] create | Complete Genesis and selected comparisons

- Created the standard-library builder/validator `tools/build_corpus.py`, reviewed editorial recipes `tools/notes.json`, task-local citation ledger `tools/citations.json`, and test-first suite `tests/test_corpus.py`.
- Generated `data/library.js`: complete Genesis, 50 chapters and 1,533 numbered verses, exact decoded source substrings retaining original punctuation and internal line wraps.
- Generated `notes/creation-days-and-time.md`, `notes/formless-matter.md`, `notes/divine-speech-and-word.md` and `notes/sabbath-and-providence.md`: four comparative notes with twelve mechanically extracted quotations from Luther volume I and Augustine's Confessions.
- Notes are explicitly labeled Editorial synthesis, carry real Genesis passage ranges and source IDs, distinguish agreement from disagreement, and have frontmatter, source lists and reciprocal links.
- Created `SCHEMA.md`, `index.md` and this `log.md`. Notes are restricted to selected Genesis 1–2 passages; do not infer full-book commentary coverage or an exhaustive theological comparison.

## [2026-10-08] lint | TDD, reproducibility and source integrity

- Observed failing tests before implementing the parser, inline-marker support, wrapped-marker support, full builder, corruption validator, generated-note contract and offline write/check entry point. Early inspection exposed Gutenberg verse markers both inside lines and followed by CRLF; tests and implementation now cover both.
- `python3 -m unittest discover -s tests -p test_corpus.py -v`: seven tests passed, including mutation subtests and scratch-copy source-file corruption checks.
- `python3 tools/build_corpus.py` and `python3 tools/build_corpus.py --check` returned: 50 chapters, 1,533 verses, 4 notes, 12 quotes, 4 source files and 4 catalog metadata files.
- Source checks verify all raw/catalog hashes and every scripture/quote substring. The check mode also compares all five generated artifacts byte-for-byte against a fresh deterministic render. Tests confirm rebuild determinism and failure on altered verse text, numbering, chapter counts, quote text, quote line locators, source IDs, source hashes, passage ranges and duplicate note IDs.
- Separate citation-ledger evidence verification passed for all four notes. It warns that corpus-level sources [1] (KJV) and [3] (Luther II) are not cited in each individual comparison; this is intentional. Strict ledger mode treats these unused-source warnings as failures, so it is not the corpus acceptance check. The exact-text validator is stricter than the ledger's normalized quote matching.
- Citation-ledger prose-coverage percentages count frontmatter, locators and blockquote lines as prose; they are not used to score these structured notes. Each editorial body unit carries source IDs and every primary quotation carries an exact locator.
- No UI or root README changes, installs, commits or pushes were performed by the corpus builder.
- Final wiki lint checked seven Markdown pages: no missing frontmatter or broken wikilinks. Final quotation distribution: seven Luther I extracts and five Augustine extracts. A locator was checked against the original heading and corrected to Chapter I, I. Introduction before the final rebuild.
- Final `data/library.js` SHA-256: `82f6c3e084602b8dc62607a8225c8dab4d1861bab16299444c307e8d420a2d25`.

## Integration | Static reader and local verification

- Added independent `index.html`, `style.css`, `app.js`, and `core.js`; no reference-project code copied. Added `DESIGN.md`, `README.md`, `VERIFICATION.md`, `tests/core.test.cjs`, and `tests/browser_checks.py`.
- Connected the complete corpus to overview, chapter-and-verse reading, full-book search, narrative navigation, comparative appendices, and bibliography with edition/translator/rights/coverage metadata.
- Preserved scripture, quotations, and editorial prose as visibly distinct layers. Chapter margin shows only notes linked to that chapter; uncovered chapters explicitly say no appendix is available.
- Added local reading preferences and last-opened-passage storage with graceful handling of unavailable browser storage. Search normalizes line-break whitespace for matching only; returned source text remains unchanged.
- Re-ran the seven corpus tests, two core tests, syntax check, and deterministic corpus check successfully. Browser integration checks passed from local files. A full DOM sweep matched all 1,533 verses and all 12 quotations to the imported data (HTML newline normalization only).
- Visually inspected overview, desktop reading, an appendix, and mobile reading at 390px; verified no mobile horizontal overflow and font preference persistence. Full boundaries and unverified cases are in `VERIFICATION.md`.
- Clarified the authoring contract: edit `tools/notes.json`; generated `notes/*.md` are reading exports and will be overwritten on rebuild. No cloud publishing, application installs, Git commits, or pushes.

## Relocation and reader presentation cleanup

- Moved the project from `/Users/patrickk/Documents/Scripture Library` to `/Users/patrickk/Desktop/Repositories/Scripture Library`. All 32 existing files were verified byte-identical immediately after the move. Updated local instructions in README and SCHEMA.
- Restarted only the verified project-owned loopback server on the same port, 64817, serving the new path. Existing HTTP links continue to work. The old folder is no longer present. No Git initialization, commit, remote, or push was added.
- Simplified the requested reader details in `style.css`: selected verses now use a small filled number marker rather than a rounded paragraph card and left edge; reader controls use an open row, bottom divider, and quiet Print action.
- Updated DESIGN and added `tests/reader_cleanup_checks.py`. The reading font, source files, editorial content, and application logic remain unchanged.
- Seven corpus tests, two core tests, deterministic source verification, browser integration checks, and cleanup presentation checks passed from the new location. Eight reader viewport/theme combinations showed no horizontal overflow. Desktop and mobile presentation visually inspected.

## React and PostgreSQL migration | 2026-10-08

- Added `application/`: React/TypeScript/Vite, styled Radix menus, a loopback API, transactional PostgreSQL schema/import and preserved corpus readback. The original source archive and file-based reader remain intact; no new book or commentary coverage was added.
- Installed PostgreSQL with approval and created a dedicated private Unix-socket cluster without a login service. Verified import fidelity and a backup/isolated-restore round trip.
- Initialized local Git on main with secret/build/runtime exclusions; no commit, remote or push.
- Used parallel frontend/backend workers and gaming-PC Qwen workers for core logic, a verifier, and real browser QA. Independent evidence and correction burden are recorded in `application/docs/QWEN-EVALUATION.md`.
- Resolved the independent review's database destination validation finding, plus loading deadline and same-search resubmission regressions. Focused independent re-review passed without blocking issues. Parent reran 88 application and 20 verifier tests, build/typecheck, corpus validation and live browser checks.
- Replaced the old Python server on 64817 with the compiled React/API app. Theme, size and reading-position storage remained unchanged; final live API equality and private-path denial passed. Original reading typography is preserved.
- Final evidence, review limitations, manual startup and backup instructions: `application/docs/VERIFICATION.md` and `application/README.md`.

## Full historical-text collection | 2026-10-08

- Added a separate exact-text corpus: two complete archived Luther Genesis volumes (1:1–4:14 and 4:8–9:29), Augustine’s complete Confessions and City of God, and Basil’s nine creation homilies. Six works, 64 sections, 5,425,559 Unicode characters. Original Genesis/appendix payload and immutable archives remain unchanged.
- Archived verified City of God and Basil source/rights evidence; preserved edition-specific translator credits, Luther overlap, anthology selection, editorial labels and source offsets. Luther Genesis 10–50 and modern Augustine literal-Genesis translations remain unacquired/unlicensed; no complete-Genesis coverage is claimed.
- Added additive PostgreSQL migration 002, validated transactional commentary imports, catalog/work/literal-search endpoints and contained source serving. Added lazy full-work reader, contents, previous/next, scoped search, provenance, curated Genesis links and print styling.
- Independent source review caught publisher advertisements under Augustine Book XIII; a failing regression preceded their exact-text reclassification as unassociated editorial material. Independent integrated review caught BOM decoding inconsistency; a fresh worker added a failing BOM + supplementary-Unicode test and fixed it. Focused independent static re-review passed.
- Parent final suite passed 141 application, 20 Node verifier, 13 Python corpus and two legacy core tests; deterministic checks and TypeScript/Vite build passed. All six API work payloads and source hashes matched; all 64 rendered sections matched canonical text exactly. Desktop, narrow dark and print-emulated presentation inspected, with stated viewport/printing limitations.
- Backed up before main import, imported six works/64 sections, and replaced only the app-owned backend on original port 64817. Final health, exact commentary API/search, unchanged Scripture payload and saved original-origin preferences passed. No PostgreSQL restart, Tailscale change, commit, push or public release.
- Durable handoff: `application/docs/COMMENTARY-SOURCES.md`, `application/docs/COMMENTARY-VERIFICATION.md` and `application/README.md`.
