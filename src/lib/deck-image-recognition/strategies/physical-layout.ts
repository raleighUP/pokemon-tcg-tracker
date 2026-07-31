import type {
  CardCandidate,
  DetectedCardRegion,
  LoadedDeckImage,
  PreprocessedImage,
  RecognitionStrategy,
} from '../types'

export class PhysicalLayoutStrategy implements RecognitionStrategy {
  id = 'physical-layout' as const

  canProcess(imageMetadata: LoadedDeckImage['metadata']) {
    if (imageMetadata.sourceType === 'physical') return true

    return imageMetadata.sourceType === 'unknown'
  }

  async preprocess(image: LoadedDeckImage): Promise<PreprocessedImage> {
    return {
      image,
      strategyId: this.id,
      warnings: [
        'Physical photo preprocessing is a placeholder.',
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
      id: `physical-candidate-${region.id}`,
      regionId: region.id,
      strategyId: this.id,
      confidence: region.confidence,
    }))
  }
}
