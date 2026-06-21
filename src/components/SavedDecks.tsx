import { useState } from 'react'
import { Deck } from '@/types'
import { normalizeComfort } from '@/utils/comfort'
import {
  ContextActionSheet,
  ConfirmationDialog,
  EmptyState,
  Panel,
  SectionHeader,
  Sheet,
  SwipeActionRow,
  cn,
} from '@/components/ui'

type Props = {
  decks: Deck[]
  setSelectedDeck: (deck: Deck) => void
  selectedDeck: Deck | null
  editDeck: (deck: Deck) => void
  deleteDeck: (id: number) => void
}

export default function SavedDecks({
  decks,
  setSelectedDeck,
  editDeck,
  deleteDeck,
  selectedDeck,
}: Props) {
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null)
  const [contextDeck, setContextDeck] = useState<Deck | null>(null)
  const [detailDeck, setDetailDeck] = useState<Deck | null>(null)
  const [pendingDeleteDeck, setPendingDeleteDeck] = useState<Deck | null>(null)

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
    setDetailDeck(null)
  }

  return (
    <Panel className="space-y-4">
      <SectionHeader title="Saved Decks" />

      {decks.length === 0 ? (
        <EmptyState>No decks saved yet.</EmptyState>
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
                surface="solid"
                contentClassName={cn(
                  isSelected &&
                    'shadow-[inset_0_0_0_1px_rgba(23,107,181,0.55)]'
                )}
              >
                <button
                  type="button"
                  className="motion-press flex min-h-[64px] w-full items-center rounded-2xl p-3 text-left hover:bg-white/[0.04]"
                  onClick={() => openDeckDetail(deck)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="type-card-title block truncate text-[var(--text-primary)] hover:text-[#b7dcfb]">
                      {deck.name}
                    </span>

                    <span className="type-metadata mt-1 block truncate text-[var(--text-muted)]">
                      {deck.variant || deck.archetype || 'Other'} - {normalizeComfort(deck.comfort)}/5
                    </span>
                  </span>
                </button>
              </SwipeActionRow>
            )
          })}
        </div>
      )}

      <Sheet
        open={Boolean(detailDeck)}
        onClose={closeDeckDetail}
        ariaLabel="decklist"
        className="px-3 pb-0 pt-[calc(3rem+env(safe-area-inset-top))]"
        contentClassName="overflow-hidden rounded-b-none rounded-t-[26px] border-b-0 will-change-transform transition-transform duration-200 ease-out h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)]"
      >
        {detailDeck && (
          <div className="flex h-full flex-col">
            <div className="px-4 pb-4 pt-1">
              <h3 className="truncate text-[1.35rem] font-[760] leading-tight text-white">
                {detailDeck.name}
              </h3>

              <p className="type-card-title mt-1 truncate text-[var(--text-secondary)]">
                Archetype - {detailDeck.archetype || 'Other'}
              </p>
            </div>

            <pre className="flex-1 overflow-auto whitespace-pre-wrap border-t border-white/10 px-4 py-3 font-mono text-sm leading-6 text-[var(--text-secondary)]">
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
