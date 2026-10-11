import { beforeAll, describe, expect, it } from 'vitest';
import { annualCentre, computeFengShui, eightMansions, fly, flyingStar, group, kua, MOUNTAINS, mountainOf, periodOf, PALACES } from '../src/engines/fengshui/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { computeTzolkin, mayaDate, tzolkinDisagreements } from '../src/engines/tzolkin/compute';
import { DASHA, nakshatraOf, vedic } from '../src/engines/vedic/compute';
import { natalPositions } from '../src/engines/natal/compute';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { norm360, separation } from '../src/engines/natal/zodiac';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

describe("Tzolk'in (GMT 584283)", () => {
  it('2012-12-21 is 13.0.0.0.0 4 Ahau 3 Kankin', () => {
    const m = mayaDate(2012, 12, 21, 584283);
    expect(m.longCount).toEqual([13, 0, 0, 0, 0]);
    expect(m.tzolkin).toEqual({ number: 4, name: 'Ahau' });
    expect(m.haab).toEqual({ day: 3, month: 'Kankin' });
  });
  it('day count cycles: +260 days returns the same Tzolk\'in day, +365 the same Haab day', () => {
    const a = mayaDate(2000, 1, 1, 584283);
    const b = mayaDate(2000, 9, 17, 584283); // 260 days later
    expect(b.tzolkin).toEqual(a.tzolkin);
    const c = mayaDate(2000, 12, 31, 584283); // 365 days later (2000 is a leap year)
    expect(c.haab).toEqual(a.haab);
  });
  it('the 584285 correlation shifts the day by two and is logged', () => {
    const rec = computeTzolkin({ year: 1983, month: 12, day: 15 });
    const alt = rec.raw_result.alternatives[0]!;
    expect((DAY_INDEX(alt.tzolkin.name) - DAY_INDEX(rec.raw_result.chosen.tzolkin.name) + 20) % 20).toBe(18);
    expect(tzolkinDisagreements(rec, null).length).toBe(1);
  });
});
import { DAY_NAMES } from '../src/engines/tzolkin/compute';
const DAY_INDEX = (n: string) => DAY_NAMES.indexOf(n as (typeof DAY_NAMES)[number]);

describe('Vedic', () => {
  it('Lahiri ayanamsa at J2000 is about 23.85°', () => {
    const r = vedic(eph, { utcMs: Date.UTC(2000, 0, 1, 12), lat: 0, lon: 0 });
    expect(r.ayanamsa).toBeGreaterThan(23.84);
    expect(r.ayanamsa).toBeLessThan(23.87);
  });
  it('sidereal = tropical - ayanamsa for every graha (consistency with the natal engine)', () => {
    const inp = { utcMs: Date.UTC(1983, 11, 15, 9, 20), lat: 39.7392, lon: -104.9903 };
    const v = vedic(eph, inp);
    const t = natalPositions(eph, inp, DEFAULT_ASTRO).result;
    for (const [vid, tid] of [['Sun', 'sun'], ['Moon', 'moon'], ['Saturn', 'saturn'], ['Rahu', 'meanNode']]) {
      const sid = v.grahas.find((g) => g.id === vid)!.longitude;
      const trop = t.bodies.find((b) => b.id === tid)!.longitude;
      expect(separation(sid, norm360(trop - v.ayanamsa)), vid).toBeLessThan(0.001);
    }
  });
  it('nakshatra boundaries and padas', () => {
    expect(nakshatraOf(0)).toMatchObject({ name: 'Ashwini', pada: 1 });
    expect(nakshatraOf(13.3333)).toMatchObject({ name: 'Ashwini', pada: 4 });
    expect(nakshatraOf(13.3334)).toMatchObject({ name: 'Bharani', pada: 1 });
    expect(nakshatraOf(359.99)).toMatchObject({ name: 'Revati', pada: 4 });
  });
  it('Vimshottari: 120 years; nine dashas from birth cover 120 years minus the elapsed part of the first', () => {
    expect(DASHA.reduce((s, [, y]) => s + y, 0)).toBe(120);
    const inp = { utcMs: Date.UTC(1983, 11, 15, 9, 20), lat: 39.7392, lon: -104.9903 };
    const r = vedic(eph, inp);
    const yearMs = 365.25 * 86_400_000;
    expect(r.dashas[0]!.startMs).toBeLessThanOrEqual(inp.utcMs);
    expect(r.dashas[0]!.endMs).toBeGreaterThan(inp.utcMs);
    expect(Math.round((r.dashas[9]!.startMs - r.dashas[0]!.startMs) / yearMs)).toBe(120);
    expect(r.dashas[0]!.lord).toBe(r.moonNakshatra.lord);
  });
});

