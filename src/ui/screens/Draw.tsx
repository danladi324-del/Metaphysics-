import { useState } from 'preact/hooks';
import { newEntryId, saveEntry } from '../../core/journal';
import type { CalcRecord } from '../../core/record';
import { LENSES, type Lens } from '../../content/model';
import { CARD_BY_ID, SPREADS, snippetKey } from '../../content/tarot';
import { computeDraw, tarotDisagreements, type TarotResult } from '../../engines/tarot/compute';
import { CardFace } from '../components/CardFace';
import { ReadingLayers } from '../components/ReadingLayers';
import { ComposedReading } from '../components/ComposedReading';
import { geomancyView, ichingView, tarotView } from '../../composer/views';
import { computeGeomancy, type Figure, type GeomancyResult } from '../../engines/geomancy/compute';
import { computeCast, type CastResult, type LineValue, type Method } from '../../engines/iching/compute';
import { Label } from '../components/Label';
import { useStore } from '../store';
import { Provenance } from './Readings';

type Tool = 'iching' | 'tarot' | 'geomancy';

export function Draw() {
  const { db, profile, bump } = useStore();
  const [tool, setTool] = useState<Tool>('iching');
  const [method, setMethod] = useState<Method>('yarrow');
  const [question, setQuestion] = useState('');
  const [cast, setCast] = useState<CalcRecord<CastResult> | null>(null);
  const history = db.records('engine = ?', ['iching']).slice(0, 5) as CalcRecord<CastResult>[];

  function doCast() {
    const rec = computeCast(method, undefined, question.trim());
    db.saveRecord(rec, profile?.id ?? null);
    setCast(rec);
    bump();
  }

  return (
    <main>
      <header>
        <h1>Draw</h1>
        <div class="sub">Pick a tool. Every draw is stored with its raw random values so it can be replayed.</div>
      </header>
      <div class="scroll-x">
        <button class="chip" style={{ flex: 'none' }} aria-pressed={tool === 'iching'} onClick={() => setTool('iching')}>
          I Ching
        </button>
        <button class="chip" style={{ flex: 'none' }} aria-pressed={tool === 'tarot'} onClick={() => setTool('tarot')}>
          Tarot
        </button>
        <button class="chip" style={{ flex: 'none' }} aria-pressed={tool === 'geomancy'} onClick={() => setTool('geomancy')}>
          Geomancy
        </button>
      </div>

      {tool === 'tarot' && <Tarot />}
      {tool === 'geomancy' && <Geomancy />}

      {tool === 'iching' && (
        <>
          <section>
            <label class="field">
              Question (optional, stored with the cast)
              <input value={question} onInput={(e) => setQuestion(e.currentTarget.value)} />
            </label>
            <div class="chips" role="radiogroup" aria-label="Casting method">
              <button class="chip" role="radio" aria-checked={method === 'yarrow'} aria-pressed={method === 'yarrow'} onClick={() => setMethod('yarrow')}>
                Yarrow odds
              </button>
              <button class="chip" role="radio" aria-checked={method === 'threeCoins'} aria-pressed={method === 'threeCoins'} onClick={() => setMethod('threeCoins')}>
                Three coins
              </button>
            </div>
            <p class="note">
              The methods differ in how often lines change. Yarrow: old yin 1/16, old yang 3/16. Coins: 1/8 each. Randomness from the device's secure generator.
            </p>
            <button class="btn primary" onClick={doCast}>
              Cast
            </button>
          </section>
          {cast && <CastView rec={cast} />}
          {history.length > 0 && (
            <section>
              <h2>Recent casts</h2>
              {history.map((h) => (
                <button class="btn" style={{ textAlign: 'left' }} onClick={() => setCast(h)}>
                  {h.raw_result.primary.number} {h.raw_result.primary.name}
                  {h.raw_result.relating ? ` → ${h.raw_result.relating.number} ${h.raw_result.relating.name}` : ''}
                  <span class="muted small"> · {h.computed_at.slice(0, 10)}</span>
                </button>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Hexagram({ lines, label }: { lines: LineValue[]; label: string }) {
  const w = 120;
  return (
    <svg width={w} height="126" viewBox={`0 0 ${w} 126`} role="img" aria-label={label}>
      {lines.map((v, i) => {
        const y = 110 - i * 20;
        const yang = v === 7 || v === 9;
        const changing = v === 6 || v === 9;
        const color = changing ? '#D6B066' : '#E9E5D9';
        return (
          <g>
            {yang ? <rect x="10" y={y} width="100" height="10" fill={color} /> : (
              <>
                <rect x="10" y={y} width="42" height="10" fill={color} />
                <rect x="68" y={y} width="42" height="10" fill={color} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CastView({ rec }: { rec: CalcRecord<CastResult> }) {
  const r = rec.raw_result;
  const relatingLines = r.lines.map((v) => (v === 9 ? 8 : v === 6 ? 7 : v)) as LineValue[];
  return (
    <>
      <section>
        <div class="row" style={{ justifyContent: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <Hexagram lines={r.lines} label={`Hexagram ${r.primary.number}, ${r.primary.name}${r.changing.length ? `, changing lines ${r.changing.join(', ')}` : ''}`} />
            <div style={{ fontSize: '17px', fontWeight: 500 }}>
              {r.primary.number} {r.primary.name}
            </div>
          </div>
          {r.relating && (
            <div style={{ textAlign: 'center' }}>
              <Hexagram lines={relatingLines} label={`Relating hexagram ${r.relating.number}, ${r.relating.name}`} />
              <div style={{ fontSize: '17px', fontWeight: 500 }}>
                {r.relating.number} {r.relating.name}
              </div>
            </div>
          )}
        </div>
        <p class="note">
          {r.changing.length ? `Changing lines (gold): ${r.changing.join(', ')}, counted from the bottom.` : 'No changing lines.'} Line values bottom to top: {r.lines.join(' ')}.
        </p>
        <Label label="calculated">Calculated from a random cast ({r.method === 'yarrow' ? 'yarrow odds' : 'three coins'}).</Label>
        {rec.inputs.question ? <p class="note">Question: {String(rec.inputs.question)}</p> : null}
      </section>
      <section>
        <h2>Reading: {r.primary.number} {r.primary.name}</h2>
        <ReadingLayers snippetKey={`iching.hexagram.${r.primary.number}`} lens="general" />
        {r.changing.map((n) => (
          <>
            <h3>Line {n}</h3>
            <ReadingLayers snippetKey={`iching.hexagram.${r.primary.number}.line.${n}`} lens="general" />
          </>
        ))}
        {r.relating && (
          <>
            <h3>Relating: {r.relating.number} {r.relating.name}</h3>
            <ReadingLayers snippetKey={`iching.hexagram.${r.relating.number}`} lens="general" />
          </>
        )}
        <p class="note">Planned source: Legge 1899 (public domain). Not loaded yet.</p>
      </section>
      <ComposedReading view={ichingView(rec)} kind="event" rec={rec} day={rec.id} />
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}

const MODES = ['blocked', 'opposite', 'internal', 'delayed'] as const;

function Tarot() {
  const { db, profile, bump, settings, updateSettings } = useStore();
  const tarot = settings.tarot;
  const [lens, setLens] = useState<Lens>('general');
  const [spread, setSpread] = useState('one');
  const [question, setQuestion] = useState('');
  const [rec, setRec] = useState<CalcRecord<TarotResult> | null>(null);
  const [saved, setSaved] = useState(false);
  const setTarot = (patch: Partial<typeof tarot>) => updateSettings({ tarot: { ...tarot, ...patch } });

  function draw() {
    const r = computeDraw(spread, question.trim(), { reversals: tarot.reversals, majorNumbering: tarot.numbering });
    db.saveRecord(r, profile?.id ?? null);
    for (const d of tarotDisagreements(r, profile?.id ?? null)) db.saveDisagreement(d);
    setRec(r);
    setSaved(false);
    bump();
  }

  function saveToJournal() {
    if (!rec) return;
    const names = rec.raw_result.cards.map((c) => `${c.position}: ${CARD_BY_ID.get(c.cardId)!.name}${c.reversed ? ' (reversed)' : ''}`);
    saveEntry(db, {
      id: newEntryId(),
      created_at: new Date().toISOString(),
      text: `Tarot draw, ${lens} lens. ${names.join('; ')}.${question.trim() ? ` Question: ${question.trim()}` : ''}`,
      mood: null,
      energy: null,
      tags: [],
      links: [{ kind: 'record', id: rec.id, label: 'Tarot draw' }]
    });
    setSaved(true);
    bump();
  }

  return (
    <>
      <section>
        <div class="scroll-x" role="group" aria-label="Lens">
          {LENSES.map((l) => (
            <button class="chip" style={{ flex: 'none' }} aria-pressed={lens === l} onClick={() => setLens(l)}>
              {l[0]!.toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <div class="grid2">
          <label class="field">
            Spread
            <select value={spread} onChange={(e) => setSpread(e.currentTarget.value)}>
              {SPREADS.map((s) => (
                <option value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label class="field">
            Reversals
            <select value={tarot.reversals ? tarot.mode ?? 'unset' : 'off'} onChange={(e) => {
              const v = e.currentTarget.value;
              setTarot(v === 'off' ? { reversals: false } : { reversals: true, mode: v === 'unset' ? null : (v as (typeof MODES)[number]) });
            }}>
              <option value="off">Off (all upright)</option>
              <option value="unset">On, no mode chosen</option>
              {MODES.map((m) => (
                <option value={m}>On, read as {m}</option>
              ))}
            </select>
          </label>
          <label class="field">
            Major numbering
            <select value={tarot.numbering} onChange={(e) => setTarot({ numbering: e.currentTarget.value as 'waite' | 'marseille' })}>
              <option value="waite">Waite (Strength VIII)</option>
              <option value="marseille">Marseille (Justice VIII)</option>
            </select>
          </label>
        </div>
        <label class="field">
          Question (optional)
          <input value={question} onInput={(e) => setQuestion(e.currentTarget.value)} />
        </label>
        <p class="note">Reversal mode is your call and is still unset. Traditions read reversals as blocked, opposite, internal or delayed; pick one to compare.</p>
        <button class="btn primary" onClick={draw}>
          {rec ? 'Draw again' : 'Draw'}
        </button>
      </section>

      {rec && (
        <>
          {rec.raw_result.cards.map((c) => {
            const card = CARD_BY_ID.get(c.cardId)!;
            return (
              <section>
                {rec.raw_result.cards.length > 1 && <h2>{c.position}</h2>}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <CardFace cardId={c.cardId} reversed={c.reversed} numbering={tarot.numbering} />
                </div>
                <p class="note small" style={{ textAlign: 'center' }}>Original generative line art.</p>
                <h3>
                  {card.name}
                  {c.reversed ? ', reversed' : ''} · {lens}
                </h3>
                <ReadingLayers snippetKey={snippetKey(card, c.reversed)} lens={lens} reversalMode={c.reversed ? tarot.mode : null} />
              </section>
            );
          })}
          <ComposedReading view={tarotView(rec, tarot.mode)} kind="event" rec={rec} lens={lens} day={rec.id} />
          <section>
            <h2>Same cards, other lenses</h2>
            <div class="chips">
              {LENSES.filter((l) => l !== lens).map((l) => (
                <button class="chip" onClick={() => setLens(l)}>
                  {l[0]!.toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </section>
          <section style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
            <button class="btn" onClick={saveToJournal} disabled={saved}>
              {saved ? 'Saved to journal' : 'Save to journal'}
            </button>
            <p class="note">Saved draws can be checked against what happened later.</p>
          </section>
          <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
        </>
      )}
    </>
  );
}

function FigureGlyph({ rows, label }: { rows: Figure; label: string }) {
  return (
    <svg width="44" height="64" viewBox="0 0 44 64" role="img" aria-label={label}>
      {rows.map((r, i) =>
        r === 1 ? <circle cx="22" cy={10 + i * 15} r="4" fill="#E9E5D9" /> : (
          <>
            <circle cx="13" cy={10 + i * 15} r="4" fill="#E9E5D9" />
            <circle cx="31" cy={10 + i * 15} r="4" fill="#E9E5D9" />
          </>
        )
      )}
    </svg>
  );
}

function Geomancy() {
  const { db, profile, bump } = useStore();
  const [question, setQuestion] = useState('');
  const [rec, setRec] = useState<CalcRecord<GeomancyResult> | null>(null);
  function cast() {
    const r = computeGeomancy(question.trim());
    db.saveRecord(r, profile?.id ?? null);
    setRec(r);
    bump();
  }
  const rows: string[][] = [
    ['Mother 4', 'Mother 3', 'Mother 2', 'Mother 1'],
    ['Daughter 4', 'Daughter 3', 'Daughter 2', 'Daughter 1'],
    ['Niece 4', 'Niece 3', 'Niece 2', 'Niece 1'],
    ['Left Witness', 'Right Witness'],
    ['Judge', 'Reconciler']
  ];
  return (
    <>
      <section>
        <label class="field">
          Question (optional)
          <input value={question} onInput={(e) => setQuestion(e.currentTarget.value)} />
        </label>
        <p class="note">Sixteen random points generate the four Mothers; every other figure follows by geomantic addition.</p>
        <button class="btn primary" onClick={cast}>
          {rec ? 'Cast again' : 'Cast'}
        </button>
      </section>
      {rec && (
        <>
          <section>
            <h2>Shield chart</h2>
            {rows.map((row) => (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${row.length}, 1fr)`, gap: '6px' }}>
                {row.map((p) => {
                  const f = rec.raw_result.figures.find((x) => x.position === p)!;
                  return (
                    <div class="card" style={{ padding: '6px', gap: '2px', alignItems: 'center', borderColor: p === 'Judge' ? 'var(--calc)' : undefined }}>
                      <FigureGlyph rows={f.rows} label={`${p}: ${f.name}`} />
                      <div class="small" style={{ textAlign: 'center' }}>{f.name}</div>
                      <div class="small muted" style={{ textAlign: 'center' }}>{p}</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <Label label="calculated">Calculated from a random cast. Mothers read right to left, as traditionally laid out.</Label>
          </section>
          <ComposedReading view={geomancyView(rec)} kind="event" rec={rec} day={rec.id} />
          <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
        </>
      )}
    </>
  );
}
