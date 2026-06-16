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
    <div className="space-y-3">
      <SegmentedControl
        value={candidateSource}
        onChange={setCandidateSource}
        options={[
          { label: 'Owned Decks', value: 'owned' },
          { label: 'Top Meta', value: 'all' },
        ]}
      />

      <p className="text-xs text-slate-400">
        {candidateSource === 'owned'
          ? 'Rank only the decks you have saved in the app.'
          : 'Rank the top expected meta archetypes using neutral comfort.'}
      </p>
    </div>
  )
}
