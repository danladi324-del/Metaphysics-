/**
 * External reference fixtures: screenshots the owner supplied on 2026-10-10 from their own apps. The transcribed values
 * are the owner's birth data, so the tests live in tests/private/ (gitignored) and run in CI only when the private-test
 * secret is set (D-032). This list names what is checked, never the values.
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
  { id: 'astro-relocation', source: "Astrodienst, relocation to the owner's current city, Placidus", what: 'Ascendant, MC, cusps 2, 3, 11, 12', tolerance: '1″ angles, 1′ cusps' },
  { id: 'astro-draconic', source: 'Astrodienst, draconic, Placidus', what: 'draconic Sun and Moon (tropical minus true node)', tolerance: '15″' },
  { id: 'bazi-app', source: "BaZi app (the owner's chart, true-solar input)", what: 'true-solar birth time and the four pillars', tolerance: 'exact' },
  { id: 'planetary-hours', source: "Planetary hours app, the owner's current city, 10 Oct 2026", what: 'Saturn day; Mars, Sun, Venus hour boundaries', tolerance: '2 minutes' },
  { id: 'qimen-kymon', source: "Qi Men Dun Jia Pro (kymon.net), one hour on 10 Oct 2026 at the owner's current city", what: 'pillars, Yin dun Ju 9, every palace: earth and heaven stems, door, deity; annual stars', tolerance: 'exact' }
];
