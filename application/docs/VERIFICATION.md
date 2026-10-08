# React/PostgreSQL migration verification

Verified locally on 2026-10-08. This records the migration, not additional scholarly coverage or a cloud deployment.

## Accepted result

- React/TypeScript/Vite frontend and loopback API running at http://127.0.0.1:64817/index.html#read/2/4.
- Dedicated PostgreSQL cluster uses the private Unix socket, peer OS-user authentication and no TCP listener. No startup/login service was installed.
- The original file-based reader, corpus, source archive and editorial files are preserved. Before this documentation update, the 34-file migration baseline had only README.md changed; all other baseline files were byte-identical.
- Original-origin theme, size and position storage were captured before handoff and compared after reload: unchanged. Reader displayed Genesis 2, 25 verses, verse 4 selected, dark theme and original Charter/Palatino/Georgia font stack at 20px.

## Execution evidence

- Parent reran `npm test`: 88 application tests and 20 Node verifier tests passed, including real PostgreSQL integration in isolated test-database schemas.
- `npm run build` passed TypeScript and Vite production compilation. `python3 ../tools/build_corpus.py --check` passed. Original Python corpus and Node core tests also passed during integration.
- `npm run verify:live` passed against final port 64817: complete API payload equality, 50 chapters, 1,533 verses, four notes, 12 quotations and four sources. `/api/health` reported database ready.
- Final original-origin HTML was verified as the React module build, not the legacy corpus-script page. `/.git/config`, `/application/.env` and `/raw/manifest.json` returned 404.
- Parent browser sweep compared all 1,533 rendered verses and 12 quotations with canonical content. Keyboard menu and 16 viewport/theme/menu combinations passed. Desktop reading and saved mobile open-menu presentation were visually inspected.
- Parent held the candidate build's real `/api/library` browser request: the 15-second deadline produced a retryable error. Removing interception and clicking Retry recovered with real PostgreSQL data. Same-search resubmission returned the scrolled page to the top.
- Initial database backup was restored into a separate temporary verification database and its entire library compared successfully; that temporary database was removed afterward.

## Independent review

The initial reviewer found an effective-destination mismatch between URL validation and node-postgres duplicate-host handling. A fresh fix worker added failing regressions, rejected duplicate/unsupported selectors and nonapproved endpoints, and passed explicit validated fields to `pg.Pool` rather than forwarding a raw URL. It also added the loading deadline and same-hash search behavior correction.

A separate focused re-review passed with no blocking security or logic findings. It was static-only: no tests or database operations were run by that reviewer. Parent testing and live checks are separate evidence. The earlier reviewer inadvertently ran database-writing integration tests in isolated test schemas despite a read-only assignment; this was disclosed, and the re-review prohibited test execution.

One nonblocking test-strengthening suggestion remains: the CLI-isolation test should eventually use its own initially empty schema and assert public is unchanged. The current PGOPTIONS schema-selection implementation was independently found correct; the existing assertion is weaker than that proposed test.

## Local-model browser QA

Qwen's separate preview-origin run reported ten functional checks passing. Parent counted ten unique IDs, inspected the real tool trace, and visually reviewed the saved mobile-menu screenshot. This supplements, rather than replaces, the parent's final-origin checks. See QWEN-EVALUATION.md for correction burden and browser-cleanup limitations. Parent closed Qwen's disposable test tab and verified its target disappeared, removing its remaining target-specific emulation override. No user tab was closed for this cleanup.

## Limits and runtime handoff

- At the migration handoff, Genesis and the four existing comparative notes were the complete reading corpus. The later full historical-text expansion is separately documented in [COMMENTARY-VERIFICATION.md](COMMENTARY-VERIFICATION.md); this migration record is retained as historical evidence. No annotation editor or write API was added.
- No broad accessibility certification, exhaustive multi-browser test, or print-pagination review is claimed. Existing print styling is retained; physical printing was not tested.
- Runtime is local and manually started, not a login service. Application/README.md documents database/API restart and backup commands.
- Git is initialized on main with no commits, staged files or remote. No publishing, pushing or merging occurred.
- The temporary candidate API on 64820 was stopped after final-origin verification. The preview API on 64819 was stopped after Qwen completed. PostgreSQL and the final API on 64817 remain running.

Scratch evidence: `~/.hermes/cache/scratch/scripture-react-migration/` (baseline, original-origin preferences, browser corpus sweep and Qwen execution logs). Worker browser reports and screenshots are under `application/qa/`. Scratch logs are temporary, not the durable source archive.
