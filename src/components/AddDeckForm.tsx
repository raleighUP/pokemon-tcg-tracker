import { CSSProperties, useEffect, useRef, useState } from 'react'
import {
  Button,
  DisclosureAction,
  Panel,
  FieldLabel,
  RangeField,
  SectionHeader,
  TextareaField,
  TextInput,
} from '@/components/ui'
import {
  getComfortColor,
  getComfortLabel,
  getComfortProgress,
} from '@/utils/comfort'
import DeckImageImporter from './DeckImageImporter'
import type { DeckImportMetadata } from '@/types'

type Props = {
  deckName: string
  setDeckName: (value: string) => void
  decklist: string
  setDecklist: (value: string) => void
  deckComfort: number
  setDeckComfort: (value: number) => void
  addDeck: () => void
  addImportedDeck: (
    deckName: string,
    decklist: string,
    importMetadata?: DeckImportMetadata
  ) => void
  editingDeckId: number | null
  hasSavedDecks?: boolean
}

export default function AddDeckForm({
  deckName,
  setDeckName,
  decklist,
  setDecklist,
  deckComfort,
  setDeckComfort,
  addDeck,
  addImportedDeck,
  editingDeckId,
  hasSavedDecks = true,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const textareaRef =
    useRef<HTMLTextAreaElement>(null)
  const collapsedTextareaHeight = 140

  // AUTO RESIZE WHEN EXPANDED
  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }

    // RESET HEIGHT WHEN COLLAPSED
    if (!isExpanded && textareaRef.current) {
      textareaRef.current.style.height = `${collapsedTextareaHeight}px`
    }
  }, [decklist, isExpanded])

  const toggleExpanded = () => {
    if (isExpanded) {
      setIsExpanded(false)
      return
    }

    const textarea = textareaRef.current

    if (!textarea || textarea.scrollHeight <= collapsedTextareaHeight + 2) {
      return
    }

    setIsExpanded(true)
  }

  return (
    <Panel className="space-y-4">
      <SectionHeader
        title={
          editingDeckId !== null
            ? 'Edit Deck'
            : hasSavedDecks
              ? 'Add Deck'
              : 'Add Your First Deck'
        }
        description={
          editingDeckId === null && !hasSavedDecks
            ? 'Paste your current 60 to use it in match logs, deck comparison, and Advisor picks.'
            : undefined
        }
        level={1}
      />

      <div className="space-y-4">
        <div>
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
            id="deck-name-input"
          />
        </div>

        <div>
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

        <div>
          <FieldLabel>
            {getComfortLabel(deckComfort)}
          </FieldLabel>

          <RangeField
            min="1"
            max="5"
            value={deckComfort}
            aria-label="Deck comfort"
            className="comfort-range"
            style={{
              '--comfort-color': getComfortColor(deckComfort),
              '--comfort-progress': getComfortProgress(deckComfort),
            } as CSSProperties}
            onChange={(e) => setDeckComfort(Number(e.target.value))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={toggleExpanded}
            tone="secondary"
            className="min-h-[52px] rounded-2xl"
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
                  `${collapsedTextareaHeight}px`
              }
            }}
            tone="primary"
            className="min-h-[52px] rounded-2xl shadow-none"
          >
            {editingDeckId !== null
              ? 'Update Deck'
              : 'Save Deck'}
          </Button>
        </div>

        {editingDeckId === null && (
          <DeckImageImporter onSaveDeck={addImportedDeck} />
        )}
      </div>
    </Panel>
  )
}
