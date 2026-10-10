import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { computeQimen, JU, qimenChart, qimenDisagreements, TERMS, yuanFromFuHead } from '../src/engines/qimen/compute';
import { nodeEphemeris } from './helpers/ephemeris';

const require = createRequire(import.meta.url);
let eph: Ephemeris;
let wasm: { calculate(o: object): WasmChart };
beforeAll(async () => {
  eph = await nodeEphemeris();
  const dir = dirname(require.resolve('@spensercai/qimen-wasm/package.json'));
  const mod = await import(join(dir, 'qimen_wasm.js'));
  await mod.default({ module_or_path: readFileSync(join(dir, 'qimen_wasm_bg.wasm')) });
  wasm = mod;
});

interface WasmChart {
  dun: string; yuan: string; ju: number;
  calendar: { solar_term: { name: string } };
  leaders: { star: string; door: string; original_palace: number; star_palace: number; door_palace: number };
  palaces: { number: number; earth_stem: string | null; heaven_stems: { stem: string }[]; stars: string[]; door: string | null; deity: string | null }[];
}

const STEM: Record<string, string> = { jia: '甲', yi: '乙', bing: '丙', ding: '丁', wu: '戊', ji: '己', geng: '庚', xin: '辛', ren: '壬', gui: '癸' };
const STAR: Record<string, string> = { tian_peng: '天蓬', tian_rui: '天芮', tian_chong: '天冲', tian_fu: '天辅', tian_qin: '天禽', tian_xin: '天心', tian_zhu: '天柱', tian_ren: '天任', tian_ying: '天英' };
const DOOR: Record<string, string> = { xiu: '休门', si: '死门', shang: '伤门', du: '杜门', kai: '开门', jing: '惊门', sheng: '生门', scene: '景门' };
const DEITY: Record<string, string> = { zhi_fu: '值符', teng_she: '螣蛇', tai_yin: '太阴', liu_he: '六合', bai_hu: '白虎', xuan_wu: '玄武', jiu_di: '九地', jiu_tian: '九天' };

/** Deterministic instants 1950-2049. */
function* instants(n: number, seed: number) {
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    yield Date.UTC(1950, 0, 1) + Math.floor((s / 2 ** 31) * (Date.UTC(2049, 0, 1) - Date.UTC(1950, 0, 1)));
  }
}

describe('Qi Men tables', () => {
  it('24 terms, Ju table matches the mnemonic pairs', () => {
    expect(TERMS.length).toBe(24);
    // 冬至 = 惊蛰, 大寒 = 春分, 清明 = 立夏, 谷雨 = 小满 (yang); 夏至 = 白露, 大暑 = 秋分, 寒露 = 立冬, 霜降 = 小雪 (yin)
    const same = (a: string, b: string) => expect(JU[TERMS.indexOf(a as never)]).toEqual(JU[TERMS.indexOf(b as never)]);
    same('冬至', '惊蛰'); same('大寒', '春分'); same('清明', '立夏'); same('谷雨', '小满');
    same('夏至', '白露'); same('大暑', '秋分'); same('寒露', '立冬'); same('霜降', '小雪');
    // Each term's three Ju step by -3 (mod 9) in yang dun and +3 in yin dun.
    JU.forEach((j, k) => {
      const d = k < 12 ? 6 : 3;
      expect(((j[0] - 1 + d) % 9) + 1, TERMS[k]).toBe(j[1]);
      expect(((j[1] - 1 + d) % 9) + 1, TERMS[k]).toBe(j[2]);
    });
  });
  it('fu head yuan: 甲子 upper, 甲寅 middle, 甲戌 lower; 戊寅 (index 14) sits under 甲戌', () => {
    expect(yuanFromFuHead(0)).toBe(0);
    expect(yuanFromFuHead(50)).toBe(1);
    expect(yuanFromFuHead(14)).toBe(2);
  });
});

