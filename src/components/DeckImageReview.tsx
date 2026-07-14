import { useEffect, useMemo, useRef, useState } from 'react'

import {
  Button,
  EmptyState,
  FieldLabel,
  MetricTile,
  NestedPanel,
  TextInput,
  TextareaField,
  cn,
} from '@/components/ui'
import {
  countParsedDecklistRows,
  countParsedDecklistRowsByCategory,
  formatExtractedDecklist,
  parseExtractedDecklistText,
  type ParsedDecklistLine,
} from '@/lib/decklist-format'
import { validateDeckQuantityTotal } from '@/lib/deck-recognition/digital-recognition-config.mjs'
import type {
  DeckCardCategory,
  DeckImportMetadata,
  DeckPrintMode,
  ExtractedDeckCard,
} from '@/types'

const CATEGORY_ORDER: DeckCardCategory[] = ['Pokemon', 'Trainer', 'Energy']

const CATEGORY_LABELS: Record<DeckCardCategory, string> = {
  Pokemon: 'Pokemon',
  Trainer: 'Trainer',
  Energy: 'Energy',
}

type LineDiagnostic = {
  lineNumber: number
  status: 'success' | 'warning' | 'danger'
  symbol: string
  labels: string[]
}

const STATUS_SYMBOLS = {
  success: '\u2705',
  warning: '\u26A0\uFE0F',
  danger: '\u274C',
} as const

const PRINT_MODE_LABELS: Record<DeckPrintMode, string> = {
  'exact-print': 'Exact Print',
  'base-print': 'Base Print',
}

const PRINT_MODE_HELPER: Record<DeckPrintMode, string> = {
  'exact-print': 'Keep the specific set and card number shown in the image.',
  'base-print': 'Use a standard non-premium printing when an equivalent card is available.',
}

function normalizeIdentityPart(value: string | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function identityKey(card: {
  name: string
  setCode: string
  cardNumber: string
  category: DeckCardCategory
}) {
  return [
    normalizeIdentityPart(card.name),
    normalizeIdentityPart(card.setCode),
    normalizeIdentityPart(card.cardNumber),
    card.category,
  ].join('|')
}

function cardForPrintMode(card: ExtractedDeckCard, printMode: DeckPrintMode) {
  const selectedPrint =
    printMode === 'base-print'
      ? card.basePrint ?? card.selectedPrint ?? card.recognizedPrint ?? null
      : card.recognizedPrint ?? card.selectedPrint ?? null

  return {
    ...card,
    name: selectedPrint?.englishName ?? card.englishName ?? card.name,
    setCode: selectedPrint?.setCode ?? card.setCode,
    cardNumber: selectedPrint?.cardNumber ?? card.cardNumber,
    regulationMark: selectedPrint?.regulationMark ?? card.regulationMark,
    selectedPrintMode: printMode,
    selectedPrint,
  }
}

function uniqueNotes(cards: ExtractedDeckCard[]) {
  return Array.from(new Set(cards.flatMap((card) => card.notes ?? [])))
}

function shouldPreferCard(left: ExtractedDeckCard, right: ExtractedDeckCard) {
  if (right.confidence !== left.confidence) {
    return right.confidence > left.confidence
  }

  return (right.notes?.length ?? 0) > (left.notes?.length ?? 0)
}

function mergeExactDuplicateCards(cards: ExtractedDeckCard[]) {
  const merged = new Map<string, ExtractedDeckCard>()
  let changed = false

  for (const card of cards) {
    const key = identityKey(card)
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, {
        ...card,
        notes: card.notes ? [...card.notes] : undefined,
      })
      continue
    }

    changed = true
    const preferred = shouldPreferCard(existing, card) ? card : existing
    const notes = uniqueNotes([existing, card])

    merged.set(key, {
      ...preferred,
      id: existing.id,
      quantity: existing.quantity + card.quantity,
      confidence: Math.max(existing.confidence, card.confidence),
      notes: notes.length > 0 ? notes : undefined,
    })
  }

  const mergedCards = Array.from(merged.values())

  return {
    cards: mergedCards,
    changed: changed || mergedCards.length !== cards.length,
  }
}

