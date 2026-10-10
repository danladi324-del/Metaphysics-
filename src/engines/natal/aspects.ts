import { norm360, separation } from './zodiac';

export type AspectType = 'conjunction' | 'opposition' | 'trine' | 'square' | 'sextile' | 'quincunx' | 'semisextile';

export const ASPECT_ANGLE: Record<AspectType, number> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150,
  semisextile: 30
};

/**
 * Default orbs in degrees. A convention, not a fact: traditions and software differ widely.
 * Stored in every record so a changed table is visible.
 */
export const DEFAULT_ORBS: Record<AspectType, number> = {
  conjunction: 8,
  opposition: 8,
  trine: 7,
  square: 7,
  sextile: 5,
  quincunx: 3,
  semisextile: 2
};

export interface Point {
  id: string;
  longitude: number;
  speed: number; // degrees per day; 0 for angles
}

export interface Aspect {
  a: string;
  b: string;
  type: AspectType;
  orb: number; // absolute deviation from exact, degrees
  applying: boolean | null; // null when neither point moves
}

export function findAspects(points: Point[], orbs: Record<AspectType, number> = DEFAULT_ORBS, skip?: (a: Point, b: Point) => boolean): Aspect[] {
  const out: Aspect[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      if (skip?.(a, b)) continue;
      const aspect = aspectBetween(a, b, orbs);
      if (aspect) out.push(aspect);
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

export function aspectBetween(a: Point, b: Point, orbs: Record<AspectType, number> = DEFAULT_ORBS): Aspect | null {
  const sep = separation(a.longitude, b.longitude);
  let best: Aspect | null = null;
  for (const type of Object.keys(ASPECT_ANGLE) as AspectType[]) {
    const dev = Math.abs(sep - ASPECT_ANGLE[type]);
    if (dev <= orbs[type] && (!best || dev < best.orb)) {
      best = { a: a.id, b: b.id, type, orb: round(dev), applying: applying(a, b, ASPECT_ANGLE[type]) };
    }
  }
  return best;
}

/** Applying if the deviation from exact shrinks over the next hour, given current speeds. */
function applying(a: Point, b: Point, angle: number): boolean | null {
  if (a.speed === 0 && b.speed === 0) return null;
  const dt = 1 / 24;
  const now = Math.abs(separation(a.longitude, b.longitude) - angle);
  const later = Math.abs(separation(norm360(a.longitude + a.speed * dt), norm360(b.longitude + b.speed * dt)) - angle);
  return later < now;
}

const round = (x: number) => Math.round(x * 1e6) / 1e6;
