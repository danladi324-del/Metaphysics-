import type { AstroConventions, HouseSystem } from '../../core/conventions';
import { HOUSE_SYSTEM_LABEL } from '../../core/conventions';
import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { julianDayUT } from '../../core/time';
import { DEFAULT_ORBS, findAspects, type Aspect, type AspectType, type Point } from './aspects';
import { BODY, FLAG, SIDEREAL_MODE, type Ephemeris } from './ephemeris';
import { formatLongitude, houseOf, norm360, signOf, wholeSignHouse } from './zodiac';
import { assertInstant, assertLatLon } from '../../core/validate';

export const NATAL: EngineDescriptor = {
  engine: 'natal',
  version: '0.1.0',
  input_dependencies: ['birth.datetime', 'birth.place', 'ephemeris.swiss']
};

export const HOUSE_CODE: Record<HouseSystem, string> = {
  placidus: 'P',
  wholeSign: 'W',
  koch: 'K',
  equal: 'A',
  campanus: 'C',
  regiomontanus: 'R',
  porphyry: 'O'
};

/** Systems always computed alongside the chosen one (rule 5). */
export const COMPETING_HOUSES: HouseSystem[] = ['placidus', 'wholeSign'];

export const BODY_ORDER = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'chiron', 'meanNode', 'trueNode', 'meanLilith', 'osculatingLilith', 'interpolatedLilith'
] as const;
export type BodyId = (typeof BODY_ORDER)[number];

export const BODY_LABEL: Record<BodyId | 'southNode' | 'asc' | 'mc', string> = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto', chiron: 'Chiron', meanNode: 'North Node (mean)',
  trueNode: 'North Node (true)', meanLilith: 'Lilith (mean)', osculatingLilith: 'Lilith (osculating)', interpolatedLilith: 'Lilith (interpolated)',
  southNode: 'South Node', asc: 'Ascendant', mc: 'Midheaven'
};

/** Node and Lilith come in variants; only the chosen one is drawn and aspected, all are stored. */
export const NODE_IDS = ['meanNode', 'trueNode'] as const;
export const LILITH_IDS = ['meanLilith', 'osculatingLilith', 'interpolatedLilith'] as const;
export const isVariantPoint = (id: string) => (NODE_IDS as readonly string[]).includes(id) || (LILITH_IDS as readonly string[]).includes(id);
export const nodeBody = (c: { nodeType: 'mean' | 'true' }): BodyId => (c.nodeType === 'mean' ? 'meanNode' : 'trueNode');
export const lilithBody = (c: { lilithType: 'mean' | 'osculating' | 'interpolated' }): BodyId => `${c.lilithType}Lilith` as BodyId;

export interface NatalInputs {
  utcMs: number;
  lat: number;
  lon: number;
  /** False when the birth time is unknown; houses and angles are then omitted from display and diffs. */
  timeKnown?: boolean;
}

export interface BodyResult {
  id: BodyId;
  longitude: number;
  latitude: number;
  speed: number;
  retrograde: boolean;
  sign: string;
  /** House under each computed system. */
  houses: Partial<Record<HouseSystem, number>>;
}

export interface HouseSet {
  system: HouseSystem;
  cusps: number[]; // 12 values, house 1..12
  /** Set when the requested system is undefined here and another was substituted. */
  fallback: string | null;
}

export interface NatalResult {
  jdUT: number;
  ephemeris: string;
  zodiac: 'tropical' | 'sidereal';
  ayanamsaDegrees: number | null;
  obliquity: number;
  bodies: BodyResult[];
  angles: { asc: number; mc: number; dsc: number; ic: number; vertex: number };
  houses: Partial<Record<HouseSystem, HouseSet>>;
  aspects: Aspect[];
}

export interface NatalConventions extends AstroConventions {
  orbs: Record<AspectType, number>;
}

const r7 = (x: number) => Math.round(x * 1e7) / 1e7;

export function computeNatal(eph: Ephemeris, inputs: NatalInputs, conv: AstroConventions, orbs = DEFAULT_ORBS, now = new Date()): CalcRecord<NatalResult> {
  const { result, limitations } = natalPositions(eph, inputs, conv, orbs);
  const conventions: NatalConventions = { ...conv, orbs };
  return makeRecord(NATAL, { ...inputs }, { ...conventions, ephemeris: 'swiss-moshier', competingHouses: COMPETING_HOUSES }, result, limitations, now);
}

