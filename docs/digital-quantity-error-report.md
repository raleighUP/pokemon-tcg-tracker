# Historical evaluator-only quantity report

> This report describes the retired Sharp evaluator baseline. It is preserved for
> comparison only. The regression command now drives the actual browser importer and writes
> `debug-output/deck-image-importer-browser/report.json`.

Verified against the `digital-local-v1` baseline on 2026-07-10. All nine rows use the
bottom-middle screenshot badge profile; none is caused by an incorrect global badge anchor.
Artifact paths are generated locally and intentionally ignored by Git.

| Fixture | Candidate | Recognized card | Expected | Detected | Confidence/source | Badge region | Alternatives | Failure category | Artifacts |
| --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- |
| neddy-dragapult | candidate-001 | Dreepy TWM 128 | 4 | 1 | 0.409 / unknown | 119,240 35×35 | 1 (0.409) | clipped digit / segmentation failure | `debug-output/quantity-recognition/neddy-dragapult-digital/candidate-001/` |
| neddy-dragapult | candidate-002 | Drakloak TWM 129 | 4 | 1 | 0.409 / unknown | 247,240 35×35 | 1 (0.409) | clipped digit / segmentation failure | `debug-output/quantity-recognition/neddy-dragapult-digital/candidate-002/` |
| neddy-dragapult | candidate-004 | Duskull PRE 35 | 2 | 1 | 0.455 / unknown | 503,240 35×35 | 4 (0.633), 1 (0.455) | ambiguous glyph / template mismatch | `debug-output/quantity-recognition/neddy-dragapult-digital/candidate-004/` |
| neddy-dragapult | candidate-005 | Dusclops PRE 36 | 2 | 1 | 0.455 / unknown | 631,240 35×35 | 4 (0.633), 1 (0.455) | ambiguous glyph / template mismatch | `debug-output/quantity-recognition/neddy-dragapult-digital/candidate-005/` |
| rahul-crustle | candidate-002 | Dwebble DRI 11 | 3 | 1 | 0.452 / unknown | 244,237 41×41 | 4 (0.644), 1 (0.452) | template mismatch; uncertain fallback retained | `debug-output/quantity-recognition/rahul-crustle-digital/candidate-002/` |
| rahul-crustle | candidate-003 | Crustle DRI 12 | 3 | 1 | 0.452 / unknown | 372,237 41×41 | 4 (0.644), 1 (0.452) | template mismatch; uncertain fallback retained | `debug-output/quantity-recognition/rahul-crustle-digital/candidate-003/` |
| rahul-crustle | candidate-004 | Lillie's Determination MEG 119 | 4 | 1 | 0.443 / unknown | 503,240 35×35 | 1 (0.443) | clipped digit / segmentation failure | `debug-output/quantity-recognition/rahul-crustle-digital/candidate-004/` |
| rahul-crustle | candidate-006 | Team Rocket's Petrel DRI 176 | 4 | 1 | 0.402 / unknown | 750,237 41×41 | 4 (0.670), 1 (0.402) | ambiguous glyph; template confidence below safe override | `debug-output/quantity-recognition/rahul-crustle-digital/candidate-006/` |
| rahul-crustle | candidate-008 | Eri TEF 146 | 2 | 4 | 0.723 / digit-template | 1006,237 41×41 | 4 (0.683), 1 (0.408) | incorrect template match (2 vs 4) | `debug-output/quantity-recognition/rahul-crustle-digital/candidate-008/` |

There are no legacy/new-parser disagreement flags among these final rows: the legacy parser
is unknown on each one. The template alternative is retained in diagnostics when present.

## General diagnosis

- Three failing rows have glyphs clipped or fragmented enough that no component passes the
  strict production geometry filter.
- Five rows segment a glyph but the current generic font templates favor 4 over the visible
  2 or 3, or do not clear the safe unknown-fallback threshold.
- One row is an accepted 2-to-4 template mismatch at 0.723 confidence.
- No remaining failure is caused by the screenshot badge profile, card identity, two-digit
  parsing, source language, or a legacy/new disagreement.

A bounded refinement allowing wider top-edge components produced no benchmark improvement
and was reverted. Broader badge expansion and aspect relaxation had already regressed AOB
and Neddy in the preceding optimization pass. Further improvement requires a stronger glyph
localizer or additional genuinely cross-platform font templates; threshold changes based on
these nine rows would overfit the current fixtures.
