# Decisions

Each entry: the call, why, and what would reverse it. Entries marked **OWNER** are Eric's to make (brief §8); until he does, the value shown is provisional and labeled so in the UI.

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
**Verified in Node, 2026-10-10:** the package is built for web only (Emscripten `ENVIRONMENT_IS_NODE` stripped); tests inject the wasm via `instantiateWasm`. With Eric's data the engine returned Sun 3°38′ Aries (3.645°), Asc 18°26′ Gemini, Chiron 19°21′ Aries.
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
**Decision:** none until Eric picks Chai Bu vs Zhi Run (P7). Then test the matching MIT candidates against the old app's screenshots as fixtures before adopting any.
Sources: npm registry search 2026-10-10; [masterseanchan Qi Men](https://www.masterseanchan.com/qi-men-dun-jia-calculator/), [1080Ju on App Store](https://apps.apple.com/app/id869889798), [mingyu-core on jsDelivr](https://www.jsdelivr.com/package/npm/mingyu-core?tab=files).

## D-006 Time zones: resolve once at entry, store the offset
Historical offsets are the most common error source (brief §3). Eric's own birth is an example: on 1974-03-24 the US was on year-round emergency DST (from 1974-01-06), so 11:15 in Bossier City was **CDT, UTC−5**, not CST. A naive "March = standard time" rule would put the chart an hour off.
**Decision:** the profile stores local wall time, IANA zone, the UTC offset resolved at entry, and where the offset came from (`Intl` tzdb in the runtime that resolved it). Engines compute from the stored UTC instant, not from a fresh lookup, so the same record recomputes identically on any device (rule 9). On load the app re-resolves and flags a mismatch instead of silently changing the chart.
**Ambiguous/nonexistent local times** (fall-back hour, spring-forward gap) are detected and the user must pick.

## D-007 Hosting and CI
GitHub Pages deployed by GitHub Actions; tests run on every push. Vite base path `/Metaphysics-/`.

## D-008 Provisional conventions pending OWNER choices
Until Eric decides (brief §8), these defaults are used **and labeled provisional in the UI**. Competing conventions are computed anyway (rule 5), so the choice only sets which one is shown first.
- House system: **Placidus** (provisional); Whole Sign always computed alongside.
- Zodiac: **Tropical** (provisional); sidereal Lahiri computed alongside once Vedic lands.
- Tarot reversal mode: none set; P3 will show all modes until chosen.
- Qi Men school: none (P7 blocked on it).
- Lunar node: mean and true both stored; mean shown first (provisional). Lilith: mean apogee shown first, osculating stored.

## D-009 Numerology name
Eric gave "Eric Garner". Classical practice (Balliett) uses the full birth-certificate name for Expression. Stored as `name_used = "Eric Garner"`, `name_kind = "as given"` until Eric confirms whether there is a middle name or a different birth name.

## D-010 Sharing changes licensing
The app is personal. AGPL (Swiss Ephemeris) and GeoNames CC-BY attribution are fine at that scope. Sharing the app with anyone triggers a review of D-003 and of every content source.

## D-011 UI library: Preact
Brief fixes TypeScript + Vite but no framework. Preact 11 (MIT, ~4 KB) gives components and hooks without React's weight. Hash routing (`#/charts`) because GitHub Pages cannot rewrite paths.

## D-012 City list: GeoNames via npm
download.geonames.org is blocked from the build environment. The npm package `cities15000-json` 1.0.0 is a JSON port of GeoNames `cities15000` (2017 snapshot, CC-BY). `scripts/build-cities.mjs` trims it to `public/data/cities.tsv` (23,527 places, 1.27 MB, 540 KB gzipped). Coordinates and zone names from 2017 are adequate; the offset itself comes from tzdb at entry. Towns under 15,000 people need manual coordinates. Reverse if: Eric needs smaller places often — then regenerate from `cities5000` or `cities1000`.

## D-013 Stored record reuse and drift
A chart is recomputed on open; if a stored record with the same fingerprint exists and its result matches, the stored one is shown (stable `computed_at`). If it does not match, that is a rule-9 failure: a disagreement row is written with cause "determinism failure" and the fresh result is shown.

## D-014 Content: machinery now, text only on Eric's say-so
Loading source texts and approving paraphrases are Eric's (brief §8), so P3 ships no interpretive text. What exists:
- `source` table seeded with the four registered sources (none loaded).
- Content packs (JSON) imported from Lab. Validation refuses a traditional snippet without a registered source and a locator, refuses over 90 words, warns over 60 and on "will". Unfilled template entries are skipped.
- **Every imported traditional snippet arrives unapproved**, whatever the file says. Until Eric approves it in Lab it displays under the synthesis label with the caption "Unapproved paraphrase of <source>: a hypothesis until approved" (rule 2).
- Interpretation disagreements are written only when a pack declares a split between two snippets. The app does not infer that two texts disagree.
- When nothing is stored, the UI shows a placeholder that still has a snippet id (`placeholder:<layer>:<key>:<lens>`), so every displayed block traces to an id.
- Templates (Lab → Template: tarot / natal / numerology / iching) list every key an engine reads.

## D-015 Tarot
- Deck identity ids do not depend on numbering (`major.strength`), so Waite (Strength VIII, Justice XI) vs Marseille numbering is a convention with a ledger row when either card is drawn.
- Shuffle: Fisher-Yates with rejection sampling over `crypto.getRandomValues`; the whole 78-card order and orientation bits are stored, so any draw replays.
- Reversals: orientation is drawn when reversals are on; the reading mode (blocked, opposite, internal, delayed) stays unset until Eric picks. Snippets tied to another mode are never shown.
- Card faces are original generative line art (suit marks, numbered polygons). No Rider-Waite-Smith imagery.
- Celtic Cross position names paraphrased from Waite 1911 Part III; locator not verified against the text.
