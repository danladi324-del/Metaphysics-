import { SwissEphemeris } from '@swisseph/browser';
import wasmUrl from '@swisseph/browser/dist/swisseph.wasm?url';
import { fromSwe, type Ephemeris } from './ephemeris';

let cached: Promise<Ephemeris> | null = null;

/** Load Swiss Ephemeris (Moshier built in) plus the bundled Chiron file. Cached for the session. */
export function loadEphemeris(): Promise<Ephemeris> {
  cached ??= (async () => {
    const swe = new SwissEphemeris();
    await swe.init(wasmUrl);
    let asteroid: Uint8Array | null = null;
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}ephe/seas_18.se1`);
      if (r.ok) asteroid = new Uint8Array(await r.arrayBuffer());
    } catch {
      asteroid = null;
    }
    return fromSwe(swe, asteroid);
  })();
  return cached;
}
