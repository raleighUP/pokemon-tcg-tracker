# Physical localization dataset

## Decision

**B. Continue collecting real photos.** The data pipeline is ready, but only four real photos and 114 logical-stack labels exist, all reserved as the canonical external benchmark. There are no independent training, validation, or test groups. This is not enough to start a learned-localizer proof of concept.

## Schema

The primary label is `normalizedBounds`, one logical-stack box per printed-card group. `topCardBounds` and `topCardQuad` are optional secondary labels. Existing schema version 1 remains compatible. Optional `trainingMetadata` adds image/session/layout/source/device/condition/review/quality/timing fields; optional region `training` metadata adds occlusion, truncation, perspective, difficult, ignore, and review status. Existing identities and quantity fields remain available but are not required by COCO export.

Locked training fixtures require image ID, capture session, source type, orientation, reviewer, valid dimensions, and locked included regions. Canonical historical fixtures need no migration and remain external benchmark examples.

## Commands and artifacts

| Command | Result |
|---|---|
| `npm run validate:physical-training-dataset` | Bounds, dimensions, IDs, image hashes, locked metadata; ignored JSON report |
| `npm run split:physical-localization-dataset` | Deterministic group assignments and leakage report |
| `npm run export:physical-localization-dataset` | COCO detection JSON with stable image/annotation IDs |
| `npm run analyze:physical-training-dataset` | Diversity, stage, and collection-gap report |
| `npm run generate:physical-synthetic-preview` | Four ignored scenes, labels, assessment, and contact sheet |

Generated material is under `debug-output/physical-training-data/` and is intentionally ignored. COCO boxes use absolute `[x,y,width,height]`; each is revalidated against stored and actual image dimensions. Metadata includes split, capture session, real/synthetic source, difficult state, ignore policy, and optional top-card box.

## Split and leakage policy

The fixed seed is `physical-localization-v1`. The strongest available group is capture session, then physical layout, source image family, deck, and finally fixture. Whole groups are assigned approximately 70/15/15. Exact image hashes cannot cross splits. The four canonical fixtures always receive `external-benchmark`; with the current dataset, train/validation/test are correctly empty.

Near-duplicate visual detection beyond exact hashing is a documented next enhancement before Stage A is locked. Contributors must still group burst frames and minor transformations under one session/layout ID.

## Synthetic feasibility

The bounded preview varies card art, scale, rotation, stack quantity and offset, brightness, blur/compression, simple backgrounds, spacing, and neighboring stacks. It is suitable for validating ingestion and may be useful for pretraining or augmentation. It remains visibly artificial: shadows are flat, perspective is limited, and it lacks real sleeve reflections, lens distortion, hand occlusion, and camera processing. Synthetic-only evaluation is prohibited.

## Evaluation contract

A future learned detector must report IoU ≥0.30 matches, recall, precision, false/duplicate proposals, mean/median IoU, threshold coverage, runtime, model size, memory behavior, per-fixture results, and slices by lighting, background, device, perspective, stack size, sleeves, and real/synthetic source.

Replacement requires ≥60% canonical recall, ≥40% canonical precision, mean IoU ≥0.45, perfect digital regression results, offline operation, acceptable Capacitor iOS runtime, and improvement on a separate held-out real-photo test set.

## Throughput and effort

No real annotation-session timing is stored in the repository, so human hours for 100 or 300 photos are intentionally **not estimated**. The annotator now records the timestamps/review duration needed for a five-photo study. Missing throughput evidence is one reason the recommendation remains continued collection rather than model training.

## Exact next sprint

Collect and independently review 20–30 Stage A photos across at least five decks, three environments, multiple devices, and materially different layouts. Record timing for the first five. Run validation after each session, inspect near-duplicate families, then regenerate splits and COCO. Only after Stage A ingestion works should a removable training notebook or ONNX conversion spike begin.
