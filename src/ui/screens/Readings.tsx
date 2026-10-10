import { useState } from 'preact/hooks';
import type { Profile } from '../../core/profile';
import { localDateIn, resolveLocal } from '../../core/time';
import { computeBiorhythm, CYCLES, type Cycle } from '../../engines/biorhythm/compute';
import { computeHours } from '../../engines/hours/compute';
import { computeMoon } from '../../engines/moon/compute';
import { baziDisagreements, BRANCHES_ZH, computeBazi, DEFAULT_BAZI, pillarName, STEMS_ZH } from '../../engines/bazi/compute';
import { computeTzolkin, tzolkinDisagreements } from '../../engines/tzolkin/compute';
import { computeVedic, DEFAULT_VEDIC } from '../../engines/vedic/compute';
import type { ComponentChildren } from 'preact';
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

type Engine = 'numerology' | 'biorhythm' | 'sky' | 'bazi' | 'tzolkin' | 'vedic';

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
            ['sky', 'Moon and hours'],
            ['bazi', 'BaZi'],
            ['tzolkin', "Tzolk'in"],
            ['vedic', 'Vedic']
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
      {engine === 'bazi' && <WithEph render={(eph) => <BaziView profile={profile} eph={eph} />} />}
      {engine === 'tzolkin' && <TzolkinView profile={profile} />}
      {engine === 'vedic' && <WithEph render={(eph) => <VedicView profile={profile} eph={eph} />} />}
      <a class="btn" href="#/lab/fengshui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Feng Shui compass
      </a>
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

function WithEph({ render }: { render: (eph: Ephemeris) => ComponentChildren }) {
  const { eph, error } = useEphemeris();
  if (error) return <p class="note">Ephemeris failed: {error}</p>;
  if (!eph) return <p class="note">Loading the ephemeris…</p>;
  return <>{render(eph)}</>;
}

