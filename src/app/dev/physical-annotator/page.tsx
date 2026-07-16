import PhysicalFixtureAnnotator from '@/components/developer/PhysicalFixtureAnnotator'

export default function PhysicalAnnotatorPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_DEVELOPER_TOOLS !== 'true') {
    return <main className="mx-auto max-w-2xl p-8"><h1 className="text-2xl font-bold">Developer tool unavailable</h1><p className="mt-3">Set NEXT_PUBLIC_ENABLE_DEVELOPER_TOOLS=true and rebuild to enable the local physical fixture annotator.</p></main>
  }
  return <PhysicalFixtureAnnotator />
}
