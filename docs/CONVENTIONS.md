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
