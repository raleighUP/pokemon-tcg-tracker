import { ChangeEvent, useEffect, useRef, useState } from 'react'

import { Button, EmptyState, NestedPanel } from '@/components/ui'
import { recognizeDeckImage } from '@/lib/deck-recognition'
import type { BrowserDeckImageRecognitionResult } from '@/lib/deck-image-recognition'
import { parseDeckImageMock } from '@/lib/deck-image-parser'
import type { DeckImportMetadata, ExtractedDeckCard } from '@/types'
import DeckImageCropDebugView from './DeckImageCropDebugView'
import DeckImageReview from './DeckImageReview'

const ENABLE_DECK_IMAGE_DEBUG = process.env.NODE_ENV === 'development'
const ENABLE_MOCK_FALLBACK = process.env.NODE_ENV === 'development'

export default function DeckImageImporter({
  onSaveDeck,
}: {
  onSaveDeck: (
    deckName: string,
    decklist: string,
    importMetadata?: DeckImportMetadata
  ) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageName, setImageName] = useState('')
  const [cards, setCards] = useState<ExtractedDeckCard[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [message, setMessage] = useState('')
  const [canUseMockFallback, setCanUseMockFallback] = useState(false)
  const [debugResult, setDebugResult] =
    useState<BrowserDeckImageRecognitionResult | null>(null)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const resetImporter = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)

    setImageUrl('')
    setImageName('')
    setCards([])
    setMessage('')
    setCanUseMockFallback(false)
    setDebugResult(null)
  }

  const useMockFallback = async () => {
    setIsExtracting(true)

    try {
      const extractedCards = await parseDeckImageMock()
      setCards(extractedCards)
      setCanUseMockFallback(false)
      setDebugResult(null)
      setMessage('Development mock extraction loaded. Review carefully before saving.')
    } catch {
      setCards([])
      setMessage('Top Cut could not prepare the development mock extraction.')
    } finally {
      setIsExtracting(false)
    }
  }

  const startBlankReview = () => {
    setCards([
      {
        id: `manual-image-row-${Date.now()}`,
        quantity: 1,
        name: '',
        setCode: '',
        cardNumber: '',
        category: 'Pokemon',
        confidence: 0,
        legalityStatus: 'unknown',
        notes: ['Manual row started after local recognition did not finish.'],
      },
    ])
    setCanUseMockFallback(false)
    setDebugResult(null)
    setMessage('Manual review row ready.')
  }

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (imageUrl) URL.revokeObjectURL(imageUrl)

    const nextImageUrl = URL.createObjectURL(file)

    setImageUrl(nextImageUrl)
    setImageName(file.name)
    setMessage('')
    setCanUseMockFallback(false)
    setDebugResult(null)
    setIsExtracting(true)

    try {
      const requestedStrategy = new URLSearchParams(window.location.search).get(
        'deckImageStrategy'
      )
      const sourceType = requestedStrategy === 'physical' || requestedStrategy === 'digital'
        ? requestedStrategy
        : 'auto'
      const result = await recognizeDeckImage(file, {
        sourceType,
        sourceLanguage: 'unknown',
        debug: ENABLE_DECK_IMAGE_DEBUG,
      })

      if (result.entries.length === 0) {
        throw new Error('No local matches were produced.')
      }

      setCards(result.entries)
      setDebugResult(result.debug?.localRecognition ?? null)
      if (ENABLE_DECK_IMAGE_DEBUG) {
        ;(window as typeof window & {
          __topCutDeckImageRecognition?: BrowserDeckImageRecognitionResult | null
        }).__topCutDeckImageRecognition = result.debug?.localRecognition ?? null
      }
      setMessage(
        `Experimental local recognition found ${result.entries.length} entries from ${result.detectedCandidateCount} candidate crops, estimated ${result.estimatedTotalCards} total cards.`
      )
    } catch (error) {
      setCards([])
      setDebugResult(null)
      setCanUseMockFallback(ENABLE_MOCK_FALLBACK)
      setMessage(
        error instanceof Error
          ? `Local recognition could not finish: ${error.message}`
          : 'Local recognition could not finish.'
      )
    } finally {
      setIsExtracting(false)
    }
  }

  const saveDeck = (
    deckName: string,
    decklist: string,
    importMetadata?: DeckImportMetadata
  ) => {
    onSaveDeck(deckName, decklist, importMetadata)
    resetImporter()
    setMessage('Deck saved from image import.')
  }

  return (
    <NestedPanel variant="compact" className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="type-section-title text-[var(--text-primary)]">
            Deck Picture Import
          </h3>
          <p className="type-helper mt-1 text-[var(--text-muted)]">
            Upload a local image and review experimental local recognition.
          </p>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-xl border border-[var(--success-border)] bg-[var(--success-soft)] px-4 py-3 text-sm font-semibold text-[var(--success-text)]"
        >
          {message}
        </p>
      )}

      {!imageUrl && (
        <div className="space-y-3">
          <EmptyState>
            Images stay on this device. This experimental version compares
            detected crops to the local fixture card image cache.
          </EmptyState>

          <Button
            tone="secondary"
            className="w-full"
            onClick={() => inputRef.current?.click()}
          >
            Upload Deck Picture
          </Button>
        </div>
      )}

      {imageUrl && isExtracting && (
        <EmptyState>Running experimental local recognition...</EmptyState>
      )}

      {imageUrl && !isExtracting && cards.length === 0 && (
        <div className="space-y-3">
          <EmptyState>
            Local recognition did not produce review rows. You can retry with a
            clearer image, enter cards manually after resetting, or use mock data
            while developing this flow.
          </EmptyState>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button tone="secondary" onClick={resetImporter}>
              Try Another Image
            </Button>
            <Button tone="secondary" onClick={startBlankReview}>
              Start Manual Review
            </Button>
            {canUseMockFallback && (
              <Button tone="ghost" onClick={useMockFallback}>
                Use Dev Mock Data
              </Button>
            )}
          </div>
        </div>
      )}

      {imageUrl && !isExtracting && cards.length > 0 && (
        <>
          {ENABLE_DECK_IMAGE_DEBUG && (
            <>
              {debugResult && (
                <NestedPanel variant="compact" className="space-y-3">
                  <div>
                    <h3 className="type-section-title text-[var(--text-primary)]">
                      Local Recognition Debug
                    </h3>
                    <p className="type-helper mt-1 text-[var(--text-muted)]">
                      Experimental matcher diagnostics, not a final decklist.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Detected</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.candidateCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Matched</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.matchedCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Unresolved</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.unresolvedCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Rejected</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.rejectedCropCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Merged</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.mergedCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Rows</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.finalReviewRowCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Est. Qty</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.estimatedTotalQuantity}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[var(--surface-border)] p-3">
                      <p className="type-metadata text-[var(--text-muted)]">Unknown Qty</p>
                      <p className="type-section-title text-[var(--text-primary)]">
                        {debugResult.unknownQuantityCount}
                      </p>
                    </div>
                  </div>

                  {debugResult.globalBadgePattern && (
                    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-inset)] p-3">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Global badge pattern: {debugResult.globalBadgePattern.zone}
                      </p>
                      <p className="type-metadata text-[var(--text-muted)]">
                        Region{' '}
                        {(debugResult.globalBadgePattern.relativeBounds.width * 100).toFixed(0)}
                        % x{' '}
                        {(debugResult.globalBadgePattern.relativeBounds.height * 100).toFixed(0)}
                        % from {debugResult.globalBadgePattern.sampleCount}/
                        {debugResult.globalBadgePattern.candidateCount} candidate badges.
                      </p>
                    </div>
                  )}

                  <div className="max-h-64 space-y-2 overflow-auto pr-1">
                    {debugResult.debugMatches.map((match) => (
                      <div
                        key={match.candidateId}
                        className="rounded-xl border border-[var(--surface-border)] px-3 py-2"
                      >
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {match.candidateId}: {match.status} -{' '}
                          {match.topMatch ?? 'manual review'}
                        </p>
                        <p className="type-metadata text-[var(--text-muted)]">
                          Qty {match.quantity} ({match.quantitySource})
                          {`, qty conf ${(match.quantityConfidence * 100).toFixed(0)}%`}
                          {typeof match.confidence === 'number'
                            ? `, ${(match.confidence * 100).toFixed(1)}%`
                            : ''}
                          {typeof match.threshold === 'number'
                            ? `, threshold ${(match.threshold * 100).toFixed(0)}%`
                            : ''}
                          {match.mergedIntoCandidateId
                            ? `, merged into ${match.mergedIntoCandidateId}`
                            : ''}
                          {match.closeMatch ? ', close match' : ''}
                        </p>
                        {match.topCandidateMatches.length > 0 && (
                          <p className="type-metadata text-[var(--text-muted)]">
                            Top 5:{' '}
                            {match.topCandidateMatches
                              .map(
                                (candidate) =>
                                  `${candidate.name} ${candidate.setCode} ${candidate.cardNumber} (${(
                                    candidate.confidence * 100
                                  ).toFixed(0)}%)`
                              )
                              .join('; ')}
                          </p>
                        )}
                        {match.badgeBounds && (
                          <p className="type-metadata text-[var(--text-muted)]">
                            Badge {Math.round(match.badgeBounds.x)},{' '}
                            {Math.round(match.badgeBounds.y)},{' '}
                            {Math.round(match.badgeBounds.width)}x
                            {Math.round(match.badgeBounds.height)}
                          </p>
                        )}
                        <p className="type-metadata text-[var(--text-muted)]">
                          Badge {match.quantityDiagnostics.badgeFound ? 'found' : 'not found'}
                          {`; parsed ${match.quantityDiagnostics.parsedValue}`}
                          {`; confidence ${(
                            match.quantityDiagnostics.confidence * 100
                          ).toFixed(0)}%`}
                          {match.quantityDiagnostics.failureReason
                            ? `; ${match.quantityDiagnostics.failureReason}`
                            : ''}
                          {match.quantityDiagnostics.selectedBadgeZone
                            ? `; zone ${match.quantityDiagnostics.selectedBadgeZone}`
                            : ''}
                          {match.quantityDiagnostics.globalBadgePatternApplied
                            ? '; global pattern applied'
                            : ''}
                          {match.quantityDiagnostics.rejectedBadgeZones?.length
                            ? `; rejected zones ${match.quantityDiagnostics.rejectedBadgeZones.length}`
                            : ''}
                        </p>
                        {(match.quantityDiagnostics.rawTemplateCandidates?.length ||
                          match.quantityDiagnostics.rawLegacyCandidates?.length) && (
                          <p className="type-metadata text-[var(--text-muted)]">
                            Raw template:{' '}
                            {match.quantityDiagnostics.rawTemplateCandidates
                              ?.map(
                                (candidate) =>
                                  `${candidate.value} (${Math.round(candidate.confidence * 100)}%)`
                              )
                              .join(', ') || 'none'}
                            {'; legacy: '}
                            {match.quantityDiagnostics.rawLegacyCandidates
                              ?.map(
                                (candidate) =>
                                  `${candidate.value} (${Math.round(candidate.confidence * 100)}%, ${candidate.source})`
                              )
                              .join(', ') || 'none'}
                          </p>
                        )}
                        {match.badgePreviewDataUrl && (
                          <div className="mt-2 h-12 w-12 overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-inset)]">
                            {/* Debug canvas crop generated from the local image. */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={match.badgePreviewDataUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        {match.notes.length > 0 && (
                          <p className="type-metadata mt-1 text-[var(--text-muted)]">
                            {match.notes.join(' ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </NestedPanel>
              )}

              <DeckImageCropDebugView
                imageUrl={imageUrl}
                imageName={imageName}
              />
            </>
          )}

          <DeckImageReview
            imageUrl={imageUrl}
            imageName={imageName}
            cards={cards}
            setCards={setCards}
            onSaveDeck={saveDeck}
            onReset={resetImporter}
          />
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={selectImage}
        className="sr-only"
        aria-label="Upload deck picture"
      />
    </NestedPanel>
  )
}
