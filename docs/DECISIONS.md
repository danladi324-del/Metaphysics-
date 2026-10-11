# Decisions

Each entry: the call, why, and what would reverse it. Entries marked **OWNER** are the owner's to make (brief §8); until then, the value shown is provisional and labeled so in the UI.

Prior-art findings use the four verdicts from rule 7: **exists / partially exists / adjacent / nothing found**. "Searched" lists what was actually checked on 2026-10-10. Nothing here was tested on an iPhone yet; anything about iOS Safari behavior is from documentation or third-party reports and is marked UNVERIFIED.

---

## D-001 Brief location
`Claude.md` held the brief. Renamed to `BUILD_BRIEF.md`; `CLAUDE.md` now points at it and at `docs/STATUS.md`.

## D-002 In-browser database: sql.js with IndexedDB snapshot
**Prior art: exists.** Searched npm metadata and PowerSync's survey posts.

| Option | License | Last publish | Notes |
|---|---|---|---|
| sql.js 1.14.2 | MIT | 2026-08 | In-memory SQLite; you persist the byte image yourself. Runs identically in Node, so tests exercise the real DB. 658 KB wasm. |
| @sqlite.org/sqlite-wasm 3.53.4 | Apache-2.0 | 2026-10 | Official. OPFS VFS needs a dedicated worker; the `opfs-sahpool` VFS avoids COOP/COEP headers (GitHub Pages cannot set headers). |
| wa-sqlite 1.0.0 (npm) | MIT | 2024-01 on npm | IDBBatchAtomicVFS recommended for broad support (PowerSync). npm release is stale; GitHub is newer. |

