# Physical training photo intake

## DROP NEW PHYSICAL DECK PHOTOS HERE:

```text
test-data/deck-image-importer/physical-training/incoming/
```

Copy original `.jpg`, `.jpeg`, `.png`, or `.webp` physical deck photos into `incoming/`. Do not rename, crop, resize, recompress, filter, or otherwise edit an original before intake. Original bytes are needed for stable duplicate hashes, accurate camera characteristics, and reproducible annotations.

The folders have distinct purposes:

- `incoming/`: unprocessed photos awaiting human registration.
- `imported/`: photos that have been registered as fixtures and given stable metadata.
- `rejected/`: invalid, duplicate, incomplete, or unusable photos retained temporarily for review.

Photos in all three folders are ignored by Git. Do not commit real photos, thumbnails, personal metadata, exports, contact sheets, or rejected images. A future Git LFS/storage policy requires a separate explicit decision.

## Workflow

1. Copy original photos into `test-data/deck-image-importer/physical-training/incoming/`.
2. Run `npm run import:physical-training-photos`.
3. Review each file's dimensions, SHA-256 hash, duplicate status, proposed stable image ID, and blocking issues.
4. Open `/dev/physical-annotator`, register the image as a fixture, and enter real metadata.
5. Manually enter image ID, deck ID, capture session/layout, source type, device, lighting, background, camera angle, sleeve/layout information, annotator, and reviewer. Never infer these from the filename.
6. Draw logical-stack bounds, add optional top-card bounds, review every included region, resolve validation errors, and lock the fixture.
7. Only after successful registration may tooling or a person copy the unchanged original into `imported/`. Keep invalid or duplicate files in `rejected/` until reviewed. Never automatically delete an incoming photo.

The intake command is deliberately read-only. It does not move files or create fixtures, and it never overwrites an existing image. The current static annotator cannot enumerate a local folder from the browser; use the command report when registering an image.

Copying a photo into `incoming/` does **not** make it training eligible or count it toward Stage A. Eligibility requires a registered fixture, required capture metadata, logical-stack annotations, human review, locked status, and no ignore/exclusion decision.
