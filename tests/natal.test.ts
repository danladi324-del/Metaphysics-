import * as Astronomy from 'astronomy-engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { sameResult, validateRecord } from '../src/core/record';
import { BODY_ORDER, computeNatal, natalDisagreements, natalPositions } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { formatLongitude, separation } from '../src/engines/natal/zodiac';
import { nodeEphemeris } from './helpers/ephemeris';

// Eric: 1974-03-24 11:15 CDT (UTC-5), Bossier City LA (GeoNames 32.5160 N, 93.7321 W).
const ERIC = { utcMs: Date.UTC(1974, 2, 24, 16, 15), lat: 32.516, lon: -93.7321 };
const FIXED_NOW = new Date('2026-10-10T00:00:00Z');

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

const D2R = Math.PI / 180;
const norm = (x: number) => ((x % 360) + 360) % 360;

/** Independent textbook ascendant/MC/Placidus, from astronomy-engine sidereal time and obliquity. */
function independentHouses(utcMs: number, lat: number, lon: number) {
  const t = Astronomy.MakeTime(new Date(utcMs));
  const eps = Astronomy.e_tilt(t).tobl * D2R;
  const ramc = norm(Astronomy.SiderealTime(t) * 15 + lon) * D2R;
  const phi = lat * D2R;
  const asc = norm(Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) / D2R);
  const mc = norm(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) / D2R);
  const lonOfRa = (ra: number) => norm(Math.atan2(Math.sin(ra), Math.cos(ra) * Math.cos(eps)) / D2R);
  const placidus = (frac: number, above: boolean) => {
    let ra = ramc + (above ? frac * Math.PI / 2 : Math.PI - frac * Math.PI / 2);
    for (let i = 0; i < 100; i++) {
      const l = lonOfRa(ra) * D2R;
      const dec = Math.asin(Math.sin(eps) * Math.sin(l));
      const ad = Math.asin(Math.tan(phi) * Math.tan(dec));
      const next = above ? ramc + frac * (Math.PI / 2 + ad) : ramc + Math.PI - frac * (Math.PI / 2 - ad);
      if (Math.abs(next - ra) < 1e-12) break;
      ra = next;
    }
    return lonOfRa(ra);
  };
  return { asc, mc, c11: placidus(1 / 3, true), c12: placidus(2 / 3, true), c2: placidus(2 / 3, false), c3: placidus(1 / 3, false) };
}

