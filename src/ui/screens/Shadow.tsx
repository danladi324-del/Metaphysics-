import { useState } from 'preact/hooks';
import { entries, newEntryId, parseTags, saveEntry } from '../../core/journal';
import type { Profile } from '../../core/profile';
import { promptsFor, shadowPointers, type Pointer } from '../../engines/shadow/pointers';
import { Label } from '../components/Label';
import { ReadingLayers } from '../components/ReadingLayers';
import { useStore } from '../store';
import { useNatal } from '../useNatal';

export function Shadow({ profile }: { profile: Profile }) {
  const { db, settings, version } = useStore();
  void version;
  const { rec } = useNatal(profile, settings.astro);
  const [open, setOpen] = useState<string | null>(null);
  if (!rec) return <p class="note">Computing the chart…</p>;
  const pointers = shadowPointers(rec, settings.astro, profile.birth.timeKnown);
  const shadowEntries = entries(db, 500).filter((e) => e.links.some((l) => l.kind === 'snippet' && l.id.startsWith('prompt.')));
  const byTag = new Map<string, number>();
  for (const e of shadowEntries) for (const t of e.tags) byTag.set(t, (byTag.get(t) ?? 0) + 1);
  return (
    <>
      <section>
        <p class="note">
          Three parts only: placements traditions point to, questions to write from, and a log of your own tags. The app does not say what your shadow is.
        </p>
      </section>
      {pointers.map((p) => (
        <section class="card">
          <h3>{p.title}</h3>
          <Label label="calculated">{p.fact}</Label>
          {p.split && <Label label="disagreement">{p.split}</Label>}
          <details>
            <summary class="btn" style={{ display: 'flex', alignItems: 'center', listStyle: 'none' }}>
              Interpretive readings
            </summary>
            {p.keys.map((k) => (
              <ReadingLayers snippetKey={k} lens="general" />
            ))}
          </details>
          <button class="btn" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
            {open === p.id ? 'Hide questions' : 'Questions to write from'}
          </button>
          {open === p.id && <Prompts pointer={p} />}
        </section>
      ))}
      <section>
        <h2>Pattern log</h2>
        {shadowEntries.length === 0 ? (
          <p class="note">No entries written from a shadow question yet.</p>
        ) : (
          <>
            <p class="note">
              {shadowEntries.length} entr{shadowEntries.length === 1 ? 'y' : 'ies'} written from these questions. Your tags on them:
            </p>
            <div class="chips">
              {[...byTag.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                <span class="chip" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  #{t} · {n}
                </span>
              ))}
              {byTag.size === 0 && <span class="note">You have not tagged any of them.</span>}
            </div>
          </>
        )}
        <p class="note small">Counts of tags you chose. No pattern is inferred or named by the app.</p>
      </section>
    </>
  );
}

function Prompts({ pointer }: { pointer: Pointer }) {
  const { db, bump } = useStore();
  const [active, setActive] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Label label="synthesis">Questions written for this app (original synthesis)</Label>
      {promptsFor(pointer).map((q) => (
        <div>
          <p class="serif synth" style={{ fontSize: '17px' }}>{q.text}</p>
          {active === q.id ? (
            <>
              <textarea rows={4} aria-label="Your answer" value={text} onInput={(e) => setText(e.currentTarget.value)} />
              <input aria-label="Tags (optional, yours)" placeholder="tags (optional)" value={tags} onInput={(e) => setTags(e.currentTarget.value)} autocapitalize="none" />
              <button
                class="btn primary"
                disabled={!text.trim()}
                onClick={() => {
                  saveEntry(db, { id: newEntryId(), created_at: new Date().toISOString(), text: `${q.text}\n\n${text.trim()}`, mood: null, energy: null, tags: parseTags(tags), links: [{ kind: 'snippet', id: q.id, label: pointer.title }] });
                  setActive(null);
                  setText('');
                  setTags('');
                  bump();
                }}
              >
                Save to journal
              </button>
            </>
          ) : (
            <button class="btn" onClick={() => setActive(q.id)}>
              Write about this
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
