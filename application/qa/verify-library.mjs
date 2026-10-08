// qa/verify-library.mjs — independent corpus parity verifier (Qwen worker).
// Verification code only: it never changes application behavior.
// Node built-ins only. Importing this module performs no CLI run, no network
// and no filesystem reads; all I/O happens inside verifyApi()/main().

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const DEFAULT_BASE_URL = 'http://127.0.0.1:64819';
const DEFAULT_CORPUS_PATH = fileURLToPath(new URL('../../data/library.js', import.meta.url));
export const DEFAULT_FETCH_TIMEOUT_MS = 15000;
const MAX_FETCH_TIMEOUT_MS = 60000;
const MAX_ISSUES = 10;

// ---------- shape validation ----------

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function kindOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// Concise structural gate so later messages reference paths, not dumps.
// Rejects degenerate empties (no chapters, no verses in a chapter) because a
// corpus parity verifier must not report "verified" for an empty payload.
function assertLibraryShape(value, label) {
  const bad = (detail) => { throw new Error(`invalid ${label} library: ${detail}`); };
  if (!isPlainObject(value)) bad('not an object');
  if (typeof value.schemaVersion !== 'number') bad('schemaVersion must be a number');
  if (!isPlainObject(value.book)) bad('book must be an object');
  for (const key of ['id', 'title', 'translation', 'sourceId']) {
    if (typeof value.book[key] !== 'string') bad(`book.${key} must be a string`);
  }
  if (!Array.isArray(value.book.chapters) || value.book.chapters.length === 0) {
    bad('book.chapters must be a non-empty array');
  }
  value.book.chapters.forEach((chapter, i) => {
    if (!isPlainObject(chapter) || typeof chapter.number !== 'number') {
      bad(`book.chapters[${i}] must be an object with a numeric number`);
    }
    if (!Array.isArray(chapter.verses) || chapter.verses.length === 0) {
      bad(`book.chapters[${i}].verses must be a non-empty array`);
    }
    chapter.verses.forEach((verse, j) => {
      if (!isPlainObject(verse) || typeof verse.number !== 'number' ||
          typeof verse.text !== 'string' || typeof verse.sourceStart !== 'number' ||
          typeof verse.sourceEnd !== 'number') {
        bad(`book.chapters[${i}].verses[${j}] malformed`);
      }
    });
  });
  if (!Array.isArray(value.sources) || value.sources.length === 0) {
    bad('sources must be a non-empty array');
  }
  value.sources.forEach((source, i) => {
    if (!isPlainObject(source) || typeof source.id !== 'string') bad(`sources[${i}] malformed`);
  });
  if (!Array.isArray(value.notes)) bad('notes must be an array');
  value.notes.forEach((note, i) => {
    if (!isPlainObject(note) || typeof note.id !== 'string' || !Array.isArray(note.quotes)) {
      bad(`notes[${i}] malformed`);
    }
    note.quotes.forEach((quote, j) => {
      if (!isPlainObject(quote) || typeof quote.text !== 'string' ||
          typeof quote.sourceId !== 'string') {
        bad(`notes[${i}].quotes[${j}] malformed`);
      }
    });
  });
  if (typeof value.coverage !== 'string') bad('coverage must be a string');
  if (typeof value.textPolicy !== 'string') bad('textPolicy must be a string');
}

// ---------- deep equality ----------
// Object key order irrelevant; array order significant; strings compared
// exactly (CRLF vs LF, Unicode, typographic characters never normalized).
// Extra metadata keys beyond shared/library.ts participate in equality.
// Messages carry paths and value classes only — never scripture/source text.

function collectDiff(actual, expected, pathLabel, issues) {
  if (issues.length >= MAX_ISSUES) return;
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      issues.push(`${pathLabel}: type ${kindOf(actual)} vs ${kindOf(expected)}`);
      return;
    }
    if (actual.length !== expected.length) {
      issues.push(`${pathLabel}: array length ${actual.length} vs ${expected.length}`);
      return;
    }
    for (let i = 0; i < actual.length; i++) {
      collectDiff(actual[i], expected[i], `${pathLabel}[${i}]`, issues);
    }
    return;
  }
  if (isPlainObject(actual) || isPlainObject(expected)) {
    if (!isPlainObject(actual) || !isPlainObject(expected)) {
      issues.push(`${pathLabel}: type ${kindOf(actual)} vs ${kindOf(expected)}`);
      return;
    }
    const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
    for (const key of keys) {
      if (issues.length >= MAX_ISSUES) break;
      if (!Object.hasOwn(actual, key)) { issues.push(`${pathLabel}.${key}: missing in actual`); continue; }
      if (!Object.hasOwn(expected, key)) { issues.push(`${pathLabel}.${key}: unexpected in actual`); continue; }
      collectDiff(actual[key], expected[key], `${pathLabel}.${key}`, issues);
    }
    return;
  }
  if (Object.is(actual, expected)) return;
  if (typeof actual === 'string' || typeof expected === 'string') {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      issues.push(`${pathLabel}: type ${kindOf(actual)} vs ${kindOf(expected)}`);
    } else {
      issues.push(`${pathLabel}: string differs (length ${actual.length} vs ${expected.length})`);
    }
    return;
  }
  // Numbers/booleans/null are metadata (offsets, flags) — safe to show.
  issues.push(`${pathLabel}: ${String(actual)} vs ${String(expected)}`);
}

