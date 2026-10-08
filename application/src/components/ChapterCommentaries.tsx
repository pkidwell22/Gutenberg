import type { CommentaryCatalog } from '../../shared/commentaries';
import { isCommentaryCatalog } from '../lib/commentaryValidation';
import { useCommentaryResource } from '../lib/useCommentaryResource';
import { commentaryLink } from '../lib/commentaryRoutes';

export function ChapterCommentaries({chapter}:{chapter:number}) {
  const {state,retry}=useCommentaryResource<CommentaryCatalog>('/api/commentaries',isCommentaryCatalog);
  const related=state.status==='ready' ? state.data.works.flatMap(work=>work.sections.filter(section=>section.genesisChapters.includes(chapter)).map(section=>({work,section}))) : [];
  return <section aria-label="Historical works for this chapter"><h2>Historical works</h2><p>Curated associations, not verse-by-verse mappings.</p>
    {state.status==='loading' && <p role="status">Loading historical chapter links…</p>}
    {state.status==='error' && <><p role="status">Historical chapter links unavailable.</p><button onClick={retry}>Retry chapter links</button></>}
    {state.status==='ready' && (related.length ? <ul>{related.map(({work,section})=><li key={`${work.id}/${section.id}`}><a href={commentaryLink(work.id,section.id)}>{section.title} — {work.author}</a><span className="subtle">{work.title}</span></li>)}</ul> : <p>No historical sections are associated with this chapter yet.</p>)}
    <a href="#commentaries">Browse all historical works</a>
  </section>;
}
