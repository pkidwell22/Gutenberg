"""Build the offline Genesis corpus using only the Python standard library."""
import re
import json
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GENESIS = 'The First Book of Moses: Called Genesis'
EXODUS = 'The Second Book of Moses: Called Exodus'


def parse_genesis(source):
    """Extract exact decoded character slices, including source line wrapping."""
    start = source.rindex(GENESIS) + len(GENESIS)
    stop = source.index(EXODUS, start)
    matches = list(re.finditer(r'(?<!\S)(\d+):(\d+)\s+', source[start:stop]))
    chapters = []
    for index, match in enumerate(matches):
        chapter, number = map(int, match.groups())
        a = start + match.end()
        b = start + (matches[index + 1].start() if index + 1 < len(matches) else stop - start)
        b = a + len(source[a:b].rstrip())
        if not chapters or chapters[-1]['number'] != chapter:
            chapters.append({'number': chapter, 'verses': []})
        chapters[-1]['verses'].append({'number': number, 'text': source[a:b],
                                      'sourceStart': a, 'sourceEnd': b})
    return chapters


def build_library(root=ROOT):
    """Build deterministically from frozen downloads and reviewed note recipes."""
    manifest = json.loads((root / 'raw/manifest.json').read_text(encoding='utf-8'))
    sources = manifest['sources']
    texts = {s['id']: (root / s['localPath']).read_bytes().decode('utf-8-sig')
             for s in sources}
    notes = json.loads((root / 'tools/notes.json').read_text(encoding='utf-8'))
    for note in notes:
        note['quotes'] = []
        note['localPath'] = 'notes/' + note['id'] + '.md'
        for selection in note.pop('quoteSelections'):
            text = texts[selection['sourceId']]
            lines = text.splitlines(keepends=True)
            a = sum(map(len, lines[:selection['lineStart'] - 1]))
            b = sum(map(len, lines[:selection['lineEnd']]))
            b = a + len(text[a:b].rstrip())
            note['quotes'].append({
                **selection,
                'locator': selection['locator'] + '; frozen source lines '
                           + str(selection['lineStart']) + '–' + str(selection['lineEnd']),
                'text': text[a:b], 'sourceStart': a, 'sourceEnd': b,
            })
    return {
        'schemaVersion': 1,
        'book': {'id': 'genesis', 'title': 'Genesis', 'translation': 'King James Version',
                 'sourceId': 'kjv', 'chapters': parse_genesis(texts['kjv'])},
        'sources': sources, 'notes': notes,
        'coverage': 'Complete KJV Genesis; four selected comparative notes on Genesis 1–2. '
                    'Not a commentary on all fifty chapters and not a comprehensive account '
                    'of academic theology. Luther and Augustine are the initial voices.',
        'textPolicy': 'Exact UTF-8-sig decoded source substrings, preserving spelling, '
                      'punctuation and internal CRLF line wraps. Verse labels and surrounding '
                      'separator whitespace are excluded. No modernization or normalization.',
    }


VERSE_COUNTS = (31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,
                34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,
                57,38,34,34,28,34,31,22,33,26)


def validate_library(library, root=ROOT):
    """Fail closed on source drift, altered extracts, or invalid references."""
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    texts = {}
    sources = library['sources']
    require(len({s['id'] for s in sources}) == len(sources), 'Duplicate source IDs')
    manifest = json.loads((root / 'raw/manifest.json').read_text(encoding='utf-8'))
    require(sources == manifest['sources'], 'Library source records differ from frozen manifest')
    for source in sources:
        for field, hash_field, size_field in [('localPath', 'sha256', 'bytes'),
                                              ('metadataPath', 'metadataSha256', 'metadataBytes')]:
            path = root / source[field]
            require(path.resolve().is_relative_to((root / 'raw').resolve()), 'Non-raw source path')
            data = path.read_bytes()
            require(hashlib.sha256(data).hexdigest() == source[hash_field],
                    'SHA-256 mismatch: ' + source[field])
            require(len(data) == source[size_field], 'Byte count mismatch: ' + source[field])
        text = (root / source['localPath']).read_bytes().decode('utf-8-sig')
        require('*** START OF THE PROJECT GUTENBERG EBOOK' in text and
                '*** END OF THE PROJECT GUTENBERG EBOOK' in text, 'Incomplete source download')
        metadata = (root / source['metadataPath']).read_bytes().decode('utf-8')
        require('Public domain in the USA.' in metadata, 'Missing archived rights evidence')
        texts[source['id']] = text
    require(library['book']['sourceId'] == 'kjv', 'Invalid scripture source')
    chapters = library['book']['chapters']
    require([c['number'] for c in chapters] == list(range(1, 51)), 'Genesis must have chapters 1–50')
    require([len(c['verses']) for c in chapters] == list(VERSE_COUNTS), 'Incorrect verse counts')
    for chapter in chapters:
        require([v['number'] for v in chapter['verses']] ==
                list(range(1, VERSE_COUNTS[chapter['number'] - 1] + 1)), 'Missing or duplicate verse')
        for verse in chapter['verses']:
            require(verse['text'] == texts['kjv'][verse['sourceStart']:verse['sourceEnd']],
                    'Scripture is not an exact source slice')
    require(chapters == parse_genesis(texts['kjv']), 'Scripture does not match its source markers')
    notes = library['notes']
    require(3 <= len(notes) <= 5, 'Starter corpus must contain 3–5 notes')
    ids = {n['id'] for n in notes}
    require(len(ids) == len(notes), 'Duplicate note IDs')
    for note in notes:
        require(note['status'] == 'Editorial synthesis', 'Unlabeled editorial synthesis')
        require(note['sourceIds'] and set(note['sourceIds']) <= texts.keys(), 'Invalid note sources')
        require(note['quotes'], 'Note needs a verified quotation')
        require(note['passages'], 'Note needs actual Genesis references')
        require(set(note['relatedIds']) <= ids and len(set(note['relatedIds'])) >= 2,
                'Note needs at least two valid cross-references')
        for passage in note['passages']:
            require(1 <= passage['chapter'] <= 50, 'Invalid chapter reference')
            require(1 <= passage['start'] <= passage['end'] <= VERSE_COUNTS[passage['chapter'] - 1],
                    'Invalid verse range')
        for body in note['body']:
            require(isinstance(body['text'], str) and isinstance(body['heading'], str), 'Body is not plain text')
            require(body['sourceIds'] and set(body['sourceIds']) <= set(note['sourceIds']),
                    'Invalid body source IDs')
        for quote in note['quotes']:
            require(quote['sourceId'] in note['sourceIds'], 'Invalid quotation source')
            raw = texts[quote['sourceId']]
            require(quote['text'] and raw[quote['sourceStart']:quote['sourceEnd']] == quote['text'],
                    'Quotation is not an exact source slice')
            lines = raw.splitlines(keepends=True)
            require(1 <= quote['lineStart'] <= quote['lineEnd'] <= len(lines), 'Invalid quotation lines')
            a = sum(map(len, lines[:quote['lineStart'] - 1]))
            segment = ''.join(lines[quote['lineStart'] - 1:quote['lineEnd']]).rstrip()
            require(a == quote['sourceStart'] and segment == quote['text'], 'Quotation locator mismatch')
            require('frozen source lines ' + str(quote['lineStart']) + '–' + str(quote['lineEnd'])
                    in quote['locator'], 'Human-readable locator mismatch')
    return {'chapters': len(chapters), 'verses': sum(len(c['verses']) for c in chapters),
            'notes': len(notes), 'quotes': sum(len(n['quotes']) for n in notes),
            'sourceFiles': len(sources), 'metadataFiles': len(sources)}


