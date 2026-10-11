import initSqlJs from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { compose, readingMarkdown, storeReading, type EngineView } from '../src/composer/compose';
import { natalView } from '../src/composer/views';
import { DEFAULT_ASTRO } from '../src/core/conventions';
import { Db } from '../src/core/db';
import { approveSnippet, seedSources } from '../src/content/model';
import { importPack, WORD_CAP } from '../src/content/pack';
import { computeNatal, natalDisagreements } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { nodeEphemeris } from './helpers/ephemeris';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
let eph: Ephemeris;
beforeAll(async () => {
  SQL = await initSqlJs();
  eph = await nodeEphemeris();
});
const fresh = () => {
  const db = Db.open(SQL, null, null);
  seedSources(db);
  return db;
};
const KEY = 'tarot.major.tower.upright';
const view: EngineView = { engine: 'tarot', title: 'Test', recordIds: ['rec1'], facts: [{ id: 'fact:t', text: 'The Tower, upright.' }], keys: [{ key: KEY, title: 'Tower' }] };
const snip = (id: string, source: string, themes: string[]) => ({ id, key: KEY, text: `Text from ${source}.`, label: 'traditional', lens: 'general', source_id: source, source_locator: 'p. 1', authored_by: 'owner', themes });
const pack = (snippets: object[], extra: object = {}) => ({ format: 'metaphysics-content', version: 1, snippets, ...extra });

describe('composer status: never manufactures consensus', () => {
  it('insufficient when nothing approved', () => {
    const r = compose(fresh(), view, 'general');
    expect(r.status).toBe('insufficient');
    expect(r.layers.map((l) => l.kind)).toEqual(['facts', 'traditional', 'synthesis', 'splits', 'move']);
    expect(r.layers[1]!.items[0]!.placeholder).toBe(true);
  });

  it('two unapproved sources sharing a theme are still insufficient', () => {
    const db = fresh();
    importPack(db, pack([snip('a', 'waite1911', ['upheaval']), snip('b', 'legge1899', ['upheaval'])]));
    expect(compose(db, view, 'general').status).toBe('insufficient');
  });

  it('one approved source is single-source', () => {
    const db = fresh();
    importPack(db, pack([snip('a', 'waite1911', ['upheaval'])]));
    approveSnippet(db, 'a', true);
    const r = compose(db, view, 'general');
    expect(r.status).toBe('single-source');
    expect(r.statusNote).toMatch(/One approved source/);
  });

  it('two approved sources with a shared declared theme agree', () => {
    const db = fresh();
    importPack(db, pack([snip('a', 'waite1911', ['upheaval', 'release']), snip('b', 'legge1899', ['upheaval'])]));
    approveSnippet(db, 'a', true);
    approveSnippet(db, 'b', true);
    const r = compose(db, view, 'general');
    expect(r.status).toBe('agreement');
    expect(r.sharedThemes).toEqual(['upheaval']);
  });

  it('two approved sources without a shared declared theme are not agreement', () => {
    const db = fresh();
    importPack(db, pack([snip('a', 'waite1911', ['upheaval']), snip('b', 'legge1899', [])]));
    approveSnippet(db, 'a', true);
    approveSnippet(db, 'b', true);
    const r = compose(db, view, 'general');
    expect(r.status).toBe('single-source');
    expect(r.statusNote).toMatch(/Not counted as agreement/);
  });

  it('a declared split wins over shared themes, and both readings are shown', () => {
    const db = fresh();
    importPack(db, pack([snip('a', 'waite1911', ['upheaval']), snip('b', 'legge1899', ['upheaval'])], { splits: [{ key: KEY, snippet_a: 'a', snippet_b: 'b' }] }));
    approveSnippet(db, 'a', true);
    approveSnippet(db, 'b', true);
    const r = compose(db, view, 'general');
    expect(r.status).toBe('disagreement');
    expect(r.layers[1]!.items.length).toBe(2);
    expect(r.layers[3]!.items[0]!.label).toBe('disagreement');
  });
});

