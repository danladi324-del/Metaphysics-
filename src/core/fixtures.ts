/**
 * External reference fixtures: screenshots the owner supplied on 2026-10-10 from their own apps, transcribed into
 * tests/reference-fixtures.test.ts. The app shows this list so "N of N match" is a fact, not a claim.
 */
export interface Fixture {
  id: string;
  source: string;
  what: string;
  tolerance: string;
}

export const FIXTURES: Fixture[] = [
  { id: 'astro-natal', source: 'Astrodienst (astro.com), natal, Placidus', what: '11 bodies, true node, interpolated and osculating Lilith, Ascendant, MC, cusps 2, 3, 11, 12', tolerance: 'bodies 2″ (node 15″, osculating Lilith 2′); cusps 1′ (displayed to the minute)' },
  { id: 'astro-sidereal', source: 'Astrodienst, sidereal Fagan/Bradley, whole signs', what: 'Sun, Moon, Ascendant, MC, true node; whole-sign cusps', tolerance: '2″ (node 15″)' },
  { id: 'astro-relocation', source: 'Astrodienst, relocation to Abilene TX, Placidus', what: 'Ascendant, MC, cusps 2, 3, 11, 12', tolerance: '1″ angles, 1′ cusps' },
  { id: 'astro-draconic', source: 'Astrodienst, draconic, Placidus', what: 'draconic Sun and Moon (tropical minus true node)', tolerance: '15″' },
  { id: 'bazi-app', source: 'BaZi app (reference chart R1, true-solar input)', what: 'true-solar birth time 09:53 and the four pillars 己巳 甲子 丁卯 甲寅', tolerance: 'exact' },
  { id: 'planetary-hours', source: 'Planetary hours app, Abilene, 10 Oct 2026', what: 'Saturn day; Mars, Sun, Venus hour boundaries', tolerance: '2 minutes' },
  { id: 'qimen-kymon', source: 'Qi Men Dun Jia Pro (kymon.net), 10 Oct 2026 12:24 CDT', what: 'pillars, Yin dun Ju 9, every palace: earth and heaven stems, door, deity; annual stars', tolerance: 'exact' }
];
