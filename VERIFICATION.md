# Local verification

## Delivered scope

Complete KJV Genesis: 50 chapters, 1,533 verses. Four editorial comparisons on selected Genesis 1–2 passages, with 12 exact source extracts from Luther and Augustine. Luther volume II is preserved for future expansion but not quoted by these notes. Later biblical books are not imported into this reader.

## Executed checks

- `python3 -m unittest discover -s tests -p test_corpus.py -v`: 7 tests passed.
- `python3 tools/build_corpus.py --check`: passed; confirms raw/catalog hashes, structural counts, exact scripture and quotation source slices, valid locators/references, and deterministic generated files.
- `node --test tests/core.test.cjs`: 2 tests passed, with assertions for literal case-insensitive search, cross-line phrase search without altering source text, valid references, malformed encoding, and invalid chapter/verse paths.
- `node --check app.js`: passed.
- `tests/browser_checks.py` executed through Hermes browser tools against the populated library: chapter deep links, source text, next chapter, search results, verse selection, appendix catalogue, quotations, bibliography, translator/editor metadata, invalid references, and theme toggle passed.
- Real browser DOM sweep: every chapter rendered; all 1,533 verse strings matched imported text after the browser's CRLF-to-LF normalization. All 12 displayed quotations across all four notes matched their imported text under the same normalization. No mismatch failures.
- Opened the real `file://` page and ran the integration checks successfully without a server. Resource inspection showed no HTTP(S) requests for reading assets.
- Visually inspected desktop overview, desktop chapter reader, a comparative appendix, and a 390px-wide mobile chapter reader. Mobile document width did not exceed viewport width. Light and dark presentation inspected.
- Font-size selection persisted across a real browser reload.

## Limits

These are author/integration checks, not an independent scholarly review or independent code review. Exact quotation matching establishes fidelity to the preserved electronic sources, not the correctness of editorial interpretations. Safari, Firefox, screen-reader workflows, and print output were not separately verified. The current appendix collection is not a representative survey of all academic approaches.

A request to open the Hermes preview pane returned success, but read-back could not reach a Desktop window showing the chat. Preview-pane visibility is therefore not verified; the library itself was verified in the controlled browser and can be opened directly from `index.html`.

## Frontend polish: Hermes-inspired presentation

- Inspected the actual running Hermes window and shipped mono palette. Applied neutral dark/light surfaces, compact sans-serif interface typography, restrained outlines, small navigation icons, and quieter verse selection. Preserved the original Scripture and quotation font family, size controls, and Scripture line height.
- The application changes are confined to `style.css` and decorative SVG markup in `index.html`. `DESIGN.md` records the visual direction; `tests/polish_checks.py` checks the presentation contract. Before/after SHA-256 comparison confirmed source material, generated corpus, editorial notes, `app.js`, and `core.js` are unchanged.
- Existing browser integration checks passed. Presentation checks passed for dark surface, compact toolbar, preserved Scripture typeface, distinct interface headings, no desktop overflow, and instantaneous theme-control color changes.
- Checked six routes at widths 320, 390, 1024, and 1440 in both light and dark mode: 48 combinations, no horizontal overflow. Visually inspected dark desktop overview/reader, light desktop appendix, and both mobile reader themes.
- The original seven corpus tests, two core tests, and read-only deterministic corpus check passed. The local HTTP server was verified to serve the exact updated stylesheet.
- Calculated body/secondary-text contrast for representative light/dark surface pairs; all checked pairs exceeded 4.5:1. This is not a comprehensive accessibility audit.
- Saved the final reader preview at `screenshots/reader-polished.png`. No Hermes settings, source data, external systems, or application behavior were changed.

