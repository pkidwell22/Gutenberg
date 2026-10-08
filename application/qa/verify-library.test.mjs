// Corpus parity verifier tests — node:test, no external deps.
// Fixture tests use tiny artificial libraries and a loopback HTTP fixture
// server; they are NOT real PostgreSQL integration tests.
import test from 'node:test';
import assert from 'node:assert/strict';

const { compareLibrary } = await import('./verify-library.mjs');

function fixtureLibrary() {
  return {
    schemaVersion: 1,
    book: {
      id: 'genesis',
      title: 'Genesis',
      translation: 'King James Version',
      sourceId: 'kjv',
      chapters: [
        { number: 1, verses: [
          { number: 1, text: 'SENTINEL_ALPHA\r\nwrapped', sourceStart: 0, sourceEnd: 16 },
          { number: 2, text: 'SENTINEL_BETA', sourceStart: 16, sourceEnd: 29 },
        ] },
        { number: 2, verses: [
          { number: 1, text: 'SENTINEL_GAMMA', sourceStart: 29, sourceEnd: 43 },
        ] },
      ],
    },
    sources: [{
      id: 'kjv', title: 'KJV', url: 'https://example.invalid/kjv',
      localPath: 'raw/kjv.txt', edition: 'e1', translator: 't', rights: 'PD',
      coverage: 'whole bible',
    }],
    notes: [{
      id: 'note-1', title: 'Note', summary: 'sum',
      passages: [{ chapter: 1, start: 1, end: 2 }],
      body: [{ heading: 'h', text: 'p [1]', sourceIds: ['kjv'] }],
      quotes: [{ text: 'SENTINEL_QUOTE', sourceId: 'kjv', locator: 'Gen 1:1',
        lineStart: 10, lineEnd: 11, sourceStart: 100, sourceEnd: 114 }],
      sourceIds: ['kjv'], relatedIds: ['note-2'], localPath: 'notes/note-1.md',
      tags: ['creation'], contested: false, status: 'reviewed',
    }],
    coverage: 'Genesis only',
    textPolicy: 'exact substrings',
  };
}

test('compareLibrary: identical data passes and returns counts', () => {
  const counts = compareLibrary(fixtureLibrary(), fixtureLibrary());
  assert.deepEqual(counts, { chapters: 2, verses: 3, notes: 1, quotes: 1, sources: 1 });
});

test('compareLibrary: changed verse text fails; CRLF vs LF is a change', () => {
  const expected = fixtureLibrary();
  const a = fixtureLibrary();
  a.book.chapters[0].verses[0].text = 'SENTINEL_OMEGA';
  assert.throws(() => compareLibrary(a, expected), /book\.chapters\[0\]\.verses\[0\]\.text: string differs/);
  const b = fixtureLibrary();
  b.book.chapters[0].verses[0].text = 'SENTINEL_ALPHA\nwrapped'; // LF instead of CRLF
  assert.throws(() => compareLibrary(b, expected), /verses\[0\]\.text: string differs/);
});

test('compareLibrary: quote text, offsets, locator, sourceId changes fail', () => {
  const expected = fixtureLibrary();
  const mutations = [
    lib => { lib.notes[0].quotes[0].text = 'TAMPERED'; },
    lib => { lib.notes[0].quotes[0].sourceStart = 101; },
    lib => { lib.notes[0].quotes[0].sourceEnd = 113; },
    lib => { lib.notes[0].quotes[0].lineStart = 12; },
    lib => { lib.notes[0].quotes[0].locator = 'Gen 2:1'; },
    lib => { lib.notes[0].quotes[0].sourceId = 'other'; },
  ];
  for (const mutate of mutations) {
    const lib = fixtureLibrary();
    mutate(lib);
    assert.throws(() => compareLibrary(lib, expected), /library mismatch/);
  }
});

