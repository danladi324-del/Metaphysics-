# Scrub and hosting move: plan (CHANGE_BRIEF_2 Part A; prepared, not executed)

Nothing here has been run. The old public repository is not touched until step 8, and only after the owner confirms.

## 0. Before anything (owner, on the phone)
1. **Backup.** Open the installed app → Lab → **Export all records** → Save to Files. Open the file once in Files to see it is not empty. Do not continue until this is done (A1).
2. **Keep the two private files** Claude sends with this report (they hold birth data and must never be committed):
   - `scrub-patterns.txt`: the strings the CI guard searches for.
   - `private-tests.b64`: the owner's reference-chart tests (Astrodienst, BaZi app, planetary hours, Kymon), base64 of a .tar.gz.
3. GitHub → Settings → Emails: tick **Keep my email addresses private** and **Block command line pushes that expose my email**. From then on, web uploads are authored with a noreply address.

## 1. New private repository (owner)
GitHub app or Safari → **New repository** → owner: this account → name: something neutral (it is not tied to the app's content) → **Private** → no README, no license (empty). Then, in the Claude Code environment settings, give Claude access to it.
*Account name:* it contains the owner's middle name and will still show in the new repo's URL. A private repo limits that to the owner. If that is not enough, create a new GitHub account or organization with a neutral name first and use it here instead (owner's call).

## 2. Secrets in the new repository (owner)
New repo → Settings → Secrets and variables → Actions → New repository secret:
- `SCRUB_PATTERNS` = the whole content of `scrub-patterns.txt`.
- `PRIVATE_TESTS_B64` = the whole content of `private-tests.b64`.
CI (`.github/workflows/ci.yml`) then runs the private fixture tests and fails the build if any listed string appears in the tree, the build output or any commit. Without the secrets it warns and skips; it never prints a value.

## 3. One squashed commit (Claude runs this, in a session with both repos)
```
cd <old clone>                         # at main after this branch is merged
git fetch origin main && git checkout --orphan scrubbed origin/main
git rm -r --cached -q tests/private 2>/dev/null || true      # gitignored anyway
SCRUB_PATTERNS="$(cat <scrub-patterns.txt>)" node scripts/scrub.mjs            # must print "No hits."
git -c user.name="owner" -c user.email="owner@users.noreply.github.com" \
    commit -q -m "Initial import (scrubbed tree of the old repository)"
git remote add new https://github.com/<account>/<new-repo>.git
git push new scrubbed:main
```
Verify in a fresh clone of the new repo:
```
git clone https://github.com/<account>/<new-repo>.git v && cd v
test "$(git rev-list --all | wc -l)" = 1
git log --all --format='%an <%ae> | %cn <%ce>' | sort -u      # one neutral line
SCRUB_PATTERNS="$(cat <scrub-patterns.txt>)" node scripts/scrub.mjs --history   # "No hits."
npm ci && npm test && BASE_PATH=/ npm run build && SCRUB_PATTERNS=... node scripts/scrub.mjs   # dist too
```
The author name and email are deliberately neutral, not the account's noreply address, because that address contains the account name.

## 4. Hosting: Cloudflare Pages (owner creates the account; settings below)
Why (A5): GitHub Pages from a private repository needs a paid plan, and the docs say private publishing needs an organization on Enterprise Cloud ([GitHub plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans)). All of an account's github.io project sites share one origin, so another page there could read the app's IndexedDB. A `*.pages.dev` project gets its own origin.
1. dash.cloudflare.com → sign up (free) → **Workers & Pages** → Create → **Pages** → **Connect to Git** → install the Cloudflare GitHub app on **only the new repository**.
2. Build settings: framework **None**; build command `npm run build`; output directory `dist`; environment variables `BASE_PATH=/` and `NODE_VERSION=22`.
3. Project name: neutral. It becomes `https://<project>.pages.dev`.
4. **UNVERIFIED:** whether the free plan builds from a *private* GitHub repository. This environment cannot reach Cloudflare's docs. If the private repo does not appear after installing the app, use the fallback: a GitHub Action that builds and runs `npx wrangler pages deploy dist --project-name <project>` with secrets `CLOUDFLARE_API_TOKEN` (Pages:Edit only) and `CLOUDFLARE_ACCOUNT_ID`. Claude adds that workflow on request.
5. Cloudflare now steers new projects toward Workers with static assets; Pages is still supported. Pages is used here because it needs no code. Revisit if Pages is retired.

Code already prepared on this branch: `vite.config.ts` takes `BASE_PATH` (default `/Metaphysics-/` so the current site keeps working; Cloudflare sets `/`), manifest `scope` and `start_url` follow it, fonts use base-relative URLs. Checked: a `BASE_PATH=/` build has scope `/`, start_url `/`, assets under `/assets/`, fonts under `/fonts/`, and no `/Metaphysics-/` left. Service-worker scope follows the base automatically (vite-plugin-pwa). The CSP needs no change for hosting (`'self'`). `pages.yml` (GitHub Pages deploy) is removed from the new repo in the first follow-up commit.

## 5. Verify the deployed site (Claude, then owner)
- Claude downloads `index.html`, the JS and CSS bundles and `manifest.webmanifest` from the pages.dev URL and runs the scanner over them: 0 hits. (If this environment cannot reach pages.dev, the owner adds it to the environment's allowed domains.)
- Owner: open the pages.dev URL in Safari → Share → Add to Home Screen → open it → Lab → **Restore from a backup file** → pick the step-0 export → check the natal chart shows the same placements as the old app.

## 6. Switch over (owner)
Use only the new Home Screen icon from now on. Delete the old icon (its data stays in the old origin until deleted; deleting the icon in Safari settings removes it).

## 7. Turn off the old site (owner, reversible)
Old repo → Settings → Pages → **Unpublish** (or set Source to none). This stops serving the bundle that carries fixture values.

## 8. Delete the old public repository (owner; irreversible; only after steps 1–7 work)
Old repo → Settings → Danger Zone → **Delete this repository**. This also removes PR #1–#4 (their titles and descriptions contain the owner's name) and the `refs/pull/*` copies. Copies made while it was public (clones, archives) cannot be recalled.

## 9. Guard going forward
CI runs `scripts/scrub.mjs --history` with `SCRUB_PATTERNS` on every push and fails on any hit. To add a string: edit the secret (never a file in the repo).
