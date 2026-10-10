import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';

export const ICHING: EngineDescriptor = {
  engine: 'iching',
  version: '0.1.0',
  input_dependencies: ['random']
};

export type Method = 'threeCoins' | 'yarrow';
export type LineValue = 6 | 7 | 8 | 9; // 6 old yin (changing), 7 young yang, 8 young yin, 9 old yang (changing)

/**
 * Probabilities out of 16. Three coins: 6 = 1/8, 7 = 3/8, 8 = 3/8, 9 = 1/8.
 * Yarrow stalks: 6 = 1/16, 7 = 5/16, 8 = 7/16, 9 = 3/16.
 */
export const WEIGHTS: Record<Method, Record<LineValue, number>> = {
  threeCoins: { 6: 2, 7: 6, 8: 6, 9: 2 },
  yarrow: { 6: 1, 7: 5, 8: 7, 9: 3 }
};

/** Trigrams as [bottom, middle, top], 1 = yang. */
export const TRIGRAMS = {
  qian: [1, 1, 1], dui: [1, 1, 0], li: [1, 0, 1], zhen: [1, 0, 0],
  xun: [0, 1, 1], kan: [0, 1, 0], gen: [0, 0, 1], kun: [0, 0, 0]
} as const;
export type Trigram = keyof typeof TRIGRAMS;
const T_ORDER: Trigram[] = ['qian', 'zhen', 'kan', 'gen', 'kun', 'xun', 'li', 'dui'];

/** King Wen number by [upper][lower], both in T_ORDER (qian, zhen, kan, gen, kun, xun, li, dui). */
const KING_WEN: number[][] = [
  [1, 25, 6, 33, 12, 44, 13, 10],
  [34, 51, 40, 62, 16, 32, 55, 54],
  [5, 3, 29, 39, 8, 48, 63, 60],
  [26, 27, 4, 52, 23, 18, 22, 41],
  [11, 24, 7, 15, 2, 46, 36, 19],
  [9, 42, 59, 53, 20, 57, 37, 61],
  [14, 21, 64, 56, 35, 50, 30, 38],
  [43, 17, 47, 31, 45, 28, 49, 58]
];

/** Pinyin names (romanised titles; facts, not translations). */
export const NAMES = [
  'Qian', 'Kun', 'Zhun', 'Meng', 'Xu', 'Song', 'Shi', 'Bi', 'Xiao Chu', 'Lü', 'Tai', 'Pi', 'Tong Ren', 'Da You', 'Qian', 'Yu',
  'Sui', 'Gu', 'Lin', 'Guan', 'Shi He', 'Bi', 'Bo', 'Fu', 'Wu Wang', 'Da Chu', 'Yi', 'Da Guo', 'Kan', 'Li', 'Xian', 'Heng',
  'Dun', 'Da Zhuang', 'Jin', 'Ming Yi', 'Jia Ren', 'Kui', 'Jian', 'Jie', 'Sun', 'Yi', 'Guai', 'Gou', 'Cui', 'Sheng', 'Kun', 'Jing',
  'Ge', 'Ding', 'Zhen', 'Gen', 'Jian', 'Gui Mei', 'Feng', 'Lü', 'Xun', 'Dui', 'Huan', 'Jie', 'Zhong Fu', 'Xiao Guo', 'Ji Ji', 'Wei Ji'
];

function trigramOf(lines: readonly number[]): Trigram {
  return (Object.keys(TRIGRAMS) as Trigram[]).find((t) => TRIGRAMS[t].every((b, i) => b === lines[i]))!;
}

/** King Wen number of six lines (bottom first, 1 = yang). */
export function hexagramNumber(lines: readonly number[]): number {
  if (lines.length !== 6) throw new Error('need six lines');
  const lower = trigramOf(lines.slice(0, 3));
  const upper = trigramOf(lines.slice(3, 6));
  return KING_WEN[T_ORDER.indexOf(upper)]![T_ORDER.indexOf(lower)]!;
}

/** Lines (bottom first) of a King Wen number. */
export function linesOf(n: number): number[] {
  for (const u of T_ORDER) for (const l of T_ORDER) if (KING_WEN[T_ORDER.indexOf(u)]![T_ORDER.indexOf(l)] === n) return [...TRIGRAMS[l], ...TRIGRAMS[u]];
  throw new Error(`no hexagram ${n}`);
}

/** Map a uniform integer 0..15 to a line value under the method's weights. */
export function lineFromDraw(draw: number, method: Method): LineValue {
  let acc = 0;
  for (const v of [6, 7, 8, 9] as LineValue[]) {
    acc += WEIGHTS[method][v];
    if (draw < acc) return v;
  }
  throw new Error('draw out of range');
}

export interface CastResult {
  method: Method;
  draws: number[]; // raw 0..15 values, bottom line first: the cast can be replayed
  lines: LineValue[];
  primary: { number: number; name: string };
  changing: number[]; // line positions 1..6
  relating: { number: number; name: string } | null;
}

export function castFromDraws(draws: number[], method: Method): CastResult {
  if (draws.length !== 6 || draws.some((d) => !Number.isInteger(d) || d < 0 || d > 15)) throw new Error('six draws in 0..15 required');
  const lines = draws.map((d) => lineFromDraw(d, method));
  const primaryBits = lines.map((v) => (v === 7 || v === 9 ? 1 : 0));
  const relatingBits = lines.map((v) => (v === 7 || v === 6 ? 1 : 0));
  const changing = lines.flatMap((v, i) => (v === 6 || v === 9 ? [i + 1] : []));
  const p = hexagramNumber(primaryBits);
  const r = hexagramNumber(relatingBits);
  return {
    method,
    draws,
    lines,
    primary: { number: p, name: NAMES[p - 1]! },
    changing,
    relating: changing.length ? { number: r, name: NAMES[r - 1]! } : null
  };
}

/** Six uniform draws in 0..15 from the platform CSPRNG. */
export function randomDraws(): number[] {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x & 15);
}

export function computeCast(method: Method, draws: number[] = randomDraws(), question = '', now = new Date()): CalcRecord<CastResult> {
  return makeRecord(ICHING, { draws, question }, { method, randomness: 'crypto.getRandomValues, low 4 bits per line' }, castFromDraws(draws, method), [], now);
}
