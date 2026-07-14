export const PHYSICAL_RECOGNITION_CONFIG = Object.freeze({
  cardAspectRatio: 63 / 88,
  aspectRatioTolerance: 0.35,
  minimumRegionAreaRatio: 0.0025,
  maximumRegionAreaRatio: 0.12,
  minimumCardLikeness: 0.34,
  duplicateOverlapThreshold: 0.45,
  maximumOrdinaryQuantity: 4,
  processingMaximumDimension: 1100,
})

export function resolveRecognitionStrategy(requested) {
  return requested === 'physical' ? 'physical' : 'digital'
}
