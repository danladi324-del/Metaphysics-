import { useEffect, useState } from 'preact/hooks';
import { loadCities, searchCities, type City } from '../../core/cities';
import { KEY_SETS } from '../../content/keys';
import { approveSnippet, rowToSnippet, sources } from '../../content/model';
import { importPack, templatePack } from '../../content/pack';
import { backupStatus, exportJson, parseExport, restore } from '../../core/backup';
import { LABEL_TEXT, type EvidenceLabel } from '../../core/labels';
import { Label } from '../components/Label';
import { shareFile } from '../share';
import { APP_VERSION, deviceZone, useStore } from '../store';

export function Lab() {
  const { db, profile, profiles, persisted, updateSettings, bump, version } = useStore();
  const [kind, setKind] = useState<'calculation' | 'interpretation'>('calculation');
  const [msg, setMsg] = useState<string | null>(null);
  void version;
  const rows = db.disagreements('kind = ? AND (profile_id = ? OR profile_id IS NULL)', [kind, profile?.id ?? '']);
  const status = backupStatus(db, persisted);
  const counts = db.counts();

  async function doExport() {
    const stamp = new Date().toISOString().slice(0, 10);
    const json = exportJson(db, APP_VERSION);
    const how = await shareFile(`metaphysics-backup-${stamp}.json`, 'application/json', json);
    setMsg(how === 'cancelled' ? 'Export cancelled. Nothing was saved.' : `Export ${how === 'shared' ? 'handed to the share sheet' : 'downloaded'}.`);
    bump();
  }

  async function doImport(file: File) {
    try {
      const parsed = parseExport(await file.text());
      if (!confirm(`Replace everything on this device with the backup from ${parsed.exported_at.slice(0, 10)}? (${parsed.counts.profile ?? 0} profiles, ${parsed.counts.calc_record ?? 0} records)`)) return;
      restore(db, parsed);
      await db.flush();
      setMsg('Restored. Every table was replaced with the backup contents.');
      bump();
    } catch (e) {
      setMsg(`Restore refused: ${(e as Error).message} Nothing was changed.`);
    }
  }

  async function doWipe() {
    if (!confirm('Delete every profile, record and journal entry on this device? Export first if you want to keep them.')) return;
    db.wipe();
    await db.flush();
    setMsg('All data on this device was deleted.');
    bump();
  }

  return (
    <main>
      <header>
        <h1>Lab</h1>
        <div class="sub">Where results differ, and why. Backups and settings.</div>
      </header>

      <section>
        <h2>Ledger</h2>
        <div class="seg" role="tablist" aria-label="Disagreement type">
          <button role="tab" aria-selected={kind === 'calculation'} onClick={() => setKind('calculation')}>
            Calculation
          </button>
          <button role="tab" aria-selected={kind === 'interpretation'} onClick={() => setKind('interpretation')}>
            Interpretation
          </button>
        </div>
        {rows.length === 0 && (
          <p class="note">{kind === 'calculation' ? 'No calculation disagreements stored yet. Open Charts to compute.' : 'Interpretation splits arrive with the content layer (phase 3).'}</p>
        )}
        {dedupe(rows).map((d) => (
          <div class="card">
            <Label label="disagreement">{d.subject}</Label>
            <div class="grid2">
              <div class="small">{d.result_a}</div>
              <div class="small">{d.result_b}</div>
            </div>
            <p class="note small">
              Cause: {d.cause}. Engine: {d.engine ?? '–'}.
            </p>
          </div>
        ))}
        <p class="note">The app keeps both results. It does not pick one.</p>
      </section>

      <section>
        <h2>Labels</h2>
        {(Object.keys(LABEL_TEXT) as EvidenceLabel[]).map((l) => (
          <Label label={l}>{LABEL_TEXT[l]}</Label>
        ))}
      </section>

      <section>
        <h2>Reference fixtures</h2>
        <p class="note">
          0 external reference charts loaded. Astrodienst screenshots are still owed. Current checks are against independent code: astronomy-engine for planets (agreement under 18″) and a textbook implementation for Ascendant, MC and Placidus cusps (under 36″).
        </p>
      </section>

      <section>
        <h2>Backup</h2>
        <div class="card">
          <Label label={status.daysSinceExport === null || status.daysSinceExport > 7 ? 'disagreement' : 'calculated'}>
            {status.lastExport ? `Last export: ${status.daysSinceExport === 0 ? 'today' : `${status.daysSinceExport} days ago`}` : 'Never exported'}
          </Label>
          <Label label={persisted ? 'calculated' : 'disagreement'}>
            {persisted === null ? 'Persistent storage: not supported by this browser' : persisted ? 'Persistent storage granted' : 'Persistent storage not granted: Safari may evict data'}
          </Label>
          <p class="note small">
            On this device: {counts.profile} profiles, {counts.calc_record} records, {counts.disagreement} disagreements, {counts.journal_entry} journal entries. The JSON export is the real backup.
          </p>
        </div>
        <button class="btn primary" onClick={doExport}>
          Export all records
        </button>
        <label class="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Restore from a backup file
          <input
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void doImport(f);
              e.currentTarget.value = '';
            }}
          />
        </label>
        {msg && (
          <p class="note" role="status">
            {msg}
          </p>
        )}
      </section>

      <a class="btn" href="#/lab/fengshui" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Feng Shui compass
      </a>

      <ContentSection />

      <HereSetting />

      <section>
        <h2>Profiles</h2>
        {profiles.map((p) => (
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <button class="chip" aria-pressed={p.id === profile?.id} onClick={() => updateSettings({ activeProfileId: p.id })}>
              {p.displayName}
            </button>
            <a class="chip" style={{ display: 'inline-flex', alignItems: 'center' }} href={`#/lab/profile/${p.id}`}>
              Edit
            </a>
          </div>
        ))}
        <a class="btn" href="#/lab/profile/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Add a profile
        </a>
      </section>

      <section>
        <h2>Danger</h2>
        <button class="btn danger" onClick={doWipe}>
          Delete all data on this device
        </button>
      </section>

      <section>
        <p class="note small">
          Metaphysics {APP_VERSION}. Swiss Ephemeris (Astrodienst, AGPL-3.0) via @swisseph/browser. City data: GeoNames (geonames.org), CC-BY. Fonts: Familjen Grotesk and Newsreader, SIL OFL 1.1.
        </p>
      </section>
    </main>
  );
}

