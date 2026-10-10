import { useMemo, useState } from 'preact/hooks';
import { compose, readingMarkdown, storeReading, type EngineView, type Status, type StoredReading } from '../../composer/compose';
import type { Lens } from '../../content/model';
import { shareFile } from '../share';
import { useStore } from '../store';
import { Label } from './Label';

const STATUS_LABEL: Record<Status, { label: 'calculated' | 'traditional' | 'synthesis' | 'disagreement'; text: string }> = {
  agreement: { label: 'traditional', text: 'Sources agree on a declared theme' },
  disagreement: { label: 'disagreement', text: 'Sources disagree' },
  'single-source': { label: 'traditional', text: 'Single source' },
  insufficient: { label: 'synthesis', text: 'Insufficient information' }
};

export function ComposedReading({ view, kind, rec, day = null, lens = 'general' }: { view: EngineView; kind: StoredReading['kind']; rec: { id: string; fingerprint: string }; day?: string | null; lens?: Lens }) {
  const { db, profile, version, bump } = useStore();
  const [note, setNote] = useState<string | null>(null);
  const stored = useMemo(() => storeReading(db, compose(db, view, lens), kind, rec, profile?.id ?? null, day), [rec.fingerprint, lens, version, day]);
  const r = stored.reading;
  const st = STATUS_LABEL[r.status];
  return (
    <section class="card" style={{ gap: '14px' }}>
      <div>
        <h2>{r.title}</h2>
        <div class="small muted">
          {kind === 'master' ? 'Master reading' : kind === 'daily' ? `Daily reading, ${day}` : 'Reading for this chart or draw'} · version {stored.version} · composed {stored.composed_at.slice(0, 10)}
        </div>
      </div>
      <div>
        <Label label={st.label}>{st.text}</Label>
        <p class="note small">{r.statusNote}</p>
      </div>
      {r.layers.map((l, i) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h3>
            {i + 1}. {l.title}
            {l.overCap ? <span class="small" style={{ color: 'var(--clash)' }}> · {l.words} words, over the cap</span> : null}
          </h3>
          {l.items.map((it) => (
            <div>
              <Label label={it.label}>{it.caption}</Label>
              <p class={l.kind === 'facts' || l.kind === 'splits' ? 'note' : it.label === 'traditional' ? 'serif' : 'serif synth'} style={{ marginTop: '4px' }}>
                {it.text}
              </p>
              <div class="small muted" style={{ overflowWrap: 'anywhere' }}>
                {it.traceId}
              </div>
            </div>
          ))}
        </div>
      ))}
      <div class="grid2">
        <button
          class="btn"
          onClick={() => {
            bump();
            setNote('Recomposed. A new version is stored only if the record or the content changed.');
          }}
        >
          Regenerate
        </button>
        <button class="btn" onClick={() => shareFile(`${r.title.replace(/[^\w ]+/g, '')}.md`, 'text/markdown', readingMarkdown(stored))}>
          Obsidian note
        </button>
      </div>
      {note && <p class="note small">{note}</p>}
    </section>
  );
}
