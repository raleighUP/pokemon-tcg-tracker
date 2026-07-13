import type {
  CardSourceLanguage,
  ExtractedDeckCard,
  RecognizedCardIdentity,
} from '@/types'

export type DeckImageSource = File | Blob | string

export type RecognitionStrategyId =
  | 'digital-grid'
  | 'physical-layout'

export type DeckEntrySourceStrategy =
  | 'digital-grid'
  | 'physical-layout'
  | 'manual'
  | 'unknown'

export type QuantitySource =
  | 'digital-badge'
  | 'digital-badge-second-pass'
  | 'digit-template'
  | 'combined'
  | 'legacy-heuristic'
  | 'unknown'

export type ImageMetadata = {
  source: DeckImageSource
  fileName?: string
  mimeType?: string
  width?: number
  height?: number
  sourceType?: 'digital' | 'physical' | 'unknown'
  sourceLanguage?: CardSourceLanguage
}

export type LoadedDeckImage = {
  source: DeckImageSource
  metadata: ImageMetadata
  objectUrl?: string
}

export type PreprocessedImage = {
  image: LoadedDeckImage
  strategyId: RecognitionStrategyId
  warnings: string[]
}

export type DetectedCardRegion = {
  id: string
  x: number
  y: number
  width: number
  height: number
  rotationDegrees?: number
  confidence: number
}

export type CardCandidate = {
  id: string
  regionId: string
  strategyId: RecognitionStrategyId
  imageData?: ImageData
  confidence: number
  quantity?: number | null
  quantityConfidence?: number
  quantitySource?: QuantitySource
}

export type DeckEntryCandidate = {
  id: string
  representativeBounds: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
  }
  groupBounds?: {
    x: number
    y: number
    width: number
    height: number
    rotation?: number
  }
  estimatedQuantity: number
  quantity: number | null
  quantityConfidence: number
  quantitySource: QuantitySource
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  confidence?: number
  notes?: string[]
  sourceStrategy: DeckEntrySourceStrategy
}

export type QuantityRead = {
  candidateId: string
  quantity: number | null
  confidence: number
  source: QuantitySource
}

export type KnownCardMatch = {
  candidateId: string
  identity: RecognizedCardIdentity
  confidence: number
}

export type RecognitionResult = {
  cards: ExtractedDeckCard[]
  candidates: CardCandidate[]
  regions: DetectedCardRegion[]
  strategyId?: RecognitionStrategyId
  warnings: string[]
}

export type RecognitionStrategy = {
  id: RecognitionStrategyId
  canProcess: (imageMetadata: ImageMetadata) => boolean | Promise<boolean>
  preprocess: (image: LoadedDeckImage) => Promise<PreprocessedImage>
  detectCards: (
    preprocessedImage: PreprocessedImage
  ) => Promise<DetectedCardRegion[]>
  extractCandidates: (
    preprocessedImage: PreprocessedImage,
    regions: DetectedCardRegion[]
  ) => Promise<CardCandidate[]>
}

export type DeckValidationResult = {
  isValidDeckSize: boolean
  totalCards: number
  warnings: string[]
}

export type DeckImageRecognitionResult = RecognitionResult
