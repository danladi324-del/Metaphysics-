# CHANGE BRIEF 2

Save next to BUILD_BRIEF.md. Where the two conflict, this one wins. Start the session with:
"Read CHANGE_BRIEF_2.md. Do Part A first and stop for my confirmation before deleting or force-pushing anything. Then Part B, then the rest in order. Commit per part, update docs/STATUS.md and docs/DECISIONS.md."

## What changed
1. **Scrub personal data and move hosting (new, first).**
2. **No snippets or paraphrases shown to the user.** Interpretations are generated live by an AI model from calculated facts. BUILD_BRIEF rule 8 (no free text) and section 5 (composer selects stored snippets) are replaced by Part B. Rules 1-7, 9 and 10 still hold.
3. **Everything in the owner's app folder becomes an in-app function,** plus the engines not yet built. No outside app stays in the loop.

---

## Part A. Scrub (do first)

**Goal:** no personal data of the owner or any other real person in any repo history, ref, build output, or hosted page.
**Personal data means:** the owner's names (birth name, current name), commit author and committer names and emails, birth date, time, place and coordinates of any real person (fixture R1 and any other), API keys, backup files.

1. **Backup first.** The owner exports a JSON backup from Lab. Do not continue until they confirm it is saved to Files.
2. **Inventory.** Report locations only, never values. Check `git log --all --format='%an <%ae> | %cn <%ce>' | sort -u`, `git log --all -p -S<each string>`, all refs including `refs/pull/*`, tags and stashes, plus `dist/`, `public/`, `sources/`, `docs/`, test names, e2e output and screenshots, `package.json` author. Write findings to `docs/SCRUB_REPORT.md` (locations only).
3. **Defaults (owner may override):** fixture inputs stay (they are the verification evidence) but only in a private repo, with names and labels that tie them to the owner removed.
4. **New private repo, one squashed commit of the scrubbed tree, noreply author.** Do not rewrite the old repo in place. As far as I know, force-pushing does not remove commits still reachable through GitHub's pull-request refs or direct SHA links, and the old repo has had a PR. Delete the old repo only after the new one works and the owner confirms.
5. **Hosting.** GitHub Pages on a private repo probably needs a paid plan (verify), and all of a user's github.io project sites share one origin, so any other page there could read the app's IndexedDB. Move to Cloudflare Pages (own `*.pages.dev` origin; verify it builds from a private GitHub repo on the free plan). Update Vite base path, manifest scope and `start_url`, service worker scope, `INSTALL.md`, and the deploy workflow.
6. **Verify.** Search the new repo's full history, the built `dist/`, and the deployed site for every scrubbed value: zero hits. The owner reinstalls to the Home Screen from the new URL, restores the backup, and confirms the chart recomputes identically.
7. **Guard going forward.** A CI check that fails on known personal strings. Keep the strings in a gitignored local file or a CI secret, never in the repo.

---

## Part B. Live AI interpretation

**Principle:** the model interprets, it never calculates. Every number comes from an engine.

1. **Facts packet.** Built from calculation records: placements, houses, aspects, numerology numbers, hexagram and changing lines, cards and positions, pillars, and the conventions in force. It contains no name, no birth date, time or place, no coordinates, and no journal text. Journal text goes only with a per-call toggle. A "What will be sent" preview shows before every call, with an ask-each-time setting and an "AI off" switch that falls back to Facts only.
2. **Labels.** Add two labels, each with its own dot color and both distinct from Traditional: **AI-generated, grounded** (reference passages were supplied; the reading lists them) and **AI-generated, unsourced** (none supplied). Both show model id, date and prompt version. Neither is ever Traditional: the displayed sentence is the model's, not a paraphrase the owner checked against a passage. Grounded means checkable, not true. Existing four labels stay.
3. **Grounding with reference guides (default on wherever a guide is loaded; toggle per engine).** A reference guide is any text that explains how a system is read. Three tiers:
   - **Public-domain guides** (see Part G; edition and US status verified per source in SOURCES.md): stored as passages keyed to what they explain (for example `natal.sun.house.10`), each with a locator.
   - **Copyrighted guides the owner owns:** never committed to the repo or bundled. The owner imports their own copy on the device (stored locally, excluded from exports unless chosen). The app sends only the few relevant excerpts per call, shows them in the preview, and displays at most a short quotation. Sending excerpts of an owned book to an API is the owner's legal call; record it in DECISIONS.md.
   - **Rule tables** (which gate, which sign, which Ju) are facts and algorithms, not prose, and need no guide.
   Relevant passages go into the prompt. The model may quote or refer only to supplied passages, and the reading lists "Sources supplied." The prompt forbids inventing authors, titles, pages or quotes. A post-check flags any "according to...", page number or quotation not found in the supplied text and shows a warning on that reading. Every quotation is checked by string match against the supplied text (normalizing whitespace and OCR long-s); an unmatched quotation is removed or flagged.
