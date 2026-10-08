import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import type { Library } from '../shared/library';
import { route, search } from '../src/lib/core';

const require = createRequire(import.meta.url);
const legacy = require('../../core.js') as {route:typeof route;search:typeof search};
const context = {window:{} as {SCRIPTURE_LIBRARY?:Library}};
runInNewContext(readFileSync(new URL('../../data/library.js',import.meta.url),'utf8'),context,{timeout:1000});
const library:Library=JSON.parse(JSON.stringify(context.window.SCRIPTURE_LIBRARY));

describe('independent migration parity against the real corpus',()=>{
  it('matches every valid verse route and chapter boundary',()=>{
    let checked=0;
    for(const chapter of library.book.chapters){
      for(const verse of chapter.verses){
        const hash=`#read/${chapter.number}/${verse.number}`;
        expect(route(hash,library.book),hash).toEqual(legacy.route(hash,library.book));
        checked++;
      }
      for(const hash of [`#read/${chapter.number}`,`#read/${chapter.number}/0`,`#read/${chapter.number}/${chapter.verses.length+1}`]){
        expect(route(hash,library.book),hash).toEqual(legacy.route(hash,library.book));
      }
    }
    expect(checked).toBe(1533);
    for(const hash of ['', '#', '#home', '#sources', '#appendices', '#read/51', '#read/-1', '#read/01', '#read/1/1/extra','#search/%', '#search/a%2Fb','#note/creation-days-and-time','#note/a.b']){
      expect(route(hash,library.book),hash).toEqual(legacy.route(hash,library.book));
    }
  });
  it('matches literal searches including every CRLF boundary phrase',()=>{
    const queries=new Set(['',' ','earth was','covenant','GOD','Noah',"God's",'.*','[',';','\\','a/b']);
    for(const chapter of library.book.chapters){
      for(const verse of chapter.verses){
        for(const match of verse.text.matchAll(/(\S+)\r\n(\S+)/g)) queries.add(`${match[1]} ${match[2]}`);
      }
    }
    for(const query of queries){
      expect(search(library.book.chapters,query),query).toEqual(legacy.search(library.book.chapters,query));
    }
    expect(queries.size).toBeGreaterThan(12);
  }, 20_000);
});
