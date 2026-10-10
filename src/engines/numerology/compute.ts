import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';

export const NUMEROLOGY: EngineDescriptor = {
  engine: 'numerology',
  version: '0.1.0',
  input_dependencies: ['birth.date', 'name']
};

export type System = 'pythagorean' | 'chaldean';

/** Pythagorean letter values: A-I = 1-9 repeating. Attributed to Balliett's system (SOURCES: balliett). */
export const PYTHAGOREAN: Record<string, number> = Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c, i) => [c, (i % 9) + 1]));

/** Chaldean letter values as given by Cheiro (SOURCES: cheiro). No letter takes 9. */
export const CHALDEAN: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 8, G: 3, H: 5, I: 1, J: 1, K: 2, L: 3, M: 4,
  N: 5, O: 7, P: 8, Q: 1, R: 2, S: 3, T: 4, U: 6, V: 6, W: 6, X: 5, Y: 1, Z: 7
};

export const MASTER = [11, 22, 33] as const;
export const KARMIC_DEBT = [13, 14, 16, 19] as const;

export interface NumerologyConventions {
  /** Keep 11/22/33 unreduced, or reduce to one digit. */
  masterNumbers: 'keep' | 'reduce';
  /** How Y is classed for Soul Urge / Personality. */
  yRule: 'consonant' | 'vowel' | 'vowelIfNoAdjacentVowel';
  /** Pinnacle age break: 36 minus the single-digit Life Path (masters reduced first). */
  firstPinnacleRule: '36-minus-reduced-life-path';
}

export const DEFAULT_NUMEROLOGY: NumerologyConventions = {
  masterNumbers: 'keep',
  yRule: 'vowelIfNoAdjacentVowel',
  firstPinnacleRule: '36-minus-reduced-life-path'
};

export interface Reduction {
  /** Unreduced sum that was reduced (the "compound" number). */
  compound: number;
  value: number;
  /** Karmic debt number seen on the way down, if any. */
  karmicDebt: number | null;
}

const digitSum = (n: number) => String(n).split('').reduce((s, d) => s + Number(d), 0);

/** Reduce to one digit, stopping at master numbers when kept. Notes karmic debt numbers passed through. */
export function reduce(n: number, keepMasters: boolean): Reduction {
  let v = n;
  let karmic: number | null = null;
  while (v > 9 && !(keepMasters && (MASTER as readonly number[]).includes(v))) {
    if ((KARMIC_DEBT as readonly number[]).includes(v)) karmic = v;
    v = digitSum(v);
  }
  return { compound: n, value: v, karmicDebt: karmic };
}

export function normalizeName(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
}

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);

export function isVowel(word: string, i: number, rule: NumerologyConventions['yRule']): boolean {
  const c = word[i]!;
  if (VOWELS.has(c)) return true;
  if (c !== 'Y') return false;
  if (rule === 'vowel') return true;
  if (rule === 'consonant') return false;
  const prev = word[i - 1];
  const next = word[i + 1];
  return !(prev && VOWELS.has(prev)) && !(next && VOWELS.has(next));
}

type Part = 'all' | 'vowels' | 'consonants';

function letters(words: string[], part: Part, rule: NumerologyConventions['yRule']): string[][] {
  return words.map((w) =>
    w.split('').filter((_, i) => part === 'all' || (part === 'vowels' ? isVowel(w, i, rule) : !isVowel(w, i, rule)))
  );
}

export interface NameNumber {
  /** Reduce each name, then add the parts and reduce again (common modern method). */
  byNamePart: Reduction;
  /** Add every letter, reduce once. */
  allLetters: Reduction;
  /** Karmic debt numbers that appear only inside one name part (reported separately; practitioners differ on counting them). */
  partKarmicDebt: { part: string; number: number }[];
}

function nameNumber(words: string[], table: Record<string, number>, part: Part, conv: NumerologyConventions): NameNumber {
  const keep = conv.masterNumbers === 'keep';
  const groups = letters(words, part, conv.yRule);
  const sums = groups.map((g) => g.reduce((s, c) => s + (table[c] ?? 0), 0));
  const partReductions = sums.map((s) => reduce(s, keep));
  const partKarmicDebt = partReductions.flatMap((r, i) => (r.karmicDebt !== null ? [{ part: words[i]!, number: r.karmicDebt }] : []));
  return {
    byNamePart: reduce(partReductions.reduce((s, r) => s + r.value, 0), keep),
    allLetters: reduce(sums.reduce((a, b) => a + b, 0), keep),
    partKarmicDebt
  };
}

