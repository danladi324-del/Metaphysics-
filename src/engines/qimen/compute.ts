import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { assertInstant, assertLatLon } from '../../core/validate';
import { chart as pillarsAt, solarTermInstant, type BaziConventions, type Pillar } from '../bazi/compute';
import type { Ephemeris } from '../natal/ephemeris';
import { norm360 } from '../natal/zodiac';

/**
 * Qi Men Dun Jia, hour chart (shi jia), rotating plate (zhuan pan). EXPERIMENTAL (brief §4.8).
 * School: Chai Bu (D-027). The Ju comes from the solar term at the instant and the yuan from the day's fu head.
 * Competing yuan rule computed alongside: elapsed time since the term in 5-day blocks (the rule qimen-dunjia calls 拆補).
 * Shares the solar-term and pillar input with BaZi (rule 6).
 */
export const QIMEN: EngineDescriptor = {
  engine: 'qimen',
  version: '0.1.0',
  input_dependencies: ['date', 'place', 'solarTerms', 'ephemeris.swiss']
};

export const TERMS = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'] as const;

/** Ju numbers [upper, middle, lower] per solar term, from the 歌诀 (冬至惊蛰一七四 …). */
export const JU: [number, number, number][] = [
  [1, 7, 4], [2, 8, 5], [3, 9, 6], [8, 5, 2], [9, 6, 3], [1, 7, 4], [3, 9, 6], [4, 1, 7], [5, 2, 8], [4, 1, 7], [5, 2, 8], [6, 3, 9],
  [9, 3, 6], [8, 2, 5], [7, 1, 4], [2, 5, 8], [1, 4, 7], [9, 3, 6], [7, 1, 4], [6, 9, 3], [5, 8, 2], [6, 9, 3], [5, 8, 2], [4, 7, 1]
];

/** Three wonders and six instruments, in earth-plate order. Index into STEMS_ZH: 戊己庚辛壬癸丁丙乙. */
export const EARTH_ORDER = [4, 5, 6, 7, 8, 9, 3, 2, 1] as const;
const STEMS_ZH = '甲乙丙丁戊己庚辛壬癸';

export const STARS = ['', '天蓬', '天芮', '天冲', '天辅', '天禽', '天心', '天柱', '天任', '天英'] as const; // by original palace
export const DOORS = ['', '休门', '死门', '伤门', '杜门', '', '开门', '惊门', '生门', '景门'] as const; // by original palace
/** Eight deities from the leader's palace: clockwise in yang dun, counter-clockwise in yin dun. */
export const DEITIES = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'] as const;
/** Outer palaces clockwise from north. */
export const RING = [1, 8, 3, 4, 9, 2, 7, 6] as const;
export const PALACE_DIR: Record<number, string> = { 1: 'N', 8: 'NE', 3: 'E', 4: 'SE', 9: 'S', 2: 'SW', 7: 'W', 6: 'NW', 5: 'C' };

export type YuanRule = 'fuHead' | 'elapsed';
const YUAN = ['upper', 'middle', 'lower'] as const;

export interface QimenPalace {
  number: number;
  direction: string;
  earthStem: string;
  heavenStems: string[];
  stars: string[];
  door: string | null;
  deity: string | null;
}

export interface QimenChart {
  dun: 'yang' | 'yin';
  term: string;
  termStartUtcMs: number;
  yuan: 'upper' | 'middle' | 'lower';
  ju: number;
  dayPillar: Pillar;
  hourPillar: Pillar;
  xunHead: string; // e.g. 甲寅
  hiddenStem: string; // the instrument the Jia hides under
  leader: { star: string; door: string; originalPalace: number; starPalace: number; doorPalace: number };
  palaces: QimenPalace[];
}

const step = (p: number, n: number) => ((((p - 1 + n) % 9) + 9) % 9) + 1; // Lo Shu numeric sequence, 5 included
const lodge = (p: number) => (p === 5 ? 2 : p); // centre lodges in Kun
const ringIdx = (p: number) => RING.indexOf(lodge(p) as (typeof RING)[number]);
const idxOf = (p: Pillar) => {
  let i = 0;
  while (i % 10 !== p.stem || i % 12 !== p.branch) i++;
  return i;
};

export function yuanFromFuHead(dayIndex: number): 0 | 1 | 2 {
  const head = dayIndex - (dayIndex % 5); // most recent Jia or Ji day
  const b = head % 12;
  if ([0, 6, 3, 9].includes(b)) return 0; // 子午卯酉
  if ([2, 8, 5, 11].includes(b)) return 1; // 寅申巳亥
  return 2; // 辰戌丑未
}

