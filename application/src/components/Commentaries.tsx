import { isCommentaryCatalog } from '../lib/commentaryValidation';
import { useCommentaryResource } from '../lib/useCommentaryResource';
import type { CommentaryCatalog } from '../../shared/commentaries';
import { CommentarySearchForm } from './CommentarySearch';
import { externalLink } from './References';

export function Commentaries() {
  const {state,retry}=useCommentaryResource<CommentaryCatalog>('/api/commentaries',isCommentaryCatalog);
  const catalog=state.status==='ready' ? state.data : null;
  return <><h1>Commentaries</h1><p className="muted">Full historical texts, not editorial synthesis. Coverage refers to the acquired edition, not all of Genesis.</p>
    <CommentarySearchForm/>
    {state.status==='loading' && <p role="status">Loading commentaries…</p>}
    {state.status==='error' && <><p role="alert">Commentaries unavailable. The local service could not load these historical works.</p><button onClick={retry}>Retry commentaries</button></>}
    {catalog && <>{!catalog.works.length && <p>No historical works have been added yet.</p>}<div className="commentary-catalog">{catalog.works.map(work=><article className="note-entry" key={work.id}>
      <p>{work.author}</p><h2><a href={`#commentary/${encodeURIComponent(work.id)}`}>{work.title}</a></h2>
      <p>{work.coverage}</p><p>{work.completeness}</p><a href={externalLink(work.sourceUrl)} target="_blank" rel="noopener noreferrer">Original source</a>
    </article>)}</div><section><h2>Coverage gaps</h2>{catalog.gaps.map((gap,index)=><article className="note-entry" key={index}><h3>{gap.author}: {gap.title}</h3><p>{gap.reason}</p></article>)}</section></>}
  </>;
}
