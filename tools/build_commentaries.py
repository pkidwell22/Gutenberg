#!/usr/bin/env python3
"""Build the separate full-work commentary corpus without altering source bytes."""
import re
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def raw_path(root, relative):
    path = Path(relative)
    base = root.resolve()
    if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'raw':
        raise ValueError('Source path must be inside raw/')
    resolved = (base / path).resolve()
    if not resolved.is_relative_to(base / 'raw'):
        raise ValueError('Source path escapes raw/')
    return resolved


def verified_bytes(root, relative, checksum, length):
    data = raw_path(root, relative).read_bytes()
    if len(data) != length or hashlib.sha256(data).hexdigest() != checksum:
        raise ValueError('Source integrity mismatch: ' + relative)
    return data


def gutenberg_body(text):
    starts = list(re.finditer(r'^\*\*\* START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*\*\*\*[ \t]*\r?\n', text, re.MULTILINE))
    ends = list(re.finditer(r'^\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK .*\*\*\*[ \t]*\r?$', text, re.MULTILINE))
    if len(starts) != 1 or len(ends) != 1 or starts[0].end() >= ends[0].start():
        raise ValueError('Invalid Gutenberg body boundaries')
    return starts[0].end(), ends[0].start()


def source_body(text, entry):
    selection = entry.get('body')
    if selection is None:
        return gutenberg_body(text)
    positions = []
    for key in ('startMarker','endMarker'):
        matches = list(re.finditer(r'^'+re.escape(selection[key])+r'[ \t]*\r?$',text,re.MULTILINE))
        if len(matches) != 1:
            raise ValueError('Anthology boundary must occur exactly once')
        positions.append(matches[0].start())
    if positions[0] >= positions[1]:
        raise ValueError('Anthology boundaries are reversed')
    return tuple(positions)


def build_corpus(root, recipe):
    if recipe.get('schemaVersion') != 1:
        raise ValueError('Unsupported recipe schema')
    works = []
    ids = set()
    for entry in recipe['works']:
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', entry['id']) or entry['id'] in ids:
            raise ValueError('Invalid or duplicate work ID')
        ids.add(entry['id'])
        manifest = json.loads(raw_path(root, entry['manifest']).read_text())
        matches = [s for s in manifest['sources'] if s['id'] == entry['sourceId']]
        if len(matches) != 1:
            raise ValueError('Source must resolve exactly once')
        source = matches[0]
        text = verified_bytes(root, source['localPath'], source['sha256'], source['bytes']).decode('utf-8-sig')
        metadata = verified_bytes(root, source['metadataPath'], source['metadataSha256'], source['metadataBytes']).decode('utf-8-sig')
        rights_evidence = source.get('rightsEvidenceText', 'Public domain in the USA')
        if rights_evidence not in ('Public domain in the USA', '<DC.Rights>Public Domain</DC.Rights>') or rights_evidence not in metadata:
            raise ValueError('Missing archived public-domain evidence')
        if 'rightsPolicyPath' in source:
            verified_bytes(root, source['rightsPolicyPath'], source['rightsPolicySha256'], source['rightsPolicyBytes'])
        start, end = source_body(text, entry)
        work = {key:entry[key] for key in ('id','author','title','coverage','completeness')}
        work.update({key:source[key] for key in ('edition','translator','rights','localPath')})
        work.update(sourceUrl=source['url'], sourceSha256=source['sha256'], sourceFormat='text',
                    textPolicy='Exact slices of the archived UTF-8 text, decoded without BOM. Offsets count Unicode characters, not bytes. Historical spelling, line wraps, editorial outlines and notes are retained. Gutenberg notices are available in the complete original source file. Genesis links are curated navigation associations, not automatic verse mappings.',
                    sections=partition_source(text, entry['boundaries'], start, end))
        if 'textPolicy' in entry:
            work['textPolicy'] = entry['textPolicy']
        works.append(work)
    return {'schemaVersion':1, 'works':works, 'gaps':recipe.get('gaps',[])}


def partition_source(text, boundaries, body_start, body_end):
    if not boundaries or not (0 <= body_start < body_end <= len(text)):
        raise ValueError('Invalid or empty source boundaries')
    identifiers = set()
    selected = []
    for boundary in boundaries:
        identifier = boundary['id']
        chapters = boundary['genesisChapters']
        if (not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', identifier) or
                identifier == 'frontmatter' or identifier in identifiers):
            raise ValueError('Invalid or duplicate section identifier')
        if (boundary['kind'] not in ('commentary','meditation','treatise','frontmatter') or
                not boundary['title'].strip() or not isinstance(chapters, list) or
                any(type(n) is not int or not 1 <= n <= 50 for n in chapters) or
                len(chapters) != len(set(chapters))):
            raise ValueError('Invalid section metadata')
        identifiers.add(identifier)
        matches = list(re.finditer(r'^' + re.escape(boundary['marker']) + r'[ \t]*\r?$', text, re.MULTILINE))
        matches = [m for m in matches if body_start <= m.start() < body_end]
        if len(matches) != 1:
            raise ValueError('Section marker must occur exactly once: ' + boundary['marker'])
        position = matches[0].start()
        if selected and position <= selected[-1][0]:
            raise ValueError('Section markers must be in source order')
        selected.append((position, boundary))
    if selected and selected[0][0] > body_start:
        selected.insert(0, (body_start, {'id':'frontmatter', 'title':'Title pages and editorial introductions', 'kind':'frontmatter', 'genesisChapters':[]}))
    sections = []
    for ordinal, (start, boundary) in enumerate(selected):
        end = selected[ordinal + 1][0] if ordinal + 1 < len(selected) else body_end
        section = {key: boundary[key] for key in ('id','title','kind','genesisChapters')}
        section.update(ordinal=ordinal, sourceStart=start, sourceEnd=end, text=text[start:end])
        sections.append(section)
    return sections


def main():
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify generated corpus without writing')
    parser.add_argument('--root', type=Path, default=ROOT, help='Corpus root, mainly for isolated tests')
    args = parser.parse_args()
    try:
        recipe = json.loads((args.root/'tools/commentary-recipes.json').read_text(encoding='utf-8'))
        corpus = build_corpus(args.root, recipe)
        data = (json.dumps(corpus, ensure_ascii=False, indent=2)+'\n').encode('utf-8')
        destination = args.root/'data/commentaries.json'
        if args.check:
            if not destination.is_file() or destination.read_bytes() != data:
                raise ValueError('Generated commentary corpus is missing or differs; rebuild deliberately')
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        print(json.dumps({'verified':True,'works':len(corpus['works']),
                          'sections':sum(len(w['sections']) for w in corpus['works']),
                          'characters':sum(len(s['text']) for w in corpus['works'] for s in w['sections']),
                          'checkOnly':args.check}))
        return 0
    except (ValueError, OSError, KeyError, TypeError) as error:
        print('Commentary build failed: '+str(error))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
