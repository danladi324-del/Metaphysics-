# BUILD BRIEF: Metaphysical Intelligence System (personal PWA)

Save this file in the repo root as `CLAUDE.md` (or `BUILD_BRIEF.md` and point CLAUDE.md at it). Start the session with:
"Read BUILD_BRIEF.md fully. Do the First Actions. Then work through the phases in order, committing at the end of each phase and updating STATUS.md. Stop only for the items under 'Decisions and inputs I own'."

---

## 0. Mission and constraints

One personal app that replaces a folder of astrology, numerology, BaZi, Qi Men, I Ching, biorhythm and symbol apps. It calculates, interprets with sourced text, compares engines, logs outcomes, and reports daily.

- User: Eric. One user. Personal use, not a product. Peer-level communication, no hype.
- Platform: **iOS only. No Mac, no Xcode, no local server.** Everything must be buildable and testable from Claude Code on web or mobile plus GitHub.
- Stack: **TypeScript, Vite, installable PWA, all calculation on-device.** Host on GitHub Pages or Cloudflare Pages. Tests run in GitHub Actions.
- Data: SQLite in the browser (evaluate sql.js or wa-sqlite with IndexedDB persistence; verify iOS Safari behavior). Call `navigator.storage.persist()`. Safari can evict storage, so the **JSON export to Files/iCloud is the real backup**.
- Obsidian: a PWA cannot write into the vault on iOS. Generate Markdown notes and offer them through the share sheet (Save to Files). Do not build anything that assumes direct vault writes.
- Design reference (canvas of phone screens, sample data): https://claude.ai/artifact/C8ruKAuE93yYb41GehhWqg . Read it with the Artifact tool. Match its structure, tab bar, and the dot-label system. Screens built there: Today, Natal chart, Draw, Ledger, Readings (numerology). Not yet designed: Feng Shui compass, Shadow, Library (correspondences).

## 1. Rules that override everything else

1. **Truth over polish.** If a result cannot be verified, say so in the UI and in STATUS.md. Never invent a source, a quote, a page number, or a test result.
2. **Four labels on every datum**, shown as a colored dot: Calculated (cyan), Traditional (brass), Original synthesis (violet), Disagreement (red). A sentence may be Traditional only if it paraphrases a cited passage. Anything else is Original synthesis. Generated text (including yours) is a hypothesis, never independent evidence.
3. **Separate what an engine calculated from what it means.** Calculation records and interpretation snippets are different tables.
4. **Conventions are parameters, never hardcoded**: house system, zodiac (tropical/sidereal + ayanamsa), Zi-hour rule, Qi Men school, magnetic/true north, name used for numerology, Pythagorean/Chaldean, reversal mode, master numbers kept or reduced. Every record stores the conventions it ran under.
5. **Compute competing conventions automatically** and store a diff row wherever results change. These feed the Ledger.
6. **`input_dependencies` on every engine.** Engines sharing an input (birth date, ephemeris, solar terms) count as one source in any convergence. Show the chance rate for any reported convergence. No convergence is reported without a null baseline.
7. **Check if it exists before building each engine**: search npm and GitHub, report one of exists / partially exists / adjacent / nothing found with sources, then decide borrow or build. Verify license and maintenance of every dependency.
8. **No copyrighted text.** Use public-domain sources or paraphrase. Placeholders like `[Paraphrase of a published reading goes here.]` are correct when no source text is loaded. Do not write interpretive content and label it Traditional.
9. **Every calculation module ships with reference tests** and boundary cases (midnight births, DST, solar-term boundaries, leap days, old dates). Same inputs plus same version must give the same output.
10. Prefer taking one engine to depth over starting five. Mark each work item with a status: IDEA, EXPLORATION, RESEARCH, DESIGN, BUILD, TEST, VALIDATE, RELEASE, MAINTAIN.

## 2. Skills and tools to load (if listed in your session)

- `frontend-design`, `artifact-design`: before building any UI. Keep the visual system from the design canvas.
- `casting-divination-engine`: I Ching hexagram casting mechanics. Never quote Wilhelm/Baynes text.
- `cardology-engine`, `convergence-baseline-calculator`: deterministic profile math and chance baselines. Use the baseline calculator for any "convergence" claim.
- `schema-contract-validator`: validate every engine's output against the declared record envelope.
- `eight`: score claims and sources across provenance, evidence and register. Use on interpretive content sources.
- `stage-auditor`, `full-set-table-formatter`: apply to full-set reference tables (all 78 cards, all 64 hexagrams, etc.) if they fit; skip any vault-specific rule that does not apply to this app.
- `efficiency-coach`: ask only when a prompt is genuinely ambiguous.
- `docs`/`xlsx` skills are not needed.
- Tools: Bash, WebSearch (research and prior-art checks), GitHub for CI.

