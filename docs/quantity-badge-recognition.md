# Local quantity-badge recognition

The digital deck importer uses a dedicated on-device quantity pipeline alongside the legacy
badge heuristic. It does not send images to a service and adds no OCR dependency.

## Pipeline

1. The existing screenshot-level badge profile supplies a normalized anchor and badge size.
2. Each tile performs a local badge search around that profile.
3. The digit recognizer evaluates light-neutral, adaptive light-on-dark, and dark-on-light
   masks.
4. Connected components are filtered by glyph height, width, aspect, density, edge contact,
   and placement. One or two components are supported, and parsed values remain valid from
   1 through 60.
5. Glyphs are normalized to 20×28 binary masks and compared with locally rendered generic
   Arial, Segoe UI, and sans-serif templates for digits 0–9.
6. Evidence is combined across preprocessing variants and with the legacy parser. Agreement
   raises confidence; disagreement is retained as an alternative and requires stronger
   confidence before replacing a known legacy read.
7. If an ordinary-card crop produces an invalid two-component value, the first component is
   also evaluated as a single-digit alternative. It is accepted only within 1–4, at 78% or
   higher confidence, and when it beats conflicting valid evidence by at least five points.
   This removes badge-border fragments without relaxing the invalid-value policy or affecting
   the separate Basic Energy rule.

The script implementation is in `scripts/lib/quantity-recognition.mjs`. The browser-local
counterpart is in `src/lib/deck-image-recognition/quantity-recognition/index.ts`. Additional
platform fonts can be supported by adding a generic font variant to the template lists; no
deck, fixture, card, or expected quantity is encoded in a template.

## Benchmark iterations

Baseline: 44 quantity errors, 52/110 exact rows, 0 wrong identities, and 110 detected
candidates represented.

| Iteration | Change | Quantity errors | Exact rows | Status |
| --- | --- | ---: | ---: | --- |
| 1 | Multi-variant segmentation plus generic 0–9 templates | 14 | 82/110 | Accepted as foundation |
| 2 | Reject implausibly wide single-glyph components | 11 | 85/110 | Accepted |
| 3 | Expand badge windows and relax glyph aspect | 13 | 83/110 | Reverted; AOB and Neddy regressed |
| 4 | Cross-variant and legacy consensus arbitration | 11 | 85/110 | Accepted; removed extreme two-digit hallucinations |
| 5 | Separate 0.72 unknown fallback and 0.735 disagreement thresholds | 9 | 87/110 | Accepted |

Final aggregate quantity accuracy is 101/110 (91.8%). AOB and Slop Box have perfect quantity
accuracy and exact 60-card totals. Wrong card identities remain zero, all 110 candidates are
represented, and aggregate exact rows improve to 87/110 (79.1%).

## Diagnostics

Development evaluation writes uncommitted artifacts beneath
`debug-output/quantity-recognition/<image>/<candidate>/`:

- selected badge crop;
- each threshold variant;
- normalized segmented glyphs;
- top digit alternatives and confidence in the evaluation JSON;
- parser source, legacy result, and disagreement state.

The evaluator also reports quantity exact/error/uncertain counts, badge-localization,
segmentation and classifier failures, parser disagreements, and one-/two-digit accuracy per
fixture and in aggregate. The current fixtures contain only one-digit expected quantities,
so two-digit support is exercised structurally but its benchmark accuracy remains unmeasured.

No package was added. Templates use Sharp/libvips SVG rendering in development scripts and
Canvas text rendering in the browser, keeping recognition local and bundle impact limited to
the small segmentation/classification module.
