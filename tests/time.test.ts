import { describe, expect, it } from 'vitest';
import { daysBetween, formatOffset, julianDayUT, resolveLocal, validateLocal, zoneOffsetSeconds } from '../src/core/time';

describe('resolveLocal', () => {
  it("1974 US emergency DST puts a February 10:30 in America/Chicago at UTC-5, not -6", () => {
    const r = resolveLocal({ year: 1974, month: 2, day: 10, hour: 10, minute: 30 }, 'America/Chicago');
    expect(r.kind).toBe('exact');
    if (r.kind !== 'exact') return;
    expect(r.result.offsetSeconds).toBe(-5 * 3600);
    expect(new Date(r.result.utcMs).toISOString()).toBe('1974-02-10T15:30:00.000Z');
  });

  it('the same date one year later was standard time (emergency DST began 1975-02-23)', () => {
    expect(zoneOffsetSeconds('America/Chicago', Date.UTC(1975, 1, 1, 12))).toBe(-6 * 3600);
    expect(zoneOffsetSeconds('America/Chicago', Date.UTC(1975, 2, 1, 12))).toBe(-5 * 3600);
  });

  it('spring-forward gap is reported as nonexistent with both readings', () => {
    const r = resolveLocal({ year: 2021, month: 3, day: 14, hour: 2, minute: 30 }, 'America/Chicago');
    expect(r.kind).toBe('nonexistent');
    if (r.kind !== 'nonexistent') return;
    expect(r.before.offsetSeconds).toBe(-6 * 3600);
    expect(r.after.offsetSeconds).toBe(-5 * 3600);
  });

  it('fall-back overlap is reported as ambiguous, earlier first', () => {
    const r = resolveLocal({ year: 2021, month: 11, day: 7, hour: 1, minute: 30 }, 'America/Chicago');
    expect(r.kind).toBe('ambiguous');
    if (r.kind !== 'ambiguous') return;
    expect(r.earlier.offsetSeconds).toBe(-5 * 3600);
    expect(r.later.offsetSeconds).toBe(-6 * 3600);
    expect(r.later.utcMs - r.earlier.utcMs).toBe(3600_000);
  });

  it('local mean time before 1883 keeps its seconds', () => {
    const r = resolveLocal({ year: 1850, month: 1, day: 1, hour: 12, minute: 0 }, 'America/Chicago');
    expect(r.kind).toBe('exact');
    if (r.kind === 'exact') expect(formatOffset(r.result.offsetSeconds)).toBe('UTC−05:50:36');
  });

  it('midnight birth resolves to the stated calendar day', () => {
    const r = resolveLocal({ year: 1990, month: 1, day: 1, hour: 0, minute: 0 }, 'Europe/London');
    expect(r.kind === 'exact' && new Date(r.result.utcMs).toISOString()).toBe('1990-01-01T00:00:00.000Z');
  });

  it('leap day exists in 2000 and not in 1900', () => {
    expect(validateLocal({ year: 2000, month: 2, day: 29, hour: 12, minute: 0 })).toBeNull();
    expect(validateLocal({ year: 1900, month: 2, day: 29, hour: 12, minute: 0 })).toBe('no such date');
    expect(() => resolveLocal({ year: 1900, month: 2, day: 29, hour: 12, minute: 0 }, 'UTC')).toThrow();
  });

  it('rejects out-of-range fields', () => {
    expect(validateLocal({ year: 2000, month: 13, day: 1, hour: 0, minute: 0 })).toMatch(/month/);
    expect(validateLocal({ year: 2000, month: 1, day: 1, hour: 24, minute: 0 })).toMatch(/hour/);
  });

  it('years below 100 are not shifted to 19xx', () => {
    const r = resolveLocal({ year: 50, month: 6, day: 1, hour: 0, minute: 0 }, 'UTC');
    expect(r.kind === 'exact' && new Date(r.result.utcMs).getUTCFullYear()).toBe(50);
  });

  it('half-hour zones', () => {
    const r = resolveLocal({ year: 2020, month: 6, day: 1, hour: 12, minute: 0 }, 'Asia/Kolkata');
    expect(r.kind === 'exact' && r.result.offsetSeconds).toBe(19800);
  });
});

describe('julian day', () => {
  it('J2000.0 epoch', () => {
    expect(julianDayUT(Date.UTC(2000, 0, 1, 12))).toBe(2451545);
  });
  it('days between dates across DST', () => {
    expect(daysBetween({ year: 1983, month: 12, day: 15 }, { year: 2026, month: 10, day: 10 })).toBe(15640);
  });
});
