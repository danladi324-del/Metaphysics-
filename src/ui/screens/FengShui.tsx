import { useEffect, useMemo, useState } from 'preact/hooks';
import { solarTermInstant } from '../../engines/bazi/compute';
import { computeFengShui, eightMansions, group, MOUNTAINS, type Grid, type Palace } from '../../engines/fengshui/compute';
import type { Ephemeris } from '../../engines/natal/ephemeris';
import { Label } from '../components/Label';
import { useStore } from '../store';
import { useEphemeris } from '../useNatal';
import { Provenance } from './Readings';

type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

/** Live compass: iOS webkitCompassHeading (magnetic), else absolute alpha. Permission is requested on a tap. */
function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<'off' | 'on' | 'denied' | 'unsupported'>('off');
  async function start() {
    const DOE = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!DOE) return setStatus('unsupported');
    if (typeof DOE.requestPermission === 'function') {
      try {
        if ((await DOE.requestPermission()) !== 'granted') return setStatus('denied');
      } catch {
        return setStatus('denied');
      }
    }
    const on = (e: Event) => {
      const ev = e as OrientationEvt;
      if (typeof ev.webkitCompassHeading === 'number') {
        setHeading(ev.webkitCompassHeading);
        setAccuracy(ev.webkitCompassAccuracy ?? null);
      } else if (ev.absolute && ev.alpha !== null) {
        setHeading((360 - ev.alpha) % 360);
      }
    };
    addEventListener('deviceorientationabsolute', on);
    addEventListener('deviceorientation', on);
    setStatus('on');
  }
  return { heading, accuracy, status, start };
}

export function FengShui() {
  const { eph, error } = useEphemeris();
  if (error) return <main><p class="note">Ephemeris failed: {error}</p></main>;
  if (!eph) return <main><p class="note">Loading…</p></main>;
  return <FengShuiInner eph={eph} />;
}

function solarYear(eph: Ephemeris, ms: number): number {
  const y = new Date(ms).getUTCFullYear();
  return ms < solarTermInstant(eph, 315, Date.UTC(y, 0, 1)) ? y - 1 : y;
}

