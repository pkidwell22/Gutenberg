"""Source-integrity tests. Run: python3 -m unittest discover -s tests -v."""
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))


class CorpusTests(unittest.TestCase):
    def builder(self):
        self.assertIsNotNone(importlib.util.find_spec('build_corpus'),
                             'The corpus builder must exist')
        import build_corpus
        return build_corpus

    def test_parse_preserves_source_characters_and_book_boundary(self):
        source = ('The First Book of Moses: Called Genesis\r\n'
                  'The Second Book of Moses: Called Exodus\r\n'
                  'The First Book of Moses: Called Genesis\r\n\r\n'
                  '1:1 In the beginning God created the heaven and the earth.\r\n\r\n'
                  '1:2 And the earth was without form, and void;\r\n'
                  'and darkness was upon the face of the deep.\r\n\r\n'
                  'The Second Book of Moses: Called Exodus\r\n\r\n1:1 NOT GENESIS')
        chapters = self.builder().parse_genesis(source)
        self.assertEqual(len(chapters), 1)
        self.assertEqual(chapters[0]['verses'][1]['text'],
                         'And the earth was without form, and void;\r\n'
                         'and darkness was upon the face of the deep.')
        self.assertNotIn('NOT GENESIS', str(chapters))
        for verse in chapters[0]['verses']:
            self.assertEqual(source[verse['sourceStart']:verse['sourceEnd']], verse['text'])

    def test_parse_recognizes_inline_verse_markers(self):
        source = ('The First Book of Moses: Called Genesis\n'
                  '1:1 Alpha. 1:2 Beta.\n\n2:1 Gamma.\n'
                  'The Second Book of Moses: Called Exodus\n1:1 Other.')
        chapters = self.builder().parse_genesis(source)
        self.assertEqual([v['text'] for v in chapters[0]['verses']], ['Alpha.', 'Beta.'])
        self.assertEqual(chapters[1]['verses'][0]['number'], 1)

    def test_parse_recognizes_wrapped_marker_separator(self):
        source = ('The First Book of Moses: Called Genesis\n'
                  '1:1 Alpha. 1:2\r\nBeta.\n'
                  'The Second Book of Moses: Called Exodus')
        chapters = self.builder().parse_genesis(source)
        self.assertEqual([v['text'] for v in chapters[0]['verses']], ['Alpha.', 'Beta.'])

    def test_build_complete_verified_library(self):
        module = self.builder()
        self.assertTrue(hasattr(module, 'build_library'), 'A complete offline builder is required')
        library = module.build_library()
        chapters = library['book']['chapters']
        counts = [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,
                  34,24,20,67,34,35,46,22,35,43,55,32,20,31,29,43,36,30,23,23,
                  57,38,34,34,28,34,31,22,33,26]
        self.assertEqual([len(c['verses']) for c in chapters], counts)
        self.assertEqual(sum(counts), 1533)
        self.assertEqual(library['book']['sourceId'], 'kjv')
        self.assertGreaterEqual(len(library['notes']), 3)
        self.assertLessEqual(len(library['notes']), 5)
        sources = {s['id']: s for s in library['sources']}
        for chapter in chapters:
            self.assertEqual([v['number'] for v in chapter['verses']],
                             list(range(1, len(chapter['verses']) + 1)))
            raw = (ROOT / sources['kjv']['localPath']).read_bytes().decode('utf-8-sig')
            for verse in chapter['verses']:
                self.assertEqual(raw[verse['sourceStart']:verse['sourceEnd']], verse['text'])
        for note in library['notes']:
            self.assertEqual(note['status'], 'Editorial synthesis')
            self.assertGreaterEqual(len(note['quotes']), 2)
            self.assertIn('luther1', note['sourceIds'])
            self.assertIn('augustine', note['sourceIds'])
            for quote in note['quotes']:
                raw = (ROOT / sources[quote['sourceId']]['localPath']).read_bytes().decode('utf-8-sig')
                self.assertEqual(raw[quote['sourceStart']:quote['sourceEnd']], quote['text'])
                self.assertIn('lines', quote['locator'])
            for passage in note['passages']:
                self.assertLessEqual(passage['end'], counts[passage['chapter'] - 1])

    def test_validation_rejects_corruption(self):
        import copy
        module = self.builder()
        self.assertTrue(hasattr(module, 'validate_library'), 'Source validation must reject drift')
        original = module.build_library()
        module.validate_library(original)
        mutations = [
            lambda d: d['book']['chapters'][0]['verses'][0].update(text='Invented scripture'),
            lambda d: d['book']['chapters'][0]['verses'][0].update(number=2),
            lambda d: d['book']['chapters'].pop(),
            lambda d: d['notes'][0]['quotes'][0].update(text='Invented quotation'),
            lambda d: d['notes'][0]['quotes'][0].update(lineStart=1),
            lambda d: d['notes'][0]['passages'][0].update(end=999),
            lambda d: d['notes'][0]['body'][0].update(sourceIds=['missing']),
            lambda d: d['notes'][0]['quotes'].clear(),
            lambda d: d['notes'][1].update(id=d['notes'][0]['id']),
            lambda d: d['sources'][0].update(sha256='0' * 64),
            lambda d: d['sources'][0].update(metadataSha256='0' * 64),
            lambda d: d['book'].update(sourceId='missing'),
        ]
        for i, mutate in enumerate(mutations):
            with self.subTest(mutation=i):
                changed = copy.deepcopy(original)
                mutate(changed)
                with self.assertRaises(ValueError):
                    module.validate_library(changed)

    def test_generated_artifacts_have_contract_frontmatter_and_backlinks(self):
        import json
        import re
        module = self.builder()
        self.assertTrue(hasattr(module, 'render_artifacts'), 'Generator must emit complete artifacts')
        library = module.build_library()
        artifacts = module.render_artifacts(library)
        self.assertEqual(len(artifacts), 5)
        script = artifacts['data/library.js']
        self.assertTrue(script.startswith('window.SCRIPTURE_LIBRARY = '))
        self.assertEqual(json.loads(script[len('window.SCRIPTURE_LIBRARY = '):-2]), library)
        for note in library['notes']:
            page = artifacts[note['localPath']]
            self.assertTrue(page.startswith('---\n'))
            for field in ['title:', 'created:', 'updated:', 'type:', 'tags:', 'sources:',
                          'confidence:', 'contested:', 'status:']:
                self.assertIn(field, page.split('---')[1])
            self.assertIn('[[index]]', page)
            self.assertGreaterEqual(len(re.findall(r'\[\[notes/', page)), 2)
            for related in note['relatedIds']:
                self.assertIn('[[notes/' + related + ']]', page)
                self.assertIn('[[notes/' + note['id'] + ']]', artifacts['notes/' + related + '.md'])
            self.assertIn('## Sources', page)

    def test_offline_generation_and_check_detect_real_file_drift(self):
        import shutil
        import tempfile
        module = self.builder()
        self.assertTrue(hasattr(module, 'run'), 'Builder needs a write/check entry point')
        scratch = Path('/Users/patrickk/.hermes/cache/scratch')
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='scripture-corpus-', dir=scratch) as folder:
            root = Path(folder)
            shutil.copytree(ROOT / 'raw', root / 'raw')
            (root / 'tools').mkdir()
            shutil.copy2(ROOT / 'tools/notes.json', root / 'tools/notes.json')
            with self.assertRaises(ValueError):
                module.run(root, check=True)
            report = module.run(root)
            self.assertEqual(report['verses'], 1533)
            self.assertEqual(module.run(root, check=True), report)
            data_path = root / 'data/library.js'
            original = data_path.read_bytes()
            module.run(root)
            self.assertEqual(data_path.read_bytes(), original)
            data_path.write_text('window.SCRIPTURE_LIBRARY = {};\n')
            with self.assertRaisesRegex(ValueError, 'Generated file drift'):
                module.run(root, check=True)
            module.run(root)
            raw_path = root / 'raw/kjv.txt'
            raw_path.write_bytes(raw_path.read_bytes() + b'corruption')
            with self.assertRaisesRegex(ValueError, 'SHA-256 mismatch'):
                module.run(root)
            self.assertEqual(data_path.read_bytes(), original)


if __name__ == '__main__':
    unittest.main()
