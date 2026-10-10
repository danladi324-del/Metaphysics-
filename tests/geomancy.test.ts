import { describe, expect, it } from 'vitest';
import { add, computeGeomancy, FIGURES, mothersFromBits, nameOf, shield, type Figure } from '../src/engines/geomancy/compute';

const points = (f: Figure) => f.reduce((s, r) => s + r, 0);

describe('figures', () => {
  it('sixteen distinct figures covering every row pattern', () => {
    expect(new Set(FIGURES.map((f) => f.rows.join(''))).size).toBe(16);
    expect(new Set(FIGURES.map((f) => f.name)).size).toBe(16);
  });
  it('inversion pairs (independent structural check): exactly four figures are their own inversion', () => {
    const inv = (f: Figure) => nameOf([...f].reverse() as Figure);
    expect(FIGURES.filter((f) => inv(f.rows) === f.name).map((f) => f.name).sort()).toEqual(['Carcer', 'Conjunctio', 'Populus', 'Via']);
    expect(inv(FIGURES.find((f) => f.name === 'Puer')!.rows)).toBe('Puella');
    expect(inv(FIGURES.find((f) => f.name === 'Fortuna Major')!.rows)).toBe('Fortuna Minor');
    expect(inv(FIGURES.find((f) => f.name === 'Caput Draconis')!.rows)).toBe('Cauda Draconis');
    expect(inv(FIGURES.find((f) => f.name === 'Albus')!.rows)).toBe('Rubeus');
  });
  it('addition: Via + Via = Populus; X + Populus = X', () => {
    expect(nameOf(add([1, 1, 1, 1], [1, 1, 1, 1]))).toBe('Populus');
    for (const f of FIGURES) expect(nameOf(add(f.rows, [2, 2, 2, 2]))).toBe(f.name);
  });
});

describe('shield chart over all 65,536 sets of mothers', () => {
  it('the judge always has an even number of points, and the eight even figures each occur equally', () => {
    const counts = new Map<string, number>();
    for (let n = 0; n < 65536; n++) {
      const bits = Array.from({ length: 16 }, (_, i) => (n >> i) & 1);
      const s = shield(mothersFromBits(bits));
      expect(points(s.judge) % 2).toBe(0);
      const j = nameOf(s.judge);
      counts.set(j, (counts.get(j) ?? 0) + 1);
    }
    expect(counts.size).toBe(8);
    for (const v of counts.values()) expect(v).toBe(8192);
  });
});

describe('record', () => {
  it('replays from stored bits', () => {
    const a = computeGeomancy('q');
    const b = computeGeomancy('q', a.raw_result.bits);
    expect(b.raw_result).toEqual(a.raw_result);
    expect(a.raw_result.figures.length).toBe(16);
  });
  it('daughters are the mothers transposed', () => {
    const s = shield(mothersFromBits([1, 1, 1, 1, 2 - 2, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1]));
    expect(s.daughters[0]).toEqual([s.mothers[0]![0], s.mothers[1]![0], s.mothers[2]![0], s.mothers[3]![0]]);
  });
});
