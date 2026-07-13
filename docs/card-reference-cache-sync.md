# Card Reference Cache Sync

Top Cut keeps decklist and image recognition fast by using a generated local
card reference cache. The sync pipeline refreshes that cache from the Pokemon
TCG API without requiring application code changes for new set releases.

Adding a new upstream set does not require application code changes, provided
the upstream source exposes the set and the automated sync and publication
pipeline completes successfully.

## Canonical Cache Layout

The split browser cache is the canonical generated dataset:

```txt
public/card-reference/
  card-reference-manifest.json
  indexes/
    card-name-index.json
    set-number-index.json
    multilingual-name-index.json
  sets/
    <pokemon-tcg-api-set-id>.json
```

Do not edit generated cache files by hand. Regenerate them with
`npm run sync:card-reference`.

The app also keeps `data/card-reference-cache.json` as generated compatibility
output. It exists because older analyzer, fixture, and recognition paths still
benefit from a single-file bundled fallback. It is not a second canonical data
source.

## Manifest And Versioning

`card-reference-manifest.json` contains:

- `schemaVersion`
- `cacheVersion`
- `generatedAt`
- `source`
- `sourceUpdatedAt`
- `totalSets`
- `totalCards`
- `standardLegalCards`
- per-set id, name, totals, release date, update timestamp, card count, and
  fingerprint

`cacheVersion` is a deterministic hash of set fingerprints and card counts.
Identical generated content keeps the same version even when `generatedAt`
changes. Changed content produces a distinct version. Unsupported schema
versions are rejected safely.

## Sync Commands

Incremental sync:

```bash
npm run sync:card-reference
```

Full rebuild:

```bash
npm run sync:card-reference -- --full
```

Dry run:

```bash
npm run sync:card-reference -- --dry-run
```

Force one set:

```bash
npm run sync:card-reference -- --force-set=sv10
```

Bootstrap from the checked-in legacy cache:

```bash
npm run sync:card-reference -- --from-local
```

Use `--allow-removals` only when a large upstream removal is expected and has
been manually reviewed.

## Incremental Behavior

The sync script:

1. Reads the local manifest.
2. Fetches the upstream Pokemon TCG API set list.
3. Compares set id, total, printed total, release date, and update timestamp.
4. Downloads cards only for new, changed, missing, or forced sets.
5. Preserves unchanged local set files.
6. Regenerates indexes and the legacy cache from the merged set files.
7. Validates the complete replacement.
8. Writes the cache only after validation succeeds.

When no upstream changes are detected, the manifest and set files are not
rewritten.

## Validation And Safety

`npm run validate:card-cache` checks the legacy cache and split public cache.
The sync library also validates before writing:

- every card has a stable id
- every card references a known set
- collector numbers remain strings
- categories are one of `Pokemon`, `Trainer`, or `Energy`
- image URLs parse as URLs
- exact-print keys are unique
- manifest card totals match set files
- indexes reference valid card ids
- large unexpected removals fail unless `--allow-removals` is used

New regulation marks are stored as data and do not require code changes.
Future-dated sets can be retained for identification; tournament legality is
handled separately from the card-identification cache.

## Runtime Repository

Application code consumes card data through
`src/lib/card-reference-repository.ts`. Existing imports from
`src/lib/card-reference.ts` remain as a compatibility facade, but consumers do
not read generated JSON directly.

The repository chooses the active source in this order:

1. valid downloaded split cache
2. bundled generated cache

The Decklist Analyzer and image importer receive normalized `CardReference`
records regardless of source.

## Runtime Downloaded Cache

Set `NEXT_PUBLIC_CARD_REFERENCE_REMOTE_ROOT` to the public URL containing the
split cache layout to enable the non-blocking startup update check. Leave it
unset to use only the bundled fallback cache.

Runtime activation is atomic:

1. Fetch the remote manifest.
2. Reject unsupported schemas.
3. Compare `cacheVersion`.
4. Download required set files and indexes into a staged version namespace in
   persistent browser storage.
5. Parse and count all staged files.
6. Copy staged files into the versioned active namespace.
7. Advance the active manifest only after validation succeeds.

