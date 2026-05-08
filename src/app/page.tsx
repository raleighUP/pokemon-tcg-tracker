'use client'

import { useEffect, useState } from 'react'

import DeckViewer from '@/components/DeckViewer'
import AddDeckForm from '@/components/AddDeckForm'
import SavedDecks from '@/components/SavedDecks'
import CompareDecks from '@/components/CompareDecks'
import MatchLogger from '@/components/MatchLogger'
import MatchHistory from '@/components/MatchHistory'

import { Deck, Match, CardEntry } from '@/types'

export default function Home() {
  const [deckName, setDeckName] = useState('')
  const [decklist, setDecklist] = useState('')

  const [decks, setDecks] = useState<Deck[]>([])

  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])

const [eventName, setEventName] = useState('')

const [selectedMatchDeck, setSelectedMatchDeck] = useState('')

const [opponentDeck, setOpponentDeck] = useState('')

const [format, setFormat] = useState('Journey Together')

const [matchType, setMatchType] =
  useState<'BO1' | 'BO3'>('BO3')

const [games, setGames] = useState<string[]>([])

const [notes, setNotes] = useState('')
  const [compareDeck1, setCompareDeck1] = useState('')
  const [compareDeck2, setCompareDeck2] = useState('')
  const parseDeck = (deckName: string): CardEntry[] => {
  const deck = decks.find((d) => d.name === deckName)

  if (!deck) return []

  return deck.decklist
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

    // REMOVE HEADERS
    .filter(
      (line) =>
        !line.startsWith('Pokémon:') &&
        !line.startsWith('Trainer:') &&
        !line.startsWith('Energy:')
    )

    .map((line) => {
      const parts = line.split(' ')

      const quantity = parseInt(parts[0])

      // REMOVE SET CODES + NUMBERS
      const cleanedParts = parts.slice(1, -2)

      const name = cleanedParts.join(' ')

      return {
        name,
        quantity: isNaN(quantity) ? 1 : quantity,
      }
    })
}
const deck1Cards = parseDeck(compareDeck1)
const deck2Cards = parseDeck(compareDeck2)

const deck1Map = new Map(
  deck1Cards.map((card) => [card.name, card.quantity])
)

const deck2Map = new Map(
  deck2Cards.map((card) => [card.name, card.quantity])
)

const allCardNames = Array.from(
  new Set([
    ...deck1Cards.map((c) => c.name),
    ...deck2Cards.map((c) => c.name),
  ])
)

const changes = allCardNames
  .map((cardName) => {
    const qty1 = deck1Map.get(cardName) || 0
    const qty2 = deck2Map.get(cardName) || 0

    const diff = qty2 - qty1

    return {
      cardName,
      diff,
      oldQty: qty1,
      newQty: qty2,
    }
  })
  .filter((change) => change.diff !== 0)

  useEffect(() => {
  const savedDecks = localStorage.getItem('pokemon-decks')

  const savedMatches = localStorage.getItem(
    'pokemon-matches'
  )

  if (savedDecks) {
    const parsedDecks = JSON.parse(savedDecks)

    setDecks(parsedDecks)
  }

  if (savedMatches) {
    const parsedMatches = JSON.parse(savedMatches)

    setMatches(parsedMatches)
  }
}, [])

useEffect(() => {
  localStorage.setItem(
    'pokemon-decks',
    JSON.stringify(decks)
  )
}, [decks])
useEffect(() => {
  localStorage.setItem(
    'pokemon-matches',
    JSON.stringify(matches)
  )
}, [matches])

  const addDeck = () => {
  if (!deckName.trim() || !decklist.trim()) return

  if (editingDeckId !== null) {
    const updatedDecks = decks.map((deck) =>
      deck.id === editingDeckId
        ? {
            ...deck,
            name: deckName,
            decklist: decklist,
          }
        : deck
    )

    setDecks(updatedDecks)

    const updatedSelectedDeck = updatedDecks.find(
      (deck) => deck.id === editingDeckId
    )

    setSelectedDeck(updatedSelectedDeck || null)

    setEditingDeckId(null)
  } else {
    const newDeck: Deck = {
      id: Date.now(),
      name: deckName,
      decklist: decklist,
    }

    const updatedDecks = [...decks, newDeck]

    setDecks(updatedDecks)

    setSelectedDeck(newDeck)
  }

  setDeckName('')
  setDecklist('')
}
const editDeck = (deck: Deck) => {
  setDeckName(deck.name)
  setDecklist(deck.decklist)

  setEditingDeckId(deck.id)
}
const deleteDeck = (id: number) => {
  const updatedDecks = decks.filter((deck) => deck.id !== id)

  setDecks(updatedDecks)

  if (selectedDeck?.id === id) {
    setSelectedDeck(null)
  }

  if (editingDeckId === id) {
    setEditingDeckId(null)

    setDeckName('')
    setDecklist('')
  }
}

const toggleGameResult = (result: string) => {
  if (games.length >= (matchType === 'BO1' ? 1 : 3)) {
    return
  }

  setGames([...games, result])
}

const saveMatch = () => {
  if (
    !eventName ||
    !selectedMatchDeck ||
    !opponentDeck ||
    games.length === 0
  ) {
    return
  }

  const wins = games.filter((g) => g === 'W').length
  const losses = games.filter((g) => g === 'L').length

  const finalResult = `${wins}-${losses}`

  const newMatch: Match = {
    id: Date.now(),
    eventName,
    format,
    deck: selectedMatchDeck,
    opponentDeck,
    matchType,
    games,
    finalResult,
    notes,
  }

  setMatches([...matches, newMatch])

  setEventName('')
  setOpponentDeck('')
  setGames([])
  setNotes('')
}
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          Pokémon TCG Tournament Tracker
        </h1>

        <p className="text-slate-400 mb-8">
          Save decks, compare lists, and track tournament results.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* LEFT COLUMN */}
          <div className="space-y-6">
<AddDeckForm
  deckName={deckName}
  setDeckName={setDeckName}
  decklist={decklist}
  setDecklist={setDecklist}
  addDeck={addDeck}
  editingDeckId={editingDeckId}
/>
<SavedDecks
  decks={decks}
  setSelectedDeck={setSelectedDeck}
  editDeck={editDeck}
  deleteDeck={deleteDeck}
/>
          </div>
<CompareDecks
  compareDeck1={compareDeck1}
  setCompareDeck1={setCompareDeck1}
  compareDeck2={compareDeck2}
  setCompareDeck2={setCompareDeck2}
  decks={decks}
  changes={changes}
/>
<MatchLogger
  selectedMatchDeck={selectedMatchDeck}
  setSelectedMatchDeck={setSelectedMatchDeck}
  opponentDeck={opponentDeck}
  setOpponentDeck={setOpponentDeck}
  format={format}
  setFormat={setFormat}
  decks={decks}
  games={games}
  toggleGameResult={toggleGameResult}
  saveMatch={saveMatch}
/>
<MatchHistory matches={matches} />
{/* RIGHT COLUMN */}
<div>
  <DeckViewer selectedDeck={selectedDeck} />
</div>

        </div>
      </div>
    </main>
  )
}