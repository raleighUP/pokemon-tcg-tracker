import type { CardCandidate, QuantityRead } from '../types'

export async function readQuantityBadges(
  candidates: CardCandidate[]
): Promise<QuantityRead[]> {
  return candidates.map((candidate) => ({
    candidateId: candidate.id,
    quantity: candidate.quantity ?? null,
    confidence: candidate.quantityConfidence ?? 0,
    source: candidate.quantitySource ?? 'unknown',
  }))
}
