/**
 * External reference fixtures (Eric's screenshots, 2026-10-10). Values transcribed by hand from the images;
 * each block names its source. Birth: 1974-03-24 11:15 CDT (16:15 UT), Bossier City as Astrodienst gives it: 32n31, 93w44.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { AstroConventions } from '../src/core/conventions';
import { FIXTURES } from '../src/core/fixtures';
import { localDateIn } from '../src/core/time';
import { computeBazi, type Pillar } from '../src/engines/bazi/compute';
import { annualCentre, fly } from '../src/engines/fengshui/compute';
import { PALACE_DIR } from '../src/engines/qimen/compute';
import { planetaryHours } from '../src/engines/hours/compute';
import { natalPositions } from '../src/engines/natal/compute';
import type { Ephemeris } from '../src/engines/natal/ephemeris';
import { separation } from '../src/engines/natal/zodiac';
import { qimenChart } from '../src/engines/qimen/compute';
import { nodeEphemeris } from './helpers/ephemeris';

let eph: Ephemeris;
beforeAll(async () => {
  eph = await nodeEphemeris();
});

const SIGN = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
/** "3 Ari 38'43" -> ecliptic longitude in degrees. */
const L = (s: string) => {
  const m = /^(\d+)\s*([A-Z][a-z]{2})\s*(\d+)'(?:(\d+)")?$/.exec(s.trim());
  if (!m) throw new Error(s);
  return SIGN.indexOf(m[2]!) * 30 + Number(m[1]) + Number(m[3]) / 60 + Number(m[4] ?? 0) / 3600;
};
const ARC_SEC = 1 / 3600;
const UT = Date.UTC(1974, 2, 24, 16, 15);
const ASTRO_PLACE = { lat: 32 + 31 / 60, lon: -(93 + 44 / 60) };
const TROPICAL: AstroConventions = { houseSystem: 'placidus', zodiac: 'tropical', ayanamsa: 'lahiri', nodeType: 'true', lilithType: 'interpolated' };

describe('Astrodienst natal chart, Placidus (fixture astro-natal)', () => {
  const REF: Record<string, string> = {
    sun: "3 Ari 38'43\"", moon: "13 Ari 2'19\"", mercury: "5 Pis 54'50\"", venus: "17 Aqu 41'37\"", mars: "14 Gem 19'4\"",
    jupiter: "3 Pis 43'21\"", saturn: "28 Gem 21'9\"", uranus: "26 Lib 40'47\"", neptune: "9 Sag 34'26\"", pluto: "5 Lib 31'27\"",
    chiron: "19 Ari 21'26\"", interpolatedLilith: "23 Cap 5'29\""
  };
  it('bodies within 2″', () => {
    const r = natalPositions(eph, { utcMs: UT, ...ASTRO_PLACE }, TROPICAL).result;
    for (const [id, v] of Object.entries(REF)) expect(separation(r.bodies.find((b) => b.id === id)!.longitude, L(v)) / ARC_SEC, id).toBeLessThan(2);
  });
  it('true node within 15″ and osculating Lilith within 2′ (Moshier vs Swiss files)', () => {
    const r = natalPositions(eph, { utcMs: UT, ...ASTRO_PLACE }, TROPICAL).result;
    expect(separation(r.bodies.find((b) => b.id === 'trueNode')!.longitude, L("22 Sag 45'36\"")) / ARC_SEC).toBeLessThan(15);
    expect(separation(r.bodies.find((b) => b.id === 'osculatingLilith')!.longitude, L("18 Cap 16'15\"")) / ARC_SEC).toBeLessThan(120);
  });
  it('angles and cusps within 1′ (Astrodienst prints minutes)', () => {
    const r = natalPositions(eph, { utcMs: UT, ...ASTRO_PLACE }, TROPICAL).result;
    const c = r.houses.placidus!.cusps;
    const pairs: [number, string][] = [[r.angles.asc, "18 Gem 26'"], [r.angles.mc, "29 Aqu 40'"], [c[1]!, "11 Can 14'"], [c[2]!, "3 Leo 46'"], [c[10]!, "2 Ari 8'"], [c[11]!, "10 Tau 47'"]];
    for (const [ours, ref] of pairs) expect(separation(ours, L(ref)) * 60, ref).toBeLessThan(1);
  });
});

