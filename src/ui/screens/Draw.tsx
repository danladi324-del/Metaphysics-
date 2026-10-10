import { useState } from 'preact/hooks';
import type { CalcRecord } from '../../core/record';
import { computeCast, type CastResult, type LineValue, type Method } from '../../engines/iching/compute';
import { Label } from '../components/Label';
import { useStore } from '../store';
import { Provenance } from './Readings';

type Tool = 'iching' | 'tarot';

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
      </div>

      {tool === 'tarot' && <p class="note">Tarot arrives in phase 3 with the content layer.</p>}

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
        <h2>Reading</h2>
        <Label label="traditional">Traditional. Source: Legge 1899 (public domain) — not loaded yet</Label>
        <p class="serif">[Paraphrase of Legge's text for hexagram {r.primary.number} goes here once the source is loaded and the paraphrase approved.]</p>
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}
