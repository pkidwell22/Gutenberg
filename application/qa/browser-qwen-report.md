# Scripture Library — independent browser QA (Qwen worker)

- Date: 2026-10-08 (EDT)
- Target: http://127.0.0.1:64819/index.html (preview build, hash routes)
- Method: real browser session `scripture-qwen-browser` (Browser Use / CDP): DOM inspection, real clicks, fill_input, keyboard events. Same-origin fetch for API/raw-file checks. No source/DB/config modifications.
- Scope note: known configuration-validation, loading-timeout, and same-search-resubmit issues were excluded (separate worker, fixes not deployed). This is one model execution on this preview build; it is not a model-wide benchmark and does not approve the overall migration.

## Tally

10 / 10 checks pass. 0 fail, 0 blocked.

| # | Check | Status |
|---|-------|--------|
| 1 | overview | pass |
| 2 | deep-link | pass |
| 3 | chapter-menu | pass |
| 4 | text-size | pass |
| 5 | menu-dismissal | pass |
| 6 | search | pass |
| 7 | appendices | pass |
| 8 | sources | pass |
| 9 | theme-and-mobile | pass |
| 10 | invalid-and-navigation | pass |

## Findings per check

1. overview — pass. H1 "The Book of Genesis"; "A narrative guide" section labeled "Editorial divisions, not source headings" with 8 passage links; coverage panel distinguishes reading text (KJV, 50 chapters / 1,533 verses) from companion material (4 sourced appendices); sidebar shows Exodus, Leviticus, Numbers, Deuteronomy each labeled "Not yet added".
2. deep-link — pass. #read/2/4 renders H1 "Genesis 2" with exactly 25 p.verse elements (1..25); #v4 carries class "verse selected"; no paragraph-card selection; verse text preserves CRLF wrap (not rewritten). /api/library independently confirms 25 verses in ch. 2.
3. chapter-menu — pass. #chapter-select is a BUTTON role=combobox (Radix, not native select). Keyboard Enter opened role=listbox with 50 role=option items; End moved focus asynchronously (polled until option "50" was active), Enter selected: route #read/50, H1 "Genesis 50", 26 verses rendered; /api/library confirms chapter 50 = 26 verses.
4. text-size — pass. Via the real menu: 26px selected; computed .verse-text font-size 26px; localStorage scripture-library:size = "26"; survives reload; restored to initial 20px through the UI (no direct storage writes).
5. menu-dismissal — pass. Escape closes both menus (aria-expanded=false, listbox removed) and returns focus to the originating trigger (#chapter-select / #text-size). No lost keyboard focus.
6. search — pass. Form-submitted "earth was" -> #search/earth%20was, "4 verses matching", includes Genesis 1:2 despite CRLF wrap in the stored text; clicking the result selects p.verse#v2 on #read/1/2. No-result query shows readable empty state ("No matching verses. Try a shorter word or wording from the King James Version.").
7. appendices — pass. #appendices -> opened #note/creation-days-and-time: badge "Editorial synthesis / Distinct from the biblical text"; 3 attributed blockquotes with real text and precise cites (Luther, Commentary on Genesis Vol. 1 Ch. I lines 1965-1970; Augustine, Confessions Book XI lines 6944-6957; Luther Ch. II lines 5210-5226); source links to gutenberg.org/ebooks/48193 and /3296 (href validated only, not clicked); passage links #read/1/1, #read/1/31, #read/2/1.
8. sources — pass. #sources bibliography lists 4 works with Edition / Translator / Coverage / Rights (e.g. KJV: Gutenberg eBook 10, updated 2024-10-29; "Public domain in the USA. Full Gutenberg notices and license retained") and relative local copies raw/kjv.txt, raw/luther1.txt, raw/luther2.txt, raw/augustine.txt. Same-origin fetch('/raw/kjv.txt') -> 200 text/plain, 4,451,854 chars, starts with preserved Gutenberg header incl. CRLF; API sourceStart/sourceEnd slices for Gen 1:1 and 1:2 match the raw file byte-for-byte. fetch('/application/.env') -> 404 (body never read).
9. theme-and-mobile — pass. Light/dark toggle works and persists across reload (data-theme + localStorage); original dark theme restored. At a true 390px viewport (window.innerWidth==390): reader and overview show zero horizontal overflow (scrollWidth==clientWidth==390, no element right edge > 391); both Radix menus open fully inside the viewport (chapter listbox rect x=63 w=61 h=320; text-size x=167 w=76 h=129); menu asserted open before/after screenshot.
10. invalid-and-navigation — pass. #read/999 and malformed #search/% both render "Page not found" with "Return to Genesis" link. history.back/forward walk the exact prior entries (#search/% -> #read/999 -> #home and forward again). Ending route restored to #read/2/4 with all menus closed.

## Environment/harness observations (not app defects)

- The harness CDP proxy scales Emulation.setDeviceMetricsOverride by ~1/0.9 and its clearDeviceMetricsOverride is a no-op on this backend; the harness baseline itself is an override. Baseline was restored by re-applying the harness's own override (observed 1858x1052 dpr1.8, identical to session start).
- The tab runs backgrounded (visibilityState=hidden); Radix Select keyboard opening intermittently required Emulation.setFocusEmulationEnabled(true), which was set back to false in finally.
- One extra tab opened during viewport diagnosis got stuck at 355px due to the proxy clear bug and was closed; it was created by this QA run, not pre-existing.

## Restored state at end

Route #read/2/4; theme dark (initial); text size 20px (initial); all menus closed; viewport at harness baseline; focus emulation false; no browser zoom changes.

## Artifacts

- qa/browser-qwen-report.json (machine-readable, 10 checks with evidence + limitations)
- qa/browser-qwen-report.md (this file)
- qa/screenshots/qwen-01-overview.png
- qa/screenshots/qwen-02-reader-390-chaptermenu.png
- qa/screenshots/qwen-03-final-read-2-4.png

Screenshots are supplementary; all pass claims above rest on DOM/geometry/network evidence captured live. Visual review of screenshots is left to the parent.
