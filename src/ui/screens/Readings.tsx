import { useState } from 'preact/hooks';
import type { Profile } from '../../core/profile';
import { localDateIn, resolveLocal } from '../../core/time';
import { computeBiorhythm, CYCLES, type Cycle } from '../../engines/biorhythm/compute';
import { computeHours } from '../../engines/hours/compute';
import { computeMoon } from '../../engines/moon/compute';
import type { Ephemeris } from '../../engines/natal/ephemeris';
import { formatLongitude } from '../../engines/natal/zodiac';
import {
  computeNumerology,
  DEFAULT_NUMEROLOGY,
  numerologyDisagreements,
  personalCycles,
  type NameNumber,
  type Reduction
} from '../../engines/numerology/compute';
import { Label } from '../components/Label';
import { ReadingLayers } from '../components/ReadingLayers';
import { useStore } from '../store';
import { useEphemeris } from '../useNatal';
import { useStoredRecord } from '../useRecord';
import { NoProfile } from './Charts';

type Engine = 'numerology' | 'biorhythm' | 'sky';

export function Readings() {
  const { profile } = useStore();
  const [engine, setEngine] = useState<Engine>('numerology');
  if (!profile) return <NoProfile />;
  return (
    <main>
      <header>
        <h1>Readings</h1>
        <div class="sub">Calculated facts per engine. Interpretation layers arrive with the composer.</div>
      </header>
      <div class="scroll-x" role="tablist" aria-label="Engine">
        {(
          [
            ['numerology', 'Numerology'],
            ['biorhythm', 'Biorhythm'],
            ['sky', 'Moon and hours']
          ] as [Engine, string][]
        ).map(([k, v]) => (
          <button class="chip" role="tab" aria-selected={engine === k} aria-pressed={engine === k} style={{ flex: 'none' }} onClick={() => setEngine(k)}>
            {v}
          </button>
        ))}
      </div>
      {engine === 'numerology' && <Numerology profile={profile} />}
      {engine === 'biorhythm' && <Biorhythm profile={profile} />}
      {engine === 'sky' && <Sky profile={profile} />}
    </main>
  );
}

const show = (r: Reduction) => (r.compound === r.value || r.compound < 10 ? String(r.value) : `${r.compound}/${r.value}`);

function today(zone: string) {
  return localDateIn(zone, Date.now());
}

function useHere() {
  const { here } = useStore();
  return here!;
}

