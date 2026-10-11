import * as Astronomy from 'astronomy-engine';
import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { julianDayUT, utcMsFromJulianDay, zoneOffsetSeconds } from '../../core/time';
import { BODY, FLAG, type Ephemeris } from '../natal/ephemeris';
import { norm360 } from '../natal/zodiac';
import { assertInstant, assertLatLon } from '../../core/validate';

export const BAZI: EngineDescriptor = {
  engine: 'bazi',
  version: '0.1.0',
  // Shares the solar-term input with Flying Star and Eight Mansions (rule 6).
  input_dependencies: ['birth.datetime', 'birth.place', 'solarTerms', 'ephemeris.swiss']
};

export const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'] as const;
export const STEMS_ZH = '甲乙丙丁戊己庚辛壬癸';
export const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'] as const;
export const BRANCHES_ZH = '子丑寅卯辰巳午未申酉戌亥';
export const STEM_ELEMENT = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'] as const;
export const BRANCH_ELEMENT = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'] as const;

export interface BaziConventions {
  /** 'early': the day changes at 23:00 (Zi hour starts the next day). 'midnight': day changes at 00:00; 23:00-24:00 takes the next day's stem for the hour. */
  ziHour: 'early' | 'midnight';
  /** Use local apparent (true) solar time for day and hour instead of clock time. */
  trueSolarTime: boolean;
}

/** True solar time on by default: the owner's own BaZi app is fed the true-solar birth time, D-028. */
export const DEFAULT_BAZI: BaziConventions = { ziHour: 'early', trueSolarTime: true };

export interface Pillar {
  stem: number;
  branch: number;
}

export const pillarName = (p: Pillar) => `${STEMS_ZH[p.stem]}${BRANCHES_ZH[p.branch]} ${STEMS[p.stem]}-${BRANCHES[p.branch]}`;

/** Instant (UTC ms) when the apparent solar longitude reaches `target`, searching forward from `fromMs`. */
export function solarTermInstant(eph: Ephemeris, target: number, fromMs: number): number {
  let jd = julianDayUT(fromMs);
  const s0 = eph.position(jd, BODY.sun, FLAG.moshier | FLAG.speed);
  jd += norm360(target - s0.longitude) / 0.9856;
  for (let i = 0; i < 30; i++) {
    const s = eph.position(jd, BODY.sun, FLAG.moshier | FLAG.speed);
    let d = norm360(target - s.longitude);
    if (d > 180) d -= 360;
    jd += d / s.speed;
    if (Math.abs(d) < 1e-9) break;
  }
  return utcMsFromJulianDay(jd);
}

/** Sexagenary day index (0 = Jia-Zi) of a proleptic Gregorian civil date. */
export function dayIndex(y: number, m: number, d: number): number {
  const noon = new Date(0);
  noon.setUTCFullYear(y, m - 1, d);
  noon.setUTCHours(12, 0, 0, 0);
  const jdn = Math.round(julianDayUT(noon.getTime()));
  return (((jdn + 49) % 60) + 60) % 60;
}

const fromIndex = (i: number): Pillar => ({ stem: i % 10, branch: i % 12 });

/** Local apparent solar time as a pseudo-UTC timestamp whose UTC fields read as the solar date and time. */
export function apparentSolarMs(utcMs: number, lat: number, lon: number): number {
  const lmt = utcMs + (lon / 15) * 3_600_000;
  const ha = Astronomy.HourAngle(Astronomy.Body.Sun, new Date(utcMs), new Astronomy.Observer(lat, lon, 0));
  const lastHours = (ha + 12) % 24;
  const lmtHours = (((lmt % 86_400_000) + 86_400_000) % 86_400_000) / 3_600_000;
  let eot = lastHours - lmtHours;
  if (eot > 12) eot -= 24;
  if (eot < -12) eot += 24;
  return lmt + eot * 3_600_000;
}

export interface BaziInputs {
  utcMs: number;
  zone: string;
  lat: number;
  lon: number;
  /** Optional. Only the luck-pillar direction depends on it. */
  sex?: 'male' | 'female';
}

