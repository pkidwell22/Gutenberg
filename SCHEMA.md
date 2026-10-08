---
title: Scripture Library corpus schema
created: 2026-10-08
updated: 2026-10-08
type: schema
tags: [method, provenance]
sources: [raw/manifest.json]
---

# Scripture Library corpus schema

## Scope and editorial policy

The reader contains **all 50 chapters and 1,533 verses of Genesis** from Project Gutenberg's KJV electronic edition. The appendix starts with **four comparative notes and twelve primary-text extracts**, on selected passages in Genesis 1–2. This is neither a full commentary on Genesis nor a comprehensive survey of academic theology. Luther is a major voice; Augustine is read alongside him rather than through Luther alone. No code was copied from augustine-wiki.

The long-term orientation is broadly comparative academic theology, not denominational adjudication. This starter collection is narrower: two historical Christian interpreters, in older English translations. Jewish interpretation, other Christian traditions, modern critical scholarship, original-language textual criticism, and Genesis 3–50 commentary are not represented by these notes. These omissions are coverage limits, not judgments of importance.

- Separate primary extracts, attributed paraphrases, and **Editorial synthesis**.
- Preserve disagreements. A later date does not supersede an earlier theological position.
- Do not identify Luther's account of Augustine with Augustine's own position without checking Augustine directly.
- Distinguish interpretation of a passage from an author's incidental mention of it.
- Do not infer an author's complete position from a selected extract. Old translations are witnesses to be checked, not critical editions.
- Historical polemics in the complete raw volumes are archived for study, not endorsed.
- Mechanical verification establishes textual fidelity to these downloads, not the truth or scholarly consensus of interpretations.

## Layer 1: frozen source material

`raw/*.txt` are complete, unmodified downloads, including Gutenberg headers, notices and licenses. `raw/metadata-*.html` are the original catalog response bodies used to establish USA public-domain status. They retain original bytes, BOMs and CRLF. Do not prepend frontmatter to them. **The immutable manifest is their metadata sidecar**: the deliberate exception to the wiki's usual raw-frontmatter convention.

`raw/manifest.json` records each source's stable ID, canonical catalog URL, requested and resolved download URLs, edition, translator/editor, UTC retrieval date, byte count, SHA-256, coverage, rights statement, archived catalog path and catalog checksum. Retrieval dates are dates of this capture, not original publication dates. Rights are verified for the USA only; check local law elsewhere. Preserve the full Gutenberg license when redistributing the original files.

A later download must get a **new versioned filename and provenance record**. Never silently replace or normalize this capture, and never update its checksum to conceal an accidental edit. The present manifest is frozen with this corpus snapshot; extend by a documented versioned manifest rather than retroactively altering provenance.

Archived voices:

- `kjv`: entire Bible downloaded; only Genesis is extracted into the reader.
- `luther1`: 1904 Lenker edition, based on Henry Cole's translation; Genesis 1–3 and material on Genesis 4 are present. Notes select Genesis 1–2 only.
- `luther2`: 1910 Lenker edition, Genesis 4–9; kept for future expansion, not cited by the current notes. The foreword's translator attributions are recorded in the manifest.
- `augustine`: Confessions, E. B. Pusey's English translation, Books I–XIII; notes select the Genesis meditations of Books XI–XIII. The underlying print impression is not identified by the electronic file.

## Layer 2: authored recipes and generated notes

`tools/notes.json` is the editable editorial input. Body prose is plain text, not HTML. Numbered citations map to `citationId` in source records and the task-local `tools/citations.json` ledger. Each body paragraph also records `sourceIds`; each note has actual Genesis passage ranges, an explicit synthesis status, a coverage-aware summary, and at least two related notes.

Quotations are **not retyped** in this file. `quoteSelections` identify a frozen source ID, inclusive one-based line range, and a human-readable book/chapter/section or paragraph-incit locator. The builder extracts the exact characters. Raw line locators refer to the archived electronic file, not pages or chapter subdivisions that this edition does not print. A future edition will require new locators.

