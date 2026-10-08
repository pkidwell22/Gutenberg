// @vitest-environment jsdom
// Typed fixtures prove frontend behavior, not corpus/import readiness.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { App } from './App';
import type { Library } from '../shared/library';
import type { CommentaryCatalog, CommentaryWork, CommentarySearchResponse } from '../shared/commentaries';

const library: Library = {schemaVersion:1,coverage:'Genesis',textPolicy:'Exact',book:{id:'genesis',title:'Genesis',translation:'KJV',sourceId:'kjv',chapters:[{number:1,verses:[{number:1,text:'In the beginning',sourceStart:0,sourceEnd:16}]},{number:2,verses:[{number:1,text:'Thus the heavens',sourceStart:17,sourceEnd:33}]}]},notes:[],sources:[]};
const exact = 'First  words & <img src=x>\r\ncontinued.\r\n\r\n_Second_ paragraph.\n\nLast words.';
const work: CommentaryWork = {id:'luther-one',author:'Martin Luther',title:'Lectures on Genesis I',edition:'1904 edition',translator:'J. N. Lenker',coverage:'Genesis 1–5 only',completeness:'Complete source volume; not the full lecture series.',rights:'This English edition is public domain in the US.',sourceUrl:'https://example.org/luther',localPath:'raw/commentaries/luther.txt',sourceSha256:'a'.repeat(64),sourceFormat:'text',textPolicy:'Exact decoded source slices.',sections:[{id:'preface',title:'Preface',kind:'frontmatter',ordinal:0,sourceStart:0,sourceEnd:12,genesisChapters:[],text:'Editor’s preface.'},{id:'creation',title:'The creation',kind:'commentary',ordinal:1,sourceStart:12,sourceEnd:100,genesisChapters:[1],text:exact},{id:'rest',title:'The seventh day',kind:'commentary',ordinal:2,sourceStart:100,sourceEnd:120,genesisChapters:[2],text:'The seventh day.'}]};
const catalog: CommentaryCatalog = {schemaVersion:1,works:[{...work,sections:work.sections.map(({text: _text,...section})=>section)}],gaps:[{author:'Augustine',title:'Literal meaning of Genesis',reason:'Reusable English translation not acquired.'}]};
const results: CommentarySearchResponse = {query:'words',total:1,limited:false,results:[{workId:work.id,workTitle:work.title,author:work.author,sectionId:'creation',sectionTitle:'The creation',snippet:'First words & <img src=x> continued.'}]};
function navigate(hash:string) { window.location.hash=hash; fireEvent(window,new HashChangeEvent('hashchange')); }
function api(overrides: Record<string, unknown> = {}) {
  const responses:Record<string, unknown>={'/api/library':library,'/api/commentaries':catalog,'/api/commentaries/luther-one':work,...overrides};
  const fetcher=vi.fn(async (url: string) => Object.hasOwn(responses,url) ? {ok:true,status:200,json:async()=>responses[url]} : {ok:false,status:404});
  vi.stubGlobal('fetch',fetcher); return fetcher;
}
beforeEach(()=>{localStorage.clear();window.history.replaceState(null,'','/index.html');vi.stubGlobal('scrollTo',vi.fn());HTMLElement.prototype.scrollIntoView=vi.fn();});
afterEach(()=>{cleanup();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

it('times out commentary loading, retries independently and ignores late or unmounted responses',async()=>{
  vi.useFakeTimers();
  let resolveLate!:(value:unknown)=>void;
  const fetcher=vi.fn((url:string)=>url==='/api/library' ? Promise.resolve({ok:true,json:async()=>library}) : new Promise(resolve=>{resolveLate=resolve;}));
  vi.stubGlobal('fetch',fetcher);navigate('#commentaries');const view=render(<App/>);
  await act(async()=>{});
  const signal=(fetcher.mock.calls as unknown as [string,{signal:AbortSignal}][])[1][1]?.signal;
  await act(async()=>{await vi.advanceTimersByTimeAsync(15_000);});
  expect(signal?.aborted).toBe(true);
  expect(screen.getByRole('alert')).toHaveTextContent('Commentaries unavailable');
  fetcher.mockImplementation(async(url:string)=>({ok:true,json:async()=>url==='/api/library'?library:catalog}));
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Retry commentaries'}));});
  expect(screen.getByRole('link',{name:work.title})).toBeInTheDocument();
  await act(async()=>{resolveLate({ok:true,json:async()=>({schemaVersion:1,works:[],gaps:[]})});});
  expect(screen.getByRole('link',{name:work.title})).toBeInTheDocument();
  expect(vi.getTimerCount()).toBe(0);
  view.unmount();
});

it('shows explicit empty catalog and keeps coverage gaps visible',async()=>{
  api({'/api/commentaries':{...catalog,works:[]}});navigate('#commentaries');render(<App/>);
  expect(await screen.findByText('No historical works have been added yet.')).toBeInTheDocument();
  expect(screen.getByText(catalog.gaps[0].reason)).toBeInTheDocument();
});

it('reads exact historical sections with TOC, navigation, provenance and saved typography, not Scripture position',async()=>{
  localStorage.setItem('scripture-library:position','#read/2/1');
  localStorage.setItem('scripture-library:size','26');
  api();navigate('#commentary/luther-one/creation');render(<App/>);
  const prose=await screen.findByRole('article',{name:'The creation'});
  expect(prose.textContent).toBe(exact);
  expect(prose.querySelectorAll('p')).toHaveLength(3);
  expect(prose.querySelector('img')).toBeNull();
  expect(screen.getByRole('combobox',{name:'Text size'})).toHaveTextContent('26px');
  expect(document.documentElement.style.getPropertyValue('--verse-size')).toBe('26px');
  expect(localStorage.getItem('scripture-library:position')).toBe('#read/2/1');
  const toc=screen.getByRole('navigation',{name:'Work contents'});
  expect(within(toc).getByRole('link',{name:/The creation/})).toHaveAttribute('aria-current','page');
  expect(within(toc).getByText('Editorial material')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Previous section'})).toHaveAttribute('href','#commentary/luther-one/preface');
  expect(screen.getByRole('link',{name:'Next section'})).toHaveAttribute('href','#commentary/luther-one/rest');
  fireEvent.click(screen.getByText('Source & provenance'));
  expect(screen.getByText(work.edition)).toBeInTheDocument();
  expect(screen.getByText(work.translator)).toBeInTheDocument();
  expect(screen.getByText(work.rights)).toBeInTheDocument();
  expect(screen.getByText(work.sourceSha256)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Preserved source'})).toHaveAttribute('href',work.localPath);
  expect(screen.getByRole('link',{name:'Genesis 1'})).toHaveAttribute('href','#read/1');
  expect(screen.getByText(/Curated associations, not verse-by-verse mappings/)).toBeInTheDocument();
  expect(document.title).toBe('The creation · Scripture Library');
  fireEvent.click(screen.getByRole('link',{name:'Next section'}));
  await screen.findByRole('article',{name:'The seventh day'});
  await act(async()=>{window.history.back();});
  await screen.findByRole('article',{name:'The creation'});
  await act(async()=>{window.history.forward();});
  await screen.findByRole('article',{name:'The seventh day'});
  expect(localStorage.getItem('scripture-library:position')).toBe('#read/2/1');
});

it('opens a work at its first section and never silently falls back from unknown references',async()=>{
  api();navigate('#commentary/luther-one');render(<App/>);
  await screen.findByRole('article',{name:'Preface'});
  expect(screen.queryByRole('link',{name:'Previous section'})).not.toBeInTheDocument();
  navigate('#commentary/luther-one/unknown');
  await screen.findByRole('heading',{name:'Commentary not found'});
  expect(screen.queryByRole('article')).not.toBeInTheDocument();
  navigate('#commentary/unknown');
  await screen.findByRole('heading',{name:'Commentary not found'});
  navigate('#commentary/%ZZ');
  await screen.findByRole('heading',{name:'Commentary not found'});
});

it('searches full historical text separately from Genesis with scoped, encoded deep links and literal snippets',async()=>{
  const query='faith/works & words';
  const url='/api/commentaries/search?q=faith%2Fworks%20%26%20words&work=luther-one';
  const fetcher=api({[url]:{...results,query,total:72,limited:true}});
  navigate('#commentary/luther-one/creation');render(<App/>);
  await screen.findByRole('article',{name:'The creation'});
  const form=screen.getByRole('search',{name:'Search historical works'});
  fireEvent.change(within(form).getByRole('searchbox'),{target:{value:query}});
  fireEvent.submit(form);
  await screen.findByRole('link',{name:'The creation — Lectures on Genesis I'});
  expect(window.location.hash).toBe('#commentary-search/faith%2Fworks%20%26%20words/luther-one');
  expect(fetcher.mock.calls.map(call=>call[0])).toContain(url);
  expect(screen.getByText('Showing 1 of 72 matching sections. Refine your search to see other matches.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'The creation — Lectures on Genesis I'})).toHaveAttribute('href','#commentary/luther-one/creation');
  expect(document.querySelector('.commentary-result p')?.textContent).toBe(results.results[0].snippet);
  expect(document.querySelector('.commentary-result img')).toBeNull();
  expect(screen.getByRole('searchbox',{name:'Search the Genesis text'})).toHaveValue('');
  expect(screen.getByText(/Literal, case-insensitive/)).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Search the Genesis text'}),{target:{value:'beginning'}});
  fireEvent.submit(document.getElementById('search-form')!);
  await screen.findByRole('heading',{name:'Search Genesis'});
  expect(screen.getByRole('link',{name:'Genesis 1:1'})).toBeInTheDocument();
});

it('offers empty search guidance, no-result state, and unscoped search from the catalog',async()=>{
  api({'/api/commentaries/search?q=unmatched':{query:'unmatched',total:0,results:[],limited:false}});
  navigate('#commentaries');render(<App/>);await screen.findByRole('link',{name:work.title});
  fireEvent.submit(screen.getByRole('search',{name:'Search historical works'}));
  expect(await screen.findByText('Enter a word or phrase to search the historical texts.')).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox',{name:'Search historical text'}),{target:{value:'unmatched'}});
  fireEvent.submit(screen.getByRole('search',{name:'Search historical works'}));
  expect(await screen.findByText('No matching sections. Try another word or phrase.')).toBeInTheDocument();
  expect(window.location.hash).toBe('#commentary-search/unmatched');
});

it('links only explicitly curated historical sections alongside a Genesis chapter, separate from its text',async()=>{
  api();navigate('#read/1');render(<App/>);
  await screen.findByRole('heading',{name:'Genesis 1'});
  const links=await screen.findByRole('region',{name:'Historical works for this chapter'});
  expect(within(links).getByRole('link',{name:'The creation — Martin Luther'})).toHaveAttribute('href','#commentary/luther-one/creation');
  expect(within(links).queryByText('Preface')).not.toBeInTheDocument();
  expect(within(links).queryByText('The seventh day')).not.toBeInTheDocument();
  expect(within(links).getByText(/Curated associations, not verse-by-verse mappings/)).toBeInTheDocument();
  expect(screen.getByRole('article',{name:'Genesis chapter 1'})).not.toHaveTextContent('Luther');
  fireEvent.click(within(links).getByRole('link',{name:'The creation — Martin Luther'}));
  await screen.findByRole('article',{name:'The creation'});
  expect(localStorage.getItem('scripture-library:position')).toBe('#read/1/1');
});

it('isolates unavailable chapter associations from the working Scripture reader',async()=>{
  const fetcher=api();fetcher.mockImplementation(async(url:string)=>url==='/api/library' ? {ok:true,status:200,json:async()=>library} : {ok:false,status:503,json:async()=>null});
  navigate('#read/1');render(<App/>);
  expect(await screen.findByText('Historical chapter links unavailable.')).toBeInTheDocument();
  expect(screen.getByRole('article',{name:'Genesis chapter 1'})).toHaveTextContent('In the beginning');
  expect(screen.getByRole('link',{name:'Next chapter'})).toHaveAttribute('href','#read/2');
  expect(screen.queryByRole('heading',{name:'Library database unavailable'})).not.toBeInTheDocument();
});

it.each([
  ['#commentaries','/api/commentaries',library],
  ['#read/1','/api/commentaries',{schemaVersion:1,works:[{id:'broken'}],gaps:[]}],
  ['#commentary/luther-one','/api/commentaries/luther-one',{...work,sections:[{id:'broken'}]}],
  ['#commentary-search/words','/api/commentaries/search?q=words',{query:'words',total:1,limited:false,results:[{}]}],
])('rejects malformed commentary responses without crashing %s',async(hash,url,payload)=>{
  api({[url as string]:payload});navigate(hash as string);render(<App/>);
  expect(await screen.findByRole('button',{name:/Retry (commentaries|chapter links)/})).toBeInTheDocument();
  expect(screen.getByRole('navigation',{name:'Library'})).toBeInTheDocument();
});

it('shows an explicit empty-work state instead of calling a known work missing',async()=>{
  api({'/api/commentaries/luther-one':{...work,sections:[]}});navigate('#commentary/luther-one');render(<App/>);
  expect(await screen.findByText('No readable sections have been added for this work.')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:work.title})).toBeInTheDocument();
  expect(screen.getByText(work.completeness)).toBeInTheDocument();
  expect(document.title).toBe(`${work.title} · Scripture Library`);
});

it('validates a scoped search work and can broaden the same query to all works',async()=>{
  api({'/api/commentaries/search?q=words&work=missing':{...results,total:0,results:[]},'/api/commentaries/search?q=words&work=luther-one':results,'/api/commentaries/search?q=words':results});
  navigate('#commentary-search/words/missing');render(<App/>);
  await screen.findByRole('heading',{name:'Commentary not found'});
  navigate('#commentary-search/words/luther-one');
  await screen.findByRole('link',{name:'The creation — Lectures on Genesis I'});
  fireEvent.click(screen.getByRole('link',{name:'Search all historical works'}));
  await screen.findByRole('link',{name:'The creation — Lectures on Genesis I'});
  expect(window.location.hash).toBe('#commentary-search/words');
  expect(screen.getByRole('searchbox',{name:'Search historical text'})).toHaveValue('words');
});

it('sets a final not-found document title after an asynchronous unknown-work response',async()=>{
  api();navigate('#commentary/unknown');render(<App/>);
  await screen.findByRole('heading',{name:'Commentary not found'});
  expect(document.title).toBe('Commentary not found · Scripture Library');
});

it('updates the title on a retryable work error and restores it after retry',async()=>{
  const fetcher=api();fetcher.mockImplementation(async(url:string)=>url==='/api/library' ? {ok:true,status:200,json:async()=>library} : {ok:false,status:503,json:async()=>null});
  navigate('#commentary/luther-one');render(<App/>);
  await screen.findByRole('heading',{name:'Commentary unavailable'});
  expect(document.title).toBe('Commentary unavailable · Scripture Library');
  api();fireEvent.click(screen.getByRole('button',{name:'Retry commentaries'}));
  await screen.findByRole('article',{name:'Preface'});
  expect(document.title).toBe('Preface · Scripture Library');
});

it.each([
  ['#commentaries','/api/commentaries',catalog],
  ['#commentary/luther-one','/api/commentaries/luther-one',work],
  ['#commentary-search/words','/api/commentaries/search?q=words',results],
])('aborts pending requests when leaving %s and discards late completion',async(hash,url,payload)=>{
  vi.useFakeTimers();
  let late!:(value:unknown)=>void;
  let signal:AbortSignal | undefined;
  vi.stubGlobal('fetch',vi.fn((requested:string,options:RequestInit)=>{
    if(requested===url) {signal=options.signal as AbortSignal;return new Promise(resolve=>{late=resolve;});}
    return Promise.resolve({ok:true,json:async()=>library});
  }));
  window.history.replaceState(null,'',hash as string);const view=render(<App/>);await act(async()=>{});
  expect(signal?.aborted).toBe(false);
  await act(async()=>{navigate('#home');await vi.advanceTimersByTimeAsync(0);});
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await act(async()=>{late({ok:true,json:async()=>payload});});
  expect(screen.getByRole('heading',{name:'The Book of Genesis'})).toBeInTheDocument();
  view.unmount();expect(vi.getTimerCount()).toBe(0);
});

it('cleans up a pending commentary request on application unmount',async()=>{
  vi.useFakeTimers();let signal:AbortSignal | undefined;
  vi.stubGlobal('fetch',vi.fn((url:string,options:RequestInit)=>{
    if(url==='/api/library') return Promise.resolve({ok:true,json:async()=>library});
    signal=options.signal as AbortSignal;return new Promise(()=>{});
  }));
  window.history.replaceState(null,'','#commentaries');const view=render(<App/>);await act(async()=>{});
  expect(signal?.aborted).toBe(false);expect(vi.getTimerCount()).toBe(1);
  view.unmount();expect(signal?.aborted).toBe(true);expect(vi.getTimerCount()).toBe(0);
});

it('keeps the timeout retry visible when fetch rejects on abort',async()=>{
  vi.useFakeTimers();
  vi.stubGlobal('fetch',vi.fn((url:string,{signal}:{signal:AbortSignal})=>url==='/api/library' ? Promise.resolve({ok:true,json:async()=>library}) : new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));})));
  navigate('#commentaries');render(<App/>);await act(async()=>{});
  await act(async()=>{await vi.advanceTimersByTimeAsync(15_000);});
  expect(screen.getByRole('alert')).toHaveTextContent('Commentaries unavailable');
  expect(screen.getByRole('button',{name:'Retry commentaries'})).toBeInTheDocument();
});

it('lazily opens the work catalog with actual coverage, source links and acquisition gaps',async()=>{
  const fetcher=api();render(<App/>);
  await screen.findByRole('heading',{name:'The Book of Genesis'});
  expect(fetcher.mock.calls.map(call=>call[0])).toEqual(['/api/library']);
  fireEvent.click(screen.getByRole('link',{name:'Commentaries'}));
  await screen.findByRole('link',{name:work.title});
  expect(screen.getByRole('link',{name:work.title})).toHaveAttribute('href','#commentary/luther-one');
  expect(screen.getByText(work.coverage)).toBeInTheDocument();
  expect(screen.getByText(work.completeness)).toBeInTheDocument();
  expect(screen.getByText(catalog.gaps[0].reason)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Original source'})).toHaveAttribute('href',work.sourceUrl);
  expect(screen.getByText(/historical texts, not editorial synthesis/i)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Commentaries'})).toHaveAttribute('aria-current','page');
});