Do not use vault-specific constants from the Quarter Quest Revelations vault in this app unless Eric asks.

## 3. Architecture

Repo layout:
```
/src/core        record envelope, date/time/location, conventions, db, export/import
/src/engines     one folder per engine; each exports compute(inputs, conventions) -> Record
/src/content     snippets and correspondence data (JSON), with source ids
/src/composer    narrative composer
/src/ui          screens and components
/tests           unit tests and fixtures
/docs            STATUS.md, SOURCES.md, CONVENTIONS.md, DECISIONS.md
```

**Calculation record** (table `calc_record`): id, engine, engine_version, inputs (JSON), conventions (JSON), computed_at, raw_result (JSON), input_dependencies (array), limitations, evidence_label (always Calculated here). No interpretation text in this table.

**Snippet** (table `snippet`): id, key (for example `natal.sun.house.10`), tradition, text, source_id, source_locator, label (Traditional or Original synthesis), lens (general, love, career, finance, health, spiritual), reversal_mode (nullable), version, authored_by.

**Correspondence** (table `correspondence`): entity_a, relation, entity_b, tradition, source_id, label. Tarot, crystals, candles, herbs, colors, planetary days and hours are all views over this table.

**Ledger** (table `disagreement`): id, kind (calculation or interpretation), subject, result_a, result_b, cause (convention or source), notes, created_at.

**Journal and outcomes**: entries, mood and energy check-ins, tags (user-supplied only), outcome links back to a compass action or draw.

**Timezone and location**: IANA database with historical offsets, offline city list (GeoNames, CC-BY, credit it). Wrong historical offsets are the most common error source.

## 4. Engines (build in this order)

1. **Foundation**: profile, date/time normalization, record envelope, DB, export/import (JSON, Markdown), backup status, tests and CI.
2. **Astronomy and natal chart**: positions, houses (Placidus and whole sign at minimum), aspects, nodes, Chiron, Lilith, wheel, transits, returns. Evaluate astronomy-engine (MIT) and a Swiss Ephemeris WASM build (AGPL is acceptable for personal use; note it in DECISIONS.md and revisit if the app is ever shared). astronomy-engine may not cover houses or Chiron; verify.
3. **Numerology**: Pythagorean and Chaldean side by side. Life Path, Expression, Soul Urge, Personality, Birthday, Maturity, karmic debt (13, 14, 16, 19), missing numbers, letter counts, pinnacles and challenges (first age break = 36 minus Life Path), personal year/month/day. Source letter tables from Balliett (Pythagorean) and Cheiro (Chaldean), cite them, and test against hand-worked examples. Name used is a stored choice.
4. **Biorhythm** (sine cycles from days lived; label "conventional, not validated"), **moon phase, planetary days and hours**, **I Ching** (casting mechanics; interpretation from Legge 1899, public domain).
5. **Tarot** (78 cards, upright and reversed, per-lens snippets, spreads). Waite's Pictorial Key (1911) is a public-domain source for paraphrase. Use original line art for card faces, not Rider-Waite-Smith images unless Eric supplies public-domain scans.
6. **Chinese and calendar systems**: BaZi (four pillars from solar terms; parameters: true solar time, early or late Zi hour, month boundary), Tzolk'in (correlation constant as a setting), Vedic (ayanamsa, nakshatras, dashas). Evaluate lunar-javascript before writing BaZi. Verify solar-term tables against ephemeris longitudes (Li Chun = 315 degrees).
7. **Feng Shui**: live luopan from `webkitCompassHeading` (permission on a tap; manual-degrees fallback), 24 mountains of 15 degrees, Flying Star (Period 9 now), Eight Mansions (Kua from the year with the Li Chun boundary). Store magnetic and true bearings; declination needs a magnetic model (evaluate offline options and verify). Flying Star, Eight Mansions and BaZi share the solar-term input.
8. **Qi Men Dun Jia**: pick a school first (Chai Bu vs Zhi Run), document it, ship as an experimental module, and keep the old app's output as a manual fixture.
9. **Shadow**: three parts only. (a) Chart pointers (Saturn, Pluto, Chiron, Lilith, 12th house, nodes) with cited traditional readings, labeled Interpretive. (b) Prompts generated from a placement or card. (c) Pattern log based only on tags the user adds to their own entries. The app never states what the user's shadow is.
10. **Long tail** (one at a time, each with sources): runes, ogham, geomancy, Ifa/Odu, Human Design, Gene Keys, Tree of Life paths, planetary kameas, crystals, candles, herbs, chakras, dream symbols, angel numbers, sigil builder, ritual builder.

## 5. Narrative composer

Every reading, in every engine, uses the same five layers in this order, each capped near 60 words:
1. **Facts** (Calculated): the numbers, placements, conventions.
2. **Traditional** (one per tradition, each cited).
3. **Original synthesis** (labeled as a hypothesis, written for this app).
4. **Where it splits**: disagreements, both shown, never resolved.
5. **Your move**: one question and one optional action. Never a prediction.

