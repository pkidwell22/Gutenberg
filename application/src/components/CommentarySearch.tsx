import { useEffect, useState } from 'react';
import type { CommentaryCatalog, CommentarySearchResponse } from '../../shared/commentaries';
import { commentaryLink } from '../lib/commentaryRoutes';
import { isCommentaryCatalog, isCommentarySearch } from '../lib/commentaryValidation';
import { useCommentaryResource } from '../lib/useCommentaryResource';
import { CommentaryMissing } from './CommentaryStatus';

export function CommentarySearchForm({query='',workId}:{query?:string;workId?:string}) {
  const [search,setSearch]=useState(query);
  useEffect(()=>{setSearch(query);},[query]);
  return <form className="commentary-search" role="search" aria-label="Search historical works" onSubmit={event=>{
    event.preventDefault();
    const hash=`#commentary-search/${encodeURIComponent(search.trim())}${workId ? `/${encodeURIComponent(workId)}` : ''}`;
    if(window.location.hash===hash) window.scrollTo(0,0);else window.location.hash=hash;
  }}><label htmlFor="commentary-query">Search historical text</label><div><input id="commentary-query" type="search" maxLength={500} placeholder={workId ? 'Search this work…' : 'Search all historical works…'} value={search} onChange={event=>setSearch(event.target.value)}/><button type="submit">Search commentaries</button></div><p className="subtle">{workId ? <>Within <a href={commentaryLink(workId)}>this work</a>.</> : 'All acquired historical works.'}</p></form>;
}
export function CommentarySearch({query,workId}:{query:string;workId?:string}) {
  return workId ? <ScopedSearch query={query} workId={workId}/> : <SearchScreen query={query}/>;
}
function ScopedSearch({query,workId}:{query:string;workId:string}) {
  const {state,retry}=useCommentaryResource<CommentaryCatalog>('/api/commentaries',isCommentaryCatalog);
  if(state.status==='loading') return <><h1>Search commentaries</h1><p role="status">Loading search scope…</p></>;
  if(state.status==='error') return <><h1>Search commentaries</h1><p role="alert">Commentary catalog unavailable. Search scope could not be verified.</p><button onClick={retry}>Retry commentaries</button></>;
  if(!state.data.works.some(work=>work.id===workId)) return <CommentaryMissing/>;
  return <SearchScreen query={query} workId={workId}/>;
}
function SearchScreen({query,workId}:{query:string;workId?:string}) {
  return <><p className="breadcrumb"><a href="#commentaries">All commentaries</a> / Search</p><h1>Search commentaries</h1><p className="muted">Literal, case-insensitive full-text search with normalized whitespace. Display snippets are extracts, not the canonical section text. This search does not include Genesis or editorial appendices.</p><CommentarySearchForm query={query} workId={workId}/>
    {workId && <p><a href={`#commentary-search/${encodeURIComponent(query)}`}>Search all historical works</a></p>}
    {query.trim() ? <SearchMatches key={`${query}/${workId ?? ''}`} query={query} workId={workId}/> : <p>Enter a word or phrase to search the historical texts.</p>}
  </>;
}
function SearchMatches({query,workId}:{query:string;workId?:string}) {
  const {state,retry}=useCommentaryResource<CommentarySearchResponse>(`/api/commentaries/search?q=${encodeURIComponent(query)}${workId ? `&work=${encodeURIComponent(workId)}` : ''}`,isCommentarySearch);
  if(state.status==='loading') return <p role="status">Searching historical texts…</p>;
  if(state.status==='error') return state.notFound ? <CommentaryMissing/> : <><p role="alert">Commentary search unavailable. Try the local service again.</p><button onClick={retry}>Retry commentaries</button></>;
  const data=state.data;
  return <><p role="status">{data.limited ? `Showing ${data.results.length} of ${data.total} matching sections. Refine your search to see other matches.` : `${data.total} matching ${data.total===1 ? 'section' : 'sections'}.`}</p>{!data.results.length && <p>No matching sections. Try another word or phrase.</p>}{data.results.map(result=><article className="result commentary-result" key={`${result.workId}/${result.sectionId}`}><a href={commentaryLink(result.workId,result.sectionId)}>{result.sectionTitle} — {result.workTitle}</a><div className="muted">{result.author}</div><p>{result.snippet}</p></article>)}</>;
}
