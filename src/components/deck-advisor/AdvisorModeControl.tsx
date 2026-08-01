import { SegmentedControl } from '@/components/ui'
import { CandidateSource } from './types'

type Props = {
  candidateSource: CandidateSource
  setCandidateSource: (candidateSource: CandidateSource) => void
}

export default function AdvisorModeControl({
  candidateSource,
  setCandidateSource,
}: Props) {
  return (
    <div className="space-y-2">
      <SegmentedControl
        ariaLabel="Deck candidate source"
        value={candidateSource}
        onChange={setCandidateSource}
        columnWeights={[1.25, 1]}
        options={[
          { label: 'Owned Decks', value: 'owned' },
          { label: 'Top Meta', value: 'all' },
        ]}
      />

      <p className="type-helper text-[var(--text-muted)]">
        {candidateSource === 'owned'
          ? 'Ranking your saved decks.'
          : 'Ranking expected archetypes with neutral comfort.'}
      </p>
    </div>
  )
}
