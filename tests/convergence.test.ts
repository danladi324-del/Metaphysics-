import { describe, expect, it } from 'vitest';
import { chanceWords, convergence, groupSources, simulateChance } from '../src/composer/convergence';

const DAILY = [
  { engine: 'numerology', deps: ['birth.date', 'date'], themes: ['completion'] },
  { engine: 'tzolkin', deps: ['birth.date', 'date'], themes: ['completion', 'rest'] },
  { engine: 'moon', deps: ['date', 'ephemeris.swiss'], themes: [] },
  { engine: 'planetaryHours', deps: ['date', 'place', 'ephemeris.astronomy-engine'], themes: ['effort'] },
  { engine: 'iching', deps: ['random'], themes: ['completion', 'return'] },
  { engine: 'tarot', deps: ['random'], themes: ['change'] }
];

describe('independence grouping', () => {
  it('birth-based engines are one source, sky-based one source, each random draw its own', () => {
    const t = groupSources(DAILY);
    expect(t.map((r) => r.engines)).toEqual([['numerology', 'tzolkin'], ['moon', 'planetaryHours'], ['iching'], ['tarot']]);
    expect(t[0]!.sharedInputs).toEqual(['birth data']);
  });
  it('an engine with both birth and sky inputs merges those groups (transitively)', () => {
    const t = groupSources([...DAILY, { engine: 'transits', deps: ['birth.datetime', 'ephemeris.swiss'], themes: [] }]);
    expect(t.find((r) => r.engines.includes('numerology'))!.engines).toContain('moon');
  });
});

describe('chance baseline (simulation vs exact)', () => {
  it('two sources, one theme each, vocabulary 4: exactly 1/4', () => {
    expect(simulateChance([1, 1], 4, 2, 40_000)).toBeCloseTo(0.25, 2);
  });
  it('three sources, one theme each, vocabulary 5: 1 - 60/125 = 0.52', () => {
    expect(simulateChance([1, 1, 1], 5, 2, 40_000)).toBeCloseTo(0.52, 2);
  });
  it('two sources with 2 and 3 themes from 10: 1 - C(8,3)/C(10,3) = 1 - 56/120', () => {
    expect(simulateChance([2, 3], 10, 2, 40_000)).toBeCloseTo(1 - 56 / 120, 2);
  });
  it('is deterministic for a seed', () => {
    expect(simulateChance([2, 1, 3], 12, 2, 5000, 7)).toBe(simulateChance([2, 1, 3], 12, 2, 5000, 7));
  });
});

describe('convergence', () => {
  it('computes: 3 engines point at "completion" but 2 share birth data -> 2 independent sources, with a chance rate', () => {
    const c = convergence(DAILY, 12);
    expect(c.kind).toBe('computed');
    if (c.kind !== 'computed') return;
    expect(c.theme).toBe('completion');
    expect(c.enginesPointing).toBe(3);
    expect(c.observed).toBe(2);
    expect(c.independentSources).toBe(4);
    expect(c.chanceRate).toBeGreaterThan(0);
    expect(c.chanceRate).toBeLessThan(1);
    expect(c.table.length).toBe(4);
  });
  it('blocked when fewer than two independent sources carry approved themes', () => {
    const c = convergence(DAILY.map((d) => (d.engine === 'numerology' || d.engine === 'tzolkin' ? d : { ...d, themes: [] })), 12);
    expect(c.kind).toBe('blocked');
  });
  it('blocked with a vocabulary under two', () => {
    expect(convergence(DAILY, 1).kind).toBe('blocked');
  });
  it('no shared theme -> none, still with the chance of any overlap', () => {
    const c = convergence([
      { engine: 'a', deps: ['random'], themes: ['x'] },
      { engine: 'b', deps: ['random'], themes: ['y'] }
    ], 10);
    expect(c.kind).toBe('none');
    if (c.kind === 'none') expect(c.chanceRate).toBeCloseTo(0.1, 1);
  });
  it('wording never says zero', () => {
    expect(chanceWords(0.0004)).toBe('under 1 in 100');
    expect(chanceWords(0.43)).toBe('about 4 in 10');
    expect(chanceWords(0.03)).toBe('about 3 in 100');
    expect(chanceWords(1)).toBe('near certain');
  });
});

import type { Convergence } from '../src/composer/convergence';
import { seeded } from '../src/composer/convergence';

describe('P6 acceptance: no convergence without its chance rate', () => {
  it('every computed or none result carries a chance rate in (0, 1] (200 random days)', () => {
    const rnd = seeded(99);
    const vocab = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let d = 0; d < 200; d++) {
      const items = ['numerology', 'moon', 'tarot', 'iching', 'tzolkin'].map((engine) => ({
        engine,
        deps: engine === 'tarot' || engine === 'iching' ? ['random'] : engine === 'moon' ? ['ephemeris.swiss'] : ['birth.date'],
        themes: vocab.filter(() => rnd() < 0.25)
      }));
      const c = convergence(items, vocab.length, d, 2000);
      if (c.kind !== 'blocked') {
        expect(Number.isFinite(c.chanceRate)).toBe(true);
        expect(c.chanceRate).toBeGreaterThan(0);
        expect(c.chanceRate).toBeLessThanOrEqual(1);
      }
    }
  });

  it('the type refuses a computed convergence without chanceRate', () => {
    // @ts-expect-error chanceRate is required
    const bad: Convergence = { kind: 'computed', table: [], theme: 'x', observed: 2, enginesPointing: 2, independentSources: 2, vocabulary: 4, trials: 1, verdict: 'consistent with chance' };
    expect(bad.kind).toBe('computed');
  });
});
