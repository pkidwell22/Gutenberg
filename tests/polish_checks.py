"""Run in browser_exec after opening the real library; presentation contract."""
import time

def style_check(expression, message):
    assert js(expression), message
    print('PASS', message)

js("document.documentElement.dataset.theme='dark';location.hash='#read/1'")
time.sleep(.2)
style_check("getComputedStyle(document.querySelector('main')).backgroundColor === 'rgb(14, 14, 14)'", 'Hermes-inspired neutral reading surface')
style_check("document.querySelector('.masthead').getBoundingClientRect().height <= 76", 'Compact desktop toolbar')
style_check("getComputedStyle(document.querySelector('.scripture')).fontFamily === 'Charter, \"Palatino Linotype\", Palatino, Georgia, serif'", 'Original Scripture font is preserved')
style_check("getComputedStyle(document.querySelector('h1')).fontFamily !== getComputedStyle(document.querySelector('.scripture')).fontFamily", 'App headings use distinct interface typography')
style_check("document.documentElement.scrollWidth <= innerWidth", 'No desktop horizontal overflow')
style_check("getComputedStyle(document.querySelector('#search-form button')).transitionDuration === '0s'", 'Theme switches avoid transient unreadable controls')
