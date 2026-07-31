import type { ExtractedDeckCard } from '@/types'
import type { DeckValidationResult } from '../types'

export function validateExtractedDeck(
  cards: ExtractedDeckCard[]
): DeckValidationResult {
  const totalCards = cards.reduce(
    (total, card) => total + card.quantity,
    0
  )
  const warnings: string[] = []

  if (totalCards !== 60) {
    warnings.push(`Expected 60 cards, found ${totalCards}.`)
  }

  if (cards.some((card) => card.confidence < 0.8)) {
    warnings.push('One or more cards have low recognition confidence.')
  }

  if (cards.some((card) => card.legalityStatus !== 'standard')) {
    warnings.push('One or more cards need legality review.')
  }

  if (cards.some((card) => card.quantityValidationWarning)) {
    warnings.push('One or more cards need quantity limit review.')
  }

  return {
    isValidDeckSize: totalCards === 60,
    totalCards,
    warnings,
  }
}
