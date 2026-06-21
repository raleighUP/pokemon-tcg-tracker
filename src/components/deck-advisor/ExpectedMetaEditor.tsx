import {
  AdvisorMetaDeckInput,
  MetaInputMode,
} from './types'
import { useState } from 'react'
import {
  Button,
  DisclosurePanel,
  EmptyState,
  NumberInput,
  SegmentedControl,
  SelectField,
  SwipeActionRow,
} from '@/components/ui'

type Props = {
  archetypeOptions: string[]
  eventSize: number
  metaDecks: AdvisorMetaDeckInput[]
  setMetaDecks: (metaDecks: AdvisorMetaDeckInput[]) => void
  metaInputMode: MetaInputMode
  setMetaInputMode: (mode: MetaInputMode) => void
  suggestedMeta: AdvisorMetaDeckInput[]
}

export default function ExpectedMetaEditor({
  archetypeOptions,
  eventSize,
  metaDecks,
  setMetaDecks,
  metaInputMode,
  setMetaInputMode,
  suggestedMeta,
}: Props) {
  const [metaRowsOpen, setMetaRowsOpen] = useState(true)
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null)
  const filledMetaCount = metaDecks.filter(
    (deck) => deck.name.trim() && deck.share > 0
  ).length
  const metaRowsVisible = filledMetaCount === 0 || metaRowsOpen

  const applySuggestedMeta = () => {
    setOpenRowIndex(null)
    setMetaInputMode('percent')
    setMetaDecks(suggestedMeta)
    setMetaRowsOpen(true)
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={applySuggestedMeta}
        tone="primary"
        className="w-full"
      >
        Use Suggested Meta
      </Button>

      <SegmentedControl
        value={metaInputMode}
        onChange={setMetaInputMode}
        options={[
          { label: 'Percent', value: 'percent' },
          { label: 'Players', value: 'players' },
        ]}
        buttonClassName="py-2"
      />

      <DisclosurePanel
        title="Meta Archetypes"
        description={
          filledMetaCount > 0
            ? `${filledMetaCount} entered`
            : 'No archetypes entered'
        }
        open={metaRowsVisible}
        onToggle={() => {
          if (filledMetaCount > 0) {
            if (metaRowsOpen) {
              setOpenRowIndex(null)
            }

            setMetaRowsOpen(!metaRowsOpen)
          }
        }}
        actionOpenLabel="Show"
        actionCloseLabel="Hide"
        showAction={filledMetaCount > 0}
        contentClassName="space-y-3 border-t border-white/10 px-1 pb-3 pt-3"
      >
        {metaDecks.length > 0 ? (
          <div className="space-y-2">
            {metaDecks.map((deck, index) => (
              <SwipeActionRow
                key={index}
                open={openRowIndex === index}
                onOpenChange={(open) =>
                  setOpenRowIndex(open ? index : null)
                }
                className="rounded-2xl"
                contentClassName="rounded-2xl"
                actions={[
                  {
                    label: 'Delete',
                    tone: 'delete',
                    onSelect: () => {
                      const updated = metaDecks.filter(
                        (_, metaIndex) => metaIndex !== index
                      )

                      setMetaDecks(updated)
                    },
                  },
                ]}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-1.5">
                  <SelectField
                    value={deck.name}
                    onChange={(e) => {
                      const updated = [...metaDecks]
                      updated[index].name = e.target.value
                      setMetaDecks(updated)
                    }}
                    aria-label={`Meta deck ${index + 1} archetype`}
                    className="min-h-11 rounded-xl border-[var(--surface-border)] bg-[#101012] px-3 py-2 text-base"
                  >
                    <option value="">Select archetype</option>

                    {archetypeOptions.map((archetype) => (
                      <option key={archetype} value={archetype}>
                        {archetype}
                      </option>
                    ))}
                  </SelectField>

                  <div className="relative">
                    <NumberInput
                      value={deck.share || ''}
                      onChange={(e) => {
                        const rawValue = e.target.value
                        const nextShare =
                          rawValue === '' ? 0 : Number(rawValue)

                        const otherDecksTotal = metaDecks.reduce(
                          (total, metaDeck, metaIndex) => {
                            if (metaIndex === index) return total

                            const share = Number(metaDeck.share)

                            if (!Number.isFinite(share)) {
                              return total
                            }

                            return total + share
                          },
                          0
                        )

                        const maxAllowed =
                          metaInputMode === 'players' && eventSize > 0
                            ? Math.max(0, eventSize - otherDecksTotal)
                            : Math.max(0, 100 - otherDecksTotal)

                        const cappedShare = Math.min(
                          Math.max(
                            Number.isFinite(nextShare) ? nextShare : 0,
                            0
                          ),
                          maxAllowed
                        )

                        const updated = [...metaDecks]
                        updated[index].share =
                          metaInputMode === 'players'
                            ? Math.round(cappedShare)
                            : cappedShare
                        setMetaDecks(updated)
                      }}
                      placeholder={metaInputMode === 'percent' ? '%' : '#'}
                      inputMode={
                        metaInputMode === 'players'
                          ? 'numeric'
                          : 'decimal'
                      }
                      enterKeyHint="next"
                      step={metaInputMode === 'players' ? '1' : 'any'}
                      aria-label={`Meta deck ${index + 1} ${
                        metaInputMode === 'percent'
                          ? 'percentage'
                          : 'players'
                      }`}
                      className={`min-h-11 rounded-xl border-[var(--surface-border)] bg-[#101012] py-2 text-center text-base ${
                        metaInputMode === 'percent' ? 'pl-2 pr-6' : 'px-2'
                      }`}
                    />

                    {metaInputMode === 'percent' && (
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                        %
                      </span>
                    )}
                  </div>
                </div>
              </SwipeActionRow>
            ))}
          </div>
        ) : (
          <EmptyState>
            Add a meta deck or use suggested meta to start.
          </EmptyState>
        )}

        <Button
          onClick={() => {
            setMetaRowsOpen(true)
            setMetaDecks([
              ...metaDecks,
              { name: '', share: 0 },
            ])
          }}
          tone="tertiary"
          size="sm"
          className="px-0"
        >
          Add Meta Deck
        </Button>
      </DisclosurePanel>

    </div>
  )
}
