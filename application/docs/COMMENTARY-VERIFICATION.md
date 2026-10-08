# Full historical-text collection verification

## Implementation and source coverage

The collection contains six works, 64 sections and 5,425,559 Unicode characters: two Luther Genesis volumes, Augustine’s complete *Confessions* and *City of God* (two volumes), and Basil’s nine creation homilies. [COMMENTARY-SOURCES.md](COMMENTARY-SOURCES.md) records editions, actual coverage, reuse evidence and remaining gaps. Source offsets count decoded Unicode characters, not bytes or JavaScript UTF-16 units.

The reader provides a catalog, section contents, previous/next navigation, literal collection/work-scoped search, source provenance, curated Genesis chapter links, text-size controls and section print styling. Canonical section text is not a summary. Metadata loads separately; full works are fetched lazily. Commentary requests have timeout, cancellation, retry and stale-response protection. The original Genesis and editorial-appendix payload remains separate.

Database migration `002` is additive. Commentary imports are independently validated, transactional and advisory-locked; replacement touches the commentary collection, not Scripture or personal annotations. The main database was backed up before expansion and then migrated/imported deliberately.

## Parent execution evidence

- After the BOM correction, the parent reran the full suite: **141 application tests, 20 Node verifier tests, 13 Python corpus tests and two legacy Node core tests passed**, with no skipped tests reported. Both deterministic corpus checks and TypeScript/Vite production build passed. These are author/coordinator checks, not independent review.
- The canonical six-work corpus passed the backend validator. Main import reported six works and 64 sections.
- On candidate API port 64820, every complete work response equaled the canonical JSON object, the catalog equaled its text-free summaries, and every served archive matched its recorded SHA-256.
- Literal searches for `creation`, `in the beginning`, `earth was`, `%`, `[`, and an absent phrase agreed with independently computed normalized-text matches and ordering. Search for `the` reported all 64 matching sections, returned 50 and declared the limit. Empty search returned zero. Oversized queries/IDs were rejected with 400; tested private/traversal paths returned 404.
- Browser navigation checked **all 64 sections** across all six works. Every `.commentary-prose` DOM `textContent` exactly equaled the canonical section text: all 5,425,559 Unicode characters, including editorial sections. This is decoded-text equality, not a byte comparison of HTML.
- Scoped Luther search returned three sections for `in the beginning`; Genesis 1 displayed curated Luther, Augustine and Basil links. A nonexistent section showed the not-found screen.
- Visually inspected light desktop catalog and Luther reader, narrow-screen dark reader, and print-emulated Basil Homily I. Serif typography was retained, contents stacked on narrow screens, print hid controls and used black text on white. Emulation overrides were cleared afterward. The narrow-screen capture measured 433 CSS pixels after a nominal 390-device-pixel override; it is not evidence of an exact 390-CSS-pixel viewport.
- Existing live `/api/library` remained exact after the additive main import: 50 chapters, 1,533 verses, four notes, 12 quotations and four sources.

Scratch evidence: `~/.hermes/cache/scratch/commentary-api-verification.json` and `commentary-browser-fidelity.json`. These temporary probes supplement this durable record; the immutable raw sources/manifests and corpus recipes remain the provenance authority.

## Independent review and correction

A source reviewer caught T. & T. Clark advertisements being attributed to Augustine’s Book XIII. A failing regression preceded the exact `LIST OF WORKS` boundary correction. The advertisements are preserved as `publisher-matter`, labeled Editorial material and associated with no Genesis chapters. Rebuild/check and the independent follow-up confirmed contiguous source partitions and exact characters.

The integrated static reviewer found one blocking UTF-8 BOM decoding mismatch: backend `ignoreBOM:true` preserved U+FEFF while Python `utf-8-sig` excludes it. All six current archives are BOM-free, so current import fidelity is unaffected. A fresh fix worker added a failing database-free BOM + `A😀` regression, changed `ignoreBOM` to `false` while preserving strict decoding, and passed the regression and type check. The parent reran the full suite/build. A separate static re-review passed with no blockers; it verified BOM exclusion, supplementary Unicode indexing and the regression’s use of actual bytes. Neither reviewer ran tests or accessed the database.

Other static-review checks passed: parameterized SQL, bounded literal search, commentary-only replacement, checksum-checked migrations, annotations isolation, allowlisted/contained source serving and sandbox CSP, escaped React text rendering, lazy request guards, and separate legacy routes/API. The reviewer ran no tests or database operations. One nonblocking suggestion remains: mirror the backend’s 200-character work/section ID bound in frontend route parsing, so oversized slugs show not-found rather than unavailable.

## Final local handoff

The original app URL, <http://127.0.0.1:64817/index.html#commentaries>, now serves the completed reader and new backend. Only the verified app-owned API process was replaced; PostgreSQL was not restarted. Final-origin health reported database ready. Every work payload, catalog summary and archived source hash was rechecked against the corpus, and literal/capped searches passed. The original library verifier again returned the unchanged 50 chapters, 1,533 verses, four notes, 12 quotations and four sources. Original-origin saved preferences matched before/after reload, and the final-origin Luther Genesis 1 DOM text matched exactly. The final dark desktop reader was visually inspected.

## Limits

No later Luther Genesis 10–50 English continuation was verified as reusable; no modern Augustine literal-Genesis translation was imported. No claim of critical-edition collation, worldwide rights clearance, exhaustive accessibility/multi-browser testing, physical printing or print-pagination proofing is made. Tailscale sharing, publishing, startup-service installation, commits and pushes were not performed.
