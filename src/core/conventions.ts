/** Every convention is a parameter (rule 4). House system and zodiac decided by the owner 2026-10-10 (DECISIONS D-024); the rest marked provisional. */

export type HouseSystem = 'placidus' | 'wholeSign' | 'koch' | 'equal' | 'campanus' | 'regiomontanus' | 'porphyry';
export type Zodiac = 'tropical' | 'sidereal';
export type Ayanamsa = 'lahiri' | 'raman' | 'krishnamurti' | 'faganBradley';
export type NodeType = 'mean' | 'true';
export type LilithType = 'mean' | 'osculating' | 'interpolated';

export interface AstroConventions {
  houseSystem: HouseSystem;
  zodiac: Zodiac;
  ayanamsa: Ayanamsa;
  nodeType: NodeType;
  lilithType: LilithType;
}

export const DEFAULT_ASTRO: AstroConventions = {
  houseSystem: 'wholeSign',
  zodiac: 'tropical',
  ayanamsa: 'lahiri',
  nodeType: 'true',
  lilithType: 'interpolated'
};

/** Which defaults are still provisional (shown with a note in the UI). */
export const PROVISIONAL: ReadonlySet<string> = new Set(['masterNumbers']);

export const HOUSE_SYSTEM_LABEL: Record<HouseSystem, string> = {
  placidus: 'Placidus',
  wholeSign: 'Whole sign',
  koch: 'Koch',
  equal: 'Equal',
  campanus: 'Campanus',
  regiomontanus: 'Regiomontanus',
  porphyry: 'Porphyry'
};
