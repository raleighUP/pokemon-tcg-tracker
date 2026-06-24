import { Button, Panel } from '@/components/ui'

type Props = {
  onCreateDeck: () => void
  onDismiss: () => void
}

const steps = [
  'Save your deck',
  'Log your rounds',
  'Review your event history and advisor insights',
]

export default function FirstLaunchWelcome({
  onCreateDeck,
  onDismiss,
}: Props) {
  return (
    <Panel
      aria-labelledby="first-launch-title"
      className="space-y-4"
      variant="elevated"
    >
      <div>
        <p className="type-metadata font-semibold text-[#6fb2ed]">
          Start here
        </p>
        <h2
          id="first-launch-title"
          className="type-section-title mt-1 text-[var(--text-primary)]"
        >
          Welcome to Top Cut
        </h2>
        <p className="type-helper mt-2 text-[var(--text-muted)]">
          Keep your tournament prep, rounds, and results in one focused place.
          No account required.
        </p>
      </div>

      <ol className="divide-y divide-white/8 border-y border-white/8">
        {steps.map((step, index) => (
          <li
            key={step}
            className="flex min-h-12 items-center gap-3 py-3"
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[rgba(23,107,181,0.5)] bg-[rgba(23,107,181,0.14)] text-xs font-bold text-[#8bc5f5]"
            >
              {index + 1}
            </span>
            <span className="text-sm font-semibold leading-5 text-[var(--text-secondary)]">
              {step}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Button
          tone="primary"
          size="lg"
          className="w-full"
          onClick={onCreateDeck}
        >
          Save Your Deck
        </Button>
        <Button
          tone="tertiary"
          className="w-full sm:w-auto"
          onClick={onDismiss}
        >
          Dismiss
        </Button>
      </div>
    </Panel>
  )
}
