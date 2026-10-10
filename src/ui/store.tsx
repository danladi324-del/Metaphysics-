import { createContext, type ComponentChildren } from 'preact';
import { useCallback, useContext, useEffect, useState } from 'preact/hooks';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { DEFAULT_ASTRO, type AstroConventions } from '../core/conventions';
import { Db } from '../core/db';
import type { Profile } from '../core/profile';
import { loadImage, requestPersistence, saveImage } from '../core/storage';
import { seedSources } from '../content/model';
import type { BaziConventions } from '../engines/bazi/compute';

export const APP_VERSION = '0.1.0';

/** Where the user is now: used for "today", planetary hours and the sky. Not the birth place. */
export interface Here {
  name: string;
  lat: number;
  lon: number;
  zone: string;
}

export interface TarotSettings {
  reversals: boolean;
  /** Eric's choice (brief §8); null until made. */
  mode: 'blocked' | 'opposite' | 'internal' | 'delayed' | null;
  numbering: 'waite' | 'marseille';
}

export const DEFAULT_TAROT_SETTINGS: TarotSettings = { reversals: true, mode: null, numbering: 'waite' };

export interface Settings {
  astro: AstroConventions;
  activeProfileId: string | null;
  here: Here | null;
  tarot: TarotSettings;
  bazi?: BaziConventions;
  fengshui?: { builtYear: number | null; lastBearing: number | null; north: 'magnetic' | 'true' };
}

export const deviceZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

interface Store {
  db: Db;
  settings: Settings;
  updateSettings(patch: Partial<Settings>): void;
  profiles: Profile[];
  profile: Profile | null;
  /** Current location: the setting, else the profile's birth place in the device's zone. */
  here: Here | null;
  persisted: boolean | null;
  /** Bumped after any write so screens re-query. */
  version: number;
  bump(): void;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('store not ready');
  return s;
}

function readSettings(db: Db): Settings {
  const raw = db.getMeta('settings');
  const base: Settings = { astro: DEFAULT_ASTRO, activeProfileId: null, here: null, tarot: DEFAULT_TAROT_SETTINGS };
  if (!raw) return base;
  try {
    const s = JSON.parse(raw) as Partial<Settings>;
    return { astro: { ...DEFAULT_ASTRO, ...s.astro }, activeProfileId: s.activeProfileId ?? null, here: s.here ?? null, tarot: { ...DEFAULT_TAROT_SETTINGS, ...s.tarot }, ...(s.bazi ? { bazi: s.bazi } : {}), ...(s.fengshui ? { fengshui: s.fengshui } : {}) };
  } catch {
    return base;
  }
}

export function StoreProvider({ children }: { children: ComponentChildren }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    (async () => {
      const SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
      let image: Uint8Array | null = null;
      try {
        image = await loadImage();
      } catch {
        image = null;
      }
      const db = Db.open(SQL, image, saveImage);
      seedSources(db);
      setDb(db);
      setPersisted(await requestPersistence());
    })().catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <main>
        <h1>Could not start</h1>
        <p class="note">{error}</p>
      </main>
    );
  }
  if (!db) {
    return (
      <main>
        <p class="note">Loading the database…</p>
      </main>
    );
  }
  const settings = readSettings(db);
  const profiles = db.profiles();
  const profile = profiles.find((p) => p.id === settings.activeProfileId) ?? profiles[0] ?? null;
  const store: Store = {
    db,
    settings,
    updateSettings(patch) {
      db.setMeta('settings', JSON.stringify({ ...settings, ...patch }));
      bump();
    },
    profiles,
    profile,
    here: settings.here ?? (profile ? { name: `${profile.place.name} (birth place)`, lat: profile.place.lat, lon: profile.place.lon, zone: deviceZone() } : null),
    persisted,
    version,
    bump
  };
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
