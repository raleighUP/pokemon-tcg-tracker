import { Deck } from '@/types'
import {
  useMemo,
  useState,
} from 'react'
import {
  Button,
  ContextActionSheet,
  EmptyState,
  NestedPanel,
  SectionHeader,
  SelectField,
  Sheet,
  SwipeActionRow,
  cn,
} from '@/components/ui'

type Change = {
  cardName: string
  diff: number
  oldQty: number
  newQty: number
}

type Category =
  | 'Pokemon'
  | 'Supporters'
  | 'Items'
  | 'Tools'
  | 'Stadiums'
  | 'Energies'

type CategorizedChange = Change & {
  category: Category
}

type Props = {
  compareDeck1: string
  setCompareDeck1: (value: string) => void
  compareDeck2: string
  setCompareDeck2: (value: string) => void
  decks: Deck[]
  changes: Change[]
  onAddFirstDeck?: () => void
}

const categoryOrder: Category[] = [
  'Pokemon',
  'Supporters',
  'Items',
  'Tools',
  'Stadiums',
  'Energies',
]

const supporterNames = [
  'Arven',
  "Boss's Orders",
  "Cynthia's Ambition",
  'Iono',
  "Lillie's Determination",
  'Marnie',
  "Professor's Research",
  'Professor Turo',
  "Roxanne",
  'Sada',
  "Sabrina's Gaze",
]

const toolKeywords = [
  'Amulet',
  'Band',
  'Baton',
  'Belt',
  'Board',
  'Booster Energy',
  'Cape',
  'Capsule',
  'Charm',
  'Helmet',
  'Stone',
  'Technical Machine',
  'Tool',
  'Vest',
]

const stadiumKeywords = [
  'Academy',
  'Arena',
  'Beach',
  'Cave',
  'City',
  'Court',
  'Gym',
  'Plaza',
  'Pokestop',
  'School',
  'Stadium',
  'Temple',
  'Town',
  'Tower',
]

const categoryRank = (category: Category) =>
  categoryOrder.indexOf(category)

function formatDelta(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function cleanDeckLine(line: string) {
  const parts = line.trim().split(/\s+/)

  if (parts.length <= 1) return line.trim()

  return parts.length > 3
    ? parts.slice(1, -2).join(' ')
    : parts.slice(1).join(' ')
}

function classifyTrainerCard(cardName: string): Category {
  const normalized = cardName.toLowerCase()

  if (
    stadiumKeywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    )
  ) {
    return 'Stadiums'
  }

  if (
    toolKeywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    )
  ) {
    return 'Tools'
  }

  if (
    supporterNames.some((name) =>
      normalized.includes(name.toLowerCase())
    )
  ) {
    return 'Supporters'
  }

  return 'Items'
}

function buildCategoryMap(deck?: Deck) {
  const categories = new Map<string, Category>()
  let section: 'pokemon' | 'trainer' | 'energy' | null = null

  if (!deck) return categories

  deck.decklist
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const normalized = line.toLowerCase()

      if (
        normalized.startsWith('pokemon:') ||
        normalized.startsWith('pokémon:') ||
        normalized.startsWith('pokÃ©mon:')
      ) {
        section = 'pokemon'
        return
      }

      if (normalized.startsWith('trainer:')) {
        section = 'trainer'
        return
      }

      if (normalized.startsWith('energy:')) {
        section = 'energy'
        return
      }

      const cardName = cleanDeckLine(line)

      if (!cardName) return

      if (section === 'pokemon') {
        categories.set(cardName, 'Pokemon')
      } else if (section === 'energy') {
        categories.set(cardName, 'Energies')
      } else {
        categories.set(cardName, classifyTrainerCard(cardName))
      }
    })

  return categories
}

function sortBySleevingOrder(a: CategorizedChange, b: CategorizedChange) {
  const categoryDiff = categoryRank(a.category) - categoryRank(b.category)

  if (categoryDiff !== 0) return categoryDiff

  return a.cardName.localeCompare(b.cardName)
}

