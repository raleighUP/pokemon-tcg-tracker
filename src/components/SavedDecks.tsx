import {
  PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from 'react'
import { Deck } from '@/types'
import {
  EmptyState,
  IconButton,
  MenuItem,
  OverflowMenu,
  Panel,
  SectionHeader,
  ContextActionSheet,
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
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetSize, setSheetSize] = useState<'half' | 'full'>('half')
  const [dragOffset, setDragOffset] = useState(0)
  const [isDraggingSheet, setIsDraggingSheet] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const [detailDeck, setDetailDeck] = useState<Deck | null>(null)
  const [detailSheetSize, setDetailSheetSize] =
    useState<'half' | 'full'>('half')
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

  const openDeckSheet = () => {
    setDragOffset(0)
    setSheetSize('half')
    setSheetOpen(true)
  }

  const closeDeckSheet = () => {
    setOpenSwipeId(null)
    setOpenMenuId(null)
    setSheetOpen(false)
    setSheetSize('half')
    setDragOffset(0)
    setIsDraggingSheet(false)
  }

  const openDeckDetail = (deck: Deck) => {
    setSelectedDeck(deck)
    closeDeckSheet()
    setDetailDeck(deck)
    setDetailSheetSize('half')
    setDetailDragOffset(0)
  }

  const closeDeckDetail = () => {
    setDetailDeck(null)
    setDetailSheetSize('half')
    setDetailDragOffset(0)
    setIsDraggingDetailSheet(false)
  }

  const handleSheetPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    dragStartY.current = event.clientY
    setIsDraggingSheet(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleSheetPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (dragStartY.current === null) return

    const deltaY = event.clientY - dragStartY.current
    const minOffset = sheetSize === 'half' ? -96 : 0
    const maxOffset = 220

    setDragOffset(Math.min(Math.max(deltaY, minOffset), maxOffset))
  }

  const handleSheetPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (dragStartY.current === null) return

    const deltaY = dragOffset || event.clientY - dragStartY.current
    dragStartY.current = null
    setDragOffset(0)
    setIsDraggingSheet(false)

    if (deltaY < -52) {
      setSheetSize('full')
      return
    }

    if (deltaY > 72) {
      if (sheetSize === 'full') {
        setSheetSize('half')
      } else {
        closeDeckSheet()
      }
    }
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
    const minOffset = detailSheetSize === 'half' ? -96 : 0
    const maxOffset = 220

    setDetailDragOffset(Math.min(Math.max(deltaY, minOffset), maxOffset))
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

    if (deltaY < -52) {
      setDetailSheetSize('full')
      return
    }

    if (deltaY > 72) {
      if (detailSheetSize === 'full') {
        setDetailSheetSize('half')
      } else {
        closeDeckDetail()
      }
    }
  }

  const selectedDeckLabel =
    selectedDeck?.name ??
    (decks.length > 0 ? 'No deck selected' : 'Add your first deck')

  return (
    <Panel className="space-y-4">
      <SectionHeader title="Saved Decks" />

      <button
        type="button"
        onClick={openDeckSheet}
        className="card-row motion-press flex w-full items-center justify-between gap-3 rounded-2xl p-4 text-left hover:bg-white/[0.055]"
      >
        <span className="min-w-0">
          <span className="type-card-title block truncate text-[var(--text-primary)]">
            {selectedDeckLabel}
          </span>

          <span className="type-metadata mt-1 block truncate text-[var(--text-muted)]">
            {decks.length} saved {decks.length === 1 ? 'deck' : 'decks'}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-2">
          <span className="text-xl leading-none text-[#6fb2ed]">^</span>
        </span>
      </button>

      {decks.length === 0 ? (
        <EmptyState>No decks saved yet.</EmptyState>
      ) : null}

      <Sheet
        open={sheetOpen}
        onClose={closeDeckSheet}
        ariaLabel="saved decks"
        className="px-3 pb-0 pt-[calc(3rem+env(safe-area-inset-top))]"
        contentClassName={cn(
          'overflow-hidden rounded-b-none rounded-t-[26px] border-b-0 will-change-transform transition-[height,max-height,transform] duration-200 ease-out',
          sheetSize === 'full'
            ? 'h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)]'
            : 'h-[52dvh] max-h-[52dvh]'
        )}
        contentStyle={{
          transform: `translateY(${dragOffset}px)`,
          transitionDuration: isDraggingSheet ? '0ms' : undefined,
        }}
      >
        <div
          className="touch-none cursor-grab px-4 pb-4 pt-2 active:cursor-grabbing"
          onPointerDown={handleSheetPointerDown}
          onPointerMove={handleSheetPointerMove}
          onPointerUp={handleSheetPointerUp}
          onPointerCancel={() => {
            dragStartY.current = null
            setDragOffset(0)
            setIsDraggingSheet(false)
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="type-section-title truncate text-[var(--text-primary)]">
                Saved Decks
              </h3>
              <p className="type-metadata mt-1 text-[var(--text-muted)]">
                {sheetSize === 'full' ? 'Full view' : 'Pull up for full view'}
              </p>
            </div>

          </div>
        </div>

        <div className="h-[calc(100%-4.75rem)] overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                      isSelected
                        ? 'border-[rgba(23,107,181,0.55)] bg-[rgba(23,107,181,0.12)] shadow-[0_16px_38px_rgba(23,107,181,0.13)]'
                        : ''
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

                        {isSelected && (
                          <span className="sr-only">Currently selected</span>
                        )}
                      </button>

                      <div className="relative shrink-0">
                        <IconButton
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === deck.id ? null : deck.id
                            )
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
                              closeDeckSheet()
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
        </div>
      </Sheet>

      <Sheet
        open={Boolean(detailDeck)}
        onClose={closeDeckDetail}
        ariaLabel="decklist"
        className="px-3 pb-0 pt-[calc(3rem+env(safe-area-inset-top))]"
        contentClassName={cn(
          'overflow-hidden rounded-b-none rounded-t-[26px] border-b-0 will-change-transform transition-[height,max-height,transform] duration-200 ease-out',
          detailSheetSize === 'full'
            ? 'h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)]'
            : 'h-[56dvh] max-h-[56dvh]'
        )}
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
              <div className="space-y-3">
                <h3 className="truncate text-[1.35rem] font-[760] leading-tight text-white">
                  {detailDeck.name}
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <div className="card-data rounded-xl px-3 py-2">
                    <p className="type-metadata text-[var(--text-muted)]">
                      Archetype
                    </p>
                    <p className="type-card-title mt-0.5 truncate text-white">
                      {detailDeck.archetype || 'Other'}
                    </p>
                  </div>

                  <div className="card-data rounded-xl px-3 py-2">
                    <p className="type-metadata text-[var(--text-muted)]">
                      Lines
                    </p>
                    <p className="type-card-title mt-0.5 text-white">
                      {getCardLineCount(detailDeck)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <pre
              className={cn(
                'flex-1 whitespace-pre-wrap border-t border-white/10 px-4 py-3 font-mono text-sm leading-6 text-[var(--text-secondary)]',
                detailSheetSize === 'full' ? 'overflow-auto' : 'overflow-hidden'
              )}
            >
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
