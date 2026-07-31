import { matchCardCropsToKnownRecords } from './recognition/card-matcher'
import { readQuantityBadges } from './recognition/quantity-reader'
import { DigitalGridStrategy } from './strategies/digital-grid'
import { PhysicalLayoutStrategy } from './strategies/physical-layout'
import type { ExtractedDeckCard } from '@/types'
import type {
  DeckImageSource,
  ImageMetadata,
  LoadedDeckImage,
  RecognitionResult,
  RecognitionStrategy,
} from './types'
import { validateExtractedDeck } from './validation/deck-validator'

const strategies: RecognitionStrategy[] = [
  new DigitalGridStrategy(),
  new PhysicalLayoutStrategy(),
]

export async function loadDeckImage(
  source: DeckImageSource,
  metadata: Partial<ImageMetadata> = {}
): Promise<LoadedDeckImage> {
  return {
    source,
    metadata: {
      source,
      sourceType: 'unknown',
      ...metadata,
    },
  }
}

export async function selectRecognitionStrategy(
  imageMetadata: ImageMetadata
) {
  for (const strategy of strategies) {
    if (await strategy.canProcess(imageMetadata)) {
      return strategy
    }
  }

  return strategies.at(-1)
}

export async function recognizeDeckImage(
  source: DeckImageSource,
  metadata: Partial<ImageMetadata> = {}
): Promise<RecognitionResult> {
  const image = await loadDeckImage(source, metadata)
  const strategy = await selectRecognitionStrategy(image.metadata)

  if (!strategy) {
    return {
      cards: [],
      candidates: [],
      regions: [],
      warnings: ['No deck image recognition strategy is available.'],
    }
  }

  const preprocessedImage = await strategy.preprocess(image)
  const regions = await strategy.detectCards(preprocessedImage)
  const candidates = await strategy.extractCandidates(
    preprocessedImage,
    regions
  )

  await readQuantityBadges(candidates)
  await matchCardCropsToKnownRecords(candidates)

  const cards: ExtractedDeckCard[] = []
  const validation = validateExtractedDeck(cards)

  return {
    cards,
    candidates,
    regions,
    strategyId: strategy.id,
    warnings: [
      ...preprocessedImage.warnings,
      ...validation.warnings,
      'Real card recognition is not implemented yet.',
    ],
  }
}

export const extractDeckCardsFromImage = recognizeDeckImage
