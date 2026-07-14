export interface PhysicalRecognitionConfig {
  cardAspectRatio: number
  aspectRatioTolerance: number
  minimumRegionAreaRatio: number
  maximumRegionAreaRatio: number
  minimumCardLikeness: number
  duplicateOverlapThreshold: number
  maximumOrdinaryQuantity: number
  processingMaximumDimension: number
}

export const PHYSICAL_RECOGNITION_CONFIG: Readonly<PhysicalRecognitionConfig>
export function resolveRecognitionStrategy(
  requested: 'auto' | 'digital' | 'physical'
): 'digital' | 'physical'
