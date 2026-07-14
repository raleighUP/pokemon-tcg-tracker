# Deck Image Recognition Pipeline

This document describes the production digital deck-image path. Physical-photo
recognition remains deferred and its strategy files are scaffolding only.

## Goals

- Support clean digital deck screenshots and physical deck photos.
- Support arbitrary card ordering in source images.
- Support non-English source cards, especially Japanese cards, while producing
  English TCGL output.
- Keep image preprocessing strategy-specific.
- Keep card matching, quantity reading, validation, and deck reconstruction
  strategy-agnostic.
- Let future recognition improvements plug into the same downstream output:
  `ExtractedDeckCard[]`.

## Folder Structure

```txt
src/lib/deck-image-recognition/
  index.ts
  types.ts
  pipeline.ts

  strategies/
    digital-grid.ts
    physical-layout.ts

  recognition/
    card-matcher.ts
    quantity-reader.ts

  validation/
    deck-validator.ts
```

## Production Digital Pipeline

1. `DeckImageImporter.tsx` accepts the local `File`.
2. `deck-recognition/pipeline.ts` creates a temporary object URL.
3. `browser-local-recognition.ts` loads the image and calls
   `crop-detector.ts` for digital tile candidates.
4. Candidate crops are matched against
   `/card-image-cache/fixture-subset/manifest.json` using the shared local
   feature scorer.
5. Badge alternatives are read and passed through the layout-aware policy in
   `digital-recognition-config.mjs`. Ordinary PTCGL quantities accept only 1–4;
   an invalid template result may retain an independently valid, sufficiently
   confident legacy read.
6. Basic Energy can accept a multi-digit quantity only after identity matching,
   on a supported layout, with at least 0.90 quantity confidence.
7. Exact identities are merged once; every row retains its candidate-derived id.
8. The final total is classified as valid (60), near-valid (55–65), or invalid.
9. `DeckImageReview.tsx` formats the editable TCGL list and blocks saving invalid
   totals until the user corrects them.

Both `DigitalGridStrategy` and `PhysicalLayoutStrategy` return the same card
region and candidate types, so downstream recognition does not need to know
where the image came from.

## Strategies

`DigitalGridStrategy` is intended for clean app screenshots or exported deck
images. It may eventually use grid-like hints, but those assumptions must stay
inside the strategy.

`PhysicalLayoutStrategy` is intended for physical photos. It should support
perspective correction, lighting variation, overlapping cards, and non-uniform
layouts later.

## Downstream Recognition

Recognition modules must stay strategy-agnostic:

- `quantity-reader.ts` reads quantity badges from normalized card candidates.
- `card-matcher.ts` matches normalized card candidates to known card records.
- `deck-validator.ts` validates the extracted deck output.

These modules should not assume fixed rows, fixed columns, or a digital deck
builder layout. They also should not infer card category from source image
position. Category should come from recognized card identity.

Future multilingual recognition should resolve a source card into a
`RecognizedCardIdentity`:

```ts
{
  sourceLanguage?: 'english' | 'japanese' | 'mixed' | 'unknown'
  detectedName?: string
  englishName: string
  setCode: string
  cardNumber: string
  category: 'Pokemon' | 'Trainer' | 'Energy'
  regulationMark?: string
}
```

The source name may be Japanese, but downstream deck reconstruction should use
`englishName` for TCGL output.

## Fixture Benchmarks

Benchmark fixtures live in:

```txt
test-data/deck-image-importer/
```

Each fixture folder supports:

- `digital.png`
- `physical.jfif`
- `expected.txt`
- optional `metadata.json`

Run:

```bash
npm run benchmark:deck-images
```

The production digital benchmark uses Playwright to upload each fixture through the real
browser UI. It therefore runs the same image decoder, Canvas operations, crop detector,
matcher, quantity reader, merge behavior, and formatter used by the app. Its committed
minimum contract is stored in
`test-data/deck-image-importer/baselines/digital-baseline.json`.

Run the evaluator for diagnostics or the regression-locked command for CI/local acceptance:

