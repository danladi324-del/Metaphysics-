import type { AstroConventions } from '../../core/conventions';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { julianDayUT, utcMsFromJulianDay } from '../../core/time';
import { aspectBetween, type Aspect, type AspectType } from './aspects';
import { BODY, FLAG, type Ephemeris } from './ephemeris';
import { BODY_ORDER, type BodyId, type NatalResult } from './compute';
import { norm360 } from './zodiac';

export const TRANSITS: EngineDescriptor = {
  engine: 'transits',
  version: '0.1.0',
  input_dependencies: ['birth.datetime', 'birth.place', 'ephemeris.swiss', 'date']
};

export const RETURNS: EngineDescriptor = {
  engine: 'returns',
  version: '0.1.0',
  input_dependencies: ['birth.datetime', 'ephemeris.swiss', 'date']
};

/** Transit orbs are tighter than natal orbs. A convention. */
export const TRANSIT_ORBS: Record<AspectType, number> = {
  conjunction: 1.5, opposition: 1.5, trine: 1.5, square: 1.5, sextile: 1, quincunx: 0.5, semisextile: 0.5
};

const TRANSITING: BodyId[] = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'];

export interface TransitResult {
  jdUT: number;
  positions: { id: BodyId; longitude: number; speed: number }[];
  aspects: (Aspect & { transiting: BodyId; natal: string })[];
}

export function computeTransits(
  eph: Ephemeris,
  natal: CalcRecord<NatalResult>,
  utcMs: number,
  conv: AstroConventions,
  orbs = TRANSIT_ORBS,
  now = new Date()
): CalcRecord<TransitResult> {
  const jd = julianDayUT(utcMs);
  const positions: TransitResult['positions'] = [];
  const limitations: string[] = [];
  for (const id of TRANSITING) {
    if (id === 'chiron' && !eph.hasAsteroidFile) continue;
    const p = eph.position(jd, BODY[id], FLAG.moshier | FLAG.speed);
    positions.push({ id, longitude: round7(p.longitude), speed: round7(p.speed) });
  }
  if (conv.zodiac === 'sidereal') limitations.push('Transits are computed tropically; natal sidereal comparison not yet supported.');
  const node = conv.nodeType === 'mean' ? 'meanNode' : 'trueNode';
  const natalPoints = natal.raw_result.bodies
    .filter((b) => !['meanNode', 'trueNode', 'meanLilith', 'osculatingLilith'].includes(b.id) || b.id === node)
    .map((b) => ({ id: b.id as string, longitude: b.longitude, speed: 0 }));
  natalPoints.push({ id: 'asc', longitude: natal.raw_result.angles.asc, speed: 0 }, { id: 'mc', longitude: natal.raw_result.angles.mc, speed: 0 });
  const aspects: TransitResult['aspects'] = [];
  for (const t of positions) {
    for (const n of natalPoints) {
      const a = aspectBetween({ id: t.id, longitude: t.longitude, speed: t.speed }, n, orbs);
      if (a) aspects.push({ ...a, transiting: t.id, natal: n.id });
    }
  }
  aspects.sort((x, y) => x.orb - y.orb);
  return makeRecord(
    TRANSITS,
    { natalFingerprint: natal.fingerprint, utcMs },
    { ...conv, orbs, ephemeris: 'swiss-moshier' },
    { jdUT: round7(jd), positions, aspects },
    limitations,
    now
  );
}

/**
 * Next instant at or after `fromUtcMs` when the body returns to `targetLon`.
 * Newton steps on longitude, valid for Sun and Moon (never retrograde).
 */
export function findReturn(eph: Ephemeris, body: 'sun' | 'moon', targetLon: number, fromUtcMs: number): number {
  const id = BODY[body];
  let jd = julianDayUT(fromUtcMs);
  const p0 = eph.position(jd, id);
  jd += norm360(targetLon - p0.longitude) / p0.speed;
  for (let i = 0; i < 50; i++) {
    const p = eph.position(jd, id);
    let d = norm360(targetLon - p.longitude);
    if (d > 180) d -= 360;
    jd += d / p.speed;
    if (Math.abs(d) < 1e-9) break;
  }
  return utcMsFromJulianDay(jd);
}

export interface ReturnResult {
  body: 'sun' | 'moon';
  targetLongitude: number;
  utcMs: number;
}

export function computeReturn(
  eph: Ephemeris,
  natal: CalcRecord<NatalResult>,
  body: 'sun' | 'moon',
  fromUtcMs: number,
  now = new Date()
): CalcRecord<ReturnResult> {
  const target = natal.raw_result.bodies.find((b) => b.id === body)!.longitude;
  const utcMs = findReturn(eph, body, target, fromUtcMs);
  return makeRecord(RETURNS, { natalFingerprint: natal.fingerprint, body, fromUtcMs }, { zodiac: 'tropical', ephemeris: 'swiss-moshier' }, { body, targetLongitude: target, utcMs }, [], now);
}

const round7 = (x: number) => Math.round(x * 1e7) / 1e7;
export { BODY_ORDER };
