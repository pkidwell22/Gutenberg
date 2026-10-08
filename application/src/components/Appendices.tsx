import { Fragment } from 'react';
import type { EditorialNote, Source } from '../../shared/library';
import { Breadcrumb, PassageLinks, SourceLinks } from './References';
import { NoteEntry } from './NoteEntry';
export function Appendices({notes}:{notes:EditorialNote[]}) {
  return <><Breadcrumb label="Theological appendices"/><h1>Theological appendices</h1><p className="lead">An accompanying library of interpretations.</p><p className="muted">Primary-source passages and attributed comparisons, with Luther as one major voice. These essays are editorial starting points, not peer-reviewed scholarship or a complete account of the history of interpretation.</p>{notes.map(note=><NoteEntry key={note.id} note={note}/>)}</>;
}
export function AppendixEssay({note,sources}:{note:EditorialNote;sources:Source[]}) {
  return <><Breadcrumb label="Theological appendices"/><div className="essay">
    <p className="editorial-label">{note.status || 'Editorial synthesis'} / Distinct from the biblical text</p><h1>{note.title}</h1><p className="lead">{note.summary}</p><PassageLinks note={note}/>
    {note.body.map((section,i)=><section key={i}><h2>{section.heading}</h2><p>{section.text}</p><div className="citations"><SourceLinks ids={section.sourceIds} sources={sources}/></div></section>)}
    <h2>Primary-source extracts</h2>
    {note.quotes.map((quote,i)=><Fragment key={i}><blockquote><p>{quote.text}</p><cite>{sources.find(s=>s.id===quote.sourceId)?.title || quote.sourceId} — {quote.locator}</cite></blockquote><div className="citations"><SourceLinks ids={[quote.sourceId]} sources={sources}/></div></Fragment>)}
    <div className="notice"><p>Quotations come from the identified source editions. The surrounding comparisons are editorial and should be checked against the full context. These translations do not substitute for a critical edition or study of the original languages.</p></div>
    <h2>References</h2><div className="citations"><SourceLinks ids={note.sourceIds} sources={sources}/></div><p><a href="#sources">Bibliography and preserved local sources</a></p><p><a href="#appendices">Back to all appendices</a></p>
  </div></>;
}
