/* Independent static reader. All imported text is escaped before rendering. */
(function () {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const storage = {
    get(key, fallback) { try { return localStorage.getItem('scripture-library:' + key) || fallback; } catch (_) { return fallback; } },
    set(key, value) { try { localStorage.setItem('scripture-library:' + key, value); } catch (_) { /* Reading still works without storage. */ } }
  };
  const external = url => /^https?:\/\//.test(url || '') ? escape(url) : '#sources';
  const local = path => /^(raw|notes)\/[a-zA-Z0-9_./-]+$/.test(path || '') && !path.includes('..') ? escape(path) : '';
  let theme = storage.get('theme', 'light');
  if (!['light','dark'].includes(theme)) theme = 'light';
  function showTheme() {
    document.documentElement.dataset.theme = theme;
    $('#theme').textContent = theme === 'light' ? 'Dark mode' : 'Light mode';
  }
  showTheme();
  $('#theme').addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    storage.set('theme', theme);
    showTheme();
  });
  const library = window.SCRIPTURE_LIBRARY;
  const core = window.ScriptureCore;
  if (!library || !core) {
    $('#content').innerHTML = '<h1>Library data unavailable</h1><p>Keep this page with its <code>data</code> folder. If the source data has not been built yet, follow the local README to build it.</p>';
    return;
  }
  const {book, notes, sources} = library;
  const byId = Object.fromEntries(sources.map(source => [source.id, source]));
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
  const breadcrumb = label => `<p class="breadcrumb"><a href="#home">Books of Moses</a> / <a href="#home">Genesis</a>${label ? ' / ' + escape(label) : ''}</p>`;
  const verseLink = (chapter, verse = 1) => `#read/${chapter}/${verse}`;
  function passageLinks(note) {
    return `<div class="passage-links">${note.passages.map(p => `<a href="${verseLink(p.chapter,p.start)}">Genesis ${p.chapter}:${p.start}${p.end && p.end !== p.start ? '–' + p.end : ''}</a>`).join('')}</div>`;
  }
  function sourceLinks(ids) {
    return [...new Set(ids || [])].map(id => {
      const source = byId[id];
      return source ? `<a class="citation" href="${external(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.title)}</a>` : '<span>Source not available</span>';
    }).join('');
  }
  function noteEntry(note) {
    return `<article class="note-entry"><h2><a href="#note/${escape(note.id)}">${escape(note.title)}</a></h2><p>${escape(note.summary)}</p>${passageLinks(note)}</article>`;
  }
  function home() {
    const last = storage.get('position', '#read/1/1');
    const position = core.route(last, book);
    const resume = position.page === 'read' ? verseLink(position.chapter, position.verse) : '#read/1/1';
    return `${breadcrumb('Overview')}<div class="intro-grid"><div><h1>The Book of Genesis</h1><p class="lead">Read the text. Follow its interpretations.<br>Return to the sources.</p><p class="muted">The first book in a growing library of the Books of Moses. Read Genesis in the King James Version, with a separate collection of historical commentary and comparative theological notes.</p><div class="actions"><a class="button-link" href="#read/1/1">Begin Genesis</a>${resume !== '#read/1/1' ? `<a class="button-link secondary" href="${resume}">Continue at ${position.chapter}:${position.verse}</a>` : '<a class="button-link secondary" href="#appendices">Explore the appendices</a>'}</div></div><dl class="library-facts"><dt>Reading text</dt><dd>King James Version</dd><dt>Text available</dt><dd>${book.chapters.length} chapters / ${book.chapters.reduce((n,c) => n+c.verses.length,0).toLocaleString()} verses</dd><dt>Companion material</dt><dd>${notes.length} sourced appendices</dd><dt>Perspective</dt><dd>Comparative academic study</dd></dl></div><div class="section-heading"><h2>A narrative guide</h2><small>Editorial divisions, not source headings</small></div><ol class="arc-list">${arcs.map(arc => `<li><span class="range">${arc.range}</span><div><a href="${verseLink(arc.chapter,arc.verse)}">${arc.title}</a><div class="arc-description">${arc.description}</div></div><a class="arc-reading" href="${verseLink(arc.chapter,arc.verse)}">Read the passage</a></li>`).join('')}</ol><div class="notice"><p><strong>Two distinct layers.</strong> The biblical text is transcribed from the preserved source. The reading divisions and appendix essays are editorial aids. Historical interpretations are attributed, not blended into the text.</p><p>The appendices are a selective starting collection, not a complete commentary or a survey of every tradition. <a href="#sources">See sources, coverage, and method.</a></p></div><div class="section-heading"><h2>From the appendices</h2><a href="#appendices">View all</a></div>${notes.slice(0,2).map(noteEntry).join('')}`;
  }
  function read(route) {
    const chapter = book.chapters.find(c => c.number === route.chapter);
    const related = notes.filter(note => note.passages.some(p => p.chapter === route.chapter));
    const source = byId[book.sourceId];
    let size = storage.get('size', '20');
    if (!['18','20','23','26'].includes(size)) size = '20';
    document.documentElement.style.setProperty('--verse-size', size + 'px');
    storage.set('position', verseLink(route.chapter, route.verse));
    return `${breadcrumb('Chapter reader')}<div class="reader-heading"><div><h1>Genesis ${chapter.number}</h1><p class="muted">King James Version <span aria-hidden="true">/</span> Biblical text</p></div></div><div class="reader-tools"><label for="chapter-select">Chapter</label><select id="chapter-select">${book.chapters.map(c => `<option value="${c.number}" ${c.number === chapter.number ? 'selected' : ''}>${c.number}</option>`).join('')}</select><label for="text-size">Text size</label><select id="text-size">${['18','20','23','26'].map(n => `<option value="${n}" ${n === size ? 'selected' : ''}>${n}px</option>`).join('')}</select><button type="button" id="print-page">Print chapter</button></div><div class="reader-grid"><div><article class="scripture" aria-label="Genesis chapter ${chapter.number}">${chapter.verses.map(verse => `<p class="verse ${verse.number === route.verse ? 'selected' : ''}" id="v${verse.number}"><a class="verse-number" href="${verseLink(chapter.number,verse.number)}" aria-label="Link to Genesis ${chapter.number}:${verse.number}">${verse.number}</a><span class="verse-text">${escape(verse.text)}</span></p>`).join('')}</article><nav class="chapter-nav" aria-label="Chapter navigation">${chapter.number > 1 ? `<a id="previous-chapter" href="#read/${chapter.number-1}">Previous chapter</a>` : '<span>Beginning of Genesis</span>'}<span>${chapter.number} of ${book.chapters.length}</span>${chapter.number < book.chapters.length ? `<a id="next-chapter" href="#read/${chapter.number+1}">Next chapter</a>` : '<a href="#home">Back to overview</a>'}</nav><details class="chapter-map"><summary>All chapters</summary><div class="chapter-grid">${book.chapters.map(c => `<a href="#read/${c.number}" ${c.number===chapter.number ? 'aria-current="page"' : ''}>${c.number}</a>`).join('')}</div></details></div><aside class="reading-aside"><section><h2>Alongside this chapter</h2>${related.length ? `<ul>${related.map(note => `<li><a href="#note/${escape(note.id)}">${escape(note.title)}</a><span class="subtle">Editorial appendix with primary sources</span></li>`).join('')}</ul>` : '<p>No appendix has been added for this chapter yet.</p>'}<a href="#appendices">All theological appendices</a></section><section><h2>About this text</h2><p>Verse numbering is retained. Narrative headings and theological commentary are kept outside the biblical text.</p>${source ? `<a class="citation" href="${external(source.url)}" target="_blank" rel="noopener noreferrer">Source edition</a>` : ''}<a href="#sources">Editorial method</a><p class="subtle">Click a verse number for a permanent reference. Your most recently opened passage is remembered in this browser when storage is available.</p></section></aside></div>`;
  }
  function appendices() {
    return `${breadcrumb('Theological appendices')}<h1>Theological appendices</h1><p class="lead">An accompanying library of interpretations.</p><p class="muted">Primary-source passages and attributed comparisons, with Luther as one major voice. These essays are editorial starting points, not peer-reviewed scholarship or a complete account of the history of interpretation.</p>${notes.map(noteEntry).join('')}`;
  }
  function notePage(note) {
    return `${breadcrumb('Theological appendices')}<div class="essay"><p class="editorial-label">${escape(note.status || 'Editorial synthesis')} / Distinct from the biblical text</p><h1>${escape(note.title)}</h1><p class="lead">${escape(note.summary)}</p>${passageLinks(note)}${note.body.map(section => `<section><h2>${escape(section.heading)}</h2><p>${escape(section.text)}</p><div class="citations">${sourceLinks(section.sourceIds)}</div></section>`).join('')}<h2>Primary-source extracts</h2>${note.quotes.map(quote => `<blockquote><p>${escape(quote.text)}</p><cite>${escape(byId[quote.sourceId]?.title || quote.sourceId)} — ${escape(quote.locator)}</cite></blockquote><div class="citations">${sourceLinks([quote.sourceId])}</div>`).join('')}<div class="notice"><p>Quotations come from the identified source editions. The surrounding comparisons are editorial and should be checked against the full context. These translations do not substitute for a critical edition or study of the original languages.</p></div><h2>References</h2><div class="citations">${sourceLinks(note.sourceIds)}</div><p><a href="#sources">Bibliography and preserved local sources</a></p><p><a href="#appendices">Back to all appendices</a></p></div>`;
  }
  function bibliography() {
    return `${breadcrumb('Sources & method')}<h1>Sources &amp; method</h1><p class="lead">An inspectable reading library, not an invisible synthesis.</p><div class="essay"><h2>What belongs to whom</h2><p><strong>Biblical text:</strong> the KJV wording is imported from the preserved source. Verse text is not generated by an AI model. This is a reading edition, not a critical text or facsimile of the 1611 printing.</p><p><strong>Historical commentary:</strong> excerpts retain their source wording and name their work and locator. A selected excerpt does not imply that the complete work is presented in the reader.</p><p><strong>Editorial material:</strong> narrative divisions, summaries, and comparisons are generated editorial aids. Disagreements remain attributed. Historical age or modernity alone does not settle an interpretive question.</p><p><strong>Coverage:</strong> the Genesis text is complete. The appendices are selective and currently cover only the passages listed on each essay. They are not a comprehensive representation of Jewish, Christian, or historical-critical scholarship.</p><p><strong>Local use:</strong> reading and search work from the files in this folder. External bibliography links require a connection. Rights are edition- and jurisdiction-specific; check them before redistribution.</p></div><h2>Bibliography</h2>${sources.map(source => `<article class="source-record" id="source-${escape(source.id)}"><h2>${escape(source.title)}</h2><dl><dt>Edition</dt><dd>${escape(source.edition || 'See original source')}</dd><dt>Translator / editor</dt><dd>${escape(source.translator || 'Not recorded')}</dd><dt>Coverage</dt><dd>${escape(source.coverage || 'See source record')}</dd><dt>Rights</dt><dd>${escape(source.rights || 'Review source terms before reuse')}</dd><dt>Original</dt><dd><a class="citation" href="${external(source.url)}" target="_blank" rel="noopener noreferrer">${escape(source.url)}</a></dd><dt>Local copy</dt><dd>${local(source.localPath) ? `<a href="${local(source.localPath)}">${escape(source.localPath)}</a>` : 'See raw source manifest'}</dd></dl></article>`).join('')}<div class="notice"><p>Source hashes and provenance are recorded under <code>raw/</code>. Readable appendix exports are under <code>notes/</code>; edit <code>tools/notes.json</code> to revise them. The project README explains rebuilding and verification.</p></div>`;
  }
  function searchPage(query) {
    const results = core.search(book.chapters, query);
    return `${breadcrumb('Search')}<h1>Search Genesis</h1><p class="muted">${query.trim() ? `${results.length} verse${results.length === 1 ? '' : 's'} matching “${escape(query)}”` : 'Enter a word or phrase in the search field.'}</p><p class="muted">Search covers the complete KJV Genesis text. It does not search appendix essays.</p>${query.trim() && !results.length ? '<div class="notice">No matching verses. Try a shorter word or wording from the King James Version.</div>' : ''}${results.map(result => `<article class="result"><a href="${verseLink(result.chapter,result.verse)}">Genesis ${result.chapter}:${result.verse}</a><p>${escape(result.text)}</p></article>`).join('')}`;
  }
  function render() {
    const route = core.route(location.hash, book);
    const main = $('#content');
    let html;
    if (route.page === 'home') html = home();
    if (route.page === 'read') html = read(route);
    if (route.page === 'appendices') html = appendices();
    if (route.page === 'note') {
      const note = notes.find(n => n.id === route.id);
      if (note) html = notePage(note);
    }
    if (route.page === 'sources') html = bibliography();
    if (route.page === 'search') html = searchPage(route.query);
    main.innerHTML = html || `${breadcrumb('Unknown reference')}<h1>Page not found</h1><p>This reference is not in the current library. <a href="#home">Return to Genesis.</a></p>`;
    document.title = main.querySelector('h1').textContent + ' · Scripture Library';
    $('#announcement').textContent = main.querySelector('h1').textContent;
    document.querySelectorAll('[data-nav]').forEach(link => {
      const active = link.dataset.nav === (route.page === 'note' ? 'appendices' : route.page);
      if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    if (route.page === 'search') $('#search-input').value = route.query;
    if (route.page === 'read') {
      $('#chapter-select').addEventListener('change', event => { location.hash = '#read/' + event.target.value; });
      $('#text-size').addEventListener('change', event => {
        storage.set('size',event.target.value);
        document.documentElement.style.setProperty('--verse-size',event.target.value + 'px');
      });
      $('#print-page').addEventListener('click', () => window.print());
    }
    window.scrollTo(0,0);
    if (route.page === 'read' && route.verse > 1) requestAnimationFrame(() => document.getElementById('v' + route.verse)?.scrollIntoView({block:'center'}));
  }
  $('#search-form').addEventListener('submit', event => {
    event.preventDefault();
    const hash = '#search/' + encodeURIComponent($('#search-input').value.trim());
    if (location.hash === hash) render(); else location.hash = hash;
  });
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    $('#content').focus();
  });
  window.addEventListener('hashchange', render);
  render();
})();
