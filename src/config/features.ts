/**
 * User-facing features that can be enabled independently of a release.
 *
 * Deck photo import is intentionally shelved for V1. Its implementation and
 * developer tooling remain in the repository; set the public build-time flag
 * to "true" when the feature is ready to be exposed again.
 */
export const FEATURE_FLAGS = Object.freeze({
  deckPhotoImport:
    process.env.NEXT_PUBLIC_ENABLE_DECK_PHOTO_IMPORT === 'true',
})