4. **Layers: superseded by Part H** (five sections, imperative directive, outliers computed by code). The 60-word cap below is lifted for the textbook narrative; default caps are about 150 words per section in the daily briefing and 400 in a master report, adjustable in settings. What remains of this item: conditional language and neutral voice in sections 1 to 4, tarot parameters. Original text: Facts (computed) / Interpretation (AI) / Where it splits (ask for two traditions' differing readings, labeled as the AI's account) / Your move (one question). Conditional language, neutral voice in layers 1-4, caps near 60 words per layer. Tarot takes lens (general, love, career, finance, health, spiritual) and reversal mode (blocked, opposite, internal, delayed, or "as commonly read") as prompt parameters.
5. **Cache and versions.** Fingerprint = hash(facts packet + conventions + lens + prompt version + model id). Master readings are generated on demand and saved; regenerating writes a new version and keeps the old. Daily readings generate at most once per day per engine unless the owner taps Regenerate. Calculations stay deterministic (rule 9); AI text is stored with its prompt hash and model, and is not expected to repeat.
6. **Offline.** Show the cached reading if one exists; otherwise "Facts only. Interpretation needs a connection."
7. **Key and network.** Bring-your-own key, entered in Lab, stored on the device only (IndexedDB), excluded from exports and never in the repo or bundle. CSP `connect-src` allows exactly one added origin (`https://api.anthropic.com`). Browser calls need the header `anthropic-dangerous-direct-browser-access: true` (verify in current docs). Model id is a setting, not hardcoded; pick from the current model list in the docs. The owner sets a monthly spend cap in the API console. Lab shows estimated tokens per call. The key requires the isolated origin from Part A.
8. **Convergence changes.** All AI interpretations come from one model, so they count as **one source**. Agreement across AI-read engines is not evidence. The convergence strip uses only approved traditional text (if any is loaded) and computed structure (for example, element counts). If neither is available it says "Not assessable for AI readings: they share one source." The chance-rate rule stays.
9. **Barnum control.** Fluent AI text reads as a fit by default. The prompt demands specifics tied to named placements, a "what this does not say" line, and one counter-reading. Outcomes (Fit / Partly / Didn't fit / Can't tell) stay. Add an optional blind null test: occasionally show a reading generated from a different, randomly chosen fixture chart, rated without being told. Show fit rates side by side only after 10 ratings each, labeled self-rated.
10. **Living traditions.** For Ifá/Odu (and any initiatory tradition added later): structure and casting only. The AI is not asked to produce verse text or ese. A notes field holds the owner's own sources. Interpretation prompts are off by default, with a one-line reason shown.
11. **Existing content pipeline.** Keep the pack importer and the raw public-domain passages as the grounding corpus. Remove the approval queue as a requirement to display. Do not delete the 216 Heindel paraphrases until the owner says so.
12. **Tests (CI never calls the real API).** Mock `fetch`. Snapshot the prompts. A leak test asserts the packet contains no name, birth data or coordinates. Cover the offline path, the cache-hit path, label presence on every AI block, convergence exclusion, quote verification (a fabricated quotation is removed or flagged; a genuine one with OCR long-s differences passes), and a CSP test that only the one added origin is allowed.

---

## Part C. App audit (before any code for Part D-F)

A draft `docs/APP_PARITY.md` is supplied with this brief, built from the owner's App Store screenshots for Intuchi, Healing Pal, Crystalyze and DivineSymbols (the owner omitted Believe, SacredAcoustics, Waking Up and Heptabase). It records what each store page advertises, not what the owner uses or how the apps behave inside. Treat it as the starting table: the owner confirms or corrects it, then Claude Code adds the engine or screen that covers each function. Do not guess functions from names.

