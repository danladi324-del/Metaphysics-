import { useMemo } from 'preact/hooks';
import { compose, type EngineView, type Reading } from '../../composer/compose';
import { chanceWords, convergence, themeVocabulary, type Convergence, type EngineThemes } from '../../composer/convergence';
import { biorhythmView, hoursView, ichingView, moonView, numerologyDailyView, tarotView } from '../../composer/views';
import { backupStatus } from '../../core/backup';
import { entries } from '../../core/journal';
import { outcomes } from '../../core/outcomes';
import type { Profile } from '../../core/profile';
import type { CalcRecord } from '../../core/record';
import { localDateIn, resolveLocal } from '../../core/time';
import { LENSES } from '../../content/model';
import { BIORHYTHM, computeBiorhythm } from '../../engines/biorhythm/compute';
import { BRANCHES_ZH, dayIndex, STEMS, BRANCHES, STEMS_ZH } from '../../engines/bazi/compute';
import { computeHours, HOURS } from '../../engines/hours/compute';
import { ICHING, type CastResult } from '../../engines/iching/compute';
import { computeMoon, MOON } from '../../engines/moon/compute';
import { computeTransits } from '../../engines/natal/transits';
import { BODY_LABEL, NATAL } from '../../engines/natal/compute';
import type { Ephemeris } from '../../engines/natal/ephemeris';
import { computeNumerology, DEFAULT_NUMEROLOGY, NUMEROLOGY, personalCycles } from '../../engines/numerology/compute';
import { TAROT, type TarotResult } from '../../engines/tarot/compute';
import { Dot, Label } from '../components/Label';
import { Warnings } from '../components/Warnings';
import { snippetMode, useStore } from '../store';
import { useEphemeris, useNatal } from '../useNatal';
import { useStoredRecord } from '../useRecord';
import { NoProfile } from './Charts';

export function Today() {
  const { profile } = useStore();
  const { eph, error } = useEphemeris();
  if (!profile) return <NoProfile />;
  if (error) return <main><p class="note">Ephemeris failed: {error}</p></main>;
  if (!eph) return <main><p class="note">Loading…</p></main>;
  return <TodayInner profile={profile} eph={eph} />;
}

const pad = (n: number) => String(n).padStart(2, '0');

