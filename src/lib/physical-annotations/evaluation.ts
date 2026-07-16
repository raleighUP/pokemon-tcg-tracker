import type { NormalizedBounds, PhysicalRegionAnnotation } from './schema.ts'

export function intersectionOverUnion(a: NormalizedBounds, b: NormalizedBounds) {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top)
  const union = a.width * a.height + b.width * b.height - intersection
  return union > 0 ? intersection / union : 0
}

export type DetectorRegion = { id: string; bounds: NormalizedBounds }

export function evaluatePhysicalRegions(annotations: PhysicalRegionAnnotation[], detected: DetectorRegion[], threshold = 0.5) {
  const candidates = annotations.flatMap((annotation) => detected.map((region) => ({
    annotationId: annotation.id,
    detectedRegionId: region.id,
    iou: intersectionOverUnion(annotation.normalizedBounds, region.bounds),
  }))).filter((match) => match.iou >= threshold)
    .sort((a, b) => b.iou - a.iou || a.annotationId.localeCompare(b.annotationId) || a.detectedRegionId.localeCompare(b.detectedRegionId))
  const usedAnnotations = new Set<string>()
  const usedDetected = new Set<string>()
  const matches = candidates.filter((candidate) => {
    if (usedAnnotations.has(candidate.annotationId) || usedDetected.has(candidate.detectedRegionId)) return false
    usedAnnotations.add(candidate.annotationId)
    usedDetected.add(candidate.detectedRegionId)
    return true
  })
  const duplicateRegions = detected.filter((region) =>
    annotations.some((annotation) => intersectionOverUnion(annotation.normalizedBounds, region.bounds) >= threshold) && !usedDetected.has(region.id)
  ).length
  return {
    expectedRegions: annotations.length,
    detectedRegions: detected.length,
    matchedRegions: matches.length,
    missedRegions: annotations.length - matches.length,
    falseRegions: detected.length - matches.length - duplicateRegions,
    duplicateRegions,
    precision: detected.length ? matches.length / detected.length : 0,
    recall: annotations.length ? matches.length / annotations.length : 0,
    meanIoU: matches.length ? matches.reduce((sum, match) => sum + match.iou, 0) / matches.length : 0,
    matches,
  }
}
