import type { ComponentChildren } from 'preact';
import type { EvidenceLabel } from '../../core/labels';

const CLASS: Record<EvidenceLabel, string> = {
  calculated: 'calc',
  traditional: 'trad',
  synthesis: 'synth',
  disagreement: 'clash'
};

export function Dot({ label }: { label: EvidenceLabel }) {
  return <span class={`dot ${CLASS[label]}`} aria-hidden="true" />;
}

export function Label({ label, children }: { label: EvidenceLabel; children: ComponentChildren }) {
  return (
    <span class="label">
      <Dot label={label} />
      {children}
    </span>
  );
}