## Part D. Library tab (correspondences)

Crystals, candles, herbs, colors, chakras, planetary days and hours, metals, incense and oils, all as views over the `correspondence` table.
- **Mineral facts** (hardness, composition, crystal system) come from a real dataset, not model memory. Evaluate Wikidata (CC0) and verify coverage and license. Metaphysical properties are AI-generated, labeled AI-generated, unsourced.
- **Candle colors:** sources disagree. Show tradition variants side by side and never pick a winner.
- **Herbs:** correspondences only. No ingestion or medical advice. Flag toxic plants from a real toxicity dataset (verify the source) and show the warning on the entry.
- Cross-links work in both directions (Tuesday, Mars, red candle, Tower).
- **Crystals (covers Healing Pal and Crystalyze, which overlap almost completely):** database with filters by property, chakra, zodiac sign, planet and element; collections (Own, Favorite, Wishlist) with private notes and photos, stored on the device; moon-phase link and the journal; affirmations and crystal numerology as AI-generated text.
- **Charging and cleansing guides** warn from the mineral dataset: soft or water-soluble minerals (for example selenite), stones that fade in strong sun (for example amethyst), toxic minerals or dust (for example malachite). Verify each against the dataset.
- **Symbol library (covers DivineSymbols).** Start with a few hundred symbols, not thousands: sacred geometry, Freemasonry and Knights Templar first. Origin, date and lineage fields come from a real source (Wikidata, Wikipedia or Commons, license verified) or stay blank. The AI may write an explanation, labeled, but never an origin or a date. Images are original line art or verified public domain. "Draw a symbol" uses the replayable random-draw framework. Filters: category, culture, theme.

## Part E. Engines still to build (one at a time, each with prior-art check and fixtures)

