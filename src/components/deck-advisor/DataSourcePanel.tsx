import { SourcePanel } from '@/components/ui'

type Props = {
  metaSource: string
}

export default function DataSourcePanel({ metaSource }: Props) {
  return (
    <SourcePanel
      className="border-slate-800/80 bg-slate-900/70"
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