export interface LuckPillars {
  /** Forward when a yang year stem meets male or a yin year stem meets female. */
  direction: 'forward' | 'backward';
  /** Days from birth to the next (forward) or previous (backward) month-boundary solar term. */
  daysToTerm: number;
  /** 3 days = 1 calendar year (about 1 day = 4 months), minute precision. */
  startAge: { years: number; months: number };
  startUtcMs: number;
  pillars: { pillar: Pillar; fromUtcMs: number; fromAge: number }[];
}

export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  /** The wall time used for day and hour, as ISO without zone. */
  timeUsed: string;
  sunLongitude: number;
  liChunUtcMs: number;
  /** Elements of the eight characters (stems and branch main elements). */
  elements: Record<string, number>;
}

export interface BaziResult {
  luck: LuckPillars | null;
  chosen: BaziChart;
  conventions: BaziConventions;
  /** The same instant under every combination of the two conventions. */
  variants: { conventions: BaziConventions; chart: BaziChart }[];
}

/** Four pillars at an instant. Shared with Qi Men so both engines use one solar-term and pillar input. */
export function chart(eph: Ephemeris, inp: BaziInputs, conv: BaziConventions): BaziChart {
  assertInstant(inp.utcMs, 'birth time');
  assertLatLon(inp.lat, inp.lon);
  const jd = julianDayUT(inp.utcMs);
  const sun = norm360(eph.position(jd, BODY.sun, FLAG.moshier).longitude);
  // Year: changes at Li Chun (315°). Find the Li Chun on or before the instant.
  const y0 = new Date(inp.utcMs).getUTCFullYear();
  let liChun = solarTermInstant(eph, 315, Date.UTC(y0, 0, 1));
  let year = y0;
  if (inp.utcMs < liChun) {
    year = y0 - 1;
    liChun = solarTermInstant(eph, 315, Date.UTC(y0 - 1, 0, 1));
  }
  const yi = (((year - 4) % 60) + 60) % 60;
  const yearP = fromIndex(yi);
  // Month: each 30° of solar longitude from 315°. Five Tigers rule for the stem.
  const m = Math.floor(norm360(sun - 315) / 30);
  const monthP: Pillar = { stem: (yearP.stem * 2 + 2 + m) % 10, branch: (2 + m) % 12 };
  // Day and hour: clock time in the zone, or apparent solar time at the place.
  const wallMs = conv.trueSolarTime ? apparentSolarMs(inp.utcMs, inp.lat, inp.lon) : inp.utcMs + zoneOffsetSeconds(inp.zone, inp.utcMs) * 1000;
  const w = new Date(wallMs);
  const h = w.getUTCHours();
  const di = dayIndex(w.getUTCFullYear(), w.getUTCMonth() + 1, w.getUTCDate());
  const lateZi = h >= 23;
  const dayI = lateZi && conv.ziHour === 'early' ? (di + 1) % 60 : di;
  const dayP = fromIndex(dayI);
  const hb = Math.floor((h + 1) / 2) % 12;
  // Five Rats rule: Zi-hour stem from the day stem; in late Zi under the midnight rule, the next day's stem governs the hour.
  const stemDay = lateZi ? fromIndex((di + 1) % 60).stem : dayP.stem;
  const hourP: Pillar = { stem: ((stemDay % 5) * 2 + hb) % 10, branch: hb };
  const elements: Record<string, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const p of [yearP, monthP, dayP, hourP]) {
    elements[STEM_ELEMENT[p.stem]!] = (elements[STEM_ELEMENT[p.stem]!] ?? 0) + 1;
    elements[BRANCH_ELEMENT[p.branch]!] = (elements[BRANCH_ELEMENT[p.branch]!] ?? 0) + 1;
  }
  return { year: yearP, month: monthP, day: dayP, hour: hourP, timeUsed: w.toISOString().slice(0, 16), sunLongitude: Math.round(sun * 1e6) / 1e6, liChunUtcMs: liChun, elements };
}

