import { HOUSE_SYSTEM_LABEL } from '../../core/conventions';
import type { Profile } from '../../core/profile';
import type { CalcRecord } from '../../core/record';
import { formatOffset } from '../../core/time';
import { BODY_LABEL, natalDisagreements, type NatalResult } from './compute';
import { formatLongitude } from './zodiac';

/** Obsidian-ready note. Calculated facts only; interpretation layers arrive with the composer (P5). */
export function natalMarkdown(rec: CalcRecord<NatalResult>, p: Profile): string {
  const r = rec.raw_result;
  const conv = rec.conventions as { houseSystem: keyof typeof HOUSE_SYSTEM_LABEL; zodiac: string; nodeType: string; lilithType: string };
  const l = p.birth.local;
  const date = `${l.year}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}`;
  const time = p.birth.timeKnown ? `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}` : 'unknown';
  const lines = [
    '---',
    `type: natal-chart`,
    `profile: ${p.displayName}`,
    `engine: ${rec.engine} ${rec.engine_version}`,
    `fingerprint: ${rec.fingerprint}`,
    `computed: ${rec.computed_at}`,
    `label: calculated`,
    '---',
    `# Natal chart: ${p.displayName}`,
    '',
    `Born ${date} ${time} (${formatOffset(p.birth.offsetSeconds)}, ${p.birth.zone}), ${p.place.name} ${p.place.lat.toFixed(4)}, ${p.place.lon.toFixed(4)}.`,
    `Conventions: ${HOUSE_SYSTEM_LABEL[conv.houseSystem]} houses, ${conv.zodiac} zodiac, ${conv.nodeType} node, ${conv.lilithType} Lilith. ${r.ephemeris}.`,
    '',
    '| Body | Position | House |',
    '|---|---|---|',
    ...r.bodies.map((b) => `| ${BODY_LABEL[b.id]} | ${formatLongitude(b.longitude)}${b.retrograde ? ' R' : ''} | ${p.birth.timeKnown ? (b.houses[conv.houseSystem] ?? '') : '–'} |`)
  ];
  if (p.birth.timeKnown) lines.push('', `Ascendant ${formatLongitude(r.angles.asc)}, Midheaven ${formatLongitude(r.angles.mc)}.`);
  const splits = natalDisagreements(rec, p.id);
  if (splits.length) lines.push('', '## Where conventions split', ...splits.map((d) => `- ${d.subject}: ${d.result_a} / ${d.result_b} (${d.cause})`));
  if (rec.limitations.length) lines.push('', '## Limitations', ...rec.limitations.map((x) => `- ${x}`));
  lines.push('', '_All values calculated. No interpretation in this note._', '');
  return lines.join('\n');
}