describe('Astrodienst sidereal Fagan/Bradley, whole signs (fixture astro-sidereal)', () => {
  it('positions within 2″, node within 15″, whole-sign cusps at 0° of each sign from Taurus', () => {
    const r = natalPositions(eph, { utcMs: UT, ...ASTRO_PLACE }, { ...TROPICAL, zodiac: 'sidereal', ayanamsa: 'faganBradley', houseSystem: 'wholeSign' }).result;
    const pairs: [number, string][] = [[r.bodies[0]!.longitude, "9 Pis 15'37\""], [r.bodies[1]!.longitude, "18 Pis 39'13\""], [r.angles.asc, "24 Tau 2'52\""], [r.angles.mc, "5 Aqu 16'56\""]];
    for (const [ours, ref] of pairs) expect(separation(ours, L(ref)) / ARC_SEC, ref).toBeLessThan(2);
    expect(separation(r.bodies.find((b) => b.id === 'trueNode')!.longitude, L("28 Sco 22'30\"")) / ARC_SEC).toBeLessThan(15);
    expect(r.houses.wholeSign!.cusps).toEqual([30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 0]);
    // Astrodienst prints the mean ayanamsa (24°22′49″) but its positions use the nutation-inclusive one, as this app does.
    expect((r.ayanamsaDegrees! - (24 + 22 / 60 + 49 / 3600)) / ARC_SEC).toBeGreaterThan(10);
  });
});

describe('Astrodienst relocation to Abilene, Placidus (fixture astro-relocation)', () => {
  it('angles within 1″, cusps within 1′', () => {
    const r = natalPositions(eph, { utcMs: UT, lat: 32 + 27 / 60, lon: -(99 + 44 / 60) }, TROPICAL).result;
    expect(separation(r.angles.asc, L("12 Gem 20'53\"")) / ARC_SEC).toBeLessThan(1);
    expect(separation(r.angles.mc, L("23 Aqu 26'32\"")) / ARC_SEC).toBeLessThan(1);
    const c = r.houses.placidus!.cusps;
    for (const [ours, ref] of [[c[1]!, "5 Can 51'"], [c[2]!, "28 Can 15'"], [c[10]!, "24 Pis 56'"], [c[11]!, "3 Tau 29'"]] as [number, string][]) {
      expect(separation(ours, L(ref)) * 60, ref).toBeLessThan(1);
    }
  });
});

describe('Astrodienst draconic (fixture astro-draconic)', () => {
  it('draconic = tropical minus true node: Sun 10 Can 53′06″, Moon 20 Can 16′43″', () => {
    const r = natalPositions(eph, { utcMs: UT, ...ASTRO_PLACE }, TROPICAL).result;
    const node = r.bodies.find((b) => b.id === 'trueNode')!.longitude;
    expect(separation(r.bodies[0]!.longitude - node, L("10 Can 53'6\"")) / ARC_SEC).toBeLessThan(15);
    expect(separation(r.bodies[1]!.longitude - node, L("20 Can 16'43\"")) / ARC_SEC).toBeLessThan(15);
  });
});

const gz = (p: Pillar) => '甲乙丙丁戊己庚辛壬癸'[p.stem]! + '子丑寅卯辰巳午未申酉戌亥'[p.branch]!;

describe("Eric's BaZi app (fixture bazi-app)", () => {
  it('true solar time 09:53 and pillars 己巳 甲子 丁卯 甲寅 (hour, day, month, year)', () => {
    const r = computeBazi(eph, { utcMs: UT, zone: 'America/Chicago', ...ASTRO_PLACE, sex: 'male' }, { ziHour: 'early', trueSolarTime: true }).raw_result.chosen;
    expect(r.timeUsed.slice(11)).toBe('09:53');
    expect([r.hour, r.day, r.month, r.year].map(gz)).toEqual(['己巳', '甲子', '丁卯', '甲寅']);
  });
});