**Decision:** sql.js, whole-DB snapshot written to IndexedDB after each write transaction (debounced). The dataset is personal and small (well under 10 MB), so rewriting the image is cheap, and identical behavior in Node and Safari matters more than incremental writes.
**Reverse if:** DB grows past ~20 MB, or snapshot writes cause visible jank on the phone. Then move to sqlite-wasm `opfs-sahpool` in a worker.
**iOS storage (UNVERIFIED on device):** WebKit's 7-day script-writable storage cap is reported not to apply to Home Screen web apps (Apple developer forum thread 710157, citing WebKit ITP docs). The app calls `navigator.storage.persist()` and shows the result; the JSON export remains the real backup regardless.
Sources: [PowerSync: SQLite persistence on the web](https://powersync.com/blog/sqlite-persistence-on-the-web), [PowerSync 2024 update](https://conffab.com/elsewhere/the-current-state-of-sqlite-persistence-on-the-web-february-2024-update/), [Apple forum 710157](https://developer.apple.com/forums/thread/710157), [powersync-js PR 418 (OPFS on Safari)](https://github.com/powersync-ja/powersync-js/pull/418).

## D-003 Ephemeris: Swiss Ephemeris WASM (@swisseph/browser), astronomy-engine as cross-check
**Prior art: exists.**

| Option | License | Houses | Chiron | Notes |
|---|---|---|---|---|
| @swisseph/browser 1.4.0 | AGPL-3.0 | yes (Placidus, Koch, Equal, Whole Sign, Campanus, Regiomontanus…) | yes, with `seas_18.se1` | Swiss Ephemeris 2.10.03. Moshier built in. Maintained (2026-09). |
| astronomy-engine 2.1.19 | MIT | **no** | **no** | Verified: no house or Chiron code in the package. |
| swisseph-wasm 0.1.0 | GPL-3.0+ | yes | unknown | 3 MB. |
| @fusionstrings/swisseph-wasm | declares MIT | – | – | **Avoid:** wraps the Swiss Ephemeris C library, which is AGPL or commercial. The MIT label looks wrong. |

**Decision:** @swisseph/browser with Moshier for planets and `seas_18.se1` (223 KB, covers 1800–2399 CE, from github.com/aloistr/swisseph) bundled locally for Chiron, so the app stays offline. astronomy-engine (independent code base, MIT) is a test-only cross-check for Sun through Pluto.
**Verified in Node, 2026-10-10:** the package is built for web only (Emscripten `ENVIRONMENT_IS_NODE` stripped); tests inject the wasm via `instantiateWasm`. With reference chart R1 the engine returned values later confirmed against Astrodienst (D-028).
**License:** AGPL is acceptable for personal use (brief §4.2). **Must be revisited before the app is shared with anyone** (see D-010).
Sources: [@swisseph/browser README](https://cdn.jsdelivr.net/npm/@swisseph/browser@1.1.1/README.md), [swisseph-wasm README](https://cdn.jsdelivr.net/npm/swisseph-wasm@0.0.5/README.md), [fusionstrings swisseph-wasm](https://jsr.io/@fusionstrings/swisseph-wasm), [swisseph-js/swisseph](https://github.com/swisseph-js/swisseph).

## D-004 BaZi calendar: 6tail libraries (decide between two in P4)
**Prior art: exists.** lunar-javascript 1.7.7 (MIT, 2025-11) and tyme4ts 1.5.3 (MIT, 2026-10, same author, TypeScript, actively published). Both provide solar terms and four pillars.
**Decision deferred to P4:** check (a) whether the Zi-hour rule is exposed as a parameter (lunar-javascript's `EightChar.setSect` is reported to do this; verify), (b) whether solar-term instants agree with Swiss Ephemeris solar longitude (Li Chun = 315°) to the minute, (c) whether true-solar-time correction is supported or must be applied before the call. Whichever fails a check gets wrapped or replaced.
Sources: [6tail/lunar-javascript](https://docsearch.algolia.com/mcp/docs/repo/6tail/lunar-javascript), [6tail/tyme4ts](https://docsearch.algolia.com/mcp/docs/repo/6tail/tyme4ts).

## D-005 Qi Men Dun Jia: candidates exist, all young; school choice is OWNER
**Prior art: exists (several), maturity unverified.** All candidates were first published in 2026.

| Package | License | School(s) claimed | First published |
|---|---|---|---|
| qimen-dunjia 3.1.0 (arc119226) | MIT | Chai Bu and others | 2026-01 |
| @yhjs/dunjia 1.0.1 | MIT | hour and mountain-direction Qi Men | 2026-02 |
| @spensercai/qimen-wasm 0.2.1 (Rust) | MIT | hour-school Chai Bu, rotating | 2026-09 |
| kinqimen 0.3.1 | GPL-3.0 | Chai Bu | 2026-04 |
| mingyu-core 0.4.2 | AGPL-3.0 | multi-system | 2026-06 |

Commercial reference: *Qi Men Dun Jia 1080Ju* (iOS, Chai Bu) and masterseanchan.com (Zhi Run default per its docs).
**Decision:** none until the owner picks Chai Bu vs Zhi Run (P7). Then test the matching MIT candidates against the old app's screenshots as fixtures before adopting any.
Sources: npm registry search 2026-10-10; [masterseanchan Qi Men](https://www.masterseanchan.com/qi-men-dun-jia-calculator/), [1080Ju on App Store](https://apps.apple.com/app/id869889798), [mingyu-core on jsDelivr](https://www.jsdelivr.com/package/npm/mingyu-core?tab=files).

## D-006 Time zones: resolve once at entry, store the offset
Historical offsets are the most common error source (brief §3). Example (reference chart R1): on 1974-03-24 the US was on year-round emergency DST (from 1974-01-06), so 11:15 in America/Chicago was **CDT, UTC−5**, not CST. A naive "March = standard time" rule would put the chart an hour off.
**Decision:** the profile stores local wall time, IANA zone, the UTC offset resolved at entry, and where the offset came from (`Intl` tzdb in the runtime that resolved it). Engines compute from the stored UTC instant, not from a fresh lookup, so the same record recomputes identically on any device (rule 9). On load the app re-resolves and flags a mismatch instead of silently changing the chart.
**Ambiguous/nonexistent local times** (fall-back hour, spring-forward gap) are detected and the user must pick.

## D-007 Hosting and CI
GitHub Pages deployed by GitHub Actions; tests run on every push. Vite base path `/Metaphysics-/`.

## D-008 Provisional conventions pending OWNER choices
Until the owner decides (brief §8), these defaults are used **and labeled provisional in the UI**. Competing conventions are computed anyway (rule 5), so the choice only sets which one is shown first.
- House system: **Placidus** (provisional); Whole Sign always computed alongside.
- Zodiac: **Tropical** (provisional); sidereal Lahiri computed alongside once Vedic lands.
- Tarot reversal mode: none set; P3 will show all modes until chosen.
- Qi Men school: none (P7 blocked on it).
- Lunar node: mean and true both stored; mean shown first (provisional). Lilith: mean apogee shown first, osculating stored.


## D-010 Sharing changes licensing
The app is personal. AGPL (Swiss Ephemeris) and GeoNames CC-BY attribution are fine at that scope. Sharing the app with anyone triggers a review of D-003 and of every content source.

## D-011 UI library: Preact
Brief fixes TypeScript + Vite but no framework. Preact 11 (MIT, ~4 KB) gives components and hooks without React's weight. Hash routing (`#/charts`) because GitHub Pages cannot rewrite paths.

## D-012 City list: GeoNames via npm
download.geonames.org is blocked from the build environment. The npm package `cities15000-json` 1.0.0 is a JSON port of GeoNames `cities15000` (2017 snapshot, CC-BY). `scripts/build-cities.mjs` trims it to `public/data/cities.tsv` (23,527 places, 1.27 MB, 540 KB gzipped). Coordinates and zone names from 2017 are adequate; the offset itself comes from tzdb at entry. Towns under 15,000 people need manual coordinates. Reverse if: the owner needs smaller places often — then regenerate from `cities5000` or `cities1000`.

## D-013 Stored record reuse and drift
A chart is recomputed on open; if a stored record with the same fingerprint exists and its result matches, the stored one is shown (stable `computed_at`). If it does not match, that is a rule-9 failure: a disagreement row is written with cause "determinism failure" and the fresh result is shown.

## D-014 Content: machinery now, text only on the owner's say-so
Loading source texts and approving paraphrases are the owner's (brief §8), so P3 ships no interpretive text. What exists:
- `source` table seeded with the four registered sources (none loaded).
- Content packs (JSON) imported from Lab. Validation refuses a traditional snippet without a registered source and a locator, refuses over 90 words, warns over 60 and on "will". Unfilled template entries are skipped.
- **Every imported traditional snippet arrives unapproved**, whatever the file says. Until the owner approves it in Lab it displays under the synthesis label with the caption "Unapproved paraphrase of <source>: a hypothesis until approved" (rule 2).
- Interpretation disagreements are written only when a pack declares a split between two snippets. The app does not infer that two texts disagree.
- When nothing is stored, the UI shows a placeholder that still has a snippet id (`placeholder:<layer>:<key>:<lens>`), so every displayed block traces to an id.
- Templates (Lab → Template: tarot / natal / numerology / iching) list every key an engine reads.

## D-015 Tarot
- Deck identity ids do not depend on numbering (`major.strength`), so Waite (Strength VIII, Justice XI) vs Marseille numbering is a convention with a ledger row when either card is drawn.
- Shuffle: Fisher-Yates with rejection sampling over `crypto.getRandomValues`; the whole 78-card order and orientation bits are stored, so any draw replays.
- Reversals: orientation is drawn when reversals are on; the reading mode (blocked, opposite, internal, delayed) stays unset until the owner picks. Snippets tied to another mode are never shown.
- Card faces are original generative line art (suit marks, numbered polygons). No Rider-Waite-Smith imagery.
- Celtic Cross position names paraphrased from Waite 1911 Part III; locator not verified against the text.

## D-016 BaZi: own implementation, lunar-javascript as test oracle
**Prior art: exists** (lunar-javascript 1.7.7, tyme4ts 1.5.3, both MIT, same author). Built in-app instead of adopting because (a) its solar terms are tabulated in UTC+8 wall time, while births elsewhere need absolute instants, (b) true solar time must be applied before the day/hour pillars, and (c) both Zi-hour rules and every combination must be computed for the ledger. The code is ~150 lines on Swiss Ephemeris solar longitudes. lunar-javascript is a devDependency used only in tests, where it agrees on every case tested.

## D-017 Feng Shui declination: geomagnetism 0.2.0
**Prior art: exists.** geomagnetism (Apache-2.0, last publish 2024-12) ships WMM-2015/2020/2025 coefficients and runs offline. WMM-2025 is valid to 2029; the app will need a model update after that.

## D-018 Composer and the four statuses
- The composer selects stored snippets; it writes no free text. Facts are filled templates with ids (`fact:natal.sun`) traced together with the record id (`fact:natal.sun@<record id>`). Every item in every layer has a trace id.
- Layers: Facts (calculated, capped near 60 words), Traditional (one per source per key), Original synthesis, Where it splits (calculation rows for the record plus declared interpretation splits for the keys; "No split is recorded for these inputs." when empty), Your move (snippet `<key>.move`, else a placeholder).
- Status is decided by rule, never from wording:
  - **disagreement**: a split is declared for the keys;
  - **insufficient**: no approved traditional text;
  - **agreement**: two or more approved sources whose snippets share an author-declared theme;
  - **single-source**: anything else (one source, or several with no shared declared theme — explicitly "not counted as agreement").
- Themes are a new snippet field set by whoever writes the content pack. The app never assigns them.
- Master readings are stored and versioned; a new version is written only when the record fingerprint or the hash of the snippets used changes. Daily readings are stored per day; draw and cast readings per record.

## D-019 Outcomes are self-rated and labeled as such
Outcome = Fit / Partly / Didn't fit / Can't tell, linked to the record that was checked. The Lab shows counts per engine and a "fit" share only once five outcomes are judged, with a note that unblinded self-rating of vague readings scores high by itself (Barnum effect). No outcome feeds back into any engine.

## D-020 Convergence and its chance baseline
Method follows the convergence-baseline skill: full table, real baseline, p-value, verdict, or BLOCKED.
- **Sources.** Engines are merged into one source when they share an input, transitively: anything using birth data is one source, anything using an ephemeris or solar terms is "the sky", the current place is its own input, and each random draw is its own source. The query date and per-draw randomness are not shared inputs. This is conservative: a single engine that reads both birth data and the sky (transits) merges those groups.
- **What counts.** Only author-declared themes on **approved traditional** snippets. Synthesis text, including anything written by an AI, never counts (rule 2).
- **Baseline.** Seeded Monte Carlo, 20,000 simulated days: each independent source draws as many distinct themes as it actually has, uniformly from the real vocabulary (distinct themes across all approved snippets). The chance rate is P(some theme reaches the observed number of independent sources), which is the p-value. Seed = the date, so a day's figure is reproducible. Checked against exact values (1/4, 0.52, 1 − 56/120).
- **Display.** `Convergence` is a union type whose computed variant requires `chanceRate`; the strip always shows the full source table. Verdict "unlikely by chance" only below 0.05. BLOCKED when fewer than two independent sources carry approved themes or the vocabulary has fewer than two themes. With no content loaded, today's strip is BLOCKED, which is correct.

## D-021 Shadow
Three parts only (brief §4.9). (a) Pointers: Saturn, Pluto, Chiron, Lilith, the nodes, and any body in the 12th house under either the chosen system or whole sign (with the split noted). Facts only; interpretive readings come from snippets keyed `shadow.*` and follow the normal approval rules. (b) Prompts: four question templates written for this app, labeled Original synthesis; a test rejects assertive phrasing ("you are", "your shadow is", "this means"…). (c) Pattern log: counts of the user's own tags on entries written from a prompt. The app names no pattern.

## D-022 Long tail: geomancy first
**Prior art: partially exists** (npm `geomancy` 1.2.0, MIT, last published 2020: figure utilities without records or tests). Adjacent: `@catidegla/fadu` (Ifá/Fa 16 du). Geomancy chosen first because it is fully algorithmic and has a checkable invariant: over all 65,536 sets of Mothers the Judge is always one of the 8 even figures, each exactly 8,192 times (tested). Figure names are the conventional Latin ones; interpretation waits for a loaded source. Not built: the 12-house chart and perfection. Remaining long tail (runes, ogham, Ifá, Human Design, Gene Keys, Tree of Life, kameas, crystals, candles, herbs, chakras, dream symbols, angel numbers, sigil and ritual builders) stays IDEA, one at a time, each with sources.

## D-023 Qi Men blocked
Not started. The brief requires the school choice (Chai Bu vs Zhi Run) first, and the old app's output as a fixture. Candidate libraries are listed in D-005.

## D-024 Owner's choices, 2026-10-10
- **Birth name for numerology:** the full birth name, including the middle name. Names live only in the profile on the phone.
- **Sex:** given. New optional profile field, used only by BaZi luck-pillar direction and the Eight Mansions Kua formula.
- **House system:** "whole house system" read as **Whole Sign** (the assumption; Equal houses is the other system sometimes described that way). Default is now whole sign; Placidus is still computed alongside (rule 5).
- **Zodiac:** tropical. Sidereal stays selectable.
These are no longer marked provisional. Node type, Lilith type and master-number handling remain provisional.

## D-025 Tarot reversal mode (delegated to Claude): "as the source reads each card"
Options were blocked, opposite, internal, delayed. Chosen: none of them as the default, but the cited source's own reversed meaning per card (`mode: 'source'`, snippets keyed `tarot.<card>.reversed` with no mode tag).
Why it coheres: rule 2 lets a sentence be Traditional only when it paraphrases a cited passage. Waite 1911 (the registered tarot source) prints a reversed meaning for each card, so source-per-card reversals can reach the Traditional label. A blanket rule ("every reversal means blocked") is not a passage in any loaded source; applied across cards it is the app's own transformation, i.e. synthesis. The four generic modes stay available as comparison lenses and display as synthesis unless a cited passage for that mode is loaded.
Reverse if: the owner loads a source whose author defines reversals by one generic rule and wants that author as the default.

## D-026 BaZi luck pillars
- Direction: forward for yang year stem + male or yin year stem + female; otherwise backward.
- Start: days from birth to the next (forward) or previous (backward) month-boundary solar term, 3 days = 1 calendar year, minute precision, added as continuous time.
- Solar terms are absolute instants. lunar-javascript reads the birth clock as Beijing time, which is right for births in China and wrong elsewhere: for reference chart R1 (America/Chicago) that shifts the start by about two months. Tested against lunar-javascript on 120 Shanghai births: direction and pillars identical, start dates within 3 days (it adds calendar components, this adds continuous time).
- A bug found while testing: the first version converted days with "1 day = 120 days", which silently assumes 360-day years and drifted ~5 weeks over 7 years. Fixed.

## D-027 Qi Men school: Chai Bu (delegated to Claude)
**Prior art: exists**, with a split inside "Chai Bu" itself:
- `@spensercai/qimen-wasm` 0.2.1 (MIT, Rust/WASM): Chai Bu, yuan from the **day's fu head** (甲/己 day branch: 子午卯酉 upper, 寅申巳亥 middle, 辰戌丑未 lower), Ju switches the moment the term changes.
- `qimen-dunjia` 3.1.0 (MIT, JS): its "拆補" takes the yuan from **time elapsed since the term** in 5-day blocks; its "符頭" option is Zhi Run with intercalation (超神/接氣/置閏). Its README cites 《遁甲演義》 and 《奇門寶鑒御定》 and reports that the methods give different charts on 97% of 2024's noon hours.
**Choice:** Chai Bu with the fu-head yuan as the displayed chart; the elapsed-time yuan is computed alongside and logged when the Ju differs (e.g. 2024-01-15 10:00 +8: Ju 5 vs Ju 8). Zhi Run: not yet built.
**Why it coheres:** it needs only the solar term at the instant and the day pillar, both already computed by the app from absolute instants (the engine reuses the BaZi pillar code, so Qi Men and BaZi share one input, rule 6); it has no intercalation rule, the part texts disagree on most; and it has an independent implementation to test against.
**Conventions (match qimen-wasm):** hour chart, rotating plate; centre lodged in Kun; Tian Qin travels with Tian Rui; deities 值符 螣蛇 太阴 六合 白虎 玄武 九地 九天 for both duns (some schools say 勾陈/朱雀 in yang dun; positions are identical); day changes at 23:00; pillars from clock time in the zone.
**Verification:** vs qimen-wasm on 300 random hours (1950–2049, UTC+8): dun, term, yuan, Ju, leader star/door and palaces, and every palace's earth stem, heaven stems, stars, door and deity identical (sample includes 133 yin-dun hours, 22 centre-palace leaders, 29 Jia hours; a deliberate deity swap makes the test fail). Elapsed-time variant vs qimen-dunjia on 300 random whole hours: Ju and dun identical.
**Still owed:** the old app's output as a manual fixture (brief §4.8). Status: experimental.

## D-028 Reference fixtures from the owner's apps, and the defaults they settle (2026-10-10)
The owner supplied screenshots from Astrodienst (natal Placidus, sidereal Fagan/Bradley whole signs, a relocation chart, draconic), a BaZi app, a planetary-hours app and Qi Men Dun Jia Pro (kymon.net). They are transcribed in `tests/reference-fixtures.test.ts` and listed in `src/core/fixtures.ts` (shown in Lab). Results:
- Astrodienst natal: 11 bodies within 2″ (most within 1″); interpolated Lilith exact; true node 11″ and osculating Lilith 77″ off (Moshier vs Swiss data files); Ascendant, MC and four cusps to the printed minute. Sidereal: Sun, Moon, Ascendant, MC within 1″, confirming the nutation-inclusive ayanamsa (D-016 era fix). Relocation: Ascendant and MC to the second. Draconic: consistent within 15″.
- BaZi app: shows the birth time as 09:53, which is the app's true-solar-time result to the minute, with pillars 己巳 甲子 丁卯 甲寅.
- Planetary hours: Saturn day; Mars/Sun/Venus hours to the minute; sunrise ~1 minute apart.
- Kymon Qi Men: Yin dun Ju 9 with every palace's stems, door and deity identical, and annual stars identical. The competing elapsed-time yuan rule would give Ju 6, so Kymon follows the fu-head Chai Bu the app shows (supports D-027).
**Bug found by a fixture:** in sidereal mode, whole-sign cusps were tropical cusps minus the ayanamsa, leaving them mid-sign. Whole-sign cusps now start at 0° of the sidereal rising sign. (House assignment was already correct; the wheel's cusp lines were not.)
**Defaults aligned with the owner's own software** (all alternatives still computed and logged):
- Lunar node: **true** (Astrodienst shows True Node).
- Lilith: **interpolated**, newly added (Astrodienst's "Lilith (i)"); mean and osculating stay available.
- BaZi time: **true solar time on** (the owner's BaZi app is fed the true-solar time).
