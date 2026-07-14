# Deck Image Importer Fixtures

Each fixture folder contains one expected TCGL-style decklist and one or more
images of that same deck:

- `expected.txt` - the expected formatted decklist.
- `digital.png`, `digital-*.png`, `.jpg`, `.jpeg`, `.jfif`, or `.webp` - digital deck screenshots or exports.
- `physical.jfif` - optional physical deck photo of the same deck.
- `metadata.json` - objective metadata only.

Recognition evaluation must not assume the image card order matches Pokemon /
Trainer / Energy output order. The expected decklist should still be grouped
for TCGL formatting, but recognition category assignment must come from card
identity, not image position.

Images are processed locally. Do not use AI APIs, scraping, or backend services
for fixture evaluation.

## Benchmark Groups

Digital fixtures belong to one of two groups:

- `baseline` - the locked four-deck regression benchmark. These fixtures gate
  `npm run test:deck-image-importer:digital`.
- `validation` - out-of-sample screenshots from new platforms, layouts,
  orientations, badge styles, and languages. These measure generalization only
  and must not loosen baseline thresholds.

The existing four decks are baseline fixtures. New digital images default to
`validation` unless their fixture or image metadata explicitly sets
`benchmarkGroup`.

## Adding Validation Fixtures

Create a new folder under `test-data/deck-image-importer/` with an
`expected.txt` file and at least one digital image. Add optional metadata like:

```json
{
  "deckName": "Example Deck",
  "benchmarkGroup": "validation",
  "expectedTotalCards": 60,
  "language": "english",
  "images": [
    {
      "file": "digital-switch-portrait.png",
      "sourceType": "digital",
      "benchmarkGroup": "validation",
      "platform": "unknown",
      "language": "english",
      "badgeAnchor": "unknown",
      "notes": "Portrait screenshot from an unfamiliar deck-list screen."
    }
  ],
  "notes": "Validation fixture for observational generalization only."
}
```

Supported image fields:

- `file`
- `sourceType`
- `benchmarkGroup`
- `platform`
- `language`
- `badgeAnchor`
- `label`
- `notes`

Multiple digital images can live in the same fixture folder and share the same
`expected.txt`.

## Running Reports

- Baseline gate: `npm run test:deck-image-importer:digital`
- Validation-only report: `npm run evaluate:deck-image-importer:validation`

Validation output is written to
`debug-output/deck-image-importer-validation/`. The report includes baseline
metrics from the committed locked baseline, validation metrics from current
validation fixtures, and combined metrics for information only.

## Acting On Validation Failures

The first run for a new validation fixture should be observational. Do not tune
badge templates, thresholds, or platform-specific logic from one screenshot.

An algorithm update is justified when failures show a general class across
multiple examples or platforms, such as:

- unfamiliar badge location
- unfamiliar badge font
- unfamiliar badge shape
- clipped badge
- tile crop issue
- image scaling issue
- card reference missing
- multilingual reference missing
- card similarity mismatch
- unknown platform/layout

Any fix should preserve the locked baseline and improve multiple examples or a
clear general failure class.