describe('Feng Shui: 24 mountains', () => {
  it('cover 360° in 15° steps starting at Ren 337.5°', () => {
    expect(MOUNTAINS.length).toBe(24);
    expect(mountainOf(0).name).toBe('Zi');
    expect(mountainOf(337.5).name).toBe('Ren');
    expect(mountainOf(352.49).name).toBe('Ren');
    expect(mountainOf(180).name).toBe('Wu');
    expect(mountainOf(45).name).toBe('Gen');
  });
  it('polarity: cardinal palaces + - -, intercardinal - + +', () => {
    expect(MOUNTAINS.filter((m) => m.palace === 'N').map((m) => m.yang)).toEqual([true, false, false]);
    expect(MOUNTAINS.filter((m) => m.palace === 'NE').map((m) => m.yang)).toEqual([false, true, true]);
    expect(MOUNTAINS.filter((m) => m.yang).length).toBe(12);
  });
});

describe('Flying Star', () => {
  it('a period chart flies forward along the Lo Shu path', () => {
    expect(fly(5, true)).toEqual({ C: 5, NW: 6, W: 7, NE: 8, S: 9, N: 1, SW: 2, E: 3, SE: 4 }); // the Lo Shu itself
  });
  it('Period 8, sitting Zi facing Wu: double 8 at the facing (recalled published chart; verify with a reference app)', () => {
    const c = flyingStar(180, 8);
    expect(c.facing.name).toBe('Wu');
    expect(c.sitting.name).toBe('Zi');
    expect(c.mountain.S).toBe(8);
    expect(c.water.S).toBe(8);
    expect(c.mountainForward).toBe(true);
    expect(c.waterForward).toBe(false);
  });
  it('periods and annual stars', () => {
    expect(periodOf(2026)).toBe(9);
    expect(periodOf(2023)).toBe(8);
    expect(periodOf(2004)).toBe(8);
    expect(periodOf(1983)).toBe(6); // 1964-1983
    expect([2024, 2025, 2026, 2027].map(annualCentre)).toEqual([3, 2, 1, 9]);
  });
  it('flags facings near a mountain edge', () => {
    expect(flyingStar(180, 9).nearBoundary).toBe(false);
    expect(flyingStar(172.8, 9).nearBoundary).toBe(true);
  });
});

