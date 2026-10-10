import type { Ayanamsa } from '../../core/conventions';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { julianDayUT } from '../../core/time';
import { BODY, FLAG, SIDEREAL_MODE, type Ephemeris } from '../natal/ephemeris';
import { norm360, signOf } from '../natal/zodiac';
import { assertInstant, assertLatLon } from '../../core/validate';

export const VEDIC: EngineDescriptor = {
  engine: 'vedic',
  version: '0.1.0',
  input_dependencies: ['birth.datetime', 'birth.place', 'ephemeris.swiss']
};

export const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha',
  'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
] as const;

/** Vimshottari order and years (total 120). Lord of nakshatra n is DASHA[n % 9]. */
export const DASHA: [string, number][] = [
  ['Ketu', 7], ['Venus', 20], ['Sun', 6], ['Moon', 10], ['Mars', 7], ['Rahu', 18], ['Jupiter', 16], ['Saturn', 19], ['Mercury', 17]
];

export interface VedicConventions {
  ayanamsa: Ayanamsa;
  /** Days per dasha year. 365.25 is common; 365.2422 (tropical) and 360 (savana) are alternatives. */
  yearDays: number;
  nodeType: 'mean' | 'true';
}

export const DEFAULT_VEDIC: VedicConventions = { ayanamsa: 'lahiri', yearDays: 365.25, nodeType: 'mean' };

export interface VedicResult {
  ayanamsa: number;
  ascendant: { longitude: number; sign: string } | null;
  grahas: { id: string; longitude: number; sign: string; nakshatra: string; pada: number }[];
  moonNakshatra: { index: number; name: string; pada: number; lord: string; fractionTraversed: number };
  dashas: { lord: string; startMs: number; endMs: number }[];
}

const GRAHAS: [string, number][] = [
  ['Sun', BODY.sun], ['Moon', BODY.moon], ['Mars', BODY.mars], ['Mercury', BODY.mercury], ['Jupiter', BODY.jupiter], ['Venus', BODY.venus], ['Saturn', BODY.saturn]
];

const NAK = 360 / 27;

export function nakshatraOf(lon: number) {
  const l = norm360(lon);
  const index = Math.floor(l / NAK);
  const within = l - index * NAK;
  return { index, name: NAKSHATRAS[index]!, pada: Math.floor(within / (NAK / 4)) + 1, fraction: within / NAK };
}

export function vedic(eph: Ephemeris, inp: { utcMs: number; lat: number; lon: number; timeKnown?: boolean }, conv: VedicConventions = DEFAULT_VEDIC): VedicResult {
  assertInstant(inp.utcMs, 'birth time');
  assertLatLon(inp.lat, inp.lon);
  const jd = julianDayUT(inp.utcMs);
  eph.setSidereal(SIDEREAL_MODE[conv.ayanamsa]);
  const ay = eph.ayanamsa(jd);
  const flags = FLAG.moshier | FLAG.speed | FLAG.sidereal;
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  const grahas = GRAHAS.map(([id, b]) => {
    const lon = eph.position(jd, b, flags).longitude;
    const n = nakshatraOf(lon);
    return { id, longitude: r6(lon), sign: signOf(lon), nakshatra: n.name, pada: n.pada };
  });
  const rahu = eph.position(jd, conv.nodeType === 'mean' ? BODY.meanNode : BODY.trueNode, flags).longitude;
  for (const [id, lon] of [['Rahu', rahu], ['Ketu', norm360(rahu + 180)]] as const) {
    const n = nakshatraOf(lon);
    grahas.push({ id, longitude: r6(lon), sign: signOf(lon), nakshatra: n.name, pada: n.pada });
  }
  const asc = inp.timeKnown === false ? null : norm360(eph.houses(jd, inp.lat, inp.lon, 'W').ascendant - ay);
  const moon = nakshatraOf(grahas[1]!.longitude);
  const start = moon.index % 9;
  const yearMs = conv.yearDays * 86_400_000;
  const dashas: VedicResult['dashas'] = [];
  // First dasha: only the untraversed fraction remains at birth.
  let t = inp.utcMs - moon.fraction * DASHA[start]![1] * yearMs;
  for (let k = 0; k < 10; k++) {
    const [lord, years] = DASHA[(start + k) % 9]!;
    dashas.push({ lord, startMs: Math.round(t), endMs: Math.round(t + years * yearMs) });
    t += years * yearMs;
  }
  return {
    ayanamsa: r6(ay),
    ascendant: asc === null ? null : { longitude: r6(asc), sign: signOf(asc) },
    grahas,
    moonNakshatra: { index: moon.index, name: moon.name, pada: moon.pada, lord: DASHA[start]![0], fractionTraversed: r6(moon.fraction) },
    dashas
  };
}

export function computeVedic(eph: Ephemeris, inp: { utcMs: number; lat: number; lon: number; timeKnown?: boolean }, conv: VedicConventions = DEFAULT_VEDIC, now = new Date()): CalcRecord<VedicResult> {
  const lim = ['Ascendant uses the sidereal longitude of the tropical ascendant (whole-sign style); no divisional charts yet.'];
  if (inp.timeKnown === false) lim.push('Birth time unknown: no ascendant; the Moon and the dasha start may be off.');
  return makeRecord(VEDIC, { ...inp }, { ...conv, ephemeris: 'swiss-moshier' }, vedic(eph, inp, conv), lim, now);
}
