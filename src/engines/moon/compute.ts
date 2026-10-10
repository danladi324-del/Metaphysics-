import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { julianDayUT, utcMsFromJulianDay } from '../../core/time';
import { BODY, FLAG, type Ephemeris } from '../natal/ephemeris';
import { norm360, signOf } from '../natal/zodiac';

export const MOON: EngineDescriptor = {
  engine: 'moon',
  version: '0.1.0',
  input_dependencies: ['date', 'ephemeris.swiss']
};

export const PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'] as const;
export type PhaseName = (typeof PHASES)[number];

/** 45° bins centred on the principal phases: New = 337.5°-22.5° elongation. A convention. */
export function phaseName(elongation: number): PhaseName {
  return PHASES[Math.floor(norm360(elongation + 22.5) / 45) % 8]!;
}

export interface MoonResult {
  elongation: number; // Moon minus Sun ecliptic longitude, 0..360
  illumination: number; // 0..1, from elongation (ignores lunar latitude)
  phase: PhaseName;
  moonLongitude: number;
  moonSign: string;
  next: { name: 'New moon' | 'First quarter' | 'Full moon' | 'Last quarter'; utcMs: number }[];
}

function elongationAt(eph: Ephemeris, jd: number): { e: number; rate: number; moon: number } {
  const s = eph.position(jd, BODY.sun, FLAG.moshier | FLAG.speed);
  const m = eph.position(jd, BODY.moon, FLAG.moshier | FLAG.speed);
  return { e: norm360(m.longitude - s.longitude), rate: m.speed - s.speed, moon: m.longitude };
}

/** Next instant after jd when elongation equals target. */
export function nextElongation(eph: Ephemeris, jd0: number, target: number): number {
  const first = elongationAt(eph, jd0);
  let jd = jd0 + norm360(target - first.e) / 12.19;
  for (let i = 0; i < 30; i++) {
    const { e, rate } = elongationAt(eph, jd);
    let d = norm360(target - e);
    if (d > 180) d -= 360;
    jd += d / rate;
    if (Math.abs(d) < 1e-8) break;
  }
  if (jd < jd0) jd = nextElongation(eph, jd0 + 1, target);
  return jd;
}

export function moon(eph: Ephemeris, utcMs: number): MoonResult {
  const jd = julianDayUT(utcMs);
  const { e, moon: lon } = elongationAt(eph, jd);
  const names = [['New moon', 0], ['First quarter', 90], ['Full moon', 180], ['Last quarter', 270]] as const;
  const next = names
    .map(([name, t]) => ({ name, utcMs: utcMsFromJulianDay(nextElongation(eph, jd, t)) }))
    .sort((a, b) => a.utcMs - b.utcMs);
  const r = (x: number) => Math.round(x * 1e6) / 1e6;
  return {
    elongation: r(e),
    illumination: r((1 - Math.cos((e * Math.PI) / 180)) / 2),
    phase: phaseName(e),
    moonLongitude: r(lon),
    moonSign: signOf(lon),
    next
  };
}

export function computeMoon(eph: Ephemeris, utcMs: number, now = new Date()): CalcRecord<MoonResult> {
  return makeRecord(MOON, { utcMs }, { zodiac: 'tropical', phaseBins: '45° centred on principal phases', ephemeris: 'swiss-moshier' }, moon(eph, utcMs), [], now);
}
