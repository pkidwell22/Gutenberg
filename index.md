---
title: Scripture Library index
created: 2026-10-08
updated: 2026-10-08
type: index
tags: [index, provenance]
sources: [raw/manifest.json]
---

# Scripture Library index

**Complete scripture:** Genesis, King James Version — 50 chapters, 1,533 verses, mechanically extracted from the archived Project Gutenberg text. The KJV electronic edition is not a facsimile of the 1611 printing.

**Selected appendix:** Four comparison pages, twelve verified primary-text extracts. The notes cover selected passages in Genesis 1–2 only. They do not supply commentary for the whole book. Their initial voices are Luther and Augustine; broader comparative scholarship remains future work.

## Comparisons — 4 pages

- [[notes/creation-days-and-time]] — Genesis 1:1–5, 1:31, 2:1–3: narrated creation days and the question of time before creation.
- [[notes/divine-speech-and-word]] — Genesis 1:1–3: creative command, eternal Word, and the difference between saying and temporal effects.
- [[notes/formless-matter]] — Genesis 1:1–2: Luther's objection to Augustine's ‘almost nothing’ and Augustine's own qualification.
- [[notes/sabbath-and-providence]] — Genesis 2:1–3: continuing preservation and promised eternal rest as different emphases.

## Frozen primary sources

The [source manifest](raw/manifest.json) gives editions, translators, URLs, retrieval date, coverage, byte counts, checksums, and USA-only public-domain evidence for each item.

- [KJV Bible](raw/kjv.txt) — complete downloaded source; reader extracts Genesis only. [Catalog](https://www.gutenberg.org/ebooks/10).
- [Luther, Creation, volume I](raw/luther1.txt) — 1904 Lenker edition, based on Cole; current extracts concern Genesis 1–2. [Catalog](https://www.gutenberg.org/ebooks/48193).
- [Luther, Sin and the Flood, volume II](raw/luther2.txt) — 1910 Lenker edition, Genesis 4–9; archived for expansion, no current note extracts. [Catalog](https://www.gutenberg.org/ebooks/27978).
- [Augustine, Confessions](raw/augustine.txt) — Pusey translation, Books I–XIII; selected Genesis meditations in XI–XIII. [Catalog](https://www.gutenberg.org/ebooks/3296).

Catalog HTML copies are also frozen in `raw/metadata-*.html`. All original Gutenberg notices remain intact.

## Maintenance

- [[SCHEMA]] — data contract, exact-text policy, editorial limits and offline build/check commands.
- [[log]] — append-only ingestion and validation history.
- `tools/notes.json` — reviewed editorial prose and quote-selection recipes.
- `tools/build_corpus.py` — Python-standard-library offline builder and verifier.
- `tests/test_corpus.py` — parser, completeness, integrity, reproducibility and corruption tests.
