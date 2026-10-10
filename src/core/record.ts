import { canonicalJson, fingerprint } from './canonical';

/**
 * Calculation record envelope (table calc_record). No interpretation text lives here (rule 3).
 * evidence_label is always 'calculated'.
 */
export interface CalcRecord<R = unknown> {
  id: string;
  engine: string;
  engine_version: string;
  inputs: Record<string, unknown>;
  conventions: Record<string, unknown>;
  computed_at: string;
  raw_result: R;
  /** Shared inputs; engines sharing one count as one source in any convergence (rule 6). */
  input_dependencies: string[];
  limitations: string[];
  evidence_label: 'calculated';
  /** Fingerprint of engine + version + inputs + conventions. Same fingerprint must give the same raw_result. */
  fingerprint: string;
}

export interface EngineDescriptor {
  engine: string;
  version: string;
  input_dependencies: string[];
}

export function makeRecord<R>(
  d: EngineDescriptor,
  inputs: Record<string, unknown>,
  conventions: Record<string, unknown>,
  raw_result: R,
  limitations: string[] = [],
  now: Date = new Date()
): CalcRecord<R> {
  const fp = fingerprint({ engine: d.engine, version: d.version, inputs, conventions });
  return {
    id: `${d.engine}:${fp}:${now.getTime().toString(36)}`,
    engine: d.engine,
    engine_version: d.version,
    inputs,
    conventions,
    computed_at: now.toISOString(),
    raw_result,
    input_dependencies: [...d.input_dependencies],
    limitations,
    evidence_label: 'calculated',
    fingerprint: fp
  };
}

/** True when two records ran the same engine/version/inputs/conventions and produced identical results. */
export function sameResult(a: CalcRecord, b: CalcRecord): boolean {
  return a.fingerprint === b.fingerprint && canonicalJson(a.raw_result) === canonicalJson(b.raw_result);
}

/** Validate a record against the envelope. Returns a list of problems; empty means valid. */
export function validateRecord(r: unknown): string[] {
  const p: string[] = [];
  if (!r || typeof r !== 'object') return ['not an object'];
  const o = r as Record<string, unknown>;
  const str = ['id', 'engine', 'engine_version', 'computed_at', 'fingerprint'];
  for (const k of str) if (typeof o[k] !== 'string' || !(o[k] as string).length) p.push(`${k} must be a non-empty string`);
  for (const k of ['inputs', 'conventions']) if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) p.push(`${k} must be an object`);
  if (!('raw_result' in o)) p.push('raw_result missing');
  for (const k of ['input_dependencies', 'limitations']) {
    if (!Array.isArray(o[k]) || !(o[k] as unknown[]).every((x) => typeof x === 'string')) p.push(`${k} must be a string array`);
  }
  if (o.evidence_label !== 'calculated') p.push('evidence_label must be "calculated"');
  if (typeof o.computed_at === 'string' && Number.isNaN(Date.parse(o.computed_at))) p.push('computed_at is not a date');
  return p;
}
