import {
  AdvisorMetaDeckInput,
  MetaBreakdownDeck,
  MetaInputMode,
} from './types'
import { useState } from 'react'
import {
  Button,
  DisclosurePanel,
  NestedPanel,
  NumberInput,
  SourcePanel,
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
  suggestedMetaSourceLabel: string
  otherMetaTotal: number
  metaBreakdown: MetaBreakdownDeck[]
}

export default function ExpectedMetaEditor({
  archetypeOptions,
  eventSize,
  metaDecks,
  setMetaDecks,
  metaInputMode,
  setMetaInputMode,
  suggestedMeta,
  suggestedMetaSourceLabel,
  otherMetaTotal,
  metaBreakdown,
}: Props) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <Button
        onClick={() => {
          setMetaInputMode('percent')
          setMetaDecks(suggestedMeta)
        }}
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

      {metaDecks.map((deck, index) => (
        <SwipeActionRow
          key={index}
          open={openRowIndex === index}
          onOpenChange={(open) => setOpenRowIndex(open ? index : null)}
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

                setMetaDecks(
                  updated.length > 0
                    ? updated
                    : [{ name: '', share: 0 }]
                )
              },
            },
          ]}
        >
          <NestedPanel
            variant="compact"
            className="grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2 p-2"
          >
            <SelectField
              value={deck.name}
              onChange={(e) => {
                const updated = [...metaDecks]
                updated[index].name = e.target.value
                setMetaDecks(updated)
              }}
              aria-label={`Meta deck ${index + 1} archetype`}
              className="border-transparent bg-transparent"
            >
              <option value="">Select archetype</option>

              {archetypeOptions.map((archetype) => (
                <option key={archetype} value={archetype}>
                  {archetype}
                </option>
              ))}
            </SelectField>

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
                updated[index].share = cappedShare
                setMetaDecks(updated)
              }}
              placeholder={metaInputMode === 'percent' ? '%' : '#'}
              inputMode="decimal"
              enterKeyHint="next"
              aria-label={`Meta deck ${index + 1} ${
                metaInputMode === 'percent'
                  ? 'percentage'
                  : 'players'
              }`}
              className="border-transparent bg-transparent px-2 text-center"
            />
          </NestedPanel>
        </SwipeActionRow>
      ))}

      <Button
        onClick={() =>
          setMetaDecks([
            ...metaDecks,
            { name: '', share: 0 },
          ])
        }
        tone="tertiary"
        size="sm"
        className="px-0"
      >
        Add Meta Deck
      </Button>

      <NestedPanel variant="compact" className="space-y-2 text-sm">
        {metaBreakdown.length > 0 && (
          <>
            <p className="type-card-title text-[var(--text-primary)]">
              Field Breakdown
            </p>
            {metaBreakdown.map((deck) => (
              <div
                key={deck.name}
                className="flex justify-between gap-3 text-xs"
              >
                <span className="text-[var(--text-muted)]">
                  {deck.name}
                </span>

                <span className="font-semibold text-right">
                  {metaInputMode === 'percent'
                    ? `${deck.normalizedShare.toFixed(1)}% - ${deck.roundedPlayers} players`
                    : `${deck.enteredValue} players - ${deck.normalizedShare.toFixed(1)}%`}
                </span>
              </div>
            ))}

            {otherMetaTotal > 0 && (
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-[var(--text-muted)]">
                  Other
                </span>

                <span className="font-semibold text-right">
                  {metaInputMode === 'percent'
                    ? `${otherMetaTotal.toFixed(1)}% - ${
                        eventSize > 0
                          ? Math.round(
                              (otherMetaTotal / 100) *
                                eventSize
                            )
                          : 0
                      } players`
                    : `${otherMetaTotal} players - ${
                        eventSize > 0
                          ? (
                              (otherMetaTotal /
                                eventSize) *
                              100
                            ).toFixed(1)
                          : '0.0'
                      }%`}
                </span>
              </div>
            )}
          </>
        )}

        <DisclosurePanel
          title="Sources"
          description="Meta and matchup data"
          open={sourcesOpen}
          onToggle={() => setSourcesOpen((current) => !current)}
          actionOpenLabel="Show"
          actionCloseLabel="Hide"
          buttonClassName="border-t border-white/10 px-0 pb-0 pt-3"
          contentClassName="pt-3"
          className="border-0 bg-transparent p-0"
        >
          <SourcePanel
            sources={[
              {
                label: 'Meta',
                value: suggestedMetaSourceLabel,
              },
              {
                label: 'Matchups',
                value: '20 large Limitless events',
              },
            ]}
          />
        </DisclosurePanel>
      </NestedPanel>
    </div>
  )
}
