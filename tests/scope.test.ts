import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Features the owner removed or excluded (CHANGE_BRIEF_2 Part F). They must not come back without the owner asking. */
const EXCLUDED = [/biorhythm/i];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}

describe('scope (Part F)', () => {
  it('no source file, test or script refers to an excluded feature', () => {
    const hits = ['src', 'tests', 'scripts']
      .flatMap(files)
      .filter((f) => !f.endsWith('scope.test.ts') && /\.(ts|tsx|cjs|mjs|js|json)$/.test(f))
      .filter((f) => EXCLUDED.some((re) => re.test(readFileSync(f, 'utf8'))));
    expect(hits).toEqual([]);
  });
});
