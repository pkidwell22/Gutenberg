import { useEffect, useState } from 'react';
import type { Book, Chapter, Library, Route } from '../../shared/library';
import { preferences } from '../lib/preferences';
import { ChapterCommentaries } from './ChapterCommentaries';
import { StyledSelect } from './StyledSelect';
import { Breadcrumb, externalLink, verseLink } from './References';

export function ReaderControls({book,chapter}:{book:Book;chapter:number}) {
  const [size,setSize] = useState(() => {
    const stored=preferences.get('size','20');
    return ['18','20','23','26'].includes(stored) ? stored : '20';
  });
  useEffect(() => {document.documentElement.style.setProperty('--verse-size',`${size}px`);},[size]);
  return <div className="reader-tools">
    <StyledSelect id="chapter-select" label="Chapter" value={String(chapter)} options={book.chapters.map(c=>({value:String(c.number),label:String(c.number)}))} onValueChange={value=>{window.location.hash=`#read/${value}`;}} />
    <StyledSelect id="text-size" label="Text size" value={size} options={['18','20','23','26'].map(value=>({value,label:`${value}px`}))} onValueChange={value=>{setSize(value);preferences.set('size',value);}} />
    <button type="button" id="print-page" onClick={()=>window.print()}>Print chapter</button>
  </div>;
}
export function ChapterText({chapter,verse}:{chapter:Chapter;verse:number}) {
  return <article className="scripture" aria-label={`Genesis chapter ${chapter.number}`}>
    {chapter.verses.map(item=><p className={`verse${item.number===verse ? ' selected' : ''}`} id={`v${item.number}`} key={item.number}>
      <a className="verse-number" href={verseLink(chapter.number,item.number)} aria-label={`Link to Genesis ${chapter.number}:${item.number}`}>{item.number}</a><span className="verse-text">{item.text}</span>
    </p>)}
  </article>;
}
export function SideCommentary({library,chapter}:{library:Library;chapter:number}) {
  const related=library.notes.filter(note=>note.passages.some(p=>p.chapter===chapter));
  const source=library.sources.find(s=>s.id===library.book.sourceId);
  return <aside className="reading-aside"><section><h2>Alongside this chapter</h2>
    {related.length ? <ul>{related.map(note=><li key={note.id}><a href={`#note/${note.id}`}>{note.title}</a><span className="subtle">Editorial appendix with primary sources</span></li>)}</ul> : <p>No appendix has been added for this chapter yet.</p>}
    <a href="#appendices">All theological appendices</a></section>
    <ChapterCommentaries chapter={chapter}/>
    <section><h2>About this text</h2><p>Verse numbering is retained. Narrative headings and theological commentary are kept outside the biblical text.</p>
      {source && <a className="citation" href={externalLink(source.url)} target="_blank" rel="noopener noreferrer">Source edition</a>}
      <a href="#sources">Editorial method</a><p className="subtle">Click a verse number for a permanent reference. Your most recently opened passage is remembered in this browser when storage is available.</p>
    </section></aside>;
}
export function Reader({library,route}:{library:Library;route:Extract<Route,{page:'read'}>}) {
  const chapter=library.book.chapters.find(c=>c.number===route.chapter)!;
  useEffect(()=>{preferences.set('position',verseLink(route.chapter,route.verse));},[route.chapter,route.verse]);
  return <><Breadcrumb label="Chapter reader" /><div className="reader-heading"><div><h1>Genesis {chapter.number}</h1><p className="muted">King James Version <span aria-hidden="true">/</span> Biblical text</p></div></div>
    <ReaderControls book={library.book} chapter={chapter.number} />
    <div className="reader-grid"><div><ChapterText chapter={chapter} verse={route.verse}/>
      <nav className="chapter-nav" aria-label="Chapter navigation">
        {chapter.number>1 ? <a id="previous-chapter" href={`#read/${chapter.number-1}`}>Previous chapter</a> : <span>Beginning of Genesis</span>}
        <span>{chapter.number} of {library.book.chapters.length}</span>
        {chapter.number<library.book.chapters.length ? <a id="next-chapter" href={`#read/${chapter.number+1}`}>Next chapter</a> : <a href="#home">Back to overview</a>}
      </nav><details className="chapter-map"><summary>All chapters</summary><div className="chapter-grid">{library.book.chapters.map(c=><a key={c.number} href={`#read/${c.number}`} aria-current={c.number===chapter.number ? 'page' : undefined}>{c.number}</a>)}</div></details>
    </div><SideCommentary library={library} chapter={chapter.number}/></div>
  </>;
}