function noteIncludes(card: ExtractedDeckCard, patterns: string[]) {
  const notes = (card.notes ?? []).join(' ').toLowerCase()

  return patterns.some((pattern) => notes.includes(pattern))
}

function cardDiagnostics(
  card: ExtractedDeckCard | undefined,
  row: ParsedDecklistLine,
  printMode: DeckPrintMode
) {
  if (!card) {
    return {
      status: 'danger' as const,
      labels: ['Missing card'],
    }
  }

  const labels: string[] = []
  const unresolved =
    card.confidence === 0 ||
    card.name.toLowerCase().startsWith('unresolved') ||
    noteIncludes(card, ['manual review needed', 'no local image match'])
  const quantityGuessed = noteIncludes(card, [
    'quantity defaulted',
    'quantity guessed',
  ])
  const multiplePossible = noteIncludes(card, [
    'multiple likely image matches',
    'multiple possible',
    'close match',
    'next best',
  ])
  const lowConfidence =
    card.confidence < 0.8 ||
    noteIncludes(card, ['low local image-match confidence', 'low-confidence'])

  if (unresolved) labels.push('Unresolved')
  if (lowConfidence && !unresolved) labels.push('Low confidence')
  if (quantityGuessed || row.quantity !== card.quantity) labels.push('Qty guessed')
  if (multiplePossible) labels.push('Multiple prints')
  if (card.legalityStatus !== 'standard') labels.push('Not Standard legal')
  if (card.quantityValidationWarning) labels.push(card.quantityValidationWarning)

  if (printMode === 'exact-print') {
    if (!card.recognizedPrint || card.recognizedPrint.mappingStatus === 'unresolved') {
      labels.push('Exact print unresolved')
    } else if ((card.printRecognitionConfidence ?? card.confidence) < 0.8) {
      labels.push('Exact print uncertain')
    } else {
      labels.push('Exact print verified')
    }
  } else if (!card.basePrint || card.basePrint.mappingStatus === 'unresolved') {
    labels.push('No verified equivalent base print')
  } else if ((card.basePrintResolutionConfidence ?? 0) < 0.8) {
    labels.push('Several equivalent prints')
  } else {
    labels.push('Base print selected')
  }

  if (labels.length === 0) labels.push('Likely correct')

  const printSuccessOnly = labels.every((label) =>
    /likely correct|exact print verified|base print selected/i.test(label)
  )

  return {
    status:
      unresolved ||
      card.confidence === 0 ||
      labels.some((label) => /unresolved|no verified/i.test(label))
        ? 'danger' as const
        : printSuccessOnly
          ? 'success' as const
          : 'warning' as const,
    labels,
  }
}

function lineDiagnosticFor(
  row: ParsedDecklistLine,
  recognizedByIdentity: Map<string, ExtractedDeckCard>,
  printMode: DeckPrintMode
): LineDiagnostic {
  const card = recognizedByIdentity.get(identityKey(row))
  const diagnostic = cardDiagnostics(card, row, printMode)
  const symbol =
    diagnostic.status === 'success'
      ? STATUS_SYMBOLS.success
      : diagnostic.status === 'warning'
        ? STATUS_SYMBOLS.warning
        : STATUS_SYMBOLS.danger

  return {
    lineNumber: row.lineNumber,
    status: diagnostic.status,
    symbol,
    labels: diagnostic.labels,
  }
}

function compactDiagnosticLabel(diagnostic: LineDiagnostic) {
  if (diagnostic.labels.some((label) => /exact print verified/i.test(label))) {
    return 'Exact print verified'
  }
  if (diagnostic.labels.some((label) => /exact print uncertain/i.test(label))) {
    return 'Exact print uncertain'
  }
  if (diagnostic.labels.some((label) => /exact print unresolved/i.test(label))) {
    return 'Exact print unresolved'
  }
  if (diagnostic.labels.some((label) => /base print selected/i.test(label))) {
    return 'Base print selected'
  }
  if (diagnostic.labels.some((label) => /several equivalent/i.test(label))) {
    return 'Several prints'
  }
  if (diagnostic.labels.some((label) => /no verified equivalent/i.test(label))) {
    return 'No base print'
  }
  if (diagnostic.status === 'success') return 'Likely correct'
  if (diagnostic.labels.some((label) => /unresolved|missing/i.test(label))) {
    return 'Unresolved'
  }
  if (diagnostic.labels.some((label) => /low.*confidence/i.test(label))) {
    return 'Low confidence'
  }
  if (diagnostic.labels.some((label) => /quantity|qty/i.test(label))) {
    return 'Qty guessed'
  }
  if (diagnostic.labels.some((label) => /multiple|print/i.test(label))) {
    return 'Multiple prints'
  }

  return diagnostic.labels[0] ?? 'Review'
}

