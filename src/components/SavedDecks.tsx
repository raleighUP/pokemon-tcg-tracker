import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Deck } from '@/types'
import { normalizeComfort } from '@/utils/comfort'
import { getDeckExportFileName } from '@/utils/deck-export'
import {
  ContextActionSheet,
  ConfirmationDialog,
  Button,
  EmptyState,
  Panel,
  SectionHeader,
  Sheet,
  SwipeActionRow,
  cn,
} from '@/components/ui'
import DeckIdentity from './DeckIdentity'

type Props = {
  decks: Deck[]
  setSelectedDeck: (deck: Deck) => void
  selectedDeck: Deck | null
  editDeck: (deck: Deck) => void
  deleteDeck: (id: number) => void
  onAddFirstDeck?: () => void
}

const subscribeToShareCapability = () => () => undefined
const getShareCapability = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const getServerShareCapability = () => false

export default function SavedDecks({
  decks,
  setSelectedDeck,
  editDeck,
  deleteDeck,
  selectedDeck,
  onAddFirstDeck,
}: Props) {
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null)
  const [contextDeck, setContextDeck] = useState<Deck | null>(null)
  const [detailDeck, setDetailDeck] = useState<Deck | null>(null)
  const [pendingDeleteDeck, setPendingDeleteDeck] = useState<Deck | null>(null)

  const [exportFeedback, setExportFeedback] = useState('')
  const canShare = useSyncExternalStore(
    subscribeToShareCapability,
    getShareCapability,
    getServerShareCapability
  )
  const exportTimerRef = useRef<number | null>(null)
  const exportFrameRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (exportTimerRef.current) window.clearTimeout(exportTimerRef.current)
      if (exportFrameRef.current) window.cancelAnimationFrame(exportFrameRef.current)
    }
  }, [])

  const clearExportFeedback = () => {
    if (exportTimerRef.current) window.clearTimeout(exportTimerRef.current)
    if (exportFrameRef.current) window.cancelAnimationFrame(exportFrameRef.current)
    exportTimerRef.current = null
    exportFrameRef.current = null
    setExportFeedback('')
  }

  const announceExport = (message: string, persistent = false) => {
    clearExportFeedback()
    exportFrameRef.current = window.requestAnimationFrame(() => {
      setExportFeedback(message)
      exportFrameRef.current = null

      if (!persistent) {
        exportTimerRef.current = window.setTimeout(() => {
          setExportFeedback('')
          exportTimerRef.current = null
        }, 3000)
      }
    })
  }

  const copyDeckList = async (deck: Deck) => {
    clearExportFeedback()
    try {
      await navigator.clipboard.writeText(deck.decklist)
      announceExport('Deck list copied')
    } catch {
      announceExport('Unable to copy deck list. Try again.', true)
    }
  }

  const shareDeckList = async (deck: Deck) => {
    clearExportFeedback()

    if (canShare && navigator.share) {
      try {
        await navigator.share({ title: deck.name, text: deck.decklist })
        announceExport('Deck list shared')
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        announceExport('Unable to share deck list. Try again.', true)
        return
      }
    }

    try {
      const fileName = getDeckExportFileName(deck.name)
      const url = URL.createObjectURL(new Blob([deck.decklist], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      announceExport('Deck list downloaded')
    } catch {
      announceExport('Unable to download deck list. Try again.', true)
    }
  }
  const getCardLineCount = (deck: Deck) =>
    deck.decklist
      .split('\n')
      .filter((line) => line.trim()).length

  const confirmDeleteDeck = (deck: Deck) => {
    setPendingDeleteDeck(deck)
  }

  const openDeckDetail = (deck: Deck) => {
    setSelectedDeck(deck)
    setDetailDeck(deck)
    setOpenSwipeId(null)
  }

  const closeDeckDetail = () => {
    clearExportFeedback()
    setDetailDeck(null)
  }

  return (
    <Panel variant="elevated" className="space-y-4">
      <SectionHeader title="Saved Decks" />

      {decks.length === 0 ? (
        <EmptyState className="space-y-3">
          <div>
            <p className="type-card-title text-[var(--text-primary)]">
              Your deck library starts here.
            </p>
            <p className="mt-1">
              Save your current 60 so match logs, deck comparison, and Advisor
              recommendations can use it. Decks stay stored locally on this
              device.
            </p>
          </div>

          <Button
            onClick={onAddFirstDeck}
            tone="primary"
            className="w-full"
          >
            Add Your First Deck
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {decks.map((deck) => {
            const isSelected = selectedDeck?.id === deck.id

            return (
              <SwipeActionRow
                key={deck.id}
                open={openSwipeId === deck.id}
                onOpenChange={(open) =>
                  setOpenSwipeId(open ? deck.id : null)
                }
                onContextOpen={() => setContextDeck(deck)}
                actions={[
                  {
                    label: 'Edit',
                    tone: 'edit',
                    onSelect: () => editDeck(deck),
                  },
                  {
                    label: 'Delete',
                    tone: 'delete',
                    onSelect: () => confirmDeleteDeck(deck),
                  },
                ]}
                className="rounded-2xl"
                contentClassName={cn(
                  'saved-deck-card surface-card-elevated border border-[var(--surface-border)]',
                  isSelected &&
                    'shadow-[inset_0_0_0_1px_rgba(23,107,181,0.55)]'
                )}
              >
                <button
                  type="button"
                  className="motion-press flex min-h-[64px] w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-white/[0.04]"
                  onClick={() => openDeckDetail(deck)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="type-card-title block truncate text-[var(--text-primary)] hover:text-[#b7dcfb]">
                      {deck.name}
                    </span>

                    <span className="type-metadata mt-1 block truncate text-[var(--text-muted)]">
                      {deck.variant || deck.archetype || 'Other'} · {normalizeComfort(deck.comfort)}/5
                    </span>
                  </span>
                  <DeckIdentity
                    name=""
                    spriteSource={deck.variant || deck.archetype || deck.name}
                    size="expanded"
                    maxSprites={3}
                    bareSprites
                    showLabel={false}
                    className="ml-auto shrink-0"
                  />
                </button>
              </SwipeActionRow>
            )
          })}
        </div>
      )}

      <Sheet
        open={Boolean(detailDeck)}
        onClose={closeDeckDetail}
        ariaLabelledBy="saved-deck-sheet-title"
        closeLabel={detailDeck ? `Close ${detailDeck.name} deck list` : 'Close deck list'}
        className="px-3 pb-0 pt-[calc(3rem+env(safe-area-inset-top))]"
        contentClassName="overflow-hidden rounded-b-none rounded-t-[26px] border-b-0 will-change-transform transition-transform duration-200 ease-out h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)]"
      >
        {detailDeck && (
          <div className="flex h-full flex-col">
            <div className="px-4 pb-4 pt-1">
              <h3 id="saved-deck-sheet-title" className="truncate text-[1.35rem] font-[760] leading-tight text-[var(--text-primary)]">
                {detailDeck.name}
              </h3>

              <DeckIdentity
                name={detailDeck.variant || detailDeck.archetype || 'Other'}
                spriteSource={detailDeck.variant || detailDeck.archetype || detailDeck.name}
                size="standard"
                maxSprites={2}
                bareSprites
                className="type-card-title mt-1 text-[var(--text-secondary)]"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => copyDeckList(detailDeck)} tone="secondary" className="min-h-11">
                  Copy List
                </Button>
                <Button onClick={() => shareDeckList(detailDeck)} tone="secondary" className="min-h-11">
                  {canShare ? 'Share list' : 'Download list'}
                </Button>
              </div>
              <p
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={cn(
                  'type-helper text-[var(--text-secondary)]',
                  exportFeedback ? 'mt-2' : 'sr-only'
                )}
              >
                {exportFeedback}
              </p>
            </div>

            <pre className="flex-1 overflow-auto whitespace-pre-wrap border-t border-[var(--divider)] px-4 py-3 font-mono text-sm leading-6 text-[var(--text-secondary)]">
              {detailDeck.decklist}
            </pre>
          </div>
        )}
      </Sheet>

      {contextDeck && (
        <ContextActionSheet
          open={Boolean(contextDeck)}
          onClose={() => setContextDeck(null)}
          title={contextDeck.name}
          subtitle={contextDeck.variant || contextDeck.archetype || 'Other'}
          ariaLabel="deck actions"
          details={[
            {
              label: 'Archetype',
              value: contextDeck.archetype || 'Other',
            },
            {
              label: 'Variant',
              value: contextDeck.variant || 'None',
            },
            {
              label: 'Lines',
              value: getCardLineCount(contextDeck),
            },
            {
              label: 'Comfort',
              value: `${normalizeComfort(contextDeck.comfort)}/5`,
            },
          ]}
          actions={[
            {
              label: 'Edit',
              tone: 'secondary',
              onSelect: () => editDeck(contextDeck),
            },
            {
              label: 'Delete',
              tone: 'danger',
              onSelect: () => confirmDeleteDeck(contextDeck),
            },
          ]}
        />
      )}

      <ConfirmationDialog
        open={Boolean(pendingDeleteDeck)}
        onClose={() => setPendingDeleteDeck(null)}
        onConfirm={() => {
          if (pendingDeleteDeck) deleteDeck(pendingDeleteDeck.id)
        }}
        title={`Delete ${pendingDeleteDeck?.name ?? 'deck'}?`}
        description="This removes the saved deck from this device. This action cannot be undone."
      />
    </Panel>
  )
}
