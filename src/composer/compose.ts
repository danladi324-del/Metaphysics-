import { fingerprint } from '../core/canonical';
import type { Db } from '../core/db';
import type { EvidenceLabel } from '../core/labels';
import { snippetsFor, type Lens } from '../content/model';
import { WORD_CAP, words } from '../content/pack';
import { selectLayers } from '../content/select';

/** A calculated fact sentence: text filled from a record by a named template. */
export interface FactLine {
  /** Template id, e.g. fact:natal.sun. With the record id, this is the sentence's trace. */
  id: string;
  text: string;
}

/** What an engine hands the composer: calculated facts and the snippet keys to read. Built in views.ts. */
export interface EngineView {
  engine: string;
  title: string;
  recordIds: string[];
  facts: FactLine[];
  keys: { key: string; title: string; reversalMode?: string | null }[];
}

export interface LayerItem {
  /** Snippet id, placeholder id or fact-template id. */
  traceId: string;
  sourceId: string | null;
  caption: string;
  text: string;
  label: EvidenceLabel;
  placeholder: boolean;
}

export type LayerKind = 'facts' | 'traditional' | 'synthesis' | 'splits' | 'move';

export interface Layer {
  kind: LayerKind;
  title: string;
  items: LayerItem[];
  words: number;
  overCap: boolean;
}

/**
 * agreement: two or more approved sources share an author-declared theme and no split is declared.
 * disagreement: a split is recorded for these keys.
 * single-source: approved traditional text from one source, or several sources with no shared declared theme.
 * insufficient: no approved traditional text at all.
 */
export type Status = 'agreement' | 'disagreement' | 'single-source' | 'insufficient';

export interface Reading {
  engine: string;
  title: string;
  lens: Lens;
  layers: Layer[];
  status: Status;
  statusNote: string;
  sharedThemes: string[];
  traceIds: string[];
  /** Hash of the snippet rows used: a master reading is regenerated only when this or the record changes. */
  contentHash: string;
}

const LAYER_TITLE: Record<LayerKind, string> = {
  facts: 'Facts',
  traditional: 'Traditional',
  synthesis: 'Original synthesis',
  splits: 'Where it splits',
  move: 'Your move'
};

function layer(kind: LayerKind, items: LayerItem[]): Layer {
  const n = items.reduce((s, i) => s + (i.placeholder ? 0 : words(i.text)), 0);
  return { kind, title: LAYER_TITLE[kind], items, words: n, overCap: n > WORD_CAP };
}

/** Keep facts within the word cap; the full record stays one tap away. */
function capFacts(facts: FactLine[]): FactLine[] {
  const out: FactLine[] = [];
  let n = 0;
  for (const f of facts) {
    const w = words(f.text);
    if (out.length && n + w > WORD_CAP) break;
    out.push(f);
    n += w;
  }
  return out;
}

