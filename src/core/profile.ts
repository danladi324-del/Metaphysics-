import type { LocalDateTime } from './time';

export interface Place {
  name: string;
  admin?: string;
  country?: string;
  lat: number; // north positive
  lon: number; // east positive
  source: 'geonames' | 'manual';
}

export interface NumerologyName {
  name: string;
  kind: 'birth' | 'current' | 'as given';
}

export interface Birth {
  local: LocalDateTime;
  zone: string;
  /** Resolved once at entry (DECISIONS D-006). */
  offsetSeconds: number;
  utcMs: number;
  /** Where the offset came from, e.g. "Intl tzdb 2025b". */
  offsetSource: string;
  /** How the user resolved a DST gap or overlap, if one occurred. */
  resolutionNote?: string;
  timeKnown: boolean;
}

export interface Profile {
  id: string;
  displayName: string;
  birth: Birth;
  place: Place;
  numerologyNames: NumerologyName[];
  created_at: string;
  updated_at: string;
}

export function validateProfile(p: Profile): string[] {
  const e: string[] = [];
  if (!p.displayName.trim()) e.push('Name is empty');
  if (!(p.place.lat >= -90 && p.place.lat <= 90)) e.push('Latitude must be between -90 and 90');
  if (!(p.place.lon >= -180 && p.place.lon <= 180)) e.push('Longitude must be between -180 and 180');
  if (!Number.isFinite(p.birth.utcMs)) e.push('Birth instant missing');
  return e;
}
