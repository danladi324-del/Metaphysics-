import type { HouseSystem } from '../../core/conventions';
import { HOUSE_SYSTEM_LABEL } from '../../core/conventions';
import type { CalcRecord } from '../../core/record';
import { BODY_LABEL, type BodyId, type NatalResult } from '../natal/compute';
import { formatLongitude } from '../natal/zodiac';

/**
 * Shadow part (a): placements traditions point to for shadow work. Pure facts from the natal record.
 * The app never states what anyone's shadow is (brief §4.9).
 */
export interface Pointer {
  id: string; // e.g. saturn, house12.mars
  title: string;
  fact: string;
  /** Snippet keys for interpretive readings of this pointer. */
  keys: string[];
  /** Where a convention changes the pointer (e.g. a body in the 12th under one house system only). */
  split: string | null;
}

const CORE: BodyId[] = ['saturn', 'pluto', 'chiron'];

export function shadowPointers(rec: CalcRecord<NatalResult>, conv: { houseSystem: HouseSystem; nodeType: 'mean' | 'true'; lilithType: 'mean' | 'osculating' }, timeKnown: boolean): Pointer[] {
  const r = rec.raw_result;
  const out: Pointer[] = [];
  const house = (id: string) => r.bodies.find((b) => b.id === id)?.houses[conv.houseSystem];
  const lilith = conv.lilithType === 'mean' ? 'meanLilith' : 'osculatingLilith';
  const node = conv.nodeType === 'mean' ? 'meanNode' : 'trueNode';
  for (const id of [...CORE, lilith as BodyId, node as BodyId]) {
    const b = r.bodies.find((x) => x.id === id);
    if (!b) continue;
    const name = BODY_LABEL[id].replace(/ \((mean|true|osculating)\)/, '');
    const h = timeKnown ? house(id) : undefined;
    const slug = id.replace(/^(mean|true|osculating)/, '').toLowerCase() || id;
    out.push({
      id: slug,
      title: name,
      fact: `${name} ${formatLongitude(b.longitude)}${h ? `, house ${h} (${HOUSE_SYSTEM_LABEL[conv.houseSystem]})` : ''}.`,
      keys: [`shadow.${slug}.sign.${b.sign.toLowerCase()}`, ...(h ? [`shadow.${slug}.house.${h}`] : [])],
      split: null
    });
    if (id === node) {
      const south = (b.longitude + 180) % 360;
      out.push({ id: 'southnode', title: 'South Node', fact: `South Node ${formatLongitude(south)}.`, keys: [`shadow.southnode.sign.${formatLongitude(south).split(' ')[1]!.toLowerCase()}`], split: null });
    }
  }
  if (timeKnown) {
    const other: HouseSystem = conv.houseSystem === 'wholeSign' ? 'placidus' : 'wholeSign';
    for (const b of r.bodies) {
      if (['meanNode', 'trueNode', 'meanLilith', 'osculatingLilith'].includes(b.id)) continue;
      const here = b.houses[conv.houseSystem] === 12;
      const there = b.houses[other] === 12;
      if (!here && !there) continue;
      out.push({
        id: `house12.${b.id}`,
        title: `${BODY_LABEL[b.id]} and the 12th house`,
        fact: `${BODY_LABEL[b.id]} ${formatLongitude(b.longitude)}: house ${b.houses[conv.houseSystem]} (${HOUSE_SYSTEM_LABEL[conv.houseSystem]}), house ${b.houses[other]} (${HOUSE_SYSTEM_LABEL[other]}).`,
        keys: [`shadow.house12.${b.id}`],
        split: here !== there ? `In the 12th under ${HOUSE_SYSTEM_LABEL[here ? conv.houseSystem : other]} only.` : null
      });
    }
  }
  return out;
}

/**
 * Shadow part (b): question templates. Written for this app, so labeled Original synthesis.
 * Questions only: none asserts a trait, a cause or an outcome. Placeholders: {pointer}, {fact}.
 */
export const PROMPT_TEMPLATES: { id: string; text: string }[] = [
  { id: 'prompt.notice', text: 'Traditions point to {pointer} here. When did something in this area last feel heavy, and what did you do next?' },
  { id: 'prompt.avoid', text: 'Is there a situation tied to {pointer} that you tend to avoid? What would one small step toward it look like?' },
  { id: 'prompt.others', text: 'What trait do you find hardest to tolerate in other people lately? Does any of it echo something you notice in yourself?' },
  { id: 'prompt.evidence', text: 'If this pointer meant nothing for you, what would you expect to see in your journal over a month? Note one observation either way.' }
];

export function promptsFor(p: Pointer): { id: string; text: string }[] {
  return PROMPT_TEMPLATES.map((t) => ({ id: `${t.id}:${p.id}`, text: t.text.replace('{pointer}', p.title).replace('{fact}', p.fact) }));
}

export function cardPrompts(cardName: string, reversed: boolean): { id: string; text: string }[] {
  const title = `${cardName}${reversed ? ' (reversed)' : ''}`;
  return PROMPT_TEMPLATES.map((t) => ({ id: `${t.id}:card`, text: t.text.replace('{pointer}', title).replace('{fact}', title) }));
}

/** Words that would assert rather than ask; templates are tested against this list. */
export const ASSERTIVE = /\b(your shadow is|you are|you will|this means|this causes|reveals that)\b/i;
