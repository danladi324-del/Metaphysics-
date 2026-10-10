import { beforeAll, describe, expect, it } from 'vitest';
import { canonicalJson } from '../src/core/canonical';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { validateRecord } from '../src/core/record';
import { computeBazi } from '../src/engines/bazi/compute';
import { computeBiorhythm } from '../src/engines/biorhythm/compute';
import { computeFengShui } from '../src/engines/fengshui/compute';
import { computeHours } from '../src/engines/hours/compute';
import { computeMoon } from '../src/engines/moon/compute';
import { computeNatal } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { computeNumerology } from '../src/engines/numerology/compute';
import { computeTzolkin } from '../src/engines/tzolkin/compute';
import { computeVedic } from '../src/engines/vedic/compute';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

const JUNK: unknown[] = [NaN, Infinity, -Infinity, undefined, null, '12', 1e20, -1e20, 91, -181, 0.5];

describe('engines refuse malformed input', () => {
  it('natal: NaN time, out-of-range latitude/longitude, far-future dates', () => {
    expect(() => computeNatal(eph, { utcMs: NaN, lat: 0, lon: 0 }, DEFAULT_ASTRO)).toThrow(/valid instant/);
    expect(() => computeNatal(eph, { utcMs: 0, lat: 95, lon: 0 }, DEFAULT_ASTRO)).toThrow(/latitude/);
    expect(() => computeNatal(eph, { utcMs: 0, lat: 0, lon: 200 }, DEFAULT_ASTRO)).toThrow(/longitude/);
    expect(() => computeNatal(eph, { utcMs: Date.UTC(5000, 0, 1), lat: 0, lon: 0 }, DEFAULT_ASTRO)).toThrow(/range/);
  });
  it('dates that do not exist', () => {
    expect(() => computeBiorhythm({ year: 2001, month: 2, day: 29 }, { year: 2026, month: 1, day: 1 })).toThrow(/no such date/);
    expect(() => computeNumerology({ name: 'A', year: 2000, month: 13, day: 1 })).toThrow(/no such date/);
    expect(() => computeTzolkin({ year: 2000, month: 4, day: 31 })).toThrow(/no such date/);
  });
  it('feng shui bearing and building year', () => {
    const base = { bearing: 10, north: 'true' as const, lat: 0, lon: 0, dateMs: Date.UTC(2026, 0, 1), builtYear: 2010, birthSolarYear: 1974, currentSolarYear: 2026 };
    expect(() => computeFengShui({ ...base, bearing: 360 })).toThrow(/bearing/);
    expect(() => computeFengShui({ ...base, bearing: NaN })).toThrow(/bearing/);
    expect(() => computeFengShui({ ...base, builtYear: 1700 })).toThrow(/building year/);
  });
});

describe('fuzz: junk never produces NaN or an invalid record', () => {
  const check = (make: () => { raw_result: unknown }) => {
    let rec;
    try {
      rec = make();
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      return;
    }
    expect(validateRecord(rec)).toEqual([]);
    expect(() => canonicalJson(rec.raw_result)).not.toThrow(); // throws on any NaN or Infinity
  };
  it('all engines over junk values', () => {
    for (const a of JUNK) {
      for (const b of JUNK) {
        check(() => computeNatal(eph, { utcMs: a as number, lat: b as number, lon: 0 }, DEFAULT_ASTRO));
        check(() => computeBazi(eph, { utcMs: a as number, zone: 'UTC', lat: b as number, lon: 0 }));
        check(() => computeVedic(eph, { utcMs: a as number, lat: b as number, lon: 0 }));
        check(() => computeMoon(eph, a as number));
        check(() => computeHours(a as number, b as number, 0, () => 0));
        check(() => computeBiorhythm({ year: a as number, month: 1, day: 1 }, { year: 2026, month: b as number, day: 1 }));
        check(() => computeFengShui({ bearing: a as number, north: 'magnetic', lat: b as number, lon: 0, dateMs: Date.UTC(2026, 0, 1), builtYear: 2010, birthSolarYear: 1974, currentSolarYear: 2026 }));
      }
    }
  });
});
