import { describe, expect, it } from 'vitest';
import { KEY_SETS } from '../src/content/keys';
import { BUILTIN_SOURCES } from '../src/content/model';
import { validatePack, words, WORD_CAP } from '../src/content/pack';
import { BUNDLED_PACKS } from '../src/content/packs';

describe('bundled content packs', () => {
  for (const p of BUNDLED_PACKS) {
    it(`${p.id} passes the import validator with no warnings and stays inside the rules`, async () => {
      const raw = await p.load();
      const { pack, warnings } = validatePack(raw, new Set(BUILTIN_SOURCES.map((s) => s.id)));
      expect(warnings).toEqual([]);
      const keys = new Set(Object.values(KEY_SETS).flatMap((f) => f()));
      expect(pack.snippets!.length).toBeGreaterThan(0);
      for (const s of pack.snippets!) {
        expect(keys.has(s.key), s.key).toBe(true);
        expect(s.label).toBe('traditional');
        expect(s.source_id).toBe(p.sourceId);
        expect(s.id).toBe(`${p.sourceId}.${s.key}`);
        expect(s.source_locator, s.id).toMatch(/p\. \d+/);
        expect(words(s.text), s.id).toBeLessThanOrEqual(WORD_CAP);
        // The passage the owner checks the paraphrase against must ship with it.
        expect(words(s.excerpt ?? ''), s.id).toBeGreaterThan(words(s.text) / 2);
      }
    });
  }
});
