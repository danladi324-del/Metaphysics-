/** Offline city list (GeoNames cities15000, CC-BY). Loaded on demand from public/data/cities.tsv. */
export interface City {
  name: string;
  admin: string;
  country: string;
  lat: number;
  lon: number;
  zone: string;
  population: number;
}

export function parseCities(tsv: string): City[] {
  const out: City[] = [];
  for (const line of tsv.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [name, admin, country, lat, lon, zone, pop] = line.split('\t');
    if (!name || !zone) continue;
    out.push({ name, admin: admin ?? '', country: country ?? '', lat: Number(lat), lon: Number(lon), zone, population: Number(pop) || 0 });
  }
  return out;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Prefix matches first, then substring matches; within each, larger population first (input order). */
export function searchCities(cities: City[], query: string, limit = 8): City[] {
  const q = fold(query.trim());
  if (q.length < 2) return [];
  const prefix: City[] = [];
  const inner: City[] = [];
  for (const c of cities) {
    const n = fold(c.name);
    if (n.startsWith(q)) prefix.push(c);
    else if (n.includes(q)) inner.push(c);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...inner].slice(0, limit);
}

let cache: Promise<City[]> | null = null;
export function loadCities(base: string): Promise<City[]> {
  cache ??= fetch(`${base}data/cities.tsv`).then(async (r) => {
    if (!r.ok) throw new Error(`city list: HTTP ${r.status}`);
    return parseCities(await r.text());
  });
  return cache;
}
