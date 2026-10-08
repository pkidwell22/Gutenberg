import { useEffect, useState, type ReactNode } from 'react';
import { preferences } from '../lib/preferences';

function Icon({kind='book'}:{kind?:string}) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {kind==='overview' ? <path d="M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm-2 15a2 2 0 0 1 2-2h14M8 7h6"/> : kind==='notes' ? <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></> : kind==='sources' ? <path d="M7 3h9l4 4v14H7V3Zm9 0v5h4M3 7v14M11 12h5M11 16h5"/> : <path d="M12 5v15M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/>}
  </svg>;
}
export function Shell({children,page,query='',announcement}:{children:ReactNode;page:string;query?:string;announcement:string}) {
  const [theme,setTheme]=useState(()=>preferences.get('theme','light')==='dark' ? 'dark' : 'light');
  const [search,setSearch]=useState(query);
  useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
  useEffect(()=>{if(page==='search') setSearch(query);},[page,query]);
  const active=page==='note' ? 'appendices' : page.startsWith('commentary') ? 'commentaries' : page;
  return <>
    <a className="skip-link" href="#content" onClick={event=>{event.preventDefault();document.getElementById('content')?.focus();}}>Skip to reading</a>
    <header className="masthead">
      <a className="brand" href="#home"><span className="book-mark"><Icon/></span><span>Scripture Library<small>A local academic resource</small></span></a>
      <form id="search-form" role="search" onSubmit={event=>{
        event.preventDefault();
        const hash=`#search/${encodeURIComponent(search.trim())}`;
        // Identical hashes emit no hashchange, but resubmitting still returns to the results top.
        if(window.location.hash===hash) window.scrollTo(0,0);
        else window.location.hash=hash;
      }}>
        <label className="sr-only" htmlFor="search-input">Search the Genesis text</label>
        <input id="search-input" type="search" placeholder="Search Genesis…" maxLength={300} value={search} onChange={event=>setSearch(event.target.value)}/><button type="submit">Search</button>
      </form>
      <button id="theme" type="button" className="quiet" onClick={()=>{const next=theme==='light' ? 'dark' : 'light';setTheme(next);preferences.set('theme',next);}}>{theme==='light' ? 'Dark mode' : 'Light mode'}</button>
    </header>
    <div className="layout"><aside className="sidebar"><nav aria-label="Library"><p className="nav-heading">Books of Moses</p>
      <a href="#home" data-nav="home" aria-current={active==='home' ? 'page' : undefined}><Icon kind="overview"/>Genesis <span>Available</span></a>
      {['Exodus','Leviticus','Numbers','Deuteronomy'].map(title=><p className="future" key={title}>{title}<small>Not yet added</small></p>)}
      <div className="nav-group">
        <a href="#read/1" data-nav="read" aria-current={active==='read' ? 'page' : undefined}><Icon/>Chapter reader</a>
        <a href="#commentaries" data-nav="commentaries" aria-current={active==='commentaries' ? 'page' : undefined}><Icon kind="book"/>Commentaries</a>
        <a href="#appendices" data-nav="appendices" aria-current={active==='appendices' ? 'page' : undefined}><Icon kind="notes"/>Theological appendices</a>
        <a href="#sources" data-nav="sources" aria-current={active==='sources' ? 'page' : undefined}><Icon kind="sources"/>Sources &amp; method</a>
      </div>
    </nav><div className="sidebar-note">Scripture first.<br/>Interpretations attributed.<br/>Sources preserved.</div></aside>
    <main id="content" tabIndex={-1}>{children}</main></div>
    <footer className="site-footer"><span>Genesis / King James Version</span><span>Independent local library. Not affiliated with Wikipedia.</span></footer>
    <div id="announcement" className="sr-only" role="status" aria-live="polite">{announcement}</div>
  </>;
}
