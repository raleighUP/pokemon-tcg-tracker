import type { ComponentProps } from 'react'
import type { Deck } from '@/types'
import { SelectField } from '@/components/ui'
import DeckIdentity from './DeckIdentity'

type Props = Omit<ComponentProps<typeof SelectField>, 'children' | 'selectedContent'> & {
  decks: Deck[]
  placeholder: string
}

export default function DeckSelectField({ decks, placeholder, value, ...props }: Props) {
  const selectedDeck = decks.find((deck) => deck.name === value)
  const archetype = selectedDeck?.variant || selectedDeck?.archetype || selectedDeck?.name || ''

  return (
    <SelectField
      {...props}
      value={value}
      selectedContent={selectedDeck ? (
        <DeckIdentity
          name={selectedDeck.name}
          spriteSource={archetype}
          size="compact"
          maxSprites={3}
          bareSprites
          className="w-full"
          textClassName="font-semibold text-[var(--text-primary)]"
        />
      ) : undefined}
    >
      <option value="">{placeholder}</option>
      {decks.map((deck) => (
        <option key={deck.id} value={deck.name}>{deck.name}</option>
      ))}
    </SelectField>
  )
}
