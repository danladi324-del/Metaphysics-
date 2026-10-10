# Install and run (iPhone only, no Mac)

## One-time setup on GitHub (from Safari or the GitHub app)
1. **Merge the work to `main`.** All phases were built on the branch `claude/intelligent-mendel-j3p880`. Open a pull request from it into `main` and merge it (or ask Claude Code to open the PR).
2. **Turn on Pages.** Note: the repository is private; GitHub Pages for a private repository needs a paid GitHub plan (Pro/Team). Without one, either make the repository public (the app holds no personal data; your data stays on the phone, though the docs mention your birth details) or deploy the same `dist/` folder with Cloudflare Pages, which the brief also allows. Then: Repository → Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
3. **Check Actions are allowed.** Repository → Settings → Actions → General → allow actions. The `Deploy to Pages` workflow runs on every push to `main`; `CI` runs on every push.
4. When `Deploy to Pages` finishes, the app is at `https://danladi324-del.github.io/Metaphysics-/`.

## Install on the iPhone
1. Open that URL in **Safari** (not another browser: only Safari can add a web app to the Home Screen with its own storage).
2. Share → **Add to Home Screen**. Open it from the icon from then on.
3. First run: create your profile. Everything is computed on the phone; nothing is sent anywhere (the page's Content-Security-Policy blocks connections to any other origin).
4. The app works offline after the first load.

## Backups (do this weekly)
Safari can delete web-app storage. The JSON export is the real backup.
- Lab → **Export all records** → Share sheet → **Save to Files** (iCloud Drive). The file contains your birth data; keep it private.
- Today and Lab show a red notice when the last export is more than 7 days old.
- Restore: Lab → **Restore from a backup file**. Restore replaces everything on the device, all or nothing; a malformed or truncated file is refused and nothing changes.

## Obsidian
A web app on iOS cannot write into your vault. Use **Obsidian note** / **Save as Obsidian note** on any reading or chart: the share sheet hands over a Markdown file; choose your vault folder in Files.

## Content (readings text)
The app ships no interpretive text. To add it:
1. Lab → Content → **Template: tarot** (or natal, numerology, iching, shadow, geomancy) saves a JSON file listing every key.
2. Fill in `text`, `label` (`traditional` needs `source_id` and `source_locator`), optional `themes`, and import it with **Import a content pack**.
3. Approve each traditional paraphrase in Lab. Until then it shows as a hypothesis.

## Updates
When a new version is deployed, the app shows "An update is ready" with a Reload button.

## Running tests (for Claude Code or CI)
```
npm ci
npm run typecheck
npm test
npm run build
```
Browser checks (headless Chromium): build, run `npx vite preview --port 4173`, then `PW=<playwright path> OUT=<dir> node scripts/e2e-p1.cjs` (and p3–p7).