export interface DateNumbers {
  /** Reduce month, day and year separately, then add and reduce. */
  lifePathByComponent: Reduction;
  /** Add every digit of the date, reduce once. */
  lifePathAllDigits: Reduction;
  componentKarmicDebt: { part: string; number: number }[];
  birthday: Reduction;
  month: number;
  day: number;
  year: number;
  pinnacles: { from: number; to: number | null; pinnacle: number; challenge: number }[];
}

export function dateNumbers(y: number, m: number, d: number, conv: NumerologyConventions): DateNumbers {
  const keep = conv.masterNumbers === 'keep';
  const rm = reduce(m, keep);
  const rd = reduce(d, keep);
  const ry = reduce(digitSum(y), keep);
  const lpc = reduce(rm.value + rd.value + ry.value, keep);
  const lpa = reduce(digitSum(Number(`${y}${m}${d}`)), keep);
  const componentKarmicDebt = (
    [['month', rm], ['year', ry]] as const
  ).flatMap(([part, r]) => (r.karmicDebt !== null ? [{ part, number: r.karmicDebt }] : []));
  // Pinnacles and challenges use single digits; masters are reduced for challenges.
  const one = (n: number) => reduce(n, false).value;
  const mo = one(m);
  const da = one(d);
  const ye = one(digitSum(y));
  const p1 = reduce(mo + da, keep).value;
  const p2 = reduce(da + ye, keep).value;
  const p3 = reduce(p1 + p2, keep).value;
  const p4 = reduce(mo + ye, keep).value;
  const c1 = Math.abs(mo - da);
  const c2 = Math.abs(da - ye);
  const c3 = Math.abs(c1 - c2);
  const c4 = Math.abs(mo - ye);
  const end1 = 36 - one(lpc.value);
  return {
    lifePathByComponent: lpc,
    lifePathAllDigits: lpa,
    componentKarmicDebt,
    birthday: reduce(d, keep),
    month: m,
    day: d,
    year: y,
    pinnacles: [
      { from: 0, to: end1, pinnacle: p1, challenge: c1 },
      { from: end1, to: end1 + 9, pinnacle: p2, challenge: c2 },
      { from: end1 + 9, to: end1 + 18, pinnacle: p3, challenge: c3 },
      { from: end1 + 18, to: null, pinnacle: p4, challenge: c4 }
    ]
  };
}

export interface SystemNumbers {
  expression: NameNumber;
  soulUrge: NameNumber;
  personality: NameNumber;
  /** Count of letters per value (1-9; Chaldean never uses 9). */
  letterCounts: Record<number, number>;
  missing: number[];
}

export interface NumerologyResult {
  name: string;
  words: string[];
  date: DateNumbers;
  pythagorean: SystemNumbers;
  chaldean: SystemNumbers;
  maturity: { pythagorean: Reduction; chaldean: Reduction };
  /** Karmic debt in a total (compound before the final reduction). */
  karmicDebt: { where: string; number: number }[];
  /** Karmic debt seen only inside one name part or one date component. */
  karmicDebtInParts: { where: string; number: number }[];
}

function systemNumbers(words: string[], table: Record<string, number>, conv: NumerologyConventions, maxValue: number): SystemNumbers {
  const counts: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) counts[i] = 0;
  for (const w of words) for (const c of w) counts[table[c]!] = (counts[table[c]!] ?? 0) + 1;
  const missing = Object.entries(counts)
    .filter(([k, v]) => v === 0 && Number(k) <= maxValue)
    .map(([k]) => Number(k));
  return {
    expression: nameNumber(words, table, 'all', conv),
    soulUrge: nameNumber(words, table, 'vowels', conv),
    personality: nameNumber(words, table, 'consonants', conv),
    letterCounts: counts,
    missing
  };
}

export interface NumerologyInputs {
  name: string;
  year: number;
  month: number;
  day: number;
}

