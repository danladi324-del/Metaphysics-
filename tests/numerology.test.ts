import { describe, expect, it } from 'vitest';
import { CHALDEAN, DEFAULT_NUMEROLOGY, PYTHAGOREAN, computeNumerology, isVowel, normalizeName, numerology, numerologyDisagreements, personalCycles, reduce } from '../src/engines/numerology/compute';

/*
 Hand-worked: ERIC GARNER, 1974-03-24.
 Pythagorean: E5 R9 I9 C3 = 26 -> 8; G7 A1 R9 N5 E5 R9 = 36 -> 9. Expression 8+9 = 17 -> 8. All letters 62 -> 8.
   Vowels: E5 I9 = 14 -> 5 (karmic 14 inside ERIC); A1 E5 = 6. By part 5+6 = 11 (master). All vowels 20 -> 2.
   Consonants: R9 C3 = 12 -> 3; G7 R9 N5 R9 = 30 -> 3. By part 6. All 42 -> 6.
 Chaldean: E5 R2 I1 C3 = 11; G3 A1 R2 N5 E5 R2 = 18 -> 9. By part 11+9 = 20 -> 2. All letters 29 -> 11.
   Vowels: E5 I1 = 6; A1 E5 = 6. 12 -> 3 both ways.
   Consonants: R2 C3 = 5; G3 R2 N5 R2 = 12 -> 3. By part 8. All 17 -> 8.
 Date: 3 + (24 -> 6) + (1974 -> 21 -> 3) = 12 -> 3. All digits 3+2+4+1+9+7+4 = 30 -> 3. Birthday 24 -> 6.
 Maturity (Pythagorean): 3 + 8 = 11.
 Pinnacles: 3+6=9, 6+3=9, 9+9=18->9, 3+3=6. Challenges |3-6|=3, |6-3|=3, |3-3|=0, |3-3|=0. First break 36-3 = 33.
 Personal year 2026: 3 + 6 + (2026 -> 10 -> 1) = 10 -> 1. October: 1 + 1 = 2. 10 Oct: 2 + 1 = 3.
*/
describe('numerology: Eric Garner, 1974-03-24', () => {
  const r = numerology({ name: 'Eric Garner', year: 1974, month: 3, day: 24 });

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
    expect([p.expression.byNamePart.compound, p.expression.byNamePart.value]).toEqual([17, 8]);
    expect([p.expression.allLetters.compound, p.expression.allLetters.value]).toEqual([62, 8]);
    expect(p.soulUrge.byNamePart.value).toBe(11);
    expect(p.soulUrge.allLetters.value).toBe(2);
    expect(p.soulUrge.partKarmicDebt).toEqual([{ part: 'ERIC', number: 14 }]);
    expect(p.personality.byNamePart.value).toBe(6);
    expect(p.personality.allLetters.value).toBe(6);
  });

  it('Chaldean name numbers', () => {
    const c = r.chaldean;
    expect(c.expression.byNamePart.value).toBe(2);
    expect([c.expression.allLetters.compound, c.expression.allLetters.value]).toEqual([29, 11]);
    expect(c.soulUrge.byNamePart.value).toBe(3);
    expect(c.soulUrge.allLetters.value).toBe(3);
    expect(c.personality.byNamePart.value).toBe(8);
    expect(c.personality.allLetters.value).toBe(8);
  });

  it('letter counts and missing numbers (Pythagorean)', () => {
    // E5 R9 I9 C3 G7 A1 R9 N5 E5 R9
    expect(r.pythagorean.letterCounts).toEqual({ 1: 1, 2: 0, 3: 1, 4: 0, 5: 3, 6: 0, 7: 1, 8: 0, 9: 4 });
    expect(r.pythagorean.missing).toEqual([2, 4, 6, 8]);
  });

  it('maturity and karmic debt', () => {
    expect(r.maturity.pythagorean.value).toBe(11);
    expect(r.karmicDebt).toEqual([]);
    expect(r.karmicDebtInParts).toEqual([{ where: 'Pythagorean Soul Urge, name part ERIC', number: 14 }]);
  });

  it('personal cycles for 10 Oct 2026', () => {
    expect(personalCycles(3, 24, 2026, 10, 10)).toEqual({ personalYear: 1, personalMonth: 2, personalDay: 3 });
  });

  it('logs disagreements: Soul Urge method split, Expression and Personality table split', () => {
    const rec = computeNumerology({ name: 'Eric Garner', year: 1974, month: 3, day: 24 }, DEFAULT_NUMEROLOGY, new Date('2026-10-10T00:00:00Z'));
    const subjects = numerologyDisagreements(rec, null).map((d) => d.subject);
    expect(subjects).toContain('Soul Urge (pythagorean)');
    expect(subjects).toContain('Expression (chaldean)');
    expect(subjects).toContain('Expression');
    expect(subjects).toContain('Personality');
    expect(subjects).not.toContain('Life Path');
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
 Hand-worked: ERIC DANLADI GARNER (birth name, given 2026-10-10), 1974-03-24.
 Pythagorean: ERIC 26 -> 8; DANLADI D4 A1 N5 L3 A1 D4 I9 = 27 -> 9; GARNER 36 -> 9.
   Expression by part 8 + 9 + 9 = 26 -> 8; all letters 89 -> 17 -> 8.
   Soul Urge: ERIC E5 I9 = 14 -> 5; DANLADI A1 A1 I9 = 11 (master, kept); GARNER 6. By part 5 + 11 + 6 = 22 (master). All vowels 31 -> 4.
   Personality: ERIC 12 -> 3; DANLADI D4 N5 L3 D4 = 16 -> 7; GARNER 30 -> 3. By part 13 -> 4 (karmic 13 in the total). All 58 -> 13 -> 4 (karmic 13).
 Chaldean: ERIC 11 (kept); DANLADI D4 A1 N5 L3 A1 D4 I1 = 19 -> 10 -> 1; GARNER 18 -> 9.
   Expression by part 11 + 1 + 9 = 21 -> 3; all letters 48 -> 12 -> 3.
 Maturity (Pythagorean) 3 + 8 = 11.
*/
describe('numerology: Eric Danladi Garner (birth name)', () => {
  const r = numerology({ name: 'Eric Danladi Garner', year: 1974, month: 3, day: 24 });
  it('Pythagorean', () => {
    expect([r.pythagorean.expression.byNamePart.value, r.pythagorean.expression.allLetters.value]).toEqual([8, 8]);
    expect([r.pythagorean.soulUrge.byNamePart.value, r.pythagorean.soulUrge.allLetters.value]).toEqual([22, 4]);
    expect([r.pythagorean.personality.byNamePart.value, r.pythagorean.personality.allLetters.value]).toEqual([4, 4]);
    expect(r.pythagorean.personality.byNamePart.karmicDebt).toBe(13);
    expect(r.pythagorean.personality.allLetters.karmicDebt).toBe(13);
  });
  it('Chaldean', () => {
    expect([r.chaldean.expression.byNamePart.value, r.chaldean.expression.allLetters.value]).toEqual([3, 3]);
  });
  it('maturity, karmic debt lists', () => {
    expect(r.maturity.pythagorean.value).toBe(11);
    expect(r.karmicDebt).toContainEqual({ where: 'Pythagorean Personality', number: 13 });
    expect(r.karmicDebtInParts).toContainEqual({ where: 'Pythagorean Personality, name part DANLADI', number: 16 });
  });
});
