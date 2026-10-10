# Conventions

Every convention is a parameter (rule 4). Every calculation record stores the full convention set it ran under. Where two conventions give different results, a `disagreement` row is written (rule 5).

Status column: **P** = provisional default awaiting Eric (DECISIONS D-008), **D** = decided, **–** = not built yet.

| Key | Values | Default | Status | Used by |
|---|---|---|---|---|
| `houseSystem` | placidus, wholeSign, koch, equal, campanus, regiomontanus, porphyry | placidus | P | natal, transits, returns |
| `zodiac` | tropical, sidereal | tropical | P | natal, Vedic |
| `ayanamsa` | lahiri, raman, krishnamurti, faganBradley | lahiri | – | sidereal only |
| `nodeType` | mean, true | mean | P | natal |
| `lilithType` | mean, osculating | mean | P | natal |
| `aspectOrbs` | table of degrees per aspect | see `src/engines/natal/aspects.ts` | D (documented, adjustable) | natal |
| `numerologySystem` | pythagorean, chaldean | both computed | D | numerology |
| `masterNumbers` | keep (11, 22, 33), reduce | keep | P | numerology |
| `nameUsed` | stored string + kind (birth, current, as given) | "Eric Garner" (as given) | P | numerology |
| `ziHour` | early (day changes 23:00), late (day changes 00:00) | – | – | BaZi |
| `trueSolarTime` | on, off | – | – | BaZi |
| `tzolkinCorrelation` | 584283 (GMT), 584285, … | – | – | Tzolk'in |
| `qiMenSchool` | chaiBu, zhiRun | none | OWNER | Qi Men |
| `northReference` | magnetic, true | – | – | Feng Shui |
| `reversalMode` | none, opposite, blocked, internal, delayed | none | OWNER | tarot |

## Time
Inputs are local wall time plus IANA zone. The UTC offset is resolved once at entry and stored (D-006). Julian Day is computed from the stored UTC instant (UT). Delta-T is handled inside Swiss Ephemeris.

## Coordinates
Latitude north positive, longitude east positive (so Bossier City is −93.73).

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

## Biorhythm (P2)
Periods 23 / 28 / 33 days; value = sin(2π·days/period); days are whole calendar days between local birth date and local target date. Labeled "conventional, not validated".

## Moon (P2)
Elongation = Moon − Sun ecliptic longitude. Illumination = (1 − cos elongation)/2 (ignores lunar latitude; error under ~1%). Phase names: eight 45° bins centred on the exact phases. Daily record taken at local noon of the current location.

## Planetary hours (P2)
Sunrise and sunset from astronomy-engine (upper limb, standard refraction). Day hours = (sunset − sunrise)/12; night hours = (next sunrise − sunset)/12. Chaldean order Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon. Planetary day begins at sunrise (traditional); the midnight-based day ruler is stored alongside and shown when it differs. Undefined (explicit error) where the Sun does not rise or set.

## I Ching (P2)
Methods: three coins (6, 7, 8, 9 at 2/6/6/2 of 16) and yarrow odds (1/5/7/3 of 16). Each line is one uniform draw 0–15 from `crypto.getRandomValues`; the draws are stored so a cast can be replayed. Lines counted bottom to top; 6 and 9 change. King Wen numbering.

## Current location
"Today", the sky and planetary hours use the current location (Lab → Current location), defaulting to the birth place in the device's time zone. Natal work always uses the birth place.