describe('composer layers', () => {
  it('every item carries a trace id; facts are calculated, move is synthesis', () => {
    const db = fresh();
    const rec = computeNatal(eph, { utcMs: Date.UTC(1974, 2, 24, 16, 15), lat: 32.516, lon: -93.7321 }, DEFAULT_ASTRO);
    db.saveRecord(rec, null);
    for (const d of natalDisagreements(rec, null)) db.saveDisagreement(d);
    const r = compose(db, natalView(rec, true), 'general');
    for (const l of r.layers) for (const i of l.items) expect(i.traceId.length).toBeGreaterThan(3);
    expect(r.layers[0]!.items.every((i) => i.label === 'calculated' && i.traceId.endsWith(`@${rec.id}`))).toBe(true);
    expect(r.layers[0]!.words).toBeLessThanOrEqual(WORD_CAP);
    expect(r.layers[4]!.items[0]!.label).toBe('synthesis');
    // House-system splits for this record appear in layer 4.
    expect(r.layers[3]!.items.some((i) => i.caption.startsWith('Mars house'))).toBe(true);
    expect(r.layers[1]!.items.map((i) => i.caption.split(':')[0])).toEqual(['Sun in Aries', 'Moon in Aries']);
  });

  it('with no splits, layer 4 says so plainly', () => {
    const r = compose(fresh(), view, 'general');
    expect(r.layers[3]!.items[0]!.text).toBe('No split is recorded for these inputs.');
  });

  it('markdown keeps labels and trace ids', () => {
    const db = fresh();
    const s = storeReading(db, compose(db, view, 'general'), 'event', { id: 'rec1', fingerprint: 'f1' }, null);
    const md = readingMarkdown(s);
    expect(md).toMatch(/## Where it splits/);
    expect(md).toMatch(/<!-- fact:t@rec1 -->/);
  });
});

describe('master reading versioning', () => {
  it('reuses when nothing changed; new version when content or record changes', () => {
    const db = fresh();
    const rec = { id: 'r1', fingerprint: 'fp1' };
    const v1 = storeReading(db, compose(db, view, 'general'), 'master', rec, 'p1');
    const again = storeReading(db, compose(db, view, 'general'), 'master', rec, 'p1');
    expect(again.version).toBe(1);
    expect(again.id).toBe(v1.id);
    importPack(db, pack([snip('a', 'waite1911', [])]));
    approveSnippet(db, 'a', true);
    expect(storeReading(db, compose(db, view, 'general'), 'master', rec, 'p1').version).toBe(2);
    expect(storeReading(db, compose(db, view, 'general'), 'master', { id: 'r2', fingerprint: 'fp2' }, 'p1').version).toBe(3);
  });
});

describe('migration', () => {
  it('adds the themes column to a database created before it existed', () => {
    const old = new SQL.Database();
    old.exec(`CREATE TABLE snippet (id TEXT PRIMARY KEY, key TEXT NOT NULL, tradition TEXT, text TEXT NOT NULL, source_id TEXT, source_locator TEXT,
      label TEXT NOT NULL, lens TEXT NOT NULL DEFAULT 'general', reversal_mode TEXT, version INTEGER NOT NULL DEFAULT 1, authored_by TEXT NOT NULL,
      placeholder INTEGER NOT NULL DEFAULT 0, approved INTEGER NOT NULL DEFAULT 0);
      INSERT INTO snippet (id, key, text, label, authored_by) VALUES ('s', 'k.x', 't', 'synthesis', 'E');`);
    const db = Db.open(SQL, old.export(), null);
    expect(db.all('SELECT themes FROM snippet')[0]!.themes).toBe('[]');
  });
});

import { newEntryId, parseTags, saveEntry } from '../src/core/journal';
import { saveOutcome, summarize, tagPatterns } from '../src/core/outcomes';

describe('journal and outcomes', () => {
  it('tags are parsed from what the user typed and nothing else', () => {
    expect(parseTags('#Focus, sleep  #focus work!')).toEqual(['focus', 'sleep']);
  });
  it('tag patterns count and average only user entries', () => {
    const db = fresh();
    const now = new Date('2026-10-10T12:00:00Z');
    saveEntry(db, { id: newEntryId(now), created_at: now.toISOString(), text: 'a', mood: 4, energy: 2, tags: ['sleep'], links: [] });
    saveEntry(db, { id: newEntryId(now) + 'b', created_at: now.toISOString(), text: 'b', mood: 2, energy: null, tags: ['sleep', 'work'], links: [] });
    expect(tagPatterns(db, '2026-01-01')).toEqual([
      { tag: 'sleep', n: 2, mood: 3, energy: 2 },
      { tag: 'work', n: 1, mood: 2, energy: null }
    ]);
  });
  it('outcome summary refuses a rate under five judged outcomes', () => {
    const db = fresh();
    const rec = computeNatal(eph, { utcMs: Date.UTC(2000, 0, 1), lat: 0, lon: 0 }, DEFAULT_ASTRO);
    db.saveRecord({ ...rec, engine: 'tarot' }, null);
    for (let i = 0; i < 4; i++) saveOutcome(db, { id: `o${i}`, entry_id: null, target_kind: 'record', target_id: rec.id, created_at: '2026-10-10', text: '', fit: 'fit' });
    expect(summarize(db)[0]!.fitShare).toBeNull();
    saveOutcome(db, { id: 'o9', entry_id: null, target_kind: 'record', target_id: rec.id, created_at: '2026-10-10', text: '', fit: 'no' });
    expect(summarize(db)[0]!.fitShare).toBe(0.8);
  });
});
