import type { Library } from '../../shared/library';
import { route } from '../lib/core';
import { preferences } from '../lib/preferences';
import { Breadcrumb, verseLink } from './References';
import { NoteEntry } from './NoteEntry';
const arcs = [
  {title:'Creation',range:'1:1–2:3',chapter:1,verse:1,description:'The ordering of the world and the seventh day.'},
  {title:'Eden and the fall',range:'2:4–3:24',chapter:2,verse:4,description:'The garden, the command, and expulsion.'},
  {title:'Cain and early humanity',range:'4:1–5:32',chapter:4,verse:1,description:'Brotherhood, violence, and the generations of Adam.'},
  {title:'Noah and the flood',range:'6:1–9:29',chapter:6,verse:1,description:'Judgment, preservation, and covenant.'},
  {title:'Nations and Babel',range:'10:1–11:32',chapter:10,verse:1,description:'Peoples, languages, and the line of Terah.'},
  {title:'Abraham',range:'12:1–25:18',chapter:12,verse:1,description:'Call, promise, covenant, and the next generation.'},
  {title:'Isaac and Jacob',range:'25:19–36:43',chapter:25,verse:19,description:'Birthright, blessing, exile, and return.'},
  {title:'Joseph and his brothers',range:'37:1–50:26',chapter:37,verse:1,description:'Family conflict, life in Egypt, and reconciliation.'}
];
export function Overview({library:{book,notes}}:{library:Library}) {
  const position=route(preferences.get('position','#read/1/1'),book);
  const resume=position.page==='read' ? verseLink(position.chapter,position.verse) : '#read/1/1';
  return <><Breadcrumb label="Overview"/>
    <div className="intro-grid"><div><h1>The Book of Genesis</h1><p className="lead">Read the text. Follow its interpretations.<br/>Return to the sources.</p><p className="muted">The first book in a growing library of the Books of Moses. Read Genesis in the King James Version, with a separate collection of historical commentary and comparative theological notes.</p>
      <div className="actions"><a className="button-link" href="#read/1/1">Begin Genesis</a>{resume!=='#read/1/1' && position.page==='read' ? <a className="button-link secondary" href={resume}>Continue at {position.chapter}:{position.verse}</a> : <a className="button-link secondary" href="#appendices">Explore the appendices</a>}</div>
    </div><dl className="library-facts"><dt>Reading text</dt><dd>King James Version</dd><dt>Text available</dt><dd>{book.chapters.length} chapters / {book.chapters.reduce((n,c)=>n+c.verses.length,0).toLocaleString()} verses</dd><dt>Companion material</dt><dd>{notes.length} sourced appendices</dd><dt>Perspective</dt><dd>Comparative academic study</dd></dl></div>
    <div className="section-heading"><h2>A narrative guide</h2><small>Editorial divisions, not source headings</small></div>
    <ol className="arc-list">{arcs.map(arc=><li key={arc.title}><span className="range">{arc.range}</span><div><a href={verseLink(arc.chapter,arc.verse)}>{arc.title}</a><div className="arc-description">{arc.description}</div></div><a className="arc-reading" href={verseLink(arc.chapter,arc.verse)}>Read the passage</a></li>)}</ol>
    <div className="notice"><p><strong>Two distinct layers.</strong> The biblical text is transcribed from the preserved source. The reading divisions and appendix essays are editorial aids. Historical interpretations are attributed, not blended into the text.</p><p>The appendices are a selective starting collection, not a complete commentary or a survey of every tradition. <a href="#sources">See sources, coverage, and method.</a></p></div>
    <div className="section-heading"><h2>From the appendices</h2><a href="#appendices">View all</a></div>{notes.slice(0,2).map(note=><NoteEntry key={note.id} note={note}/>)}
  </>;
}
