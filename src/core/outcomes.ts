import type { Db } from './db';

/** Self-rated fit between what a reading or action pointed to and what happened. No blind control exists, so these are not evidence of accuracy. */
export type Fit = 'fit' | 'partly' | 'no' | 'unclear';
export const FIT_LABEL: Record<Fit, string> = { fit: 'Fit', partly: 'Partly', no: "Didn't fit", unclear: "Can't tell" };
const FIT_CODE: Record<Fit, number> = { fit: 3, partly: 2, no: 1, unclear: 0 };
const CODE_FIT: Record<number, Fit> = { 3: 'fit', 2: 'partly', 1: 'no', 0: 'unclear' };

export interface Outcome {
  id: string;
  entry_id: string | null;
  target_kind: 'record' | 'compass';
  target_id: string;
  created_at: string;
  text: string;
  fit: Fit;
}

export function saveOutcome(db: Db, o: Outcome): void {
  db.run('INSERT OR REPLACE INTO outcome (id, entry_id, target_kind, target_id, created_at, text, rating) VALUES (?,?,?,?,?,?,?)', [
    o.id, o.entry_id, o.target_kind, o.target_id, o.created_at, o.text, FIT_CODE[o.fit]
  ]);
}

export function outcomes(db: Db): Outcome[] {
  return db.all('SELECT * FROM outcome ORDER BY created_at DESC').map((r) => ({
    id: String(r.id),
    entry_id: (r.entry_id as string | null) ?? null,
    target_kind: r.target_kind as Outcome['target_kind'],
    target_id: String(r.target_id),
    created_at: String(r.created_at),
    text: String(r.text),
    fit: CODE_FIT[Number(r.rating)] ?? 'unclear'
  }));
}

export interface OutcomeSummary {
  engine: string;
  counts: Record<Fit, number>;
  rated: number;
  /** Share rated "fit" among those that could be judged; null below 5 judged outcomes. */
  fitShare: number | null;
}

/** Per-engine counts of self-rated outcomes. Says "too few" instead of a rate under 5 judged cases. */
export function summarize(db: Db): OutcomeSummary[] {
  const rows = db.all(
    `SELECT c.engine AS engine, o.rating AS rating, COUNT(*) AS n FROM outcome o JOIN calc_record c ON c.id = o.target_id
     WHERE o.target_kind = 'record' GROUP BY c.engine, o.rating ORDER BY c.engine`
  );
  const by = new Map<string, OutcomeSummary>();
  for (const r of rows) {
    const e = String(r.engine);
    const s = by.get(e) ?? { engine: e, counts: { fit: 0, partly: 0, no: 0, unclear: 0 }, rated: 0, fitShare: null };
    s.counts[CODE_FIT[Number(r.rating)] ?? 'unclear'] += Number(r.n);
    by.set(e, s);
  }
  for (const s of by.values()) {
    const judged = s.counts.fit + s.counts.partly + s.counts.no;
    s.rated = judged + s.counts.unclear;
    s.fitShare = judged >= 5 ? s.counts.fit / judged : null;
  }
  return [...by.values()];
}

/** Tag counts and mean mood/energy per user tag. Only tags the user wrote. */
export function tagPatterns(db: Db, sinceIso: string): { tag: string; n: number; mood: number | null; energy: number | null }[] {
  const rows = db.all('SELECT tags, mood, energy FROM journal_entry WHERE created_at >= ?', [sinceIso]);
  const acc = new Map<string, { n: number; mood: number[]; energy: number[] }>();
  for (const r of rows) {
    for (const t of JSON.parse(String(r.tags)) as string[]) {
      const a = acc.get(t) ?? { n: 0, mood: [], energy: [] };
      a.n++;
      if (r.mood !== null) a.mood.push(Number(r.mood));
      if (r.energy !== null) a.energy.push(Number(r.energy));
      acc.set(t, a);
    }
  }
  const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);
  return [...acc.entries()].map(([tag, a]) => ({ tag, n: a.n, mood: mean(a.mood), energy: mean(a.energy) })).sort((x, y) => y.n - x.n || x.tag.localeCompare(y.tag));
}
