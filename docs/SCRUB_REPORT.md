# Scrub report (CHANGE_BRIEF_2 Part A, step 2)

Locations only. No value is written here. Produced 2026-10-11 by `scripts/scrub.mjs --history` with a pattern list kept outside the repo (13 labels: names, account name, author display name, birth date, birth time, birth city, the city used for the reference chart, current or relocation city, birth and relocation coordinates, derived BaZi pillars). The GeoNames city list (`public/data/cities.tsv`, 23,527 places) legitimately contains those city names and is excluded.

## 1. Old repository (public): every commit is affected
- **28 of 28 commits** reachable from `main`, the work branch and `refs/pull/1`–`4` contain at least one listed value. Rewriting is not an option (Part A4): PR refs keep the old commits reachable.
- Labels found in history, by file:

| Label | Files that carried it in some commit |
|---|---|
| first name | `Claude.md`, `BUILD_BRIEF.md`, `docs/BUILD_BRIEF.md`, `docs/CONVENTIONS.md`, `docs/DECISIONS.md`, `docs/SOURCES.md`, `docs/STATUS.md`, `src/content/model.ts`, `src/content/pack.ts`, `src/core/conventions.ts`, `src/core/fixtures.ts`, `src/engines/bazi/compute.ts`, `src/ui/store.tsx`, 9 e2e scripts, 13 test files |
| middle name | `docs/CONVENTIONS.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `scripts/e2e-qimen.cjs`, `tests/numerology.test.ts` |
| surname | `docs/CONVENTIONS.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, `src/core/fixtures.ts`, 4 e2e scripts, `tests/db.test.ts`, `tests/numerology.test.ts` |
| birth date, birth time | docs (DECISIONS, STATUS), `src/core/fixtures.ts`, `src/engines/bazi/compute.ts`, all e2e scripts, 12 test files |
| birth city, birth coordinates | docs (CONVENTIONS, DECISIONS, STATUS), 8 e2e scripts, 11 test files |
| city used for the reference chart | 9 e2e scripts |
| current or relocation city and coordinates | `docs/DECISIONS.md`, `src/core/fixtures.ts`, `tests/reference-fixtures.test.ts` |
| derived BaZi pillars of the reference chart | `docs/DECISIONS.md`, `src/core/fixtures.ts`, `tests/reference-fixtures.test.ts` |
| account name | `docs/INSTALL.md`, `docs/STATUS.md` |

- **Commit metadata:** 8 commits have the owner's author display name and personal email (web uploads and PR merges: 3cf0217, 44e3e37, 489d5a0, 71b5b78, 73ea247, 77231b6, 8355a8f, c652583). 2 commit messages contain the first name (6800a6e, 9abf3e2). The other 20 commits are authored by Claude with a noreply address.
- **Refs:** `main`, `claude/intelligent-mendel-j3p880`, `refs/pull/1/head` to `refs/pull/4/head`. No remote tags, no stashes. A local tag `v0.1.0` exists in this session only (never pushed).
- **Not in git, on GitHub:** PR titles and descriptions for #1 to #4 (#2's description contains the full birth name; #2's title contains the first name). They disappear only with the repository.
- **Forks:** 0 (checked 2026-10-11). Clones and archives made while the repository was public (for example by Software Heritage) cannot be recalled.

## 2. Hosted site
- The GitHub Pages build of `main` (deployed 2026-10-11) contains, in its JavaScript bundle: the relocation city, the true-solar birth time and the derived BaZi pillars (via `src/core/fixtures.ts`). Every github.io project site of this account shares one origin (Part A5).

## 3. Account-level
- The GitHub account name contains the owner's middle name. It appears in every repository URL, in noreply email addresses (`<id>+<account>@users.noreply.github.com`) and in the github.io host name. A new repository under the same account keeps that. A private repository limits who sees it to the owner.
- The personal email address is the author email of the web-upload commits.

## 4. Working tree after Step 1 (this branch)
- `node scripts/scrub.mjs` on the tree and on `dist/` from both builds (`/Metaphysics-/` and `/`): **0 hits** (2026-10-11).
- What changed to get there: every test and e2e script now uses the fictitious sample chart **S1** (1983-12-15 02:20 MST, Denver; public city coordinates) or public places (Chicago). Tests that need the owner's reference chart moved to `tests/private/` (gitignored): `reference-fixtures.test.ts` (7 external fixtures), `r1-bazi.test.ts`, `r1-natal.test.ts`. A test variable named after the owner (missed by the 2026-10-11 cleanup) is gone. Lab's fixture list names what each fixture checks, not the values. DECISIONS D-006 and D-028 no longer quote values.
- `package.json` has no author field. `sources/` holds two public-domain OCR PDFs and a README with no personal data.
