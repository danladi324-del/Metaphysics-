# Source texts

Public-domain texts the owner supplied (2026-10-11). Each PDF is a Safari print of an archive.org OCR "full text" page, so it has OCR errors and no page images. Content packs in `src/content/packs/` paraphrase from these; every paraphrase arrives unapproved and becomes Traditional only after the owner approves it in Lab (brief §8).

| File | Source id | Work | archive.org item |
|---|---|---|---|
| `heindel1918-message-of-the-stars.pdf` | `heindel1918` | Max Heindel and Augusta Foss Heindel, *The Message of the Stars*, 3rd ed., enlarged and revised (text copyright 1918) | `messageofstarses00heiniala` |
| `lilly1647-christian-astrology.pdf` | `lilly1647` | William Lilly, *Christian Astrology* (London, 1647), Wellcome Library copy | `b30338724` |

Text extraction: `pdftotext -layout <file> out.txt`. Printed page numbers survive in Heindel's running heads (e.g. `170 THE MESSAGE OF THE STARS`); locators cite them. Lilly's OCR keeps the long s ("houfe") and turns planet and sign glyphs into junk characters, so passages need checking against a page scan.