function BaziView({ profile, eph }: { profile: Profile; eph: Ephemeris }) {
  const { settings, updateSettings } = useStore();
  const conv = settings.bazi ?? DEFAULT_BAZI;
  const inp = { utcMs: profile.birth.utcMs, zone: profile.birth.zone, lat: profile.place.lat, lon: profile.place.lon };
  const { rec } = useStoredRecord([profile.id, profile.updated_at, conv.ziHour, conv.trueSolarTime], () => computeBazi(eph, inp, conv), baziDisagreements);
  if (!rec) return null;
  const c = rec.raw_result.chosen;
  const cols = [['Hour', c.hour], ['Day', c.day], ['Month', c.month], ['Year', c.year]] as const;
  const splits = baziDisagreements(rec, null);
  return (
    <>
      <section>
        <div class="grid2">
          <label class="field">
            Time used
            <select value={conv.trueSolarTime ? 'solar' : 'clock'} onChange={(e) => updateSettings({ bazi: { ...conv, trueSolarTime: e.currentTarget.value === 'solar' } })}>
              <option value="clock">Clock time</option>
              <option value="solar">True solar time</option>
            </select>
          </label>
          <label class="field">
            Zi hour rule
            <select value={conv.ziHour} onChange={(e) => updateSettings({ bazi: { ...conv, ziHour: e.currentTarget.value as 'early' | 'midnight' } })}>
              <option value="early">Day changes at 23:00</option>
              <option value="midnight">Day changes at 00:00</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
          {cols.map(([k, p]) => (
            <div class="card" style={{ padding: '10px 4px', gap: '4px' }}>
              <div class="small muted">{k}</div>
              <div style={{ fontSize: '28px' }} lang="zh">{STEMS_ZH[p.stem]}</div>
              <div style={{ fontSize: '28px' }} lang="zh">{BRANCHES_ZH[p.branch]}</div>
              <div class="small">{pillarName(p).split(' ')[1]}</div>
            </div>
          ))}
        </div>
        <Label label="calculated">Calculated. Year from Li Chun (315°), month from solar terms, day and hour from {conv.trueSolarTime ? 'true solar time' : 'clock time'} ({c.timeUsed.replace('T', ' ')}).</Label>
        <p class="note">Elements in the eight characters: {Object.entries(c.elements).map(([k, v]) => `${k} ${v}`).join(', ')}. Day master: {pillarName(c.day).split(' ')[1]!.split('-')[0]}.</p>
      </section>
      {splits.length > 0 && (
        <section>
          <h2>Where conventions split</h2>
          {splits.map((d) => (
            <div>
              <Label label="disagreement">{d.subject}</Label>
              <p class="note">{d.result_a} · {d.result_b}</p>
            </div>
          ))}
        </section>
      )}
      <section>
        <h2>Day master</h2>
        <ReadingLayers snippetKey={`bazi.dayMaster.${c.day.stem}`} lens="general" />
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}

function TzolkinView({ profile }: { profile: Profile }) {
  const b = profile.birth.local;
  const { rec } = useStoredRecord([b.year, b.month, b.day], () => computeTzolkin({ year: b.year, month: b.month, day: b.day }), tzolkinDisagreements);
  if (!rec) return null;
  const c = rec.raw_result.chosen;
  return (
    <>
      <section>
        <div class="card" style={{ alignItems: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: 500 }}>
            {c.tzolkin.number} {c.tzolkin.name}
          </div>
          <div class="note">
            Haab {c.haab.day} {c.haab.month} · Long Count {c.longCount.join('.')}
          </div>
        </div>
        <Label label="calculated">Calculated with the GMT correlation (584283), civil birth date.</Label>
        {rec.raw_result.alternatives.map((a) => (
          <div>
            <Label label="disagreement">Correlation {a.correlation}</Label>
            <p class="note">
              {a.tzolkin.number} {a.tzolkin.name}, Haab {a.haab.day} {a.haab.month}
            </p>
          </div>
        ))}
      </section>
      <section>
        <h2>Day sign</h2>
        <ReadingLayers snippetKey={`tzolkin.daySign.${c.tzolkin.name.toLowerCase()}`} lens="general" />
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}

function VedicView({ profile, eph }: { profile: Profile; eph: Ephemeris }) {
  const inp = { utcMs: profile.birth.utcMs, lat: profile.place.lat, lon: profile.place.lon, timeKnown: profile.birth.timeKnown };
  const { rec } = useStoredRecord([profile.id, profile.updated_at], () => computeVedic(eph, inp, DEFAULT_VEDIC));
  if (!rec) return null;
  const r = rec.raw_result;
  const now = Date.now();
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return (
    <>
      <section>
        <p class="note">Sidereal, Lahiri ayanamsa {r.ayanamsa.toFixed(4)}°. {r.ascendant ? `Ascendant ${formatLongitude(r.ascendant.longitude)}.` : 'No ascendant (time unknown).'}</p>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,0.9fr) minmax(0,1.4fr) minmax(0,1.4fr)' }}>
          <div class="h">Graha</div>
          <div class="h">Position</div>
          <div class="h">Nakshatra</div>
          {r.grahas.map((g) => (
            <>
              <div class="muted">{g.id}</div>
              <div>{formatLongitude(g.longitude)}</div>
              <div>
                {g.nakshatra} {g.pada}
              </div>
            </>
          ))}
        </div>
        <Label label="calculated">Calculated. Mean node; dasha years of 365.25 days.</Label>
      </section>
      <section>
        <h2>Vimshottari dasha</h2>
        <p class="note">
          Moon in {r.moonNakshatra.name} (lord {r.moonNakshatra.lord}), {Math.round(r.moonNakshatra.fractionTraversed * 100)}% traversed at birth.
        </p>
        <div class="table" style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)' }}>
          {r.dashas.map((d) => {
            const cur = now >= d.startMs && now < d.endMs;
            const st = cur ? { color: 'var(--calc)' } : undefined;
            return (
              <>
                <div style={st}>{d.lord}{cur ? ' (now)' : ''}</div>
                <div style={st}>{fmt(d.startMs)}</div>
                <div style={st}>{fmt(d.endMs)}</div>
              </>
            );
          })}
        </div>
      </section>
      <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
    </>
  );
}
