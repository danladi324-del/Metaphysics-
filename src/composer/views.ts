import type { HouseSystem } from '../core/conventions';
import { HOUSE_SYSTEM_LABEL } from '../core/conventions';
import type { CalcRecord } from '../core/record';
import { snippetKey, CARD_BY_ID } from '../content/tarot';
import type { BaziResult } from '../engines/bazi/compute';
import { pillarName } from '../engines/bazi/compute';
import type { BiorhythmResult } from '../engines/biorhythm/compute';
import type { HoursResult } from '../engines/hours/compute';
import type { CastResult } from '../engines/iching/compute';
import type { MoonResult } from '../engines/moon/compute';
import { BODY_LABEL, type NatalResult } from '../engines/natal/compute';
import { formatLongitude } from '../engines/natal/zodiac';
import type { NumerologyResult } from '../engines/numerology/compute';
import type { TarotResult } from '../engines/tarot/compute';
import type { TzolkinResult } from '../engines/tzolkin/compute';
import type { VedicResult } from '../engines/vedic/compute';
import type { GeomancyResult } from '../engines/geomancy/compute';
import type { QimenResult } from '../engines/qimen/compute';
import type { EngineView } from './compose';

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

export function natalView(rec: CalcRecord<NatalResult>, timeKnown: boolean): EngineView {
  const r = rec.raw_result;
  const sys = (rec.conventions as { houseSystem: HouseSystem }).houseSystem;
  const b = (id: string) => r.bodies.find((x) => x.id === id)!;
  const pos = (id: string) => `${BODY_LABEL[id as 'sun']} ${formatLongitude(b(id).longitude)}${timeKnown ? `, house ${b(id).houses[sys]}` : ''}.`;
  const facts = [
    { id: 'fact:natal.sun', text: pos('sun') },
    { id: 'fact:natal.moon', text: pos('moon') },
    ...(timeKnown ? [{ id: 'fact:natal.asc', text: `Ascendant ${formatLongitude(r.angles.asc)} (${HOUSE_SYSTEM_LABEL[sys]} houses).` }] : []),
    { id: 'fact:natal.tightest-aspect', text: r.aspects[0] ? `Tightest aspect: ${BODY_LABEL[r.aspects[0].a as 'sun'] ?? r.aspects[0].a} ${r.aspects[0].type} ${BODY_LABEL[r.aspects[0].b as 'sun'] ?? r.aspects[0].b}, orb ${r.aspects[0].orb.toFixed(2)}°.` : 'No aspects within orb.' }
  ];
  return {
    engine: 'natal',
    title: 'Natal: Sun and Moon',
    recordIds: [rec.id],
    facts,
    keys: [
      { key: `natal.sun.sign.${b('sun').sign.toLowerCase()}`, title: `Sun in ${b('sun').sign}` },
      { key: `natal.moon.sign.${b('moon').sign.toLowerCase()}`, title: `Moon in ${b('moon').sign}` }
    ]
  };
}