export default function CompareDecks({
  compareDeck1,
  setCompareDeck1,
  compareDeck2,
  setCompareDeck2,
  decks,
  changes,
  onAddFirstDeck,
}: Props) {
  const [detailChange, setDetailChange] =
    useState<Change | null>(null)
  const [changedCardsOpen, setChangedCardsOpen] = useState(false)

  const deckA = decks.find((deck) => deck.name === compareDeck1)
  const deckB = decks.find((deck) => deck.name === compareDeck2)
  const hasSelection = Boolean(compareDeck1 && compareDeck2)
  const emptyStateMessage =
    decks.length === 0
      ? 'Save decks before comparing decklists.'
      : !hasSelection
      ? 'Select two decks to compare.'
      : 'No differences found.'

  const categorizedChanges = useMemo(() => {
    const deckACategories = buildCategoryMap(deckA)
    const deckBCategories = buildCategoryMap(deckB)

    return changes.map((change) => ({
      ...change,
      category:
        deckBCategories.get(change.cardName) ??
        deckACategories.get(change.cardName) ??
        'Items',
    }))
  }, [changes, deckA, deckB])

  const categoryTotals = useMemo(() => {
    const totals = Object.fromEntries(
      categoryOrder.map((category) => [
        category,
        { oldQty: 0, newQty: 0 },
      ])
    ) as Record<Category, { oldQty: number; newQty: number }>

    categorizedChanges.forEach((change) => {
      totals[change.category].oldQty += change.oldQty
      totals[change.category].newQty += change.newQty
    })

    return totals
  }, [categorizedChanges])

  const sortedRemovedChanges = useMemo(
    () =>
      categorizedChanges
        .filter((change) => change.diff < 0)
        .sort(sortBySleevingOrder),
    [categorizedChanges]
  )

  const sortedAddedChanges = useMemo(
    () =>
      categorizedChanges
        .filter((change) => change.diff > 0)
        .sort(sortBySleevingOrder),
    [categorizedChanges]
  )

  const closeChangedCards = () => {
    setChangedCardsOpen(false)
  }

  const renderChangeRows = (
    title: string,
    sectionChanges: CategorizedChange[]
  ) => (
    <section className="space-y-2">
      <h3 className="type-section-title px-1 text-[var(--text-primary)]">
        {title}
      </h3>

      {sectionChanges.length === 0 ? (
        <EmptyState className="py-3">No cards.</EmptyState>
      ) : (
        sectionChanges.map((change) => (
          <SwipeActionRow
            key={`${title}-${change.cardName}`}
            open={false}
            onOpenChange={() => undefined}
            actions={[]}
              onContextOpen={() => setDetailChange(change)}
            >
              <button
                type="button"
                onClick={() => setDetailChange(change)}
                className="motion-press card-row flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-white/[0.055]"
              >
              <span className="min-w-0">
                <span className="type-card-title block truncate text-[var(--text-primary)]">
                  {change.cardName}
                </span>
              </span>

              <span
                className={cn(
                  'type-metric-value shrink-0 rounded-full px-2.5 py-1',
                  change.diff > 0
                    ? 'bg-[rgba(47,116,59,0.16)] text-[#b8dfbe]'
                    : 'bg-[rgba(160,24,24,0.16)] text-[#e9b6b6]'
                )}
              >
                {change.diff > 0 ? `+${change.diff}` : change.diff}
              </span>
            </button>
          </SwipeActionRow>
        ))
      )}
    </section>
  )

  return (
    <div className="space-y-4">
      <SectionHeader title="Compare" level={1} />

      <NestedPanel className="space-y-4 rounded-[18px] p-4">
        <h3 className="type-section-title text-[var(--text-primary)]">
          Change A to B
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            value={compareDeck1}
            onChange={(e) =>
              setCompareDeck1(e.target.value)
            }
            aria-label="Select Deck A"
          >
            <option value="">Select Deck A</option>

            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            value={compareDeck2}
            onChange={(e) =>
              setCompareDeck2(e.target.value)
            }
            aria-label="Select Deck B"
          >
            <option value="">Select Deck B</option>

            {decks.map((deck) => (
              <option key={deck.id} value={deck.name}>
                {deck.name}
              </option>
            ))}
          </SelectField>
        </div>

          <Button
          onClick={() => setChangedCardsOpen(true)}
          tone="primary"
          className="min-h-[48px] w-full"
        >
          Changed Cards
        </Button>
      </NestedPanel>

      <NestedPanel variant="compact" className="rounded-[18px] p-0">
        <div className="px-4 py-3">
          <span className="type-metadata block text-[var(--text-muted)]">
            Changed Cards by Type
          </span>
        </div>

        <div className="space-y-2 border-t border-white/10 px-4 py-3">
          <div className="grid grid-cols-[1fr_4.25rem_4.25rem] items-center gap-3">
            <span aria-hidden="true" />
            <span className="type-metadata text-right text-[var(--text-muted)]">
              Deck A
            </span>
            <span className="type-metadata text-right text-[var(--text-muted)]">
              Deck B
            </span>
          </div>

          {categoryOrder.map((category) => {
            const total = categoryTotals[category]
            const deckADelta = total.oldQty - total.newQty
            const deckBDelta = total.newQty - total.oldQty

            return (
              <div
                key={category}
                className="grid grid-cols-[1fr_4.25rem_4.25rem] items-center gap-3"
              >
                <span className="type-card-title text-[var(--text-secondary)]">
                  {category}
                </span>
                <span
                  className={cn(
                    'type-card-title text-right',
                    deckADelta > 0 && 'text-[#b8dfbe]',
                    deckADelta < 0 && 'text-[#e9b6b6]',
                    deckADelta === 0 && 'text-[var(--text-primary)]'
                  )}
                >
                  {formatDelta(deckADelta)}
                </span>
                <span
                  className={cn(
                    'type-card-title text-right',
                    deckBDelta > 0 && 'text-[#b8dfbe]',
                    deckBDelta < 0 && 'text-[#e9b6b6]',
                    deckBDelta === 0 && 'text-[var(--text-primary)]'
                  )}
                >
                  {formatDelta(deckBDelta)}
                </span>
              </div>
            )
          })}
        </div>
      </NestedPanel>

      <Sheet
        open={changedCardsOpen}
        onClose={closeChangedCards}
        ariaLabel="changed cards"
        className="px-3 pb-0 pt-[calc(3rem+env(safe-area-inset-top))]"
        contentClassName="h-[calc(100dvh-3rem)] max-h-[calc(100dvh-3rem)] overflow-hidden rounded-b-none rounded-t-[26px] border-b-0 will-change-transform transition-transform duration-200 ease-out"
      >
        <div className="flex h-full flex-col">
          <div className="px-4 pb-4 pt-1">
            <h3 className="truncate text-[1.35rem] font-[760] leading-tight text-white">
              Changed Cards
            </h3>
          </div>

          <div className="scrollbar-apple flex-1 space-y-5 overflow-auto border-t border-white/10 px-4 py-3">
            {changes.length === 0 ? (
              <EmptyState className="space-y-3">
                <p>{emptyStateMessage}</p>
                {decks.length === 0 && (
                  <Button
                    onClick={() => {
                      closeChangedCards()
                      onAddFirstDeck?.()
                    }}
                    tone="primary"
                    className="w-full"
                  >
                    Add Your First Deck
                  </Button>
                )}
              </EmptyState>
            ) : (
              <>
                {renderChangeRows('Remove', sortedRemovedChanges)}
                {renderChangeRows('Add', sortedAddedChanges)}
              </>
            )}
          </div>
        </div>
      </Sheet>

      <ContextActionSheet
        open={Boolean(detailChange)}
        onClose={() => setDetailChange(null)}
        title={detailChange?.cardName ?? 'Card Difference'}
        subtitle={
          compareDeck1 && compareDeck2
            ? `${compareDeck1} to ${compareDeck2}`
            : undefined
        }
        ariaLabel="card difference details"
        details={
          detailChange
            ? [
                { label: compareDeck1 || 'Deck A', value: detailChange.oldQty },
                { label: compareDeck2 || 'Deck B', value: detailChange.newQty },
                {
                  label: 'Change',
                  value:
                    detailChange.diff > 0
                      ? `+${detailChange.diff}`
                      : detailChange.diff,
                },
              ]
            : []
        }
      />
    </div>
  )
}
