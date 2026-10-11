import { describe, expect, it } from 'vitest';
import { CHALDEAN, DEFAULT_NUMEROLOGY, PYTHAGOREAN, computeNumerology, isVowel, normalizeName, numerology, numerologyDisagreements, personalCycles, reduce } from '../src/engines/numerology/compute';

/*
 Hand-worked with a fictitious name: ELI KANE, 1974-03-24 (the reference date R1).
 Pythagorean: E5 L3 I9 = 17 -> 8; K2 A1 N5 E5 = 13 -> 4 (karmic 13 inside KANE). Expression by part 8 + 4 = 12 -> 3; all letters 30 -> 3.
   Vowels: E5 I9 = 14 -> 5 (karmic 14 inside ELI); A1 E5 = 6. By part 5 + 6 = 11 (master). All vowels 20 -> 2.
   Consonants: L3 = 3; K2 N5 = 7. By part 10 -> 1; all 10 -> 1.
 Chaldean: E5 L3 I1 = 9; K2 A1 N5 E5 = 13 -> 4. By part 13 -> 4 (karmic 13 in the total); all letters 22 (master).
   Vowels: E5 I1 = 6; A1 E5 = 6 -> 12 -> 3 both ways. Consonants: L3; K2 N5 = 7 -> 10 -> 1 both ways.
 Date: 3 + (24 -> 6) + (1974 -> 21 -> 3) = 12 -> 3. All digits 3+2+4+1+9+7+4 = 30 -> 3. Birthday 24 -> 6.
 Maturity (Pythagorean): 3 + 3 = 6.
 Pinnacles: 3+6=9, 6+3=9, 9+9=18->9, 3+3=6. Challenges |3-6|=3, |6-3|=3, |3-3|=0, |3-3|=0. First break 36-3 = 33.
 Personal year 2026: 3 + 6 + (2026 -> 10 -> 1) = 10 -> 1. October: 1 + 1 = 2. 10 Oct: 2 + 1 = 3.
*/
describe('numerology: Eli Kane (fictitious), 1974-03-24', () => {
  const r = numerology({ name: 'Eli Kane', year: 1974, month: 3, day: 24 });

  it('date numbers', () => {
    expect(r.date.lifePathByComponent).toEqual({ compound: 12, value: 3, karmicDebt: null });
    expect(r.date.lifePathAllDigits.value).toBe(3);
    expect(r.date.lifePathAllDigits.compound).toBe(30);
    expect(r.date.birthday.value).toBe(6);
    expect(r.date.pinnacles).toEqual([
      { from: 0, to: 33, pinnacle: 9, challenge: 3 },
      { from: 33, to: 42, pinnacle: 9, challenge: 3 },
      { from: 42, to: 51, pinnacle: 9, challenge: 0 },
      { from: 51, to: null, pinnacle: 6, challenge: 0 }
    ]);
  });

  it('Pythagorean name numbers', () => {
    const p = r.pythagorean;
    expect([p.expression.byNamePart.compound, p.expression.byNamePart.value]).toEqual([12, 3]);
    expect([p.expression.allLetters.compound, p.expression.allLetters.value]).toEqual([30, 3]);
    expect(p.expression.partKarmicDebt).toEqual([{ part: 'KANE', number: 13 }]);
    expect(p.soulUrge.byNamePart.value).toBe(11);
    expect(p.soulUrge.allLetters.value).toBe(2);
    expect(p.soulUrge.partKarmicDebt).toEqual([{ part: 'ELI', number: 14 }]);
    expect([p.personality.byNamePart.value, p.personality.allLetters.value]).toEqual([1, 1]);
  });

  it('Chaldean name numbers', () => {
    const c = r.chaldean;
    expect([c.expression.byNamePart.compound, c.expression.byNamePart.value]).toEqual([13, 4]);
    expect(c.expression.byNamePart.karmicDebt).toBe(13);
    expect(c.expression.allLetters.value).toBe(22);
    expect([c.soulUrge.byNamePart.value, c.soulUrge.allLetters.value]).toEqual([3, 3]);
    expect([c.personality.byNamePart.value, c.personality.allLetters.value]).toEqual([1, 1]);
  });

  it('letter counts and missing numbers (Pythagorean)', () => {
    // E5 L3 I9 K2 A1 N5 E5
    expect(r.pythagorean.letterCounts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 0, 5: 3, 6: 0, 7: 0, 8: 0, 9: 1 });
    expect(r.pythagorean.missing).toEqual([4, 6, 7, 8]);
  });

  it('maturity and karmic debt', () => {
    expect(r.maturity.pythagorean.value).toBe(6);
    expect(r.karmicDebt).toEqual([{ where: 'Chaldean Expression', number: 13 }]);
    expect(r.karmicDebtInParts).toContainEqual({ where: 'Pythagorean Soul Urge, name part ELI', number: 14 });
    expect(r.karmicDebtInParts).toContainEqual({ where: 'Pythagorean Expression, name part KANE', number: 13 });
  });

  it('personal cycles for 10 Oct 2026', () => {
    expect(personalCycles(3, 24, 2026, 10, 10)).toEqual({ personalYear: 1, personalMonth: 2, personalDay: 3 });
  });

  it('logs disagreements: Soul Urge and Chaldean Expression method splits, letter-table splits', () => {
    const rec = computeNumerology({ name: 'Eli Kane', year: 1974, month: 3, day: 24 }, DEFAULT_NUMEROLOGY, new Date('2026-10-10T00:00:00Z'));
    const subjects = numerologyDisagreements(rec, null).map((d) => d.subject);
    expect(subjects).toContain('Soul Urge (pythagorean)');
    expect(subjects).toContain('Expression (chaldean)');
    expect(subjects).toContain('Expression');
    expect(subjects).toContain('Soul Urge');
    expect(subjects).not.toContain('Life Path');
    expect(subjects).not.toContain('Personality');
  });
});

