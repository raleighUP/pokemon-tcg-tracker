export type ImageFeatures = {
  perceptualHash: string
  colorHistogram: number[]
  templateVector: number[]
  artTemplateVector?: number[]
  titleTemplateVector?: number[]
  lowerTemplateVector?: number[]
  edgeVector?: number[]
  futureFeatureMatching?: {
    orb: null
    sift: null
    notes: string
  }
}

export type ImageFeatureScore = {
  score: number
  confidence: number
  components: {
    perceptualHash: number
    colorHistogram: number
    templateImageSimilarity: number
    artTemplateSimilarity: number
    titleTemplateSimilarity: number
    lowerTemplateSimilarity: number
    edgeSimilarity: number
    futureFeatureMatching: null
  }
}

export function getLuma(red: number, green: number, blue: number): number
export function buildDHash(
  rgba: Uint8ClampedArray | Uint8Array,
  width?: number,
  height?: number
): string
export function hammingSimilarity(left: string, right: string): number
export function buildColorHistogram(
  rgba: Uint8ClampedArray | Uint8Array,
  binsPerChannel?: number
): number[]
export function histogramIntersection(left: number[], right: number[]): number
export function buildTemplateVector(
  rgba: Uint8ClampedArray | Uint8Array
): number[]
export function buildEdgeVector(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): number[]
export function templateSimilarity(left: number[], right: number[]): number
export function scoreImageFeatures(
  candidateFeatures: ImageFeatures,
  referenceFeatures: ImageFeatures
): ImageFeatureScore
export function createEmptyFutureFeatureMatching(): ImageFeatures['futureFeatureMatching']
