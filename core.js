(function(root) {
  'use strict';
  function search(chapters, query) {
    const normalized = text => text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
    const q = normalized(query);
    if (!q) return [];
    return chapters.flatMap(chapter => chapter.verses
      .filter(verse => normalized(verse.text).includes(q))
      .map(verse => ({chapter: chapter.number, verse: verse.number, text: verse.text})));
  }
  function route(hash, book) {
    let parts;
    try { parts = decodeURIComponent(hash.replace(/^#/, '')).split('/'); }
    catch (_) { return {page:'missing'}; }
    const page = parts[0] || 'home';
    if (['home','sources','appendices'].includes(page) && parts.length === 1) return {page};
    if (page === 'read' && parts.length >= 2 && parts.length <= 3 && parts.slice(1).every(p => /^[1-9]\d*$/.test(p))) {
      const chapter = Number(parts[1]);
      const verse = Number(parts[2] || 1);
      if (book.chapters.some(c => c.number === chapter && c.verses.some(v => v.number === verse))) return {page, chapter, verse};
    }
    if (page === 'note' && parts.length === 2 && /^[a-z0-9-]+$/.test(parts[1])) return {page, id:parts[1]};
    if (page === 'search') return {page, query:parts.slice(1).join('/')};
    return {page:'missing'};
  }
  const api = {search, route};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ScriptureCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