test('compareLibrary: missing/extra chapters and verses fail', () => {
  const expected = fixtureLibrary();
  const missingChapter = fixtureLibrary();
  missingChapter.book.chapters.pop();
  assert.throws(() => compareLibrary(missingChapter, expected), /chapters: array length 1 vs 2/);
  const extraVerse = fixtureLibrary();
  extraVerse.book.chapters[1].verses.push({ number: 2, text: 'X', sourceStart: 0, sourceEnd: 1 });
  assert.throws(() => compareLibrary(extraVerse, expected), /verses: array length 2 vs 1/);
});

test('compareLibrary: reordered arrays fail, reordered object keys pass', () => {
  const expected = fixtureLibrary();
  const swapped = fixtureLibrary();
  [swapped.book.chapters[0], swapped.book.chapters[1]] = [swapped.book.chapters[1], swapped.book.chapters[0]];
  assert.throws(() => compareLibrary(swapped, expected), /library mismatch/);
  const reorderedSources = fixtureLibrary();
  reorderedSources.sources.push({ ...reorderedSources.sources[0], id: 'kjv2' });
  expected.sources.push({ ...expected.sources[0], id: 'kjv2' });
  [reorderedSources.sources[0], reorderedSources.sources[1]] = [reorderedSources.sources[1], reorderedSources.sources[0]];
  assert.throws(() => compareLibrary(reorderedSources, expected), /sources\[0\]\.id/);
  // Object key reordering (same content, different insertion order) must pass.
  const expected2 = fixtureLibrary();
  const actual2 = JSON.parse(JSON.stringify(expected2));
  actual2.book = { chapters: actual2.book.chapters, sourceId: actual2.book.sourceId,
    translation: actual2.book.translation, title: actual2.book.title, id: actual2.book.id };
  assert.deepEqual(compareLibrary(actual2, expected2), { chapters: 2, verses: 3, notes: 1, quotes: 1, sources: 1 });
});

test('compareLibrary: invalid shapes throw concise errors without corpus text', () => {
  for (const bad of [null, undefined, 42, 'text', [], {}, { schemaVersion: 1 }]) {
    assert.throws(() => compareLibrary(bad, fixtureLibrary()), /^Error: invalid actual library/);
  }
  assert.throws(() => compareLibrary(fixtureLibrary(), {}), /^Error: invalid expected library/);
  const emptyChapters = fixtureLibrary();
  emptyChapters.book.chapters = [];
  assert.throws(() => compareLibrary(emptyChapters, fixtureLibrary()), /chapters must be a non-empty array/);
  // Error text must never leak scripture/source bodies.
  const leaky = fixtureLibrary();
  leaky.book.chapters[0].verses[0].text = 'TOP-SECRET-SCRIPTURE-BODY';
  let message = '';
  try { compareLibrary(leaky, fixtureLibrary()); } catch (error) { message = error.message; }
  assert.ok(message.length < 500 && !message.includes('TOP-SECRET-SCRIPTURE-BODY'));
});

test('compareLibrary: extra metadata keys are compared, not ignored', () => {
  const expected = fixtureLibrary();
  expected.sources[0].sha256 = 'aa'.repeat(32);
  expected.book.chapters[0].verses[0].translationNote = 'heb x';
  assert.throws(() => compareLibrary(fixtureLibrary(), expected), /sha256: missing in actual/);
  const withSame = JSON.parse(JSON.stringify(expected));
  assert.deepEqual(compareLibrary(withSame, expected), { chapters: 2, verses: 3, notes: 1, quotes: 1, sources: 1 });
  const changed = JSON.parse(JSON.stringify(expected));
  changed.sources[0].sha256 = 'bb'.repeat(32);
  assert.throws(() => compareLibrary(changed, expected), /sha256: /);
});

// ---------- verifyApi with injected fetch ----------

const { verifyApi, DEFAULT_BASE_URL } = await import('./verify-library.mjs');

function jsonResponse(body, { status = 200, contentType = 'application/json; charset=utf-8' } = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers: { 'content-type': contentType } });
}

function healthOk() { return { ok: true, database: 'ready' }; }

function stubFetch(routes) {
  return async (url) => {
    const route = new URL(url).pathname;
    if (!(route in routes)) throw new Error(`unexpected fetch: ${url}`);
    const result = routes[route];
    return typeof result === 'function' ? result(url) : result;
  };
}