function TodayInner({ profile, eph }: { profile: Profile; eph: Ephemeris }) {
  const { db, here: hereMaybe, settings, persisted, version } = useStore();
  void version;
  const here = hereMaybe!;
  const nowMs = Date.now();
  const t = localDateIn(here.zone, nowMs);
  const dayKey = `${t.year}-${pad(t.month)}-${pad(t.day)}`;
  const noon = resolveLocal({ ...t, hour: 12, minute: 0 }, here.zone);
  const noonMs = noon.kind === 'exact' ? noon.result.utcMs : noon.kind === 'ambiguous' ? noon.earlier.utcMs : noon.after.utcMs;
  const weekday = (ms: number) => {
    const l = localDateIn(here.zone, ms);
    return new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
  };
  const b = profile.birth.local;
  const name = profile.numerologyNames[0]?.name ?? profile.displayName;

  const num = useStoredRecord([name, b.year, b.month, b.day], () => computeNumerology({ name, year: b.year, month: b.month, day: b.day }, DEFAULT_NUMEROLOGY)).rec;
  const bio = useStoredRecord([dayKey, profile.id], () => computeBiorhythm({ year: b.year, month: b.month, day: b.day }, t)).rec;
  const moon = useStoredRecord([noonMs], () => computeMoon(eph, noonMs)).rec;
  const todays = useStoredRecord([noonMs, here.lat, here.lon], () => computeHours(noonMs, here.lat, here.lon, weekday));
  const beforeSunrise = todays.rec ? nowMs < todays.rec.raw_result.sunrise : false;
  const yest = useStoredRecord([noonMs, beforeSunrise], () => (beforeSunrise ? computeHours(noonMs - 86_400_000, here.lat, here.lon, weekday) : null));
  const hours = beforeSunrise ? yest.rec : todays.rec;
  const { rec: natal } = useNatal(profile, settings.astro);
  const transits = useMemo(() => (natal ? computeTransits(eph, natal, nowMs, settings.astro) : null), [natal?.fingerprint, Math.floor(nowMs / 3_600_000)]);
  const cyc = personalCycles(b.month, b.day, t.year, t.month, t.day);
  const di = dayIndex(t.year, t.month, t.day);

  // Today's draws, if any.
  // Start of the local day as a UTC instant (records store UTC timestamps).
  const sod = resolveLocal({ ...t, hour: 0, minute: 0 }, here.zone);
  const startOfDay = new Date(sod.kind === 'exact' ? sod.result.utcMs : sod.kind === 'ambiguous' ? sod.earlier.utcMs : sod.after.utcMs).toISOString();
  const draws = db.records("computed_at >= ? AND engine IN ('tarot', 'iching')", [startOfDay]);
  const tarot = draws.find((d) => d.engine === 'tarot') as CalcRecord<TarotResult> | undefined;
  const cast = draws.find((d) => d.engine === 'iching') as CalcRecord<CastResult> | undefined;

  // Daily readings: layers 1, 3 and 5 feed the daily synthesis; approved themes feed the convergence strip.
  const daily: { engine: string; deps: string[]; view: EngineView; reading: Reading }[] = [];
  const add = (deps: string[], view: EngineView | null) => {
    if (view) daily.push({ engine: view.engine, deps, view, reading: compose(db, view, 'general') });
  };
  if (num) add(NUMEROLOGY.input_dependencies, numerologyDailyView(num.id, cyc.personalDay, cyc.personalYear));
  if (bio) add(BIORHYTHM.input_dependencies, biorhythmView(bio));
  if (moon) add(MOON.input_dependencies, moonView(moon));
  if (hours) add(HOURS.input_dependencies, hoursView(hours, nowMs));
  if (tarot) add(TAROT.input_dependencies, tarotView(tarot, snippetMode(settings.tarot.mode)));
  if (cast) add(ICHING.input_dependencies, ichingView(cast));
  const conv = convergence(
    daily.map((d): EngineThemes => ({ engine: d.engine, deps: d.deps, themes: d.reading.approvedThemes })),
    themeVocabulary(db),
    Number(dayKey.replace(/-/g, ''))
  );
  const compass = daily.flatMap((d) => d.reading.layers.find((l) => l.kind === 'move')!.items.filter((i) => !i.placeholder).map((i) => ({ ...i, engine: d.view.title }))).slice(0, 3);

  const pending = entries(db, 50).find((e) => e.links.length > 0 && !outcomes(db).some((o) => e.links.some((l) => l.id === o.target_id)));
  const backup = backupStatus(db, persisted);
  const disagreementsToday = db.disagreements('created_at >= ?', [startOfDay]).length;
  const tightTransit = transits?.raw_result.aspects.find((a) => a.applying);

  return (
    <main>
      <header class="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h1>Today</h1>
          <div class="sub">{new Date(nowMs).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', timeZone: here.zone })} · {here.name}</div>
        </div>
        <a href="#/lab" aria-label={`Backup ${backup.daysSinceExport !== null && backup.daysSinceExport <= 7 ? 'is current' : 'is overdue'}. Open the Lab.`} class="row" style={{ minHeight: '44px', gap: '10px' }}>
          <span class={`dot ${backup.daysSinceExport !== null && backup.daysSinceExport <= 7 ? 'calc' : 'clash'}`} style={{ width: '10px', height: '10px', borderRadius: '5px' }} />
          <span class="chip" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', padding: 0 }}>{profile.displayName[0]}</span>
        </a>
      </header>

      <Warnings />

      <section>
        <h2>Sky now</h2>
        {moon && (
          <div style={{ fontSize: '20px', fontWeight: 500, lineHeight: 1.25 }}>
            {moon.raw_result.phase} in {moon.raw_result.moonSign}
          </div>
        )}
        <p class="note">
          {hours ? `Day of ${hours.raw_result.planetaryDay.sunrise}${(() => { const c = hours.raw_result.hours.find((h) => nowMs >= h.startMs && nowMs < h.endMs); return c ? `, hour of ${c.ruler}` : ''; })()}. ` : ''}
          {tightTransit ? `Closest applying transit: ${BODY_LABEL[tightTransit.transiting]} ${tightTransit.type} natal ${(BODY_LABEL as Record<string, string>)[tightTransit.natal] ?? tightTransit.natal}, ${tightTransit.orb.toFixed(2)}°.` : 'No applying transit within orb.'}
        </p>
        <Label label="calculated">Calculated for {here.name}.</Label>
      </section>

      <section>
        <h2>Daily Compass</h2>
        {compass.length === 0 ? (
          <p class="note">No actions today: none of today's readings has "Your move" text loaded. The compass stays empty rather than inventing one.</p>
        ) : (
          compass.map((c) => (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
              <div style={{ fontSize: '17px', lineHeight: 1.3 }}>{c.text}</div>
              <Label label={c.label}>Why: {c.engine} · {c.traceId}</Label>
            </div>
          ))
        )}
      </section>

      <section>
        <h2>Engines today</h2>
        <div class="scroll-x">
          <EngineCard title="Numerology" value={`Day ${cyc.personalDay}`} label="calculated" note="Calculated" inputs={['birth date']} />
          {bio && <EngineCard title="Biorhythm" value={`Physical ${Math.round(bio.raw_result.values.physical * 100)}%`} label="calculated" note="Calculated, not validated" inputs={['birth date']} />}
          <EngineCard title="BaZi" value={`${STEMS_ZH[di % 10]}${BRANCHES_ZH[di % 12]} ${STEMS[di % 10]}-${BRANCHES[di % 12]} day`} label="calculated" note="Calculated" inputs={['date', 'calendar']} />
          {moon && <EngineCard title="Moon" value={`${Math.round(moon.raw_result.illumination * 100)}% lit`} label="calculated" note="Calculated" inputs={['ephemeris']} />}
          {cast && <EngineCard title="I Ching" value={`Hexagram ${cast.raw_result.primary.number}`} label="calculated" note="Today's cast" inputs={['random cast']} />}
          {tarot && <EngineCard title="Tarot" value={`${tarot.raw_result.cards.length} card${tarot.raw_result.cards.length > 1 ? 's' : ''}`} label="calculated" note="Today's draw" inputs={['random draw']} />}
        </div>
      </section>

      <ConvergenceStrip c={conv} />

      <section>
        <h2>Daily synthesis</h2>
        {daily.map((d) => {
          const syn = d.reading.layers.find((l) => l.kind === 'synthesis')!.items[0]!;
          const facts = d.reading.layers.find((l) => l.kind === 'facts')!.items;
          return (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
              <h3>{d.view.title}</h3>
              {facts.map((f) => (
                <p class="note" style={{ margin: '2px 0' }}>
                  {f.text}
                </p>
              ))}
              <Label label="synthesis">{syn.placeholder ? 'No synthesis text yet' : 'Original synthesis (hypothesis)'}</Label>
              {!syn.placeholder && <p class="serif synth">{syn.text}</p>}
            </div>
          );
        })}
        <p class="note small">Layers 1, 3 and 5 of each daily reading. Full five-layer readings are under Readings.</p>
      </section>

      <section>
        <h2>Quick draw</h2>
        <div class="chips">
          {LENSES.slice(0, 5).map((l) => (
            <a class="chip" href="#/draw" style={{ display: 'inline-flex', alignItems: 'center' }}>
              {l[0]!.toUpperCase() + l.slice(1)}
            </a>
          ))}
        </div>
        <a href="#/draw" class="btn primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Draw a card
        </a>
      </section>

      <section>
        <h2>Outcome check</h2>
        {pending ? (
          <>
            <p class="serif">{pending.text}</p>
            <a class="btn" href="#/journal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Record what happened
            </a>
          </>
        ) : (
          <p class="note">Nothing waiting. Saved draws show up here until you record what happened.</p>
        )}
      </section>

      <section style={{ borderTop: '1px solid var(--line)', paddingTop: '10px', gap: '4px' }}>
        <Label label="disagreement">0 external reference charts loaded (Astrodienst screenshots owed)</Label>
        <Label label={backup.daysSinceExport !== null && backup.daysSinceExport <= 7 ? 'calculated' : 'disagreement'}>
          {backup.lastExport ? `Last export: ${backup.daysSinceExport === 0 ? 'today' : `${backup.daysSinceExport} days ago`}` : 'Never exported'}
        </Label>
        <Label label={disagreementsToday ? 'disagreement' : 'calculated'}>{disagreementsToday} new ledger rows today</Label>
        <a href="#/lab" class="note" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          Open the Lab
        </a>
      </section>
      <p class="note small">{NATAL.engine} and the other engines run on this device. Nothing leaves it unless you export.</p>
    </main>
  );
}

function EngineCard({ title, value, label, note, inputs }: { title: string; value: string; label: 'calculated'; note: string; inputs: string[] }) {
  return (
    <div class="card" style={{ minWidth: '158px', flex: 'none', padding: '14px', gap: '6px' }}>
      <div class="small muted">{title}</div>
      <div style={{ fontSize: '20px', fontWeight: 500 }}>{value}</div>
      <Label label={label}>{note}</Label>
      <div class="small muted" style={{ borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
        Input: {inputs.join(', ')}
      </div>
    </div>
  );
}

/** Renders a convergence. The computed and none variants cannot render without their chance rate (it is required by the type). */
export function ConvergenceStrip({ c }: { c: Convergence }) {
  return (
    <section>
      <h2>Where engines agree</h2>
      <div class="card">
        {c.kind === 'blocked' && (
          <>
            <Label label="synthesis">Cannot be assessed</Label>
            <p class="note">{c.reason}</p>
          </>
        )}
        {c.kind === 'none' && (
          <>
            <Label label="calculated">No theme shared by two independent sources</Label>
            <p class="note">
              {c.independentSources} independent sources carry themes. Chance that at least two would share one with no real signal: {chanceWords(c.chanceRate)}.
            </p>
          </>
        )}
        {c.kind === 'computed' && (
          <>
            <div class="serif" style={{ fontSize: '21px' }}>{c.theme}</div>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.4 }}>
              {c.enginesPointing} engine{c.enginesPointing > 1 ? 's' : ''} point here; they come from {c.observed} independent source{c.observed > 1 ? 's' : ''}.
            </p>
            <p class="note">
              Chance of this much overlap with no real signal: {chanceWords(c.chanceRate)} (p = {c.chanceRate.toFixed(3)}, {c.trials.toLocaleString()} simulated days, {c.vocabulary} themes). {c.verdict === 'unlikely by chance' ? 'Unlikely by chance.' : 'Consistent with chance.'}
            </p>
          </>
        )}
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,0.4fr) minmax(0,1.5fr) minmax(0,1.3fr)' }}>
          <div class="h">#</div>
          <div class="h">Engines (shared input)</div>
          <div class="h">Declared themes</div>
          {c.table.map((r) => (
            <>
              <div>{r.source}</div>
              <div class="small">
                {r.engines.join(', ')}
                {r.sharedInputs.length ? <span class="muted"> ({r.sharedInputs.join(', ')})</span> : null}
              </div>
              <div class="small">{r.themes.length ? r.themes.join(', ') : <span class="muted">none</span>}</div>
            </>
          ))}
        </div>
        <p class="note small">
          <Dot label="calculated" /> Engines that share an input count as one source. Only themes declared on approved traditional text count; synthesis never does.
        </p>
      </div>
    </section>
  );
}
