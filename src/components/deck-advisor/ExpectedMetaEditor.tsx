import {
  AdvisorMetaDeckInput,
  MetaBreakdownDeck,
  MetaInputMode,
} from './types'
import { useState } from 'react'
import {
  Button,
  DisclosurePanel,
  KeyValueList,
  NestedPanel,
  NumberInput,
  SourcePanel,
  SegmentedControl,
  SelectField,
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
  enteredMetaTotal: number
  otherMetaTotal: number
  maxMetaTotal: number
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
  enteredMetaTotal,
  otherMetaTotal,
  maxMetaTotal,
  metaBreakdown,
}: Props) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [breakdownOpen, setBreakdownOpen] = useState(false)

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
        <NestedPanel
          key={index}
          variant="compact"
          className="grid grid-cols-[minmax(0,1fr)_5.5rem_3.25rem] gap-2 p-2"
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
            placeholder="Percent"
            inputMode="decimal"
            enterKeyHint="next"
            aria-label={`Meta deck ${index + 1} ${
              metaInputMode === 'percent'
                ? 'percentage'
                : 'players'
            }`}
            className="border-transparent bg-transparent px-3 text-center"
          />

          <Button
            onClick={() => {
              const updated = metaDecks.filter(
                (_, metaIndex) => metaIndex !== index
              )

              setMetaDecks(
                updated.length > 0
                  ? updated
                  : [{ name: '', share: 0 }]
              )
            }}
            tone="danger"
            aria-label={`Clear meta deck ${index + 1}`}
            size="sm"
            className="min-h-11 px-2 text-xs"
          >
            X
          </Button>
        </NestedPanel>
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
        <KeyValueList
          items={[
            {
              label: 'Predicted Meta',
              value: `${enteredMetaTotal}${
                metaInputMode === 'percent' ? '%' : ' players'
              }`,
            },
            {
              label: 'Other',
              value: `${otherMetaTotal}${
                metaInputMode === 'percent' ? '%' : ' players'
              }`,
            },
            {
              label: 'Total Field',
              value: `${maxMetaTotal}${
                metaInputMode === 'percent' ? '%' : ' players'
              }`,
            },
          ]}
        />

        {metaBreakdown.length > 0 && (
          <DisclosurePanel
            title="Field Breakdown"
            open={breakdownOpen}
            onToggle={() => setBreakdownOpen((current) => !current)}
            buttonClassName="mt-3 border-t border-white/10 px-0 pb-0 pt-3"
            contentClassName="space-y-2 pb-1 pt-2"
            className="border-0 bg-transparent p-0"
          >

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
                    ? `${deck.normalizedShare.toFixed(
                        1
                      )}% - ${deck.roundedPlayers} players`
                    : `${deck.enteredValue} players - ${deck.normalizedShare.toFixed(
                        1
                      )}%`}
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
                    ? `${otherMetaTotal}% - ${
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
          </DisclosurePanel>
        )}
      </NestedPanel>

      <DisclosurePanel
        title="Sources"
        description="Meta and matchup data"
        open={sourcesOpen}
        onToggle={() => setSourcesOpen((current) => !current)}
        actionOpenLabel="Show"
        actionCloseLabel="Hide"
        buttonClassName="px-3 py-3"
        contentClassName="border-t border-white/10 p-3"
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
    </div>
  )
}
