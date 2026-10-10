import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { daysBetween } from '../../core/time';
import { assertYMD } from '../../core/validate';

export const BIORHYTHM: EngineDescriptor = {
  engine: 'biorhythm',
  version: '0.1.0',
  input_dependencies: ['birth.date', 'date']
};

/** Classic cycle lengths in days (Fliess/Swoboda tradition). Conventional, not validated. */
export const CYCLES = { physical: 23, emotional: 28, intellectual: 33 } as const;
export type Cycle = keyof typeof CYCLES;

export interface BiorhythmResult {
  daysLived: number;
  values: Record<Cycle, number>; // -1..1
  /** Cycles crossing zero within the day (traditionally "critical"). */
  critical: Cycle[];
}

type YMD = { year: number; month: number; day: number };

export function biorhythm(birth: YMD, date: YMD): BiorhythmResult {
  assertYMD(birth);
  assertYMD(date);
  const n = daysBetween(birth, date);
  const values = {} as Record<Cycle, number>;
  const critical: Cycle[] = [];
  for (const [k, p] of Object.entries(CYCLES) as [Cycle, number][]) {
    values[k] = Math.round(Math.sin((2 * Math.PI * n) / p) * 1e6) / 1e6;
    const a = Math.sin((2 * Math.PI * n) / p);
    const b = Math.sin((2 * Math.PI * (n + 1)) / p);
    if (a === 0 || Math.sign(a) !== Math.sign(b) || Math.abs(a) < 1e-9) critical.push(k);
  }
  return { daysLived: n, values, critical };
}

export function computeBiorhythm(birth: YMD, date: YMD, now = new Date()): CalcRecord<BiorhythmResult> {
  return makeRecord(BIORHYTHM, { birth, date }, { cycles: CYCLES, dayCount: 'calendar days, local dates' }, biorhythm(birth, date), [
    'Conventional, not validated. Controlled studies have not found biorhythm cycles to predict performance or accidents.'
  ], now);
}
