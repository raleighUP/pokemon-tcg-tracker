# Deck Recognition Engine

> **Status: POST-V1 / EXPERIMENTAL.** Recognition quality, training data,
> physical stack handling, perspective handling, multilingual recognition, and
> recognition QA are not beta/V1 launch dependencies. The implementation
> remains available for development and later reactivation.

The Deck Recognition Engine is the public boundary for turning a deck image into
reviewable deck entries. `DeckImageImporter` should call this engine instead of
owning crop detection, quantity parsing, matching, normalization, or validation
details.

## Public API

```ts
import { recognizeDeckImage } from '@/lib/deck-recognition'

const result = await recognizeDeckImage(fileOrBlob, {
  sourceType: 'auto',
  sourceLanguage: 'unknown',
  debug: process.env.NODE_ENV === 'development',
})
```

Input:

```ts
type RecognizeDeckOptions = {
  sourceType?: 'digital' | 'physical' | 'auto'
  sourceLanguage?: 'english' | 'japanese' | 'mixed' | 'unknown'
  debug?: boolean
}
```

Output:

```ts
type DeckRecognitionResult = {
  entries: RecognizedDeckEntry[]
  detectedCandidateCount: number
  representedCandidateCount: number
  estimatedTotalCards: number
  sourceStrategy: string
  confidence: number
  warnings: string[]
  debug?: DeckRecognitionDebugInfo
}
```

## Internal Stages

The new `src/lib/deck-recognition/` namespace groups recognition responsibilities:

- `layout/`: digital and physical strategy selection.
- `crops/`: candidate detection and future crop refinement.
- `quantities/`: badge profiles, localization, digit segmentation, digit
  classification, and quantity confidence.
- `matching/`: local image matching, crop variants, and match confidence.
- `references/`: English and multilingual reference access.
- `normalization/`: recognized-card normalization, duplicate merging, and TCGL
  formatting.
- `validation/`: deck validation, legality, and copy-limit checks.

Most files are currently compatibility re-exports over the existing working
`deck-image-recognition` modules. This keeps the refactor behavior-preserving
while giving future recognition work stable engine import paths.

## Browser Constraints

The browser engine uses local browser APIs only:

- `URL.createObjectURL` for uploaded files/blobs.
- Canvas for image bitmap conversion and crop/debug processing.
- Local fixture image caches for visual matching.

No cloud AI service, backend, or scraping path is required.

## Digital Versus Physical Strategy

Digital recognition is the active path. It includes layout/crop detection,
quantity badge recognition, local image matching, confidence diagnostics, and
review-row generation.

Physical recognition remains a placeholder strategy and should stay isolated
from digital tuning until physical fixtures and regression gates are added.

## Multilingual Reference Flow

English references remain the default local image-matching source. Japanese
references are loaded only for Japanese validation/evaluation fixtures by the
CLI evaluator. Japanese visual references preserve localized metadata and map
back to English TCGL rows only when a reliable mapping exists.

If a Japanese print cannot be mapped to a valid English TCGL print, the engine
must keep the card reviewable and mark the print mapping unresolved rather than
inventing a set code or card number.

## Print Output Modes

Deck Picture Importer review supports two TCGL output modes:

- Exact Print: keep the recognized set code and card number from the image.
- Base Print: use a deterministic non-premium equivalent when one is verified.

Recognition entries preserve both `recognizedPrint` and `basePrint`, and the
review editor keeps separate edited text per mode so switching modes does not
overwrite manual corrections.

The base-print resolver lives at
`src/lib/deck-recognition/references/base-print-resolver.ts`. It exposes a
future-facing `PrintSelectionStrategy` interface with implemented
`ExactPrintStrategy` and `BasePrintStrategy` classes. Extension points for market
price and PTCGL crafting-cost strategies are present but intentionally return
unimplemented results until reliable pricing or crafting data is integrated.

Base print resolution must not treat two Pokemon with the same name as
equivalent unless gameplay identity metadata is available. Current fallback
behavior is conservative: when no verified alternate base print exists, the
recognized print is retained with a warning.

## Fixture And Evaluation Process

Use the locked digital baseline to protect behavior:

```bash
npm run test:deck-image-importer:digital
```

Use validation fixtures for out-of-sample measurement:

```bash
npm run evaluate:deck-image-importer:validation
```

The browser importer consumes the engine API. The CLI evaluation/prototype
scripts still live under `scripts/` and should be migrated incrementally only
when the shared core logic can be moved without changing benchmark output.
