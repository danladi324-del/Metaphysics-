import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';

export const GEOMANCY: EngineDescriptor = {
  engine: 'geomancy',
  version: '0.1.0',
  input_dependencies: ['random']
};

/** A figure: rows head, neck, body, feet; 1 = one point (odd), 2 = two points (even). */
export type Figure = [1 | 2, 1 | 2, 1 | 2, 1 | 2];

/** The sixteen figures with their conventional Latin names. */
export const FIGURES: { name: string; rows: Figure }[] = [
  { name: 'Via', rows: [1, 1, 1, 1] },
  { name: 'Populus', rows: [2, 2, 2, 2] },
  { name: 'Conjunctio', rows: [2, 1, 1, 2] },
  { name: 'Carcer', rows: [1, 2, 2, 1] },
  { name: 'Fortuna Major', rows: [2, 2, 1, 1] },
  { name: 'Fortuna Minor', rows: [1, 1, 2, 2] },
  { name: 'Acquisitio', rows: [2, 1, 2, 1] },
  { name: 'Amissio', rows: [1, 2, 1, 2] },
  { name: 'Laetitia', rows: [1, 2, 2, 2] },
  { name: 'Tristitia', rows: [2, 2, 2, 1] },
  { name: 'Puella', rows: [1, 2, 1, 1] },
  { name: 'Puer', rows: [1, 1, 2, 1] },
  { name: 'Albus', rows: [2, 2, 1, 2] },
  { name: 'Rubeus', rows: [2, 1, 2, 2] },
  { name: 'Caput Draconis', rows: [2, 1, 1, 1] },
  { name: 'Cauda Draconis', rows: [1, 1, 1, 2] }
];

export function nameOf(f: Figure): string {
  return FIGURES.find((x) => x.rows.every((r, i) => r === f[i]))!.name;
}

/** Geomantic addition: odd + odd = even, even + even = even, odd + even = odd, row by row. */
export function add(a: Figure, b: Figure): Figure {
  return a.map((r, i) => ((r + b[i]!) % 2 === 0 ? 2 : 1)) as Figure;
}

export interface Shield {
  mothers: Figure[];
  daughters: Figure[];
  nieces: Figure[];
  rightWitness: Figure;
  leftWitness: Figure;
  judge: Figure;
  /** Reconciler: judge + first mother (a common later addition). */
  reconciler: Figure;
}

export function shield(mothers: Figure[]): Shield {
  if (mothers.length !== 4) throw new Error('four mothers');
  const daughters = [0, 1, 2, 3].map((row) => mothers.map((m) => m[row]!) as Figure);
  const nieces = [add(mothers[0]!, mothers[1]!), add(mothers[2]!, mothers[3]!), add(daughters[0]!, daughters[1]!), add(daughters[2]!, daughters[3]!)];
  const rightWitness = add(nieces[0]!, nieces[1]!);
  const leftWitness = add(nieces[2]!, nieces[3]!);
  const judge = add(rightWitness, leftWitness);
  return { mothers, daughters, nieces, rightWitness, leftWitness, judge, reconciler: add(judge, mothers[0]!) };
}

/** Four mothers from 16 random bits, read row by row. */
export function mothersFromBits(bits: number[]): Figure[] {
  if (bits.length !== 16 || bits.some((b) => b !== 0 && b !== 1)) throw new Error('sixteen bits required');
  return [0, 1, 2, 3].map((m) => bits.slice(m * 4, m * 4 + 4).map((b) => (b ? 1 : 2)) as Figure);
}

export function randomBits(): number[] {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x & 1);
}

export interface GeomancyResult {
  bits: number[];
  figures: { position: string; name: string; rows: Figure }[];
  judge: string;
}

const POSITIONS = ['Mother 1', 'Mother 2', 'Mother 3', 'Mother 4', 'Daughter 1', 'Daughter 2', 'Daughter 3', 'Daughter 4', 'Niece 1', 'Niece 2', 'Niece 3', 'Niece 4', 'Right Witness', 'Left Witness', 'Judge', 'Reconciler'];

export function computeGeomancy(question = '', bits: number[] = randomBits(), now = new Date()): CalcRecord<GeomancyResult> {
  const s = shield(mothersFromBits(bits));
  const figs = [...s.mothers, ...s.daughters, ...s.nieces, s.rightWitness, s.leftWitness, s.judge, s.reconciler];
  return makeRecord(
    GEOMANCY,
    { bits, question },
    { method: 'shield chart; mothers read row by row from 16 random bits', randomness: 'crypto.getRandomValues, low bit per row' },
    { bits, figures: figs.map((f, i) => ({ position: POSITIONS[i]!, name: nameOf(f), rows: f })), judge: nameOf(s.judge) },
    ['House chart (12 houses) and perfection methods are not computed.'],
    now
  );
}
