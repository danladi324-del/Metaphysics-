import { BODY_ORDER } from '../engines/natal/compute';
import { SIGNS } from '../engines/natal/zodiac';
import { allTarotKeys } from './tarot';
import { FIGURES } from '../engines/geomancy/compute';

/** Every snippet key each engine reads, for content templates. */
export const KEY_SETS: Record<string, () => string[]> = {
  tarot: allTarotKeys,
  natal: () =>
    BODY_ORDER.flatMap((b) => [
      ...SIGNS.map((s) => `natal.${b}.sign.${s.toLowerCase()}`),
      ...Array.from({ length: 12 }, (_, i) => `natal.${b}.house.${i + 1}`)
    ]),
  shadow: () =>
    ['saturn', 'pluto', 'chiron', 'lilith', 'node', 'southnode'].flatMap((b) => [
      ...SIGNS.map((s) => `shadow.${b}.sign.${s.toLowerCase()}`),
      ...(b === 'southnode' ? [] : Array.from({ length: 12 }, (_, i) => `shadow.${b}.house.${i + 1}`))
    ]),
  geomancy: () => FIGURES.map((f) => `geomancy.figure.${f.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`),
  numerology: () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33].map((n) => `numerology.lifePath.${n}`),
  iching: () =>
    Array.from({ length: 64 }, (_, i) => i + 1).flatMap((n) => [`iching.hexagram.${n}`, ...[1, 2, 3, 4, 5, 6].map((l) => `iching.hexagram.${n}.line.${l}`)])
};
