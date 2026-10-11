import * as Astronomy from 'astronomy-engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { localDateIn } from '../src/core/time';
import { biorhythm, computeBiorhythm } from '../src/engines/biorhythm/compute';
import { CHALDEAN_ORDER, DAY_RULER, planetaryHours } from '../src/engines/hours/compute';
import { moon, phaseName } from '../src/engines/moon/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

describe('moon', () => {
  it('finds the 2024-04-08 new moon (eclipse) and 2024-04-23 full moon within 2 minutes', () => {
    const r = moon(eph, Date.UTC(2024, 3, 1));
    const nm = r.next.find((x) => x.name === 'New moon')!;
    const fm = r.next.find((x) => x.name === 'Full moon')!;
    expect(Math.abs(nm.utcMs - Date.UTC(2024, 3, 8, 18, 21))).toBeLessThan(2 * 60_000);
    expect(Math.abs(fm.utcMs - Date.UTC(2024, 3, 23, 23, 49))).toBeLessThan(2 * 60_000);
  });

  it('principal phases agree with astronomy-engine SearchMoonPhase within 1 minute across a year', () => {
    let t = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 12; i++) {
      const r = moon(eph, t);
      for (const p of r.next) {
        const target = { 'New moon': 0, 'First quarter': 90, 'Full moon': 180, 'Last quarter': 270 }[p.name];
        const ref = Astronomy.SearchMoonPhase(target, new Date(t), 40)!.date.getTime();
        expect(Math.abs(p.utcMs - ref), `${p.name} after ${new Date(t).toISOString()}`).toBeLessThan(60_000);
      }
      t += 30 * 86_400_000;
    }
  });

  it('phase bins', () => {
    expect(phaseName(0)).toBe('New moon');
    expect(phaseName(350)).toBe('New moon');
    expect(phaseName(22.4)).toBe('New moon');
    expect(phaseName(22.6)).toBe('Waxing crescent');
    expect(phaseName(180)).toBe('Full moon');
    expect(phaseName(270)).toBe('Last quarter');
    expect(phaseName(300)).toBe('Waning crescent');
    expect(phaseName(330)).toBe('Waning crescent');
  });

  it('illumination is ~1 at full and ~0 at new', () => {
    const r = moon(eph, Date.UTC(2024, 3, 23, 23, 49));
    expect(r.illumination).toBeGreaterThan(0.999);
    expect(moon(eph, Date.UTC(2024, 3, 8, 18, 21)).illumination).toBeLessThan(0.001);
  });
});

/** NOAA general solar position sunrise, an independent approximation good to ~1-2 minutes. */
function noaaSunriseUtcMs(y: number, m: number, d: number, lat: number, lon: number): number {
  const doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  const g = ((2 * Math.PI) / 365) * (doy - 1);
  const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const r = Math.PI / 180;
  const ha = Math.acos(Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(decl)) - Math.tan(lat * r) * Math.tan(decl)) / r;
  const minutes = 720 - 4 * (lon + ha) - eqt;
  return Date.UTC(y, m - 1, d) + minutes * 60_000;
}

const weekday = (ms: number) => {
  const l = localDateIn('America/Chicago', ms);
  return new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
};

describe('planetary hours (R1 place)', () => {
  const lat = 32.516;
  const lon = -93.7321;

  it('sunrise agrees with an independent NOAA formula within 3 minutes', () => {
    const r = planetaryHours(Date.UTC(2026, 9, 10, 18), lat, lon, weekday);
    expect(Math.abs(r.sunrise - noaaSunriseUtcMs(2026, 10, 10, lat, lon))).toBeLessThan(3 * 60_000);
  });

  it('Saturday 2026-10-10 at local noon: Saturn day, first hour Saturn, hours follow the Chaldean order', () => {
    const r = planetaryHours(Date.UTC(2026, 9, 10, 17), lat, lon, weekday);
    expect(r.planetaryDay.sunrise).toBe('Saturn');
    expect(r.hours[0]!.ruler).toBe('Saturn');
    expect(r.hours[1]!.ruler).toBe('Jupiter');
    expect(r.hours[7]!.ruler).toBe('Saturn');
    expect(r.hours.length).toBe(24);
    expect(r.hours[11]!.endMs).toBe(Math.round(r.sunset));
  });

  it('the hour after the 24th is the next weekday ruler (structural property of the order)', () => {
    for (let d = 0; d < 7; d++) {
      const start = CHALDEAN_ORDER.indexOf(DAY_RULER[d]!);
      expect(CHALDEAN_ORDER[(start + 24) % 7]).toBe(DAY_RULER[(d + 1) % 7]);
    }
  });

  it('3 a.m. Saturday: sunrise convention says Friday (Venus), midnight convention says Saturn', () => {
    const r = planetaryHours(Date.UTC(2026, 9, 10, 8), lat, lon, weekday); // 03:00 CDT
    expect(r.planetaryDay.sunrise).toBe('Venus');
    expect(r.planetaryDay.midnight).toBe('Saturn');
    expect(r.current?.index).toBeGreaterThan(12); // a night hour of Friday
  });

  it('polar night: no sunrise is an explicit error, not a wrong answer', () => {
    expect(() => planetaryHours(Date.UTC(2026, 11, 21, 12), 78.2, 15.6, () => 1)).toThrow(/undefined/);
  });
});

describe('biorhythm', () => {
  it('day 0 is zero on all cycles; quarter-cycle peaks', () => {
    const b = { year: 2000, month: 1, day: 1 };
    expect(biorhythm(b, b).values).toEqual({ physical: 0, emotional: 0, intellectual: 0 });
    expect(biorhythm(b, { year: 2000, month: 1, day: 8 }).values.emotional).toBe(1); // 7/28 = quarter
  });
  it("R1 on 2026-10-10: 19193 days lived", () => {
    const r = biorhythm({ year: 1974, month: 3, day: 24 }, { year: 2026, month: 10, day: 10 });
    expect(r.daysLived).toBe(19193);
    // 19193 mod 23 = 11, mod 28 = 13, mod 33 = 20
    expect(r.values.physical).toBeCloseTo(Math.sin((2 * Math.PI * 11) / 23), 6);
    expect(r.values.emotional).toBeCloseTo(Math.sin((2 * Math.PI * 13) / 28), 6);
    expect(r.values.intellectual).toBeCloseTo(Math.sin((2 * Math.PI * 20) / 33), 6);
  });
  it('carries the not-validated limitation', () => {
    expect(computeBiorhythm({ year: 2000, month: 1, day: 1 }, { year: 2000, month: 1, day: 2 }).limitations[0]).toMatch(/not validated/);
  });
});
