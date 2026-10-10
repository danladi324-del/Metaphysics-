/** The 78-card deck as data. Names follow Waite (1911); identity ids do not depend on numbering conventions. */
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
export const SUITS: Suit[] = ['wands', 'cups', 'swords', 'pentacles'];

export interface Card {
  id: string; // major.fool, minor.cups.03, minor.swords.queen
  name: string;
  arcana: 'major' | 'minor';
  suit: Suit | null;
  /** Majors: number under Waite's numbering. Minors: 1-10, page 11, knight 12, queen 13, king 14. */
  rank: number;
}

const MAJORS: [string, string][] = [
  ['fool', 'The Fool'], ['magician', 'The Magician'], ['highPriestess', 'The High Priestess'], ['empress', 'The Empress'],
  ['emperor', 'The Emperor'], ['hierophant', 'The Hierophant'], ['lovers', 'The Lovers'], ['chariot', 'The Chariot'],
  ['strength', 'Strength'], ['hermit', 'The Hermit'], ['wheel', 'Wheel of Fortune'], ['justice', 'Justice'],
  ['hangedMan', 'The Hanged Man'], ['death', 'Death'], ['temperance', 'Temperance'], ['devil', 'The Devil'],
  ['tower', 'The Tower'], ['star', 'The Star'], ['moon', 'The Moon'], ['sun', 'The Sun'], ['judgement', 'Judgement'], ['world', 'The World']
];

const RANK_NAME = ['', 'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const RANK_ID = ['', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', 'page', 'knight', 'queen', 'king'];

export const DECK: Card[] = [
  ...MAJORS.map(([id, name], i) => ({ id: `major.${id}`, name, arcana: 'major' as const, suit: null, rank: i })),
  ...SUITS.flatMap((suit) =>
    Array.from({ length: 14 }, (_, k) => ({
      id: `minor.${suit}.${RANK_ID[k + 1]}`,
      name: `${RANK_NAME[k + 1]} of ${suit[0]!.toUpperCase()}${suit.slice(1)}`,
      arcana: 'minor' as const,
      suit,
      rank: k + 1
    }))
  )
];

export const CARD_BY_ID = new Map(DECK.map((c) => [c.id, c]));

export type MajorNumbering = 'waite' | 'marseille';

/** Number shown on a major under each convention. Waite: Strength VIII, Justice XI; Marseille: the reverse. */
export function majorNumber(card: Card, numbering: MajorNumbering): number {
  if (card.arcana !== 'major') return card.rank;
  if (numbering === 'marseille') {
    if (card.id === 'major.strength') return 11;
    if (card.id === 'major.justice') return 8;
  }
  return card.rank;
}

export function roman(n: number): string {
  if (n === 0) return '0';
  const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [v, s] of table) while (n >= v) { out += s; n -= v; }
  return out;
}

export function snippetKey(card: Card, reversed: boolean): string {
  return `tarot.${card.id}.${reversed ? 'reversed' : 'upright'}`;
}

/** Every snippet key the deck uses, for templates. */
export function allTarotKeys(): string[] {
  return DECK.flatMap((c) => [snippetKey(c, false), snippetKey(c, true)]);
}

export interface Spread {
  id: string;
  name: string;
  positions: string[];
  source: string | null; // source id for the layout, if traditional
}

export const SPREADS: Spread[] = [
  { id: 'one', name: 'One card', positions: ['Card'], source: null },
  { id: 'three', name: 'Three cards', positions: ['Past', 'Present', 'Next'], source: null },
  {
    id: 'celtic',
    name: 'Celtic Cross',
    // Position names paraphrased from Waite 1911, Part III; locator not yet verified against the text.
    positions: ['Covers', 'Crosses', 'Crowns', 'Beneath', 'Behind', 'Before', 'Self', 'House', 'Hopes and fears', 'What comes'],
    source: 'waite1911'
  }
];
