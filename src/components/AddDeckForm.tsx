import { useEffect, useRef, useState } from 'react'
import {
  Button,
  DisclosureAction,
  FieldLabel,
  NestedPanel,
  Panel,
  SectionHeader,
  TextareaField,
  TextInput,
} from '@/components/ui'

type Props = {
  deckName: string
  setDeckName: (value: string) => void
  decklist: string
  setDecklist: (value: string) => void
  addDeck: () => void
  editingDeckId: number | null
}

export default function AddDeckForm({
  deckName,
  setDeckName,
  decklist,
  setDecklist,
  addDeck,
  editingDeckId,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const textareaRef =
    useRef<HTMLTextAreaElement>(null)

  // AUTO RESIZE WHEN EXPANDED
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    // RESET HEIGHT WHEN COLLAPSED
    if (!isExpanded && textareaRef.current) {
      textareaRef.current.style.height = '140px'
    }
  }, [decklist, isExpanded])

  return (
    <Panel>
      <SectionHeader
        title={editingDeckId !== null ? 'Edit Deck' : 'Add Deck'}
        description="Save a decklist for comparison, history review, and recommendations."
        className="mb-4"
      />

      <NestedPanel className="space-y-4 rounded-[28px] p-4">
        <div>
          <FieldLabel>Deck Name</FieldLabel>
          <TextInput
            type="text"
            value={deckName}
            onChange={(e) =>
              setDeckName(e.target.value)
            }
            aria-label="Deck name"
            placeholder="Deck Name"
            autoComplete="off"
            enterKeyHint="next"
          />
        </div>

        <div>
          <FieldLabel>Decklist</FieldLabel>
          <TextareaField
            ref={textareaRef}
            value={decklist}
            onChange={(e) =>
              setDecklist(e.target.value)
            }
            aria-label="Decklist"
            placeholder="Paste decklist here..."
            rows={6}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            className="motion-disclosure min-h-[140px] overflow-hidden"
          />

          <p className="type-helper mt-2 text-[var(--text-muted)]">
            Paste the exported card list exactly as written.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() =>
              setIsExpanded(!isExpanded)
            }
            tone="ghost"
            className="min-h-[52px] rounded-2xl bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-white"
          >
            <DisclosureAction
              open={isExpanded}
              openLabel="Expand List"
              closeLabel="Collapse List"
              className="justify-center text-white"
            />
          </Button>

          <Button
            onClick={() => {
              addDeck()

              setIsExpanded(false)

              if (textareaRef.current) {
                textareaRef.current.style.height =
                  '140px'
              }
            }}
            tone="accent"
            className="min-h-[52px] rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgba(23,107,181,0.22)] hover:bg-blue-500"
          >
            {editingDeckId !== null
              ? 'Update Deck'
              : 'Save Deck'}
          </Button>
        </div>
      </NestedPanel>
    </Panel>
  )
}
