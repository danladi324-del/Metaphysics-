import type { Lens } from '../../content/model';
import { selectLayers } from '../../content/select';
import { useStore } from '../store';
import { Label } from './Label';

/** Traditional (one per source) and Synthesis layers for a snippet key. Every block shows its snippet id. */
export function ReadingLayers({ snippetKey, lens, reversalMode = null }: { snippetKey: string; lens: Lens; reversalMode?: string | null }) {
  const { db, version } = useStore();
  void version;
  const l = selectLayers(db, snippetKey, lens, reversalMode);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {l.traditional.map((t) => (
        <div>
          <Label label={t.label}>{t.caption}</Label>
          <p class={t.label === 'traditional' ? 'serif' : 'serif synth'}>{t.text}</p>
          <div class="small muted">
            snippet {t.snippetId}
            {t.lensUsed !== lens ? ` · no ${lens} reading stored, showing ${t.lensUsed}` : ''}
          </div>
        </div>
      ))}
      <div>
        <Label label="synthesis">{l.synthesis.caption}</Label>
        <p class="serif synth">{l.synthesis.text}</p>
        <div class="small muted">snippet {l.synthesis.snippetId}</div>
      </div>
    </div>
  );
}
