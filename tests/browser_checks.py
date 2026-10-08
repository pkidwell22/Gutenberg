"""Execute through Hermes browser_exec; requires pre-imported browser helpers.
Example: exec(Path('.../tests/browser_checks.py').read_text()).
Tests the real loaded library, not generated fixtures.
"""
import json
import time

def check(expression, message):
    assert js(expression), message
    print('PASS', message)

check("document.title.includes('Scripture Library')", 'Library document is served')
check("!!document.querySelector('#search-form')", 'Search form is present')
check("!!document.querySelector('#theme')", 'Display controls are present')
if js("!!window.SCRIPTURE_LIBRARY"):
    js("location.hash = '#read/1/1'")
    time.sleep(0.2)
    check("document.querySelector('h1').textContent === 'Genesis 1'", 'Genesis deep link opens chapter')
    check("document.querySelectorAll('.verse').length === SCRIPTURE_LIBRARY.book.chapters[0].verses.length", 'Every chapter verse is rendered')
    check("document.querySelector('#v1 .verse-text').textContent === SCRIPTURE_LIBRARY.book.chapters[0].verses[0].text", 'Verse text matches imported source')
    js("document.querySelector('#next-chapter').click()")
    time.sleep(0.2)
    check("document.querySelector('h1').textContent === 'Genesis 2'", 'Next chapter navigation works')
    js("document.querySelector('#search-input').value = 'covenant'; document.querySelector('#search-form').requestSubmit()")
    time.sleep(0.2)
    check("document.querySelectorAll('.result').length > 0", 'Full-book search finds results')
    js("document.querySelector('.result a').click()")
    time.sleep(0.2)
    check("!!document.querySelector('.verse.selected')", 'Search result opens and selects verse')
    js("location.hash = '#appendices'")
    time.sleep(0.2)
    check("document.querySelectorAll('.note-entry').length === SCRIPTURE_LIBRARY.notes.length", 'Every appendix is catalogued')
    js("document.querySelector('.note-entry a').click()")
    time.sleep(0.2)
    check("document.querySelectorAll('blockquote').length > 0", 'Appendix contains primary-source quotations')
    check("document.querySelectorAll('.citation').length > 0", 'Appendix has source links')
    js("location.hash = '#sources'")
    time.sleep(0.2)
    check("document.querySelectorAll('.source-record').length === SCRIPTURE_LIBRARY.sources.length", 'Bibliography includes every source')
    check("document.querySelector('#content').innerText.includes('Translator / editor')", 'Bibliography displays translator/editor metadata')
    js("location.hash = '#read/99'")
    time.sleep(0.2)
    check("document.querySelector('h1').textContent === 'Page not found'", 'Invalid reference is not silently substituted')
    old = js("document.documentElement.dataset.theme")
    js("document.querySelector('#theme').click()")
    check("document.documentElement.dataset.theme !== " + json.dumps(old), 'Theme control changes display')
    js("location.hash = '#home'")
else:
    raise AssertionError('Corpus must be loaded for the integration suite to pass')
