# Sources

Every `snippet` and `correspondence` row cites a `source_id` from this registry. Rule 8: public domain or paraphrase only. A source being listed here does not mean any text from it is loaded.

## Software and data
| id | What | License | Use |
|---|---|---|---|
| `swisseph` | Swiss Ephemeris 2.10.03 via @swisseph/browser 1.4.0, Astrodienst | AGPL-3.0 | planet, node, apogee, house positions |
| `seas_18` | `seas_18.se1` asteroid file, github.com/aloistr/swisseph | AGPL-3.0 | Chiron |
| `astronomy-engine` | astronomy-engine 2.1.19, Don Cross | MIT | cross-check for planets and moon phases in tests |
| `sqljs` | sql.js 1.14.2 | MIT | database |
| `astronomy-engine` (runtime) | astronomy-engine 2.1.19 | MIT | sunrise/sunset for planetary hours |
| `tzdb` | IANA time zone database as shipped in the runtime's `Intl` | public domain | UTC offset resolution |

## Text sources
| id | Work | Status | For |
|---|---|---|---|
| `legge1899` | James Legge, *The Yi King* (Sacred Books of the East vol. 16, 1899) | public domain; not loaded | I Ching |
| `waite1911` | A. E. Waite, *The Pictorial Key to the Tarot* (1911) | public domain; not loaded | tarot paraphrase |
| `balliett` | L. Dow Balliett, numerology works (1908–1917) | public domain (pre-1929 US); not loaded | Pythagorean letter table |
| `cheiro` | Cheiro, *Cheiro's Book of Numbers* (1926) | US public domain since 2022 (published 1926; edition to confirm); not loaded | Chaldean letter table |
| `lilly1647` | William Lilly, *Christian Astrology, Modestly Treated of in Three Books* (London, 1647) | public domain; OCR text in `sources/` (Wellcome copy); no pack yet (D-030). Cite the 1647 pages, not the SkyScript transcription (its terms forbid redistribution) | planets, signs (Book I); nativities (Book III) |
| `leo-afa` | Alan Leo, *Astrology for All*, Part I (1899; enlarged 2nd ed. 1904; 1910) | public domain (author d. 1917; published before 1931); not loaded. Locators must name the edition | Sun and Moon sign characters |
| `heindel1918` | Max Heindel and Augusta Foss Heindel, *The Message of the Stars* (Rosicrucian Fellowship, 1918) | public domain in the US (3rd ed., text copyright 1918); OCR text in `sources/`; pack `heindel1918-natal`, 216 paraphrases awaiting the owner's approval (D-030) | natal and medical astrology |

Paraphrases may be labeled Traditional only after the owner approves them (brief §8).
| `geonames` | GeoNames cities15000 (2017 snapshot via npm cities15000-json) | CC-BY | offline city list, coordinates, zone names |
| `qimen-wasm` | @spensercai/qimen-wasm 0.2.1 | MIT | test-only oracle for the Chai Bu Qi Men chart |
| `qimen-dunjia` | qimen-dunjia 3.1.0 (arc119226) | MIT | test-only oracle for the elapsed-time yuan variant |
| `lunar-javascript` | lunar-javascript 1.7.7 (6tail) | MIT | test-only oracle for BaZi pillars and luck pillars |
