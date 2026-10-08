import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('commentary presentation (source-level, not visual validation)',()=>{
  it('adds scoped serif prose, bounded contents, mobile stacking and print rules without changing existing tokens',()=>{
    const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
    expect(css).toMatch(/\.commentary-prose\s*\{[^}]*font:\s*var\(--verse-size\)\/1\.85 var\(--serif\)/);
    expect(css).toMatch(/\.commentary-grid\s*\{[^}]*grid-template-columns: 200px minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media \(max-width: 1000px\)\s*\{[\s\S]*?\.commentary-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
    expect(css).toMatch(/@media print\s*\{[^}]*\.commentary-toc[^}]*display: none/);
    expect(css).toContain('.commentary-toc a[aria-current=page]');
  });
});

describe('presentation preservation (source-level, not visual validation)', () => {
  it('retains the original stylesheet verbatim before scoped Radix additions', () => {
    const legacy=readFileSync(new URL('../../style.css',import.meta.url),'utf8');
    const migrated=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
    expect(migrated.startsWith(legacy)).toBe(true);
    expect(migrated).toContain("Charter, 'Palatino Linotype', Palatino, Georgia, serif");
    expect(migrated).toContain('.select-content');
    expect(migrated).toContain('.select-item[data-highlighted]');
    expect(migrated).toContain('var(--radix-select-content-available-height)');
  });
});
