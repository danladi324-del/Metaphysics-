import { useEffect, useState } from 'preact/hooks';
import type { AstroConventions } from '../core/conventions';
import type { Profile } from '../core/profile';
import { canonicalJson } from '../core/canonical';
import type { CalcRecord } from '../core/record';
import { computeNatal, natalDisagreements, type NatalResult } from '../engines/natal/compute';
import type { Ephemeris } from '../engines/natal/ephemeris';
import { loadEphemeris } from '../engines/natal/loadBrowser';
import { useStore } from './store';

export function useEphemeris(): { eph: Ephemeris | null; error: string | null } {
  const [eph, setEph] = useState<Ephemeris | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadEphemeris().then(setEph, (e: Error) => setError(e.message));
  }, []);
  return { eph, error };
}

/** Natal record for a profile under given conventions: reuse a stored record with the same fingerprint, else compute and store. */
export function useNatal(profile: Profile | null, conv: AstroConventions) {
  const { db, bump } = useStore();
  const { eph, error } = useEphemeris();
  const [rec, setRec] = useState<CalcRecord<NatalResult> | null>(null);
  const key = profile ? `${profile.id}|${profile.updated_at}|${JSON.stringify(conv)}` : '';
  useEffect(() => {
    if (!eph || !profile) return;
    const fresh = computeNatal(eph, { utcMs: profile.birth.utcMs, lat: profile.place.lat, lon: profile.place.lon, timeKnown: profile.birth.timeKnown }, conv);
    const stored = db.records('fingerprint = ? AND profile_id = ?', [fresh.fingerprint, profile.id])[0] as CalcRecord<NatalResult> | undefined;
    if (stored) {
      if (canonicalJson(stored.raw_result) === canonicalJson(fresh.raw_result)) {
        setRec(stored);
        return;
      }
      // Same engine, version, inputs and conventions gave a different answer (rule 9). Keep both and say so.
      db.saveDisagreement({
        id: `${fresh.id}:drift`,
        kind: 'calculation',
        subject: 'Natal recompute differs from stored record',
        result_a: `stored ${stored.computed_at}`,
        result_b: `recomputed ${fresh.computed_at}`,
        cause: 'determinism failure: same inputs, same version',
        created_at: fresh.computed_at,
        profile_id: profile.id,
        engine: 'natal',
        record_id: fresh.id
      });
    }
    db.saveRecord(fresh, profile.id);
    for (const d of natalDisagreements(fresh, profile.id)) db.saveDisagreement(d);
    setRec(fresh);
    bump();
  }, [eph, key]);
  return { rec, eph, error };
}