function FengShuiInner({ eph }: { eph: Ephemeris }) {
  const { db, profile, here, settings, updateSettings, bump } = useStore();
  const fs = settings.fengshui ?? { builtYear: null, lastBearing: null, north: 'magnetic' as const };
  const compass = useCompass();
  const [manual, setManual] = useState(fs.lastBearing !== null ? String(fs.lastBearing) : '');
  const [built, setBuilt] = useState(fs.builtYear !== null ? String(fs.builtYear) : '');
  const [north, setNorth] = useState<'magnetic' | 'true'>(fs.north);
  const bearing = manual.trim() === '' ? null : Number(manual);
  const builtYear = Number(built);
  const ok = bearing !== null && Number.isFinite(bearing) && bearing >= 0 && bearing < 360 && Number.isInteger(builtYear) && builtYear >= 1864 && builtYear <= 2400 && here;
  const now = Date.now();
  const rec = useMemo(() => {
    if (!ok || !here) return null;
    return computeFengShui({
      bearing: bearing!,
      north,
      lat: here.lat,
      lon: here.lon,
      dateMs: Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()),
      builtYear,
      birthSolarYear: profile ? solarYear(eph, profile.birth.utcMs) : new Date(now).getUTCFullYear(),
      currentSolarYear: solarYear(eph, now)
    });
  }, [bearing, north, builtYear, here?.lat, here?.lon]);

  function capture() {
    if (compass.heading === null) return;
    setManual(compass.heading.toFixed(1));
    setNorth('magnetic');
  }
  function save() {
    if (!rec) return;
    db.saveRecord(rec, profile?.id ?? null);
    updateSettings({ fengshui: { builtYear, lastBearing: bearing, north } });
    bump();
  }
  useEffect(() => {
    if (rec) updateSettings({ fengshui: { builtYear: Number.isInteger(builtYear) ? builtYear : null, lastBearing: bearing, north } });
  }, [rec?.fingerprint]);

  const r = rec?.raw_result;
  return (
    <main>
      <header>
        <h1>Feng Shui</h1>
        <div class="sub">Facing direction, 24 mountains, Flying Star and Eight Mansions.</div>
      </header>

      <section>
        <h2>Facing direction</h2>
        <p class="note">Stand inside the front door looking out. Hold the phone flat with its top edge pointing out the door, away from metal.</p>
        {compass.status === 'off' && (
          <button class="btn primary" onClick={compass.start}>
            Use the compass
          </button>
        )}
        {compass.status === 'denied' && <p class="note">Compass permission was refused. Enter degrees by hand.</p>}
        {compass.status === 'unsupported' && <p class="note">No compass on this device. Enter degrees by hand.</p>}
        {compass.status === 'on' && (
          <div class="card" style={{ alignItems: 'center' }}>
            <div style={{ fontSize: '40px', fontVariantNumeric: 'tabular-nums' }}>{compass.heading === null ? '–' : `${compass.heading.toFixed(1)}°`}</div>
            <div class="small muted">
              Magnetic heading{compass.accuracy !== null ? `, accuracy ±${Math.round(compass.accuracy)}°` : ''}
            </div>
            <button class="btn primary" style={{ width: '100%' }} onClick={capture} disabled={compass.heading === null}>
              Capture this heading
            </button>
          </div>
        )}
        <div class="grid2">
          <label class="field">
            Degrees (0–359.9)
            <input inputMode="decimal" value={manual} onInput={(e) => setManual(e.currentTarget.value)} />
          </label>
          <label class="field">
            Measured from
            <select value={north} onChange={(e) => setNorth(e.currentTarget.value as 'magnetic' | 'true')}>
              <option value="magnetic">Magnetic north</option>
              <option value="true">True north</option>
            </select>
          </label>
        </div>
        <label class="field">
          Year the building was completed or occupied
          <input inputMode="numeric" value={built} onInput={(e) => setBuilt(e.currentTarget.value)} />
        </label>
        <p class="note small">Location: {here?.name ?? 'not set'} (change it in Lab). Declination comes from the World Magnetic Model for that place and today.</p>
      </section>

      {r && rec && (
        <>
          <section>
            <Luopan trueBearing={r.trueBearing} />
            <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr)' }}>
              <div class="muted">Magnetic</div>
              <div>{r.magneticBearing?.toFixed(1)}°</div>
              <div class="muted">Declination</div>
              <div>
                {r.declination.degrees > 0 ? '+' : ''}
                {r.declination.degrees.toFixed(2)}° ({r.declination.model})
              </div>
              <div class="muted">True</div>
              <div>{r.trueBearing.toFixed(1)}°</div>
              <div class="muted">Facing mountain</div>
              <div>
                <span lang="zh">{r.mountain.zh}</span> {r.mountain.name} ({r.mountain.palace})
              </div>
              <div class="muted">Sitting</div>
              <div>
                {r.flyingStar.sitting.name} ({r.flyingStar.sitting.palace})
              </div>
            </div>
            <Label label="calculated">Calculated. Charts use true north.</Label>
            {r.declination.degrees !== 0 && Math.abs(r.declination.degrees) >= 0.5 && (
              <p class="note">Magnetic and true bearings differ by {Math.abs(r.declination.degrees).toFixed(1)}° here. Both are stored.</p>
            )}
          </section>

          <section>
            <h2>Flying Star, Period {r.flyingStar.period}</h2>
            {r.flyingStar.nearBoundary && (
              <div class="card warn">
                <Label label="disagreement">Near a boundary</Label>
                <p class="note">{rec.limitations[0]}</p>
              </div>
            )}
            <StarGrid fs={r.flyingStar} annual={r.annual} />
            <p class="note">
              South is at the top, as on a luopan. Each square: mountain star (left), water star (right), base period star (centre top), annual {r.annual.year} star (bottom, gold). Mountain stars fly {r.flyingStar.mountainForward ? 'forward' : 'in reverse'}, water stars {r.flyingStar.waterForward ? 'forward' : 'in reverse'}.
            </p>
          </section>

          <section>
            <h2>Eight Mansions</h2>
            <p class="note">
              {profile?.sex
                ? `Kua uses the ${profile.sex} formula (from the profile). Birth solar year ${r.kua.solarYear}.`
                : `Kua depends on sex in this tradition and the profile does not record it, so both are shown. Birth solar year ${r.kua.solarYear}.`}
            </p>
            {(profile?.sex ? [profile.sex] : (['male', 'female'] as const)).map((sex) => {
              const k = r.kua[sex];
              return (
                <div class="card">
                  <h3>
                    Kua {k} ({sex} formula), {group(k)} group
                  </h3>
                  <div class="table" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,0.6fr) minmax(0,0.8fr)' }}>
                    {eightMansions(k).map((m) => (
                      <>
                        <div>{m.star}</div>
                        <div>{m.palace}</div>
                        <div class="small" style={{ color: m.good ? 'var(--calc)' : 'var(--clash)' }}>{m.good ? 'favourable' : 'unfavourable'}</div>
                      </>
                    ))}
                  </div>
                </div>
              );
            })}
            <Label label="calculated">Calculated. Favourable/unfavourable is the tradition's own classification, not a claim of effect.</Label>
          </section>
          <button class="btn" onClick={save}>
            Save this reading
          </button>
          <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
        </>
      )}
    </main>
  );
}

