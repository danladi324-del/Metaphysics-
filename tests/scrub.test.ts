import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ESM script without types
import { allowed, parsePatterns, scanText, formatHits } from '../scripts/scrub.mjs';

// Sample values only. The real list lives outside the repo (a gitignored file or a CI secret).
const PATTERNS = 'name\tZed\\s+Quill\nbirth date\t2001-0?2-0?3\nplace\tNowhere\\s*Falls';

describe('scrub scanner', () => {
  it('parses label<TAB>regex lines, ignoring blanks and comments', () => {
    const p = parsePatterns(`# comment\n\n${PATTERNS}\n`);
    expect(p.map((x: { label: string }) => x.label)).toEqual(['name', 'birth date', 'place']);
  });

  it('finds every occurrence with file and line, case-insensitively', () => {
    const hits = scanText(parsePatterns(PATTERNS), 'a.ts', 'ok\nzed quill was born 2001-2-3\nin NOWHERE FALLS');
    expect(hits.map((h: { label: string; line: number }) => `${h.label}@${h.line}`)).toEqual(['name@2', 'birth date@2', 'place@3']);
  });

  it('reports locations only, never the matched value', () => {
    const hits = scanText(parsePatterns(PATTERNS), 'a.ts', 'Zed Quill 2001-02-03 Nowhere Falls');
    const out = formatHits(hits);
    expect(out).toMatch(/a\.ts:1/);
    expect(out).not.toMatch(/Zed|Quill|2001|Nowhere|Falls/i);
  });

  it('skips only the public city list', () => {
    expect(allowed('public/data/cities.tsv')).toBe(true);
    expect(allowed('dist/data/cities.tsv')).toBe(true);
    expect(allowed('tests/natal.test.ts')).toBe(false);
  });

  it('a clean text has no hits', () => {
    expect(scanText(parsePatterns(PATTERNS), 'b.ts', 'sample chart, no personal data')).toEqual([]);
  });
});
