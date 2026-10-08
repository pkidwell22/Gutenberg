import { useEffect, useState, type ReactNode } from 'react';
import type { Library } from '../shared/library';
import { route as parseRoute } from './lib/core';
import { Reader } from './components/Reader';
import { Overview } from './components/Overview';
import { Appendices, AppendixEssay } from './components/Appendices';
import { Bibliography } from './components/Bibliography';
import { SearchResults } from './components/SearchResults';
import { Breadcrumb } from './components/References';
import { Shell } from './components/Shell';
import { commentaryRoute } from './lib/commentaryRoutes';
import { Commentaries } from './components/Commentaries';
import { CommentarySearch } from './components/CommentarySearch';
import { CommentaryReader } from './components/CommentaryReader';
import { CommentaryMissing } from './components/CommentaryStatus';

type LoadState = { status:'loading' } | { status:'error' } | { status:'ready'; library:Library };

export function App() {
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<LoadState>({status:'loading'});
  useEffect(() => {
    const controller = new AbortController();
    setLoad({status:'loading'});
    const deadline = window.setTimeout(() => {
      controller.abort();
      // A deadline is an error; an abort during effect cleanup is not.
      setLoad({status:'error'});
    }, 15_000);
    async function loadLibrary() {
      try {
        const response = await fetch('/api/library', {signal:controller.signal, cache:'no-store'});
        if (!response.ok) throw new Error('Library request failed');
        const library:Library = await response.json();
        if (!library?.book?.chapters?.length || !Array.isArray(library.notes) || !Array.isArray(library.sources)) throw new Error('Invalid library response');
        if (!controller.signal.aborted) setLoad({status:'ready',library});
      } catch {
        if (!controller.signal.aborted) setLoad({status:'error'});
      } finally {
        window.clearTimeout(deadline);
      }
    }
    void loadLibrary();
    return () => {
      window.clearTimeout(deadline);
      controller.abort();
    };
  }, [attempt]);
  if (load.status === 'loading') return <Shell page="loading" announcement="Opening the library…"><h1>Opening the library…</h1><p>Loading sources from the local database.</p></Shell>;
  if (load.status === 'error') return <Shell page="error" announcement="Library database unavailable"><h1>Library database unavailable</h1><p role="alert">The local database or library service could not be reached. No fallback text has been loaded. Check that the local service and PostgreSQL are running, then retry.</p><button type="button" onClick={() => setAttempt(value => value + 1)}>Retry loading</button></Shell>;
  return <LibraryReader library={load.library}/>;
}

function LibraryReader({library}:{library:Library}) {
  const [hash,setHash]=useState(window.location.hash);
  const route=commentaryRoute(hash) ?? parseRoute(hash,library.book);
  useEffect(()=>{
    const update=()=>setHash(window.location.hash);
    window.addEventListener('hashchange',update);
    return ()=>window.removeEventListener('hashchange',update);
  },[]);
  useEffect(()=>{
    const title=document.querySelector('main h1')?.textContent || 'Scripture Library';
    document.title=`${title} · Scripture Library`;
    window.scrollTo(0,0);
    if (route.page==='read' && route.verse>1) {
      const frame=requestAnimationFrame(()=>document.getElementById(`v${route.verse}`)?.scrollIntoView({block:'center'}));
      return ()=>cancelAnimationFrame(frame);
    }
  },[hash,library]);
  let title='Page not found';
  let content:ReactNode=<><Breadcrumb label="Unknown reference"/><h1>Page not found</h1><p>This reference is not in the current library. <a href="#home">Return to Genesis.</a></p></>;
  switch (route.page) {
    case 'commentaries': title='Commentaries'; content=<Commentaries/>; break;
    case 'commentary': title='Historical commentary'; content=<CommentaryReader key={route.workId} workId={route.workId} sectionId={route.sectionId}/>; break;
    case 'commentary-search': title='Search commentaries'; content=<CommentarySearch query={route.query} workId={route.workId}/>; break;
    case 'commentary-missing': title='Commentary not found'; content=<CommentaryMissing/>; break;
    case 'home': title='The Book of Genesis'; content=<Overview library={library}/>; break;
    case 'read': title=`Genesis ${route.chapter}`; content=<Reader library={library} route={route}/>; break;
    case 'appendices': title='Theological appendices'; content=<Appendices notes={library.notes}/>; break;
    case 'note': {
      const note=library.notes.find(note=>note.id===route.id);
      if(note) {title=note.title;content=<AppendixEssay note={note} sources={library.sources}/>;}
      break;
    }
    case 'sources': title='Sources & method'; content=<Bibliography sources={library.sources}/>; break;
    case 'search': title='Search Genesis'; content=<SearchResults chapters={library.book.chapters} query={route.query}/>; break;
  }
  return <Shell page={route.page} query={route.page==='search' ? route.query : ''} announcement={title}>{content}</Shell>;
}
