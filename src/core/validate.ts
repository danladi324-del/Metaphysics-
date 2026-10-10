/** Input guards shared by engines: refuse malformed input with a readable error instead of computing garbage. */
export class InputError extends Error {
  override name = 'InputError';
}

export function assertInstant(ms: unknown, what = 'time'): asserts ms is number {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) throw new InputError(`${what} is not a valid instant`);
  // Swiss Ephemeris (Moshier) covers roughly -3000 to +3000; refuse beyond that rather than extrapolate.
  if (ms < Date.UTC(-3000, 0, 1) || ms > Date.UTC(3000, 0, 1)) throw new InputError(`${what} is outside the supported range (3000 BCE to 3000 CE)`);
}

export function assertLatLon(lat: unknown, lon: unknown): void {
  if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90) throw new InputError('latitude must be between -90 and 90');
  if (typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new InputError('longitude must be between -180 and 180');
}

export function assertBearing(b: unknown): void {
  if (typeof b !== 'number' || !Number.isFinite(b) || b < 0 || b >= 360) throw new InputError('bearing must be at least 0 and below 360 degrees');
}

export function assertYMD(d: { year: unknown; month: unknown; day: unknown }): void {
  const { year, month, day } = d;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) throw new InputError('date must have whole-number year, month and day');
  const x = new Date(0);
  x.setUTCFullYear(year as number, (month as number) - 1, day as number);
  if (x.getUTCMonth() !== (month as number) - 1 || x.getUTCDate() !== day) throw new InputError('no such date');
}
