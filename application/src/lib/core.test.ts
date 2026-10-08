import { describe, expect, it } from 'vitest';
import type { Book, Chapter } from '../../shared/library';
import { route, search } from './core';

// Small artificial fixtures, not library content (mirrors legacy tests/core.test.cjs).
const chapters: Chapter[] = [
  {
    number: 1,
    verses: [
      { number: 1, text: 'A sample earth sentence.', sourceStart: 0, sourceEnd: 23 },
      { number: 2, text: 'Another sentence.', sourceStart: 24, sourceEnd: 41 },
    ],
  },
  {
    number: 2,
    verses: [{ number: 1, text: 'The EARTH example.', sourceStart: 42, sourceEnd: 60 }],
  },
];

describe('search', () => {
  it('matches literally and case-insensitively, returning chapter/verse refs', () => {
    expect(search(chapters, 'earth').map(r => [r.chapter, r.verse])).toEqual([[1, 1], [2, 1]]);
  });

  it('returns nothing for empty or whitespace-only query', () => {
    expect(search(chapters, '')).toEqual([]);
    expect(search(chapters, '   \t\n ')).toEqual([]);
  });

  it('treats punctuation literally, not as regex', () => {
    expect(search(chapters, '.*')).toEqual([]);
    expect(search(chapters, 'e.g.')).toEqual([]);
  });

  it('normalizes whitespace across CRLF wraps while preserving original returned text', () => {
    const wrapped: Chapter[] = [{
      number: 1,
      verses: [{ number: 1, text: 'The earth\r\nwas without form.', sourceStart: 0, sourceEnd: 26 }],
    }];
    expect(search(wrapped, 'earth was')).toHaveLength(1);
    expect(search(wrapped, 'earth   was')[0].text).toBe(wrapped[0].verses[0].text);
  });
});

// Fixture book mirrors legacy tests: chapter 1 has verses 1 and 2.
const book = {
  id: 'gen',
  title: 'Fixture',
  translation: 'Fixture Translation',
  sourceId: 'fixture',
  chapters: [
    { number: 1, verses: [{ number: 1, text: 'one', sourceStart: 0, sourceEnd: 3 }, { number: 2, text: 'two', sourceStart: 4, sourceEnd: 7 }] },
    { number: 2, verses: [{ number: 3, text: 'three', sourceStart: 8, sourceEnd: 13 }] },
  ],
} satisfies Book;

describe('route', () => {
  it('resolves normal, empty, and home routes', () => {
    expect(route('#home', book)).toEqual({ page: 'home' });
    expect(route('', book)).toEqual({ page: 'home' });
    expect(route('#', book)).toEqual({ page: 'home' });
  });

  it('resolves sources and appendices routes only as single segments', () => {
    expect(route('#sources', book)).toEqual({ page: 'sources' });
    expect(route('#appendices', book)).toEqual({ page: 'appendices' });
    expect(route('#sources/extra', book)).toEqual({ page: 'missing' });
    expect(route('#appendices/extra', book)).toEqual({ page: 'missing' });
  });

  it('resolves read routes with explicit and default verse', () => {
    expect(route('#read/1/2', book)).toEqual({ page: 'read', chapter: 1, verse: 2 });
    expect(route('#read/1', book)).toEqual({ page: 'read', chapter: 1, verse: 1 });
    expect(route('#read/2/3', book)).toEqual({ page: 'read', chapter: 2, verse: 3 });
  });

  it('rejects out-of-bounds chapter and verse values', () => {
    expect(route('#read/99', book).page).toBe('missing');
    expect(route('#read/1/99', book).page).toBe('missing');
    expect(route('#read/2/1', book).page).toBe('missing'); // chapter 2 only has verse 3
  });

  it('rejects zero, negative, non-integer, and leading-zero numeric segments', () => {
    for (const hash of ['#read/0', '#read/1/0', '#read/-1', '#read/1.5', '#read/01', '#read/1/02', '#read/1/1.0', '#read/1/']) {
      expect(route(hash, book).page, hash).toBe('missing');
    }
  });

  it('rejects non-numeric and extra path segments on read routes', () => {
    for (const hash of ['#read/1garbage', '#read/1/1/extra', '#read/1/2/3', '#read']) {
      expect(route(hash, book).page, hash).toBe('missing');
    }
  });

  it('accepts lowercase alphanumeric-dash note ids only', () => {
    expect(route('#note/coverage-note', book)).toEqual({ page: 'note', id: 'coverage-note' });
    expect(route('#note/a1-2', book)).toEqual({ page: 'note', id: 'a1-2' });
    for (const hash of ['#note/Coverage', '#note/under_score', '#note/a.b', '#note/', '#note/id/extra', '#note']) {
      expect(route(hash, book).page, hash).toBe('missing');
    }
  });

  it('decodes search queries, treating encoded spaces and slashes literally', () => {
    expect(route('#search/earth%20and', book)).toEqual({ page: 'search', query: 'earth and' });
    expect(route('#search/earth', book)).toEqual({ page: 'search', query: 'earth' });
    expect(route('#search/hello%20world/foo', book)).toEqual({ page: 'search', query: 'hello world/foo' });
    expect(route('#search', book)).toEqual({ page: 'search', query: '' });
    expect(route('#search/%E2%99%A5', book)).toEqual({ page: 'search', query: '\u2665' });
  });

  it('returns missing for malformed percent escapes', () => {
    expect(route('#search/%E0%A4%A', book)).toEqual({ page: 'missing' });
    expect(route('#%zz', book).page).toBe('missing');
  });

  it('returns missing for unknown pages', () => {
    expect(route('#bogus', book)).toEqual({ page: 'missing' });
    expect(route('#readx/1', book).page).toBe('missing');
  });
});
