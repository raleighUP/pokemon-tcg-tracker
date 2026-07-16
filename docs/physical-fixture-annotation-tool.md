# Physical fixture annotation tool

The local-only developer annotator creates human ground truth for physical deck photos. Enable it with `NEXT_PUBLIC_ENABLE_DEVELOPER_TOOLS=true`, run `npm run dev`, and open `/dev/physical-annotator/`. It is intentionally absent from normal navigation.

## Workflow

1. Select one of the four physical fixtures.
2. Drag one rectangle around each logical card stack. For individually separated copies, draw separate quantity-one regions.
3. Select the exact print from the shared card-reference repository, set quantity and presentation, and add notes when needed.
4. Optionally select the region, enable **Top-card crop**, and draw the visible top-card bounds.
5. Use the exact-list checklist and summary to reach 60 cards with every row complete.
6. Export `<fixture-id>.physical-annotations.json` and place it beside the fixture photo under `test-data/deck-image-importer/<fixture-id>/`.

Coordinates are normalized from 0 to 1. Drafts autosave in local storage using fixture ID and image dimensions; they never overwrite repository files. Imported detector reports and their magenta overlays are comparison-only and never modify annotations.

## Validation and evaluation

Run `npm run validate:physical-fixtures` to validate committed annotations. Complete manual printed identities are accepted without repository IDs. Run the production physical benchmark first, then `npm run evaluate:physical-regions`. Matching uses full logical-stack bounds, an IoU threshold of 0.30, descending IoU order, and stable annotation/detector ID tie-breakers. Extra detections overlapping an already matched annotation at IoU 0.30 are duplicates; remaining unmatched detections are false regions. Quantity is scored only for matched logical regions. Identity is scored only when the detector region also overlaps the human top-card crop at IoU 0.30.

Generated reports remain under ignored `debug-output/physical-region-evaluation/`. Local drafts and detector reports must not be committed.

The historical counts recorded before human bounds existed are labeled **pre-ground-truth approximate baseline** and are not recall measurements. The measured machine-readable baseline is `test-data/deck-image-importer/baselines/physical-region-baseline.json`.

Keyboard shortcuts: Delete removes the selected region, Escape cancels/deselects, Ctrl+Z and Ctrl+Y undo/redo, +/- zoom, and F fits the image.