export function qimenChart(eph: Ephemeris, inp: { utcMs: number; zone: string; lat: number; lon: number }, rule: YuanRule = 'fuHead', pillarConv: BaziConventions = { ziHour: 'early', trueSolarTime: false }): QimenChart {
  assertInstant(inp.utcMs);
  assertLatLon(inp.lat, inp.lon);
  const p = pillarsAt(eph, inp, pillarConv);
  const k = Math.floor(norm360(p.sunLongitude - 270) / 15);
  const termLon = norm360(270 + k * 15);
  const termStart = solarTermInstant(eph, termLon, inp.utcMs - 17 * 86_400_000);
  const dun = k < 12 ? 'yang' : 'yin';
  const dir = dun === 'yang' ? 1 : -1;
  const yi = rule === 'fuHead' ? yuanFromFuHead(idxOf(p.day)) : (Math.min(2, Math.floor((inp.utcMs - termStart) / (5 * 86_400_000))) as 0 | 1 | 2);
  const ju = JU[k]![yi]!;

  // Earth plate: 戊己庚辛壬癸丁丙乙 from the Ju palace, forward (yang) or backward (yin).
  const earth: number[] = new Array(10).fill(-1);
  EARTH_ORDER.forEach((s, i) => (earth[step(ju, i * dir)] = s));
  const palaceOfStem = (s: number) => earth.findIndex((x) => x === s);

  // Leader: the hour's decade (xun) head hides under an instrument.
  const hi = idxOf(p.hour);
  const xunStart = hi - (hi % 10);
  const hidden = [4, 5, 6, 7, 8, 9][xunStart / 10]!; // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸
  const leadOrig = palaceOfStem(hidden);
  const leadStar = STARS[lodge(leadOrig)] === '天芮' && leadOrig === 5 ? '天禽' : STARS[lodge(leadOrig)]!;
  const leadDoor = DOORS[lodge(leadOrig)]!;

  // Stars and heaven stems rotate so the leader star sits over the hour stem (Jia hours use the hidden instrument).
  const hourStem = p.hour.stem === 0 ? hidden : p.hour.stem;
  const target = lodge(palaceOfStem(hourStem));
  const shift = ringIdx(target) - ringIdx(leadOrig);
  const palaces = new Map<number, QimenPalace>();
  for (let n = 1; n <= 9; n++) palaces.set(n, { number: n, direction: PALACE_DIR[n]!, earthStem: STEMS_ZH[earth[n]!]!, heavenStems: [], stars: [], door: null, deity: null });
  RING.forEach((src, i) => {
    const dst = RING[(((i + shift) % 8) + 8) % 8]!;
    const pal = palaces.get(dst)!;
    pal.stars.push(STARS[src]!);
    pal.heavenStems.push(STEMS_ZH[earth[src]!]!);
    if (src === 2) {
      // Tian Qin and the centre's instrument travel with Tian Rui (centre lodged in Kun).
      pal.stars.push(STARS[5]);
      pal.heavenStems.push(STEMS_ZH[earth[5]!]!);
    }
  });

  // Doors: the leader door moves one Lo Shu palace per hour from the xun head hour, then the eight doors rotate.
  const doorRaw = step(leadOrig, (hi - xunStart) * dir);
  const doorPalace = lodge(doorRaw);
  const dshift = ringIdx(doorPalace) - ringIdx(leadOrig);
  RING.forEach((src, i) => {
    palaces.get(RING[(((i + dshift) % 8) + 8) % 8]!)!.door = DOORS[src]!;
  });

  // Deities from the leader star's palace.
  const di = ringIdx(target);
  DEITIES.forEach((d, n) => {
    palaces.get(RING[(((di + n * dir) % 8) + 8) % 8]!)!.deity = d;
  });

  return {
    dun,
    term: TERMS[k]!,
    termStartUtcMs: termStart,
    yuan: YUAN[yi]!,
    ju,
    dayPillar: p.day,
    hourPillar: p.hour,
    xunHead: `甲${'子丑寅卯辰巳午未申酉戌亥'[xunStart % 12]}`,
    hiddenStem: STEMS_ZH[hidden]!,
    leader: { star: leadStar, door: leadDoor, originalPalace: leadOrig, starPalace: target, doorPalace },
    palaces: [...palaces.values()]
  };
}

export interface QimenResult {
  chosen: QimenChart;
  rule: YuanRule;
  /** Ju under the competing yuan rule; a ledger row is written when it differs. */
  alternative: { rule: YuanRule; yuan: string; ju: number };
}

export function computeQimen(eph: Ephemeris, inp: { utcMs: number; zone: string; lat: number; lon: number }, now = new Date()): CalcRecord<QimenResult> {
  const chosen = qimenChart(eph, inp, 'fuHead');
  const alt = qimenChart(eph, inp, 'elapsed');
  return makeRecord(
    QIMEN,
    { ...inp },
    {
      school: 'Chai Bu (yuan from the day fu head)',
      method: 'hour chart, rotating plate',
      centre: 'lodged in Kun (2); Tian Qin travels with Tian Rui',
      deities: '值符 螣蛇 太阴 六合 白虎 玄武 九地 九天 (yin and yang alike)',
      dayBoundary: '23:00 (early Zi)',
      pillars: 'clock time in the zone'
    },
    { chosen, rule: 'fuHead', alternative: { rule: 'elapsed', yuan: alt.yuan, ju: alt.ju } },
    [
      'Experimental module. School chosen for coherence (D-027), not checked against the old app.',
      'Zhi Run (fu-head cycles with intercalation) is not computed yet.',
      'Some schools name the fifth and sixth deities 勾陈 and 朱雀 in yang dun; positions are the same.'
    ],
    now
  );
}

export function qimenDisagreements(rec: CalcRecord<QimenResult>, profileId: string | null): Disagreement[] {
  const c = rec.raw_result.chosen;
  const a = rec.raw_result.alternative;
  if (c.ju === a.ju && c.yuan === a.yuan) return [];
  return [
    {
      id: `${rec.id}:yuan`,
      kind: 'calculation',
      subject: 'Qi Men Ju',
      result_a: `Fu-head yuan (Chai Bu): ${c.yuan}, Ju ${c.ju}`,
      result_b: `Days since ${c.term}: ${a.yuan}, Ju ${a.ju}`,
      cause: 'convention: yuan rule within Chai Bu',
      created_at: rec.computed_at,
      profile_id: profileId,
      engine: 'qimen',
      record_id: rec.id
    }
  ];
}
