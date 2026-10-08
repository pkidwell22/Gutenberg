import type { EditorialNote, Source } from '../../shared/library';
export const verseLink = (chapter:number, verse=1) => `#read/${chapter}/${verse}`;
export const externalLink = (url:string) => /^https?:\/\//.test(url || '') ? url : '#sources';
export const localLink = (path:string) => /^(raw|notes)\/[a-zA-Z0-9_./-]+$/.test(path || '') && !path.includes('..') ? path : '';
export function Breadcrumb({label}:{label:string}) {
  return <p className="breadcrumb"><a href="#home">Books of Moses</a> / <a href="#home">Genesis</a> / {label}</p>;
}
export function PassageLinks({note}:{note:EditorialNote}) {
  return <div className="passage-links">{note.passages.map((passage,i) => <a key={i} href={verseLink(passage.chapter,passage.start)}>Genesis {passage.chapter}:{passage.start}{passage.end && passage.end !== passage.start ? `–${passage.end}` : ''}</a>)}</div>;
}
export function SourceLinks({ids,sources}:{ids:string[];sources:Source[]}) {
  return <>{[...new Set(ids)].map(id => {
    const source=sources.find(source=>source.id===id);
    return source ? <a key={id} className="citation" href={externalLink(source.url)} target="_blank" rel="noopener noreferrer">{source.title}</a> : <span key={id}>Source not available</span>;
  })}</>;
}
