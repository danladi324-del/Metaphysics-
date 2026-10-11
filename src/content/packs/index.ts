import type { ContentPack } from '../pack';

/** Content packs shipped with the app, paraphrased from public-domain texts in sources/. Loaded on demand. */
export interface BundledPack {
  id: string;
  title: string;
  sourceId: string;
  load(): Promise<ContentPack>;
}

export const BUNDLED_PACKS: BundledPack[] = [
  {
    id: 'heindel1918-natal',
    title: 'Heindel, The Message of the Stars: planets in signs and houses',
    sourceId: 'heindel1918',
    load: async () => (await import('./heindel1918-natal.json')).default as unknown as ContentPack
  }
];

/** Source passage for a snippet id, from whichever bundled pack holds it. */
export async function excerptsFor(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const p of BUNDLED_PACKS) {
    const pack = await p.load();
    for (const s of pack.snippets ?? []) if (s.excerpt && ids.includes(s.id)) out.set(s.id, s.excerpt);
  }
  return out;
}
