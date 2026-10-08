"""Exact-text regression tests for the separate full-commentary corpus."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


def builder():
    spec = importlib.util.spec_from_file_location('commentary_builder', ROOT / 'tools/build_commentaries.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CommentaryTests(unittest.TestCase):
    def test_sections_partition_source_without_changing_unicode_or_crlf(self):
        text = 'Header\r\nTitle 😀\r\n\r\nCHAPTER I.\r\nFirst—text.\r\n\r\nCHAPTER II.\r\nSecond.\r\nLicense'
        start = text.index('Title')
        end = text.index('License')
        boundaries = [
            {'marker':'CHAPTER I.', 'id':'genesis-1', 'title':'Genesis 1', 'kind':'commentary', 'genesisChapters':[1]},
            {'marker':'CHAPTER II.', 'id':'genesis-2', 'title':'Genesis 2', 'kind':'commentary', 'genesisChapters':[2]},
        ]
        sections = builder().partition_source(text, boundaries, start, end)
        self.assertEqual([s['id'] for s in sections], ['frontmatter', 'genesis-1', 'genesis-2'])
        self.assertEqual(''.join(s['text'] for s in sections), text[start:end])
        for ordinal, section in enumerate(sections):
            self.assertEqual(section['ordinal'], ordinal)
            self.assertEqual(section['text'], text[section['sourceStart']:section['sourceEnd']])
        self.assertEqual(sections[0]['kind'], 'frontmatter')
        self.assertEqual(sections[0]['genesisChapters'], [])

    def test_real_corpus_builds_complete_exact_slices_and_stable_ids(self):
        import json
        recipe = json.loads((ROOT / 'tools/commentary-recipes.json').read_text())
        corpus = builder().build_corpus(ROOT, recipe)
        self.assertEqual(corpus['schemaVersion'], 1)
        self.assertEqual([w['id'] for w in corpus['works']], [w['id'] for w in recipe['works']])
        by_id = {w['id']: w for w in corpus['works']}
        self.assertEqual(len(by_id['luther-genesis-1']['sections']), 5)
        self.assertEqual(len(by_id['luther-genesis-2']['sections']), 7)
        self.assertEqual(len(by_id['augustine-confessions']['sections']), 14)
        for work in corpus['works']:
            raw = (ROOT / work['localPath']).read_bytes().decode('utf-8-sig')
            for section in work['sections']:
                self.assertEqual(section['text'], raw[section['sourceStart']:section['sourceEnd']])
            entry = next(entry for entry in recipe['works'] if entry['id'] == work['id'])
            start, end = builder().source_body(raw, entry)
            self.assertEqual(''.join(s['text'] for s in work['sections']), raw[start:end])
        self.assertEqual(len(by_id['basil-hexameron']['sections']), 10)
        self.assertEqual([s['id'] for s in by_id['basil-hexameron']['sections'][1:]], [f'homily-{n}' for n in range(1,10)])
        self.assertNotIn('Introduction to the Letters.', by_id['basil-hexameron']['sections'][-1]['text'])
        self.assertEqual(corpus, builder().build_corpus(ROOT, recipe))

    def test_cli_generation_and_check_detect_drift_without_overwriting(self):
        import json, os, shutil, subprocess, sys, tempfile
        scratch = Path(os.environ.get('TMPDIR', str(Path.home()/'.hermes/cache/scratch')))
        with tempfile.TemporaryDirectory(dir=scratch, prefix='commentary-test-') as folder:
            root = Path(folder)
            (root/'raw').mkdir()
            (root/'tools').mkdir()
            recipe = json.loads((ROOT/'tools/commentary-recipes.json').read_text())
            recipe['works'] = recipe['works'][:1]
            (root/'tools/commentary-recipes.json').write_text(json.dumps(recipe))
            for name in ('manifest.json','luther1.txt','metadata-48193.html'):
                shutil.copyfile(ROOT/'raw'/name, root/'raw'/name)
            command = [sys.executable, str(ROOT/'tools/build_commentaries.py'), '--root', str(root)]
            subprocess.run(command,check=True,capture_output=True)
            generated = root/'data/commentaries.json'
            self.assertTrue(generated.is_file())
            subprocess.run(command+['--check'],check=True,capture_output=True)
            changed = generated.read_bytes()+b'\n'
            generated.write_bytes(changed)
            self.assertNotEqual(subprocess.run(command+['--check'],capture_output=True).returncode,0)
            self.assertEqual(generated.read_bytes(),changed)
            with (root/'raw/luther1.txt').open('ab') as source:
                source.write(b'tampered')
            with self.assertRaisesRegex(ValueError,'integrity'):
                builder().build_corpus(root,recipe)
            with self.assertRaises(ValueError):
                builder().raw_path(root,'raw/../tools/commentary-recipes.json')

    def test_publisher_advertisements_are_not_augustines_genesis_exposition(self):
        import json
        recipe = json.loads((ROOT/'tools/commentary-recipes.json').read_text())
        work = next(w for w in builder().build_corpus(ROOT,recipe)['works'] if w['id']=='augustine-city-of-god-1')
        book13 = next(s for s in work['sections'] if s['id']=='book-13')
        self.assertNotIn('LIST OF WORKS',book13['text'])
        publisher = next(s for s in work['sections'] if s['id']=='publisher-matter')
        self.assertEqual(publisher['kind'],'frontmatter')
        self.assertEqual(publisher['genesisChapters'],[])
        self.assertIn('SUBSCRIPTION BOOKS.',publisher['text'])
        self.assertEqual(book13['sourceEnd'],publisher['sourceStart'])

    def test_selected_anthology_body_excludes_neighboring_works(self):
        text='Earlier work\n   Introduction to the Homilies.\nEditor text\n   Homily I.\nExact words.\n   Introduction to Letters.\nLater work'
        recipe={'body':{'startMarker':'   Introduction to the Homilies.','endMarker':'   Introduction to Letters.'}}
        start,end=builder().source_body(text,recipe)
        self.assertEqual(text[start:end],'   Introduction to the Homilies.\nEditor text\n   Homily I.\nExact words.\n')
        with self.assertRaises(ValueError):
            builder().source_body(text+'\n   Introduction to Letters.\n',recipe)

    def test_rejects_invalid_boundaries_instead_of_dropping_text(self):
        text = 'ONE\r\nText\r\nTWO\r\nMore\r\n'
        a = {'marker':'ONE','id':'one','title':'One','kind':'commentary','genesisChapters':[1]}
        b = {'marker':'TWO','id':'two','title':'Two','kind':'commentary','genesisChapters':[2]}
        cases = [([],0,len(text)), ([b,a],0,len(text)), ([a,dict(b,id='one')],0,len(text)),
                 ([dict(a,id='../bad')],0,len(text)), ([dict(a,genesisChapters=[51])],0,len(text)),
                 ([a],-1,len(text)), ([a],0,len(text)+1), ([dict(a,marker='MISSING')],0,len(text))]
        for boundaries, start, end in cases:
            with self.subTest(boundaries=boundaries, start=start, end=end):
                with self.assertRaises(ValueError):
                    builder().partition_source(text,boundaries,start,end)
        with self.assertRaises(ValueError):
            builder().partition_source(text+'ONE\r\n',[a],0,len(text)+5)


if __name__ == '__main__':
    unittest.main()
