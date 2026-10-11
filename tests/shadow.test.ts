import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { computeNatal } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { ASSERTIVE, cardPrompts, PROMPT_TEMPLATES, promptsFor, shadowPointers } from '../src/engines/shadow/pointers';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

describe('shadow pointers', () => {
  it("R1: Saturn, Pluto, Chiron, Lilith, nodes, and Mars in the 12th under Placidus only", () => {
    const rec = computeNatal(eph, { utcMs: Date.UTC(1974, 2, 24, 16, 15), lat: 32.516, lon: -93.7321 }, DEFAULT_ASTRO);
    const p = shadowPointers(rec, DEFAULT_ASTRO, true);
    expect(p.map((x) => x.id)).toEqual(['saturn', 'pluto', 'chiron', 'lilith', 'node', 'southnode', 'house12.mars']);
    const mars = p.find((x) => x.id === 'house12.mars')!;
    expect(mars.split).toBe('In the 12th under Placidus only.');
    expect(p.find((x) => x.id === 'saturn')!.fact).toMatch(/^Saturn 28°21′ Gemini, house 1/);
  });
  it('time unknown: no houses and no 12th-house pointers', () => {
    const rec = computeNatal(eph, { utcMs: Date.UTC(1974, 2, 24, 18), lat: 32.516, lon: -93.7321, timeKnown: false }, DEFAULT_ASTRO);
    const p = shadowPointers(rec, DEFAULT_ASTRO, false);
    expect(p.some((x) => x.id.startsWith('house12'))).toBe(false);
    expect(p.every((x) => !/house \d/.test(x.fact))).toBe(true);
  });
});

describe('shadow prompts never assert', () => {
  it('every template is a question and contains no assertive phrasing', () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(t.text.trim().endsWith('.') || t.text.includes('?')).toBe(true);
      expect(t.text).toMatch(/\?/);
      expect(ASSERTIVE.test(t.text), t.id).toBe(false);
    }
  });
  it('filled prompts stay non-assertive', () => {
    for (const q of [...promptsFor({ id: 'saturn', title: 'Saturn', fact: 'Saturn 28°21′ Gemini.', keys: [], split: null }), ...cardPrompts('The Tower', true)]) {
      expect(ASSERTIVE.test(q.text)).toBe(false);
    }
  });
});