function sectionCountDiagnostics(
  deckText: string,
  rows: ParsedDecklistLine[]
) {
  const diagnostics = new Map<number, LineDiagnostic>()
  const totalsByCategory = new Map(
    CATEGORY_ORDER.map((category) => [
      category,
      countParsedDecklistRowsByCategory(rows, category),
    ])
  )
  const totalCards = countParsedDecklistRows(rows)

  deckText.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim()
    const lineNumber = index + 1
    const headerMatch = line.match(
      /^(pokemon|pok\u00e9mon|trainer|energy|total cards)\s*:\s*(\d+)/i
    )

    if (!headerMatch) return

    const header = headerMatch[1]?.toLowerCase()
    const declaredTotal = Number(headerMatch[2])
    const category =
      header === 'pokemon' || header === 'pok\u00e9mon'
        ? 'Pokemon'
        : header === 'trainer'
          ? 'Trainer'
          : header === 'energy'
            ? 'Energy'
            : null
    const actualTotal = category
      ? totalsByCategory.get(category) ?? 0
      : totalCards

    if (declaredTotal === actualTotal) return

    diagnostics.set(lineNumber, {
      lineNumber,
      status: 'warning',
      symbol: STATUS_SYMBOLS.warning,
      labels: [`Count ${declaredTotal}/${actualTotal}`],
    })
  })

  return diagnostics
}

