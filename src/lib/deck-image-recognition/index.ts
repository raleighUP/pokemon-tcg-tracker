export {
  extractDeckCardsFromImage,
  loadDeckImage,
  recognizeDeckImage,
  selectRecognitionStrategy,
} from './pipeline'
export { detectDeckEntryCandidates } from './crop-detector'
export { DigitalGridStrategy } from './strategies/digital-grid'
export { PhysicalLayoutStrategy } from './strategies/physical-layout'
export { matchCardCropsToKnownRecords } from './recognition/card-matcher'
export { readQuantityBadges } from './recognition/quantity-reader'
export { validateExtractedDeck } from './validation/deck-validator'
export { recognizeUploadedDeckImageLocally } from './browser-local-recognition'
export type { BrowserDeckImageRecognitionResult } from './browser-local-recognition'
export type {
  CardCandidate,
  DeckImageRecognitionResult,
  DeckImageSource,
  DeckEntryCandidate,
  DeckEntrySourceStrategy,
  DeckValidationResult,
  DetectedCardRegion,
  ImageMetadata,
  KnownCardMatch,
  LoadedDeckImage,
  PreprocessedImage,
  QuantityRead,
  RecognitionResult,
  RecognitionStrategy,
  RecognitionStrategyId,
} from './types'