export function natalPositions(
  eph: Ephemeris,
  inputs: NatalInputs,
  conv: AstroConventions,
  orbs: Record<AspectType, number> = DEFAULT_ORBS
): { result: NatalResult; limitations: string[] } {
  assertInstant(inputs.utcMs, 'birth time');
  assertLatLon(inputs.lat, inputs.lon);
  const limitations: string[] = [];
  const jd = julianDayUT(inputs.utcMs);
  const sidereal = conv.zodiac === 'sidereal';
  let flags: number = FLAG.moshier | FLAG.speed;
  let ayanamsa: number | null = null;
  if (sidereal) {
    eph.setSidereal(SIDEREAL_MODE[conv.ayanamsa]);
    flags |= FLAG.sidereal;
    ayanamsa = r7(eph.ayanamsa(jd));
  }
  const obliquity = eph.position(jd, -1, FLAG.moshier).longitude;

  const raw: { id: BodyId; lon: number; lat: number; speed: number }[] = [];
  for (const id of BODY_ORDER) {
    if (id === 'chiron' && !eph.hasAsteroidFile) {
      limitations.push('Chiron not computed: asteroid file seas_18.se1 not loaded.');
      continue;
    }
    try {
      const p = eph.position(jd, BODY[id], flags);
      raw.push({ id, lon: p.longitude, lat: p.latitude, speed: p.speed });
    } catch (e) {
      limitations.push(`${BODY_LABEL[id]} not computed: ${(e as Error).message}`);
    }
  }
  if (inputs.utcMs < Date.UTC(1800, 0, 1) || inputs.utcMs >= Date.UTC(2400, 0, 1)) {
    if (raw.some((r) => r.id === 'chiron')) limitations.push('Date is outside the 1800-2399 range of seas_18.se1; Chiron may be unreliable.');
  }

  // Houses: chosen system plus the competing ones.
  const systems = Array.from(new Set<HouseSystem>([conv.houseSystem, ...COMPETING_HOUSES]));
  const houses: Partial<Record<HouseSystem, HouseSet>> = {};
  let angles = { asc: 0, mc: 0, dsc: 0, ic: 0, vertex: 0 };
  const quadrantLimit = 90 - obliquity;
  for (const sys of systems) {
    const h = eph.houses(jd, inputs.lat, inputs.lon, HOUSE_CODE[sys]);
    let fallback: string | null = null;
    if ((sys === 'placidus' || sys === 'koch') && Math.abs(inputs.lat) >= quadrantLimit) {
      fallback = 'porphyry';
      limitations.push(`${HOUSE_SYSTEM_LABEL[sys]} is undefined above ${quadrantLimit.toFixed(2)}° latitude; Swiss Ephemeris substituted Porphyry cusps.`);
    }
    const shift = ayanamsa ?? 0;
    // Whole sign cusps sit at 0° of each sign counted from the ascendant's sign in the zodiac in use;
    // subtracting the ayanamsa from tropical whole-sign cusps would leave them mid-sign (caught by the Astrodienst sidereal fixture).
    const cusps =
      sys === 'wholeSign'
        ? Array.from({ length: 12 }, (_, i) => norm360(Math.floor(norm360(h.ascendant - shift) / 30) * 30 + i * 30))
        : h.cusps.slice(1, 13).map((c) => r7(norm360(c - shift)));
    houses[sys] = { system: sys, cusps, fallback };
    if (sys === conv.houseSystem || sys === systems[0]) {
      angles = {
        asc: r7(norm360(h.ascendant - shift)),
        mc: r7(norm360(h.mc - shift)),
        dsc: r7(norm360(h.ascendant - shift + 180)),
        ic: r7(norm360(h.mc - shift + 180)),
        vertex: r7(norm360(h.vertex - shift))
      };
    }
  }
  if (sidereal) limitations.push('Sidereal quadrant cusps are tropical cusps minus the ayanamsa; whole sign cusps start at 0° of the sidereal rising sign.');
  if (inputs.timeKnown === false) {
    limitations.push('Birth time unknown: computed for local noon. Houses, angles and house splits are not meaningful; the Moon may be off by up to about 7°.');
  }

  const bodies: BodyResult[] = raw.map((r) => {
    const hs: Partial<Record<HouseSystem, number>> = {};
    for (const sys of systems) {
      const set = houses[sys]!;
      hs[sys] = sys === 'wholeSign' ? wholeSignHouse(r.lon, angles.asc) : houseOf(r.lon, [0, ...set.cusps]);
    }
    return {
      id: r.id,
      longitude: r7(r.lon),
      latitude: r7(r.lat),
      speed: r7(r.speed),
      retrograde: r.speed < 0,
      sign: signOf(r.lon),
      houses: hs
    };
  });

  const node = nodeBody(conv);
  const lilith = lilithBody(conv);
  const aspectPoints: Point[] = bodies
    .filter((b) => !isVariantPoint(b.id) || b.id === node || b.id === lilith)
    .map((b) => ({ id: b.id, longitude: b.longitude, speed: b.speed }));
  aspectPoints.push({ id: 'asc', longitude: angles.asc, speed: 0 }, { id: 'mc', longitude: angles.mc, speed: 0 });
  const aspects = findAspects(aspectPoints, orbs, (a, b) => (a.id === 'asc' && b.id === 'mc') || (a.id === 'mc' && b.id === 'asc'));

  return {
    result: {
      jdUT: r7(jd),
      ephemeris: `Swiss Ephemeris ${eph.version()} (Moshier)`,
      zodiac: conv.zodiac,
      ayanamsaDegrees: ayanamsa,
      obliquity: r7(obliquity),
      bodies,
      angles,
      houses,
      aspects
    },
    limitations
  };
}

