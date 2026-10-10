import { useState } from 'preact/hooks';
import { qimenView } from '../../composer/views';
import type { Profile } from '../../core/profile';
import type { Ephemeris } from '../../engines/natal/ephemeris';
import { computeQimen, qimenDisagreements, type QimenChart } from '../../engines/qimen/compute';
import { ComposedReading } from '../components/ComposedReading';
import { Label } from '../components/Label';
import { useStore } from '../store';
import { useStoredRecord } from '../useRecord';
import { Provenance } from './Readings';

export function Qimen({ profile, eph }: { profile: Profile; eph: Ephemeris }) {
  const { here } = useStore();
  const [when, setWhen] = useState<'now' | 'birth'>('now');
  // Hour charts change every two hours; key the record to the start of the current hour.
  const hourMs = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const inp =
    when === 'now'
      ? { utcMs: hourMs, zone: here!.zone, lat: here!.lat, lon: here!.lon }
      : { utcMs: profile.birth.utcMs, zone: profile.birth.zone, lat: profile.place.lat, lon: profile.place.lon };
  const { rec, error } = useStoredRecord([when, inp.utcMs, inp.zone], () => computeQimen(eph, inp), qimenDisagreements);
  return (
    <>
      <section>
        <div class="card warn">
          <Label label="synthesis">Experimental</Label>
          <p class="note">
            Chai Bu school, hour chart, rotating plate. Checked against two independent implementations, not yet against your old app. Zhi Run is not computed yet.
          </p>
        </div>
        <div class="seg" role="tablist" aria-label="Chart moment">
          <button role="tab" aria-selected={when === 'now'} onClick={() => setWhen('now')}>
            This hour
          </button>
          <button role="tab" aria-selected={when === 'birth'} onClick={() => setWhen('birth')}>
            Birth
          </button>
        </div>
      </section>
      {error && <p class="note">{error}</p>}
      {rec && (
        <>
          <section>
            <p class="note">
              {rec.raw_result.chosen.dun === 'yang' ? 'Yang' : 'Yin'} dun Ju {rec.raw_result.chosen.ju} · {rec.raw_result.chosen.term} {rec.raw_result.chosen.yuan} yuan · xun {rec.raw_result.chosen.xunHead} (hidden under {rec.raw_result.chosen.hiddenStem}) · {when === 'now' ? here!.name : profile.place.name}
            </p>
            <Grid c={rec.raw_result.chosen} />
            <Label label="calculated">Calculated. South at the top. Each square: deity, star, heaven stem over earth stem, door.</Label>
            {qimenDisagreements(rec, null).map((d) => (
              <div>
                <Label label="disagreement">{d.subject}</Label>
                <p class="note">
                  {d.result_a} · {d.result_b}
                </p>
              </div>
            ))}
          </section>
          <ComposedReading view={qimenView(rec)} kind="event" rec={rec} day={rec.id} />
          <Provenance engine={`${rec.engine} ${rec.engine_version}`} at={rec.computed_at} fp={rec.fingerprint} limitations={rec.limitations} />
        </>
      )}
    </>
  );
}

function Grid({ c }: { c: QimenChart }) {
  const order = [4, 9, 2, 3, 5, 7, 8, 1, 6]; // SE S SW / E C W / NE N NW
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }} role="table" aria-label="Qi Men chart, south at top">
      {order.map((n) => {
        const p = c.palaces.find((x) => x.number === n)!;
        const lead = n === c.leader.starPalace;
        return (
          <div class="card" role="cell" lang="zh" style={{ padding: '6px', gap: '2px', alignItems: 'center', textAlign: 'center', borderColor: lead ? 'var(--calc)' : undefined }}>
            <div class="small muted">
              {p.direction} {n}
            </div>
            {n === 5 ? (
              <div style={{ fontSize: '18px' }}>{p.earthStem}</div>
            ) : (
              <>
                <div class="small" style={{ color: 'var(--trad)' }}>{p.deity}</div>
                <div class="small">{p.stars.join(' ')}</div>
                <div style={{ fontSize: '18px' }}>
                  {p.heavenStems.join('')}
                  <span class="muted">/{p.earthStem}</span>
                </div>
                <div class="small">{p.door}</div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
