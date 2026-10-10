import { BODY_LABEL, type NatalResult } from '../../engines/natal/compute';
import { SIGNS, norm360 } from '../../engines/natal/zodiac';

const ABBR: Record<string, string> = {
  sun: 'Su', moon: 'Mo', mercury: 'Me', venus: 'Ve', mars: 'Ma', jupiter: 'Ju', saturn: 'Sa', uranus: 'Ur', neptune: 'Ne',
  pluto: 'Pl', chiron: 'Ch', meanNode: 'No', trueNode: 'No', meanLilith: 'Li', osculatingLilith: 'Li'
};

/** Spread label angles so markers do not overlap; keeps order, minimum gap in degrees. */
function spread(lons: number[], gap: number): number[] {
  const idx = lons.map((l, i) => ({ l, i })).sort((a, b) => a.l - b.l);
  const out = idx.map((x) => x.l);
  for (let pass = 0; pass < 200; pass++) {
    let moved = false;
    for (let k = 0; k < out.length; k++) {
      const next = (k + 1) % out.length;
      const d = norm360(out[next]! - out[k]!);
      if (out.length > 1 && d < gap) {
        const push = (gap - d) / 2;
        out[k] = out[k]! - push;
        out[next] = out[next]! + push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const res: number[] = new Array(lons.length);
  idx.forEach((x, k) => (res[x.i] = out[k]!));
  return res;
}

export function Wheel({ result, cusps, shown, timeKnown, size = 350 }: { result: NatalResult; cusps: number[] | null; shown: string[]; timeKnown: boolean; size?: number }) {
  const c = size / 2;
  const R = size / 2 - 10;
  const rSign = R - 35;
  const rInner = R * 0.36;
  const asc = timeKnown ? result.angles.asc : 0;
  const pt = (lon: number, r: number) => {
    const a = Math.PI + ((lon - asc) * Math.PI) / 180;
    return [c + r * Math.cos(a), c - r * Math.sin(a)] as const;
  };
  const bodies = result.bodies.filter((b) => shown.includes(b.id));
  const labelLon = spread(bodies.map((b) => b.longitude), 13);
  const desc = bodies.map((b) => BODY_LABEL[b.id]).join(', ');
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: `${size}px`, alignSelf: 'center' }} role="img" aria-label={`Chart wheel showing ${desc}${timeKnown ? '. Ascendant on the left.' : '. Birth time unknown: 0° Aries on the left, no houses.'}`}>
      <circle cx={c} cy={c} r={R} fill="none" stroke="#2C4050" stroke-width="1.5" />
      <circle cx={c} cy={c} r={rSign} fill="#1B2A36" stroke="#2C4050" stroke-width="1.5" />
      <circle cx={c} cy={c} r={rInner} fill="#131E27" stroke="#2C4050" stroke-width="1.5" />
      {SIGNS.map((s, i) => {
        const [x1, y1] = pt(i * 30, R);
        const [x2, y2] = pt(i * 30, rSign);
        const [tx, ty] = pt(i * 30 + 15, (R + rSign) / 2);
        return (
          <g>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2C4050" />
            <text x={tx} y={ty} font-size="12" fill="#9AA8B3" text-anchor="middle" dominant-baseline="central">
              {s.slice(0, 3)}
            </text>
          </g>
        );
      })}
      {timeKnown &&
        cusps?.map((cu, i) => {
          const [x1, y1] = pt(cu, rSign);
          const [x2, y2] = pt(cu, rInner);
          const angle = i === 0 || i === 3 || i === 6 || i === 9;
          const [nx, ny] = pt(cu + norm360((cusps[(i + 1) % 12] ?? cu) - cu) / 2, rInner + 12);
          return (
            <g>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={angle ? '#9AA8B3' : '#2C4050'} stroke-width={angle ? 1.5 : 1} />
              <text x={nx} y={ny} font-size="9" fill="#9AA8B3" text-anchor="middle" dominant-baseline="central">
                {i + 1}
              </text>
            </g>
          );
        })}
      {result.aspects
        .filter((a) => ['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.type) && a.type !== 'conjunction')
        .filter((a) => shown.includes(a.a) && shown.includes(a.b))
        .map((a) => {
          const la = result.bodies.find((b) => b.id === a.a)!.longitude;
          const lb = result.bodies.find((b) => b.id === a.b)!.longitude;
          const [x1, y1] = pt(la, rInner);
          const [x2, y2] = pt(lb, rInner);
          const hard = a.type === 'square' || a.type === 'opposition';
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hard ? '#E0847F' : '#7CC3D6'} stroke-width="1" stroke-dasharray={hard ? undefined : '4 3'} opacity="0.7" />;
        })}
      {bodies.map((b, i) => {
        const [tx, ty] = pt(b.longitude, rSign - 4);
        const [lx, ly] = pt(labelLon[i]!, rSign - 22);
        return (
          <g>
            <line x1={tx} y1={ty} x2={lx} y2={ly} stroke="#2C4050" />
            <circle cx={lx} cy={ly} r="10.5" fill="#1B2A36" stroke="#7CC3D6" />
            <text x={lx} y={ly} font-size="10" fill="#E9E5D9" text-anchor="middle" dominant-baseline="central">
              {ABBR[b.id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