function copyTextFallback(text: string) {
  const textarea = document.createElement('textarea')

  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export default function DeckImageReview({
  imageUrl,
  imageName,
  cards,
  setCards,
  onSaveDeck,
  onReset,
}: {
  imageUrl: string
  imageName: string
  cards: ExtractedDeckCard[]
  setCards: (cards: ExtractedDeckCard[]) => void
  onSaveDeck: (
    deckName: string,
    decklist: string,
    importMetadata?: DeckImportMetadata
  ) => void
  onReset: () => void
}) {
  const [deckName, setDeckName] = useState('Imported Deck')
  const [printMode, setPrintMode] = useState<DeckPrintMode>('exact-print')
  const [modeTexts, setModeTexts] = useState<Record<DeckPrintMode, string>>(() => ({
    'exact-print': formatExtractedDecklist(cards, { printMode: 'exact-print' }),
    'base-print': formatExtractedDecklist(cards, { printMode: 'base-print' }),
  }))
  const deckText = modeTexts[printMode]
  const [feedback, setFeedback] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const diagnosticsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const merged = mergeExactDuplicateCards(cards)

    if (merged.changed) {
      setCards(merged.cards)
    }
  }, [cards, setCards])

  const parsedDeck = useMemo(
    () => parseExtractedDecklistText(deckText),
    [deckText]
  )
  const recognizedByIdentity = useMemo(() => {
    const map = new Map<string, ExtractedDeckCard>()

    for (const card of cards) {
      const modeCard = cardForPrintMode(card, printMode)

      map.set(identityKey(modeCard), modeCard)
    }

    return map
  }, [cards, printMode])
  const lineDiagnostics = useMemo(
    () =>
      parsedDeck.rows.map((row) =>
        lineDiagnosticFor(row, recognizedByIdentity, printMode)
      ),
    [parsedDeck.rows, printMode, recognizedByIdentity]
  )
  const diagnosticsByLine = useMemo(() => {
    const map = sectionCountDiagnostics(deckText, parsedDeck.rows)

    for (const diagnostic of lineDiagnostics) {
      map.set(diagnostic.lineNumber, diagnostic)
    }

    for (const error of parsedDeck.errors) {
      map.set(error.lineNumber, {
        lineNumber: error.lineNumber,
        status: 'danger',
        symbol: STATUS_SYMBOLS.danger,
        labels: [error.message],
      })
    }

    return map
  }, [deckText, lineDiagnostics, parsedDeck.errors, parsedDeck.rows])
  const editorLines = useMemo(
    () => deckText.split(/\r?\n/),
    [deckText]
  )
  const totalCards = useMemo(
    () => countParsedDecklistRows(parsedDeck.rows),
    [parsedDeck.rows]
  )
  const deckQuantityStatus = validateDeckQuantityTotal(totalCards)
  const warningCount = lineDiagnostics.filter(
    (diagnostic) => diagnostic.status !== 'success'
  ).length
  const hasParseErrors = parsedDeck.errors.length > 0

  const syncDiagnosticsScroll = () => {
    if (!textareaRef.current || !diagnosticsRef.current) return

    diagnosticsRef.current.scrollTop = textareaRef.current.scrollTop
  }

  const copyDecklist = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(deckText)
      } else {
        copyTextFallback(deckText)
      }

      setFeedback('Decklist copied')
    } catch {
      setFeedback('Copy failed. Select the list and copy manually.')
    }

    window.setTimeout(() => setFeedback(''), 1800)
  }

  const updateDeckText = (value: string) => {
    setModeTexts((current) => ({
      ...current,
      [printMode]: value,
    }))
  }

  const changePrintMode = (nextMode: DeckPrintMode) => {
    if (nextMode === printMode) return

    setPrintMode(nextMode)
    setFeedback(`${PRINT_MODE_LABELS[nextMode]} output selected.`)
    window.setTimeout(() => setFeedback(''), 1800)
  }

  const saveDeck = () => {
    if (hasParseErrors) {
      setFeedback('Fix decklist parsing errors before saving.')
      window.setTimeout(() => setFeedback(''), 2200)
      return
    }

    if (parsedDeck.rows.length === 0 || totalCards <= 0) {
      setFeedback('Add at least one parsable card before saving.')
      window.setTimeout(() => setFeedback(''), 2200)
      return
    }

    if (deckQuantityStatus === 'invalid') {
      setFeedback(
        `Quantity extraction failed: total ${totalCards} is outside the reviewable 55–65 range.`
      )
      window.setTimeout(() => setFeedback(''), 2600)
      return
    }

    onSaveDeck(deckName.trim() || 'Imported Deck', deckText.trim(), {
      selectedPrintMode: printMode,
      recognizedPrints: cards
        .map((card) => card.recognizedPrint)
        .filter((print): print is NonNullable<typeof print> => Boolean(print)),
      basePrints: cards
        .map((card) => card.basePrint)
        .filter((print): print is NonNullable<typeof print> => Boolean(print)),
    })
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <p
          role="status"
          className="motion-success-pop rounded-xl border border-[var(--success-border)] bg-[var(--success-soft)] px-4 py-3 text-sm font-semibold text-[var(--success-text)]"
        >
          {feedback}
        </p>
      )}

      <NestedPanel variant="compact" className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-inset)]">
          {/* Blob previews are local-only and cannot be optimized by Next Image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={`Uploaded deck image preview: ${imageName}`}
            className="max-h-72 w-full object-contain"
          />
        </div>

        <p className="type-metadata truncate text-[var(--text-muted)]">
          {imageName}
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <MetricTile
            label="Total Cards"
            value={totalCards}
            detail={totalCards === 60 ? 'Ready' : 'Expected 60'}
            className={cn(
              'border-2',
              totalCards === 60
                ? 'border-[var(--success-border)] bg-[var(--success-soft)]'
                : 'border-[var(--loss-border)] bg-[var(--loss-soft)]'
            )}
            valueClassName="text-3xl"
          />
          {CATEGORY_ORDER.map((category) => (
            <MetricTile
              key={category}
              label={CATEGORY_LABELS[category]}
              value={countParsedDecklistRowsByCategory(parsedDeck.rows, category)}
            />
          ))}
        </div>
      </NestedPanel>

      {(totalCards !== 60 || warningCount > 0 || hasParseErrors) && (
        <div className="space-y-2">
          {totalCards !== 60 && (
            <EmptyState
              className={cn(
                deckQuantityStatus === 'invalid'
                  ? 'border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss-text)]'
                  : 'border-[var(--tie-border)] bg-[var(--tie-soft)] text-[var(--tie-text)]'
              )}
            >
              {deckQuantityStatus === 'invalid'
                ? `Quantity extraction failed: total ${totalCards} is outside 55–65. Review flagged rows before saving.`
                : `Total cards is ${totalCards}; expected 60. Review uncertain quantities before saving.`}
            </EmptyState>
          )}

          {warningCount > 0 && (
            <EmptyState className="border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss-text)]">
              {warningCount} decklist lines need review for confidence, print,
              quantity, or legality.
            </EmptyState>
          )}

          {hasParseErrors && (
            <EmptyState className="border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss-text)]">
              {parsedDeck.errors.length} line parsing issue
              {parsedDeck.errors.length === 1 ? '' : 's'} must be fixed before
              saving.
            </EmptyState>
          )}
        </div>
      )}

      <div>
        <FieldLabel>Deck Name</FieldLabel>
        <TextInput
          value={deckName}
          onChange={(event) => setDeckName(event.target.value)}
          placeholder="Deck Name"
          aria-label="Imported deck name"
        />
      </div>

      <NestedPanel variant="compact" className="space-y-3">
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <FieldLabel>Prints</FieldLabel>
              <p className="type-helper text-[var(--text-muted)]">
                {PRINT_MODE_HELPER[printMode]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['exact-print', 'base-print'] as const).map((mode) => (
                <Button
                  key={mode}
                  tone={mode === printMode ? 'primary' : 'secondary'}
                  onClick={() => changePrintMode(mode)}
                  aria-pressed={mode === printMode}
                >
                  {PRINT_MODE_LABELS[mode]}
                </Button>
              ))}
            </div>
          </div>

          <FieldLabel>Editable TCGL Decklist</FieldLabel>
          <div className="grid min-h-[520px] grid-cols-[minmax(0,1fr)_minmax(8.5rem,14rem)] overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-inset)]">
            <div className="min-w-0">
              <TextareaField
                ref={textareaRef}
                value={deckText}
                onChange={(event) => updateDeckText(event.target.value)}
                onScroll={syncDiagnosticsScroll}
                aria-label="Editable extracted TCGL decklist"
                className="h-[520px] min-h-[520px] resize-none rounded-none border-0 bg-transparent font-mono text-sm leading-6 shadow-none focus-visible:ring-0"
                spellCheck={false}
              />
            </div>

            <div
              ref={diagnosticsRef}
              aria-label="Line diagnostics"
              className="h-[520px] overflow-hidden border-l border-[var(--surface-border)] bg-[var(--surface-base)] font-mono text-[11px] leading-6"
            >
              <div className="py-2">
                {editorLines.map((line, index) => {
                  const lineNumber = index + 1
                  const diagnostic = diagnosticsByLine.get(lineNumber)
                  const isHeader =
                    /^\s*(pokemon|pok\u00e9mon|trainer|energy|total cards)\s*:/i.test(line)
                  const isBlank = line.trim().length === 0

                  if (!diagnostic || isBlank || (isHeader && diagnostic.status === 'success')) {
                    return (
                      <div
                        key={lineNumber}
                        className="h-6 px-2 text-transparent"
                        aria-hidden
                      >
                        .
                      </div>
                    )
                  }

                  return (
                    <div
                      key={lineNumber}
                      className={cn(
                        'h-6 truncate px-2',
                        diagnostic.status === 'success' && 'text-[var(--success-text)]',
                        diagnostic.status === 'warning' && 'text-[var(--tie-text)]',
                        diagnostic.status === 'danger' && 'text-[var(--loss-text)]'
                      )}
                      title={diagnostic.labels.join(' | ')}
                    >
                      <span aria-hidden>{diagnostic.symbol}</span>{' '}
                      {compactDiagnosticLabel(diagnostic)}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <p className="type-metadata text-[var(--text-muted)]">
            Edit the TCGL text directly; diagnostics stay aligned with the line
            they describe.
          </p>
        </div>
      </NestedPanel>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button tone="secondary" onClick={copyDecklist}>
            Copy List
          </Button>
          <Button tone="primary" onClick={saveDeck}>
            Save Deck
          </Button>
        </div>

        <Button tone="ghost" className="w-full" onClick={onReset}>
          Use a Different Image
        </Button>
      </div>
    </div>
  )
}
