// Builds public/data/cities.tsv from the GeoNames cities15000 dump (CC-BY, via the npm package cities15000-json 1.0.0).
// Usage: node scripts/build-cities.mjs path/to/cities.json
// Columns: name, admin1 code, country code, lat, lon, IANA zone, population. Sorted by population, descending.
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('pass the path to cities.json');
const rows = JSON.parse(readFileSync(src, 'utf8'))
  .filter((c) => c.tz)
  .map((c) => [c.name, c.adminCode, c.country, Number(c.lat).toFixed(4), Number(c.lon).toFixed(4), c.tz, Number(c.population) || 0])
  .sort((a, b) => b[6] - a[6] || a[0].localeCompare(b[0]));
const header = '# GeoNames cities15000 (geonames.org, CC-BY). 2017 snapshot via npm cities15000-json 1.0.0.\n';
writeFileSync('public/data/cities.tsv', header + rows.map((r) => r.join('\t')).join('\n') + '\n');
console.log(rows.length, 'cities');