function Numerology({ profile }: { profile: Profile }) {
  const names = profile.numerologyNames.length ? profile.numerologyNames : [{ name: profile.displayName, kind: 'as given' as const }];
  const [idx, setIdx] = useState(0);
  const chosen = names[Math.min(idx, names.length - 1)]!;
  const b = profile.birth.local;
  const { rec, error } = useStoredRecord(
    [chosen.name, b.year, b.month, b.day],
    () => computeNumerology({ name: chosen.name, year: b.year, month: b.month, day: b.day }, DEFAULT_NUMEROLOGY),
    numerologyDisagreements
  );
  if (error) return <p class="note">{error}</p>;
  if (!rec) return null;
  const r = rec.raw_result;
  const splits = numerologyDisagreements(rec, null);
  const t = today(useHere().zone);
  const cyc = personalCycles(b.month, b.day, t.year, t.month, t.day);
  const row = (label: string, p: NameNumber, c: NameNumber, split: boolean) => (
    <>
      <div class="muted">{split ? <Label label="disagreement">{label}</Label> : label}</div>
      <div>
        {show(p.byNamePart)}
        {p.allLetters.value !== p.byNamePart.value && <span class="muted small"> (all letters {show(p.allLetters)})</span>}
      </div>
      <div>
        {show(c.byNamePart)}
        {c.allLetters.value !== c.byNamePart.value && <span class="muted small"> (all letters {show(c.allLetters)})</span>}
      </div>
    </>
  );
  const splitOn = (s: string) => splits.some((d) => d.subject.startsWith(s));
  return (
    <>
      <section>
        <h2>Inputs</h2>
        <div class="chips">
          {names.map((n, i) => (
            <button class="chip" aria-pressed={i === idx} onClick={() => setIdx(i)}>
              {n.name} <span class="small muted">({n.kind})</span>
            </button>
          ))}
        </div>
        <p class="note">
          Birth date {b.year}-{String(b.month).padStart(2, '0')}-{String(b.day).padStart(2, '0')}. Pythagorean and Chaldean both computed. Master numbers kept (provisional). Y counts as a vowel only with no vowel beside it.
        </p>
      </section>

      <section>
        <h2>Core numbers</h2>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr)' }}>
          <div class="h" />
          <div class="h">Pythagorean</div>
          <div class="h">Chaldean</div>
          <div class="muted">{r.date.lifePathByComponent.value !== r.date.lifePathAllDigits.value ? <Label label="disagreement">Life Path</Label> : 'Life Path'}</div>
          <div>{show(r.date.lifePathByComponent)}</div>
          <div>{show(r.date.lifePathByComponent)}</div>
          {row('Expression', r.pythagorean.expression, r.chaldean.expression, splitOn('Expression'))}
          {row('Soul Urge', r.pythagorean.soulUrge, r.chaldean.soulUrge, splitOn('Soul Urge'))}
          {row('Personality', r.pythagorean.personality, r.chaldean.personality, splitOn('Personality'))}
          <div class="muted">Birthday</div>
          <div>{show(r.date.birthday)}</div>
          <div>{show(r.date.birthday)}</div>
          <div class="muted">Maturity</div>
          <div>{show(r.maturity.pythagorean)}</div>
          <div>{show(r.maturity.chaldean)}</div>
        </div>
        <Label label="calculated">Calculated. Date numbers are the same in both systems; letter tables differ.</Label>
        {splits.length > 0 && (
          <p class="note">
            {splits.length} numbers change with the method or letter table. All are in the ledger.
          </p>
        )}
      </section>

      <section>
        <h2>Letter counts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const c = r.pythagorean.letterCounts[n] ?? 0;
            return (
              <div class="card" style={{ padding: '10px', gap: '2px', borderStyle: c ? 'solid' : 'dashed', alignItems: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 500 }}>{n}</div>
                <div class="small muted">{c ? `${c} letter${c > 1 ? 's' : ''}` : 'missing'}</div>
              </div>
            );
          })}
        </div>
        <p class="note">Pythagorean counts. Missing: {r.pythagorean.missing.join(', ') || 'none'} (some traditions call these karmic lessons). Chaldean missing (1–8): {r.chaldean.missing.join(', ') || 'none'}.</p>
        <p class="note">
          Karmic debt (13, 14, 16, 19) in a total: {r.karmicDebt.length ? r.karmicDebt.map((k) => `${k.number} in ${k.where}`).join('; ') : 'none'}.
          {r.karmicDebtInParts.length > 0 && <> Inside a single part only: {r.karmicDebtInParts.map((k) => `${k.number} in ${k.where}`).join('; ')}. Practitioners differ on whether these count.</>}
        </p>
      </section>

      <section>
        <h2>Pinnacles and challenges</h2>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr)' }}>
          <div class="h">Ages</div>
          <div class="h">Pinnacle</div>
          <div class="h">Challenge</div>
          {r.date.pinnacles.map((p) => (
            <>
              <div>{p.to === null ? `${p.from} onward` : `${p.from} to ${p.to}`}</div>
              <div>{p.pinnacle}</div>
              <div>{p.challenge}</div>
            </>
          ))}
        </div>
        <p class="note">
          First age break is 36 minus the single-digit Life Path: 36 − {36 - r.date.pinnacles[0]!.to!} = {r.date.pinnacles[0]!.to}.
        </p>
      </section>

      <section>
        <h2>Personal cycles</h2>
        <div class="grid2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            [`Year ${t.year}`, cyc.personalYear],
            [new Date(Date.UTC(2000, t.month - 1, 1)).toLocaleString('en', { month: 'long', timeZone: 'UTC' }), cyc.personalMonth],
            ['Today', cyc.personalDay]
          ].map(([k, v]) => (
            <div class="card" style={{ alignItems: 'center', padding: '12px' }}>
              <div class="small muted">{k}</div>
              <div style={{ fontSize: '26px', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Life Path {r.date.lifePathByComponent.value}</h2>
        <ReadingLayers snippetKey={`numerology.lifePath.${r.date.lifePathByComponent.value}`} lens="general" />
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}

function Biorhythm({ profile }: { profile: Profile }) {
  const b = profile.birth.local;
  const t = today(useHere().zone);
  const { rec } = useStoredRecord([b.year, b.month, b.day, t.year, t.month, t.day], () =>
    computeBiorhythm({ year: b.year, month: b.month, day: b.day }, { year: t.year, month: t.month, day: t.day })
  );
  if (!rec) return null;
  const r = rec.raw_result;
  const W = 350;
  const H = 140;
  const days = 29;
  const color: Record<Cycle, string> = { physical: '#7CC3D6', emotional: '#E0847F', intellectual: '#D6B066' };
  return (
    <>
      <section>
        <div class="card warn">
          <Label label="disagreement">Conventional, not validated</Label>
          <p class="note">{rec.limitations[0]}</p>
        </div>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr)' }}>
          <div class="h">Cycle</div>
          <div class="h">Today</div>
          <div class="h">Period</div>
          {(Object.keys(CYCLES) as Cycle[]).map((k) => (
            <>
              <div style={{ color: color[k] }}>{k[0]!.toUpperCase() + k.slice(1)}</div>
              <div>{Math.round(r.values[k] * 100)}%{r.critical.includes(k) ? ' (zero crossing)' : ''}</div>
              <div>{CYCLES[k]} days</div>
            </>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Biorhythm curves for the next four weeks">
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#2C4050" />
          <line x1="0" y1="0" x2="0" y2={H} stroke="#9AA8B3" />
          {(Object.keys(CYCLES) as Cycle[]).map((k) => (
            <polyline
              fill="none"
              stroke={color[k]}
              stroke-width="1.5"
              points={Array.from({ length: days * 4 + 1 }, (_, i) => {
                const d = r.daysLived + i / 4;
                return `${(i / (days * 4)) * W},${H / 2 - Math.sin((2 * Math.PI * d) / CYCLES[k]) * (H / 2 - 6)}`;
              }).join(' ')}
            />
          ))}
        </svg>
        <p class="note">Today on the left, four weeks ahead. Day {r.daysLived.toLocaleString()} of life, counted in calendar days.</p>
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={[]} />
    </>
  );
}

function Sky({ profile }: { profile: Profile }) {
  const { eph, error } = useEphemeris();
  if (error) return <p class="note">Ephemeris failed: {error}</p>;
  if (!eph) return <p class="note">Loading the ephemeris…</p>;
  return <SkyInner profile={profile} eph={eph} />;
}

function SkyInner({ eph }: { profile: Profile; eph: Ephemeris }) {
  const place = useHere();
  const zone = place.zone;
  const t = today(zone);
  // Daily record at local noon so one record serves the whole day.
  const noon = resolveLocal({ ...t, hour: 12, minute: 0 }, zone);
  const noonMs = noon.kind === 'exact' ? noon.result.utcMs : noon.kind === 'ambiguous' ? noon.earlier.utcMs : noon.after.utcMs;
  const weekday = (ms: number) => {
    const l = localDateIn(zone, ms);
    return new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
  };
  const moon = useStoredRecord([noonMs], () => computeMoon(eph, noonMs)).rec;
  const nowMs = Date.now();
  // Planetary days run sunrise to sunrise: before today's sunrise, the current day is yesterday's.
  const todays = useStoredRecord([noonMs, place.lat, place.lon], () => computeHours(noonMs, place.lat, place.lon, weekday));
  const beforeSunrise = todays.rec ? nowMs < todays.rec.raw_result.sunrise : false;
  const yesterdays = useStoredRecord([noonMs, beforeSunrise], () => (beforeSunrise ? computeHours(noonMs - 86_400_000, place.lat, place.lon, weekday) : null));
  const hours = beforeSunrise ? yesterdays : todays;
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit', timeZone: zone });
  const fmtD = (ms: number) => new Date(ms).toLocaleString('en', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: zone });
  const h = hours.rec?.raw_result;
  const current = h?.hours.find((x) => nowMs >= x.startMs && nowMs < x.endMs);
  return (
    <>
      {moon && (
        <section>
          <h2>Moon</h2>
          <div class="row">
            <MoonGlyph elongation={moon.raw_result.elongation} />
            <div>
              <div style={{ fontSize: '20px', fontWeight: 500 }}>
                {moon.raw_result.phase} in {moon.raw_result.moonSign}
              </div>
              <div class="note">
                {Math.round(moon.raw_result.illumination * 100)}% lit at local noon. Moon {formatLongitude(moon.raw_result.moonLongitude)}.
              </div>
            </div>
          </div>
          <div class="table" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.4fr)' }}>
            {moon.raw_result.next.map((n) => (
              <>
                <div class="muted">{n.name}</div>
                <div>{fmtD(n.utcMs)}</div>
              </>
            ))}
          </div>
          <Label label="calculated">Calculated. Phase names use 45° bins centred on the exact phases.</Label>
        </section>
      )}
      <section>
        <h2>Planetary day and hours</h2>
        {hours.error && <p class="note">{hours.error}</p>}
        {h && (
          <>
            <p class="note">
              Day of {h.planetaryDay.sunrise} (day starts at sunrise, {fmt(h.sunrise)}).
              {h.planetaryDay.midnight !== h.planetaryDay.sunrise && <> Counting from midnight it would be the day of {h.planetaryDay.midnight}.</>}
              {current && <> Now: hour of {current.ruler}, until {fmt(current.endMs)}.</>}
            </p>
            <div class="table" style={{ gridTemplateColumns: 'minmax(0,0.5fr) minmax(0,1.2fr) minmax(0,1fr)' }}>
              {h.hours.map((x) => (
                <>
                  <div class="muted" style={x === current ? { color: 'var(--calc)' } : undefined}>
                    {x.index}
                  </div>
                  <div style={x === current ? { color: 'var(--calc)' } : undefined}>
                    {fmt(x.startMs)}–{fmt(x.endMs)}
                  </div>
                  <div style={x === current ? { color: 'var(--calc)' } : undefined}>{x.ruler}</div>
                </>
              ))}
            </div>
            <Label label="calculated">Calculated for {place.name}. Unequal hours, Chaldean order. Sunrise and sunset by astronomy-engine.</Label>
          </>
        )}
      </section>
    </>
  );
}

function MoonGlyph({ elongation }: { elongation: number }) {
  // Lit fraction drawn as a terminator ellipse; waxing lit on the right (northern-hemisphere view).
  const r = 28;
  const k = Math.cos((elongation * Math.PI) / 180); // 1 new, -1 full
  const waxing = elongation < 180;
  const rx = Math.abs(k) * r;
  const outer = waxing ? 1 : 0;
  const inner = k > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0;
  const d = `M32 4 A${r} ${r} 0 0 ${outer} 32 60 A${rx} ${r} 0 0 ${inner} 32 4Z`;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r={r} fill="#1B2A36" stroke="#2C4050" />
      <path d={d} fill="#E9E5D9" />
    </svg>
  );
}

export function Provenance({ engine, at, fp, limitations }: { engine: string; at: string; fp: string; limitations: string[] }) {
  return (
    <section>
      <p class="note small">
        {engine} · computed {at.slice(0, 16).replace('T', ' ')} UTC · fingerprint {fp}
      </p>
      {limitations.map((x) => (
        <p class="note small">Limitation: {x}</p>
      ))}
    </section>
  );
}
