import { Db, SCHEMA_VERSION, TABLES, type Row, type TableName } from './db';
import { validateRecord } from './record';

export const EXPORT_FORMAT = 'metaphysics-export';

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  schema_version: number;
  app_version: string;
  exported_at: string;
  counts: Record<string, number>;
  tables: Record<TableName, Row[]>;
}

export function buildExport(db: Db, appVersion: string, now = new Date()): ExportFile {
  const tables = db.dumpTables();
  const counts: Record<string, number> = {};
  for (const t of TABLES) counts[t] = tables[t].length;
  return { format: EXPORT_FORMAT, schema_version: SCHEMA_VERSION, app_version: appVersion, exported_at: now.toISOString(), counts, tables };
}

export function exportJson(db: Db, appVersion: string, now = new Date()): string {
  const json = JSON.stringify(buildExport(db, appVersion, now), null, 1);
  db.setMeta('last_export', now.toISOString());
  return json;
}

/** Parse and check an export. Throws with a readable message on anything malformed. */
export function parseExport(text: string): ExportFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON.');
  }
  if (!data || typeof data !== 'object') throw new Error('Export is not an object.');
  const d = data as Partial<ExportFile>;
  if (d.format !== EXPORT_FORMAT) throw new Error('Not a Metaphysics export file.');
  if (typeof d.schema_version !== 'number' || d.schema_version > SCHEMA_VERSION) {
    throw new Error(`Export schema ${String(d.schema_version)} is newer than this app (${SCHEMA_VERSION}).`);
  }
  if (!d.tables || typeof d.tables !== 'object') throw new Error('Export has no tables.');
  for (const t of Object.keys(d.tables)) {
    if (!(TABLES as readonly string[]).includes(t)) throw new Error(`Unknown table "${t}".`);
    const rows = (d.tables as Record<string, unknown>)[t];
    if (!Array.isArray(rows)) throw new Error(`Table ${t} is not a list.`);
    if (d.counts && typeof d.counts[t] === 'number' && d.counts[t] !== rows.length) {
      throw new Error(`Table ${t} has ${rows.length} rows but the file says ${d.counts[t]}. The file may be truncated.`);
    }
  }
  for (const r of (d.tables.calc_record ?? []) as Row[]) {
    const rec = {
      ...r,
      inputs: safeParse(r.inputs),
      conventions: safeParse(r.conventions),
      raw_result: safeParse(r.raw_result),
      input_dependencies: safeParse(r.input_dependencies),
      limitations: safeParse(r.limitations)
    };
    const problems = validateRecord(rec);
    if (problems.length) throw new Error(`Calculation record ${String(r.id)} is malformed: ${problems.join('; ')}`);
  }
  return d as ExportFile;
}

function safeParse(v: unknown): unknown {
  try {
    return JSON.parse(String(v));
  } catch {
    return undefined;
  }
}

/** Replace the database contents with an export. All-or-nothing. */
export function restore(db: Db, file: ExportFile): void {
  db.replaceAll(file.tables);
  // An older export carries its own schema_version row; the tables are already at the current schema.
  db.setMeta('schema_version', String(SCHEMA_VERSION));
}

export interface BackupStatus {
  lastExport: string | null;
  daysSinceExport: number | null;
  persisted: boolean | null;
}

export function backupStatus(db: Db, persisted: boolean | null, now = new Date()): BackupStatus {
  const last = db.getMeta('last_export');
  const days = last ? Math.floor((now.getTime() - Date.parse(last)) / 86_400_000) : null;
  return { lastExport: last, daysSinceExport: days, persisted };
}
