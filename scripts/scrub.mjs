#!/usr/bin/env node
// Personal-data scanner (CHANGE_BRIEF_2 Part A). Reports WHERE listed strings occur, never the strings.
// Patterns come from a file outside the repo (default .scrub-patterns, gitignored) or the SCRUB_PATTERNS
// environment variable (a CI secret): one "label<TAB>regex" per line, # for comments. Matching is case-insensitive.
//
//   node scripts/scrub.mjs            scan the working tree (git ls-files plus dist/ if present); exit 1 on any hit
//   node scripts/scrub.mjs --history  also scan every commit reachable from any local ref (fetch refs/pull/* first to include them)
// Not scanned: binary files (images, PDFs, wasm, fonts), file names, branch and tag names, tag messages; patterns match within one line.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export function parsePatterns(text) {
  const out = [];
  text.split('\n').forEach((raw, n) => {
    const l = raw.trim();
    if (!l || l.startsWith('#')) return;
    const i = l.indexOf('\t');
    if (i < 0) throw new Error(`pattern line ${n + 1}: no TAB between label and regex`);
    const label = l.slice(0, i);
    try {
      out.push({ label, re: new RegExp(l.slice(i + 1), 'gi') });
    } catch {
      // The engine's own message quotes the regex, which is the secret; report only where it is.
      throw new Error(`pattern line ${n + 1} (${label}): not a valid regular expression`);
    }
  });
  return out;
}

export function scanText(patterns, where, text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const p of patterns) {
      p.re.lastIndex = 0;
      if (p.re.test(line)) hits.push({ label: p.label, where, line: i + 1 });
    }
  });
  return hits;
}

/** One line per hit: label and location. The matched text is never printed. */
export function formatHits(hits) {
  return hits.map((h) => `${h.label}\t${h.where}:${h.line}`).join('\n');
}

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|wasm|se1|woff2?)$/i;
/** Public datasets that legitimately contain place names and coordinates (the 23,527-city GeoNames list). */
export const ALLOW = [/(^|\/)data\/cities\.tsv$/];
export const allowed = (path) => ALLOW.some((re) => re.test(path));

function main() {
  const src = process.env.SCRUB_PATTERNS ?? (existsSync('.scrub-patterns') ? readFileSync('.scrub-patterns', 'utf8') : null);
  if (!src) {
    console.log('No patterns (set SCRUB_PATTERNS or create .scrub-patterns). Nothing scanned.');
    return;
  }
  const patterns = parsePatterns(src);
  const hits = [];
  // Tracked files plus untracked files that are not ignored (so a local run sees new docs before `git add`).
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  if (existsSync('dist')) files.push(...walk('dist'));
  for (const f of files) if (!BINARY.test(f) && !allowed(f) && existsSync(f)) hits.push(...scanText(patterns, f, readFileSync(f, 'utf8')));
  if (process.argv.includes('--history')) {
    const revs = execFileSync('git', ['rev-list', '--all'], { encoding: 'utf8' }).split('\n').filter(Boolean);
    for (const rev of revs) {
      const tree = execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', rev], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\0').filter(Boolean);
      for (const f of tree) {
        if (BINARY.test(f) || allowed(f)) continue;
        const text = execFileSync('git', ['show', `${rev}:${f}`], { encoding: 'utf8', maxBuffer: 1 << 28 });
        hits.push(...scanText(patterns, `${rev.slice(0, 7)}:${f}`, text));
      }
      const msg = execFileSync('git', ['log', '-1', '--format=%an%n%ae%n%cn%n%ce%n%B', rev], { encoding: 'utf8' });
      hits.push(...scanText(patterns, `${rev.slice(0, 7)}:<commit metadata>`, msg));
    }
  }
  if (hits.length) {
    console.log(formatHits(hits));
    console.error(`${hits.length} hit(s).`);
    process.exit(1);
  }
  console.log('No hits.');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