Rules: the composer selects and orders stored snippets by key, lens and convention. It does not generate free text. Every sentence traces to a snippet id. Language is conditional ("is read as", not "will"). Layers 1 to 4 are neutral voice; layer 5 may use "you". Each engine produces a **Master reading** (birth data only, generated on demand, saved, versioned, regenerated only when inputs or conventions change) and a **Daily reading** (date-dependent). The **Daily synthesis** on Today combines the dailies using layers 1, 3 and 5 plus the convergence strip (with independence and chance rate).

## 6. Screens (from the design canvas)

Tab bar: Today, Charts, Draw, Readings, Journal, Lab. Library (correspondences) lives under Lab until it gets its own tab.
- **Today**: sky now, Daily Compass (1 to 3 actions, each tracing to its source), engine cards with input badges, convergence strip with chance rate and independent-source count, quick draw with lens chips, outcome check, system health.
- **Charts**: natal, transits, returns, convention switcher, placements, reading with Traditional and Synthesis layers, "what changes under another convention" note.
- **Draw**: tool, lens, spread, reversal mode, reading, same card under other lenses, save to journal.
- **Readings**: engine tabs, Master and Daily toggle, inputs, tables, five-layer reading, provenance line, regenerate, save as Obsidian note.
- **Ledger**: calculation and interpretation disagreements, labels legend, fixtures status, export.
- **To design and build**: Feng Shui compass, Shadow, Library, Journal, settings (conventions, profiles, backup).
- Accessibility floor: 44px targets, real buttons and links, 4.5:1 text contrast, works at 390px width, no horizontal page scroll.

## 7. Phases and acceptance tests

- **P0 Scaffold**: Vite PWA, TypeScript strict, Vitest, GitHub Actions running tests, deploy to Pages, STATUS.md. Done when CI is green and the app installs to the home screen.
- **P1 Foundation + natal chart**: profile, time handling, envelope, DB, export/restore, natal chart with fixtures. Done when you can create a profile, compute a chart, export, wipe, restore, and recompute an identical result; and chart fixtures match the reference apps within a stated tolerance, or the differences are explained by convention.
- **P2 Fast engines**: numerology (both systems), biorhythm, moon, planetary hours, I Ching. Done when each has documented conventions and passing hand-worked reference cases.
- **P3 Content layer + tarot**: snippet and correspondence tables, source registry, tarot with lenses and reversal modes. Done when every displayed reading traces to a snippet id and source id, and placeholders are visibly placeholders.
- **P4 Calendar and Chinese systems + Feng Shui**: BaZi, Tzolk'in, Vedic, Feng Shui compass, Flying Star, Eight Mansions. Done when fixtures pass or differences are logged with causes.
- **P5 Composer, ledger, journal, outcomes**: five-layer composer, master and daily readings for finished engines, the disagreement ledger, journal tags and outcome comparison. Done when the system can report agreement, disagreement, and "insufficient information" without manufacturing consensus.
- **P6 Daily synthesis and dashboard**: Today screen on live data, convergence strip with independence and chance baseline. Done when a convergence cannot display without its chance rate.
- **P7 Long tail and Qi Men**: one module at a time with the same standards.
- **P8 Validate and release**: restore test, privacy review, malformed input tests, stale-data warnings, install docs. Freeze a stable release before experiments.

## 8. Decisions and inputs I own (stop and ask only for these)

- Birth date, time, place, and the name(s) to use for numerology.
- 3 to 4 reference-chart screenshots from Astrodienst (plus a few awkward cases such as a midnight birth), and Planetaro, E-Bazi and Qi Men screenshots for fixtures.
- Choice of Qi Men school, default house system, default zodiac, and default reversal mode.
- Any public-domain source scans or texts I want loaded, and approval of every paraphrase before it is labeled Traditional.
- Sharing the app with anyone else (it changes licensing and content rules).

For everything else: make the call, state the assumption in DECISIONS.md, and keep going.

## 9. First actions

1. Create the repo structure, STATUS.md, SOURCES.md, CONVENTIONS.md, DECISIONS.md.
2. Read the design canvas and list any screen or component the brief mentions that it lacks.
3. Run the prior-art check (rule 7) for: PWA SQLite persistence on iOS, ephemeris libraries (with houses and Chiron), lunar-javascript for BaZi, and open-source Qi Men implementations. Write findings to DECISIONS.md with sources.
4. Scaffold P0 and confirm CI and Pages deploy.
5. Ask me once for the inputs under section 8, then begin P1.

## 10. Working style

Be direct. No praise or hype. When something looks forced or already exists, say so. Keep commit messages plain. At the end of each phase report: what works, what was tested, what failed, what is assumed, what is still unverified.