test('verifyApi: default base URL is loopback contract port', () => {
  assert.equal(DEFAULT_BASE_URL, 'http://127.0.0.1:64819');
});

test('verifyApi: success path returns counts from canonical corpus', async () => {
  // Serve the canonical corpus itself back as /api/library.
  const fs = await import('node:fs');
  const corpus = fs.readFileSync(new URL('../../data/library.js', import.meta.url), 'utf8');
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(corpus, sandbox);
  const lib = sandbox.window.SCRIPTURE_LIBRARY;
  const counts = await verifyApi({
    fetchImpl: stubFetch({ '/api/health': jsonResponse(healthOk()), '/api/library': jsonResponse(lib) }),
  });
  assert.deepEqual(counts, { chapters: 50, verses: 1533, notes: 4, quotes: 12, sources: 4 });
});

test('verifyApi: refuses non-loopback, credentials, query, path, https', async () => {
  const fetchImpl = async () => { throw new Error('must not fetch'); };
  for (const base of ['http://example.com:64819', 'http://10.0.0.5:64819',
    'http://user:pass@127.0.0.1:64819', 'http://127.0.0.1:64819?x=1',
    'http://127.0.0.1:64819/#frag', 'http://127.0.0.1:64819/api',
    'https://127.0.0.1:64819', 'not a url']) {
    await assert.rejects(() => verifyApi({ baseUrl: base, fetchImpl }), /baseUrl/);
  }
});

test('verifyApi: HTTP failure, wrong content type, invalid JSON, non-object JSON', async () => {
  const cases = [
    [{ '/api/health': jsonResponse(healthOk(), { status: 503 }) }, /health returned HTTP 503/],
    [{ '/api/health': jsonResponse(healthOk()), '/api/library': jsonResponse({}, { status: 500 }) }, /library returned HTTP 500/],
    [{ '/api/health': jsonResponse(healthOk(), { contentType: 'text/html' }) }, /content-type/],
    [{ '/api/health': jsonResponse('{not json') }, /invalid JSON/],
    [{ '/api/health': jsonResponse([1, 2]) }, /non-object JSON/],
    [{ '/api/health': jsonResponse({ ok: false, database: 'down' }) }, /not ready/],
  ];
  for (const [routes, pattern] of cases) {
    await assert.rejects(() => verifyApi({ fetchImpl: stubFetch(routes) }), pattern);
  }
});

test('verifyApi: redirect refused, never followed', async () => {
  let externalHits = 0;
  const fetchImpl = async (url) => {
    const route = new URL(url).pathname;
    if (route === '/api/health') {
      return new Response(null, { status: 302, headers: { location: 'http://evil.example/health' } });
    }
    externalHits++;
    return jsonResponse(healthOk());
  };
  await assert.rejects(() => verifyApi({ fetchImpl }), /refused redirect/);
  assert.equal(externalHits, 0);
});

test('verifyApi: unreachable and timeout/abort surface as errors', async () => {
  await assert.rejects(() => verifyApi({
    fetchImpl: async () => { throw new TypeError('fetch failed'); },
  }), /health request failed/);
  await assert.rejects(() => verifyApi({
    timeoutMs: 100,
    fetchImpl: async (_url, init) => {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        init.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          const error = new Error('aborted');
          error.name = init.signal.reason?.name ?? 'AbortError';
          reject(error);
        });
      });
      throw new Error('unreachable');
    },
  }), /timed out after 100ms/);
  await assert.rejects(() => verifyApi({ timeoutMs: 0, fetchImpl: async () => { throw new Error('must not fetch'); } }), /timeoutMs/);
});

test('verifyApi: library body differing from canonical fails parity', async () => {
  const fs = await import('node:fs');
  const corpus = fs.readFileSync(new URL('../../data/library.js', import.meta.url), 'utf8');
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(corpus, sandbox);
  const lib = sandbox.window.SCRIPTURE_LIBRARY;
  lib.book.chapters[0].verses[0].text = lib.book.chapters[0].verses[0].text.replace(' ', '\n');
  await assert.rejects(() => verifyApi({
    fetchImpl: stubFetch({ '/api/health': jsonResponse(healthOk()), '/api/library': jsonResponse(lib) }),
  }), /library mismatch/);
});

