import { useState } from 'preact/hooks';
import { entries, newEntryId, parseTags, saveEntry, type JournalEntry } from '../../core/journal';
import { FIT_LABEL, outcomes, saveOutcome, tagPatterns, type Fit } from '../../core/outcomes';
import { useStore } from '../store';

export function Journal() {
  const { db, bump, version } = useStore();
  void version;
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const all = entries(db);
  const shown = filter ? all.filter((e) => e.tags.includes(filter)) : all;
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const patterns = tagPatterns(db, since);
  const done = new Map(outcomes(db).map((o) => [o.target_id, o]));

  function save() {
    if (!text.trim()) return;
    saveEntry(db, { id: newEntryId(), created_at: new Date().toISOString(), text: text.trim(), mood, energy, tags: parseTags(tags), links: [] });
    setText('');
    setTags('');
    setMood(null);
    setEnergy(null);
    bump();
  }

  return (
    <main>
      <header>
        <h1>Journal</h1>
        <div class="sub">Entries, check-ins and outcomes. Tags are yours; the app never adds one.</div>
      </header>

      <section>
        <label class="field">
          Entry
          <textarea rows={4} value={text} onInput={(e) => setText(e.currentTarget.value)} />
        </label>
        <Scale label="Mood" value={mood} set={setMood} />
        <Scale label="Energy" value={energy} set={setEnergy} />
        <label class="field">
          Tags (space or comma separated)
          <input value={tags} onInput={(e) => setTags(e.currentTarget.value)} autocomplete="off" autocapitalize="none" />
        </label>
        <button class="btn primary" onClick={save} disabled={!text.trim()}>
          Save entry
        </button>
      </section>

      {patterns.length > 0 && (
        <section>
          <h2>Your tags, last 90 days</h2>
          <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,0.6fr) minmax(0,0.8fr) minmax(0,0.8fr)' }}>
            <div class="h">Tag</div>
            <div class="h">Entries</div>
            <div class="h">Mood</div>
            <div class="h">Energy</div>
            {patterns.map((p) => (
              <>
                <div>
                  <button class="chip" style={{ minHeight: '36px' }} aria-pressed={filter === p.tag} onClick={() => setFilter(filter === p.tag ? null : p.tag)}>
                    #{p.tag}
                  </button>
                </div>
                <div>{p.n}</div>
                <div>{p.mood ?? '–'}</div>
                <div>{p.energy ?? '–'}</div>
              </>
            ))}
          </div>
          <p class="note">Counts and averages of what you wrote. Small numbers; no pattern is claimed.</p>
        </section>
      )}

      <section>
        <h2>{filter ? `Entries tagged #${filter}` : 'Entries'}</h2>
        {shown.length === 0 && <p class="note">Nothing yet. Draws and casts can be saved here from Draw.</p>}
        {shown.map((e) => (
          <EntryCard e={e} outcome={e.links.map((l) => done.get(l.id)).find(Boolean) ?? null} onOutcome={(fit, note) => {
            const link = e.links[0]!;
            saveOutcome(db, { id: `o-${Date.now().toString(36)}`, entry_id: e.id, target_kind: link.kind === 'compass' ? 'compass' : 'record', target_id: link.id, created_at: new Date().toISOString(), text: note, fit });
            bump();
          }} />
        ))}
      </section>
    </main>
  );
}

function Scale({ label, value, set }: { label: string; value: number | null; set: (v: number | null) => void }) {
  return (
    <div role="group" aria-label={label} class="row" style={{ flexWrap: 'wrap' }}>
      <span class="muted" style={{ width: '60px', fontSize: '14px' }}>
        {label}
      </span>
      {[1, 2, 3, 4, 5].map((n) => (
        <button class="chip" style={{ minWidth: '44px', padding: 0 }} aria-pressed={value === n} onClick={() => set(value === n ? null : n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

function EntryCard({ e, outcome, onOutcome }: { e: JournalEntry; outcome: { fit: Fit; text: string } | null; onOutcome: (fit: Fit, note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  return (
    <div class="card">
      <div class="small muted">
        {new Date(e.created_at).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
        {e.mood !== null ? ` · mood ${e.mood}` : ''}
        {e.energy !== null ? ` · energy ${e.energy}` : ''}
        {e.tags.length ? ` · ${e.tags.map((t) => '#' + t).join(' ')}` : ''}
      </div>
      <p style={{ margin: 0, lineHeight: 1.45 }}>{e.text}</p>
      {e.links.length > 0 && !outcome && !open && (
        <button class="btn" onClick={() => setOpen(true)}>
          Record what happened
        </button>
      )}
      {open && !outcome && (
        <>
          <label class="field">
            What happened
            <textarea rows={2} value={note} onInput={(ev) => setNote(ev.currentTarget.value)} />
          </label>
          <div class="chips">
            {(Object.keys(FIT_LABEL) as Fit[]).map((f) => (
              <button class="chip" onClick={() => onOutcome(f, note.trim())}>
                {FIT_LABEL[f]}
              </button>
            ))}
          </div>
          <p class="note small">Self-rated. Without a blind comparison this records your judgement, not the reading's accuracy.</p>
        </>
      )}
      {outcome && (
        <p class="note small">
          Outcome: {FIT_LABEL[outcome.fit]}
          {outcome.text ? `. ${outcome.text}` : ''}
        </p>
      )}
    </div>
  );
}
