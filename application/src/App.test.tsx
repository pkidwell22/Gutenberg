// @vitest-environment jsdom
// Mocked HTTP establishes component behavior only, not PostgreSQL integration.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { App } from './App';
import type { Library } from '../shared/library';

const literal = '<img src=x onerror="alert(1)"> &  exact\r\nwording';
export const fixture: Library = {
  schemaVersion:1, coverage:'Complete text, selective appendices', textPolicy:'Preserved source wording',
  book:{ id:'genesis', title:'Genesis', translation:'King James Version', sourceId:'kjv', chapters:[
    {number:1, verses:[{number:1,text:literal,sourceStart:0,sourceEnd:55},{number:2,text:'And the earth was without form.',sourceStart:56,sourceEnd:87}]},
    {number:2, verses:[{number:1,text:'Thus the heavens and the earth were finished.',sourceStart:88,sourceEnd:130}]}]},
  sources:[{id:'kjv',title:'Preserved KJV source',url:'https://example.org/kjv',localPath:'raw/kjv.txt',edition:'Source edition',translator:'Source translator',rights:'Edition-specific rights',coverage:'Genesis'}],
  notes:[{id:'creation',title:'Creation and interpretation',summary:'An attributed comparison.',status:'Editorial synthesis',
    passages:[{chapter:1,start:1,end:2}],body:[{heading:'Interpretive differences',text:'Editorial, not Scripture.',sourceIds:['kjv']}],
    quotes:[{text:literal,sourceId:'kjv',locator:'Book I, 1',lineStart:1,lineEnd:2,sourceStart:0,sourceEnd:55}],
    sourceIds:['kjv'],relatedIds:[],localPath:'notes/creation.md',tags:[],contested:true}]
};
function succeed() { vi.stubGlobal('fetch', vi.fn(async (url:string) => url==='/api/library' ? {ok:true,json:async()=>fixture} : {ok:false,status:503})); }
function navigate(hash:string) { window.location.hash=hash; fireEvent(window,new HashChangeEvent('hashchange')); }
beforeEach(() => {
  localStorage.clear(); window.history.replaceState(null,'','/index.html');
  vi.stubGlobal('scrollTo', vi.fn());
  HTMLElement.prototype.scrollIntoView = vi.fn();
  HTMLElement.prototype.hasPointerCapture = () => false;
  HTMLElement.prototype.setPointerCapture = () => {};
  HTMLElement.prototype.releasePointerCapture = () => {};
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('library request deadline', () => {
  it('aborts a stalled request after 15 seconds, shows retry, and ignores its late response', async () => {
    vi.useFakeTimers();
    let resolveFirst!: (response: unknown) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ok:true,json:async()=>fixture});
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    const firstSignal = fetcher.mock.calls[0][1].signal as AbortSignal;
    await act(async () => { await vi.advanceTimersByTimeAsync(14_999); });
    expect(screen.getByRole('heading',{name:'Opening the library…'})).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByRole('heading',{name:'Library database unavailable'})).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button',{name:'Retry loading'})); });
    expect(screen.getByRole('heading',{name:'The Book of Genesis'})).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1].signal.aborted).toBe(false);
    await act(async () => { resolveFirst({ok:false}); });
    expect(screen.getByRole('heading',{name:'The Book of Genesis'})).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('shows the retryable error even when abort rejects the fetch', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, {signal}) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    render(<App />);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('heading',{name:'Library database unavailable'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Retry loading'})).toBeInTheDocument();
  });
  it('clears the pending deadline after a successful fetch without aborting it', async () => {
    vi.useFakeTimers();
    let resolveResponse!: (response: unknown) => void;
    const fetcher = vi.fn(() => new Promise(resolve => { resolveResponse = resolve; }));
    vi.stubGlobal('fetch', fetcher);
    render(<App />);
    expect(vi.getTimerCount()).toBe(1);
    await act(async () => { resolveResponse({ok:true,json:async()=>fixture}); });
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByRole('heading',{name:'The Book of Genesis'})).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(false);
  });
  it('aborts on unmount, clears the deadline, and ignores late completion', async () => {
    vi.useFakeTimers();
    let resolveResponse!: (response: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { resolveResponse = resolve; })));
    const {unmount, container} = render(<App />);
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      resolveResponse({ok:true,json:async()=>fixture});
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(container).toBeEmptyDOMElement();
  });
});
describe('React reader (component-only mocked API)', () => {
  it('changes chapters using the accessible menu and persists valid reader preferences', async () => {
    localStorage.setItem('scripture-library:size','26');
    localStorage.setItem('scripture-library:theme','dark');
    succeed(); navigate('#read/1'); render(<App />);
    await screen.findByRole('heading',{name:'Genesis 1'});
    expect(screen.getByRole('combobox',{name:'Text size'})).toHaveTextContent('26px');
    expect(document.documentElement.style.getPropertyValue('--verse-size')).toBe('26px');
    const user=userEvent.setup();
    const chapter=screen.getByRole('combobox',{name:'Chapter'});
    chapter.focus(); await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toHaveClass('select-content');
    await user.keyboard('{ArrowDown}{Enter}');
    await screen.findByRole('heading',{name:'Genesis 2'});
    expect(localStorage.getItem('scripture-library:position')).toBe('#read/2/1');
    expect(screen.getByRole('combobox',{name:'Text size'})).toHaveTextContent('26px');
    await user.click(screen.getByRole('button',{name:'Light mode'}));
    expect(localStorage.getItem('scripture-library:theme')).toBe('light');
    const size=screen.getByRole('combobox',{name:'Text size'});
    size.focus(); await user.keyboard('{Enter}{ArrowUp}{Enter}');
    await waitFor(()=>expect(localStorage.getItem('scripture-library:size')).toBe('23'));
  });
  it('rejects invalid stored preferences without breaking the reader', async () => {
    localStorage.setItem('scripture-library:size','999');
    localStorage.setItem('scripture-library:theme','unknown');
    localStorage.setItem('scripture-library:position','#read/999');
    succeed(); render(<App />);
    await screen.findByRole('heading',{name:'The Book of Genesis'});
    expect(screen.queryByRole('link',{name:/Continue at/})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Dark mode'})).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link',{name:'Begin Genesis'}));
    await screen.findByRole('heading',{name:'Genesis 1'});
    expect(screen.getByRole('combobox',{name:'Text size'})).toHaveTextContent('20px');
  });
  it('keeps navigation and the saved theme available during database failure', async () => {
    localStorage.setItem('scripture-library:theme','dark');
    vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('network unavailable')));
    render(<App />);
    await screen.findByRole('heading',{name:'Library database unavailable'});
    expect(screen.getByRole('navigation',{name:'Library'})).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Light mode'})).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute('data-theme','dark');
    expect(screen.getByRole('status')).toHaveTextContent('Library database unavailable');
  });
  it.each(['#read/999','#read/1/999','#note/not-present','#%ZZ','#unknown'])('shows the missing-reference page for %s', async hash => {
    succeed(); navigate(hash); render(<App />);
    await screen.findByRole('heading',{name:'Page not found'});
    expect(screen.getByRole('link',{name:'Return to Genesis.'})).toHaveAttribute('href','#home');
    expect(document.title).toBe('Page not found · Scripture Library');
    expect(screen.getByRole('status')).toHaveTextContent('Page not found');
  });
  it('announces the actual screen title for sources and search', async () => {
    succeed(); navigate('#sources'); render(<App />);
    await screen.findByRole('heading',{name:'Sources & method'});
    expect(screen.getByRole('status')).toHaveTextContent('Sources & method');
    navigate('#search/earth');
    await screen.findByRole('heading',{name:'Search Genesis'});
    expect(screen.getByRole('status')).toHaveTextContent('Search Genesis');
    expect(screen.getByRole('searchbox')).toHaveValue('earth');
  });
  it('scrolls to the top when resubmitting the same trimmed search without adding history', async () => {
    succeed(); navigate('#search/earth'); render(<App />);
    await screen.findByRole('heading',{name:'Search Genesis'});
    const historyLength = window.history.length;
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.change(screen.getByRole('searchbox'), {target:{value:'  earth  '}});
    fireEvent.submit(screen.getByRole('search'));
    expect(window.location.hash).toBe('#search/earth');
    expect(window.history.length).toBe(historyLength);
    expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(0,0);
    expect(screen.getByRole('link',{name:'Genesis 1:2'})).toBeInTheDocument();
  });
  it('changes the search hash, scrolls up, and preserves browser back navigation', async () => {
    succeed(); navigate('#search/earth'); render(<App />);
    await screen.findByRole('heading',{name:'Search Genesis'});
    vi.mocked(window.scrollTo).mockClear();
    fireEvent.change(screen.getByRole('searchbox'), {target:{value:'  heavens  '}});
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByRole('link',{name:'Genesis 2:1'});
    expect(window.location.hash).toBe('#search/heavens');
    expect(window.scrollTo).toHaveBeenCalledWith(0,0);
    await act(async () => { window.history.back(); });
    await screen.findByRole('link',{name:'Genesis 1:2'});
    expect(window.location.hash).toBe('#search/earth');
    expect(screen.getByRole('searchbox')).toHaveValue('earth');
  });
  it('searches literal whitespace-normalized Scripture, preserving text and empty-state guidance', async () => {
    succeed(); render(<App />); await screen.findByRole('heading',{name:'The Book of Genesis'});
    const user=userEvent.setup();
    const input=screen.getByRole('searchbox',{name:'Search the Genesis text'});
    await user.type(input,'exact wording'); await user.click(screen.getByRole('button',{name:'Search'}));
    await screen.findByRole('heading',{name:'Search Genesis'});
    expect(screen.getByRole('link',{name:'Genesis 1:1'})).toHaveAttribute('href','#read/1/1');
    expect(document.querySelector('.result p')?.textContent).toBe(literal);
    expect(document.querySelector('.result img')).toBeNull();
    expect(screen.getByText(/It does not search appendix essays/)).toBeInTheDocument();
    await user.clear(input); await user.type(input,'unmatchedliteral'); await user.click(screen.getByRole('button',{name:'Search'}));
    expect(await screen.findByText(/No matching verses/)).toBeInTheDocument();
    await user.clear(input); await user.click(screen.getByRole('button',{name:'Search'}));
    expect(await screen.findByText('Enter a word or phrase in the search field.')).toBeInTheDocument();
  });
  it('preserves bibliography, edition rights, safe local source links and coverage disclaimers', async () => {
    succeed(); navigate('#sources'); render(<App />);
    await screen.findByRole('heading',{name:'Sources & method'});
    expect(screen.getByText(/not a comprehensive representation/)).toBeInTheDocument();
    expect(screen.getByText(/Verse text is not generated by an AI model/)).toBeInTheDocument();
    expect(screen.getByText('Edition-specific rights')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'raw/kjv.txt'})).toHaveAttribute('href','raw/kjv.txt');
    expect(screen.getByRole('link',{name:'https://example.org/kjv'})).toHaveAttribute('rel','noopener noreferrer');
    expect(screen.getByText(/Source hashes and provenance/)).toBeInTheDocument();
  });
  it('opens appendix essays with exact quoted text, attribution, references and editorial warnings', async () => {
    succeed(); navigate('#appendices'); render(<App />);
    await screen.findByRole('heading',{name:'Theological appendices'});
    expect(screen.getByText(/not peer-reviewed scholarship/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link',{name:'Creation and interpretation'}));
    await screen.findByRole('heading',{name:'Creation and interpretation'});
    expect(document.querySelector('blockquote p')?.textContent).toBe(literal);
    expect(document.querySelector('blockquote img')).toBeNull();
    expect(screen.getByText('Preserved KJV source — Book I, 1')).toBeInTheDocument();
    expect(screen.getByText(/Distinct from the biblical text/)).toBeInTheDocument();
    expect(screen.getByText(/do not substitute for a critical edition/)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Theological appendices'})).toHaveAttribute('aria-current','page');
  });
  it('preserves the overview narrative guide, editorial disclaimer and saved passage', async () => {
    localStorage.setItem('scripture-library:position','#read/1/2');
    succeed(); render(<App />);
    await screen.findByRole('heading',{name:'The Book of Genesis'});
    expect(screen.getByRole('link',{name:'Continue at 1:2'})).toHaveAttribute('href','#read/1/2');
    expect(screen.getByRole('heading',{name:'A narrative guide'})).toBeInTheDocument();
    expect(screen.getByText('Editorial divisions, not source headings')).toBeInTheDocument();
    expect(screen.getByText('Two distinct layers.')).toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Eden and the fall'})).toHaveAttribute('href','#read/2/4');
    expect(screen.getByRole('link',{name:'Creation and interpretation'})).toHaveAttribute('href','#note/creation');
  });
  it('retains the shell, theme, text size and printing even when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype,'getItem').mockImplementation(()=>{throw new Error('blocked');});
    vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
    const print=vi.spyOn(window,'print').mockImplementation(()=>{});
    succeed(); navigate('#read/1'); render(<App />);
    await screen.findByRole('heading',{name:'Genesis 1'});
    expect(screen.getByRole('navigation',{name:'Library'})).toBeInTheDocument();
    const user=userEvent.setup();
    await user.click(screen.getByRole('button',{name:'Dark mode'}));
    expect(document.documentElement).toHaveAttribute('data-theme','dark');
    expect(screen.getByRole('button',{name:'Light mode'})).toBeInTheDocument();
    const size=screen.getByRole('combobox',{name:'Text size'});
    size.focus(); await user.keyboard('{Enter}{ArrowDown}{Enter}');
    await waitFor(()=>expect(size).toHaveTextContent('23px'));
    expect(document.documentElement.style.getPropertyValue('--verse-size')).toBe('23px');
    await user.click(screen.getByRole('button',{name:'Print chapter'}));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('link',{name:'Skip to reading'}));
    expect(screen.getByRole('main')).toHaveFocus();
  });
  it('renders literal verses on legacy hashes, selects verses, and keeps chapter commentary separate', async () => {
    succeed(); navigate('#read/1/2'); render(<App />);
    expect(await screen.findByRole('heading',{name:'Genesis 1'})).toBeInTheDocument();
    const scripture = screen.getByRole('article',{name:'Genesis chapter 1'});
    expect(scripture.querySelector('.verse-text')?.textContent).toBe(literal);
    expect(scripture.querySelector('img')).toBeNull();
    expect(document.querySelector('#v2')).toHaveClass('selected');
    expect(screen.getByRole('link',{name:'Creation and interpretation'})).toBeInTheDocument();
    expect(scripture).not.toHaveTextContent('Editorial');
    expect(localStorage.getItem('scripture-library:position')).toBe('#read/1/2');
    await userEvent.click(screen.getByRole('link',{name:'Next chapter'}));
    expect(await screen.findByRole('heading',{name:'Genesis 2'})).toBeInTheDocument();
    expect(screen.getByText('No appendix has been added for this chapter yet.')).toBeInTheDocument();
    expect(document.title).toBe('Genesis 2 · Scripture Library');
  });
  it('reports database unavailability without fallback and retries the real endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({ok:false,status:503}).mockResolvedValueOnce({ok:true,json:async()=>fixture});
    vi.stubGlobal('fetch',fetcher);
    render(<App />);
    expect(screen.getByRole('heading',{name:'Opening the library…'})).toBeInTheDocument();
    expect(await screen.findByRole('heading',{name:'Library database unavailable'})).toBeInTheDocument();
    expect(screen.queryByText(literal)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button',{name:'Retry loading'}));
    expect(await screen.findByRole('heading',{name:'The Book of Genesis'})).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][0]).toBe('/api/library');
  });
});
