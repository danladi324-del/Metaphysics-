import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SwissEphemeris } from '@swisseph/browser';
import { fromSwe, type Ephemeris } from '../../src/engines/natal/ephemeris';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('@swisseph/browser'));

let cached: Promise<Ephemeris> | null = null;

/** Node loader: the package's init() is browser-only, so instantiate the wasm directly. */
export function nodeEphemeris(withAsteroids = true): Promise<Ephemeris> {
  const make = async () => {
    const factory = (await import(pathToFileURL(join(dist, 'swisseph.js')).href)).default as (o: object) => Promise<unknown>;
    const bin = readFileSync(join(dist, 'swisseph.wasm'));
    const swe = new SwissEphemeris();
    const mod = await factory({
      instantiateWasm(info: WebAssembly.Imports, done: (i: WebAssembly.Instance) => void) {
        WebAssembly.instantiate(bin, info).then((r) => done(r.instance));
        return {};
      }
    });
    const s = swe as unknown as { module: unknown; ready: boolean; _wrapFunctions(): void };
    s.module = mod;
    s._wrapFunctions();
    s.ready = true;
    return fromSwe(swe, withAsteroids ? new Uint8Array(readFileSync('public/ephe/seas_18.se1')) : null);
  };
  if (!withAsteroids) return make();
  cached ??= make();
  return cached;
}