describe('natal chart: Eric', () => {
  it('produces a valid, deterministic record', () => {
    const a = computeNatal(eph, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    const b = computeNatal(eph, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    expect(validateRecord(a)).toEqual([]);
    expect(sameResult(a, b)).toBe(true);
    expect(a.raw_result.bodies.map((x) => x.id)).toEqual([...BODY_ORDER]);
    expect(a.limitations).toEqual([]);
  });

  it('matches the values first seen in the prior-art probe', () => {
    const { result } = natalPositions(eph, ERIC, DEFAULT_ASTRO);
    const fmt = (id: string) => formatLongitude(result.bodies.find((b) => b.id === id)!.longitude);
    expect(fmt('sun')).toBe('3°38′ Aries');
    expect(fmt('moon')).toBe('13°02′ Aries');
    expect(fmt('chiron')).toBe('19°21′ Aries');
    expect(formatLongitude(result.angles.asc)).toBe('18°26′ Gemini');
    expect(formatLongitude(result.angles.mc)).toBe('29°40′ Aquarius');
  });

  it('Sun..Pluto agree with astronomy-engine (independent code) within 0.005°', () => {
    const { result } = natalPositions(eph, ERIC, DEFAULT_ASTRO);
    const date = new Date(ERIC.utcMs);
    const bodies: [string, Astronomy.Body][] = [
      ['sun', Astronomy.Body.Sun], ['moon', Astronomy.Body.Moon], ['mercury', Astronomy.Body.Mercury], ['venus', Astronomy.Body.Venus],
      ['mars', Astronomy.Body.Mars], ['jupiter', Astronomy.Body.Jupiter], ['saturn', Astronomy.Body.Saturn], ['uranus', Astronomy.Body.Uranus],
      ['neptune', Astronomy.Body.Neptune], ['pluto', Astronomy.Body.Pluto]
    ];
    for (const [id, body] of bodies) {
      const ref = Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
      const ours = result.bodies.find((b) => b.id === id)!.longitude;
      expect(separation(ref, ours), id).toBeLessThan(0.005);
    }
  });

  it('ascendant, MC and Placidus cusps agree with an independent textbook implementation within 0.01°', () => {
    const { result } = natalPositions(eph, ERIC, DEFAULT_ASTRO);
    const ref = independentHouses(ERIC.utcMs, ERIC.lat, ERIC.lon);
    const c = result.houses.placidus!.cusps;
    expect(separation(result.angles.asc, ref.asc)).toBeLessThan(0.01);
    expect(separation(result.angles.mc, ref.mc)).toBeLessThan(0.01);
    expect(separation(c[0]!, ref.asc)).toBeLessThan(0.01);
    expect(separation(c[9]!, ref.mc)).toBeLessThan(0.01);
    expect(separation(c[10]!, ref.c11)).toBeLessThan(0.01);
    expect(separation(c[11]!, ref.c12)).toBeLessThan(0.01);
    expect(separation(c[1]!, ref.c2)).toBeLessThan(0.01);
    expect(separation(c[2]!, ref.c3)).toBeLessThan(0.01);
  });

  it('whole sign houses start at 0° of the rising sign', () => {
    const { result } = natalPositions(eph, ERIC, DEFAULT_ASTRO);
    expect(result.houses.wholeSign!.cusps).toEqual([60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30]);
  });

  it('writes a disagreement row for every body whose house changes between systems', () => {
    const rec = computeNatal(eph, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    const rows = natalDisagreements(rec, 'p1');
    const changed = rec.raw_result.bodies.filter((b) => b.houses.placidus !== b.houses.wholeSign);
    expect(rows.filter((r) => r.cause === 'convention: house system').length).toBe(changed.length);
    for (const r of rows) expect(r.result_a).not.toBe(r.result_b);
  });
});

describe('natal chart: boundaries', () => {
  it('polar latitude flags the Placidus fallback instead of hiding it', () => {
    const rec = computeNatal(eph, { utcMs: Date.UTC(1990, 5, 1, 12), lat: 70, lon: 25 }, DEFAULT_ASTRO, undefined, FIXED_NOW);
    expect(rec.raw_result.houses.placidus!.fallback).toBe('porphyry');
    expect(rec.limitations.join(' ')).toMatch(/Placidus is undefined/);
    expect(natalDisagreements(rec, null).some((d) => d.cause === 'limitation: polar latitude')).toBe(true);
  });

  it('without the asteroid file, Chiron is omitted and the limitation says so', async () => {
    const bare = await nodeEphemeris(false);
    const rec = computeNatal(bare, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    expect(rec.raw_result.bodies.some((b) => b.id === 'chiron')).toBe(false);
    expect(rec.limitations[0]).toMatch(/Chiron not computed/);
  });

  it('a body at 29°59.9′ never displays as 30°', () => {
    expect(formatLongitude(29.9999)).toBe('29°59′ Aries');
  });

  it('old dates compute (1850, LMT era) and the record keeps the UTC instant it ran on', () => {
    const rec = computeNatal(eph, { utcMs: Date.UTC(1850, 0, 1, 17, 50, 36), lat: 32.516, lon: -93.7321 }, DEFAULT_ASTRO, undefined, FIXED_NOW);
    expect(rec.raw_result.bodies.length).toBe(BODY_ORDER.length);
    expect(rec.inputs.utcMs).toBe(Date.UTC(1850, 0, 1, 17, 50, 36));
  });
});

import { computeReturn, computeTransits, findReturn } from '../src/engines/natal/transits';

describe('transits and returns', () => {
  it('solar return lands where the Sun is back at its natal longitude, within a day of the birthday', () => {
    const natal = computeNatal(eph, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    const ret = computeReturn(eph, natal, 'sun', Date.UTC(2026, 0, 1), FIXED_NOW);
    const sunThen = natalPositions(eph, { ...ERIC, utcMs: ret.raw_result.utcMs }, DEFAULT_ASTRO).result.bodies[0]!.longitude;
    expect(separation(sunThen, ret.raw_result.targetLongitude)).toBeLessThan(1e-5);
    const d = new Date(ret.raw_result.utcMs);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(2);
    expect(Math.abs(d.getUTCDate() - 24)).toBeLessThanOrEqual(1);
  });

  it('lunar return falls within 27.4 days of the start', () => {
    const from = Date.UTC(2026, 9, 10);
    const t = findReturn(eph, 'moon', 13.04, from);
    expect(t).toBeGreaterThanOrEqual(from);
    expect(t - from).toBeLessThan(27.4 * 86_400_000);
  });

  it('a transit on the birth instant shows every body conjunct itself at orb 0', () => {
    const natal = computeNatal(eph, ERIC, DEFAULT_ASTRO, undefined, FIXED_NOW);
    const tr = computeTransits(eph, natal, ERIC.utcMs, DEFAULT_ASTRO, undefined, FIXED_NOW);
    for (const id of ['sun', 'moon', 'saturn', 'chiron']) {
      expect(tr.raw_result.aspects.some((a) => a.transiting === id && a.natal === id && a.type === 'conjunction' && a.orb === 0)).toBe(true);
    }
  });
});
