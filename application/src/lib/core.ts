import type { Book, Chapter, Route, SearchResult } from '../../shared/library';

const normalize = (text: string): string =>
  text.replace(/\s+/g, ' ').trim().toLocaleLowerCase();

export function search(chapters: Chapter[], query: string): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];
  return chapters.flatMap(chapter =>
    chapter.verses
      .filter(verse => normalize(verse.text).includes(q))
      .map(verse => ({ chapter: chapter.number, verse: verse.number, text: verse.text })),
  );
}

export function route(hash: string, book: Book): Route {
  let parts: string[];
  try {
    parts = decodeURIComponent(hash.replace(/^#/, '')).split('/');
  } catch {
    return { page: 'missing' };
  }
  const page = parts[0] || 'home';
  if (['home', 'sources', 'appendices'].includes(page) && parts.length === 1) {
    return { page: page as 'home' | 'sources' | 'appendices' };
  }
  if (page === 'read' && parts.length >= 2 && parts.length <= 3 && parts.slice(1).every(p => /^[1-9]\d*$/.test(p))) {
    const chapter = Number(parts[1]);
    const verse = Number(parts[2] || 1);
    if (book.chapters.some(c => c.number === chapter && c.verses.some(v => v.number === verse))) {
      return { page, chapter, verse };
    }
  }
  if (page === 'note' && parts.length === 2 && /^[a-z0-9-]+$/.test(parts[1])) {
    return { page, id: parts[1] };
  }
  if (page === 'search') {
    return { page, query: parts.slice(1).join('/') };
  }
  return { page: 'missing' };
}