describe('numerology: boundaries', () => {
  it('master number dates: 1987-11-29 -> 11 + 11 + 7 = 29 -> 11', () => {
    const r = numerology({ name: 'A', year: 1987, month: 11, day: 29 });
    expect(r.date.lifePathByComponent.value).toBe(11);
    expect(r.date.lifePathAllDigits.value).toBe(11); // 1+1+2+9+1+9+8+7 = 38 -> 11
  });

  it('master numbers reduced when the convention says so', () => {
    const r = numerology({ name: 'A', year: 1987, month: 11, day: 29 }, { ...DEFAULT_NUMEROLOGY, masterNumbers: 'reduce' });
    expect(r.date.lifePathByComponent.value).toBe(2); // 2 + 2 + 7 = 11 -> 2
  });

  it('karmic debt on a 13th birthday', () => {
    const r = numerology({ name: 'A', year: 1990, month: 1, day: 13 });
    expect(r.karmicDebt).toContainEqual({ where: 'Birthday', number: 13 });
    expect(r.date.lifePathByComponent.value).toBe(6); // 1 + 4 + (19 -> 10 -> 1) = 6
  });

  it('karmic debt through an intermediate: 19 -> 10 -> 1', () => {
    expect(reduce(19, true)).toEqual({ compound: 19, value: 1, karmicDebt: 19 });
  });

  it('leap-day birth computes', () => {
    expect(numerology({ name: 'A', year: 2000, month: 2, day: 29 }).date.lifePathByComponent.value).toBe(6); // 2 + 11 + 2 = 15 -> 6
  });

  it('accents are stripped, punctuation ignored', () => {
    expect(normalizeName("José O'Neil-Smith")).toEqual(['JOSE', 'O', 'NEIL', 'SMITH']);
  });

  it('Y rule: vowel in LYNN, consonant in YES and in MAYA', () => {
    const r = 'vowelIfNoAdjacentVowel';
    expect(isVowel('LYNN', 1, r)).toBe(true);
    expect(isVowel('YES', 0, r)).toBe(false);
    expect(isVowel('MAYA', 2, r)).toBe(false);
  });

  it('rejects a name with no letters', () => {
    expect(() => numerology({ name: '123', year: 2000, month: 1, day: 1 })).toThrow();
  });

  it('letter tables: Pythagorean cycles 1-9, Chaldean never uses 9', () => {
    expect(PYTHAGOREAN.J).toBe(1);
    expect(PYTHAGOREAN.Z).toBe(8);
    expect(Object.values(CHALDEAN).includes(9)).toBe(false);
    expect(Object.keys(CHALDEAN).length).toBe(26);
  });
});

/*
 Hand-worked with a fictitious three-part example: ADA LOVELACE, 1974-03-24.
 Pythagorean: ADA A1 D4 A1 = 6; LOVELACE L3 O6 V4 E5 L3 A1 C3 E5 = 30 -> 3. Expression by part 9; all letters 36 -> 9.
   Vowels: ADA 2; LOVELACE O6 E5 A1 E5 = 17 -> 8. By part 10 -> 1; all vowels 19 -> 10 -> 1 (karmic 19 in that total).
   Consonants: ADA D4 = 4; LOVELACE L3 V4 L3 C3 = 13 -> 4 (karmic 13 inside the part). By part 8; all 17 -> 8.
 Chaldean: ADA 6; LOVELACE L3 O7 V6 E5 L3 A1 C3 E5 = 33 (master, kept). By part 39 -> 12 -> 3; all letters 39 -> 3.
*/
describe('numerology: Ada Lovelace (fictitious use of a historical name)', () => {
  const r = numerology({ name: 'Ada Lovelace', year: 1974, month: 3, day: 24 });
  it('Pythagorean', () => {
    expect([r.pythagorean.expression.byNamePart.value, r.pythagorean.expression.allLetters.value]).toEqual([9, 9]);
    expect([r.pythagorean.soulUrge.byNamePart.value, r.pythagorean.soulUrge.allLetters.value]).toEqual([1, 1]);
    expect(r.pythagorean.soulUrge.allLetters.karmicDebt).toBe(19);
    expect([r.pythagorean.personality.byNamePart.value, r.pythagorean.personality.allLetters.value]).toEqual([8, 8]);
    expect(r.pythagorean.personality.partKarmicDebt).toEqual([{ part: 'LOVELACE', number: 13 }]);
  });
  it('Chaldean keeps the master 33 inside LOVELACE', () => {
    expect([r.chaldean.expression.byNamePart.compound, r.chaldean.expression.byNamePart.value]).toEqual([39, 3]);
    expect(r.chaldean.expression.allLetters.value).toBe(3);
  });
  it('karmic debt lists', () => {
    expect(r.karmicDebt).toContainEqual({ where: 'Pythagorean Soul Urge (all letters)', number: 19 });
    expect(r.karmicDebtInParts).toContainEqual({ where: 'Pythagorean Personality, name part LOVELACE', number: 13 });
  });
});
