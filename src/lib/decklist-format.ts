import type {
  CardPrintReference,
  DeckCardCategory,
  DeckPrintMode,
  ExtractedDeckCard,
} from '@/types'

const CATEGORY_ORDER: DeckCardCategory[] = ['Pokemon', 'Trainer', 'Energy']

const CATEGORY_HEADERS: Record<DeckCardCategory, string> = {
  Pokemon: 'Pokémon',
  Trainer: 'Trainer',
  Energy: 'Energy',
}

export function countExtractedCards(cards: ExtractedDeckCard[]) {
  return cards.reduce((total, card) => total + card.quantity, 0)
}

export function countExtractedCardsByCategory(
  cards: ExtractedDeckCard[],
  category: DeckCardCategory
) {
  return cards
    .filter((card) => card.category === category)
    .reduce((total, card) => total + card.quantity, 0)
}

function selectedPrintForMode(
  card: ExtractedDeckCard,
  printMode: DeckPrintMode
): CardPrintReference | null {
  if (printMode === 'base-print') {
    return card.basePrint ?? card.selectedPrint ?? card.recognizedPrint ?? null
  }

  return card.recognizedPrint ?? card.selectedPrint ?? null
}

export function formatExtractedDecklist(
  cards: ExtractedDeckCard[],
  options: { printMode?: DeckPrintMode } = {}
) {
  const printMode = options.printMode ?? 'exact-print'
  const sections = CATEGORY_ORDER.map((category) => {
    const sectionCards = cards.filter(
      (card) => card.category === category && card.quantity > 0
    )
    const sectionTotal = countExtractedCardsByCategory(cards, category)
    const lines = sectionCards.map((card) => {
      const selectedPrint = selectedPrintForMode(card, printMode)
      const name = (selectedPrint?.englishName ?? card.englishName ?? card.name).trim()
      const setCode = (selectedPrint?.setCode ?? card.setCode).trim()
      const cardNumber = (selectedPrint?.cardNumber ?? card.cardNumber).trim()
      const suffix = [setCode, cardNumber].filter(Boolean).join(' ')

      return `${card.quantity} ${name}${suffix ? ` ${suffix}` : ''}`
    })

    return [`${CATEGORY_HEADERS[category]}: ${sectionTotal}`, ...lines]
      .join('\n')
      .trim()
  })

  return [
    ...sections,
    `Total Cards: ${countExtractedCards(cards)}`,
  ].join('\n\n')
}

export type ParsedDecklistLine = {
  lineNumber: number
  raw: string
  category: DeckCardCategory
  quantity: number
  name: string
  setCode: string
  cardNumber: string
}

export type ParsedDecklistText = {
  rows: ParsedDecklistLine[]
  errors: Array<{
    lineNumber: number
    line: string
    message: string
  }>
}

function parseCategoryHeader(line: string): DeckCardCategory | null {
  const normalized = line
    .replace(/^Pokémon:/i, 'Pokemon:')
    .replace(/^Pokemon:/i, 'Pokemon:')
    .trim()
    .toLowerCase()

  if (normalized.startsWith('pokemon:')) return 'Pokemon'
  if (normalized.startsWith('trainer:')) return 'Trainer'
  if (normalized.startsWith('energy:')) return 'Energy'

  return null
}

export function parseExtractedDecklistText(text: string): ParsedDecklistText {
  const rows: ParsedDecklistLine[] = []
  const errors: ParsedDecklistText['errors'] = []
  let currentCategory: DeckCardCategory | null = null

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const line = rawLine.trim()

    if (!line) return
    if (/^total cards\s*:/i.test(line)) return

    const category = parseCategoryHeader(line)

    if (category) {
      currentCategory = category
      return
    }

    if (!currentCategory) {
      errors.push({
        lineNumber,
        line: rawLine,
        message: 'Card line appears before a section header.',
      })
      return
    }

    const match = line.match(/^(\d+)\s+(.+?)\s+([A-Za-z0-9]+)\s+([A-Za-z0-9-]+)$/)

    if (!match) {
      errors.push({
        lineNumber,
        line: rawLine,
        message: 'Expected: 4 Card Name SET 123',
      })
      return
    }

    const quantity = Number(match[1])

    if (!Number.isFinite(quantity) || quantity <= 0) {
      errors.push({
        lineNumber,
        line: rawLine,
        message: 'Quantity must be a positive number.',
      })
      return
    }

    rows.push({
      lineNumber,
      raw: rawLine,
      category: currentCategory,
      quantity,
      name: match[2].trim(),
      setCode: match[3].trim(),
      cardNumber: match[4].trim(),
    })
  })

  return { rows, errors }
}

export function countParsedDecklistRows(rows: ParsedDecklistLine[]) {
  return rows.reduce((total, row) => total + row.quantity, 0)
}

export function countParsedDecklistRowsByCategory(
  rows: ParsedDecklistLine[],
  category: DeckCardCategory
) {
  return rows
    .filter((row) => row.category === category)
    .reduce((total, row) => total + row.quantity, 0)
}