// ---------- public API ----------

export function compareLibrary(actual, expected) {
  assertLibraryShape(actual, 'actual');
  assertLibraryShape(expected, 'expected');
  const issues = [];
  collectDiff(actual, expected, '$', issues);
  if (issues.length > 0) {
    const more = issues.length >= MAX_ISSUES ? ' (+more mismatches)' : '';
    throw new Error(`library mismatch: ${issues.join('; ')}${more}`);
  }
  const chapters = actual.book.chapters.length;
  const verses = actual.book.chapters.reduce((sum, c) => sum + c.verses.length, 0);
  const quotes = actual.notes.reduce((sum, n) => sum + n.quotes.length, 0);
  return { chapters, verses, notes: actual.notes.length, quotes, sources: actual.sources.length };
}

// ---------- canonical local corpus ----------
// data/library.js is OUR generated trusted classic script; evaluating it in
// an isolated vm context is deliberate. API response data is NEVER evaluated:
// it only ever passes through JSON.parse (res.json()).
function loadCanonicalLibrary(corpusPath) {
  let source;
  try {
    source = fs.readFileSync(corpusPath, 'utf8');
  } catch {
    throw new Error(`cannot read canonical corpus at ${corpusPath}`);
  }
  const sandbox = { window: {} };
  try {
    vm.runInNewContext(source, sandbox, { timeout: 10000, filename: corpusPath });
  } catch {
    throw new Error(`canonical corpus failed to evaluate: ${corpusPath}`);
  }
  const library = sandbox.window.SCRIPTURE_LIBRARY;
  assertLibraryShape(library, 'expected');
  return library;
}

// ---------- URL safety ----------
// Loopback http only; no credentials, query, fragment or unexpected path.
// Runs before any fetch, injected or not, so DI cannot bypass it.
function assertLoopbackBaseUrl(baseUrl) {
  let url;
  try { url = new URL(baseUrl); } catch { throw new Error('invalid baseUrl'); }
  if (url.protocol !== 'http:') throw new Error('baseUrl must use http');
  if (url.username || url.password) throw new Error('baseUrl must not embed credentials');
  if (url.search) throw new Error('baseUrl must not contain a query');
  if (url.hash) throw new Error('baseUrl must not contain a fragment');
  if (url.pathname !== '' && url.pathname !== '/') throw new Error('baseUrl must not contain a path');
  const host = url.hostname;
  const loopback = /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) || host === '[::1]';
  if (!loopback) throw new Error('baseUrl must be loopback (127.x.x.x or ::1)');
  return url.origin;
}

// One request per endpoint, bounded by AbortSignal.timeout, redirect:'manual'
// (any 3xx is refused outright — stricter than "no external redirects", but
// the real server never redirects and following chains could hide failures).
function resolveTimeoutMs(timeoutMs) {
  if (timeoutMs === undefined) return DEFAULT_FETCH_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_FETCH_TIMEOUT_MS) {
    throw new Error('timeoutMs must be an integer between 1 and 60000');
  }
  return timeoutMs;
}

// MIME essence must be exactly application/json (case-insensitive), with
// optional semicolon parameters. Rejects application/jsonp, +json variants
// and substring lookalikes — no broadening to arbitrary JSON-ish types.
function isJsonContentType(contentType) {
  return (contentType.split(';')[0] ?? '').trim().toLowerCase() === 'application/json';
}

async function fetchJsonObject(origin, route, fetchImpl, timeoutMs) {
  const doFetch = fetchImpl ?? globalThis.fetch;
  let response;
  try {
    response = await doFetch(`${origin}${route}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      ? `timed out after ${timeoutMs}ms`
      : 'request failed';
    throw new Error(`GET ${route} ${reason}`);
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`GET ${route} refused redirect (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`GET ${route} returned HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!isJsonContentType(contentType)) {
    throw new Error(`GET ${route} returned unexpected content-type: ${contentType || 'none'}`);
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error(`GET ${route} returned invalid JSON`); }
  if (!isPlainObject(body)) throw new Error(`GET ${route} returned non-object JSON`);
  return body;
}

export async function verifyApi({ baseUrl = DEFAULT_BASE_URL, corpusPath, fetchImpl, timeoutMs } = {}) {
  const origin = assertLoopbackBaseUrl(baseUrl);
  const boundedTimeout = resolveTimeoutMs(timeoutMs);
  const expected = loadCanonicalLibrary(corpusPath ?? DEFAULT_CORPUS_PATH);
  const health = await fetchJsonObject(origin, '/api/health', fetchImpl, boundedTimeout);
  // Readiness contract taken from the current backend implementation
  // (server/app.ts GET /api/health): 200 { ok: true, database: 'ready' },
  // 503 otherwise. If that contract changes, this check must be re-read.
  if (health.ok !== true || health.database !== 'ready') {
    throw new Error('health check reports server not ready');
  }
  const actual = await fetchJsonObject(origin, '/api/library', fetchImpl, boundedTimeout);
  return compareLibrary(actual, expected);
}

// ---------- CLI ----------

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--base-url' || arg === '--corpus') {
      const value = argv[++i];
      if (value === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      if (arg === '--base-url') options.baseUrl = value; else options.corpusPath = value;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  try {
    const counts = await verifyApi(options);
    process.stdout.write(`${JSON.stringify({
      verified: true,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      counts,
    })}\n`);
  } catch (error) {
    process.stderr.write(`verify failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
