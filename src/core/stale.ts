import type { BackupStatus } from './backup';
import type { Profile } from './profile';
import { formatOffset, resolveLocal } from './time';

export interface Warning {
  id: string;
  level: 'act' | 'note';
  text: string;
}

/** WMM-2025 is valid through 2029; after that the declination model needs replacing. */
export const WMM_VALID_UNTIL = Date.UTC(2030, 0, 1);

export function staleWarnings(profiles: Profile[], backup: BackupStatus, nowMs: number): Warning[] {
  const w: Warning[] = [];
  if (backup.lastExport === null) w.push({ id: 'backup-never', level: 'act', text: 'Never exported. Safari can delete this data; export a backup to Files or iCloud.' });
  else if ((backup.daysSinceExport ?? 0) > 7) w.push({ id: 'backup-old', level: 'act', text: `Last export was ${backup.daysSinceExport} days ago. Export a fresh backup.` });
  if (backup.persisted === false) w.push({ id: 'persist', level: 'note', text: 'Persistent storage was not granted. Adding the app to the Home Screen usually helps; the export is still the real backup.' });
  for (const p of profiles) {
    try {
      const r = resolveLocal(p.birth.local, p.birth.zone);
      const now = r.kind === 'exact' ? [r.result.offsetSeconds] : r.kind === 'ambiguous' ? [r.earlier.offsetSeconds, r.later.offsetSeconds] : [r.before.offsetSeconds, r.after.offsetSeconds];
      if (!now.includes(p.birth.offsetSeconds)) {
        w.push({
          id: `tz-${p.id}`,
          level: 'act',
          text: `${p.displayName}: this device's time-zone data now gives ${now.map(formatOffset).join(' or ')} for the birth time; the profile stores ${formatOffset(p.birth.offsetSeconds)}. Charts still use the stored value. Check and edit the profile if needed.`
        });
      }
    } catch {
      w.push({ id: `tz-${p.id}`, level: 'act', text: `${p.displayName}: the birth zone "${p.birth.zone}" is not recognised on this device.` });
    }
  }
  if (nowMs >= WMM_VALID_UNTIL) w.push({ id: 'wmm', level: 'note', text: 'The magnetic model (WMM-2025) has expired; compass declination may be off. Update the app.' });
  return w;
}