export function numerology(inputs: NumerologyInputs, conv: NumerologyConventions = DEFAULT_NUMEROLOGY): NumerologyResult {
  const words = normalizeName(inputs.name);
  if (!words.length) throw new Error('Name has no letters A-Z.');
  const keep = conv.masterNumbers === 'keep';
  const date = dateNumbers(inputs.year, inputs.month, inputs.day, conv);
  const py = systemNumbers(words, PYTHAGOREAN, conv, 9);
  const ch = systemNumbers(words, CHALDEAN, conv, 8);
  const karmic: { where: string; number: number }[] = [];
  const note = (where: string, r: Reduction) => {
    if (r.karmicDebt !== null) karmic.push({ where, number: r.karmicDebt });
  };
  const inParts: { where: string; number: number }[] = [];
  note('Life Path', date.lifePathByComponent);
  note('Life Path (all digits)', date.lifePathAllDigits);
  note('Birthday', date.birthday);
  for (const c of date.componentKarmicDebt) inParts.push({ where: `Life Path ${c.part}`, number: c.number });
  for (const [sys, s] of [['Pythagorean', py], ['Chaldean', ch]] as const) {
    for (const [label, n] of [['Expression', s.expression], ['Soul Urge', s.soulUrge], ['Personality', s.personality]] as const) {
      note(`${sys} ${label}`, n.byNamePart);
      note(`${sys} ${label} (all letters)`, n.allLetters);
      for (const k of n.partKarmicDebt) inParts.push({ where: `${sys} ${label}, name part ${k.part}`, number: k.number });
    }
  }
  return {
    name: inputs.name,
    words,
    date,
    pythagorean: py,
    chaldean: ch,
    maturity: {
      pythagorean: reduce(date.lifePathByComponent.value + py.expression.byNamePart.value, keep),
      chaldean: reduce(date.lifePathByComponent.value + ch.expression.byNamePart.value, keep)
    },
    karmicDebt: karmic,
    karmicDebtInParts: inParts
  };
}

export function computeNumerology(inputs: NumerologyInputs, conv = DEFAULT_NUMEROLOGY, now = new Date()): CalcRecord<NumerologyResult> {
  return makeRecord(NUMEROLOGY, { ...inputs }, { ...conv, systems: ['pythagorean', 'chaldean'] }, numerology(inputs, conv), [
    'Letter tables are standard modern renderings attributed to Balliett (Pythagorean) and Cheiro (Chaldean); page citations not yet verified against scans.'
  ], now);
}

/** Personal year, month and day for a calendar date. */
export function personalCycles(birthMonth: number, birthDay: number, y: number, m: number, d: number, keepMasters = false) {
  const one = (n: number) => reduce(n, false).value;
  const yr = reduce(one(birthMonth) + one(birthDay) + one(digitSum(y)), keepMasters).value;
  const mo = reduce(one(yr) + one(m), keepMasters).value;
  const dy = reduce(one(mo) + one(d), keepMasters).value;
  return { personalYear: yr, personalMonth: mo, personalDay: dy };
}

const show = (r: Reduction) => (r.compound === r.value ? String(r.value) : `${r.compound}/${r.value}`);

/** Diff rows for every number that changes with the method or the letter system (rule 5). */
export function numerologyDisagreements(rec: CalcRecord<NumerologyResult>, profileId: string | null): Disagreement[] {
  const r = rec.raw_result;
  const out: Disagreement[] = [];
  const mk = (subject: string, a: string, b: string, cause: string): Disagreement => ({
    id: `${rec.id}:${subject}`,
    kind: 'calculation',
    subject,
    result_a: a,
    result_b: b,
    cause,
    created_at: rec.computed_at,
    profile_id: profileId,
    engine: rec.engine,
    record_id: rec.id
  });
  if (r.date.lifePathByComponent.value !== r.date.lifePathAllDigits.value) {
    out.push(mk('Life Path', `By component: ${show(r.date.lifePathByComponent)}`, `All digits: ${show(r.date.lifePathAllDigits)}`, 'convention: reduction method'));
  }
  for (const [label, key] of [['Expression', 'expression'], ['Soul Urge', 'soulUrge'], ['Personality', 'personality']] as const) {
    for (const sys of ['pythagorean', 'chaldean'] as const) {
      const n = r[sys][key];
      if (n.byNamePart.value !== n.allLetters.value) {
        out.push(mk(`${label} (${sys})`, `By name part: ${show(n.byNamePart)}`, `All letters: ${show(n.allLetters)}`, 'convention: reduction method'));
      }
    }
    const p = r.pythagorean[key].byNamePart;
    const c = r.chaldean[key].byNamePart;
    if (p.value !== c.value) out.push(mk(label, `Pythagorean: ${show(p)}`, `Chaldean: ${show(c)}`, 'convention: letter table'));
  }
  return out;
}
