/** Canonical JSON: sorted keys, no whitespace. Used for fingerprints and determinism checks. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x !== undefined) out[k] = sortKeys(x);
    }
    return out;
  }
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('non-finite number in canonical JSON');
  return v;
}

/** 64-bit FNV-1a over UTF-16 code units, hex. Not cryptographic; identifies identical inputs. */
export function fingerprint(value: unknown): string {
  const s = typeof value === 'string' ? value : canonicalJson(value);
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < s.length; i++) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}
