import { SwissEphemeris } from '@swisseph/browser';

/** Body ids in Swiss Ephemeris numbering. */
export const BODY = {
  sun: 0,
  moon: 1,
  mercury: 2,
  venus: 3,
  mars: 4,
  jupiter: 5,
  saturn: 6,
  uranus: 7,
  neptune: 8,
  pluto: 9,
  meanNode: 10,
  trueNode: 11,
  meanLilith: 12,
  osculatingLilith: 13,
  chiron: 15
} as const;

export const FLAG = { moshier: 4, speed: 256, sidereal: 65536 } as const;

export const SIDEREAL_MODE = { faganBradley: 0, lahiri: 1, raman: 3, krishnamurti: 5 } as const;

export interface BodyPosition {
  longitude: number;
  latitude: number;
  distance: number;
  speed: number;
  flags: number;
}

export interface HouseResult {
  cusps: number[]; // 1..12, index 0 unused
  ascendant: number;
  mc: number;
  armc: number;
  vertex: number;
}

/** Thin, typed wrapper so engines do not depend on the package's classes. */
export class Ephemeris {
  constructor(private swe: SwissEphemeris, readonly hasAsteroidFile: boolean) {}

  version(): string {
    return this.swe.version();
  }

  position(jd: number, body: number, flags: number = FLAG.moshier | FLAG.speed): BodyPosition {
    const r = this.swe.calculatePosition(jd, body, flags);
    return { longitude: r.longitude, latitude: r.latitude, distance: r.distance, speed: r.longitudeSpeed, flags: r.flags };
  }

  /** Swiss Ephemeris house code ('P', 'W', ...). Return code is not exposed by the wrapper; callers check latitude limits. */
  houses(jd: number, lat: number, lon: number, code: string): HouseResult {
    const h = this.swe.calculateHouses(jd, lat, lon, code as never);
    return { cusps: h.cusps, ascendant: h.ascendant, mc: h.mc, armc: h.armc, vertex: h.vertex };
  }

  setSidereal(mode: number): void {
    this.swe.setSiderealMode(mode, 0, 0);
  }

  ayanamsa(jd: number): number {
    return this.swe.getAyanamsa(jd);
  }
}

/** Wrap an initialised SwissEphemeris, installing the asteroid file (for Chiron) if given. */
export function fromSwe(swe: SwissEphemeris, asteroidFile: Uint8Array | null): Ephemeris {
  if (asteroidFile) {
    const fs = (swe as unknown as { module: { FS: { mkdir(p: string): void; writeFile(p: string, d: Uint8Array): void } } }).module.FS;
    try {
      fs.mkdir('/ephemeris');
    } catch {
      /* already exists */
    }
    fs.writeFile('/ephemeris/seas_18.se1', asteroidFile);
    swe.setEphemerisPath('/ephemeris');
  }
  return new Ephemeris(swe, asteroidFile !== null);
}
