import { SourcePanel } from '@/components/ui'

type Props = {
  metaSource: string
}

export default function DataSourcePanel({ metaSource }: Props) {
  return (
    <SourcePanel
      className="border-white/8 bg-white/[0.035]"
      sources={[
        {
          label: 'Meta',
          value: metaSource,
        },
        {
          label: 'Matchups',
          value: '20 large Limitless events',
        },
      ]}
    />
  )
}
