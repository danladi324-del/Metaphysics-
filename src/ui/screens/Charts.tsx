import { useMemo, useState } from 'preact/hooks';
import type { Profile } from '../../core/profile';
import type { CalcRecord } from '../../core/record';
import type { NatalResult } from '../../engines/natal/compute';
import type { Ephemeris } from '../../engines/natal/ephemeris';
import { HOUSE_SYSTEM_LABEL, PROVISIONAL, type AstroConventions, type HouseSystem } from '../../core/conventions';
import { formatOffset } from '../../core/time';
import { BODY_LABEL, isVariantPoint, lilithBody, natalDisagreements, nodeBody, type BodyId } from '../../engines/natal/compute';
import { natalMarkdown } from '../../engines/natal/markdown';
import { computeReturn, computeTransits } from '../../engines/natal/transits';
import { formatLongitude } from '../../engines/natal/zodiac';
import { Label } from '../components/Label';
import { ReadingLayers } from '../components/ReadingLayers';
import { ComposedReading } from '../components/ComposedReading';
import { natalView } from '../../composer/views';
import { Wheel } from '../components/Wheel';
import { shareFile } from '../share';
import { useStore } from '../store';
import { useNatal } from '../useNatal';

type Tab = 'natal' | 'transits' | 'returns';

export function Charts() {
  const { profile, settings, updateSettings } = useStore();
  const [tab, setTab] = useState<Tab>('natal');
  const conv = settings.astro;
  const { rec, eph, error } = useNatal(profile, conv);

  if (!profile) return <NoProfile />;
  const b = profile.birth;
  const l = b.local;
  const when = `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')} ${b.timeKnown ? `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}` : '(time unknown)'}`;
  const setConv = (patch: Partial<AstroConventions>) => updateSettings({ astro: { ...conv, ...patch } });

  return (
    <main>
      <header>
        <h1>Natal chart</h1>
        <div class="sub">
          {profile.displayName}: {when}, {formatOffset(b.offsetSeconds)}, {profile.place.name}
        </div>
      </header>

      <div class="seg" role="tablist" aria-label="Chart type">
        {(['natal', 'transits', 'returns'] as Tab[]).map((t) => (
          <button role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t[0]!.toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <section aria-label="Conventions">
        <div class="grid2">
          <label class="field">
            Houses{PROVISIONAL.has('houseSystem') ? ' (provisional)' : ''}
            <select value={conv.houseSystem} onChange={(e) => setConv({ houseSystem: e.currentTarget.value as HouseSystem })}>
              {Object.entries(HOUSE_SYSTEM_LABEL).map(([k, v]) => (
                <option value={k}>{v}</option>
              ))}
            </select>
          </label>
          <label class="field">
            Zodiac{PROVISIONAL.has('zodiac') ? ' (provisional)' : ''}
            <select value={conv.zodiac} onChange={(e) => setConv({ zodiac: e.currentTarget.value as AstroConventions['zodiac'] })}>
              <option value="tropical">Tropical</option>
              <option value="sidereal">Sidereal</option>
            </select>
          </label>
          {conv.zodiac === 'sidereal' && (
            <label class="field">
              Ayanamsa
              <select value={conv.ayanamsa} onChange={(e) => setConv({ ayanamsa: e.currentTarget.value as AstroConventions['ayanamsa'] })}>
                <option value="lahiri">Lahiri</option>
                <option value="raman">Raman</option>
                <option value="krishnamurti">Krishnamurti</option>
                <option value="faganBradley">Fagan-Bradley</option>
              </select>
            </label>
          )}
          <label class="field">
            Node
            <select value={conv.nodeType} onChange={(e) => setConv({ nodeType: e.currentTarget.value as AstroConventions['nodeType'] })}>
              <option value="mean">Mean</option>
              <option value="true">True</option>
            </select>
          </label>
          <label class="field">
            Lilith
            <select value={conv.lilithType} onChange={(e) => setConv({ lilithType: e.currentTarget.value as AstroConventions['lilithType'] })}>
              <option value="mean">Mean</option>
              <option value="osculating">Osculating</option>
              <option value="interpolated">Interpolated</option>
            </select>
          </label>
        </div>
        <p class="note">Your defaults: whole sign houses, tropical zodiac. Placidus is always computed alongside so the ledger can show where the two differ. True node and interpolated Lilith match your Astrodienst settings; the other variants are stored and logged where they differ.</p>
      </section>

      {error && <p class="note">Ephemeris failed to load: {error}</p>}
      {!rec && !error && <p class="note">Computing…</p>}
      {rec && tab === 'natal' && <NatalView rec={rec} profile={profile} conv={conv} />}
      {rec && eph && tab === 'transits' && <TransitsView rec={rec} eph={eph} conv={conv} />}
      {rec && eph && tab === 'returns' && <ReturnsView rec={rec} eph={eph} />}
    </main>
  );
}

interface ViewProps {
  rec: CalcRecord<NatalResult>;
  conv: AstroConventions;
}

function NatalView({ rec, profile, conv }: ViewProps & { profile: Profile }) {
    const b = profile.birth;
    const r = rec.raw_result;
    const node = nodeBody(conv);
    const lilith = lilithBody(conv);
    const shown = r.bodies.map((x) => x.id).filter((id) => !isVariantPoint(id) || id === node || id === lilith);
    const cusps = r.houses[conv.houseSystem]?.cusps ?? null;
    const splits = natalDisagreements(rec, profile.id);
    const [showAll, setShowAll] = useState(false);
    const [focus, setFocus] = useState<string>('sun');
    const focused = r.bodies.find((x) => x.id === focus);
    const aspects = showAll ? r.aspects : r.aspects.slice(0, 12);
    return (
      <>
        <section>
          <Wheel result={r} cusps={cusps} shown={shown} timeKnown={b.timeKnown} />
          <p class="note">{b.timeKnown ? 'Ascendant is the heavy line on the left.' : 'Birth time unknown: 0° Aries on the left, no houses or angles.'} Dashed blue: soft aspects. Red: hard aspects.</p>
        </section>

        <section>
          <h2>Placements</h2>
          <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1.4fr) minmax(0,0.8fr)' }}>
            <div class="h">Body</div>
            <div class="h">Position</div>
            <div class="h">House</div>
            {r.bodies
              .filter((x) => shown.includes(x.id))
              .map((x) => (
                <>
                  <div class="muted">{BODY_LABEL[x.id as BodyId].replace(/ \((mean|true|osculating|interpolated)\)/, '')}</div>
                  <div>
                    {formatLongitude(x.longitude)}
                    {x.retrograde ? ' ℞' : ''}
                  </div>
                  <div>{b.timeKnown ? (x.houses[conv.houseSystem] ?? '–') : '–'}</div>
                </>
              ))}
            {b.timeKnown && (
              <>
                <div class="muted">Ascendant</div>
                <div>{formatLongitude(r.angles.asc)}</div>
                <div>1</div>
                <div class="muted">Midheaven</div>
                <div>{formatLongitude(r.angles.mc)}</div>
                <div>{conv.houseSystem === 'wholeSign' || conv.houseSystem === 'equal' ? '–' : '10'}</div>
              </>
            )}
          </div>
          <Label label="calculated">Calculated. {r.zodiac === 'sidereal' ? `Sidereal, ayanamsa ${r.ayanamsaDegrees?.toFixed(4)}°.` : 'Tropical.'}</Label>
        </section>

        <section>
          <h2>Aspects</h2>
          <div class="table" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.2fr) minmax(0,0.8fr)' }}>
            <div class="h">Pair</div>
            <div class="h">Aspect</div>
            <div class="h">Orb</div>
            {aspects.map((a) => (
              <>
                <div>
                  {label(a.a)} – {label(a.b)}
                </div>
                <div>{a.type}</div>
                <div>
                  {a.orb.toFixed(2)}° {a.applying === null ? '' : a.applying ? 'a' : 's'}
                </div>
              </>
            ))}
          </div>
          {r.aspects.length > 12 && (
            <button class="btn" onClick={() => setShowAll(!showAll)}>
              {showAll ? 'Show fewer' : `Show all ${r.aspects.length}`}
            </button>
          )}
          <p class="note">Orbs are a convention (stored with the record). a = applying, s = separating.</p>
        </section>

        <section>
          <h2>Reading</h2>
          <div class="scroll-x" role="group" aria-label="Body to read">
            {r.bodies
              .filter((x) => shown.includes(x.id))
              .map((x) => (
                <button class="chip" style={{ flex: 'none' }} aria-pressed={focus === x.id} onClick={() => setFocus(x.id)}>
                  {label(x.id)}
                </button>
              ))}
          </div>
          {focused && (
            <>
              <h3>
                {label(focused.id)} in {focused.sign}
              </h3>
              <ReadingLayers snippetKey={`natal.${focused.id}.sign.${focused.sign.toLowerCase()}`} lens="general" />
              {b.timeKnown && focused.houses[conv.houseSystem] !== undefined && (
                <>
                  <h3>
                    {label(focused.id)} in house {focused.houses[conv.houseSystem]} ({HOUSE_SYSTEM_LABEL[conv.houseSystem]})
                  </h3>
                  <ReadingLayers snippetKey={`natal.${focused.id}.house.${focused.houses[conv.houseSystem]}`} lens="general" />
                </>
              )}
            </>
          )}
        </section>

        <ComposedReading view={natalView(rec, b.timeKnown)} kind="master" rec={rec} />

        <section style={{ borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
          <h2>What changes under another convention</h2>
          {splits.length === 0 && <p class="note">Nothing in this chart changes between Placidus and whole sign, or between node and Lilith variants.</p>}
          {splits.map((d) => (
            <div>
              <Label label="disagreement">{d.subject}</Label>
              <p class="note">
                {d.result_a} · {d.result_b}. Cause: {d.cause}.
              </p>
            </div>
          ))}
          <a href="#/lab" class="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Open the ledger
          </a>
        </section>

        <section>
          <p class="note small">
            {rec.engine} {rec.engine_version} · {r.ephemeris} · computed {rec.computed_at.slice(0, 16).replace('T', ' ')} UTC · fingerprint {rec.fingerprint}
          </p>
          {rec.limitations.map((x) => (
            <p class="note small">Limitation: {x}</p>
          ))}
          <button class="btn" onClick={() => shareFile(`Natal chart ${profile.displayName}.md`, 'text/markdown', natalMarkdown(rec, profile))}>
            Save as Obsidian note
          </button>
        </section>
      </>
    );
  }

function TransitsView({ rec, eph, conv }: ViewProps & { eph: Ephemeris }) {
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
    const utcMs = Date.parse(date + 'Z');
    const tr = useMemo(() => (Number.isFinite(utcMs) ? computeTransits(eph, rec, utcMs, conv) : null), [utcMs]);
    return (
      <section>
        <label class="field">
          Moment (UTC)
          <input type="datetime-local" value={date} onInput={(e) => setDate(e.currentTarget.value)} />
        </label>
        {tr && (
          <>
            <h2>Transits to the natal chart</h2>
            {tr.raw_result.aspects.length === 0 && <p class="note">No transits within the transit orbs.</p>}
            <div class="table" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1.2fr) minmax(0,0.8fr)' }}>
              {tr.raw_result.aspects.map((a) => (
                <>
                  <div>
                    {label(a.transiting)} → natal {label(a.natal)}
                  </div>
                  <div>{a.type}</div>
                  <div>
                    {a.orb.toFixed(2)}° {a.applying ? 'a' : 's'}
                  </div>
                </>
              ))}
            </div>
            <Label label="calculated">Calculated. Transit orbs: 1.5° major, 1° sextile, 0.5° minor.</Label>
          </>
        )}
      </section>
    );
  }

function ReturnsView({ rec, eph }: { rec: CalcRecord<NatalResult>; eph: Ephemeris }) {
    const now = Date.now();
    const solar = useMemo(() => computeReturn(eph, rec, 'sun', now), []);
    const lunar = useMemo(() => computeReturn(eph, rec, 'moon', now), []);
    const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
    return (
      <section>
        <h2>Next returns</h2>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)' }}>
          <div class="muted">Solar return</div>
          <div>{fmt(solar.raw_result.utcMs)}</div>
          <div class="muted">Lunar return</div>
          <div>{fmt(lunar.raw_result.utcMs)}</div>
        </div>
        <Label label="calculated">Calculated. Moment the Sun or Moon returns to its natal tropical longitude.</Label>
        <p class="note">Return charts (houses for the return moment and place) are not built yet.</p>
      </section>
    );
}

function label(id: string): string {
  return (BODY_LABEL as Record<string, string>)[id]?.replace(/ \((mean|true|osculating|interpolated)\)/, '') ?? id;
}

export function NoProfile() {
  return (
    <main>
      <header>
        <h1>No profile yet</h1>
        <div class="sub">Add birth data to compute anything.</div>
      </header>
      <a class="btn primary" href="#/lab/profile/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Create a profile
      </a>
    </main>
  );
}