def render_artifacts(library):
    """Render the reader payload and Markdown notes; do not alter raw sources."""
    sources = {s['id']: s for s in library['sources']}
    artifacts = {'data/library.js': 'window.SCRIPTURE_LIBRARY = '
                 + json.dumps(library, ensure_ascii=False, indent=2) + ';\n'}
    for note in library['notes']:
        fields = {
            'title': note['title'], 'created': '2026-10-08', 'updated': '2026-10-08',
            'type': 'comparison', 'tags': note['tags'],
            'sources': [sources[s]['localPath'] for s in note['sourceIds']],
            'confidence': 'medium', 'contested': note['contested'],
            'status': note['status'], 'passages': note['passages'],
        }
        page = '---\n' + ''.join(k + ': ' + json.dumps(v, ensure_ascii=False) + '\n'
                                 for k, v in fields.items()) + '---\n\n'
        page += '# ' + note['title'] + '\n\n'
        page += '**Editorial synthesis — selected historical readings, not a consensus verdict.**\n\n'
        page += note['summary'] + '\n\n'
        page += 'Passages: ' + '; '.join('Genesis {chapter}:{start}–{end}'.format(**p)
                                       for p in note['passages']) + '.\n\n'
        for body in note['body']:
            page += '## ' + body['heading'] + '\n\n' + body['text'] + '\n\n'
        page += '## Verified primary-text extracts\n\n'
        page += ('Quoted wording is mechanically sliced from the archived English editions. '
                 'Markdown blockquote prefixes and display line endings are presentation only; '
                 'data/library.js preserves the exact decoded source substrings, including CRLF.\n\n')
        for quote in note['quotes']:
            source = sources[quote['sourceId']]
            page += '### ' + source['title'] + '\n\n'
            page += quote['locator'] + '.[' + str(source['citationId']) + ']\n\n'
            page += '\n'.join('> ' + line for line in quote['text'].splitlines()) + '\n\n'
            page += ('Local source: [' + source['localPath'] + '](../' + source['localPath'] + '). '
                     'Decoded character offsets [' + str(quote['sourceStart']) + ', '
                     + str(quote['sourceEnd']) + ').\n\n')
        page += '## Related notes and backlinks\n\n[[index]] · [[SCHEMA]]\n\n'
        page += '\n'.join('- [[notes/' + related + ']]' for related in note['relatedIds']) + '\n\n'
        page += '## Sources\n\n'
        page += ''.join('[' + str(sources[s]['citationId']) + '] ' + sources[s]['url'] + '\n'
                        for s in note['sourceIds'])
        artifacts[note['localPath']] = page
    return artifacts


def run(root=ROOT, check=False):
    """Validate first, then write derived artifacts or verify them read-only."""
    library = build_library(root)
    report = validate_library(library, root)
    artifacts = render_artifacts(library)
    if check:
        for relative, content in artifacts.items():
            path = root / relative
            if not path.exists() or path.read_bytes() != content.encode('utf-8'):
                raise ValueError('Generated file drift or missing file: ' + relative)
    else:
        for relative, content in artifacts.items():
            path = root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content.encode('utf-8'))
    return report


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify frozen sources and generated outputs without writes')
    args = parser.parse_args()
    try:
        print(json.dumps(run(check=args.check), indent=2))
    except (ValueError, KeyError, OSError) as error:
        parser.exit(1, 'Corpus verification failed: ' + str(error) + '\n')
