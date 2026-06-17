import {
  PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react'
import { Deck } from '@/types'
import {
  ContextActionSheet,
  EmptyState,
  IconButton,
  MenuItem,
  OverflowMenu,
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
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [openSwipeId, setOpenSwipeId] = useState<number | null>(null)
  const [contextDeck, setContextDeck] = useState<Deck | null>(null)
  const [detailDeck, setDetailDeck] = useState<Deck | null>(null)
  const [detailDragOffset, setDetailDragOffset] = useState(0)
  const [isDraggingDetailSheet, setIsDraggingDetailSheet] =
    useState(false)
  const detailDragStartY = useRef<number | null>(null)

  const getCardLineCount = (deck: Deck) =>
    deck.decklist
      .split('\n')
      .filter((line) => line.trim()).length

  const confirmDeleteDeck = (deck: Deck) => {
    if (window.confirm(`Delete ${deck.name}?`)) {
      deleteDeck(deck.id)
    }
  }

  const openDeckDetail = (deck: Deck) => {
    setSelectedDeck(deck)
    setDetailDeck(deck)
    setDetailDragOffset(0)
    setOpenSwipeId(null)
    setOpenMenuId(null)
  }

  const closeDeckDetail = () => {
    setDetailDeck(null)
    setDetailDragOffset(0)
    setIsDraggingDetailSheet(false)
  }

  const handleDetailPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    detailDragStartY.current = event.clientY
    setIsDraggingDetailSheet(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleDetailPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (detailDragStartY.current === null) return

    const deltaY = event.clientY - detailDragStartY.current
    setDetailDragOffset(Math.min(Math.max(deltaY, 0), 240))
  }

  const handleDetailPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (detailDragStartY.current === null) return

    const deltaY =
      detailDragOffset || event.clientY - detailDragStartY.current
    detailDragStartY.current = null
    setDetailDragOffset(0)
    setIsDraggingDetailSheet(false)

    if (deltaY > 86) {
      closeDeckDetail()
    }
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
                className={cn(
                  'card-row motion-surface rounded-2xl p-3',
                  isSelected &&
                    'border-[rgba(23,107,181,0.55)] bg-[rgba(23,107,181,0.1)]'
                )}
                contentClassName="bg-transparent"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="motion-press min-w-0 flex-1 cursor-pointer rounded-xl text-left"
                    onClick={() => openDeckDetail(deck)}
                  >
                    <p className="type-card-title truncate text-[var(--text-primary)] hover:text-[#b7dcfb]">
                      {deck.name}
                    </p>

                    <p className="type-metadata mt-1 truncate text-[var(--text-muted)]">
                      {deck.variant || deck.archetype || 'Other'} - {getCardLineCount(deck)} lines
                    </p>
                  </button>

                  <div className="relative shrink-0">
                    <IconButton
                      onClick={() =>
                        setOpenMenuId(openMenuId === deck.id ? null : deck.id)
                      }
                      className="h-11 w-11 rounded-xl text-lg font-bold leading-none text-[var(--text-muted)] hover:bg-white/10 hover:text-white"
                      aria-label={`${deck.name} actions`}
                    >
                      ...
                    </IconButton>

                    <OverflowMenu
                      open={openMenuId === deck.id}
                      onClose={() => setOpenMenuId(null)}
                    >
                      <MenuItem
                        onClick={() => {
                          editDeck(deck)
                          setOpenMenuId(null)
                        }}
                      >
                        Edit Deck
                      </MenuItem>

                      <MenuItem
                        onClick={() => {
                          confirmDeleteDeck(deck)
                          setOpenMenuId(null)
                        }}
                        tone="danger"
                      >
                        Delete Deck
                      </MenuItem>
                    </OverflowMenu>
                  </div>
                </div>
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
        contentStyle={{
          transform: `translateY(${detailDragOffset}px)`,
          transitionDuration: isDraggingDetailSheet ? '0ms' : undefined,
        }}
      >
        {detailDeck && (
          <div className="flex h-full flex-col">
            <div
              className="touch-none cursor-grab px-4 pb-3 pt-2 active:cursor-grabbing"
              onPointerDown={handleDetailPointerDown}
              onPointerMove={handleDetailPointerMove}
              onPointerUp={handleDetailPointerUp}
              onPointerCancel={() => {
                detailDragStartY.current = null
                setDetailDragOffset(0)
                setIsDraggingDetailSheet(false)
              }}
            >
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
    </Panel>
  )
}