`notes/*.md` are generated comparison pages with YAML frontmatter: `title`, `created`, `updated`, `type`, `tags`, `sources`, `confidence`, `contested`, `status`, `passages`. Frontmatter flow values use JSON syntax, which is valid YAML. `confidence: medium` indicates a bounded editorial comparison of two translated witnesses, not uncertainty that the extracts match their source.

All pages link to [[index]], [[SCHEMA]], and at least two related notes. Related-note links are reciprocal. Index and log also carry frontmatter. Add new pages to the index and append every corpus change to [[log]]. Do not let automatic generation erase the append-only log. Bump editorial dates when changing the authored notes; the current builder's fixed date identifies this reviewed snapshot, not the time of every rebuild.

Tag taxonomy: `creation`, `time`, `matter`, `word`, `sabbath`, `providence`, `comparison`, `method`, `provenance`, `index`, `log`.

## Layer 3: reader data contract

`data/library.js` is a classic script assigning:

```text
window.SCRIPTURE_LIBRARY = {
  schemaVersion: 1,
  book: {id, title, translation, sourceId, chapters: [
    {number, verses: [{number, text, sourceStart, sourceEnd}]}
  ]},
  sources: [{id, title, url, localPath, edition, translator, rights, coverage, ...}],
  notes: [{id, title, summary, passages: [{chapter, start, end}],
    body: [{heading, text, sourceIds}],
    quotes: [{text, sourceId, locator, lineStart, lineEnd, sourceStart, sourceEnd}],
    sourceIds, relatedIds, localPath, tags, contested, status}],
  coverage, textPolicy
};
```

- `book.sourceId` resolves to the KJV source; all other source IDs also resolve.
- `localPath` is relative to the library root, including the `raw/` or `notes/` prefix.
- Verse numbers and passage endpoints are one-based integers; endpoints are inclusive.
- **Every scripture `text` and quotation `text` is an exact substring of `raw.read_bytes().decode('utf-8-sig')`.** Internal CRLF line wraps, spelling, punctuation and typographic apostrophes are preserved. Verse labels and the whitespace between verse records are not verse text. Nothing is modernized, corrected, harmonized or joined by hand.
- `sourceStart` and `sourceEnd` are zero-based decoded Unicode character offsets, with exclusive end; they are **not byte offsets**. The UTF-8 BOM is stripped for this decoded coordinate system only, never from the raw file or its checksum.
- The Gutenberg Genesis text includes verse markers embedded inside lines, and some markers are followed by a newline rather than a space. The parser handles both. It skips the table-of-contents heading and stops before Exodus.
- Source extracts can contain historical plain-text conventions; they are rendered as text, not executable HTML. All UI interpolation must be escaped. Editorial body strings contain citation markers only, not Markdown formatting or HTML.
- Markdown blockquote prefixes and their LF display endings are presentation; the canonical exact substrings are in the JS payload.

## Rebuild and verify, entirely offline

Requires Python 3.9 or later; standard library only. No packages, credentials, database, network fetch or installation is used by the builder.

```sh
cd '/Users/patrickk/Desktop/Repositories/Scripture Library'
python3 -m unittest discover -s tests -p test_corpus.py -v
python3 tools/build_corpus.py
python3 tools/build_corpus.py --check
```

The builder validates before writing and writes only `data/library.js` and the four generated `notes/*.md` files. `--check` is read-only: it checks source/catalog SHA-256 and byte counts, Gutenberg start/end boundaries, archived rights evidence, all chapter and verse numbers/counts, every exact scripture slice, every quotation and its line/character locator, reference resolution, note ranges, and byte-for-byte reproducibility of generated outputs. It fails on drift rather than silently repairing raw sources.

Tests were written and observed failing before each new parser, builder, validator and generator capability was implemented. The test suite covers inline and wrapped verse markers, TOC/Exodus boundaries, 1,533 real verses, the source contract, all quoted extracts, reciprocal links, and tampering with data and raw files. Test-only copies live beneath `/Users/patrickk/.hermes/cache/scratch`, never system temporary directories.

The hard-coded chapter verse totals are a structural regression guard, not an independently sourced alternative Bible. Exact source-marker comparison is the primary check of the electronic text. A checksum proves consistency with this snapshot, not authenticity of a historical manuscript.
