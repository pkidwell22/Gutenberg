// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ChapterText, Reader } from './Reader';
import type { Library } from '../../shared/library';
import { readFileSync } from 'node:fs';
import { messianicPassages } from '../lib/messianicPassages';

afterEach(() => {cleanup(); vi.unstubAllGlobals();});

it('marks Genesis 3:15 without changing its exact text, verse link or selected state', () => {
  const text='And I will put enmity between thee and the woman,\r\nand between thy seed and her seed.';
  const {container}=render(<ChapterText chapter={{number:3,verses:[
    {number:14,text:'And the LORD God said unto the serpent,',sourceStart:0,sourceEnd:41},
    {number:15,text,sourceStart:42,sourceEnd:42+text.length},
  ]}} verse={15}/>);
  const marked=container.querySelector('#v15')!;
  expect(marked).toHaveClass('messianic-verse','selected');
  expect(marked.querySelector('.verse-text')?.textContent).toBe(text);
  expect(marked.querySelector('a')).toHaveAttribute('href','#read/3/15');
  expect(marked).toHaveAttribute('aria-describedby','messianic-3-15');
  expect(container.querySelector('#v14')).not.toHaveClass('messianic-verse');
});

it('explains the red text outside Scripture and resolves its accessible description to a sourced note', () => {
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:503})));
  const library:Library={schemaVersion:1,coverage:'Fixture',textPolicy:'Exact',sources:[],notes:[],book:{
    id:'genesis',title:'Genesis',translation:'KJV',sourceId:'kjv',chapters:[{number:3,verses:[
      {number:15,text:'Preserved Scripture.',sourceStart:0,sourceEnd:20},
    ]}],
  }};
  const {container}=render(<Reader library={library} route={{page:'read',chapter:3,verse:15}}/>);
  expect(screen.getByText(/Red text marks messianic promises/)).toBeInTheDocument();
  expect(screen.getByText(/not words spoken by Jesus/)).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Messianic promises'})).toBeInTheDocument();
  const note=container.querySelector('#messianic-3-15')!;
  expect(note).toHaveTextContent('The seed of the woman');
  expect(note).toHaveTextContent('not a universally agreed interpretation');
  expect(container.querySelector('.scripture')).not.toContainElement(note as HTMLElement);
  expect(container.querySelector('#v15')).toHaveAccessibleDescription(/The seed of the woman/);
  expect(screen.getByRole('link',{name:'Luther, Genesis 3 exposition'})).toHaveAttribute('href','#commentary/luther-genesis-1/genesis-3');
});

it('attributes Genesis 18:18 to the primary-text editorial cross-reference rather than the modern article',()=>{
  const passage=messianicPassages.find(p=>p.chapter===18)!;
  expect(passage.evidence).toContain('editorial cross-reference');
  expect(passage.evidenceUrl).toBe('https://www.gutenberg.org/ebooks/10');
});

it('preserves all 1,533 canonical verses and marks only the reviewed ranges across all 50 chapters',()=>{
  const source=readFileSync('../data/library.js','utf8');
  const library:Library=JSON.parse(source.replace(/^window\.SCRIPTURE_LIBRARY\s*=\s*/,'').replace(/;\s*$/,''));
  const expected=['3:15','12:3','18:18','22:17','22:18','26:4','28:14','49:8','49:9','49:10','49:11','49:12'];
  const actual:string[]=[];
  let verses=0;
  for(const chapter of library.book.chapters){
    const {container,unmount}=render(<ChapterText chapter={chapter} verse={1}/>);
    for(const verse of chapter.verses){
      const node=container.querySelector(`#v${verse.number}`)!;
      expect(node.querySelector('.verse-text')?.textContent).toBe(verse.text);
      if(node.classList.contains('messianic-verse')) actual.push(`${chapter.number}:${verse.number}`);
      verses++;
    }
    unmount();
  }
  expect(verses).toBe(1533);
  expect(actual).toEqual(expected);
  expect(messianicPassages).toHaveLength(7);
  expect(messianicPassages.every(p=>p.explanation && p.evidence && p.evidenceUrl)).toBe(true);
});