/** One row per subject + cause; repeated computes of the same chart would otherwise list the same split many times. */
function dedupe<T extends { subject: string; result_a: string; result_b: string; cause: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const k = `${r.subject}|${r.result_a}|${r.result_b}|${r.cause}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function HereSetting() {
  const { here, settings, updateSettings } = useStore();
  const [q, setQ] = useState('');
  const [cities, setCities] = useState<City[] | null>(null);
  useEffect(() => {
    if (q.length >= 2 && !cities) loadCities(import.meta.env.BASE_URL).then(setCities, () => setCities([]));
  }, [q]);
  const matches = cities ? searchCities(cities, q) : [];
  return (
    <section>
      <h2>Current location</h2>
      <p class="note">
        Used for "today", the sky and planetary hours: {here ? `${here.name}, ${here.zone}` : 'not set'}.
        {!settings.here && ` Defaulting to the birth place and this device's zone (${deviceZone()}).`}
      </p>
      <label class="field">
        Change city
        <input value={q} onInput={(e) => setQ(e.currentTarget.value)} autocomplete="off" />
      </label>
      {matches.map((c) => (
        <button
          class="btn"
          style={{ textAlign: 'left' }}
          onClick={() => {
            updateSettings({ here: { name: `${c.name}, ${c.admin} ${c.country}`, lat: c.lat, lon: c.lon, zone: c.zone } });
            setQ('');
          }}
        >
          {c.name}, {c.admin} {c.country} <span class="muted small">{c.zone}</span>
        </button>
      ))}
      {settings.here && (
        <button class="btn" onClick={() => updateSettings({ here: null })}>
          Use the default
        </button>
      )}
    </section>
  );
}

function ContentSection() {
  const { db, bump, version } = useStore();
  void version;
  const [msg, setMsg] = useState<string | null>(null);
  const srcs = sources(db);
  const pending = db.all("SELECT * FROM snippet WHERE label = 'traditional' AND approved = 0 AND placeholder = 0 ORDER BY key").map(rowToSnippet);
  const approved = Number(db.all("SELECT COUNT(*) AS n FROM snippet WHERE label = 'traditional' AND approved = 1")[0]?.n ?? 0);
  const synth = Number(db.all("SELECT COUNT(*) AS n FROM snippet WHERE label = 'synthesis'")[0]?.n ?? 0);

  async function onPack(file: File) {
    try {
      const r = importPack(db, JSON.parse(await file.text()));
      setMsg(`Imported ${r.snippets} snippets, ${r.sources} sources, ${r.splits} declared splits.${r.warnings.length ? ' Warnings: ' + r.warnings.join(' ') : ''}`);
      bump();
    } catch (e) {
      setMsg(`Pack refused: ${(e as Error).message} Nothing was imported.`);
    }
  }

  return (
    <section>
      <h2>Content</h2>
      <p class="note">
        {approved} approved traditional paraphrases, {pending.length} awaiting approval, {synth} synthesis snippets. Everything else shows as a placeholder.
      </p>
      <div class="table" style={{ gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }}>
        {srcs.map((s) => (
          <>
            <div>
              {s.title}
              <span class="muted small"> · {s.author}, {s.year}</span>
            </div>
            <div class="small">{s.status === 'loaded' ? 'text loaded' : 'not loaded'}</div>
          </>
        ))}
      </div>
      <label class="btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Import a content pack
        <input type="file" accept="application/json,.json" class="visually-hidden" onChange={(e) => {
          const f = e.currentTarget.files?.[0];
          if (f) void onPack(f);
          e.currentTarget.value = '';
        }} />
      </label>
      <div class="chips">
        {Object.keys(KEY_SETS).map((k) => (
          <button class="chip" onClick={() => shareFile(`content-template-${k}.json`, 'application/json', JSON.stringify(templatePack(KEY_SETS[k]!()), null, 1))}>
            Template: {k}
          </button>
        ))}
      </div>
      <p class="note small">Templates list every key an engine reads. Fill in text, source and locator, then import. Traditional entries arrive unapproved.</p>
      {msg && <p class="note" role="status">{msg}</p>}
      {pending.length > 0 && <h3>Awaiting your approval</h3>}
      {pending.slice(0, 30).map((sn) => (
        <div class="card">
          <div class="small muted">
            {sn.key} · {sn.lens}
            {sn.reversal_mode ? ` · ${sn.reversal_mode}` : ''} · {sn.source_id}, {sn.source_locator}
          </div>
          <p class="serif">{sn.text}</p>
          <button class="btn" onClick={() => { approveSnippet(db, sn.id, true); bump(); }}>
            Approve as a faithful paraphrase
          </button>
        </div>
      ))}
    </section>
  );
}
