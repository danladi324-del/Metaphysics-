import type { Db, Row } from '../core/db';

export type Lens = 'general' | 'love' | 'career' | 'finance' | 'health' | 'spiritual';
export const LENSES: Lens[] = ['general', 'love', 'career', 'finance', 'health', 'spiritual'];

export interface Source {
  id: string;
  title: string;
  author?: string | null;
  year?: number | null;
  license: string;
  url?: string | null;
  /** 'registered' = known, no text loaded; 'loaded' = text available to paraphrase from. */
  status: 'registered' | 'loaded';
  notes?: string | null;
}

export interface Snippet {
  id: string;
  key: string; // e.g. tarot.major.16.reversed or natal.sun.house.10
  tradition?: string | null;
  text: string;
  source_id?: string | null;
  source_locator?: string | null;
  label: 'traditional' | 'synthesis';
  lens: Lens;
  reversal_mode?: string | null;
  version: number;
  authored_by: string;
  placeholder: boolean;
  /** The owner's approval (brief §8). A traditional snippet shows as Traditional only when approved. */
  approved: boolean;
  /** Author-declared themes (e.g. "completion"). The app never assigns themes from wording. */
  themes: string[];
}

/** The registry of known sources. Mirrors docs/SOURCES.md. None has text loaded yet. */
export const BUILTIN_SOURCES: Source[] = [
  { id: 'waite1911', title: 'The Pictorial Key to the Tarot', author: 'A. E. Waite', year: 1911, license: 'public domain', status: 'registered' },
  { id: 'legge1899', title: 'The Yi King (Sacred Books of the East, vol. 16)', author: 'James Legge', year: 1899, license: 'public domain', status: 'registered' },
  { id: 'balliett', title: 'The Philosophy of Numbers', author: 'L. Dow Balliett', year: 1908, license: 'public domain', status: 'registered' },
  { id: 'cheiro', title: "Cheiro's Book of Numbers", author: 'Cheiro (William John Warner)', year: 1926, license: 'public domain (US)', status: 'registered', notes: 'Edition to confirm.' },
  // Astrology sources named by the owner, 2026-10-11 (DECISIONS D-029). Their house delineations assume quadrant houses, not whole sign.
  { id: 'lilly1647', title: 'Christian Astrology, Modestly Treated of in Three Books', author: 'William Lilly', year: 1647, license: 'public domain', status: 'loaded', notes: 'Book I: planets and signs; Books I–II: horary; Book III: nativities. Pre-modern: seven planets, Regiomontanus houses. Text: OCR of the Wellcome copy (archive.org b30338724), sources/ in the repo.' },
  { id: 'leo-afa', title: 'Astrology for All, Part I', author: 'Alan Leo', year: 1899, license: 'public domain', status: 'registered', notes: 'Characteristics by Sun and Moon sign. Editions differ in length (1899; enlarged 2nd ed. 1904; 1910): locators must name the edition.' },
  { id: 'heindel1918', title: 'The Message of the Stars', author: 'Max Heindel and Augusta Foss Heindel', year: 1918, license: 'public domain (US, text copyright 1918)', status: 'loaded', notes: 'Natal and medical astrology, Rosicrucian Fellowship (esoteric Christian). Text: 3rd ed., OCR of archive.org messageofstarses00heiniala, sources/ in the repo.' }
];

export function seedSources(db: Db): void {
  for (const s of BUILTIN_SOURCES) {
    db.run('INSERT OR IGNORE INTO source (id, title, author, year, license, url, status, notes) VALUES (?,?,?,?,?,?,?,?)', [
      s.id, s.title, s.author ?? null, s.year ?? null, s.license, s.url ?? null, s.status, s.notes ?? null
    ]);
    // A source whose text has since been loaded is upgraded; nothing is ever downgraded.
    if (s.status === 'loaded') db.run("UPDATE source SET status = 'loaded', notes = ? WHERE id = ? AND status = 'registered'", [s.notes ?? null, s.id]);
  }
}

/**
 * The house system a source's house delineations were written for (D-029). A house passage shown against a chart
 * cast in another system is a transplant, and the reading says so.
 */
export const SOURCE_HOUSE_BASIS: Record<string, string> = {
  lilly1647: 'Regiomontanus houses',
  heindel1918: 'quadrant houses from printed tables of houses (the book does not name the system)'
};

export function sources(db: Db): Source[] {
  return db.all('SELECT * FROM source ORDER BY id') as unknown as Source[];
}

export function rowToSnippet(r: Row): Snippet {
  return {
    id: String(r.id),
    key: String(r.key),
    tradition: (r.tradition as string | null) ?? null,
    text: String(r.text),
    source_id: (r.source_id as string | null) ?? null,
    source_locator: (r.source_locator as string | null) ?? null,
    label: r.label as Snippet['label'],
    lens: (r.lens as Lens) ?? 'general',
    reversal_mode: (r.reversal_mode as string | null) ?? null,
    version: Number(r.version),
    authored_by: String(r.authored_by),
    placeholder: Number(r.placeholder) === 1,
    approved: Number(r.approved) === 1,
    themes: JSON.parse(String(r.themes ?? '[]')) as string[]
  };
}

export function saveSnippet(db: Db, s: Snippet): void {
  db.run(
    `INSERT OR REPLACE INTO snippet (id, key, tradition, text, source_id, source_locator, label, lens, reversal_mode, version, authored_by, placeholder, approved, themes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [s.id, s.key, s.tradition ?? null, s.text, s.source_id ?? null, s.source_locator ?? null, s.label, s.lens, s.reversal_mode ?? null, s.version, s.authored_by, s.placeholder ? 1 : 0, s.approved ? 1 : 0, JSON.stringify(s.themes ?? [])]
  );
}

export function snippetsFor(db: Db, key: string): Snippet[] {
  return db.all('SELECT * FROM snippet WHERE key = ? ORDER BY label, lens, id', [key]).map(rowToSnippet);
}

export function approveSnippet(db: Db, id: string, approved: boolean): void {
  db.run('UPDATE snippet SET approved = ? WHERE id = ?', [approved ? 1 : 0, id]);
}

/** The owner rejects a paraphrase: it is removed, and its slot falls back to the placeholder. */
export function deleteSnippet(db: Db, id: string): void {
  db.run('DELETE FROM snippet WHERE id = ?', [id]);
}
