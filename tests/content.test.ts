import initSqlJs from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { exportJson, parseExport, restore } from '../src/core/backup';
import { Db, SCHEMA_VERSION } from '../src/core/db';
import { approveSnippet, seedSources, sources } from '../src/content/model';
import { importPack, templatePack, validatePack } from '../src/content/pack';
import { selectLayers } from '../src/content/select';
import { DECK, allTarotKeys, majorNumber, roman, CARD_BY_ID } from '../src/content/tarot';
import { computeDraw, drawFrom, shuffle, tarotDisagreements, uniform } from '../src/engines/tarot/compute';

let SQL: Awaited<ReturnType<typeof initSqlJs>>;
beforeAll(async () => {
  SQL = await initSqlJs();
});
const fresh = () => {
  const db = Db.open(SQL, null, null);
  seedSources(db);
  return db;
};

const pack = (snippets: object[], extra: object = {}) => ({ format: 'metaphysics-content', version: 1, snippets, ...extra });
const trad = { id: 't1', key: 'tarot.major.tower.reversed', text: 'Read as a disruption that is resisted.', label: 'traditional', lens: 'general', source_id: 'waite1911', source_locator: 'Part II, XVI', authored_by: 'owner' };

describe('content selection', () => {
  it('seeding adds newly registered sources to an existing database without touching the old rows', () => {
    const db = fresh();
    db.run("UPDATE source SET notes = 'owner edit' WHERE id = 'waite1911'");
    db.run("DELETE FROM source WHERE id IN ('lilly1647', 'leo-afa', 'heindel1918')");
    seedSources(db);
    const s = sources(db);
    expect(s.map((x) => x.id)).toEqual(expect.arrayContaining(['lilly1647', 'leo-afa', 'heindel1918']));
    expect(s.find((x) => x.id === 'waite1911')!.notes).toBe('owner edit');
    expect(s.filter((x) => ['lilly1647', 'leo-afa', 'heindel1918'].includes(x.id)).every((x) => x.status === 'registered')).toBe(true);
  });

  it('a traditional natal paraphrase citing a registered astrology source is accepted', () => {
    const db = fresh();
    const r = importPack(db, pack([{ id: 'l1', key: 'natal.sun.sign.aries', text: 'Test paraphrase.', label: 'traditional', lens: 'general', source_id: 'lilly1647', source_locator: 'Book I, test', authored_by: 'owner' }]));
    expect(r.snippets).toBe(1);
  });

  it('with nothing stored, both layers are visible placeholders that still carry ids', () => {
    const l = selectLayers(fresh(), 'tarot.major.fool.upright', 'love');
    expect(l.traditional[0]!.placeholder).toBe(true);
    expect(l.traditional[0]!.snippetId).toBe('placeholder:traditional:tarot.major.fool.upright:love');
    expect(l.synthesis.text).toMatch(/^\[Placeholder/);
  });

  it('an imported traditional paraphrase shows as a hypothesis until approved', () => {
    const db = fresh();
    importPack(db, pack([trad]));
    let l = selectLayers(db, trad.key, 'general');
    expect(l.traditional[0]!.label).toBe('synthesis');
    expect(l.traditional[0]!.caption).toMatch(/Unapproved/);
    approveSnippet(db, 't1', true);
    l = selectLayers(db, trad.key, 'general');
    expect(l.traditional[0]!.label).toBe('traditional');
    expect(l.traditional[0]!.sourceId).toBe('waite1911');
  });

  it('lens falls back to general; a snippet for another reversal mode is never used', () => {
    const db = fresh();
    importPack(db, pack([{ ...trad, id: 'b', reversal_mode: 'blocked', text: 'blocked text' }, { ...trad, id: 'g', text: 'general text' }]));
    expect(selectLayers(db, trad.key, 'finance', 'blocked').traditional[0]!.snippetId).toBe('b');
    expect(selectLayers(db, trad.key, 'finance', 'opposite').traditional[0]!.snippetId).toBe('g');
  });

  it('one traditional layer per source', () => {
    const db = fresh();
    importPack(db, pack([trad, { ...trad, id: 't2', source_id: 'legge1899' }]));
    expect(selectLayers(db, trad.key, 'general').traditional.map((t) => t.sourceId).sort()).toEqual(['legge1899', 'waite1911']);
  });
});

describe('content pack validation', () => {
  const known = new Set(['waite1911']);
  it('rejects a traditional snippet without a registered source', () => {
    expect(() => validatePack(pack([{ ...trad, source_id: 'madeup' }]), known)).toThrow(/registered source/);
  });
  it('rejects a traditional snippet without a locator', () => {
    expect(() => validatePack(pack([{ ...trad, source_locator: '' }]), known)).toThrow(/locator/);
  });
  it('rejects over-long text and warns past the 60-word cap', () => {
    expect(() => validatePack(pack([{ ...trad, text: 'word '.repeat(91) }]), known)).toThrow(/limit/);
    expect(validatePack(pack([{ ...trad, text: 'word '.repeat(70) }]), known).warnings.join()).toMatch(/cap/);
  });
  it('warns on predictive "will"', () => {
    expect(validatePack(pack([{ ...trad, text: 'You will travel.' }]), known).warnings.join()).toMatch(/conditional/);
  });
  it('skips unfilled template entries instead of failing', () => {
    const t = templatePack(allTarotKeys());
    expect(t.snippets!.length).toBe(156);
    const r = validatePack(t, known);
    expect(r.pack.snippets!.length).toBe(0);
    expect(r.warnings[0]).toMatch(/156 snippet/);
  });
  it('imported approval flags are ignored', () => {
    const db = fresh();
    importPack(db, pack([{ ...trad, approved: true }]));
    expect(selectLayers(db, trad.key, 'general').traditional[0]!.label).toBe('synthesis');
  });
});

describe('interpretation splits', () => {
  it('are only written when a pack declares them', () => {
    const db = fresh();
    importPack(db, pack([trad, { ...trad, id: 't2', text: 'Read as a release that frees.' }]));
    expect(db.disagreements('kind = ?', ['interpretation']).length).toBe(0);
    importPack(db, pack([trad, { ...trad, id: 't2', text: 'Read as a release.' }], { splits: [{ key: trad.key, snippet_a: 't1', snippet_b: 't2' }] }));
    const rows = db.disagreements('kind = ?', ['interpretation']);
    expect(rows.length).toBe(1);
    expect(rows[0]!.cause).toBe('source');
  });
});

describe('schema upgrade', () => {
  it('restoring a schema-1 export re-stamps the current schema version', () => {
    const db = fresh();
    const f = JSON.parse(exportJson(db, '0.1.0'));
    f.schema_version = 1;
    f.tables.meta = f.tables.meta.map((r: { key: string; value: string }) => (r.key === 'schema_version' ? { ...r, value: '1' } : r));
    delete f.tables.source;
    delete f.counts.source;
    restore(db, parseExport(JSON.stringify(f)));
    expect(db.getMeta('schema_version')).toBe(String(SCHEMA_VERSION));
  });
});

/** Deterministic 32-bit generator (mulberry32) for statistical tests. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

describe('tarot', () => {
  it('deck has 78 unique cards: 22 majors, 56 minors, 156 snippet keys', () => {
    expect(DECK.length).toBe(78);
    expect(new Set(DECK.map((c) => c.id)).size).toBe(78);
    expect(DECK.filter((c) => c.arcana === 'major').length).toBe(22);
    expect(allTarotKeys().length).toBe(156);
    expect(CARD_BY_ID.get('minor.cups.queen')!.name).toBe('Queen of Cups');
  });

  it('Strength and Justice swap between Waite and Marseille; nothing else moves', () => {
    const moved = DECK.filter((c) => majorNumber(c, 'waite') !== majorNumber(c, 'marseille')).map((c) => c.id);
    expect(moved.sort()).toEqual(['major.justice', 'major.strength']);
    expect(roman(majorNumber(CARD_BY_ID.get('major.strength')!, 'waite'))).toBe('VIII');
  });

  it('shuffle is a permutation and replays exactly from the stored order', () => {
    const rec = computeDraw('celtic', 'q', undefined, seeded(1));
    const { order, orientation } = rec.inputs as { order: string[]; orientation: boolean[] };
    expect(new Set(order).size).toBe(78);
    expect(drawFrom('celtic', order, orientation, { reversals: true, majorNumbering: 'waite' })).toEqual(rec.raw_result);
    expect(rec.raw_result.cards.length).toBe(10);
  });

  it('with reversals off, nothing is reversed', () => {
    const rec = computeDraw('celtic', '', { reversals: false, majorNumbering: 'waite' }, seeded(2));
    expect(rec.raw_result.cards.every((c) => !c.reversed)).toBe(true);
  });

  it('first card is uniform over 78 (chi-square, fixed seed, 78,000 shuffles)', () => {
    const next = seeded(42);
    const counts = new Map<string, number>();
    const N = 78_000;
    for (let i = 0; i < N; i++) {
      const id = shuffle(next).order[0]!;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const e = N / 78;
    const chi = [...counts.values()].reduce((s, o) => s + (o - e) ** 2 / e, 0);
    expect(counts.size).toBe(78);
    expect(chi).toBeLessThan(120); // df 77; p ≈ 0.001 critical value ≈ 118.6
  });

  it('uniform() has no modulo bias at the edge', () => {
    let calls = 0;
    const words = [0xffffffff, 5];
    expect(uniform(3, () => words[calls++]!)).toBe(2); // 0xffffffff rejected for n=3, then 5 % 3
  });

  it('numbering disagreement rows appear only when Strength or Justice is drawn', () => {
    for (let s = 0; s < 50; s++) {
      const rec = computeDraw('celtic', '', undefined, seeded(s));
      const has = rec.raw_result.cards.some((c) => c.cardId === 'major.strength' || c.cardId === 'major.justice');
      expect(tarotDisagreements(rec, null).length > 0).toBe(has);
    }
  });
});
