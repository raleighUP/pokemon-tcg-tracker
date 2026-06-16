import { useEffect, useRef, useState } from 'react'
import {
  Button,
  DisclosureAction,
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
        title="Add Deck"
        className="mb-4"
      />

        <div className="space-y-4">
          <TextInput
            type="text"
            value={deckName}
            onChange={(e) =>
              setDeckName(e.target.value)
            }
            aria-label="Deck name"
            placeholder="Deck Name"
            autoComplete="off"
          />

          <TextareaField
            ref={textareaRef}
            value={decklist}
            onChange={(e) =>
              setDecklist(e.target.value)
            }
            aria-label="Decklist"
            placeholder="Paste decklist here..."
            rows={6}
            className="overflow-hidden transition-all duration-200"
          />

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() =>
                setIsExpanded(!isExpanded)
              }
              tone="ghost"
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
            >
              {editingDeckId !== null
                ? 'Update Deck'
                : 'Save Deck'}
            </Button>
          </div>
        </div>
      </Panel>
  )
}
