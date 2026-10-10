import { CARD_BY_ID, majorNumber, roman, type MajorNumbering, type Suit } from '../../content/tarot';

/** Original generative line art: suit marks for minors, a numbered polygon emblem for majors. Not Rider-Waite-Smith imagery. */
function SuitMark({ suit, x, y, s }: { suit: Suit; x: number; y: number; s: number }) {
  const c = '#E9E5D9';
  switch (suit) {
    case 'wands':
      return <path d={`M${x} ${y - s}L${x} ${y + s}M${x - s * 0.35} ${y - s * 0.6}L${x} ${y - s}L${x + s * 0.35} ${y - s * 0.6}`} stroke={c} stroke-width="2" fill="none" />;
    case 'cups':
      return <path d={`M${x - s * 0.7} ${y - s * 0.6}Q${x} ${y + s * 0.9} ${x + s * 0.7} ${y - s * 0.6}ZM${x} ${y + s * 0.3}V${y + s}M${x - s * 0.4} ${y + s}H${x + s * 0.4}`} stroke={c} stroke-width="2" fill="none" />;
    case 'swords':
      return <path d={`M${x} ${y - s}L${x} ${y + s * 0.5}M${x - s * 0.45} ${y + s * 0.5}H${x + s * 0.45}M${x} ${y + s * 0.5}V${y + s}`} stroke={c} stroke-width="2" fill="none" />;
    case 'pentacles':
      return (
        <g fill="none" stroke={c} stroke-width="1.6">
          <circle cx={x} cy={y} r={s * 0.75} />
          <path d={Array.from({ length: 5 }, (_, i) => {
            const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
            return `${i ? 'L' : 'M'}${x + Math.cos(a) * s * 0.6} ${y + Math.sin(a) * s * 0.6}`;
          }).join('') + 'Z'} />
        </g>
      );
  }
}

export function CardFace({ cardId, reversed, numbering, width = 168 }: { cardId: string; reversed: boolean; numbering: MajorNumbering; width?: number }) {
  const card = CARD_BY_ID.get(cardId)!;
  const W = 168;
  const H = 268;
  let art;
  if (card.arcana === 'major') {
    const n = majorNumber(card, numbering);
    const sides = (n % 6) + 3;
    const rings = 1 + (n % 3);
    art = (
      <g fill="none" stroke="#E9E5D9" stroke-width="1.6">
        {Array.from({ length: rings }, (_, k) => {
          const r = 44 - k * 12;
          const rot = (n * 17 + k * 30) * (Math.PI / 180);
          return (
            <path
              d={Array.from({ length: sides }, (_, i) => {
                const a = rot + (i * 2 * Math.PI) / sides;
                return `${i ? 'L' : 'M'}${84 + Math.cos(a) * r} ${118 + Math.sin(a) * r}`;
              }).join('') + 'Z'}
            />
          );
        })}
        <circle cx="84" cy="118" r="5" fill="#D6B066" stroke="none" />
        <text x="84" y="40" text-anchor="middle" font-size="18" fill="#D6B066" stroke="none">
          {roman(n)}
        </text>
      </g>
    );
  } else if (card.rank <= 10) {
    const cols = card.rank <= 3 ? 1 : 2;
    const rows = Math.ceil(card.rank / cols);
    art = (
      <g>
        {Array.from({ length: card.rank }, (_, i) => {
          const col = cols === 1 ? 0 : i % 2;
          const row = cols === 1 ? i : Math.floor(i / 2);
          const x = cols === 1 ? 84 : 58 + col * 52;
          const y = 118 + (row - (rows - 1) / 2) * Math.min(34, 150 / rows);
          return <SuitMark suit={card.suit!} x={x} y={y} s={card.rank === 1 ? 30 : 12} />;
        })}
      </g>
    );
  } else {
    const letter = ['P', 'N', 'Q', 'K'][card.rank - 11]!;
    art = (
      <g>
        <path d="M54 92L66 72L84 88L102 72L114 92Z" fill="none" stroke="#D6B066" stroke-width="1.6" />
        <text x="84" y="138" text-anchor="middle" font-size="36" fill="#E9E5D9">
          {letter}
        </text>
        <SuitMark suit={card.suit!} x={84} y={172} s={14} />
      </g>
    );
  }
  return (
    <svg width={width} height={(width * H) / W} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${card.name}${reversed ? ', reversed' : ''}`}>
      <rect x="1" y="1" width="166" height="266" rx="12" fill="#1B2A36" stroke="#2C4050" stroke-width="2" />
      <g transform={reversed ? 'rotate(180 84 118)' : undefined}>{art}</g>
      <text x="84" y="236" text-anchor="middle" font-size="14" fill="#E9E5D9" font-weight="500">
        {card.name}
      </text>
      <text x="84" y="254" text-anchor="middle" font-size="12" fill="#9AA8B3">
        {reversed ? 'Reversed' : 'Upright'}
      </text>
    </svg>
  );
}
