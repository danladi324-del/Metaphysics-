export const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const;
export type Sign = (typeof SIGNS)[number];

export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

export function signIndex(lon: number): number {
  return Math.floor(norm360(lon) / 30) % 12;
}

export function signOf(lon: number): Sign {
  return SIGNS[signIndex(lon)]!;
}

/** "3°39′ Aries". Truncates (does not round) so a body at 29°59.9′ never displays as 30°. */
export function formatLongitude(lon: number, withSign = true): string {
  const l = norm360(lon);
  const inSign = l - signIndex(l) * 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}′${withSign ? ' ' + signOf(l) : ''}`;
}

/** Smallest angle between two longitudes, 0..180. */
export function separation(a: number, b: number): number {
  const d = Math.abs(norm360(a) - norm360(b));
  return d > 180 ? 360 - d : d;
}

/** House number (1-12) of a longitude given cusps[1..12]. */
export function houseOf(lon: number, cusps: number[]): number {
  const l = norm360(lon);
  for (let i = 1; i <= 12; i++) {
    const start = norm360(cusps[i]!);
    const end = norm360(cusps[i === 12 ? 1 : i + 1]!);
    const span = norm360(end - start);
    if (norm360(l - start) < span) return i;
  }
  return 12; // unreachable when cusps are valid
}

export function wholeSignHouse(lon: number, ascendant: number): number {
  return ((signIndex(lon) - signIndex(ascendant) + 12) % 12) + 1;
}
