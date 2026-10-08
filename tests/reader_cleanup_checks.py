"""Run via browser_exec against the real local reader."""
import time
js("history.replaceState(null,'','#read/2/4');dispatchEvent(new HashChangeEvent('hashchange'))")
time.sleep(.2)
assert js("getComputedStyle(document.querySelector('.verse.selected')).boxShadow==='none'"), 'Selected verse should have no enclosing edge or shadow'
assert js("getComputedStyle(document.querySelector('.verse.selected')).backgroundColor==='rgba(0, 0, 0, 0)'"), 'Selected verse should not be a card'
assert js("getComputedStyle(document.querySelector('.selected .verse-number')).backgroundColor!=='rgba(0, 0, 0, 0)'"), 'Selected verse retains a visible number marker'
assert js("getComputedStyle(document.querySelector('.reader-tools')).borderTopWidth==='0px'"), 'Toolbar should not have an enclosing box'
assert js("getComputedStyle(document.querySelector('.reader-tools')).backgroundColor==='rgba(0, 0, 0, 0)'"), 'Toolbar should share the reading surface'
assert js("getComputedStyle(document.querySelector('.scripture')).fontFamily === 'Charter, \"Palatino Linotype\", Palatino, Georgia, serif'"), 'Reading font is unchanged'
print('PASS selected verse marker, unboxed toolbar, and preserved reading font')