/** Ten luck pillars (da yun) stepping from the month pillar. Solar terms are absolute instants, not Beijing wall time. */
export function luckPillars(eph: Ephemeris, utcMs: number, c: BaziChart, sex: 'male' | 'female'): LuckPillars {
  const yangYear = c.year.stem % 2 === 0;
  const forward = (yangYear && sex === 'male') || (!yangYear && sex === 'female');
  const sun = c.sunLongitude;
  const k = Math.floor(norm360(sun - 315) / 30);
  const target = norm360(315 + (forward ? k + 1 : k) * 30);
  let term: number;
  if (forward) term = solarTermInstant(eph, target, utcMs);
  else {
    // Previous boundary: search forward from ~40 days before.
    term = solarTermInstant(eph, target, utcMs - 40 * 86_400_000);
    if (term > utcMs) term = solarTermInstant(eph, target, utcMs - 400 * 86_400_000);
  }
  const days = Math.abs(term - utcMs) / 86_400_000;
  // 3 days = 1 calendar year (365.2425 days), not "1 day = 120 days", which would assume 360-day years.
  const ageYears = days / 3;
  const startUtcMs = utcMs + Math.round(ageYears * 365.2425 * 86_400_000);
  // Sexagenary index of the month pillar: the unique i in 0..59 with i%10 = stem, i%12 = branch.
  let mi = 0;
  while (mi % 10 !== c.month.stem || mi % 12 !== c.month.branch) mi++;
  const pillars = Array.from({ length: 10 }, (_, n) => {
    const i = (((mi + (forward ? n + 1 : -(n + 1))) % 60) + 60) % 60;
    return { pillar: fromIndex(i), fromUtcMs: startUtcMs + Math.round(n * 10 * 365.2425 * 86_400_000), fromAge: Math.round((ageYears + n * 10) * 100) / 100 };
  });
  return {
    direction: forward ? 'forward' : 'backward',
    daysToTerm: Math.round(days * 10000) / 10000,
    startAge: { years: Math.floor(ageYears), months: Math.floor((ageYears - Math.floor(ageYears)) * 12) },
    startUtcMs,
    pillars
  };
}

export function computeBazi(eph: Ephemeris, inp: BaziInputs, conv: BaziConventions = DEFAULT_BAZI, now = new Date()): CalcRecord<BaziResult> {
  const variants = (['early', 'midnight'] as const).flatMap((ziHour) => [false, true].map((trueSolarTime) => ({ conventions: { ziHour, trueSolarTime }, chart: chart(eph, inp, { ziHour, trueSolarTime }) })));
  const chosen = chart(eph, inp, conv);
  const luck = inp.sex ? luckPillars(eph, inp.utcMs, chosen, inp.sex) : null;
  const limitations = luck
    ? ['Luck-pillar start uses absolute solar-term instants; apps that read the birth clock as Beijing time can differ by months for births outside China.']
    : ['Luck pillars are not computed: their direction depends on sex, which this profile does not record.'];
  return makeRecord(
    BAZI,
    { ...inp },
    { ...conv, monthBoundary: 'solar terms (jie), Li Chun = 315°', ephemeris: 'swiss-moshier', luckStart: '3 days = 1 year, minute precision' },
    { luck, chosen, conventions: conv, variants },
    limitations,
    now
  );
}

const convLabel = (c: BaziConventions) => `${c.trueSolarTime ? 'true solar time' : 'clock time'}, ${c.ziHour === 'early' ? 'day changes 23:00' : 'day changes 00:00'}`;

export function baziDisagreements(rec: CalcRecord<BaziResult>, profileId: string | null): Disagreement[] {
  const out: Disagreement[] = [];
  const base = rec.raw_result.chosen;
  for (const v of rec.raw_result.variants) {
    for (const k of ['day', 'hour'] as const) {
      const a = base[k];
      const b = v.chart[k];
      if (a.stem !== b.stem || a.branch !== b.branch) {
        out.push({
          id: `${rec.id}:${k}:${convLabel(v.conventions)}`,
          kind: 'calculation',
          subject: `${k[0]!.toUpperCase()}${k.slice(1)} pillar`,
          result_a: `${convLabel(rec.raw_result.conventions)}: ${pillarName(a)}`,
          result_b: `${convLabel(v.conventions)}: ${pillarName(b)}`,
          cause: v.conventions.trueSolarTime !== rec.raw_result.conventions.trueSolarTime ? 'convention: true solar time' : 'convention: Zi hour rule',
          created_at: rec.computed_at,
          profile_id: profileId,
          engine: 'bazi',
          record_id: rec.id
        });
      }
    }
  }
  return out;
}
