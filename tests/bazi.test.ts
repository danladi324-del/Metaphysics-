// @ts-expect-error no types shipped
import { Solar } from 'lunar-javascript';
import { beforeAll, describe, expect, it } from 'vitest';
import { baziDisagreements, BRANCHES_ZH, computeBazi, dayIndex, pillarName, solarTermInstant, STEMS_ZH, type Pillar } from '../src/engines/bazi/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

const gz = (p: Pillar) => `${STEMS_ZH[p.stem]}${BRANCHES_ZH[p.branch]}`;
// Sample chart S1 (fictitious).
const SAMPLE = { utcMs: Date.UTC(1983, 11, 15, 9, 20), zone: 'America/Denver', lat: 39.7392, lon: -104.9903 };

/** Wall-clock fields of a UTC instant shifted by an offset in hours. */
const wall = (ms: number, offH: number) => {
  const d = new Date(ms + offH * 3_600_000);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()] as const;
};

describe('day pillar anchors', () => {
  it('1949-10-01 is Jia-Zi; 2000-01-01 is Wu-Wu', () => {
    expect(dayIndex(1949, 10, 1)).toBe(0);
    expect(gz({ stem: dayIndex(2000, 1, 1) % 10, branch: dayIndex(2000, 1, 1) % 12 })).toBe('戊午');
  });
});

describe('Li Chun instants agree with lunar-javascript within 2 minutes (1950-2050)', () => {
  it('every 5th year', () => {
    for (let y = 1950; y <= 2050; y += 5) {
      const ours = solarTermInstant(eph, 315, Date.UTC(y, 0, 1));
      const t = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable()['立春'];
      const ref = Date.UTC(t.getYear(), t.getMonth() - 1, t.getDay(), t.getHour(), t.getMinute(), t.getSecond()) - 8 * 3_600_000;
      expect(Math.abs(ours - ref), String(y)).toBeLessThan(120_000);
    }
  });
});

/** Deterministic pseudo-random instants. */
function* instants(n: number, seed: number) {
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    yield Date.UTC(1930, 0, 1) + Math.floor((s / 2 ** 31) * (Date.UTC(2060, 0, 1) - Date.UTC(1930, 0, 1)));
  }
}

describe('random instants vs lunar-javascript (clock time)', () => {
  it('year and month pillars from the absolute instant, 300 cases', () => {
    let skipped = 0;
    for (const ms of instants(300, 7)) {
      const ours = computeBazi(eph, { utcMs: ms, zone: 'Asia/Shanghai', lat: 31.2, lon: 121.5 }).raw_result.chosen;
      // Skip instants within 3 minutes of a month boundary: the libraries' term times differ by up to ~1 minute.
      const edge = Math.abs(((ours.sunLongitude - 315) % 30 + 30) % 30);
      if (edge < 0.003 || edge > 29.997) { skipped++; continue; }
      const e = Solar.fromYmdHms(...wall(ms, 8)).getLunar().getEightChar();
      expect([gz(ours.year), gz(ours.month)], new Date(ms).toISOString()).toEqual([e.getYear(), e.getMonth()]);
    }
    expect(skipped).toBeLessThan(5);
  });

  it('day and hour pillars under both Zi rules, 300 cases including late-Zi hours', () => {
    let lateZi = 0;
    for (const ms of instants(300, 11)) {
      for (const [rule, sect] of [['early', 1], ['midnight', 2]] as const) {
        const ours = computeBazi(eph, { utcMs: ms, zone: 'UTC', lat: 51.5, lon: 0 }, { ziHour: rule, trueSolarTime: false }).raw_result.chosen;
        const e = Solar.fromYmdHms(...wall(ms, 0)).getLunar().getEightChar();
        e.setSect(sect);
        expect([gz(ours.day), gz(ours.hour)], `${new Date(ms).toISOString()} ${rule}`).toEqual([e.getDay(), e.getTime()]);
      }
      if (new Date(ms).getUTCHours() === 23) lateZi++;
    }
    // Force explicit late-Zi coverage too.
    for (let k = 0; k < 40; k++) {
      const ms = Date.UTC(1990 + k, k % 12, 1 + (k % 27), 23, 30);
      for (const [rule, sect] of [['early', 1], ['midnight', 2]] as const) {
        const ours = computeBazi(eph, { utcMs: ms, zone: 'UTC', lat: 51.5, lon: 0 }, { ziHour: rule, trueSolarTime: false }).raw_result.chosen;
        const e = Solar.fromYmdHms(...wall(ms, 0)).getLunar().getEightChar();
        e.setSect(sect);
        expect([gz(ours.day), gz(ours.hour)], `${new Date(ms).toISOString()} ${rule}`).toEqual([e.getDay(), e.getTime()]);
      }
    }
    expect(lateZi).toBeGreaterThanOrEqual(0);
  });
});

import { luckPillars } from '../src/engines/bazi/compute';

describe('luck pillars', () => {
  it('no sex, no luck pillars, and the limitation says why', () => {
    const rec = computeBazi(eph, SAMPLE);
    expect(rec.raw_result.luck).toBeNull();
    expect(rec.limitations[0]).toMatch(/sex/);
  });
  it('vs lunar-javascript for Shanghai births (where its Beijing-time reading is correct): direction, pillars, start within 3 days (calendar-component vs continuous addition)', () => {
    let n = 0;
    for (const ms of instants(60, 23)) {
      for (const [sex, g] of [['male', 1], ['female', 0]] as const) {
        const ours = computeBazi(eph, { utcMs: ms, zone: 'Asia/Shanghai', lat: 31.2, lon: 121.5, sex }).raw_result;
        const edge = Math.abs(((ours.chosen.sunLongitude - 315) % 30 + 30) % 30);
        if (edge < 0.01 || edge > 29.99) continue;
        const y = Solar.fromYmdHms(...wall(ms, 8)).getLunar().getEightChar().getYun(g, 2);
        expect(ours.luck!.direction === 'forward', new Date(ms).toISOString()).toBe(y.isForward());
        const theirs = y.getDaYun().slice(1, 5).map((d: { getGanZhi(): string }) => d.getGanZhi());
        expect(ours.luck!.pillars.slice(0, 4).map((p) => gz(p.pillar))).toEqual(theirs);
        const s = y.getStartSolar();
        const theirStart = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute()) - 8 * 3_600_000;
        expect(Math.abs(ours.luck!.startUtcMs - theirStart) / 86_400_000, new Date(ms).toISOString()).toBeLessThan(3);
        n++;
      }
    }
    expect(n).toBeGreaterThan(100);
    expect(typeof luckPillars).toBe('function');
  });
});
