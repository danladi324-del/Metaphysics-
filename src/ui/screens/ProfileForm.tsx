import { useEffect, useMemo, useState } from 'preact/hooks';
import { loadCities, searchCities, type City } from '../../core/cities';
import type { NumerologyName, Profile } from '../../core/profile';
import { validateProfile } from '../../core/profile';
import { formatOffset, isValidZone, resolveLocal, type Resolution, type ResolvedTime } from '../../core/time';
import { useStore } from '../store';

const pad = (n: number) => String(n).padStart(2, '0');

export function ProfileForm({ existing, onDone }: { existing: Profile | null; onDone: () => void }) {
  const { db, updateSettings, bump } = useStore();
  const b = existing?.birth;
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [date, setDate] = useState(b ? `${b.local.year}-${pad(b.local.month)}-${pad(b.local.day)}` : '');
  const [time, setTime] = useState(b ? `${pad(b.local.hour)}:${pad(b.local.minute)}` : '12:00');
  const [timeKnown, setTimeKnown] = useState(b?.timeKnown ?? true);
  const [query, setQuery] = useState(existing?.place.name ?? '');
  const [cities, setCities] = useState<City[] | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [place, setPlace] = useState(existing?.place ?? null);
  const [zone, setZone] = useState(b?.zone ?? '');
  const [manual, setManual] = useState(existing?.place.source === 'manual');
  const [lat, setLat] = useState(existing ? String(existing.place.lat) : '');
  const [lon, setLon] = useState(existing ? String(existing.place.lon) : '');
  const [names, setNames] = useState<NumerologyName[]>(existing?.numerologyNames ?? [{ name: '', kind: 'birth' }]);
  const [choice, setChoice] = useState<'a' | 'b' | null>(null);
  const [sex, setSex] = useState<'male' | 'female' | ''>(existing?.sex ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    loadCities(import.meta.env.BASE_URL).then(setCities, (e: Error) => setCityError(e.message));
  }, []);

  const matches = useMemo(() => (cities && !manual && query !== place?.name ? searchCities(cities, query) : []), [cities, query, manual, place]);

  const local = useMemo(() => {
    const m = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(date);
    const t = /^(\d{2}):(\d{2})$/.exec(timeKnown ? time : '12:00');
    if (!m || !t) return null;
    return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(t[1]), minute: Number(t[2]) };
  }, [date, time, timeKnown]);

  const resolution: Resolution | { kind: 'error'; message: string } | null = useMemo(() => {
    if (!local || !zone) return null;
    if (!isValidZone(zone)) return { kind: 'error', message: `Unknown time zone "${zone}".` };
    try {
      return resolveLocal(local, zone);
    } catch (e) {
      return { kind: 'error', message: (e as Error).message };
    }
  }, [local, zone]);

  let resolved: ResolvedTime | null = null;
  let note: string | undefined;
  if (resolution?.kind === 'exact') resolved = resolution.result;
  if (resolution?.kind === 'ambiguous' && choice) {
    resolved = choice === 'a' ? resolution.earlier : resolution.later;
    note = `Clock time occurred twice (DST ended); chose the ${choice === 'a' ? 'first' : 'second'} occurrence.`;
  }
  if (resolution?.kind === 'nonexistent' && choice) {
    resolved = choice === 'a' ? resolution.before : resolution.after;
    note = `Clock time was skipped (DST began); read with the ${choice === 'a' ? 'earlier' : 'later'} offset.`;
  }

  function pickCity(c: City) {
    setPlace({ name: c.name, admin: c.admin, country: c.country, lat: c.lat, lon: c.lon, source: 'geonames' });
    setZone(c.zone);
    setQuery(c.name);
    setChoice(null);
  }

  function save(e: Event) {
    e.preventDefault();
    const finalPlace = manual ? { name: query || 'Manual location', lat: Number(lat), lon: Number(lon), source: 'manual' as const } : place;
    const errs: string[] = [];
    if (!local) errs.push('Enter a birth date.');
    if (!finalPlace) errs.push('Pick a city or enter coordinates.');
    if (!resolved) errs.push(resolution?.kind === 'error' ? resolution.message : 'Resolve the birth time first.');
    if (errs.length || !local || !finalPlace || !resolved) return setErrors(errs);
    const now = new Date().toISOString();
    const p: Profile = {
      id: existing?.id ?? `p-${Date.now().toString(36)}`,
      displayName: displayName.trim(),
      birth: {
        local,
        zone,
        offsetSeconds: resolved.offsetSeconds,
        utcMs: resolved.utcMs,
        offsetSource: 'Intl tzdb (this device)',
        ...(note ? { resolutionNote: note } : {}),
        timeKnown
      },
      place: finalPlace,
      numerologyNames: names.filter((n) => n.name.trim()).map((n) => ({ ...n, name: n.name.trim() })),
      ...(sex ? { sex } : {}),
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    const v = validateProfile(p);
    if (v.length) return setErrors(v);
    db.saveProfile(p);
    updateSettings({ activeProfileId: p.id });
    bump();
    onDone();
  }

  return (
    <main>
      <header>
        <h1>{existing ? 'Edit profile' : 'New profile'}</h1>
        <div class="sub">Birth data stays on this device.</div>
      </header>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <label class="field">
          Name shown in the app
          <input value={displayName} onInput={(e) => setDisplayName(e.currentTarget.value)} required autocomplete="off" />
        </label>
        <div class="grid2">
          <label class="field">
            Birth date
            <input type="date" value={date} onInput={(e) => setDate(e.currentTarget.value)} required />
          </label>
          <label class="field">
            Local clock time
            <input type="time" value={time} disabled={!timeKnown} onInput={(e) => setTime(e.currentTarget.value)} />
          </label>
        </div>
        <label class="row" style={{ minHeight: '44px', fontSize: '15px' }}>
          <input type="checkbox" style={{ width: '22px', minHeight: '22px' }} checked={!timeKnown} onChange={(e) => setTimeKnown(!e.currentTarget.checked)} />
          Birth time unknown (houses and angles will not be shown)
        </label>

        <section>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <h2>Birth place</h2>
            <button type="button" class="chip" aria-pressed={manual} onClick={() => setManual(!manual)}>
              Enter coordinates
            </button>
          </div>
          <label class="field">
            {manual ? 'Place name (optional)' : 'City'}
            <input value={query} onInput={(e) => setQuery(e.currentTarget.value)} autocomplete="off" />
          </label>
          {cityError && <p class="note">City list unavailable: {cityError}. Use coordinates.</p>}
          {matches.length > 0 && (
            <div class="card" style={{ padding: '4px 0', gap: 0 }} role="listbox" aria-label="Matching cities">
              {matches.map((c) => (
                <button type="button" class="btn" style={{ border: 0, textAlign: 'left', borderRadius: 0 }} onClick={() => pickCity(c)}>
                  {c.name}, {c.admin} {c.country} <span class="muted small">{c.zone}</span>
                </button>
              ))}
            </div>
          )}
          {manual && (
            <div class="grid2">
              <label class="field">
                Latitude (N +)
                <input inputMode="decimal" value={lat} onInput={(e) => setLat(e.currentTarget.value)} />
              </label>
              <label class="field">
                Longitude (E +, W −)
                <input inputMode="decimal" value={lon} onInput={(e) => setLon(e.currentTarget.value)} />
              </label>
            </div>
          )}
          <label class="field">
            Time zone (IANA)
            <input value={zone} onInput={(e) => setZone(e.currentTarget.value)} placeholder="America/Chicago" autocomplete="off" />
          </label>
          {place && !manual && (
            <p class="note">
              {place.name}: {place.lat.toFixed(4)}, {place.lon.toFixed(4)}. Source: GeoNames.
            </p>
          )}
        </section>

        {resolution && (
          <section class="card" aria-live="polite">
            {resolution.kind === 'error' && <p class="note">{resolution.message}</p>}
            {resolution.kind === 'exact' && (
              <p class="note">
                Resolved to {formatOffset(resolution.result.offsetSeconds)}, {new Date(resolution.result.utcMs).toISOString().replace('T', ' ').slice(0, 16)} UTC.
              </p>
            )}
            {resolution.kind === 'ambiguous' && (
              <>
                <p class="note">This clock time happened twice that night (daylight saving ended). Which one?</p>
                <div class="chips">
                  <button type="button" class="chip" aria-pressed={choice === 'a'} onClick={() => setChoice('a')}>
                    First ({formatOffset(resolution.earlier.offsetSeconds)})
                  </button>
                  <button type="button" class="chip" aria-pressed={choice === 'b'} onClick={() => setChoice('b')}>
                    Second ({formatOffset(resolution.later.offsetSeconds)})
                  </button>
                </div>
              </>
            )}
            {resolution.kind === 'nonexistent' && (
              <>
                <p class="note">This clock time did not exist (daylight saving began). The record may be off by an hour. Read it as:</p>
                <div class="chips">
                  <button type="button" class="chip" aria-pressed={choice === 'a'} onClick={() => setChoice('a')}>
                    {formatOffset(resolution.before.offsetSeconds)}
                  </button>
                  <button type="button" class="chip" aria-pressed={choice === 'b'} onClick={() => setChoice('b')}>
                    {formatOffset(resolution.after.offsetSeconds)}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        <label class="field">
          Sex (optional; used only by BaZi luck pillars and the Feng Shui Kua)
          <select value={sex} onChange={(e) => setSex(e.currentTarget.value as 'male' | 'female' | '')}>
            <option value="">Not given</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <section>
          <h2>Names for numerology</h2>
          <p class="note">Birth-certificate name is the classical choice for Expression. Add others to compare.</p>
          {names.map((n, i) => (
            <div class="row">
              <input
                aria-label={`Name ${i + 1}`}
                value={n.name}
                onInput={(e) => setNames(names.map((x, j) => (j === i ? { ...x, name: e.currentTarget.value } : x)))}
              />
              <select
                aria-label={`Name ${i + 1} kind`}
                style={{ width: '130px' }}
                value={n.kind}
                onChange={(e) => setNames(names.map((x, j) => (j === i ? { ...x, kind: e.currentTarget.value as NumerologyName['kind'] } : x)))}
              >
                <option value="birth">Birth</option>
                <option value="current">Current</option>
                <option value="as given">As given</option>
              </select>
            </div>
          ))}
          <button type="button" class="btn" onClick={() => setNames([...names, { name: '', kind: 'current' }])}>
            Add a name
          </button>
        </section>

        {errors.length > 0 && (
          <div class="card warn" role="alert">
            {errors.map((e) => (
              <p class="note">{e}</p>
            ))}
          </div>
        )}
        <button class="btn primary" type="submit">
          Save profile
        </button>
        {existing && (
          <button type="button" class="btn" onClick={onDone}>
            Cancel
          </button>
        )}
      </form>
    </main>
  );
}
