/** The four evidence labels (rule 2). Every displayed datum carries one. */
export type EvidenceLabel = 'calculated' | 'traditional' | 'synthesis' | 'disagreement';

export const LABEL_TEXT: Record<EvidenceLabel, string> = {
  calculated: 'Calculated: the engine computed it from inputs',
  traditional: 'Traditional: what a tradition teaches, with source',
  synthesis: 'Original synthesis: written here, a hypothesis',
  disagreement: 'Disagreement: two results that do not match'
};
