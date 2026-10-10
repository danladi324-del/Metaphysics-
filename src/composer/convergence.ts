import type { Db } from '../core/db';

/**
 * Daily convergence across engines (rule 6 and the convergence-baseline method):
 * 1. group engines into independent sources by shared inputs (transitively);
 * 2. build the full table: each source, its engines, its declared themes;
 * 3. compute the chance baseline by seeded simulation over the real theme vocabulary;
 * 4. report observed overlap vs chance with a p-value, or BLOCKED when it cannot be assessed.
 * A computed convergence always carries its chance rate; there is no type without it.
 */

export interface EngineThemes {
  engine: string;
  /** Input dependencies as declared by the engine descriptor (and record). */
  deps: string[];
  /** Author-declared themes from approved traditional snippets only. Synthesis (generated) text never counts. */
  themes: string[];
}

export interface SourceRow {
  source: number;
  engines: string[];
  sharedInputs: string[];
  themes: string[];
}

export type Convergence =
  | { kind: 'blocked'; reason: string; table: SourceRow[] }
  | { kind: 'none'; table: SourceRow[]; independentSources: number; vocabulary: number; chanceRate: number; trials: number }
  | {
      kind: 'computed';
      table: SourceRow[];
      theme: string;
      /** How many independent sources carry the theme. */
      observed: number;
      enginesPointing: number;
      independentSources: number;
      vocabulary: number;
      /** P(some theme reaches `observed` independent sources) under random assignment: the p-value. */
      chanceRate: number;
      trials: number;
      verdict: 'unlikely by chance' | 'consistent with chance';
    };

/** Map a dependency to the shared input it stands for. Only these count; the query date and per-draw randomness do not. */
export function sharedInput(dep: string, engine: string): string | null {
  if (dep.startsWith('birth')) return 'birth data';
  if (dep.startsWith('ephemeris') || dep === 'solarTerms') return 'the sky (ephemeris)';
  if (dep === 'place') return 'current place';
  if (dep === 'random') return `random draw (${engine})`;
  return null;
}

export function groupSources(items: EngineThemes[]): SourceRow[] {
  const parent = items.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const inputs = items.map((it) => new Set(it.deps.map((d) => sharedInput(d, it.engine)).filter((x): x is string => x !== null)));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if ([...inputs[i]!].some((x) => inputs[j]!.has(x))) parent[find(j)] = find(i);
  const groups = new Map<number, number[]>();
  items.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
  return [...groups.values()].map((idx, k) => ({
    source: k + 1,
    engines: idx.map((i) => items[i]!.engine),
    sharedInputs: [...new Set(idx.flatMap((i) => [...inputs[i]!]))].sort(),
    themes: [...new Set(idx.flatMap((i) => items[i]!.themes))].sort()
  }));
}

/** mulberry32: deterministic so the same day gives the same chance rate. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** P(max over themes of #sources carrying it >= k), each source drawing its own number of distinct themes uniformly from V. */
export function simulateChance(themeCounts: number[], vocabulary: number, k: number, trials = 20_000, seed = 1): number {
  const rnd = seeded(seed);
  let hits = 0;
  const counts = new Int32Array(vocabulary);
  const pool = Array.from({ length: vocabulary }, (_, i) => i);
  for (let t = 0; t < trials; t++) {
    counts.fill(0);
    let max = 0;
    for (const m of themeCounts) {
      // Partial Fisher-Yates: m distinct themes.
      for (let i = 0; i < Math.min(m, vocabulary); i++) {
        const j = i + Math.floor(rnd() * (vocabulary - i));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        const c = ++counts[pool[i]!]!;
        if (c > max) max = c;
      }
    }
    if (max >= k) hits++;
  }
  return hits / trials;
}

export function convergence(items: EngineThemes[], vocabulary: number, seed = 1, trials = 20_000): Convergence {
  const table = groupSources(items);
  const withThemes = table.filter((r) => r.themes.length > 0);
  if (withThemes.length < 2) {
    return { kind: 'blocked', reason: `${withThemes.length === 0 ? 'No' : 'Only one'} independent source has approved, theme-tagged text today. Convergence cannot be assessed.`, table };
  }
  if (vocabulary < 2) return { kind: 'blocked', reason: 'The theme vocabulary has fewer than two themes; any overlap would be certain.', table };
  const tally = new Map<string, number>();
  for (const r of withThemes) for (const th of r.themes) tally.set(th, (tally.get(th) ?? 0) + 1);
  const [theme, observed] = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]!;
  const counts = withThemes.map((r) => r.themes.length);
  if (observed < 2) {
    return { kind: 'none', table, independentSources: withThemes.length, vocabulary, chanceRate: simulateChance(counts, vocabulary, 2, trials, seed), trials };
  }
  const chanceRate = simulateChance(counts, vocabulary, observed, trials, seed);
  return {
    kind: 'computed',
    table,
    theme,
    observed,
    enginesPointing: items.filter((i) => i.themes.includes(theme)).length,
    independentSources: withThemes.length,
    vocabulary,
    chanceRate,
    trials,
    verdict: chanceRate < 0.05 ? 'unlikely by chance' : 'consistent with chance'
  };
}

/** "about 4 in 10" style wording, never rounding a real chance to zero. */
export function chanceWords(p: number): string {
  if (p >= 0.95) return 'near certain';
  if (p < 0.01) return 'under 1 in 100';
  if (p < 0.1) return `about ${Math.max(1, Math.round(p * 100))} in 100`;
  return `about ${Math.round(p * 10)} in 10`;
}

/** Distinct declared themes across all approved traditional snippets: the vocabulary for the baseline. */
export function themeVocabulary(db: Db): number {
  const rows = db.all("SELECT themes FROM snippet WHERE label = 'traditional' AND approved = 1");
  return new Set(rows.flatMap((r) => JSON.parse(String(r.themes)) as string[])).size;
}
