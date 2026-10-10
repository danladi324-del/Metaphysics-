import { useMemo } from 'preact/hooks';
import { canonicalJson } from '../core/canonical';
import type { Disagreement } from '../core/db';
import type { CalcRecord } from '../core/record';
import { useStore } from './store';

/**
 * Compute a record, reuse the stored one when fingerprint and result match, otherwise store it
 * (with its disagreement rows). A mismatch with the same fingerprint is logged as a determinism failure.
 */
export function useStoredRecord<R>(
  deps: unknown[],
  make: () => CalcRecord<R> | null,
  diffs?: (r: CalcRecord<R>, profileId: string | null) => Disagreement[]
): { rec: CalcRecord<R> | null; error: string | null } {
  const { db, profile } = useStore();
  return useMemo(() => {
    let fresh: CalcRecord<R> | null;
    try {
      fresh = make();
    } catch (e) {
      return { rec: null, error: (e as Error).message };
    }
    if (!fresh) return { rec: null, error: null };
    const pid = profile?.id ?? null;
    const stored = db.records('fingerprint = ?', [fresh.fingerprint])[0] as CalcRecord<R> | undefined;
    if (stored && canonicalJson(stored.raw_result) === canonicalJson(fresh.raw_result)) return { rec: stored, error: null };
    if (stored) {
      db.saveDisagreement({
        id: `${fresh.id}:drift`, kind: 'calculation', subject: `${fresh.engine} recompute differs from stored record`,
        result_a: `stored ${stored.computed_at}`, result_b: `recomputed ${fresh.computed_at}`,
        cause: 'determinism failure: same inputs, same version', created_at: fresh.computed_at, profile_id: pid, engine: fresh.engine, record_id: fresh.id
      });
    }
    db.saveRecord(fresh, pid);
    for (const d of diffs?.(fresh, pid) ?? []) db.saveDisagreement(d);
    return { rec: fresh, error: null };
  }, deps);
}
