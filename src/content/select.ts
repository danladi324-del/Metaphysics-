import type { Db } from '../core/db';
import type { EvidenceLabel } from '../core/labels';
import { snippetsFor, type Lens, type Snippet } from './model';

/** One displayable sentence group, always traceable to a snippet id (placeholders have ids too). */
export interface Shown {
  snippetId: string;
  sourceId: string | null;
  locator: string | null;
  label: EvidenceLabel;
  /** Why it shows with this label, for the UI line above the text. */
  caption: string;
  text: string;
  placeholder: boolean;
  lensUsed: Lens;
}

export function placeholderId(key: string, kind: 'traditional' | 'synthesis', lens: Lens): string {
  return `placeholder:${kind}:${key}:${lens}`;
}

/** Preference: lens+mode, lens+any-mode, general+mode, general+any-mode. A snippet tied to another mode is never used. */
function pick(cands: Snippet[], lens: Lens, reversalMode: string | null): Snippet | undefined {
  const order: [Lens, boolean][] = [[lens, true], [lens, false], ['general', true], ['general', false]];
  for (const [l, exactMode] of order) {
    const hit = cands.find((s) => s.lens === l && (exactMode ? reversalMode !== null && s.reversal_mode === reversalMode : s.reversal_mode == null));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Select the Traditional and Synthesis layers for a key. Never generates text.
 * Falls back lens -> general; when nothing is stored, returns a visible placeholder with its own id.
 * An unapproved traditional paraphrase is shown under the synthesis label (rule 2: it is not yet Traditional).
 */
export function selectLayers(db: Db, key: string, lens: Lens, reversalMode: string | null = null): { traditional: Shown[]; synthesis: Shown } {
  const all = snippetsFor(db, key).filter((s) => !s.placeholder);
  const trad = all.filter((s) => s.label === 'traditional');
  const bySource = new Map<string, Snippet[]>();
  for (const s of trad) bySource.set(s.source_id ?? '?', [...(bySource.get(s.source_id ?? '?') ?? []), s]);
  const traditional: Shown[] = [];
  for (const [, cands] of bySource) {
    const s = pick(cands, lens, reversalMode);
    if (!s) continue;
    traditional.push({
      snippetId: s.id,
      sourceId: s.source_id ?? null,
      locator: s.source_locator ?? null,
      label: s.approved ? 'traditional' : 'synthesis',
      caption: s.approved
        ? `Traditional. Source: ${s.source_id}${s.source_locator ? `, ${s.source_locator}` : ''}`
        : `Unapproved paraphrase of ${s.source_id}: a hypothesis until approved`,
      text: s.text,
      placeholder: false,
      lensUsed: s.lens
    });
  }
  if (!traditional.length) {
    traditional.push({
      snippetId: placeholderId(key, 'traditional', lens),
      sourceId: null,
      locator: null,
      label: 'traditional',
      caption: 'Traditional. Source: [no source loaded]',
      text: '[Paraphrase of a published reading goes here.]',
      placeholder: true,
      lensUsed: lens
    });
  }
  const syn = pick(all.filter((s) => s.label === 'synthesis'), lens, reversalMode);
  const synthesis: Shown = syn
    ? { snippetId: syn.id, sourceId: null, locator: null, label: 'synthesis', caption: 'Original synthesis, written for this app', text: syn.text, placeholder: false, lensUsed: syn.lens }
    : {
        snippetId: placeholderId(key, 'synthesis', lens),
        sourceId: null,
        locator: null,
        label: 'synthesis',
        caption: 'Original synthesis, written for this app',
        text: '[Placeholder. No synthesis text exists yet.]',
        placeholder: true,
        lensUsed: lens
      };
  return { traditional, synthesis };
}
