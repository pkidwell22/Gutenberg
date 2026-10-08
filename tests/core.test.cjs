const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const filename = path.join(__dirname, '../core.js');

test('search returns chapter and verse references with literal, case-insensitive matches', () => {
  assert.ok(fs.existsSync(filename), 'Reader core is implemented');
  const {search} = require(filename);
  // Small artificial fixture, not library content.
  const chapters = [{number: 1, verses: [{number: 1, text: 'A sample earth sentence.'}, {number: 2, text: 'Another sentence.'}]}, {number: 2, verses: [{number: 1, text: 'The EARTH example.'}]}];
  assert.deepEqual(search(chapters, 'earth').map(r => [r.chapter, r.verse]), [[1,1], [2,1]]);
  assert.equal(search(chapters, '').length, 0);
  assert.equal(search(chapters, '.*').length, 0);
  const wrapped = [{number:1,verses:[{number:1,text:'The earth\r\nwas without form.'}]}];
  assert.equal(search(wrapped, 'earth was').length, 1, 'Source line wraps do not break phrase search');
  assert.equal(search(wrapped, 'earth   was')[0].text, wrapped[0].verses[0].text, 'Search preserves original returned text');
});

test('deep links validate chapters and verses and reject malformed paths', () => {
  const {route} = require(filename);
  assert.equal(typeof route, 'function', 'Deep-link routing exists');
  const book = {chapters: [{number:1, verses:[{number:1},{number:2}]}]};
  assert.deepEqual(route('#read/1/2', book), {page:'read', chapter:1, verse:2});
  assert.deepEqual(route('#read/1', book), {page:'read', chapter:1, verse:1});
  for (const hash of ['#read/99', '#read/1/99', '#read/1garbage', '#read/0', '#read/1/1/extra']) {
    assert.equal(route(hash, book).page, 'missing', hash);
  }
  assert.equal(route('#search/%E0%A4%A', book).page, 'missing');
  assert.deepEqual(route('#search/earth%20and', book), {page:'search', query:'earth and'});
  assert.equal(route('', book).page, 'home');
});
