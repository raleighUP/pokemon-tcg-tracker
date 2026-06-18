import { EventType, TournamentStructure } from '@/utils/tournament'
import {
  FieldLabel,
  KeyValueList,
  NestedPanel,
  NumberInput,
  SelectField,
} from '@/components/ui'

type Props = {
  eventType: EventType
  setEventType: (eventType: EventType) => void
  playerCount: string
  setPlayerCount: (playerCount: string) => void
  eventSize: number
  structure: TournamentStructure
}

export default function AdvisorEventSetup({
  eventType,
  setEventType,
  playerCount,
  setPlayerCount,
  eventSize,
  structure,
}: Props) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(13.5rem,auto)_minmax(4rem,1fr)]">
        <div>
          <FieldLabel>
            Event Type
          </FieldLabel>

          <SelectField
            value={eventType}
            onChange={(e) =>
              setEventType(e.target.value as EventType)
            }
            aria-label="Event type"
          >
            <option value="challenge">
              League Challenge
            </option>
            <option value="cup">League Cup</option>
            <option value="regional">
              Regional Championship
            </option>
          </SelectField>
        </div>

        <div>
          <FieldLabel>
            Players
          </FieldLabel>

          <NumberInput
            min="0"
            value={playerCount}
            onChange={(e) =>
              setPlayerCount(e.target.value)
            }
            aria-label="Estimated players"
            placeholder="Example: 64"
            inputMode="numeric"
            enterKeyHint="done"
          />
        </div>
      </div>

      {eventSize > 0 && (
        <NestedPanel>
          <p className="mb-3 text-sm font-semibold text-white">
            Tournament Structure
          </p>

          {eventType === 'challenge' && (
            <KeyValueList
              className="text-sm"
              items={[
                {
                  label: 'Swiss',
                  value: `${structure.swissRounds} rounds`,
                },
                {
                  label: 'Top Cut',
                  value: structure.topCutLabel,
                },
              ]}
            />
          )}

          {eventType === 'cup' && (
            <KeyValueList
              className="text-sm"
              items={[
                {
                  label: 'Swiss',
                  value: `${structure.swissRounds} rounds`,
                },
                {
                  label: 'Elimination',
                  value: `${structure.singleEliminationRounds} rounds`,
                },
                {
                  label: 'Top Cut',
                  value: structure.topCutLabel,
                },
                {
                  label: 'Total Event Length',
                  value: structure.totalEventLength,
                },
              ]}
            />
          )}

          {eventType === 'regional' && (
            <div className="space-y-1 text-sm">
              {structure.phaseOneRounds ? (
                <KeyValueList
                  items={[
                    {
                      label: 'Phase 1',
                      value: `${structure.phaseOneRounds} rounds`,
                    },
                    {
                      label: 'Phase 2 Threshold',
                      value: `${structure.phaseTwoThreshold} Match Points`,
                    },
                    {
                      label: 'Phase 2',
                      value: `${structure.phaseTwoRounds} rounds`,
                    },
                    {
                      label: 'Total Swiss',
                      value: `${structure.totalSwissRounds} rounds`,
                    },
                    {
                      label: 'Top Cut',
                      value: structure.topCutLabel,
                    },
                  ]}
                />
              ) : (
                <KeyValueList
                  items={[
                    {
                      label: 'Swiss',
                      value: `${structure.swissRounds} rounds`,
                    },
                    {
                      label: 'Top Cut',
                      value: structure.topCutLabel,
                    },
                  ]}
                />
              )}
            </div>
          )}
        </NestedPanel>
      )}
    </>
  )
}