export function numerologyMasterView(rec: CalcRecord<NumerologyResult>): EngineView {
  const r = rec.raw_result;
  const lp = r.date.lifePathByComponent.value;
  return {
    engine: 'numerology',
    title: `Numerology: Life Path ${lp}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:numerology.lifePath', text: `Life Path ${lp} (date ${r.date.year}-${r.date.month}-${r.date.day}).` },
      { id: 'fact:numerology.expression', text: `Expression ${r.pythagorean.expression.byNamePart.value} Pythagorean, ${r.chaldean.expression.byNamePart.value} Chaldean, for "${r.name}".` },
      { id: 'fact:numerology.soulUrge', text: `Soul Urge ${r.pythagorean.soulUrge.byNamePart.value} Pythagorean, ${r.chaldean.soulUrge.byNamePart.value} Chaldean.` }
    ],
    keys: [{ key: `numerology.lifePath.${lp}`, title: `Life Path ${lp}` }]
  };
}

export function numerologyDailyView(recId: string, personalDay: number, personalYear: number): EngineView {
  return {
    engine: 'numerology',
    title: `Numerology: personal day ${personalDay}`,
    recordIds: [recId],
    facts: [{ id: 'fact:numerology.personalDay', text: `Personal day ${personalDay}, in personal year ${personalYear}.` }],
    keys: [{ key: `numerology.personalDay.${personalDay}`, title: `Personal day ${personalDay}` }]
  };
}

export function biorhythmView(rec: CalcRecord<BiorhythmResult>): EngineView {
  const v = rec.raw_result.values;
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const state = (x: number) => (Math.abs(x) < 0.1 ? 'crossing' : x > 0 ? 'high' : 'low');
  return {
    engine: 'biorhythm',
    title: 'Biorhythm',
    recordIds: [rec.id],
    facts: [
      { id: 'fact:biorhythm.values', text: `Physical ${pct(v.physical)}, emotional ${pct(v.emotional)}, intellectual ${pct(v.intellectual)}.` },
      { id: 'fact:biorhythm.validity', text: 'Conventional cycles; not validated by controlled studies.' }
    ],
    keys: [{ key: `biorhythm.physical.${state(v.physical)}`, title: 'Physical cycle' }]
  };
}

export function moonView(rec: CalcRecord<MoonResult>): EngineView {
  const r = rec.raw_result;
  return {
    engine: 'moon',
    title: `Moon: ${r.phase} in ${r.moonSign}`,
    recordIds: [rec.id],
    facts: [{ id: 'fact:moon.phase', text: `${r.phase} in ${r.moonSign}, ${Math.round(r.illumination * 100)}% lit at local noon.` }],
    keys: [
      { key: `moon.phase.${slug(r.phase)}`, title: r.phase },
      { key: `moon.sign.${r.moonSign.toLowerCase()}`, title: `Moon in ${r.moonSign}` }
    ]
  };
}

export function hoursView(rec: CalcRecord<HoursResult>, nowMs: number): EngineView {
  const r = rec.raw_result;
  const cur = r.hours.find((h) => nowMs >= h.startMs && nowMs < h.endMs);
  return {
    engine: 'planetaryHours',
    title: `Day of ${r.planetaryDay.sunrise}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:hours.day', text: `Planetary day of ${r.planetaryDay.sunrise}${r.planetaryDay.midnight !== r.planetaryDay.sunrise ? ` (from midnight: ${r.planetaryDay.midnight})` : ''}.` },
      ...(cur ? [{ id: 'fact:hours.current', text: `Hour ${cur.index} of ${cur.ruler}.` }] : [])
    ],
    keys: [{ key: `hours.day.${slug(r.planetaryDay.sunrise)}`, title: `Day of ${r.planetaryDay.sunrise}` }]
  };
}

export function baziView(rec: CalcRecord<BaziResult>): EngineView {
  const c = rec.raw_result.chosen;
  return {
    engine: 'bazi',
    title: `BaZi: day master ${pillarName(c.day).split(' ')[1]!.split('-')[0]}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:bazi.pillars', text: `Pillars (year, month, day, hour): ${[c.year, c.month, c.day, c.hour].map((p) => pillarName(p).split(' ')[0]).join(' ')}.` },
      { id: 'fact:bazi.elements', text: `Elements: ${Object.entries(c.elements).map(([k, v]) => `${k} ${v}`).join(', ')}.` }
    ],
    keys: [{ key: `bazi.dayMaster.${c.day.stem}`, title: 'Day master' }]
  };
}

export function tzolkinView(rec: CalcRecord<TzolkinResult>): EngineView {
  const c = rec.raw_result.chosen;
  return {
    engine: 'tzolkin',
    title: `Tzolk'in: ${c.tzolkin.number} ${c.tzolkin.name}`,
    recordIds: [rec.id],
    facts: [{ id: 'fact:tzolkin.day', text: `${c.tzolkin.number} ${c.tzolkin.name}, Haab ${c.haab.day} ${c.haab.month}, correlation ${c.correlation}.` }],
    keys: [{ key: `tzolkin.daySign.${c.tzolkin.name.toLowerCase()}`, title: c.tzolkin.name }]
  };
}

