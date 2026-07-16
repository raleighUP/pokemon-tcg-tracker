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
  | 'single-visible-card'
  | 'stack-edge-count'
  | 'individual-card-count'
  | 'manual-review'
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
  logicalStackBounds?: { x: number; y: number; width: number; height: number; rotation?: number }
  topCardBounds?: { x: number; y: number; width: number; height: number; rotation?: number }
  detectorStages?: Array<{stage:string;regions:Array<{id:string;bounds:{x:number;y:number;width:number;height:number};score?:number;aspectRatio?:number;rejectionReason?:string}>}>
  proposalFeatures?: {
    proposalSource: 'connected-component' | 'dense-window'
    areaRatio: number
    aspectRatio: number
    rectangularity: number
    borderCompleteness: number
    borderSides: { top: number; right: number; bottom: number; left: number; supportedSides: number }
    edgeDensity: number
    interiorEdgeDensity: number
    exteriorEdgeDensity: number
    borderToInteriorRatio: number
    backgroundContrast: number
    orientationConsistency: number
    perspectiveScore: number
    edgeTouchPenalty: number
    parentCandidateId?: string
    childCandidateIds: string[]
    containmentRatio?: number
    lineage: { proposalId: string; source: 'connected-component' | 'dense-window'; parentIds: string[]; rootIds: string[]; derivation: 'raw' | 'normalized' }
    edgeSupportFingerprint: { horizontalBands: number[]; verticalBands: number[]; cornerSupport: number; perimeterHash: string }
    finalScore: number
  }
  proposalDecision?: { decision: 'retained' | 'duplicate-suppressed' | 'child-attached' | 'merged' | 'rejected'; winnerId?: string; reasons: string[] }
  proposalDecisions?: Array<{ proposalId:string; decision:'retained'|'duplicate-suppressed'; winnerId?:string; reasons:string[] }>
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