describe('Planetary hours app, Abilene, Saturday 10 Oct 2026 (fixture planetary-hours)', () => {
  it('Saturn day; Mars 9:34, Sun 10:32, Venus 11:30–12:27 CDT within 2 minutes', () => {
    const wd = (ms: number) => {
      const l = localDateIn('America/Chicago', ms);
      return new Date(Date.UTC(l.year, l.month - 1, l.day)).getUTCDay();
    };
    const h = planetaryHours(Date.UTC(2026, 9, 10, 15, 58), 32.4487, -99.7331, wd);
    expect(h.planetaryDay.sunrise).toBe('Saturn');
    const cdt = (hh: number, mm: number) => Date.UTC(2026, 9, 10, hh + 5, mm);
    const ref: [string, number, number][] = [['Mars', cdt(9, 34), cdt(10, 32)], ['Sun', cdt(10, 32), cdt(11, 30)], ['Venus', cdt(11, 30), cdt(12, 27)]];
    for (const [ruler, s, e] of ref) {
      const ours = h.hours.find((x) => x.ruler === ruler && x.index <= 12)!;
      expect(Math.abs(ours.startMs - s), ruler).toBeLessThan(120_000);
      expect(Math.abs(ours.endMs - e), ruler).toBeLessThan(120_000);
    }
    expect(Math.abs(h.sunrise - cdt(7, 38))).toBeLessThan(120_000);
    expect(Math.abs(h.sunset - cdt(19, 12))).toBeLessThan(120_000);
  });
});

describe('Qi Men Dun Jia Pro (kymon.net), 10 Oct 2026 12:24 CDT (fixture qimen-kymon)', () => {
  // English names as the app prints them.
  const DOOR: Record<string, string> = { Rest: '休门', Life: '生门', Harm: '伤门', Delusion: '杜门', Scenery: '景门', Death: '死门', Fear: '惊门', Open: '开门' };
  const DEITY: Record<string, string> = { Chief: '值符', Snake: '螣蛇', Moon: '太阴', Harmony: '六合', Tiger: '白虎', Tortoise: '玄武', Earth: '九地', Heaven: '九天' };
  const P: Record<number, { heaven: string; earth: string; door: string; deity: string; year: number }> = {
    4: { heaven: '癸', earth: '癸', door: 'Fear', deity: 'Moon', year: 9 },
    9: { heaven: '戊', earth: '戊', door: 'Open', deity: 'Snake', year: 5 },
    2: { heaven: '丙壬', earth: '丙', door: 'Rest', deity: 'Chief', year: 7 },
    3: { heaven: '丁', earth: '丁', door: 'Death', deity: 'Harmony', year: 8 },
    7: { heaven: '庚', earth: '庚', door: 'Life', deity: 'Heaven', year: 3 },
    8: { heaven: '己', earth: '己', door: 'Scenery', deity: 'Tiger', year: 4 },
    1: { heaven: '乙', earth: '乙', door: 'Delusion', deity: 'Tortoise', year: 6 },
    6: { heaven: '辛', earth: '辛', door: 'Harm', deity: 'Earth', year: 2 }
  };
  it('pillars 丙午 丁巳 戊戌 丙午 (hour, day, month, year), Yin dun Ju 9, every palace, annual stars', () => {
    const q = qimenChart(eph, { utcMs: Date.UTC(2026, 9, 10, 17, 24), zone: 'America/Chicago', lat: 32.4487, lon: -99.7331 });
    expect([gz(q.hourPillar), gz(q.dayPillar)]).toEqual(['丙午', '丁巳']);
    expect([q.dun, q.ju]).toEqual(['yin', 9]);
    expect(q.palaces.find((p) => p.number === 5)!.earthStem).toBe('壬');
    const annual = fly(annualCentre(2026), true);
    expect(annual.C).toBe(1);
    for (const [n, ref] of Object.entries(P)) {
      const p = q.palaces.find((x) => x.number === Number(n))!;
      expect(p.heavenStems.join(''), `palace ${n}`).toBe(ref.heaven);
      expect(p.earthStem, `palace ${n}`).toBe(ref.earth);
      expect(p.door, `palace ${n}`).toBe(DOOR[ref.door]);
      expect(p.deity, `palace ${n}`).toBe(DEITY[ref.deity]);
      expect(annual[PALACE_DIR[p.number] as 'N'], `palace ${n} annual`).toBe(ref.year);
    }
  });
  it('the competing elapsed-time yuan would give Ju 6 here, so Kymon uses the fu-head rule this app shows', () => {
    const alt = qimenChart(eph, { utcMs: Date.UTC(2026, 9, 10, 17, 24), zone: 'America/Chicago', lat: 32.4487, lon: -99.7331 }, 'elapsed');
    expect(alt.ju).toBe(6);
  });
});

describe('fixture registry', () => {
  it('lists every fixture tested here', () => {
    expect(FIXTURES.map((f) => f.id)).toEqual(['astro-natal', 'astro-sidereal', 'astro-relocation', 'astro-draconic', 'bazi-app', 'planetary-hours', 'qimen-kymon']);
  });
});