export function vedicView(rec: CalcRecord<VedicResult>): EngineView {
  const r = rec.raw_result;
  return {
    engine: 'vedic',
    title: `Vedic: Moon in ${r.moonNakshatra.name}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:vedic.moon', text: `Moon in ${r.moonNakshatra.name} pada ${r.moonNakshatra.pada}, Lahiri ayanamsa ${r.ayanamsa.toFixed(2)}°.` },
      ...(r.ascendant ? [{ id: 'fact:vedic.asc', text: `Sidereal ascendant ${formatLongitude(r.ascendant.longitude)}.` }] : [])
    ],
    keys: [{ key: `vedic.nakshatra.${slug(r.moonNakshatra.name)}`, title: r.moonNakshatra.name }]
  };
}

export function ichingView(rec: CalcRecord<CastResult>): EngineView {
  const r = rec.raw_result;
  return {
    engine: 'iching',
    title: `I Ching: ${r.primary.number} ${r.primary.name}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:iching.cast', text: `Hexagram ${r.primary.number} ${r.primary.name}${r.changing.length ? `, lines ${r.changing.join(', ')} changing, relating ${r.relating!.number} ${r.relating!.name}` : ', no changing lines'}.` }
    ],
    keys: [
      { key: `iching.hexagram.${r.primary.number}`, title: `Hexagram ${r.primary.number}` },
      ...r.changing.map((n) => ({ key: `iching.hexagram.${r.primary.number}.line.${n}`, title: `Line ${n}` }))
    ]
  };
}

export function tarotView(rec: CalcRecord<TarotResult>, reversalMode: string | null): EngineView {
  const cards = rec.raw_result.cards.map((c) => ({ ...c, card: CARD_BY_ID.get(c.cardId)! }));
  return {
    engine: 'tarot',
    title: `Tarot: ${cards.map((c) => c.card.name).join(', ')}`,
    recordIds: [rec.id],
    facts: cards.map((c, i) => ({ id: `fact:tarot.card.${i}`, text: `${c.position}: ${c.card.name}${c.reversed ? ', reversed' : ''}.` })),
    keys: cards.map((c) => ({ key: snippetKey(c.card, c.reversed), title: `${c.position}: ${c.card.name}`, reversalMode: c.reversed ? reversalMode : null }))
  };
}

export function geomancyView(rec: CalcRecord<GeomancyResult>): EngineView {
  const r = rec.raw_result;
  const f = (p: string) => r.figures.find((x) => x.position === p)!.name;
  return {
    engine: 'geomancy',
    title: `Geomancy: Judge ${r.judge}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:geomancy.court', text: `Judge ${r.judge}; right witness ${f('Right Witness')}, left witness ${f('Left Witness')}; reconciler ${f('Reconciler')}.` },
      { id: 'fact:geomancy.mothers', text: `Mothers: ${[1, 2, 3, 4].map((n) => f(`Mother ${n}`)).join(', ')}.` }
    ],
    keys: [
      { key: `geomancy.figure.${slug(r.judge)}`, title: `Judge: ${r.judge}` },
      { key: `geomancy.figure.${slug(f('Right Witness'))}`, title: `Right witness: ${f('Right Witness')}` },
      { key: `geomancy.figure.${slug(f('Left Witness'))}`, title: `Left witness: ${f('Left Witness')}` }
    ]
  };
}

const QM_PINYIN: Record<string, string> = {
  天蓬: 'tianpeng', 天芮: 'tianrui', 天冲: 'tianchong', 天辅: 'tianfu', 天禽: 'tianqin', 天心: 'tianxin', 天柱: 'tianzhu', 天任: 'tianren', 天英: 'tianying',
  休门: 'xiu', 死门: 'si', 伤门: 'shang', 杜门: 'du', 开门: 'kai', 惊门: 'jing', 生门: 'sheng', 景门: 'jingscene'
};

export function qimenView(rec: CalcRecord<QimenResult>): EngineView {
  const c = rec.raw_result.chosen;
  return {
    engine: 'qimen',
    title: `Qi Men: ${c.dun === 'yang' ? 'Yang' : 'Yin'} ${c.ju}, ${c.term}`,
    recordIds: [rec.id],
    facts: [
      { id: 'fact:qimen.ju', text: `${c.dun === 'yang' ? 'Yang' : 'Yin'} dun Ju ${c.ju}, ${c.term} ${c.yuan} yuan (Chai Bu).` },
      { id: 'fact:qimen.leaders', text: `Leader star ${c.leader.star} in palace ${c.leader.starPalace}; leader door ${c.leader.door} in palace ${c.leader.doorPalace}.` }
    ],
    keys: [
      { key: `qimen.star.${QM_PINYIN[c.leader.star] ?? 'unknown'}`, title: `Leader star ${c.leader.star}` },
      { key: `qimen.door.${QM_PINYIN[c.leader.door] ?? 'unknown'}`, title: `Leader door ${c.leader.door}` }
    ]
  };
}
