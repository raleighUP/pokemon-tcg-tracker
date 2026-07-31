# Japanese Card Reference Coverage

Deck Picture Importer can optionally use Japanese card images for Japanese digital
fixtures, then normalize recognized cards back to English TCGL rows.

## Source

Japanese reference images and metadata are built from TCGdex:

- API docs: https://tcgdex.dev/
- Database repo: https://github.com/tcgdex/cards-database

TCGdex describes itself as a multilingual Pokemon TCG API with Japanese support.
The public database repository states that the database is MIT licensed and is
not produced, endorsed, supported, or affiliated with Nintendo or The Pokemon
Company. Card artwork remains Pokemon TCG artwork; cached images should be used
only for local recognition/debug workflows.

## Architecture

The Japanese fixture cache is separate from the English fixture-subset cache:

- English cache: `data/card-image-cache/fixture-subset/manifest.json`
- Japanese cache: `data/card-image-cache/japanese-fixture-subset/manifest.json`
- Mapping file: `test-data/deck-image-importer/japanese-reference-mapping.json`

Each Japanese manifest card stores:

- canonical English identity
- source language
- localized Japanese name/set/card number
- English TCGL output set/card number when verified
- regulation mark/category
- local image path and source URL
- language-equivalence group id
- print-mapping status and confidence

Japanese references are loaded only for fixtures or images marked
`language: "japanese"`. English baseline fixtures continue to use the locked
English reference manifest.

## Refresh Process

1. Add verified mappings to
   `test-data/deck-image-importer/japanese-reference-mapping.json`.
2. Run:

   ```bash
   npm run build:card-cache:japanese-fixtures
   ```

3. Review the generated manifest and `unmatched` rows.
4. Run:

   ```bash
   npm run evaluate:deck-image-importer:validation
   npm run test:deck-image-importer:digital
   ```

The build script downloads only mapped Japanese fixture references. It does not
scrape TCGplayer and does not call any AI service.

## Mapping Rules

Use `resolved-print` behavior only when the Japanese print and English TCGL
output print are reliably linked. If Japanese and English set numbering differ
and the English print is not verified, keep only the English canonical card name
and mark the print as unresolved.

The importer must not infer mappings from deck totals, expected answers, crop
positions, or neighboring cards. Missing mappings are reported for manual
addition.

## Current Limitations

The initial mapping file is intentionally empty. Until verified Japanese TCGdex
IDs are added for the Pnote expected decklist, Japanese validation will continue
to fall back to English references while reporting that the Japanese manifest is
missing or empty.
