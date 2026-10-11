# Conventions

Every convention is a parameter (rule 4). Every calculation record stores the full convention set it ran under. Where two conventions give different results, a `disagreement` row is written (rule 5).

Status column: **P** = provisional default awaiting the owner (DECISIONS D-008), **D** = decided, **–** = not built yet.

| Key | Values | Default | Status | Used by |
|---|---|---|---|---|
| `houseSystem` | placidus, wholeSign, koch, equal, campanus, regiomontanus, porphyry | wholeSign | D (owner, D-024) | natal, transits, returns |
| `zodiac` | tropical, sidereal | tropical | D (owner, D-024) | natal, Vedic |
| `ayanamsa` | lahiri, raman, krishnamurti, faganBradley | lahiri | – | sidereal only |
| `nodeType` | mean, true | true | D (matches the owner's Astrodienst charts, D-028) | natal |
| `lilithType` | mean, osculating, interpolated | interpolated | D (Astrodienst "Lilith (i)", D-028) | natal |
| `aspectOrbs` | table of degrees per aspect | see `src/engines/natal/aspects.ts` | D (documented, adjustable) | natal |
| `numerologySystem` | pythagorean, chaldean | both computed | D | numerology |
| `masterNumbers` | keep (11, 22, 33), reduce | keep | P | numerology |
| `nameUsed` | stored string + kind (birth, current, as given) | the full birth name (birth) | D (owner, D-024) | numerology |
| `sex` | male, female, unset | set in the profile | D (owner, D-024) | BaZi luck pillars, Kua |
| `ziHour` | early (day changes 23:00), late (day changes 00:00) | early | D (Claude, D-016; both computed) | BaZi |
| `trueSolarTime` | on, off | on | D (matches the owner's BaZi app, D-028) | BaZi |
| `tzolkinCorrelation` | 584283 (GMT), 584285, … | 584283 | D (both computed) | Tzolk'in |
| `qiMenSchool` | chaiBu, zhiRun | chaiBu | D (delegated, D-027) | Qi Men |
| `northReference` | magnetic, true | true (charts); both stored | D | Feng Shui |
| `reversalMode` | source, blocked, opposite, internal, delayed (or reversals off) | source | D (delegated, D-025) | tarot |

## Time
Inputs are local wall time plus IANA zone. The UTC offset is resolved once at entry and stored (D-006). Julian Day is computed from the stored UTC instant (UT). Delta-T is handled inside Swiss Ephemeris.

## Coordinates
Latitude north positive, longitude east positive (so places in the western hemisphere are negative).

## Numerology (P2)
- Letter tables: Pythagorean A–I = 1–9 repeating; Chaldean per Cheiro (no letter = 9). Both always computed.
- Reduction methods, both always computed, diff logged when they differ:
  - Life Path: reduce month, day, year separately then add ("by component") vs add every digit ("all digits").
  - Name numbers: reduce each name then add ("by name part") vs add every letter ("all letters").
- Displayed primary: by component / by name part.
- Master numbers 11, 22, 33 kept (provisional). Challenges always use single digits.
- Karmic debt (13, 14, 16, 19) is reported in two lists: in a total (compound before final reduction) and inside one name part or date component only. Practitioners differ on the second.
- Y: vowel only when no vowel sits beside it (LYNN yes, YES no, MAYA no). Alternatives `vowel` and `consonant` are parameters.
- Pinnacles: first ends at 36 − single-digit Life Path; then 9-year spans.
- Personal year = month + day + calendar year (each to one digit), reduced; month = year + calendar month; day = month + calendar day.

## Moon (P2)
Elongation = Moon − Sun ecliptic longitude. Illumination = (1 − cos elongation)/2 (ignores lunar latitude; error under ~1%). Phase names: eight 45° bins centred on the exact phases. Daily record taken at local noon of the current location.

## Planetary hours (P2)
Sunrise and sunset from astronomy-engine (upper limb, standard refraction). Day hours = (sunset − sunrise)/12; night hours = (next sunrise − sunset)/12. Chaldean order Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon. Planetary day begins at sunrise (traditional); the midnight-based day ruler is stored alongside and shown when it differs. Undefined (explicit error) where the Sun does not rise or set.

## I Ching (P2)
Methods: three coins (6, 7, 8, 9 at 2/6/6/2 of 16) and yarrow odds (1/5/7/3 of 16). Each line is one uniform draw 0–15 from `crypto.getRandomValues`; the draws are stored so a cast can be replayed. Lines counted bottom to top; 6 and 9 change. King Wen numbering.

## Current location
"Today", the sky and planetary hours use the current location (Lab → Current location), defaulting to the birth place in the device's time zone. Natal work always uses the birth place.

## BaZi (P4)
- Year changes at Li Chun (apparent solar longitude 315°, found with Swiss Ephemeris, as an absolute instant). Month changes every 30° from 315°. Five Tigers rule for month stems, Five Rats rule for hour stems.
- Day pillar: sexagenary index (JDN + 49) mod 60 of the civil date used.
- `trueSolarTime`: off = clock time in the birth zone; on = local apparent solar time from the Sun's hour angle at the birth place (astronomy-engine). Default **on** (D-028).
- `ziHour`: `early` = day changes at 23:00; `midnight` = day changes at 00:00 and 23:00–24:00 takes the next day's stem for the hour. Default early. Both match lunar-javascript's `sect` 1 and 2.
- All four combinations are computed; day or hour pillars that differ are written to the ledger.
- Luck pillars: computed from the profile's sex (D-026).

## Tzolk'in (P4)
Correlation 584283 (GMT) by default; 584285 computed alongside and logged. Civil birth date.

## Vedic (P4)
Lahiri ayanamsa (others selectable), nutation included, so sidereal = tropical apparent − ayanamsa. Mean node for Rahu/Ketu. Nakshatras 13°20′, padas 3°20′. Vimshottari from the Moon's nakshatra; the first dasha's elapsed share is the fraction of the nakshatra traversed; years of 365.25 days (parameter).

## Feng Shui (P4)
- Heading: iOS `webkitCompassHeading` (magnetic) after a tap grants permission; manual degrees otherwise. Declination from WMM-2025 (geomagnetism 0.2.0) at the current location and date. True = magnetic + declination (east positive). Both stored; charts use true north.
- 24 mountains of 15° starting at Ren 337.5°. Polarity: cardinal palaces yang-yin-yin, intercardinal yin-yang-yang.
- Flying Star (Xuan Kong): period from the building's year (20-year periods, Period 9 from 2024); base chart flown forward; mountain and water stars flown by the polarity of the matching sub-mountain in the star's home palace (5 takes the palace it sits in). Replacement charts (Ti Gua) not computed; facings within 1.5° of a mountain edge or 3° of a palace edge are flagged. Annual star centre: 2024 = 3, 2025 = 2, 2026 = 1.
- Eight Mansions: Kua from the solar birth year (Li Chun) and sex; 5 → 2 (male) / 8 (female). Stars from the line-change rule on the Kua's own trigram. Both sexes shown until the profile records one.
