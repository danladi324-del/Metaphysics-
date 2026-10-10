import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { dayIndex } from '../bazi/compute';
import { assertYMD } from '../../core/validate';

export const TZOLKIN: EngineDescriptor = {
  engine: 'tzolkin',
  version: '0.1.0',
  input_dependencies: ['birth.date']
};

export const DAY_NAMES = ['Imix', 'Ik', 'Akbal', 'Kan', 'Chicchan', 'Cimi', 'Manik', 'Lamat', 'Muluc', 'Oc', 'Chuen', 'Eb', 'Ben', 'Ix', 'Men', 'Cib', 'Caban', 'Etznab', 'Cauac', 'Ahau'] as const;
export const HAAB_MONTHS = ['Pop', 'Wo', 'Sip', 'Sotz', 'Sek', 'Xul', 'Yaxkin', 'Mol', 'Chen', 'Yax', 'Sak', 'Keh', 'Mak', 'Kankin', 'Muwan', 'Pax', 'Kayab', 'Kumku', 'Wayeb'] as const;

/** GMT (584283) is the most used; 584285 (Lounsbury) is the main alternative. */
export const CORRELATIONS = [584283, 584285] as const;

export interface MayaDate {
  correlation: number;
  longCount: [number, number, number, number, number];
  tzolkin: { number: number; name: string };
  haab: { day: number; month: string };
}

/** Julian Day Number (integer, noon) of a civil date. */
export function jdn(y: number, m: number, d: number): number {
  // dayIndex = (JDN + 49) mod 60; recover JDN directly instead.
  const noon = new Date(0);
  noon.setUTCFullYear(y, m - 1, d);
  noon.setUTCHours(12, 0, 0, 0);
  return Math.round(noon.getTime() / 86_400_000 + 2_440_587.5);
}

export function mayaDate(y: number, m: number, d: number, correlation: number): MayaDate {
  assertYMD({ year: y, month: m, day: d });
  if (!Number.isInteger(correlation)) throw new Error('correlation must be a whole number');
  const days = jdn(y, m, d) - correlation;
  const mod = (a: number, n: number) => ((a % n) + n) % n;
  const lc: [number, number, number, number, number] = [
    Math.floor(days / 144_000),
    Math.floor(mod(days, 144_000) / 7_200),
    Math.floor(mod(days, 7_200) / 360),
    Math.floor(mod(days, 360) / 20),
    mod(days, 20)
  ];
  const h = mod(days + 348, 365);
  return {
    correlation,
    longCount: lc,
    tzolkin: { number: mod(days + 3, 13) + 1, name: DAY_NAMES[mod(days + 19, 20)]! },
    haab: { day: h % 20, month: HAAB_MONTHS[Math.floor(h / 20)]! }
  };
}

export interface TzolkinResult {
  chosen: MayaDate;
  alternatives: MayaDate[];
}

export function computeTzolkin(date: { year: number; month: number; day: number }, correlation = 584283, now = new Date()): CalcRecord<TzolkinResult> {
  const chosen = mayaDate(date.year, date.month, date.day, correlation);
  const alternatives = CORRELATIONS.filter((c) => c !== correlation).map((c) => mayaDate(date.year, date.month, date.day, c));
  return makeRecord(TZOLKIN, { ...date }, { correlation, dayBoundary: 'civil date of birth (local)' }, { chosen, alternatives }, [
    'The Maya day may have begun at sunset or sunrise; this uses the civil date.'
  ], now);
}

export function tzolkinDisagreements(rec: CalcRecord<TzolkinResult>, profileId: string | null): Disagreement[] {
  const c = rec.raw_result.chosen;
  return rec.raw_result.alternatives.map((a) => ({
    id: `${rec.id}:corr${a.correlation}`,
    kind: 'calculation' as const,
    subject: "Tzolk'in day",
    result_a: `${c.correlation}: ${c.tzolkin.number} ${c.tzolkin.name}`,
    result_b: `${a.correlation}: ${a.tzolkin.number} ${a.tzolkin.name}`,
    cause: 'convention: correlation constant',
    created_at: rec.computed_at,
    profile_id: profileId,
    engine: 'tzolkin',
    record_id: rec.id
  }));
}

export { dayIndex };