The app never writes into the bundled application directory. In static web
builds and Capacitor iOS WebViews, downloaded cache files are stored in
IndexedDB when available, with small active-version metadata in localStorage. If
the download fails, storage is cleared, CORS blocks the request, the device is
offline, or the WebView cannot persist the data, the repository continues using
the bundled cache.

The current implementation intentionally avoids adding a native storage
dependency. If a target WebView needs stronger persistence guarantees, migrate
the storage adapter to a Capacitor filesystem/preferences plugin without
changing the repository interface.

## Remote Hosting

`NEXT_PUBLIC_CARD_REFERENCE_REMOTE_ROOT` should point at the directory that
contains `card-reference-manifest.json`. It may include or omit a trailing
slash.

Required remote structure:

```txt
<remote-root>/
  card-reference-manifest.json
  sets/<set-id>.json
  indexes/card-name-index.json
  indexes/set-number-index.json
  indexes/multilingual-name-index.json
```

Remote hosts must send CORS headers that allow the web and Capacitor app
origins to fetch JSON. Use `application/json` or another JSON-compatible
content type.

Recommended cache control:

- manifest: short max-age or revalidate
- set files and indexes: long max-age with immutable versioned publication

Publish new files before publishing the manifest. Roll back by restoring the
previous manifest. Disable remote updates by unsetting
`NEXT_PUBLIC_CARD_REFERENCE_REMOTE_ROOT` and rebuilding.

## Scheduled Updates

`.github/workflows/update-card-reference.yml` runs daily and manually. It:

1. Installs dependencies.
2. Runs `npm run sync:card-reference`.
3. Runs `npm run validate:card-cache`.
4. Uploads `public/card-reference/` as a GitHub Actions artifact.
5. Opens a pull request containing generated cache changes when files changed.

The workflow does not currently publish directly to a production CDN or object
storage bucket. Runtime clients can consume the uploaded artifact only after a
separate publication step copies it to the configured remote static host.

Set `POKEMON_TCG_API_KEY` as a repository secret if higher Pokemon TCG API rate
limits are needed. The browser app does not expose this key.

## Print Identity

Each generated card retains:

- `source`
- `sourceCardId`
- `sourceSetId`
- `exactPrintKey`
- `exactPrintIdentity`
- set code
- collector number as a string
- regulation mark when supplied
- source update timestamp when available
- sync timestamp

Exact prints are keyed by source, source set id, collector number, language,
and source card id. Cards with the same name are not merged.

The recognized exact print remains the authoritative recognition result. The
editable TCGL text is an export/review surface, not the only source of
recognition metadata. Saved import metadata keeps minimal display snapshots
such as name, set code, collector number, and regulation mark so older saved
decks remain readable if a later cache no longer contains a referenced card.

Observed-language identity and English export identity are separate. A Japanese
visual match can retain the observed reference while mapping to an English
tournament-list representation when a reliable mapping exists.

## Print Selection Policies

Print selection is modeled as a policy:

- `exact`: exact print shown in the uploaded image
- `base`: deterministic playable/base print when safely resolvable
- `cheapest`: reserved for future pricing-backed selection

Base resolution is conservative. It prefers a non-premium-looking TCGL print
from the same English name and category and returns warnings when gameplay
identity is not fully proven. It does not claim to find the cheapest print.

## Tests

Run the sync tests:

```bash
npm run test:card-reference-sync
```

The tests cover:

- no-change syncs do not rewrite files
- new sets are added
- changed sets refresh without downloading unchanged sets
- failed syncs keep the existing cache
- unexpected removals fail validation
- new regulation marks are accepted
- future-dated sets remain available for recognition
- exact prints with the same name remain distinct
- identical content keeps a stable `cacheVersion`

## Manual Verification

Recommended verification before committing cache changes:

```bash
npm run test:card-reference-sync
npm run validate:card-cache
npm run test:deck-image-importer:digital
npm run evaluate:deck-image-importer:validation
npm run typecheck
npm run lint
npm run build
npm run verify:static
```