Runes (Elder Futhark), ogham, Ifá/Odu (structure and casting only, see B10), Human Design (design date = 88 degrees of solar arc before birth; gates, lines, centers, type, authority, profile), Gene Keys (derived from Human Design positions), Tree of Life paths, planetary kameas, dream symbols, angel numbers (label as modern), sigil builder (Spare's method and kamea method), ritual builder (day, hour, moon phase, candle, crystal; AI drafts the script, labeled), synastry and composite charts (second profile, stored locally, no names in AI packets), Vedic divisional charts and antardashas, Ti Gua replacement charts, Zhi Run Qi Men (intercalation; experimental), and a **sky calendar** (zodiac seasons, retrograde stations and shadows, eclipses, lunar phases, computed from ephemeris speeds; it is the premium calendar Crystalyze sells).
Each needs a reference screenshot from an outside tool as a fixture. The owner supplies them, or Claude Code marks the engine UNVERIFIED in the UI.
Public-domain grounding where it exists: Agrippa (kameas), Artemidorus (dream symbols), the old rune poems, the medieval ogham treatises.
Human Design and Gene Keys are proprietary systems: personal use only, and note it in DECISIONS.md.

## Part F. Omitted by the owner

Not built: biorhythm (also remove it from the built engines and the dashboard), sound or tone generation (SacredAcoustics), meditation timer and log (Waking Up), hypnosis script writer (Believe), Heptabase, and crystal photo identification. Do not add them back without the owner asking.

## Part G. Candidate grounding guides

From memory. Verify edition, translator and US status before loading, and record each in SOURCES.md.
- Natal: Lilly (1647), Leo (1899-1910) and Heindel (1918) are registered; Ptolemy's *Tetrabiblos*, Ashmand translation (1822).
- Tarot: Waite, *The Pictorial Key to the Tarot* (1911).
- I Ching: Legge (1899). Wilhelm/Baynes is copyrighted: the owner's own copy only.
- Numerology: Balliett (1908-17), Cheiro (1926).
- Kameas, geomancy: Agrippa, *Three Books of Occult Philosophy* (1651 translation) and *Of Geomancy* (1655 translation).
- Color, metal and planetary correspondences: Crowley, *777* (1909).
- Chakras: Woodroffe (Arthur Avalon), *The Serpent Power* (1919).
- Herbs: Culpeper, *Complete Herbal* (1653), an astrological herbal.
- Dream symbols: Artemidorus, *Oneirocritica* (public-domain English translations); Freud, *The Interpretation of Dreams* (Brill, 1913).
- Tree of Life and Hebrew letters: Westcott's *Sefer Yetzirah* (1887); Mathers, *The Kabbalah Unveiled* (1887).
- Ogham: Calder's translation of the *Auraicept na n-Eces* (1917). Runes: the Old English, Norwegian and Icelandic rune poems.
- BaZi, Qi Men, Feng Shui: the classical texts are public domain in Chinese, but the English guides I know of are modern and copyrighted. Ground on the Chinese originals or on the owner's own books.
- Vedic: classical texts exist, but I know of no public-domain English translation. Verify.
- Human Design, Gene Keys, crystal and candle lore, angel numbers: modern and copyrighted, or no canonical guide. Owner's own books only, and say "no canonical guide" in the UI where that is true.

## Part H. Narrative template (supersedes the five-layer structure in BUILD_BRIEF section 5)

Applies to every master report and to the daily briefing. The owner specified this order. Generate in the order given under "Pipeline"; display in this order.

1. **Established fact.** Computed values and dated records only: positions, pillars, numbers, phase, times, each with its convention. No meaning, no adjectives. Label: Calculated. Every value must equal the stored `calc_record` value exactly.
2. **Theoretical / structural interpretation.** What each tradition says this configuration means by its own rules, attributed by system name. Grounded in supplied passages where they exist (Part B3). Label: AI-generated, grounded or unsourced.
3. **Metaphysical speculation and esoteric synthesis.** The overlay: where the traditions line up on the one temporal mark, written as hypothesis. Label: Original synthesis (AI-generated). If it claims convergence, it shows the chance rate and the independence count (D-020) or it does not render.
4. **Outliers.** Any system whose interpretation disagrees with the others, below the synthesis, as system name plus its interpretation. Label: Disagreement. Omit the section when there are none, and say "no disagreement found" rather than leaving it silent.
5. **Directive.** An active operational directive: one imperative per source framework used, each naming its system ("Per BaZi: ..."), small, dated and checkable. Each directive carries the dot of the section it came from, and each becomes an Outcome check entry.

**Modes**
- **Daily briefing:** all systems overlaid on today's timestamp and the owner's chart. All five sections.
- **Master report, one system:** that system only; no overlay. Section 3 is the speculation inside that system's own tradition and its cross-links to the Library. Section 4 appears only for convention splits already in the ledger (house system, Zi hour, school). Section 5 is that system's directive.
- **Master "all systems" view (optional):** the same as the daily briefing, on the birth moment.

**Pipeline (this order is mandatory)**
1. Code computes section 1 from the engines.
2. Each system is interpreted in its own separate model call, from its own facts and its own grounding passages only. Each call also returns structured tags from a fixed vocabulary: tone (supportive, neutral, challenging), stance (act, wait, release) and up to three themes.
3. **Code compares the tags and decides what is an outlier.** The model does not. A disagreement that code finds is passed to the synthesis call as required input, and the model may add commentary but may not remove it. Reason: a single fluent synthesis call smooths disagreement away, and then section 4 is always empty.
4. A synthesis call writes sections 2 to 4 from the per-system results. A directive call writes section 5.
5. Quote verification and label checks (Part B) run on every section.

**Directive limits**
- No medical, financial, legal or relationship-ending directives. Small, reversible actions only (a walk, a message to write, a decision to write down).
- A directive that rests on section 3 says so in its dot. Hypothesis-based directives are allowed and must look like it.
- Never more directives than systems used, and a cap of five on the daily briefing.

**Tests**
- Section 1 values match `calc_record` exactly, and contain no interpretive language from a fixed word list.
- A fixture with two systems tagged opposite (supportive vs challenging) always produces an outlier entry naming both.
- Every outlier names a system. Every directive names a system. Every section carries a label.
- A single-system master contains no overlay section.

**UI.** Section order is fixed. Collapse state is the owner's choice; default expanded. On the phone, the heading row for each section shows its dot.

## Inputs I own

API key and spend cap; AI defaults (journal text off, grounding on); which guides they own and want used for grounding; confirmation before the old repo is deleted; screenshots for Part C and for each Part E fixture; any reference app the owner wants as the oracle for Vedic divisionals, Ti Gua and Zhi Run.