describe('Chai Bu chart vs qimen-wasm (independent Rust implementation), 300 random hours at UTC+8', () => {
  it('everything matches away from solar-term boundaries', () => {
    let checked = 0;
    for (const ms of instants(300, 5)) {
      const inp = { utcMs: ms, zone: 'Etc/GMT-8', lat: 31.2, lon: 121.5 };
      const ours = qimenChart(eph, inp, 'fuHead');
      if (Math.abs(ms - ours.termStartUtcMs) < 3_600_000) continue;
      const d = new Date(ms + 8 * 3_600_000);
      const w = wasm.calculate({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), utc_offset_minutes: 480, day_boundary: 'zi_start' });
      const tag = `${d.toISOString().slice(0, 16)} (+8)`;
      expect([ours.dun, ours.term, ours.yuan, ours.ju], tag).toEqual([w.dun, w.calendar.solar_term.name, w.yuan, w.ju]);
      expect([ours.leader.originalPalace, ours.leader.starPalace, ours.leader.doorPalace], tag).toEqual([w.leaders.original_palace, w.leaders.star_palace, w.leaders.door_palace]);
      expect([ours.leader.star, ours.leader.door], tag).toEqual([STAR[w.leaders.star], DOOR[w.leaders.door]]);
      for (const wp of w.palaces) {
        const op = ours.palaces.find((p) => p.number === wp.number)!;
        expect(op.earthStem, `${tag} palace ${wp.number} earth`).toBe(STEM[wp.earth_stem!]);
        if (wp.number === 5) continue;
        expect(op.heavenStems.slice().sort(), `${tag} palace ${wp.number} heaven`).toEqual(wp.heaven_stems.map((h) => STEM[h.stem]).sort());
        expect(op.stars.slice().sort(), `${tag} palace ${wp.number} stars`).toEqual(wp.stars.map((s) => STAR[s]).sort());
        expect(op.deity, `${tag} palace ${wp.number} deity`).toBe(DEITY[wp.deity!]);
        expect(op.door, `${tag} palace ${wp.number} door`).toBe(DOOR[wp.door!]);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(280);
  });
});

describe('competing yuan rule (days since the term) vs qimen-dunjia, 300 random whole hours at UTC+8', () => {
  it('Ju and dun match away from boundaries', async () => {
    const qd = await import('qimen-dunjia');
    let checked = 0;
    for (const raw of instants(300, 17)) {
      const ms = Math.floor(raw / 3_600_000) * 3_600_000;
      const ours = qimenChart(eph, { utcMs: ms, zone: 'Etc/GMT-8', lat: 31.2, lon: 121.5 }, 'elapsed');
      const sinceTerm = (ms - ours.termStartUtcMs) / 86_400_000;
      if (sinceTerm < 0.05 || Math.abs(sinceTerm - 5) < 0.05 || Math.abs(sinceTerm - 10) < 0.05) continue;
      const d = new Date(ms + 8 * 3_600_000);
      const key = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}${String(d.getUTCHours()).padStart(2, '0')}`;
      const c = qd.chartToObject(qd.generateChartByDatetime(key, { 定局法: '拆補' }));
      expect([ours.ju, ours.dun === 'yang' ? '陽' : '陰'], key).toEqual([c['局數'], c['陰陽']]);
      checked++;
    }
    expect(checked).toBeGreaterThan(280);
  });

  it('the two Chai Bu yuan rules are logged when they differ (2024-01-15 10:00 +8: Ju 5 vs Ju 8)', () => {
    const rec = computeQimen(eph, { utcMs: Date.UTC(2024, 0, 15, 2), zone: 'Etc/GMT-8', lat: 31.2, lon: 121.5 });
    expect(rec.raw_result.chosen.ju).toBe(5);
    expect(rec.raw_result.alternative.ju).toBe(8);
    expect(qimenDisagreements(rec, null)[0]!.cause).toBe('convention: yuan rule within Chai Bu');
  });
});
