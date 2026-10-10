import * as Astronomy from 'astronomy-engine';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';

export const HOURS: EngineDescriptor = {
  engine: 'planetaryHours',
  version: '0.1.0',
  input_dependencies: ['date', 'place', 'ephemeris.astronomy-engine']
};

/** Chaldean order, slowest to fastest. Each hour's ruler is the next in this list. */
export const CHALDEAN_ORDER = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'] as const;
export type Planet = (typeof CHALDEAN_ORDER)[number];
/** Ruler of each weekday, Sunday = 0. */
export const DAY_RULER: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export interface HoursConventions {
  /** Planetary day begins at sunrise (traditional) or at civil midnight. */
  dayStart: 'sunrise' | 'midnight';
}

export interface PlanetaryHour {
  index: number; // 1..24, 1-12 day, 13-24 night
  ruler: Planet;
  startMs: number;
  endMs: number;
}

export interface HoursResult {
  /** Weekday (0 = Sunday) of the planetary day containing the instant, under each convention. */
  planetaryDay: { sunrise: Planet; midnight: Planet };
  sunrise: number;
  sunset: number;
  nextSunrise: number;
  hours: PlanetaryHour[];
  current: PlanetaryHour | null;
}

function riseSet(obs: Astronomy.Observer, dir: 1 | -1, fromMs: number, limitDays: number): number | null {
  const t = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, dir, new Date(fromMs), limitDays);
  return t ? t.date.getTime() : null;
}

/**
 * Planetary hours for the sunrise-to-sunrise day containing `utcMs`.
 * `localWeekday(ms)` gives the civil weekday at the location (0 = Sunday) for the midnight convention and to name the sunrise day.
 */
export function planetaryHours(utcMs: number, lat: number, lon: number, localWeekday: (ms: number) => number): HoursResult {
  const obs = new Astronomy.Observer(lat, lon, 0);
  // Most recent sunrise at or before the instant.
  const sunrise = riseSet(obs, 1, utcMs - 1.5 * 86_400_000, 2);
  let rise = sunrise;
  if (rise !== null) {
    let next = riseSet(obs, 1, rise + 60_000, 2);
    while (next !== null && next <= utcMs) {
      rise = next;
      next = riseSet(obs, 1, rise + 60_000, 2);
    }
  }
  if (rise === null) throw new Error('No sunrise near this date at this latitude; planetary hours are undefined.');
  const set = riseSet(obs, -1, rise, 1);
  const nextRise = riseSet(obs, 1, rise + 60_000, 2);
  if (set === null || nextRise === null) throw new Error('No sunset or next sunrise; planetary hours are undefined at this latitude today.');
  const dayRuler = DAY_RULER[localWeekday(rise)]!;
  const start = CHALDEAN_ORDER.indexOf(dayRuler);
  const hours: PlanetaryHour[] = [];
  const dayLen = (set - rise) / 12;
  const nightLen = (nextRise - set) / 12;
  for (let i = 0; i < 24; i++) {
    const s = i < 12 ? rise + i * dayLen : set + (i - 12) * nightLen;
    const e = i < 12 ? rise + (i + 1) * dayLen : set + (i - 11) * nightLen;
    hours.push({ index: i + 1, ruler: CHALDEAN_ORDER[(start + i) % 7]!, startMs: Math.round(s), endMs: Math.round(e) });
  }
  return {
    planetaryDay: { sunrise: dayRuler, midnight: DAY_RULER[localWeekday(utcMs)]! },
    sunrise: rise,
    sunset: set,
    nextSunrise: nextRise,
    hours,
    current: hours.find((h) => utcMs >= h.startMs && utcMs < h.endMs) ?? null
  };
}

export function computeHours(utcMs: number, lat: number, lon: number, localWeekday: (ms: number) => number, now = new Date()): CalcRecord<HoursResult> {
  return makeRecord(
    HOURS,
    { utcMs, lat, lon },
    { dayStart: 'sunrise (midnight also stored)', riseDefinition: 'upper limb, standard refraction (astronomy-engine)', order: 'Chaldean' },
    planetaryHours(utcMs, lat, lon, localWeekday),
    [],
    now
  );
}
