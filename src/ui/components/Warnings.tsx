import { backupStatus } from '../../core/backup';
import { staleWarnings } from '../../core/stale';
import { useStore } from '../store';
import { Label } from './Label';

export function Warnings() {
  const { db, profiles, persisted, version } = useStore();
  void version;
  const w = staleWarnings(profiles, backupStatus(db, persisted), Date.now());
  if (!w.length) return null;
  return (
    <section aria-label="Warnings">
      {w.map((x) => (
        <div class={`card${x.level === 'act' ? ' warn' : ''}`} style={{ padding: '12px' }}>
          <Label label={x.level === 'act' ? 'disagreement' : 'synthesis'}>{x.level === 'act' ? 'Needs attention' : 'Note'}</Label>
          <p class="note">{x.text}</p>
          {x.id.startsWith('backup') && (
            <a class="btn" href="#/lab" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Go to backup
            </a>
          )}
        </div>
      ))}
    </section>
  );
}