function Luopan({ trueBearing }: { trueBearing: number }) {
  const c = 150;
  const R = 140;
  const r1 = 100;
  const pt = (deg: number, rad: number) => {
    const a = ((deg - 90) * Math.PI) / 180; // north up, clockwise
    return [c + rad * Math.cos(a), c + rad * Math.sin(a)] as const;
  };
  return (
    <svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: '300px', alignSelf: 'center' }} role="img" aria-label={`24-mountain ring with the facing at ${trueBearing.toFixed(1)} degrees true`}>
      <circle cx={c} cy={c} r={R} fill="#1B2A36" stroke="#2C4050" />
      <circle cx={c} cy={c} r={r1} fill="#131E27" stroke="#2C4050" />
      {MOUNTAINS.map((m, i) => {
        const start = 337.5 + i * 15;
        const [x1, y1] = pt(start, r1);
        const [x2, y2] = pt(start, R);
        const [tx, ty] = pt(start + 7.5, (R + r1) / 2);
        return (
          <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={m.sub === 1 ? '#9AA8B3' : '#2C4050'} />
            <text x={tx} y={ty} font-size="13" fill={m.yang ? '#E9E5D9' : '#9AA8B3'} text-anchor="middle" dominant-baseline="central" lang="zh">
              {m.zh}
            </text>
          </g>
        );
      })}
      {(['N', 'E', 'S', 'W'] as const).map((d, i) => {
        const [x, y] = pt(i * 90, r1 - 16);
        return (
          <text x={x} y={y} font-size="12" fill="#9AA8B3" text-anchor="middle" dominant-baseline="central">
            {d}
          </text>
        );
      })}
      {(() => {
        const [x, y] = pt(trueBearing, R);
        const [bx, by] = pt(trueBearing + 180, r1 - 30);
        return <line x1={bx} y1={by} x2={x} y2={y} stroke="#7CC3D6" stroke-width="2.5" />;
      })()}
    </svg>
  );
}

/** 3x3 grid, south at the top (luopan convention). */
function StarGrid({ fs, annual }: { fs: { base: Grid; mountain: Grid; water: Grid; facing: { palace: Palace }; sitting: { palace: Palace } }; annual: Grid }) {
  const rows: (Palace | 'C')[][] = [
    ['SE', 'S', 'SW'],
    ['E', 'C', 'W'],
    ['NE', 'N', 'NW']
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }} role="table" aria-label="Flying star chart, south at top">
      {rows.flat().map((p) => {
        const tag = p === fs.facing.palace ? 'facing' : p === fs.sitting.palace ? 'sitting' : '';
        return (
          <div class="card" role="cell" style={{ padding: '8px', gap: '2px', alignItems: 'center', borderColor: tag === 'facing' ? 'var(--calc)' : undefined }}>
            <div class="small muted">
              {p === 'C' ? 'Centre' : p}
              {tag ? ` · ${tag}` : ''}
            </div>
            <div class="small muted">{fs.base[p]}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '22px', fontVariantNumeric: 'tabular-nums' }}>
              <span aria-label="mountain star">{fs.mountain[p]}</span>
              <span aria-label="water star">{fs.water[p]}</span>
            </div>
            <div class="small" style={{ color: 'var(--trad)' }} aria-label="annual star">
              {annual[p]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