```bash
npm run evaluate:deck-image-importer:digital
npm run test:deck-image-importer:digital
```

The Windows benchmark uses an installed Microsoft Edge when available. On CI or a machine
without Edge, install Playwright's Chromium runtime once with:

```bash
npx playwright install chromium
```

The production-parity baseline is 0 wrong identities, 110/110 represented candidates,
104/110 quantity matches (94.5%), and 104/110 exact rows (94.5%). Neddy Dragapult and Rahul
Crustle retain exact 60-card totals; AOB is 57 and Slop Box is 59 with review diagnostics.
The previous 101/110 evaluator-only result is retained as historical metadata, not as the
production contract.

### Adding a digital fixture

Create a fixture directory with an answer-key `expected.txt`, an image with a supported
extension, and `metadata.json`. Image metadata may describe the source for reporting:

```json
{
  "deckName": "Example",
  "language": "english",
  "images": [
    {
      "file": "web-screenshot.png",
      "sourceType": "digital",
      "platform": "limitless",
      "badgeAnchor": "bottom-center"
    }
  ]
}
```

`platform` and `badgeAnchor` are reporting/grouping labels only. Recognition must not branch
on them or on the fixture filename. The evaluator reports results by platform, dimensions,
orientation, badge anchor, expected digit count, and source language.

### Baseline versus unseen validation

The four locked decks declare `"benchmarkGroup": "baseline"`. Any new fixture or image
defaults to `validation` unless it explicitly declares another supported group. Baseline
fixtures enforce the committed regression contract; validation fixtures measure
generalization and never loosen or overwrite that contract.

An unseen fixture can contain multiple digital screenshots of the same deck. Each image is
evaluated independently against the fixture's `expected.txt`:

```json
{
  "deckName": "Unseen Builder Example",
  "benchmarkGroup": "validation",
  "language": "english",
  "images": [
    {
      "file": "desktop.png",
      "sourceType": "digital",
      "platform": "unknown",
      "badgeAnchor": "unknown",
      "notes": "Desktop export"
    },
    {
      "file": "mobile.png",
      "sourceType": "digital",
      "platform": "unknown",
      "badgeAnchor": "unknown",
      "notes": "Portrait mobile screenshot"
    }
  ]
}
```

Only the image and `expected.txt` are required. Platform, language, badge anchor, and notes
are optional reporting metadata; difficulty ratings are not used.

Run the groups separately:

```bash
npm run test:deck-image-importer:digital
npm run evaluate:deck-image-importer:validation
```

Validation artifacts are written beneath `debug-output/deck-image-importer-validation/`.
Its report separates committed baseline metrics, observed validation metrics, and
informational combined metrics. It also clusters failures by unfamiliar badge location,
font or shape; clipped badges; crop/scaling issues; missing or multilingual references;
card-similarity mismatches; and unknown layouts.

The first run for an unfamiliar platform is observational: do not tune templates,
thresholds, or platform-specific rules from a single screenshot. An algorithm change is
justified only when it improves multiple independent examples or a clearly general failure
class, preserves the baseline regression command, and introduces no fixture/platform answer
conditions.

### Supported assumptions and limitations

- Digital inputs are screenshots or exports with repeatable card tiles and a visible quantity
  badge. Web, mobile, landscape, portrait, and unknown platforms are discoverable, but the
  current regression corpus contains only Pokémon TCG Live landscape screenshots.
- Ordinary PTCGL quantities accept only 1 through 4. Basic Energy may exceed four only after
  independent identity matching and a strong multi-digit read. Other invalid reads fall back
  to one with an explicit review note; they are never clamped to four.
- Missing or uncertain reads remain visible in manual review. Deck-total validation never
  rewrites a recognized quantity.
- Digital badges encode explicit list quantities. Future physical-card support must estimate
  stack counts using a separate physical strategy; it must not reuse digital badge semantics.
- Mock extraction and recognition diagnostics are development-only. Production failures fall
  back to manual text review, require no debug artifacts, bundle no fixture answer keys into
  recognition behavior, and keep images on-device.
