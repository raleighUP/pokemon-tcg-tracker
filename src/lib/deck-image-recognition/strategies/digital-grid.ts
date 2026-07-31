import type {
  CardCandidate,
  DetectedCardRegion,
  LoadedDeckImage,
  PreprocessedImage,
  RecognitionStrategy,
} from '../types'

export class DigitalGridStrategy implements RecognitionStrategy {
  id = 'digital-grid' as const

  canProcess(imageMetadata: LoadedDeckImage['metadata']) {
    if (imageMetadata.sourceType === 'digital') return true
    if (imageMetadata.sourceType === 'physical') return false

    return Boolean(imageMetadata.mimeType?.startsWith('image/'))
  }

  async preprocess(image: LoadedDeckImage): Promise<PreprocessedImage> {
    return {
      image,
      strategyId: this.id,
      warnings: [
        'Digital grid preprocessing is a placeholder.',
      ],
    }
  }

  async detectCards(
    preprocessedImage: PreprocessedImage
  ): Promise<DetectedCardRegion[]> {
    void preprocessedImage

    return []
  }

  async extractCandidates(
    preprocessedImage: PreprocessedImage,
    regions: DetectedCardRegion[]
  ): Promise<CardCandidate[]> {
    void preprocessedImage

    return regions.map((region) => ({
      id: `digital-candidate-${region.id}`,
      regionId: region.id,
      strategyId: this.id,
      confidence: region.confidence,
      quantity: null,
      quantityConfidence: 0,
      quantitySource: 'unknown',
    }))
  }
}