/** Disagreement rows wherever a convention changes a result (rule 5). */
export function natalDisagreements(rec: CalcRecord<NatalResult>, profileId: string | null): Disagreement[] {
  const out: Disagreement[] = [];
  const res = rec.raw_result;
  const mk = (subject: string, a: string, b: string, cause: string): Disagreement => ({
    id: `${rec.id}:${subject}`,
    kind: 'calculation',
    subject,
    result_a: a,
    result_b: b,
    cause,
    notes: null,
    created_at: rec.computed_at,
    profile_id: profileId,
    engine: rec.engine,
    record_id: rec.id
  });
  const [ha, hb] = COMPETING_HOUSES as [HouseSystem, HouseSystem];
  const timeKnown = (rec.inputs as { timeKnown?: boolean }).timeKnown !== false;
  for (const b of timeKnown ? res.bodies : []) {
    const x = b.houses[ha];
    const y = b.houses[hb];
    if (x !== undefined && y !== undefined && x !== y) {
      out.push(mk(`${BODY_LABEL[b.id]} house`, `${HOUSE_SYSTEM_LABEL[ha]}: House ${x}`, `${HOUSE_SYSTEM_LABEL[hb]}: House ${y}`, 'convention: house system'));
    }
  }
  const find = (id: BodyId) => res.bodies.find((b) => b.id === id);
  const pairs: [BodyId, BodyId, string][] = [
    ['meanNode', 'trueNode', 'convention: lunar node (mean vs true)'],
    ['meanLilith', 'osculatingLilith', 'convention: Lilith (mean vs osculating apogee)'],
    ['interpolatedLilith', 'meanLilith', 'convention: Lilith (interpolated vs mean apogee)'],
    ['interpolatedLilith', 'osculatingLilith', 'convention: Lilith (interpolated vs osculating apogee)']
  ];
  for (const [a, b, cause] of pairs) {
    const pa = find(a);
    const pb = find(b);
    if (pa && pb && pa.sign !== pb.sign) {
      out.push(mk(`${BODY_LABEL[a].split(' (')[0]} sign`, `${BODY_LABEL[a]}: ${formatLongitude(pa.longitude)}`, `${BODY_LABEL[b]}: ${formatLongitude(pb.longitude)}`, cause));
    }
  }
  for (const set of Object.values(res.houses)) {
    if (set?.fallback) out.push(mk(`${HOUSE_SYSTEM_LABEL[set.system]} cusps`, `Requested: ${HOUSE_SYSTEM_LABEL[set.system]}`, `Used: ${set.fallback}`, 'limitation: polar latitude'));
  }
  return out;
}
