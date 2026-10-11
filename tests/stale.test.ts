import { describe, expect, it } from 'vitest';
import type { Profile } from '../src/core/profile';
import { staleWarnings, WMM_VALID_UNTIL } from '../src/core/stale';

const eric: Profile = {
  id: 'p', displayName: 'R1',
  birth: { local: { year: 1974, month: 3, day: 24, hour: 11, minute: 15 }, zone: 'America/Chicago', offsetSeconds: -18000, utcMs: Date.UTC(1974, 2, 24, 16, 15), offsetSource: 'test', timeKnown: true },
  place: { name: 'Reference place', lat: 32.516, lon: -93.7321, source: 'geonames' }, numerologyNames: [], created_at: '', updated_at: ''
};
const ok = { lastExport: '2026-10-09', daysSinceExport: 1, persisted: true };

describe('stale-data warnings', () => {
  it('nothing to say when everything is current', () => {
    expect(staleWarnings([eric], ok, Date.UTC(2026, 9, 10))).toEqual([]);
  });
  it('backup never or over a week old', () => {
    expect(staleWarnings([], { lastExport: null, daysSinceExport: null, persisted: true }, 0)[0]!.id).toBe('backup-never');
    expect(staleWarnings([], { ...ok, daysSinceExport: 12 }, 0)[0]!.text).toMatch(/12 days/);
  });
  it('flags a stored offset the device tzdb no longer agrees with (D-006)', () => {
    const w = staleWarnings([{ ...eric, birth: { ...eric.birth, offsetSeconds: -21600 } }], ok, 0);
    expect(w[0]!.id).toBe('tz-p');
    expect(w[0]!.text).toMatch(/UTC−05:00.*UTC−06:00/);
  });
  it('unknown zone', () => {
    expect(staleWarnings([{ ...eric, birth: { ...eric.birth, zone: 'Mars/Olympus' } }], ok, 0)[0]!.text).toMatch(/not recognised/);
  });
  it('storage not persisted, magnetic model expired', () => {
    const w = staleWarnings([], { ...ok, persisted: false }, WMM_VALID_UNTIL);
    expect(w.map((x) => x.id)).toEqual(['persist', 'wmm']);
  });
});
