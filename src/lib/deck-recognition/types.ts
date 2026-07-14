import type {
  CardSourceLanguage,
  ExtractedDeckCard,
} from '@/types'
import type { BrowserDeckImageRecognitionResult } from '@/lib/deck-image-recognition/browser-local-recognition'

export type DeckRecognitionSourceType = 'digital' | 'physical' | 'auto'

export type RecognizeDeckOptions = {
  sourceType?: DeckRecognitionSourceType
  sourceLanguage?: CardSourceLanguage
  debug?: boolean
}

export type RecognizedDeckEntry = ExtractedDeckCard

export type DeckRecognitionDebugInfo = {
  localRecognition?: BrowserDeckImageRecognitionResult
}

export type DeckRecognitionResult = {
  entries: RecognizedDeckEntry[]
  detectedCandidateCount: number
  representedCandidateCount: number
  estimatedTotalCards: number
  sourceStrategy: string
  confidence: number
  warnings: string[]
  debug?: DeckRecognitionDebugInfo
}

export type DeckRecognitionImageInput = File | Blob | ImageBitmap | string
