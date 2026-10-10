import type { Disagreement } from '../../core/db';
import { makeRecord, type CalcRecord, type EngineDescriptor } from '../../core/record';
import { CARD_BY_ID, DECK, SPREADS, majorNumber, type MajorNumbering } from '../../content/tarot';

export const TAROT: EngineDescriptor = {
  engine: 'tarot',
  version: '0.1.0',
  input_dependencies: ['random']
};

export interface TarotConventions {
  /** Whether orientation is drawn at all. */
  reversals: boolean;
  majorNumbering: MajorNumbering;
}

export const DEFAULT_TAROT: TarotConventions = { reversals: true, majorNumbering: 'waite' };

export interface DrawnCard {
  position: string;
  cardId: string;
  reversed: boolean;
}

export interface TarotResult {
  spread: string;
  /** Full shuffled order (78 ids) and the orientation bits: the draw can be replayed and audited. */
  order: string[];
  orientation: boolean[];
  cards: DrawnCard[];
}

/** Uniform integer in [0, n) from 32-bit random words, with rejection to avoid modulo bias. */
export function uniform(n: number, next: () => number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  for (;;) {
    const x = next();
    if (x < limit) return x % n;
  }
}

export function cryptoWords(): () => number {
  const buf = new Uint32Array(256);
  let i = buf.length;
  return () => {
    if (i >= buf.length) {
      crypto.getRandomValues(buf);
      i = 0;
    }
    return buf[i++]!;
  };
}

/** Fisher-Yates shuffle plus one orientation bit per card. */
export function shuffle(next: () => number): { order: string[]; orientation: boolean[] } {
  const order = DECK.map((c) => c.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = uniform(i + 1, next);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const orientation = order.map(() => (next() & 1) === 1);
  return { order, orientation };
}

export function drawFrom(spreadId: string, order: string[], orientation: boolean[], conv: TarotConventions): TarotResult {
  const spread = SPREADS.find((s) => s.id === spreadId);
  if (!spread) throw new Error(`unknown spread ${spreadId}`);
  if (order.length !== 78 || new Set(order).size !== 78 || !order.every((id) => CARD_BY_ID.has(id))) throw new Error('order must be a permutation of the 78 cards');
  return {
    spread: spreadId,
    order,
    orientation,
    cards: spread.positions.map((position, i) => ({ position, cardId: order[i]!, reversed: conv.reversals && orientation[i] === true }))
  };
}

export function computeDraw(spreadId: string, question: string, conv: TarotConventions = DEFAULT_TAROT, next: () => number = cryptoWords(), now = new Date()): CalcRecord<TarotResult> {
  const { order, orientation } = shuffle(next);
  return makeRecord(TAROT, { spread: spreadId, question, order, orientation }, { ...conv, randomness: 'crypto.getRandomValues, Fisher-Yates with rejection sampling' }, drawFrom(spreadId, order, orientation, conv), [], now);
}

/** Strength and Justice swap numbers between Waite and Marseille numbering. */
export function tarotDisagreements(rec: CalcRecord<TarotResult>, profileId: string | null): Disagreement[] {
  return rec.raw_result.cards
    .map((c) => CARD_BY_ID.get(c.cardId)!)
    .filter((card) => majorNumber(card, 'waite') !== majorNumber(card, 'marseille'))
    .map((card) => ({
      id: `${rec.id}:${card.id}:numbering`,
      kind: 'calculation' as const,
      subject: `${card.name} number`,
      result_a: `Waite: ${majorNumber(card, 'waite')}`,
      result_b: `Marseille: ${majorNumber(card, 'marseille')}`,
      cause: 'convention: major arcana numbering',
      created_at: rec.computed_at,
      profile_id: profileId,
      engine: 'tarot',
      record_id: rec.id
    }));
}
