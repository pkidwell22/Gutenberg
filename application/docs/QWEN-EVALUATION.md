# Gaming-PC Qwen implementation evaluation

## Scope

The user requested one worker use the existing Hermes `gaming-pc` provider. Its live `/models` endpoint returned `qwen3.8-flash-next-iq3_s`; a separate Hermes CLI worker was launched with that explicit provider/model. Global Hermes provider settings were not changed by the parent. The CLI automatically synchronized its own pending Python dependencies on startup; this is separate from the app's npm dependencies.

Assignment: port the existing pure routing/search module to strict TypeScript, preserving behavior and adding tests. Writable files were restricted to `src/lib/core.ts` and `src/lib/core.test.ts`. Other agents implemented UI and server concurrently.

## Observed result

- Worker session: `20261008_002351_93e1f8`.
- Run metadata confirms model `qwen3.8-flash-next-iq3_s`.
- Agent-reported run duration from structured telemetry: **105.264 seconds**, excluding CLI startup/dependency synchronization. This is not a tokens-per-second benchmark.
- **18 tool calls**, **14 authored tests**, two implementation/test files.
- The trace shows an initial missing-module red, a green search suite, then **five genuinely failing routing behavior tests**, then all 14 passing. This is evidence of a red-green cycle, not proof of perfect one-test-at-a-time TDD discipline.
- Parent read both files, reran all 14 tests, and added independently authored corpus parity checks in `test/core-parity.test.ts`.
- The independent checks compare every real Genesis verse route (1,533), chapter boundaries, malformed/special routes, and searches including every distinct CRLF boundary phrase against the original implementation.
- **16 tests passed across the worker and parity suites. No changes to Qwen's code were needed.**
- Parent's exhaustive parity test initially exceeded Vitest's default five-second timeout; it was rerun successfully with a per-test 20-second budget. No behavioral mismatch was found.
- Original library files remained byte-identical to the parent baseline after this stage.

## Interpretation and limitations

Good result for a bounded, clearly specified port with existing reference behavior. It followed its two-file ownership boundary and produced readable, strict TypeScript without `any`. This does not establish performance on original architecture, complex UI work, security-sensitive database logic, or long autonomous tasks. Its whole-project typecheck happened while other workers were still building; it was not acceptance of the completed application. Parent integration and independent review of the finished app remain separate gates.

Local execution evidence (not shipped source): `~/.hermes/cache/scratch/scripture-react-migration/qwen-run.jsonl` and `qwen-run.stderr`.

## Second assignment: corpus/API verifier and review feedback

Qwen implemented `qa/verify-library.mjs` and its Node built-in tests. The initial run took **297.726 seconds and 26 tool calls** (structured run telemetry). Parent reran all 16 authored tests and the CLI against the actual PostgreSQL-backed API; both passed, including complete payload equality.

Independent code review then found two edge cases and reproduced each with a failing parent-owned test in `qa/review-verifier.test.mjs`:

1. Missing/extra object keys bypassed the declared maximum diagnostic count: 100 extra keys yielded 100 messages instead of a maximum of 10.
2. A substring MIME check incorrectly accepted `application/jsonp` as JSON.

Qwen was resumed with only those findings and a restricted two-file write boundary. It observed the two failing tests, made targeted fixes, added two additional edge-case tests, and did not alter the parent's regression tests. This follow-up took **58.867 seconds and 9 tool calls**. Parent inspected the changes, reran **all 20 verifier tests**, and reran the live API verification successfully.

Assessment: useful initial work, but not flawless. The more open-ended verifier required independent review and one correction round. Its response to precise feedback was efficient and scoped. Neither this nor the first assignment establishes a model-wide reliability rate or decoding throughput; the user's gaming-PC dashboard measures throughput separately.

Evidence: `qwen-corpus-verifier-run.jsonl`, `qwen-verifier-fix-run.jsonl` in the same local scratch directory.

## Third assignment: live browser acceptance

Session `20261008_005431_bbe687`, using the same gaming-PC provider/model, took **570.582 seconds and 57 tool calls**. It tested the actual preview app using clicks, keyboard events, forms, reloads, DOM/geometry inspection and same-origin network reads. The structured report contains exactly ten unique check IDs, each reported passing: overview, deep links, chapter menu, text size, menu dismissal, search, appendices, sources, theme/mobile layout, and invalid routes/history.

Parent inspected the actual tool trace, verified the report count, and visually reviewed `qa/screenshots/qwen-02-reader-390-chaptermenu.png`. It really exercised the menus and persistence checks; the 390px geometry and open-menu screenshot were supported by tool output. No application code fix was needed from these functional checks.

The run was not entirely hands-off:

- Qwen spent substantial effort diagnosing viewport behavior and asserted a harness/proxy cause that the evidence does not establish. Its own trace shows clearing metrics sometimes changed dimensions, so calling the operation simply a no-op is too strong. It eventually re-applied a baseline-sized override instead of removing all overrides as requested.
- Parent closed only Qwen's disposable test tab and verified that target disappeared, conclusively removing its target-specific emulation state. The real reader remained open and working on 64817.
- Its report says source slices were byte-for-byte, but the executed comparison was between decoded JavaScript strings. Treat this as character equality, not an independent byte-level verification.
- It printed a broad open-tab URL inventory during diagnosis instead of filtering to the application. No unrelated page content was inspected in the trace reviewed, but this was unnecessarily broad for the assignment. It also used an extra scratch fragment file beyond its named report artifacts.

Assessment: strong practical browser/tool use with useful evidence and ten supported functional outcomes, but still benefits from supervision around shared-browser cleanup, strict scope and diagnostic certainty. Do not translate the worker's 10/10 functional tally into a claim that its execution was flawless or that it independently approved the migration. The parent separately verified the final application and fixed-runtime behavior.

The original worker reports are retained as evidence with the above qualifications: `qa/browser-qwen-report.json` and `.md`. Execution log: `qwen-browser-run.jsonl` in the scratch directory. No further Qwen run is pending.
