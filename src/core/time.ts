/**
 * Local wall time -> UTC instant, using the runtime's IANA tz database (Intl).
 * Historical offsets (LMT, war time, the 1974-75 US emergency DST) come from tzdb.
 * The resolved offset is stored with the profile (DECISIONS D-006) so later computations
 * do not depend on the tzdb version of whichever device runs them.
 */

export interface LocalDateTime {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second?: number;
}

export interface ResolvedTime {
  utcMs: number;
  /** Offset from UTC in seconds, east positive (CDT = -18000). */
  offsetSeconds: number;
}

export type Resolution =
  | { kind: 'exact'; result: ResolvedTime }
  | { kind: 'ambiguous'; earlier: ResolvedTime; later: ResolvedTime }
  | { kind: 'nonexistent'; before: ResolvedTime; after: ResolvedTime };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat {
  let f = fmtCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
    fmtCache.set(zone, f);
  }
  return f;
}

export function isValidZone(zone: string): boolean {
  try {
    formatter(zone);
    return true;
  } catch {
    return false;
  }
}

/** Offset (seconds, east positive) of `zone` at the UTC instant `utcMs`. */
export function zoneOffsetSeconds(zone: string, utcMs: number): number {
  const name = formatter(zone).formatToParts(utcMs).find((p) => p.type === 'timeZoneName')?.value ?? '';
  if (name === 'GMT') return 0;
  const m = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(name);
  if (!m) throw new Error(`Unrecognized offset "${name}" for zone ${zone}`);
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4] ?? 0));
}

/** Treat the wall-clock fields as if they were UTC. Handles years < 100 correctly. */
export function wallAsUtcMs(t: LocalDateTime): number {
  const d = new Date(0);
  d.setUTCFullYear(t.year, t.month - 1, t.day);
  d.setUTCHours(t.hour, t.minute, t.second ?? 0, 0);
  return d.getTime();
}

export function validateLocal(t: LocalDateTime): string | null {
  const ints: [string, number, number, number][] = [
    ['month', t.month, 1, 12],
    ['day', t.day, 1, 31],
    ['hour', t.hour, 0, 23],
    ['minute', t.minute, 0, 59],
    ['second', t.second ?? 0, 0, 59]
  ];
  if (!Number.isInteger(t.year) || t.year < -5000 || t.year > 5000) return 'year out of range';
  for (const [name, v, lo, hi] of ints) {
    if (!Number.isInteger(v) || v < lo || v > hi) return `${name} out of range`;
  }
  const ms = wallAsUtcMs(t);
  const d = new Date(ms);
  if (d.getUTCDate() !== t.day || d.getUTCMonth() !== t.month - 1) return 'no such date';
  return null;
}

/** Resolve a local wall time in an IANA zone to UTC, reporting DST gaps and overlaps. */
export function resolveLocal(t: LocalDateTime, zone: string): Resolution {
  const err = validateLocal(t);
  if (err) throw new Error(err);
  const wall = wallAsUtcMs(t);
  // Candidate offsets: whatever applies a day either side of the wall time covers any single transition.
  const offsets = new Set<number>([
    zoneOffsetSeconds(zone, wall - 86_400_000),
    zoneOffsetSeconds(zone, wall),
    zoneOffsetSeconds(zone, wall + 86_400_000)
  ]);
  const hits: ResolvedTime[] = [];
  for (const off of offsets) {
    const utcMs = wall - off * 1000;
    if (zoneOffsetSeconds(zone, utcMs) === off) hits.push({ utcMs, offsetSeconds: off });
  }
  hits.sort((a, b) => a.utcMs - b.utcMs);
  if (hits.length === 1) return { kind: 'exact', result: hits[0]! };
  if (hits.length >= 2) return { kind: 'ambiguous', earlier: hits[0]!, later: hits[hits.length - 1]! };
  // Gap: the wall time was skipped. Offer the instants interpreted with the offset before and after.
  const offBefore = zoneOffsetSeconds(zone, wall - 86_400_000);
  const offAfter = zoneOffsetSeconds(zone, wall + 86_400_000);
  return {
    kind: 'nonexistent',
    before: { utcMs: wall - offBefore * 1000, offsetSeconds: offBefore },
    after: { utcMs: wall - offAfter * 1000, offsetSeconds: offAfter }
  };
}

/** Julian Day (UT) from a UTC instant. Proleptic Gregorian, as JS Date is. */
export function julianDayUT(utcMs: number): number {
  return utcMs / 86_400_000 + 2_440_587.5;
}

export function utcMsFromJulianDay(jd: number): number {
  return Math.round((jd - 2_440_587.5) * 86_400_000);
}

export function formatOffset(seconds: number): string {
  const sign = seconds < 0 ? '−' : '+';
  const a = Math.abs(seconds);
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const s = a % 60;
  return `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}${s ? ':' + String(s).padStart(2, '0') : ''}`;
}

/** Local calendar date (Y-M-D) of a UTC instant in a zone. */
export function localDateIn(zone: string, utcMs: number): { year: number; month: number; day: number; hour: number; minute: number } {
  const off = zoneOffsetSeconds(zone, utcMs);
  const d = new Date(utcMs + off * 1000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
}

/** Whole days between two calendar dates (b - a), calendar-based so DST does not matter. */
export function daysBetween(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): number {
  const ms = (x: { year: number; month: number; day: number }) => wallAsUtcMs({ ...x, hour: 0, minute: 0 });
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}
