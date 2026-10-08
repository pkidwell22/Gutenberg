import { useEffect, useState } from 'react';
import type { CommentaryWork, CommentarySection } from '../../shared/commentaries';
import { isCommentaryWork } from '../lib/commentaryValidation';
import { useCommentaryResource } from '../lib/useCommentaryResource';
import { commentaryLink } from '../lib/commentaryRoutes';
import { preferences } from '../lib/preferences';
import { externalLink, localLink } from './References';
import { CommentarySearchForm } from './CommentarySearch';
import { CommentaryHeading, CommentaryMissing } from './CommentaryStatus';
import { StyledSelect } from './StyledSelect';

const kinds:Record<CommentarySection['kind'],string>={frontmatter:'Editorial material',commentary:'Commentary',meditation:'Meditation',treatise:'Treatise'};
export function CommentaryReader({workId,sectionId}:{workId:string;sectionId?:string}) {
  const {state,retry}=useCommentaryResource<CommentaryWork>(`/api/commentaries/${encodeURIComponent(workId)}`,isCommentaryWork);
  if(state.status==='loading') return <><h1>Opening commentary…</h1><p role="status">Loading historical text…</p></>;
  if(state.status==='error') return state.notFound ? <CommentaryMissing/> : <><CommentaryHeading title="Commentary unavailable"/><p role="alert">The local service could not load this work.</p><button onClick={retry}>Retry commentaries</button></>;
  const work=state.data;
  if (!work.sections.length && !sectionId) return <><p className="breadcrumb"><a href="#commentaries">All commentaries</a></p><CommentaryHeading title={work.title}/><p>No readable sections have been added for this work.</p><p>{work.completeness}</p></>;
  const sections=[...work.sections].sort((a,b)=>a.ordinal-b.ordinal);
  const section=sectionId ? sections.find(section=>section.id===sectionId) : sections[0];
  if (!section) return <CommentaryMissing/>;
  return <HistoricalSection work={work} sections={sections} section={section}/>;
}
function HistoricalSection({work,sections,section}:{work:CommentaryWork;sections:CommentarySection[];section:CommentarySection}) {
  const [size,setSize]=useState(()=>{const saved=preferences.get('size','20');return ['18','20','23','26'].includes(saved) ? saved : '20';});
  useEffect(()=>{document.documentElement.style.setProperty('--verse-size',`${size}px`);},[size]);
  useEffect(()=>{document.title=`${section.title} · Scripture Library`;window.scrollTo(0,0);},[section.id,section.title]);
  const index=sections.findIndex(item=>item.id===section.id);
  // Keep the delimiters as text nodes so textContent remains exactly the canonical source.
  const paragraphs=section.text.split(/((?:\r?\n)[\t ]*(?:\r?\n)(?:[\t ]*\r?\n)*)/);
  const preserved=localLink(work.localPath);
  return <>
    <p className="breadcrumb"><a href="#commentaries">All commentaries</a> / {work.author}</p>
    <div className="commentary-heading"><p className="muted">{work.title}</p><h1>{section.title}</h1><p className="editorial-label">{kinds[section.kind]} · Historical source text, not editorial synthesis or Scripture.</p></div>
    <CommentarySearchForm workId={work.id}/>
    <div className="reader-tools"><StyledSelect id="commentary-text-size" label="Text size" value={size} options={['18','20','23','26'].map(value=>({value,label:`${value}px`}))} onValueChange={value=>{setSize(value);preferences.set('size',value);}}/><button onClick={()=>window.print()}>Print section</button></div>
    <div className="commentary-grid"><nav className="commentary-toc" aria-label="Work contents"><h2>Contents</h2><ol>{sections.map(item=><li key={item.id}><a href={commentaryLink(work.id,item.id)} aria-current={item.id===section.id ? 'page' : undefined}>{item.title}<small>{kinds[item.kind]}</small></a></li>)}</ol></nav>
      <div className="commentary-main"><article className="commentary-prose" aria-label={section.title}>{paragraphs.map((part,i)=>i%2 ? part : <p key={i}>{part}</p>)}</article>
        <nav className="chapter-nav" aria-label="Section navigation">{index>0 ? <a href={commentaryLink(work.id,sections[index-1].id)}>Previous section</a> : <span>Beginning of work</span>}<span>{index+1} of {sections.length}</span>{index<sections.length-1 ? <a href={commentaryLink(work.id,sections[index+1].id)}>Next section</a> : <span>End of work</span>}</nav>
        {section.genesisChapters.length>0 && <section className="commentary-associations"><h2>Related Genesis chapters</h2><p className="muted">Curated associations, not verse-by-verse mappings.</p><div className="passage-links">{section.genesisChapters.map(chapter=><a href={`#read/${chapter}`} key={chapter}>Genesis {chapter}</a>)}</div></section>}
        <details className="source-record commentary-provenance"><summary>Source &amp; provenance</summary><dl><dt>Author</dt><dd>{work.author}</dd><dt>Work</dt><dd>{work.title}</dd><dt>Edition</dt><dd>{work.edition}</dd><dt>Translator</dt><dd>{work.translator}</dd><dt>Coverage</dt><dd>{work.coverage}</dd><dt>Completeness</dt><dd>{work.completeness}</dd><dt>Rights</dt><dd>{work.rights}</dd><dt>Text policy</dt><dd>{work.textPolicy}</dd><dt>Source SHA-256</dt><dd>{work.sourceSha256}</dd><dt>Source offsets</dt><dd>{section.sourceStart}–{section.sourceEnd} (decoded Unicode characters)</dd></dl><div className="citations"><a href={externalLink(work.sourceUrl)} target="_blank" rel="noopener noreferrer">Original source</a>{preserved && <a href={preserved}>Preserved source</a>}</div></details>
      </div>
    </div>
  </>;
}
