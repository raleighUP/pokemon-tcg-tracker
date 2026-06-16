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
      <div className="space-y-4">
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
            className="bg-slate-950"
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
            Estimated Players
          </FieldLabel>

          <NumberInput
            min="0"
            value={playerCount}
            onChange={(e) =>
              setPlayerCount(e.target.value)
            }
            aria-label="Estimated players"
            placeholder="Example: 64"
            className="bg-slate-950"
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
                  label: 'Swiss Rounds',
                  value: structure.swissRounds,
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
                  label: 'Swiss Rounds',
                  value: structure.swissRounds,
                },
                {
                  label: 'Elimination Rounds',
                  value: structure.singleEliminationRounds,
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
                      label: 'Phase 1 Rounds',
                      value: structure.phaseOneRounds,
                    },
                    {
                      label: 'Phase 2 Threshold',
                      value: `${structure.phaseTwoThreshold} Match Points`,
                    },
                    {
                      label: 'Phase 2 Rounds',
                      value: structure.phaseTwoRounds,
                    },
                    {
                      label: 'Total Swiss',
                      value: structure.totalSwissRounds,
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
                      label: 'Swiss Rounds',
                      value: structure.swissRounds,
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
