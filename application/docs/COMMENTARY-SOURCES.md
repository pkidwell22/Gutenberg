# Commentary collection: editions, coverage and acquisition limits

## Prepared corpus

The separate `data/commentaries.json` corpus currently contains six works in 64 reading sections. Sections preserve exact decoded-character slices from archived text; they are not AI summaries or rewritten translations. The original Genesis/appendix corpus is unchanged.

| Author | Work available in the prepared corpus | Coverage and qualifications |
|---|---|---|
| Martin Luther | *Commentary on Genesis*, Volume I: *Luther on the Creation* | Complete archived 1904 Cole/Lenker volume. Genesis 1:1–4:14. Historical introductions and editorial outlines remain distinguishable from exposition. |
| Martin Luther | *Commentary on Genesis*, Volume II: *Luther on Sin and the Flood* | Complete archived 1910 Lenker volume. Genesis 4:8–9:29. The opening discussion revises/reprints material also present in Volume I. |
| Augustine | *Confessions* | Complete Pusey translation, Books I–XIII. Genesis-related reflections are concentrated in XI–XIII; this is not a running Genesis commentary. |
| Augustine | *The City of God*, Volume I | Complete 1871 edition, Books I–XIII. Books XI–XIII discuss creation, humanity and the fall. |
| Augustine | *The City of God*, Volume II | Complete 1871 edition, Books XIV–XXII, with editorial indexes/transcriber notes separately labeled. Book XIV continues the fall discussion. Other books are readable without invented verse mappings. |
| Basil of Caesarea | *Hexæmeron* | All nine creation homilies plus their historical introduction and notes, translated by Blomfield Jackson. Extracted from the larger 1895 NPNF VIII anthology; neighboring works are not part of this reader import. Not a complete Genesis commentary or exhaustive treatment of humanity’s creation. |

These are editions preserved for study, including historical polemics, obsolete scientific claims and editorial apparatus. Inclusion is not endorsement. Fidelity to an archived translation is not a claim of critical-edition authority.

## Luther: overlap and remaining gap

The two imported Luther volumes overlap at Genesis 4:8–14. Keep them as separate edition witnesses; do not concatenate their text and imply an unbroken nonduplicated commentary.

No additional reusable English continuation for Genesis 10–50 was verified in this acquisition pass. The modern American Edition covers the later lectures, but an accessible publisher sample is not permission to import the entire copyrighted translation. No purchase, restricted download or rights circumvention occurred.

Henry Cole’s original 1858 translation of Genesis 1–5 was also located. It is an earlier alternative witness, not later chapter coverage. Available OCR contains obvious corruption, so it is not silently promoted to a proofread scholarly text. A later addition would need scan-based verification and an explicit OCR-quality label.

A modern combined public-domain-volume reprint was inspected but adds no chapter coverage, so it was not imported as another duplicate work.

## Attribution and rights

- Luther I: Henry Cole’s Latin-to-English translation, revised, enlarged and partly retranslated/edited by John Nicholas Lenker (1904).
- Luther II: Lenker’s foreword credits C. B. Gohdes for Genesis 6, President Schaller for Genesis 5 and 7–9, and Lenker for analyses/editing (1910).
- Augustine, *City of God*: Marcus Dods translation; printed attribution assigns Books IV, XVII and XVIII to George Wilson and Books V–VIII to J. J. Smith. Do not attribute every book to Dods alone.
- Gutenberg catalogs declare the imported editions public domain **in the USA**. All original notices/licenses remain in the archived complete files. No worldwide rights clearance is asserted.
- Basil: CCEL XML declares the historical edition “Public Domain” and gives the 1895 print basis. The reader selects historical translated text, not modern site descriptions or artwork. CCEL’s separately archived policy permits personal, educational or nonprofit use and requests permission for republication or commercial use of its editions. This local import is not blanket clearance to republish the CCEL edition. Check those conditions before a later public release.
- Modern English Augustine editions of *The Literal Meaning of Genesis* and *On Genesis* against the Manichees were located but not cleared for reuse. Ancient Latin authorship does not remove translation copyright. The included related works are not mislabeled as those commentaries.

## Sources and durable evidence

Existing frozen provenance: `raw/manifest.json` (unchanged).

New frozen provenance: `raw/commentaries/manifest-2026-10-08.json`, with original response-body checksums, byte counts, exact URLs, translator/edition metadata, archived rights evidence and the CCEL policy sidecar. Acquisition copies were checked against the research-download manifest before archiving.

- [Luther I — Gutenberg 48193](https://www.gutenberg.org/ebooks/48193)
- [Luther II — Gutenberg 27978](https://www.gutenberg.org/ebooks/27978)
- [Cole 1858 — Archive.org catalog](https://archive.org/details/creationcommenta00luth) — unproofread OCR, not imported
- [Modern Luther publisher sample](https://s3.amazonaws.com/cph-org-assets/media/pdf/151744.pdf) — rights/coverage evidence only
- [Confessions — Gutenberg 3296](https://www.gutenberg.org/ebooks/3296)
- [City of God I — Gutenberg 45304](https://www.gutenberg.org/ebooks/45304)
- [City of God II — Gutenberg 45305](https://www.gutenberg.org/ebooks/45305)
- [Basil — CCEL historical-edition XML](https://ccel.org/ccel/s/schaff/npnf208.xml)
- [CCEL edition-use policy](https://ccel.org/about/copyright.html)
- [Augustine, modern On Genesis edition](https://www.cuapress.org/9780813210889/on-genesis) — not imported

## Reproducible extraction

`tools/commentary-recipes.json` is the editable recipe. `tools/build_commentaries.py` verifies archive/catalog integrity, finds exact unambiguous source headings, rejects duplicate IDs and reversed/missing boundaries, preserves source order and generates only `data/commentaries.json`. The original archive and existing editorial corpus are never rewritten.

Offsets are zero-based Unicode-character positions in UTF-8 decoded without a BOM, with exclusive end positions. They are not byte offsets or JavaScript UTF-16 code-unit offsets. Search may normalize whitespace for matching and snippets; canonical section text remains exact. Gutenberg wrapper/license text remains in the original downloads rather than being presented as an author's prose.

Chapter associations are curated navigation aids, not exhaustive verse-level exegetical mappings. Editorial indexes, introductions and transcriber notes are explicitly titled and have no Genesis associations.

```sh
python3 -m unittest discover -s tests -p test_commentaries.py -v
python3 tools/build_commentaries.py
python3 tools/build_commentaries.py --check
```

The six-work/64-section corpus has been imported and is readable/searchable at the original local app URL. Database/API equality, all rendered section text, source hashes, preserved Scripture payload and independent review are recorded in [COMMENTARY-VERIFICATION.md](COMMENTARY-VERIFICATION.md); those checks are separate from successful corpus generation.
