# Next steps for Claude Code

Paste this to Claude Code with `CHANGE_BRIEF_2.md`, `APP_PARITY.md` and `BUILD_BRIEF.md` in the repo's `docs/`. Where files conflict, `CHANGE_BRIEF_2.md` wins, and Part H wins over everything on narrative structure.

## Ground rules (unchanged)
- One step at a time. Tests green, `STATUS.md` updated, and a `DECISIONS.md` entry (D-031 onward) before the next step.
- Never mark anything verified that has not run. Nothing has run on the owner's iPhone yet; keep it in the UNVERIFIED list.
- Read the files in `docs/` first and report anything in them that contradicts this list.
- Stop and report after steps 1, 5 and 8.

## Step 0. Housekeeping
- Remove the biorhythm engine, its tests, its dashboard card and its fixtures. The owner dropped it.
- Fix the stale lines in `STATUS.md` (it says the Astrodienst agreement is unverified and the Qi Men fixture is owed; D-028 says both are done).
- Do not build: photo identification, sound or tone generation, meditation timer, hypnosis scripts, Heptabase (Part F).

## Step 1. Scrub (Part A). Prepare, do not execute.
- Produce the inventory of every file and every git-history commit that contains the owner's names or birth data.
- Produce a backup export and verify it restores.
- Write the exact commands for the new private repo with one squashed commit and the move to Cloudflare Pages.
- The owner runs the account steps. Do not delete the old public repo. Stop and report.

## Step 2. AI layer (Part B) with the Part H pipeline, numerology only
Build the whole path once, on the simplest engine, before touching the others.
- Key stored on the device, spend cap, per-call preview of exactly what leaves the device, CSP allowing one added origin.
- Pipeline in Part H order: code computes section 1; one model call per system returns text plus the fixed-vocabulary tags (tone, stance, themes); code compares tags and builds the outlier input; a synthesis call writes sections 2 to 4; a directive call writes section 5.
- Two AI labels (grounded, unsourced) plus the existing four. Quote verification by string match. Cache by input hash. Offline state shows the stored reading, never an error.
- Master mode (one system, no overlay) and daily mode (all overlaid). Update the Readings screen to the new sections (the design board is updated).
- Tests: everything listed in Part B and Part H. Confirm the `anthropic-dangerous-direct-browser-access` header requirement against current Anthropic docs and record the result.

## Step 3. Reference guides (Part B3, Part G)
- Verify each candidate in Part G: edition, translator, US status. Record in `SOURCES.md`. Drop any that fail.
- Store public-domain guides as keyed passages with locators. Fix OCR long-s in Lilly's text before indexing.
- Add the owner-import path for books the owner buys later. Nothing copyrighted in the repo.
- The owner owns no guides. BaZi, Qi Men and Feng Shui have no free English guide, so readings for them stay labeled unsourced until he supplies one; say so on screen.
- Ground numerology first (Balliett, Cheiro), then natal, I Ching, tarot.

## Step 4. Extend to every finished engine
Natal, BaZi, I Ching, Qi Men, Feng Shui, Shadow, tarot, moon and planetary hours. Same pipeline, same tests. Add a cross-engine daily briefing once at least three engines work.

## Step 5. Library (Part D)
Crystals, candles, herbs, colors, chakras, days and hours, metals, incense, oils, and the symbol library, with the sourcing rules in Part D (mineral facts from a dataset, symbol origins from a source or blank, herb toxicity flags). Screens and cross-links. Stop and report.

## Step 6. Engines still to build (Part E), one at a time
Order: sky calendar, runes, ogham, angel numbers, kameas, Tree of Life, Human Design, Gene Keys, dream symbols, Ifá (with the guardrail), sigil builder, ritual builder, synastry, Vedic divisional charts and antardashas, Ti Gua, Zhi Run Qi Men.
Each one gets a prior-art check, documented conventions, and a fixture from the owner. If the owner has not supplied a fixture, ship the engine marked UNVERIFIED in the UI.

## Step 7. Parity and missing screens
- Walk `APP_PARITY.md` with the owner; fix any row he corrects.
- Missing design screens: Feng Shui compass, Shadow, Library, Journal, Settings, profile entry. Build them in the app directly if the design board is not updated first.

## Step 8. Device test
Install to the owner's Home Screen and run a checklist: offline, backup and restore, Obsidian share, key entry, one full daily briefing. Update the UNVERIFIED list from the real results. Stop and report.

## Owner inputs still needed
- Run the scrub's account steps (Step 1) and confirm before the old repo is deleted.
- Anthropic API key and a spend cap.
- A reference screenshot from an outside tool for each new engine (Step 6).
- Choose and buy BaZi and Qi Men guides if he wants them grounded (the Qi Men school must match the engine).
- Confirm or correct the rows in `APP_PARITY.md`.
