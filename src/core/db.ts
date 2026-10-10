import type { Database, SqlJsStatic } from 'sql.js';
import type { CalcRecord } from './record';
import type { Profile } from './profile';

export const SCHEMA_VERSION = 1;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS profile (id TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS calc_record (
  id TEXT PRIMARY KEY, engine TEXT NOT NULL, engine_version TEXT NOT NULL, profile_id TEXT,
  inputs TEXT NOT NULL, conventions TEXT NOT NULL, computed_at TEXT NOT NULL, raw_result TEXT NOT NULL,
  input_dependencies TEXT NOT NULL, limitations TEXT NOT NULL, evidence_label TEXT NOT NULL CHECK (evidence_label = 'calculated'),
  fingerprint TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS calc_record_fp ON calc_record (fingerprint);
CREATE TABLE IF NOT EXISTS snippet (
  id TEXT PRIMARY KEY, key TEXT NOT NULL, tradition TEXT, text TEXT NOT NULL, source_id TEXT, source_locator TEXT,
  label TEXT NOT NULL CHECK (label IN ('traditional','synthesis')), lens TEXT NOT NULL DEFAULT 'general',
  reversal_mode TEXT, version INTEGER NOT NULL DEFAULT 1, authored_by TEXT NOT NULL, placeholder INTEGER NOT NULL DEFAULT 0,
  approved INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS snippet_key ON snippet (key);
CREATE TABLE IF NOT EXISTS correspondence (
  id TEXT PRIMARY KEY, entity_a TEXT NOT NULL, relation TEXT NOT NULL, entity_b TEXT NOT NULL,
  tradition TEXT, source_id TEXT, label TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS disagreement (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK (kind IN ('calculation','interpretation')), subject TEXT NOT NULL,
  result_a TEXT NOT NULL, result_b TEXT NOT NULL, cause TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL,
  profile_id TEXT, engine TEXT, record_id TEXT);
CREATE TABLE IF NOT EXISTS journal_entry (
  id TEXT PRIMARY KEY, created_at TEXT NOT NULL, text TEXT NOT NULL, mood INTEGER, energy INTEGER,
  tags TEXT NOT NULL DEFAULT '[]', links TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS outcome (
  id TEXT PRIMARY KEY, entry_id TEXT, target_kind TEXT NOT NULL, target_id TEXT NOT NULL,
  created_at TEXT NOT NULL, text TEXT NOT NULL, rating INTEGER);
`;

/** Tables included in export, in restore order. */
export const TABLES = ['meta', 'profile', 'calc_record', 'snippet', 'correspondence', 'disagreement', 'journal_entry', 'outcome'] as const;
export type TableName = (typeof TABLES)[number];
export type Row = Record<string, string | number | null>;

export interface Disagreement {
  id: string;
  kind: 'calculation' | 'interpretation';
  subject: string;
  result_a: string;
  result_b: string;
  cause: string;
  notes?: string | null;
  created_at: string;
  profile_id?: string | null;
  engine?: string | null;
  record_id?: string | null;
}

/** Called with the full DB image after each write. Browser: IndexedDB. Tests: in-memory. */
export type Persist = (image: Uint8Array) => Promise<void>;

export class Db {
  private dirty = false;
  private pending: Promise<void> = Promise.resolve();

  private constructor(readonly sql: Database, private persist: Persist | null) {}

  static open(SQL: SqlJsStatic, image: Uint8Array | null, persist: Persist | null): Db {
    const sql = image ? new SQL.Database(image) : new SQL.Database();
    sql.exec('PRAGMA foreign_keys = ON;');
    sql.exec(SCHEMA);
    const db = new Db(sql, persist);
    if (db.getMeta('schema_version') === null) db.setMeta('schema_version', String(SCHEMA_VERSION));
    return db;
  }

  all(query: string, params: (string | number | null)[] = []): Row[] {
    const st = this.sql.prepare(query);
    try {
      st.bind(params);
      const out: Row[] = [];
      while (st.step()) out.push(st.getAsObject() as Row);
      return out;
    } finally {
      st.free();
    }
  }

  run(query: string, params: (string | number | null)[] = []): void {
    this.sql.run(query, params);
    this.markDirty();
  }

  transaction(fn: () => void): void {
    this.sql.exec('BEGIN');
    try {
      fn();
      this.sql.exec('COMMIT');
    } catch (e) {
      this.sql.exec('ROLLBACK');
      throw e;
    }
    this.markDirty();
  }

  private markDirty(): void {
    this.dirty = true;
    if (!this.persist) return;
    const persist = this.persist;
    this.pending = this.pending.then(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      await persist(this.sql.export());
    });
  }

  /** Resolves when every write so far has been persisted. */
  flush(): Promise<void> {
    return this.pending;
  }

  getMeta(key: string): string | null {
    const r = this.all('SELECT value FROM meta WHERE key = ?', [key])[0];
    return r ? String(r.value) : null;
  }

  setMeta(key: string, value: string): void {
    this.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
  }

  // Profiles
  saveProfile(p: Profile): void {
    this.run('INSERT INTO profile (id, json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at', [
      p.id,
      JSON.stringify(p),
      p.updated_at
    ]);
  }

  profiles(): Profile[] {
    return this.all('SELECT json FROM profile ORDER BY updated_at DESC').map((r) => JSON.parse(String(r.json)) as Profile);
  }

  deleteProfile(id: string): void {
    this.transaction(() => {
      this.sql.run('DELETE FROM profile WHERE id = ?', [id]);
      this.sql.run('DELETE FROM calc_record WHERE profile_id = ?', [id]);
      this.sql.run('DELETE FROM disagreement WHERE profile_id = ?', [id]);
    });
  }

  // Calculation records
  saveRecord(r: CalcRecord, profileId: string | null): void {
    this.run(
      `INSERT OR REPLACE INTO calc_record (id, engine, engine_version, profile_id, inputs, conventions, computed_at, raw_result,
       input_dependencies, limitations, evidence_label, fingerprint) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        r.id, r.engine, r.engine_version, profileId, JSON.stringify(r.inputs), JSON.stringify(r.conventions), r.computed_at,
        JSON.stringify(r.raw_result), JSON.stringify(r.input_dependencies), JSON.stringify(r.limitations), r.evidence_label, r.fingerprint
      ]
    );
  }

  records(where = '1=1', params: (string | number | null)[] = []): CalcRecord[] {
    return this.all(`SELECT * FROM calc_record WHERE ${where} ORDER BY computed_at DESC`, params).map(rowToRecord);
  }

  // Disagreements
  saveDisagreement(d: Disagreement): void {
    this.run(
      `INSERT OR REPLACE INTO disagreement (id, kind, subject, result_a, result_b, cause, notes, created_at, profile_id, engine, record_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [d.id, d.kind, d.subject, d.result_a, d.result_b, d.cause, d.notes ?? null, d.created_at, d.profile_id ?? null, d.engine ?? null, d.record_id ?? null]
    );
  }

  disagreements(where = '1=1', params: (string | number | null)[] = []): Disagreement[] {
    return this.all(`SELECT * FROM disagreement WHERE ${where} ORDER BY created_at DESC, subject`, params) as unknown as Disagreement[];
  }

  counts(): Record<TableName, number> {
    const out = {} as Record<TableName, number>;
    for (const t of TABLES) out[t] = Number(this.all(`SELECT COUNT(*) AS n FROM ${t}`)[0]?.n ?? 0);
    return out;
  }

  dumpTables(): Record<TableName, Row[]> {
    const out = {} as Record<TableName, Row[]>;
    for (const t of TABLES) out[t] = this.all(`SELECT * FROM ${t} ORDER BY rowid`);
    return out;
  }

  /** Delete everything. Used by restore and by the "wipe" test. */
  wipe(): void {
    this.transaction(() => {
      for (const t of TABLES) this.sql.run(`DELETE FROM ${t}`);
      this.sql.run('INSERT INTO meta (key, value) VALUES (?, ?)', ['schema_version', String(SCHEMA_VERSION)]);
    });
  }

  replaceAll(tables: Partial<Record<TableName, Row[]>>): void {
    this.transaction(() => {
      for (const t of TABLES) this.sql.run(`DELETE FROM ${t}`);
      for (const t of TABLES) {
        for (const row of tables[t] ?? []) {
          const cols = Object.keys(row);
          if (!cols.every((c) => /^[a-z_]+$/.test(c))) throw new Error(`bad column in ${t}`);
          this.sql.run(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => row[c] ?? null));
        }
      }
    });
  }
}

function rowToRecord(r: Row): CalcRecord {
  return {
    id: String(r.id),
    engine: String(r.engine),
    engine_version: String(r.engine_version),
    inputs: JSON.parse(String(r.inputs)),
    conventions: JSON.parse(String(r.conventions)),
    computed_at: String(r.computed_at),
    raw_result: JSON.parse(String(r.raw_result)),
    input_dependencies: JSON.parse(String(r.input_dependencies)),
    limitations: JSON.parse(String(r.limitations)),
    evidence_label: 'calculated',
    fingerprint: String(r.fingerprint)
  };
}
