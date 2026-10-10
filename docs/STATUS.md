# Status

Work-item states: IDEA, EXPLORATION, RESEARCH, DESIGN, BUILD, TEST, VALIDATE, RELEASE, MAINTAIN.

## Current phase
P3 done 2026-10-10 (machinery; no source text loaded, by design). P4 next.

## Phase log
### P0 Scaffold — BUILD done; deploy UNVERIFIED
- Works: Vite 8 + TypeScript 7 strict + Vitest 5 + vite-plugin-pwa; Preact UI shell with the canvas tab bar, tokens and self-hosted fonts; service worker precaches wasm, ephemeris file, city list and fonts; manifest + apple-touch-icon.
- CI: `.github/workflows/ci.yml` (typecheck, tests, build on every push). `pages.yml` deploys `main` to GitHub Pages.
- UNVERIFIED: no workflow run had registered when checked right after the first push (Actions may need enabling in repo settings). Pages deploy only runs from `main`, and this work is on `claude/intelligent-mendel-j3p880`, so the live deploy and home-screen install on an iPhone have **not** been confirmed. Pages must also be set to "GitHub Actions" as source in repo settings.

### P1 Foundation + natal chart — TEST
- Works: profile entry with offline city search (GeoNames), IANA zone, DST gap/overlap detection that forces a choice, "time unknown" mode; resolved UTC offset stored with the profile; record envelope with fingerprint; sql.js DB persisted to IndexedDB; JSON export via share sheet / download; validated restore (all-or-nothing); wipe; natal chart (Sun–Pluto, Chiron, mean/true node, mean/osculating Lilith, Placidus + whole sign always, any of 7 systems on demand, aspects with stored orbs); transits; next solar and lunar return; ledger rows wherever house system, node or Lilith convention changes a result; Markdown note for Obsidian.
- Tested (38 unit tests, all passing): time edge cases (1974 emergency DST, gap, overlap, LMT 1850, leap days, years < 100, half-hour zones); planets vs astronomy-engine (independent code; worst case 15.5″, Neptune); Ascendant, MC, Placidus 11/12/2/3 vs an independent textbook implementation (< 0.01°); determinism; polar-latitude Placidus fallback is flagged; missing asteroid file is flagged; solar/lunar returns; P1 acceptance round-trip (profile → chart → export → wipe → restore → identical recompute); malformed-restore rejection; schema guards.
- Tested in headless Chromium at iPhone 13 size (`scripts/e2e-p1.cjs`): full create/export/wipe/reload/restore loop, no console errors, no horizontal scroll at 390 px.
- Failed / fixed during the phase: wasm wrapper ignores the house-calc return code (polar fallback was silent) — now detected by latitude; wheel markers overlapped — spacing widened.
- Assumed: Moshier ephemeris is accurate enough for natal work (agreement with astronomy-engine supports this); GeoNames 2017 snapshot is fine for coordinates and zone names.
- UNVERIFIED: agreement with Astrodienst (no screenshots yet); iOS Safari behavior of IndexedDB persistence, share sheet and `navigator.storage.persist()`; sidereal mode (wired, untested against a reference).

### P2 Fast engines — TEST
- Works: numerology (Pythagorean and Chaldean side by side; Life Path, Expression, Soul Urge, Personality, Birthday, Maturity; both reduction methods with ledger rows; letter counts; missing numbers; karmic debt split into "in a total" vs "inside one part"; pinnacles, challenges; personal year/month/day); biorhythm with a 4-week chart and the not-validated warning; moon phase, sign, illumination and next four principal phases; planetary day and 24 unequal hours for the current location; I Ching casting (yarrow odds or three coins, replayable draws, primary and relating hexagram). Readings and Draw screens; "current location" setting.
- Tested (74 unit tests total, all passing): numerology against hand-worked arithmetic for Eric Garner 1974-03-24 and boundary cases (master dates, reduce-masters convention, karmic 13 birthday, 19→10→1, leap day, accents, Y rule, empty name); King Wen table is a permutation of 1–64 and every pair is an inversion or (for 1/2, 27/28, 29/30, 61/62) a complement — an independent structural check; casting weights; moon principal phases vs astronomy-engine SearchMoonPhase over a year (< 1 min) and two known 2024 lunations (< 2 min); sunrise vs an independent NOAA formula (< 3 min); Chaldean-order week property; pre-sunrise day-ruler convention; polar-night error; biorhythm values for 19,193 days lived.
- Browser check: numerology, biorhythm, moon/hours and I Ching screens render at 390 px with no console errors and no horizontal scroll.
- Failed / fixed: one test expectation of mine was wrong (300° elongation is Waning crescent under 45° bins, not Last quarter). "Today" used the birth time zone instead of the user's; fixed with the current-location setting.
- Eric (calculated): Life Path 3 (both methods); Expression 8 Pythagorean / 2 Chaldean (Chaldean all-letters 29/11); Soul Urge 11 by name part vs 2 all vowels (Pythagorean), 3 Chaldean; Personality 6 / 8; Birthday 6; Maturity 11; karmic debt none in totals, 14 inside ERIC's vowels only; pinnacles 9-9-9-6, challenges 3-3-0-0, first break at 33; personal year 2026 = 1.
- Assumed: letter tables as commonly reproduced match Balliett and Cheiro; not yet checked against scans (needs the texts). Interpretation is entirely placeholder.
- UNVERIFIED: whether Eric's preferred name for numerology is "Eric Garner" or a fuller birth name.