test('verifyApi: missing canonical corpus file fails clearly', async () => {
  await assert.rejects(() => verifyApi({
    corpusPath: '/nonexistent/library.js',
    fetchImpl: stubFetch({ '/api/health': jsonResponse(healthOk()) }),
  }), /cannot read canonical corpus/);
});

// ---------- review follow-up: global diagnostic cap + MIME essence ----------

test('compareLibrary: MAX_ISSUES cap holds across extra/missing key branches', () => {
  const expected = fixtureLibrary();
  const actual = structuredClone(expected);
  for (let i = 0; i < 100; i++) actual[`unexpected${i}`] = true;
  let message = '';
  try { compareLibrary(actual, expected); } catch (error) { message = error.message; }
  const reported = (message.match(/unexpected in actual/g) ?? []).length;
  assert.ok(reported > 0 && reported <= 10, `expected 1..10 diagnostics, got ${reported}`);
  assert.match(message, /\(\+more mismatches\)/);
  // Cap must also stop traversal into nested mismatches.
  const nested = structuredClone(expected);
  for (let i = 0; i < 100; i++) nested.book[`extra${i}`] = true;
  nested.textPolicy = 'changed';
  let nestedMessage = '';
  try { compareLibrary(nested, expected); } catch (error) { nestedMessage = error.message; }
  const nestedReported = (nestedMessage.match(/unexpected in actual|textPolicy/g) ?? []).length;
  assert.ok(nestedReported <= 10, `expected at most 10 nested diagnostics, got ${nestedReported}`);
});

test('verifyApi: content-type must be exactly application/json essence', async () => {
  const cases = [
    ['application/jsonp', true], ['application/jsonx', true], ['text/application/json', true],
    ['application/jsonp; charset=utf-8', true], ['application/jsonp;charset=utf-8', true],
    ['x-application/json', true], ['application/jsonpfx', true],
    ['application/json', false], ['application/json; charset=utf-8', false],
    ['application/json;charset=UTF-8', false], [' APPLICATION/JSON ; charset=utf-8', false],
    ['application/json ;', false],
  ];
  for (const [contentType, shouldReject] of cases) {
    const fetchImpl = stubFetch({
      '/api/health': new Response(JSON.stringify(healthOk()), { headers: { 'content-type': contentType } }),
      '/api/library': jsonResponse(fixtureLibrary()),
    });
    if (shouldReject) {
      await assert.rejects(() => verifyApi({ fetchImpl }), /content-type/, `should reject: ${contentType}`);
    } else {
      // Valid MIME essence: must reach parity stage (fixture body mismatches canonical,
      // proving the content-type gate passed).
      await assert.rejects(() => verifyApi({ fetchImpl }), /library mismatch/, `should accept: ${contentType}`);
    }
  }
});

// ---------- real loopback HTTP fixture (NOT PostgreSQL integration) ----------

test('verifyApi against loopback fixture server: success and 503', async () => {
  const http = await import('node:http');
  const fs = await import('node:fs');
  const vm = await import('node:vm');
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../../data/library.js', import.meta.url), 'utf8'), sandbox);
  const lib = sandbox.window.SCRIPTURE_LIBRARY;
  let mode = 'ok';
  const server = http.createServer((request, response) => {
    if (request.url === '/api/health') {
      const ready = mode === 'ok';
      response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
      response.end(JSON.stringify(ready ? healthOk() : { error: 'Database unavailable' }));
      return;
    }
    if (request.url === '/api/library' && mode === 'ok') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(lib));
      return;
    }
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'Database unavailable' }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const counts = await verifyApi({ baseUrl });
    assert.deepEqual(counts, { chapters: 50, verses: 1533, notes: 4, quotes: 12, sources: 4 });
    mode = 'down';
    await assert.rejects(() => verifyApi({ baseUrl }), /health returned HTTP 503/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
