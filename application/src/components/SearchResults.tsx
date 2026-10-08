import type { Chapter } from '../../shared/library';
import { search } from '../lib/core';
import { Breadcrumb, verseLink } from './References';
export function SearchResults({chapters,query}:{chapters:Chapter[];query:string}) {
  const results=search(chapters,query);
  return <><Breadcrumb label="Search"/><h1>Search Genesis</h1>
    <p className="muted">{query.trim() ? `${results.length} verse${results.length===1 ? '' : 's'} matching “${query}”` : 'Enter a word or phrase in the search field.'}</p>
    <p className="muted">Search covers the complete KJV Genesis text. It does not search appendix essays.</p>
    {query.trim() && !results.length ? <div className="notice">No matching verses. Try a shorter word or wording from the King James Version.</div> : null}
    {results.map(result=><article className="result" key={`${result.chapter}:${result.verse}`}><a href={verseLink(result.chapter,result.verse)}>Genesis {result.chapter}:{result.verse}</a><p>{result.text}</p></article>)}
  </>;
}