### P3 Content layer + tarot — TEST
- Works: source registry; snippet store with approval gate; content-pack import with validation; key templates per engine; one Traditional layer per source plus a Synthesis layer for natal (sign and house per body), numerology Life Path, I Ching (hexagram, changing lines, relating), and tarot (per card, lens, reversal mode); 78-card deck, three spreads, replayable shuffle, Waite/Marseille numbering; original card faces; draws save to the journal.
- Acceptance: every displayed reading block shows its snippet id; traditional blocks show their source id and locator; placeholders are visibly placeholders and have ids.
- Tested (93 unit tests total): placeholder ids; unapproved → hypothesis label, approved → Traditional; lens fallback and reversal-mode isolation; one layer per source; pack refusals (no source, no locator, too long), warnings (cap, "will"), template skip, imported approval flags ignored; declared splits only; schema-1 export restores and re-stamps version; deck integrity; numbering swap; replay; reversals off; first-card chi-square over 78,000 seeded shuffles; rejection-sampling edge.
- Browser (`scripts/e2e-p3.cjs`): three-card draw, save to journal, import test pack, label flips from "Unapproved paraphrase" to "Traditional. Source: testsrc, p. 1" after approval; no console errors; no page-level horizontal scroll.
- Not done: no source text loaded (Waite, Legge, Balliett, Cheiro are registered only). Correspondence table exists but is empty: every correspondence needs a source and none is loaded. Library screen not built.

### Eric's chart (calculated, Placidus/tropical, mean node)
Sun 3°38′ Aries (H11), Moon 13°02′ Aries (H11), Asc 18°26′ Gemini, MC 29°40′ Aquarius. House-system splits: Mars Placidus 12 / whole sign 1; Neptune 6 / 7.

## Inputs received from Eric
- Birth: 1974-03-24, 11:15, Bossier City, Louisiana (32.516 N, 93.732 W; America/Chicago; UTC−5 because of 1974 emergency DST — see DECISIONS D-006).
- Name for numerology: "Eric Garner" (as given; full birth name not confirmed).

## Still owed by Eric (brief §8)
- Confirm full birth name for numerology (middle name?).
- 3–4 Astrodienst reference charts (one awkward case, e.g. a midnight birth), plus Planetaro, E-Bazi and Qi Men screenshots.
- Default house system, zodiac, reversal mode; Qi Men school.
- Any public-domain scans/texts; approval of paraphrases before they are labeled Traditional.

## Design canvas: what it lacks
The canvas (Today, Natal chart, Draw, Ledger, Readings/numerology) does not yet cover:
- Feng Shui compass, Shadow, Library (correspondences), Journal (tab currently links to an anchor on Today), Settings (conventions, profiles, backup), Lab as a hub (tab currently opens Ledger).
- Profile creation / birth-data entry, including ambiguous-time handling.
- Transits and Returns content (tabs exist, only Natal drawn).
- Readings "Daily" mode, and detail views for biorhythm, moon, planetary hours, I Ching.
- Export / restore flow and backup-status detail; fixtures-status page; Qi Men.
- All numbers on the canvas are sample values (it says so).

## Engines
| Engine | State | Notes |
|---|---|---|
| Foundation | TEST | P1 |
| Natal chart, transits, returns | TEST | awaiting Astrodienst fixtures |
| Numerology | TEST | letter tables not yet checked against source scans |
| Biorhythm, moon, planetary hours, I Ching | TEST | I Ching text not loaded |
| Tarot | TEST | text placeholders until sources are loaded |
| Content layer | TEST | approval gate, packs, templates |
| BaZi, Tzolk'in, Vedic | RESEARCH | D-004 |
| Feng Shui | IDEA | |
| Qi Men | RESEARCH | blocked on school choice (D-005) |
| Shadow, long tail | IDEA | |
