/** Every convention is a parameter (rule 4). Defaults marked provisional await Eric (DECISIONS D-008). */

export type HouseSystem = 'placidus' | 'wholeSign' | 'koch' | 'equal' | 'campanus' | 'regiomontanus' | 'porphyry';
export type Zodiac = 'tropical' | 'sidereal';
export type Ayanamsa = 'lahiri' | 'raman' | 'krishnamurti' | 'faganBradley';
export type NodeType = 'mean' | 'true';
export type LilithType = 'mean' | 'osculating';

export interface AstroConventions {
  houseSystem: HouseSystem;
  zodiac: Zodiac;
  ayanamsa: Ayanamsa;
  nodeType: NodeType;
  lilithType: LilithType;
}

export const DEFAULT_ASTRO: AstroConventions = {
  houseSystem: 'placidus',
  zodiac: 'tropical',
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  lilithType: 'mean'
};

/** Which defaults are still provisional (shown with a note in the UI). */
export const PROVISIONAL: ReadonlySet<string> = new Set(['houseSystem', 'zodiac', 'nodeType', 'lilithType', 'masterNumbers', 'nameUsed']);

export const HOUSE_SYSTEM_LABEL: Record<HouseSystem, string> = {
  placidus: 'Placidus',
  wholeSign: 'Whole sign',
  koch: 'Koch',
  equal: 'Equal',
  campanus: 'Campanus',
  regiomontanus: 'Regiomontanus',
  porphyry: 'Porphyry'
};
