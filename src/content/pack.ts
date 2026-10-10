import type { Db } from '../core/db';
import { LENSES, saveSnippet, sources, type Lens, type Snippet, type Source } from './model';

export const PACK_FORMAT = 'metaphysics-content';

export type PackSnippet = Omit<Snippet, 'approved' | 'placeholder' | 'version' | 'themes'> & { version?: number; themes?: string[] };

/** A content pack: sources, snippets and declared interpretation splits, loaded from a JSON file. */
export interface ContentPack {
  format: typeof PACK_FORMAT;
  version: 1;
  sources?: Source[];
  snippets?: PackSnippet[];
  /** Human-declared splits between two snippets. The app never infers a split from wording. */
  splits?: { key: string; snippet_a: string; snippet_b: string; notes?: string }[];
}

export interface PackReport {
  sources: number;
  snippets: number;
  splits: number;
  warnings: string[];
}

const KEY = /^[a-z0-9]+(\.[a-zA-Z0-9_-]+)+$/;
export const WORD_CAP = 60;
export const WORD_LIMIT = 90;

export function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Validate a pack. Throws on anything that would break a rule; returns warnings for soft issues. */
export function validatePack(raw: unknown, known: Set<string>): { pack: ContentPack; warnings: string[] } {
  if (!raw || typeof raw !== 'object') throw new Error('Pack is not an object.');
  const p = raw as ContentPack;
  if (p.format !== PACK_FORMAT) throw new Error('Not a Metaphysics content pack.');
  if (p.version !== 1) throw new Error(`Unsupported pack version ${String(p.version)}.`);
  const warnings: string[] = [];
  const sourceIds = new Set(known);
  for (const s of p.sources ?? []) {
    if (!s.id || !s.title || !s.license) throw new Error(`Source ${s.id ?? '?'} needs id, title and license.`);
    if (!/public domain|CC|own|licensed/i.test(s.license)) warnings.push(`Source ${s.id}: license "${s.license}" — check it permits use (rule 8).`);
    sourceIds.add(s.id);
  }
  const ids = new Set<string>();
  const all = (p.snippets ?? []) as PackSnippet[];
  const empty = all.filter((s) => !s.text?.trim());
  if (empty.length) warnings.push(`${empty.length} snippet(s) with empty text skipped (unfilled template entries).`);
  const filled = all.filter((s) => s.text?.trim());
  for (const s of filled) {
    const where = `Snippet ${s.id ?? '?'}`;
    if (!s.id || ids.has(s.id)) throw new Error(`${where}: missing or duplicate id.`);
    ids.add(s.id);
    if (!s.key || !KEY.test(s.key)) throw new Error(`${where}: key "${s.key}" is not a dotted key like tarot.major.fool.upright.`);
    if (s.label !== 'traditional' && s.label !== 'synthesis') throw new Error(`${where}: label must be traditional or synthesis.`);
    if (!LENSES.includes((s.lens ?? 'general') as Lens)) throw new Error(`${where}: unknown lens "${s.lens}".`);
    if (!s.authored_by) throw new Error(`${where}: authored_by is required.`);
    if (s.label === 'traditional') {
      if (!s.source_id || !sourceIds.has(s.source_id)) throw new Error(`${where}: a traditional snippet must cite a registered source (got "${s.source_id ?? ''}").`);
      if (!s.source_locator?.trim()) throw new Error(`${where}: a traditional snippet needs a locator (page, chapter or section) for its passage.`);
    }
    const n = words(s.text);
    if (n > WORD_LIMIT) throw new Error(`${where}: ${n} words; the limit is ${WORD_LIMIT} (layers are capped near ${WORD_CAP}).`);
    if (n > WORD_CAP) warnings.push(`${where}: ${n} words, over the ~${WORD_CAP}-word layer cap.`);
    if (s.themes !== undefined && (!Array.isArray(s.themes) || !s.themes.every((t) => typeof t === 'string'))) throw new Error(`${where}: themes must be a list of words.`);
    if (!s.key.endsWith('.move') && /\byou(r|rs|rself)?\b/i.test(s.text)) warnings.push(`${where}: addresses "you"; only the Your move layer may (layers 1-4 are neutral voice).`);
    if (/\bwill\b/i.test(s.text)) warnings.push(`${where}: uses "will"; readings should be conditional ("is read as").`);
  }
  for (const sp of p.splits ?? []) {
    if (!ids.has(sp.snippet_a) || !ids.has(sp.snippet_b)) throw new Error(`Split on ${sp.key}: both snippets must be in this pack.`);
  }
  return { pack: { ...p, snippets: filled }, warnings };
}

/** Import a validated pack. Traditional snippets always arrive unapproved: approval happens in the app (brief §8). */
export function importPack(db: Db, raw: unknown, now = new Date()): PackReport {
  const known = new Set(sources(db).map((s) => s.id));
  const { pack, warnings } = validatePack(raw, known);
  db.transaction(() => {
    for (const s of pack.sources ?? []) {
      db.sql.run('INSERT OR REPLACE INTO source (id, title, author, year, license, url, status, notes) VALUES (?,?,?,?,?,?,?,?)', [
        s.id, s.title, s.author ?? null, s.year ?? null, s.license, s.url ?? null, s.status ?? 'registered', s.notes ?? null
      ]);
    }
  });
  for (const s of pack.snippets ?? []) {
    saveSnippet(db, {
      id: s.id,
      key: s.key,
      tradition: s.tradition ?? null,
      text: s.text.trim(),
      source_id: s.source_id ?? null,
      source_locator: s.source_locator ?? null,
      label: s.label,
      lens: (s.lens ?? 'general') as Lens,
      reversal_mode: s.reversal_mode ?? null,
      version: s.version ?? 1,
      authored_by: s.authored_by,
      placeholder: false,
      approved: false,
      themes: (s.themes ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
    });
  }
  for (const sp of pack.splits ?? []) {
    const a = (pack.snippets ?? []).find((x) => x.id === sp.snippet_a)!;
    const b = (pack.snippets ?? []).find((x) => x.id === sp.snippet_b)!;
    db.saveDisagreement({
      id: `split:${sp.snippet_a}:${sp.snippet_b}`,
      kind: 'interpretation',
      subject: sp.key,
      result_a: `${a.source_id ?? a.authored_by}: ${a.text}`,
      result_b: `${b.source_id ?? b.authored_by}: ${b.text}`,
      cause: 'source',
      notes: sp.notes ?? null,
      created_at: now.toISOString(),
      engine: sp.key.split('.')[0] ?? null
    });
  }
  return { sources: pack.sources?.length ?? 0, snippets: pack.snippets?.length ?? 0, splits: pack.splits?.length ?? 0, warnings };
}

/** An empty pack listing every key, for filling in elsewhere and importing back. */
export function templatePack(keys: string[]): ContentPack {
  return {
    format: PACK_FORMAT,
    version: 1,
    sources: [],
    snippets: keys.map((key) => ({
      id: `${key}.general.1`,
      key,
      tradition: null,
      text: '',
      source_id: null,
      source_locator: null,
      label: 'synthesis' as const,
      lens: 'general' as Lens,
      reversal_mode: null,
      authored_by: 'Eric'
    })),
    splits: []
  };
}
