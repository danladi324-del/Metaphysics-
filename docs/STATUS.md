# Status

Work-item states: IDEA, EXPLORATION, RESEARCH, DESIGN, BUILD, TEST, VALIDATE, RELEASE, MAINTAIN.

## Current phase
P1 done 2026-10-10 (pending external Astrodienst fixtures). P2 next.

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
| Numerology | IDEA | |
| Biorhythm, moon, planetary hours, I Ching | IDEA | |
| Tarot | IDEA | |
| BaZi, Tzolk'in, Vedic | RESEARCH | D-004 |
| Feng Shui | IDEA | |
| Qi Men | RESEARCH | blocked on school choice (D-005) |
| Shadow, long tail | IDEA | |
