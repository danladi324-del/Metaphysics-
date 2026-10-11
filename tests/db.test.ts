import initSqlJs from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportJson, parseExport, restore, backupStatus } from '../src/core/backup';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { Db } from '../src/core/db';
import type { Profile } from '../src/core/profile';
import { sameResult } from '../src/core/record';
import { resolveLocal } from '../src/core/time';
import { computeNatal, natalDisagreements, type NatalResult } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { nodeEphemeris } from './helpers/ephemeris';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let eph: Ephemeris;
beforeAll(async () => {
  SQL = await initSqlJs();
  eph = await nodeEphemeris();
});

function ericProfile(): Profile {
  const r = resolveLocal({ year: 1974, month: 3, day: 24, hour: 11, minute: 15 }, 'America/Chicago');
  if (r.kind !== 'exact') throw new Error('expected exact');
  return {
    id: 'p-eric',
    displayName: 'R1',
    birth: { local: { year: 1974, month: 3, day: 24, hour: 11, minute: 15 }, zone: 'America/Chicago', offsetSeconds: r.result.offsetSeconds, utcMs: r.result.utcMs, offsetSource: 'Intl tzdb', timeKnown: true },
    place: { name: 'Reference place', admin: 'LA', country: 'US', lat: 32.516, lon: -93.7321, source: 'geonames' },
    numerologyNames: [{ name: 'Eli Kane', kind: 'as given' }],
    created_at: '2026-10-10T00:00:00.000Z',
    updated_at: '2026-10-10T00:00:00.000Z'
  };
}

describe('P1 acceptance: profile -> chart -> export -> wipe -> restore -> identical recompute', () => {
  it('round-trips', async () => {
    const images: Uint8Array[] = [];
    const db = Db.open(SQL, null, async (img) => void images.push(img));
    const p = ericProfile();
    db.saveProfile(p);
    const rec = computeNatal(eph, { utcMs: p.birth.utcMs, lat: p.place.lat, lon: p.place.lon }, DEFAULT_ASTRO, undefined, new Date('2026-10-10T01:00:00Z'));
    db.saveRecord(rec, p.id);
    for (const d of natalDisagreements(rec, p.id)) db.saveDisagreement(d);
    await db.flush();
    expect(images.length).toBeGreaterThan(0);

    const before = db.counts();
    const json = exportJson(db, '0.1.0', new Date('2026-10-10T02:00:00Z'));
    db.wipe();
    expect(db.counts().profile).toBe(0);
    expect(db.counts().calc_record).toBe(0);

    restore(db, parseExport(json));
    const after = db.counts();
    expect(after.profile).toBe(before.profile);
    expect(after.calc_record).toBe(before.calc_record);
    expect(after.disagreement).toBe(before.disagreement);

    const restoredProfile = db.profiles()[0]!;
    expect(restoredProfile).toEqual(p);
    const stored = db.records('engine = ?', ['natal'])[0]!;
    expect(stored).toEqual(rec);
    const recomputed = computeNatal(eph, { utcMs: restoredProfile.birth.utcMs, lat: restoredProfile.place.lat, lon: restoredProfile.place.lon }, DEFAULT_ASTRO, undefined, new Date('2026-10-11T00:00:00Z'));
    expect(sameResult(stored as typeof recomputed, recomputed)).toBe(true);
  });

  it('a persisted image reopens with the same contents (simulated app restart)', async () => {
    let last: Uint8Array | null = null;
    const db = Db.open(SQL, null, async (img) => void (last = img));
    db.saveProfile(ericProfile());
    await db.flush();
    const reopened = Db.open(SQL, last, null);
    expect(reopened.profiles()[0]!.displayName).toBe('R1');
  });
});

describe('restore rejects malformed input and leaves data alone', () => {
  const db = () => {
    const d = Db.open(SQL, null, null);
    d.saveProfile(ericProfile());
    return d;
  };
  it('not JSON', () => expect(() => parseExport('{oops')).toThrow(/Not valid JSON/));
  it('wrong format tag', () => expect(() => parseExport('{"format":"other"}')).toThrow(/Not a Metaphysics export/));
  it('newer schema', () => expect(() => parseExport('{"format":"metaphysics-export","schema_version":99,"tables":{}}')).toThrow(/newer/));
  it('unknown table', () => expect(() => parseExport('{"format":"metaphysics-export","schema_version":1,"tables":{"evil":[]}}')).toThrow(/Unknown table/));
  it('truncated table', () => {
    const d = db();
    const f = JSON.parse(exportJson(d, '0.1.0'));
    f.tables.profile = [];
    expect(() => parseExport(JSON.stringify(f))).toThrow(/truncated/);
  });
  it('malformed calculation record', () => {
    const d = db();
    const f = JSON.parse(exportJson(d, '0.1.0'));
    f.tables.calc_record = [{ id: 'x', engine: 'natal', evidence_label: 'traditional' }];
    f.counts.calc_record = 1;
    expect(() => parseExport(JSON.stringify(f))).toThrow(/malformed/);
  });
  it('a failed restore is all-or-nothing', () => {
    const d = db();
    const f = JSON.parse(exportJson(d, '0.1.0'));
    f.tables.snippet = [{ id: 's', key: 'k', text: 't', label: 'NOT_A_LABEL', authored_by: 'x' }];
    expect(() => restore(d, f)).toThrow();
    expect(d.profiles().length).toBe(1);
  });
});

describe('backup status', () => {
  it('counts days since last export', () => {
    const d = Db.open(SQL, null, null);
    expect(backupStatus(d, null).lastExport).toBeNull();
    exportJson(d, '0.1.0', new Date('2026-10-01T00:00:00Z'));
    expect(backupStatus(d, true, new Date('2026-10-10T00:00:00Z')).daysSinceExport).toBe(9);
  });
});

describe('schema guards', () => {
  it('calc_record refuses any evidence label other than calculated (rule 3)', () => {
    const d = Db.open(SQL, null, null);
    expect(() => d.run("INSERT INTO calc_record VALUES ('a','e','1',NULL,'{}','{}','t','{}','[]','[]','traditional','f')")).toThrow();
  });
  it('snippet label must be traditional or synthesis', () => {
    const d = Db.open(SQL, null, null);
    expect(() => d.run("INSERT INTO snippet (id,key,text,label,authored_by) VALUES ('a','k','t','calculated','x')")).toThrow();
  });
});

export type { NatalResult };