export function compose(db: Db, view: EngineView, lens: Lens): Reading {
  const recordTrace = view.recordIds[0] ?? 'none';
  const facts = layer(
    'facts',
    capFacts(view.facts).map((f) => ({ traceId: `${f.id}@${recordTrace}`, sourceId: null, caption: 'Calculated', text: f.text, label: 'calculated', placeholder: false }))
  );

  const tradItems: LayerItem[] = [];
  const approvedBySource = new Map<string, Set<string>>();
  let synthesisItem: LayerItem | null = null;
  const usedRows: unknown[] = [];
  for (const k of view.keys) {
    const l = selectLayers(db, k.key, lens, k.reversalMode ?? null);
    for (const t of l.traditional) {
      tradItems.push({ traceId: t.snippetId, sourceId: t.sourceId, caption: `${k.title}: ${t.caption}`, text: t.text, label: t.label, placeholder: t.placeholder });
      if (!t.placeholder && t.label === 'traditional' && t.sourceId) {
        const row = snippetsFor(db, k.key).find((s) => s.id === t.snippetId);
        const set = approvedBySource.get(t.sourceId) ?? new Set<string>();
        for (const th of row?.themes ?? []) set.add(th);
        approvedBySource.set(t.sourceId, set);
      }
    }
    if (!synthesisItem || synthesisItem.placeholder) {
      const s = l.synthesis;
      if (!synthesisItem || !s.placeholder) synthesisItem = { traceId: s.snippetId, sourceId: null, caption: s.caption, text: s.text, label: 'synthesis', placeholder: s.placeholder };
    }
    usedRows.push(...snippetsFor(db, k.key).map((s) => [s.id, s.text, s.approved, s.version, s.themes]));
  }

  // Splits: calculation rows for these records, interpretation rows declared for these keys.
  const keys = view.keys.map((k) => k.key);
  const calc = view.recordIds.length
    ? db.disagreements(`kind = 'calculation' AND record_id IN (${view.recordIds.map(() => '?').join(',')})`, view.recordIds)
    : [];
  const interp = keys.length ? db.disagreements(`kind = 'interpretation' AND subject IN (${keys.map(() => '?').join(',')})`, keys) : [];
  const seen = new Set<string>();
  const splitItems: LayerItem[] = [...interp, ...calc]
    .filter((d) => {
      const k = `${d.subject}|${d.result_a}|${d.result_b}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((d) => ({ traceId: `disagreement:${d.id}`, sourceId: null, caption: `${d.subject} (${d.cause})`, text: `${d.result_a} · ${d.result_b}`, label: 'disagreement' as const, placeholder: false }));
  if (!splitItems.length) {
    splitItems.push({ traceId: 'fact:no-split', sourceId: null, caption: 'Checked', text: 'No split is recorded for these inputs.', label: 'calculated', placeholder: false });
  }

  // Your move: a synthesis snippet keyed <primary>.move, else a placeholder. Never a prediction.
  const moveKey = `${keys[0] ?? view.engine}.move`;
  const move = snippetsFor(db, moveKey).find((s) => s.label === 'synthesis' && (s.lens === lens || s.lens === 'general'));
  const moveItem: LayerItem = move
    ? { traceId: move.id, sourceId: null, caption: 'Question and optional action', text: move.text, label: 'synthesis', placeholder: false }
    : { traceId: `placeholder:move:${moveKey}:${lens}`, sourceId: null, caption: 'Question and optional action', text: '[One question and one optional action go here.]', label: 'synthesis', placeholder: true };
  usedRows.push(move ? [move.id, move.text, move.version] : null);

  // Status, never inferred from wording.
  const sources = [...approvedBySource.keys()];
  let shared: string[] = [];
  if (sources.length >= 2) {
    const sets = [...approvedBySource.values()];
    shared = [...sets[0]!].filter((t) => sets.every((s) => s.has(t)));
  }
  let status: Status;
  let statusNote: string;
  if (interp.length) {
    status = 'disagreement';
    statusNote = `${interp.length} declared interpretation split${interp.length > 1 ? 's' : ''}. Both readings are shown; none is chosen.`;
  } else if (!sources.length) {
    status = 'insufficient';
    statusNote = 'Insufficient information: no approved traditional text for these placements.';
  } else if (shared.length) {
    status = 'agreement';
    statusNote = `${sources.length} approved sources share the declared theme${shared.length > 1 ? 's' : ''} ${shared.join(', ')}.`;
  } else {
    status = 'single-source';
    statusNote = sources.length === 1 ? `One approved source (${sources[0]}). No second source to agree or disagree.` : `${sources.length} approved sources with no shared declared theme. Not counted as agreement.`;
  }

  const layers = [facts, layer('traditional', tradItems), layer('synthesis', [synthesisItem!]), layer('splits', splitItems), layer('move', [moveItem])];
  return {
    engine: view.engine,
    title: view.title,
    lens,
    layers,
    status,
    statusNote,
    sharedThemes: shared,
    traceIds: layers.flatMap((l) => l.items.map((i) => i.traceId)),
    contentHash: fingerprint(usedRows)
  };
}

export interface StoredReading {
  id: string;
  engine: string;
  kind: 'master' | 'daily' | 'event';
  profile_id: string | null;
  record_id: string;
  record_fingerprint: string;
  content_hash: string;
  lens: Lens;
  day: string | null;
  composed_at: string;
  version: number;
  status: Status;
  reading: Reading;
}

/**
 * Save a reading. A master reading is versioned: an identical record fingerprint and content hash reuses the stored one;
 * anything else becomes the next version.
 */
export function storeReading(
  db: Db,
  r: Reading,
  kind: StoredReading['kind'],
  rec: { id: string; fingerprint: string },
  profileId: string | null,
  day: string | null = null,
  now = new Date()
): StoredReading {
  const prev = db.all(
    `SELECT * FROM reading WHERE engine = ? AND kind = ? AND lens = ? AND (profile_id = ? OR (profile_id IS NULL AND ? IS NULL)) AND (day = ? OR (day IS NULL AND ? IS NULL)) ORDER BY version DESC LIMIT 1`,
    [r.engine, kind, r.lens, profileId, profileId, day, day]
  )[0];
  if (prev && prev.record_fingerprint === rec.fingerprint && prev.content_hash === r.contentHash) return rowToStored(prev);
  const version = prev ? Number(prev.version) + 1 : 1;
  const row: StoredReading = {
    id: `reading:${r.engine}:${kind}:${profileId ?? '-'}:${day ?? '-'}:${r.lens}:v${version}`,
    engine: r.engine,
    kind,
    profile_id: profileId,
    record_id: rec.id,
    record_fingerprint: rec.fingerprint,
    content_hash: r.contentHash,
    lens: r.lens,
    day,
    composed_at: now.toISOString(),
    version,
    status: r.status,
    reading: r
  };
  db.run(
    `INSERT OR REPLACE INTO reading (id, engine, kind, profile_id, record_id, record_fingerprint, content_hash, lens, day, composed_at, version, status, layers)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [row.id, row.engine, kind, profileId, rec.id, rec.fingerprint, r.contentHash, r.lens, day, row.composed_at, version, r.status, JSON.stringify(r)]
  );
  return row;
}

function rowToStored(r: Record<string, unknown>): StoredReading {
  return {
    id: String(r.id),
    engine: String(r.engine),
    kind: r.kind as StoredReading['kind'],
    profile_id: (r.profile_id as string | null) ?? null,
    record_id: String(r.record_id),
    record_fingerprint: String(r.record_fingerprint),
    content_hash: String(r.content_hash),
    lens: r.lens as Lens,
    day: (r.day as string | null) ?? null,
    composed_at: String(r.composed_at),
    version: Number(r.version),
    status: r.status as Status,
    reading: JSON.parse(String(r.layers)) as Reading
  };
}

/** Markdown for Obsidian: five layers, labels and trace ids. */
export function readingMarkdown(s: StoredReading): string {
  const r = s.reading;
  const lines = ['---', `type: reading`, `engine: ${r.engine}`, `kind: ${s.kind}`, `version: ${s.version}`, `status: ${r.status}`, `record: ${s.record_id}`, `composed: ${s.composed_at}`, '---', `# ${r.title}`, '', `_${r.statusNote}_`, ''];
  for (const l of r.layers) {
    lines.push(`## ${l.title}`);
    for (const i of l.items) lines.push(`- **${i.caption}** (${i.label}): ${i.text} <!-- ${i.traceId} -->`);
    lines.push('');
  }
  return lines.join('\n');
}
