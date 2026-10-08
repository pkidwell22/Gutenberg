// Independently authored checks for Qwen's verifier. Read-only real-corpus fixture;
// injected HTTP responses here are not live PostgreSQL verification.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {compareLibrary,verifyApi} from './verify-library.mjs';
const context={window:{}};
runInNewContext(readFileSync(new URL('../../data/library.js',import.meta.url),'utf8'),context,{timeout:1000});
const canonical=JSON.parse(JSON.stringify(context.window.SCRIPTURE_LIBRARY));

test('diagnostics stay capped when an API returns many extra keys',()=>{
  const actual=structuredClone(canonical);
  for(let i=0;i<100;i++) actual[`unexpected${i}`]=true;
  let error;
  try {compareLibrary(actual,canonical);} catch(caught){error=caught;}
  assert.ok(error instanceof Error);
  const reported=(error.message.match(/unexpected in actual/g)||[]).length;
  assert.ok(reported<=10,`Expected at most 10 diagnostic entries; received ${reported}`);
});

test('a JSON-looking MIME prefix does not count as application/json',async()=>{
  const fetchImpl=async url=>new Response(JSON.stringify(url.endsWith('/api/health')?{ok:true,database:'ready'}:canonical),{headers:{'content-type':'application/jsonp'}});
  await assert.rejects(verifyApi({fetchImpl}),/content-type/);
});
