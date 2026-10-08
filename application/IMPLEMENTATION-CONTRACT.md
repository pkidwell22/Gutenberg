# Local React/PostgreSQL migration — agreed implementation boundary

Existing library root is the parent directory. Legacy index.html/app.js/core.js/style.css and ALL source/corpus files stay untouched. New app is entirely inside application/. No commits, pushes, global config changes or extra features.

## Runtime
React + TypeScript + Vite; Node/TypeScript local API; real PostgreSQL. API binds only 127.0.0.1:64819; development UI 127.0.0.1:64818. Production API serves built dist on its own origin. Keep existing static reader on 64817 until parent verifies replacement and handles origin-preserving handoff. User localStorage preferences must retain scripture-library:theme, scripture-library:size, scripture-library:position on original origin; no assumption that ports share storage.

## Interface contract
GET /api/health returns 200 JSON with database readiness only after successful database query; 503 on failure, no secrets/errors leaked. GET /api/library returns exactly the existing window.SCRIPTURE_LIBRARY data object reconstructed from PostgreSQL (including all extra metadata, source offsets, raw CRLFs, source/note ordering). No static fallback posing as database success. API must serve ONLY allowlisted corpus source files under /raw and /notes, not project contents, config or dependency files. Root /index.html and hash routes work after build. No remote fonts/assets/cloud dependencies.

Shared types: shared/library.ts owned by parent. Frontend uses src/lib/core.ts owned by Qwen worker. Named exports route(hash:string,book:Book):Route and search(chapters:Chapter[],query:string):SearchResult[] preserve legacy core.js semantics. Source/archive provenance unchanged.

## Ownership
- Parent: package.json/package-lock.json, shared/, tooling config, runtime setup, docs, integration tests/review.
- Frontend worker: src/ EXCEPT src/lib/core.ts and src/lib/core.test.ts; application/index.html. Can create frontend component tests under src/ using Vitest jsdom per-file annotation. Radix Select for controlled DOM menus. Do not write core implementation/stubs, shared types or package files.
- Backend worker: server/, db/ and server tests. Export createApp(pool) for API tests and database import/migration functions for real integration validation. CLI is server/cli.ts migrate|import; entrypoint server/index.ts. Runtime config stays in ignored application/.env (parent creates privately). No provisioning, runtime restart, package installs or remote Docker work.
- Qwen worker: src/lib/core.ts and src/lib/core.test.ts ONLY. Port route/search behavior via test-first cycle and existing shared types; no UI/server/filesystem/config changes elsewhere.

## Acceptance
Preserve all existing screens, stable hashes, source links, verse selection, literal whitespace-normalized search, light/dark mode, font size, printing, original Scripture/quotation fonts. Keep coverage/editorial disclaimers. DB migration and repeat imports must be transactional, idempotent, preserve exact corpus and never erase personal annotations. Personal annotations are a separate reserved table, not a new user feature. Fail clearly when database unavailable. Add keyboard/popup tests, no CDN. Frontend mocks establish component behavior only, not live integration. Parent validates real PostgreSQL roundtrip and all verses/quotes in browser; actual open menu screenshots required.

## Host safety
No new app installs, LaunchAgents, remote-debugging flags, removing quarantine or automatic background services. npm project dependencies are routine; parent handles them. Existing Docker context points to another machine; DO NOT use it for local database. Real local PostgreSQL install/runtime approval is pending with parent. No credentials may appear in chat, code, logs or tracked files.
