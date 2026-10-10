import geomagnetism from 'geomagnetism';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { norm360 } from '../natal/zodiac';

export const FENGSHUI: EngineDescriptor = {
  engine: 'fengshui',
  version: '0.1.0',
  // Shares the solar-term input with BaZi (Li Chun sets the year for Kua and annual stars).
  input_dependencies: ['heading', 'place', 'date', 'solarTerms', 'birth.date']
};

export type Palace = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export const PALACES: Palace[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** The 24 mountains, 15° each, starting at 337.5° (Ren). Polarity per Xuan Kong: cardinal palaces + - -, intercardinal - + +. */
export const MOUNTAINS: { name: string; zh: string; palace: Palace; sub: 1 | 2 | 3; yang: boolean }[] = [
  ['Ren', '壬', 'N'], ['Zi', '子', 'N'], ['Gui', '癸', 'N'],
  ['Chou', '丑', 'NE'], ['Gen', '艮', 'NE'], ['Yin', '寅', 'NE'],
  ['Jia', '甲', 'E'], ['Mao', '卯', 'E'], ['Yi', '乙', 'E'],
  ['Chen', '辰', 'SE'], ['Xun', '巽', 'SE'], ['Si', '巳', 'SE'],
  ['Bing', '丙', 'S'], ['Wu', '午', 'S'], ['Ding', '丁', 'S'],
  ['Wei', '未', 'SW'], ['Kun', '坤', 'SW'], ['Shen', '申', 'SW'],
  ['Geng', '庚', 'W'], ['You', '酉', 'W'], ['Xin', '辛', 'W'],
  ['Xu', '戌', 'NW'], ['Qian', '乾', 'NW'], ['Hai', '亥', 'NW']
].map(([name, zh, palace], i) => {
  const sub = ((i % 3) + 1) as 1 | 2 | 3;
  const cardinal = ['N', 'E', 'S', 'W'].includes(palace!);
  return { name: name!, zh: zh!, palace: palace as Palace, sub, yang: cardinal ? sub === 1 : sub !== 1 };
});

export function mountainOf(bearing: number) {
  const i = Math.floor(norm360(bearing - 337.5) / 15) % 24;
  return { ...MOUNTAINS[i]!, index: i, start: norm360(337.5 + i * 15) };
}

/** True bearing from a magnetic one: true = magnetic + declination (east positive). WMM via the geomagnetism package. */
export function declination(lat: number, lon: number, date: Date): { degrees: number; model: string } {
  const m = geomagnetism.model(date);
  return { degrees: m.point([lat, lon]).decl, model: (m as unknown as { name?: string }).name ?? 'WMM' };
}

// ---------- Flying Star (Xuan Kong) ----------

/** Lo Shu home palace of each number 1-9 (5 = centre). */
export const HOME: Record<number, Palace | 'C'> = { 1: 'N', 2: 'SW', 3: 'E', 4: 'SE', 5: 'C', 6: 'NW', 7: 'W', 8: 'NE', 9: 'S' };
/** Flight path: centre, NW, W, NE, S, N, SW, E, SE. */
export const PATH: (Palace | 'C')[] = ['C', 'NW', 'W', 'NE', 'S', 'N', 'SW', 'E', 'SE'];
const OPPOSITE: Record<Palace, Palace> = { N: 'S', NE: 'SW', E: 'W', SE: 'NW', S: 'N', SW: 'NE', W: 'E', NW: 'SE' };

export type Grid = Record<Palace | 'C', number>;

/** Fly `centre` along the Lo Shu path, forward (+1) or reverse (-1). */
export function fly(centre: number, forward: boolean): Grid {
  const g = {} as Grid;
  PATH.forEach((p, i) => {
    const v = centre + (forward ? i : -i);
    g[p] = ((((v - 1) % 9) + 9) % 9) + 1;
  });
  return g;
}

/** Period for a date: 20-year periods; Period 9 = 2024-02-04 to 2044-02-04. */
export function periodOf(year: number): number {
  return ((Math.floor((year - 1864) / 20) % 9) + 9) % 9 + 1;
}

/** Annual star in the centre for a solar year (year starts at Li Chun). 2024 = 3, 2025 = 2, 2026 = 1. */
export function annualCentre(year: number): number {
  return ((((9 - ((year - 2000) % 9) - 1) % 9) + 9) % 9) + 1;
}

export interface FlyingStarChart {
  period: number;
  facing: { name: string; palace: Palace; degrees: number };
  sitting: { name: string; palace: Palace };
  base: Grid;
  mountain: Grid;
  water: Grid;
  mountainForward: boolean;
  waterForward: boolean;
  /** Within 3° of a palace edge or 1.5° of a mountain edge: replacement charts (Ti Gua) may apply and are not computed. */
  nearBoundary: boolean;
}

function direction(star: number, sitOrFace: { palace: Palace; sub: 1 | 2 | 3 }): boolean {
  // The star's own home palace supplies the polarity, at the same sub-mountain position. 5 uses the palace it sits in.
  const home = star === 5 ? sitOrFace.palace : (HOME[star] as Palace);
  const m = MOUNTAINS.find((x) => x.palace === home && x.sub === sitOrFace.sub)!;
  return m.yang;
}

export function flyingStar(facingBearing: number, period: number): FlyingStarChart {
  const f = mountainOf(facingBearing);
  const s = mountainOf(facingBearing + 180);
  const base = fly(period, true);
  const mStar = base[s.palace];
  const wStar = base[f.palace];
  const mountainForward = direction(mStar, s);
  const waterForward = direction(wStar, f);
  const inMountain = norm360(facingBearing - f.start);
  const inPalace = norm360(facingBearing - 337.5) % 45;
  return {
    period,
    facing: { name: f.name, palace: f.palace, degrees: Math.round(norm360(facingBearing) * 100) / 100 },
    sitting: { name: s.name, palace: s.palace },
    base,
    mountain: fly(mStar, mountainForward),
    water: fly(wStar, waterForward),
    mountainForward,
    waterForward,
    nearBoundary: inMountain < 1.5 || inMountain > 13.5 || inPalace < 3 || inPalace > 42
  };
}

// ---------- Eight Mansions ----------

export type Sex = 'male' | 'female';

/** Kua (Gua) number from the solar year (starting at Li Chun) and sex. 5 becomes 2 (male) or 8 (female). */
export function kua(solarYear: number, sex: Sex): number {
  let s = solarYear % 100;
  while (s > 9) s = Math.floor(s / 10) + (s % 10);
  let k: number;
  if (solarYear < 2000) k = sex === 'male' ? 10 - s : 5 + s;
  else k = sex === 'male' ? 9 - s : 6 + s;
  while (k > 9) k -= 9;
  if (k <= 0) k += 9;
  if (k === 5) k = sex === 'male' ? 2 : 8;
  return k;
}

/** Trigram lines [bottom, middle, top] at each palace (Later Heaven arrangement). */
const PALACE_TRIGRAM: Record<Palace, [number, number, number]> = {
  N: [0, 1, 0], S: [1, 0, 1], E: [1, 0, 0], W: [1, 1, 0], NE: [0, 0, 1], SW: [0, 0, 0], NW: [1, 1, 1], SE: [0, 1, 1]
};

/** The eight stars and the lines each one changes in the Kua's own trigram (the Da You Nian rule). */
export const STARS: { name: string; good: boolean; change: [number, number, number] }[] = [
  { name: 'Sheng Qi', good: true, change: [0, 0, 1] },
  { name: 'Tian Yi', good: true, change: [1, 1, 0] },
  { name: 'Yan Nian', good: true, change: [1, 1, 1] },
  { name: 'Fu Wei', good: true, change: [0, 0, 0] },
  { name: 'Huo Hai', good: false, change: [1, 0, 0] },
  { name: 'Wu Gui', good: false, change: [0, 1, 1] },
  { name: 'Liu Sha', good: false, change: [1, 0, 1] },
  { name: 'Jue Ming', good: false, change: [0, 1, 0] }
];

export function eightMansions(k: number): { star: string; good: boolean; palace: Palace }[] {
  if (k === 5) throw new Error('Kua 5 is replaced by 2 or 8 before lookup');
  const own = HOME[k] as Palace;
  const t = PALACE_TRIGRAM[own];
  return STARS.map((s) => {
    const target = t.map((b, i) => b ^ s.change[i]!) as [number, number, number];
    const palace = PALACES.find((p) => PALACE_TRIGRAM[p].every((b, i) => b === target[i]))!;
    return { star: s.name, good: s.good, palace };
  });
}

export const group = (k: number) => ([1, 3, 4, 9].includes(k) ? 'East' : 'West');

// ---------- Record ----------

export interface FengShuiResult {
  magneticBearing: number | null;
  trueBearing: number;
  declination: { degrees: number; model: string };
  mountain: { name: string; zh: string; palace: Palace };
  flyingStar: FlyingStarChart;
  annual: Grid & { year: number };
  kua: { male: number; female: number; solarYear: number };
}

export interface FengShuiInputs {
  /** Bearing the front door / facing side points to. Exactly one of magnetic or true is the measured value. */
  bearing: number;
  north: 'magnetic' | 'true';
  lat: number;
  lon: number;
  dateMs: number;
  /** Year the building was completed or occupied, for its period. */
  builtYear: number;
  /** Solar year (Li Chun start) of birth and of the annual chart. */
  birthSolarYear: number;
  currentSolarYear: number;
}

export function computeFengShui(inp: FengShuiInputs, now = new Date()): CalcRecord<FengShuiResult> {
  const decl = declination(inp.lat, inp.lon, new Date(inp.dateMs));
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const trueBearing = inp.north === 'true' ? norm360(inp.bearing) : norm360(inp.bearing + decl.degrees);
  const magnetic = inp.north === 'magnetic' ? norm360(inp.bearing) : norm360(inp.bearing - decl.degrees);
  const fs = flyingStar(trueBearing, periodOf(inp.builtYear));
  const m = mountainOf(trueBearing);
  const lim: string[] = [];
  if (fs.nearBoundary) lim.push('Facing is near a mountain or palace edge: replacement charts (Ti Gua) may apply and are not computed. Re-measure.');
  lim.push('Period uses the calendar year built; a build or move-in before 4 February belongs to the previous solar year.');
  return makeRecord(
    FENGSHUI,
    { ...inp },
    { flyingStar: 'Xuan Kong, no replacement stars', reference: 'true north for charts', declinationModel: decl.model, eightMansions: 'Da You Nian line changes' },
    {
      magneticBearing: r2(magnetic),
      trueBearing: r2(trueBearing),
      declination: { degrees: r2(decl.degrees), model: decl.model },
      mountain: { name: m.name, zh: m.zh, palace: m.palace },
      flyingStar: fs,
      annual: { ...fly(annualCentre(inp.currentSolarYear), true), year: inp.currentSolarYear },
      kua: { male: kua(inp.birthSolarYear, 'male'), female: kua(inp.birthSolarYear, 'female'), solarYear: inp.birthSolarYear }
    },
    lim,
    now
  );
}

export { OPPOSITE };
