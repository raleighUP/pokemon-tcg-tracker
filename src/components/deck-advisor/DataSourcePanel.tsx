import { SourcePanel } from '@/components/ui'

type Props = {
  metaSource: string
}

export default function DataSourcePanel({ metaSource }: Props) {
  return (
    <SourcePanel
      sources={[
        {
          label: 'Meta Source',
          value: metaSource,
        },
        {
          label: 'Matchup Source',
          value: '20 large online Limitless tournaments',
        },
      ]}
    />
  )
}