describe('Eight Mansions', () => {
  it('Kua: 1983 male 8, female 7; 2000 male 9, female 6; 5 becomes 2 or 8', () => {
    expect(kua(1983, 'male')).toBe(8);
    expect(kua(1983, 'female')).toBe(7);
    expect(kua(2000, 'male')).toBe(9);
    expect(kua(2000, 'female')).toBe(6);
    expect(kua(1977, 'male')).toBe(2); // 10 - 5 = 5 -> 2
    expect(kua(1977, 'female')).toBe(1); // 5 + 5 = 10 -> 1
  });

  // Table typed from the standard Eight Mansions chart, independent of the line-change rule used in code.
  const TABLE: Record<number, Record<string, string>> = {
    1: { 'Sheng Qi': 'SE', 'Tian Yi': 'E', 'Yan Nian': 'S', 'Fu Wei': 'N', 'Huo Hai': 'W', 'Wu Gui': 'NE', 'Liu Sha': 'NW', 'Jue Ming': 'SW' },
    2: { 'Sheng Qi': 'NE', 'Tian Yi': 'W', 'Yan Nian': 'NW', 'Fu Wei': 'SW', 'Huo Hai': 'E', 'Wu Gui': 'SE', 'Liu Sha': 'S', 'Jue Ming': 'N' },
    3: { 'Sheng Qi': 'S', 'Tian Yi': 'N', 'Yan Nian': 'SE', 'Fu Wei': 'E', 'Huo Hai': 'SW', 'Wu Gui': 'NW', 'Liu Sha': 'NE', 'Jue Ming': 'W' },
    4: { 'Sheng Qi': 'N', 'Tian Yi': 'S', 'Yan Nian': 'E', 'Fu Wei': 'SE', 'Huo Hai': 'NW', 'Wu Gui': 'SW', 'Liu Sha': 'W', 'Jue Ming': 'NE' },
    6: { 'Sheng Qi': 'W', 'Tian Yi': 'NE', 'Yan Nian': 'SW', 'Fu Wei': 'NW', 'Huo Hai': 'SE', 'Wu Gui': 'E', 'Liu Sha': 'N', 'Jue Ming': 'S' },
    7: { 'Sheng Qi': 'NW', 'Tian Yi': 'SW', 'Yan Nian': 'NE', 'Fu Wei': 'W', 'Huo Hai': 'N', 'Wu Gui': 'S', 'Liu Sha': 'SE', 'Jue Ming': 'E' },
    8: { 'Sheng Qi': 'SW', 'Tian Yi': 'NW', 'Yan Nian': 'W', 'Fu Wei': 'NE', 'Huo Hai': 'S', 'Wu Gui': 'N', 'Liu Sha': 'E', 'Jue Ming': 'SE' },
    9: { 'Sheng Qi': 'E', 'Tian Yi': 'SE', 'Yan Nian': 'N', 'Fu Wei': 'S', 'Huo Hai': 'NE', 'Wu Gui': 'W', 'Liu Sha': 'SW', 'Jue Ming': 'NW' }
  };
  it('line-change rule reproduces the standard table for all eight Kua', () => {
    for (const k of [1, 2, 3, 4, 6, 7, 8, 9]) {
      const got = Object.fromEntries(eightMansions(k).map((x) => [x.star, x.palace]));
      expect(got, `Kua ${k}`).toEqual(TABLE[k]);
      expect(new Set(Object.values(got)).size).toBe(8);
    }
  });
  it('East group good directions are N, S, E, SE; West group NE, SW, W, NW', () => {
    for (const k of [1, 2, 3, 4, 6, 7, 8, 9]) {
      const good = eightMansions(k).filter((x) => x.good).map((x) => x.palace).sort();
      expect(good).toEqual(group(k) === 'East' ? ['E', 'N', 'S', 'SE'] : ['NE', 'NW', 'SW', 'W']);
    }
    expect(PALACES.length).toBe(8);
  });
});

describe('Feng Shui record', () => {
  it('true bearing = magnetic + declination, and both are stored', () => {
    const r = computeFengShui({ bearing: 180, north: 'magnetic', lat: 39.7392, lon: -104.9903, dateMs: Date.UTC(2026, 9, 10), builtYear: 2010, birthSolarYear: 1983, currentSolarYear: 2026 }).raw_result;
    expect(r.magneticBearing).toBe(180);
    expect(r.trueBearing).toBeCloseTo(180 + r.declination.degrees, 1);
    expect(r.declination.model).toMatch(/WMM/);
    expect(r.declination.degrees).toBeGreaterThan(5); // Denver: about 7.5° east
    expect(r.declination.degrees).toBeLessThan(10);
    expect(r.flyingStar.period).toBe(8);
    expect(r.annual.C).toBe(1);
    expect(r.kua).toEqual({ male: 8, female: 7, solarYear: 1983 });
  });
});
