import type { Db } from './db';

export interface JournalLink {
  kind: 'record' | 'compass' | 'snippet';
  id: string;
  label: string;
}

export interface JournalEntry {
  id: string;
  created_at: string;
  text: string;
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  /** User-supplied only (brief §4.9). The app never adds tags. */
  tags: string[];
  links: JournalLink[];
}

export function saveEntry(db: Db, e: JournalEntry): void {
  db.run(
    'INSERT OR REPLACE INTO journal_entry (id, created_at, text, mood, energy, tags, links) VALUES (?,?,?,?,?,?,?)',
    [e.id, e.created_at, e.text, e.mood, e.energy, JSON.stringify(e.tags), JSON.stringify(e.links)]
  );
}

export function entries(db: Db, limit = 200): JournalEntry[] {
  return db.all('SELECT * FROM journal_entry ORDER BY created_at DESC LIMIT ?', [limit]).map((r) => ({
    id: String(r.id),
    created_at: String(r.created_at),
    text: String(r.text),
    mood: r.mood === null ? null : Number(r.mood),
    energy: r.energy === null ? null : Number(r.energy),
    tags: JSON.parse(String(r.tags)) as string[],
    links: JSON.parse(String(r.links)) as JournalLink[]
  }));
}

export function newEntryId(now = new Date()): string {
  return `j-${now.getTime().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Parse "#focus, sleep  #Work" into ["focus", "sleep", "work"]. */
export function parseTags(s: string): string[] {
  return Array.from(new Set(s.split(/[\s,]+/).map((t) => t.replace(/^#/, '').trim().toLowerCase()).filter((t) => /^[\p{L}\p{N}_-]+$/u.test(t))));
}
