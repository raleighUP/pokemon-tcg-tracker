import type {
  CardPrintReference,
  DeckCardCategory,
} from '@/types'

export type CanonicalCardReference = {
  canonicalCardId: string
  englishName: string
  category: DeckCardCategory
  recognizedPrint: CardPrintReference | null
}

export type PrintSelectionResult = {
  selectedPrint: CardPrintReference | null
  confidence: number
  alternatives: CardPrintReference[]
  warnings: string[]
  reasoning: string[]
}

export interface PrintSelectionStrategy {
  selectPrint(
    canonicalCard: CanonicalCardReference,
    candidatePrints: CardPrintReference[]
  ): Promise<PrintSelectionResult> | PrintSelectionResult
}

function normalized(value: string | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function printKey(print: CardPrintReference | null | undefined) {
  if (!print) return ''

  return [
    normalized(print.englishName),
    normalized(print.setCode),
    normalized(print.cardNumber),
    print.category,
  ].join('|')
}

function looksPremium(print: CardPrintReference) {
  const haystack = [
    print.rarity,
    print.setCode,
    print.cardNumber,
    ...(print.notes ?? []),
  ].join(' ').toLowerCase()

  return /promo|secret|hyper|illustration|full art|special art|stamped|prize|gold|rainbow|rare/i.test(haystack)
}

function hasTcglPrint(print: CardPrintReference) {
  return Boolean(print.setCode.trim() && print.cardNumber.trim())
}

function isSameCanonicalCard(
  canonicalCard: CanonicalCardReference,
  print: CardPrintReference
) {
  return (
    normalized(print.englishName) === normalized(canonicalCard.englishName) &&
    print.category === canonicalCard.category
  )
}

function sortBaseCandidates(left: CardPrintReference, right: CardPrintReference) {
  const premiumDelta = Number(looksPremium(left)) - Number(looksPremium(right))

  if (premiumDelta !== 0) return premiumDelta

  const languageDelta =
    Number(left.sourceLanguage !== 'english') - Number(right.sourceLanguage !== 'english')

  if (languageDelta !== 0) return languageDelta

  return printKey(left).localeCompare(printKey(right))
}

export class ExactPrintStrategy implements PrintSelectionStrategy {
  selectPrint(canonicalCard: CanonicalCardReference): PrintSelectionResult {
    const selectedPrint = canonicalCard.recognizedPrint

    return {
      selectedPrint,
      confidence: selectedPrint ? 1 : 0,
      alternatives: selectedPrint ? [selectedPrint] : [],
      warnings: selectedPrint ? [] : ['Exact print unresolved.'],
      reasoning: selectedPrint
        ? ['Using the print recognized from the uploaded image.']
        : ['No recognized exact print is available.'],
    }
  }
}

export class BasePrintStrategy implements PrintSelectionStrategy {
  selectPrint(
    canonicalCard: CanonicalCardReference,
    candidatePrints: CardPrintReference[]
  ): PrintSelectionResult {
    const equivalentCandidates = candidatePrints
      .filter((print) => isSameCanonicalCard(canonicalCard, print))
      .filter(hasTcglPrint)
      .sort(sortBaseCandidates)
    const selectedPrint =
      equivalentCandidates.find((print) => !looksPremium(print)) ??
      equivalentCandidates[0] ??
      canonicalCard.recognizedPrint
    const alternatives = equivalentCandidates.filter(
      (print) => printKey(print) !== printKey(selectedPrint)
    )
    const warnings: string[] = []
    const reasoning = [
      'Filtered to the same English card name and category.',
      'Required TCGL-compatible set code and card number.',
      'Preferred non-premium-looking print metadata when available.',
    ]

    if (!selectedPrint) {
      warnings.push('No verified equivalent base print found.')
    } else if (printKey(selectedPrint) === printKey(canonicalCard.recognizedPrint)) {
      warnings.push('No separate base print candidate was available; using recognized print.')
    }

    if (canonicalCard.category === 'Pokemon') {
      warnings.push(
        'Pokemon base-print equivalence is conservative until gameplay text metadata is available.'
      )
    }

    return {
      selectedPrint,
      confidence:
        selectedPrint && warnings.length === 0
          ? 0.85
          : selectedPrint
            ? 0.55
            : 0,
      alternatives,
      warnings,
      reasoning,
    }
  }
}

export class LowestMarketPriceStrategy implements PrintSelectionStrategy {
  selectPrint(): PrintSelectionResult {
    return {
      selectedPrint: null,
      confidence: 0,
      alternatives: [],
      warnings: ['Market-price print selection is not implemented.'],
      reasoning: ['No reliable pricing source is integrated yet.'],
    }
  }
}

export class LowestPTCGLCraftingCostStrategy implements PrintSelectionStrategy {
  selectPrint(): PrintSelectionResult {
    return {
      selectedPrint: null,
      confidence: 0,
      alternatives: [],
      warnings: ['PTCGL crafting-cost print selection is not implemented.'],
      reasoning: ['No crafting-cost data source is integrated yet.'],
    }
  }
}

export function createRecognizedPrintReference(
  card: Pick<
    CardPrintReference,
    | 'id'
    | 'englishName'
    | 'setCode'
    | 'cardNumber'
    | 'regulationMark'
    | 'category'
    | 'sourceLanguage'
    | 'localizedName'
    | 'localizedSetCode'
    | 'localizedCardNumber'
    | 'imageUrl'
    | 'exactPrintIdentity'
    | 'exactPrintKey'
    | 'sourceCardId'
    | 'sourceSetId'
    | 'englishEquivalentReferenceId'
    | 'mappingStatus'
    | 'notes'
  >
): CardPrintReference {
  return {
    ...card,
  }
}

export function resolveBasePrintForRecognizedCard(
  canonicalCard: CanonicalCardReference,
  candidatePrints: CardPrintReference[] = []
) {
  return new BasePrintStrategy().selectPrint(canonicalCard, candidatePrints)
}
