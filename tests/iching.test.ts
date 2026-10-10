import { describe, expect, it } from 'vitest';
import { NAMES, WEIGHTS, castFromDraws, hexagramNumber, lineFromDraw, linesOf, randomDraws } from '../src/engines/iching/compute';

describe('King Wen table', () => {
  it('is a permutation of 1..64', () => {
    const seen = new Set<number>();
    for (let b = 0; b < 64; b++) seen.add(hexagramNumber([0, 1, 2, 3, 4, 5].map((i) => (b >> i) & 1)));
    expect(seen.size).toBe(64);
    expect(Math.min(...seen)).toBe(1);
    expect(Math.max(...seen)).toBe(64);
  });

  it('each pair (2k-1, 2k) is an inversion, or a complement when the figure is symmetric (independent structural check)', () => {
    const symmetric = [1, 27, 29, 61];
    for (let k = 1; k <= 63; k += 2) {
      const a = linesOf(k);
      const b = linesOf(k + 1);
      if (symmetric.includes(k)) expect(b, `pair ${k}`).toEqual(a.map((x) => 1 - x));
      else expect(b, `pair ${k}`).toEqual([...a].reverse());
    }
  });

  it('anchors: 1 all yang, 2 all yin, 11 Tai = earth over heaven, 63 Ji Ji alternates', () => {
    expect(linesOf(1)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(linesOf(2)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(linesOf(11)).toEqual([1, 1, 1, 0, 0, 0]);
    expect(linesOf(63)).toEqual([1, 0, 1, 0, 1, 0]);
    expect(NAMES.length).toBe(64);
    expect(NAMES[62]).toBe('Ji Ji');
  });
});

describe('casting', () => {
  it('weights sum to 16 and match the stated probabilities', () => {
    for (const m of ['threeCoins', 'yarrow'] as const) expect(Object.values(WEIGHTS[m]).reduce((a, b) => a + b)).toBe(16);
    const count = (m: 'threeCoins' | 'yarrow') => {
      const c: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
      for (let d = 0; d < 16; d++) c[lineFromDraw(d, m)]!++;
      return c;
    };
    expect(count('yarrow')).toEqual({ 6: 1, 7: 5, 8: 7, 9: 3 });
    expect(count('threeCoins')).toEqual({ 6: 2, 7: 6, 8: 6, 9: 2 });
  });

  it('changing lines produce the relating hexagram', () => {
    // all old yang (9) -> primary 1, relating 2, all six lines changing
    const r = castFromDraws([15, 15, 15, 15, 15, 15], 'threeCoins');
    expect(r.primary.number).toBe(1);
    expect(r.relating?.number).toBe(2);
    expect(r.changing).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('no changing lines -> no relating hexagram', () => {
    const r = castFromDraws([2, 2, 2, 2, 2, 2], 'threeCoins'); // all 7
    expect(r.primary.number).toBe(1);
    expect(r.relating).toBeNull();
  });

  it('same draws replay to the same cast', () => {
    const d = randomDraws();
    expect(castFromDraws(d, 'yarrow')).toEqual(castFromDraws(d, 'yarrow'));
  });

  it('rejects malformed draws', () => {
    expect(() => castFromDraws([1, 2, 3], 'yarrow')).toThrow();
    expect(() => castFromDraws([1, 2, 3, 4, 5, 16], 'yarrow')).toThrow();
  });
});
