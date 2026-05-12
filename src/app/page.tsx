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
  const [activeTab, setActiveTab] = useState<
  'decks' | 'compare' | 'matches' | 'history'
>('decks')
  const [deckName, setDeckName] = useState('')
  const [decklist, setDecklist] = useState('')

  const [decks, setDecks] = useState<Deck[]>([])

  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])

  const [editingMatch, setEditingMatch] =
  useState<Match | null>(null)

  const [editingEvent, setEditingEvent] =
  useState<string | null>(null)

const [eventName, setEventName] = useState('')

const [selectedMatchDeck, setSelectedMatchDeck] = useState('')

const [opponentDeck, setOpponentDeck] = useState('')

const [format, setFormat] = useState('')

const [matchType, setMatchType] =
  useState<'BO1' | 'BO3'>('BO3')

const [games, setGames] = useState<string[]>([])
const [currentRound, setCurrentRound] = useState(1)

const [saveSuccess, setSaveSuccess] =
  useState(false)

const [roundSuccess, setRoundSuccess] =
  useState(false)

const [eventSuccess, setEventSuccess] =
  useState(false)

  const [clearSuccess, setClearSuccess] =
  useState(false)

const [notes, setNotes] = useState('')
  const [compareDeck1, setCompareDeck1] = useState('')
  const [compareDeck2, setCompareDeck2] = useState('')

  const [roundError, setRoundError] = useState(false)
  const isRoundValid =
  editingMatch &&
  editingMatch.round !== undefined &&
  editingMatch.round !== null &&
  editingMatch.round > 0

const isFormValid =
  isRoundValid &&
  editingMatch?.opponentDeck?.trim() !== ''

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
  // BO1 = always replace current result
  if (matchType === 'BO1') {
    setGames([result])
    return
  }

  // BO3 behavior
  if (games.length >= 3) return

  setGames([...games, result])
}
const clearGames = () => {
  setGames([])
}
const clearCurrentMatch = () => {
  setOpponentDeck('')
  setGames([])

  setClearSuccess(true)

  setTimeout(() => {
    setClearSuccess(false)
  }, 1500)

  if (navigator.vibrate) {
    navigator.vibrate(40)
  }
}
const startNewEvent = () => {
  setEventName('')
  setFormat('')
  setSelectedMatchDeck('')
  setOpponentDeck('')
  setGames([])

  setCurrentRound(1)

  setEventSuccess(true)

  setTimeout(() => {
    setEventSuccess(false)
  }, 1500)

  if (navigator.vibrate) {
    navigator.vibrate([40, 30, 40])
  }
}
const nextRound = () => {
    setCurrentRound((prev) => prev + 1)

  setRoundSuccess(true)

  setTimeout(() => {
    setRoundSuccess(false)
  }, 1500)
  // GET ALL ROUNDS FOR CURRENT EVENT
  const eventRounds = matches
    .filter(
      (match) =>
        match.eventName === eventName
    )
    .map((match) => match.round)

  // FIND FIRST MISSING ROUND NUMBER
  let nextAvailableRound = 1

  while (
    eventRounds.includes(
      nextAvailableRound
    )
  ) {
    nextAvailableRound++
  }

  setCurrentRound(nextAvailableRound)

  setGames([])
  setOpponentDeck('')
  setNotes('')
}
const clearEvent = () => {
  setCurrentRound(1)

  setEventName('')
  setSelectedMatchDeck('')
  setOpponentDeck('')
  setGames([])
  setNotes('')
}
const deleteMatch = (id: number) => {
  setMatches(matches.filter((m) => m.id !== id))
}

const deleteEvent = (eventName: string) => {
  setMatches(
    matches.filter(
      (m) => m.eventName !== eventName
    )
  )
}
const editMatch = (updatedMatch: Match) => {
  setMatches(
    matches.map((match) =>
      match.id === updatedMatch.id
        ? updatedMatch
        : match
    )
  )
}

const editEvent = (
  oldEventName: string,
  updatedData: {
    eventName: string
    format: string
    deck: string
  }
) => {
  setMatches(
    matches.map((match) =>
      match.eventName === oldEventName
        ? {
            ...match,
            eventName:
              updatedData.eventName,
            format: updatedData.format,
            deck: updatedData.deck,
          }
        : match
    )
  )
}

const saveMatch = () => {
  if (
    !eventName ||
    !format ||
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
    round: currentRound,
    format,
    deck: selectedMatchDeck,
    opponentDeck,
    matchType,
    games,
    finalResult,
    notes,
  }

  setMatches([...matches, newMatch])
  setSaveSuccess(true)

if (navigator.vibrate) {
  navigator.vibrate(100)
}

setTimeout(() => {
  setSaveSuccess(false)
}, 2000)

setOpponentDeck('')
setGames([])
setNotes('')
}
  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
      
<div className="pb-24">
  {activeTab === 'decks' && (
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
  selectedDeck={selectedDeck}
  setSelectedDeck={setSelectedDeck}
  editDeck={editDeck}
  deleteDeck={deleteDeck}
/>

      <DeckViewer selectedDeck={selectedDeck} />
    </div>
  )}

  {activeTab === 'compare' && (
    <CompareDecks
      decks={decks}
      compareDeck1={compareDeck1}
      setCompareDeck1={setCompareDeck1}
      compareDeck2={compareDeck2}
      setCompareDeck2={setCompareDeck2}
      changes={changes}
    />
  )}

  {activeTab === 'matches' && (
    <MatchLogger
  eventName={eventName}
  setEventName={setEventName}

  decks={decks}

  selectedMatchDeck={selectedMatchDeck}
  setSelectedMatchDeck={setSelectedMatchDeck}

  opponentDeck={opponentDeck}
  setOpponentDeck={setOpponentDeck}

  format={format}
  setFormat={setFormat}

  matchType={matchType}
  setMatchType={setMatchType}

  games={games}

  toggleGameResult={toggleGameResult}
  clearGames={clearGames}

  saveMatch={saveMatch}
  clearCurrentMatch={clearCurrentMatch}

  startNewEvent={startNewEvent}
  nextRound={nextRound}
  clearEvent={clearEvent}
  saveSuccess={saveSuccess}
  roundSuccess={roundSuccess}
eventSuccess={eventSuccess}
clearSuccess={clearSuccess}
notes={notes}
setNotes={setNotes}
/>
  )}

  {activeTab === 'history' && (
    <MatchHistory
  matches={matches}
  deleteMatch={deleteMatch}
  deleteEvent={deleteEvent}
  editMatch={editMatch}
  editEvent={editEvent}
  editingMatch={editingMatch}
  setEditingMatch={setEditingMatch}
  editingEvent={editingEvent}
  setEditingEvent={setEditingEvent}
  decks={decks}
/>
  )}
</div>

</div>

    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800">
  <div className="max-w-6xl mx-auto grid grid-cols-4">
    
    <button
      onClick={() => setActiveTab('decks')}
      className={`py-4 font-semibold ${
        activeTab === 'decks'
          ? 'text-yellow-400'
          : 'text-slate-400'
      }`}
    >
      Decks
    </button>

    <button
      onClick={() => setActiveTab('compare')}
      className={`py-4 font-semibold ${
        activeTab === 'compare'
          ? 'text-yellow-400'
          : 'text-slate-400'
      }`}
    >
      Compare
    </button>

    <button
      onClick={() => setActiveTab('matches')}
      className={`py-4 font-semibold ${
        activeTab === 'matches'
          ? 'text-yellow-400'
          : 'text-slate-400'
      }`}
    >
      Matches
    </button>

    <button
      onClick={() => setActiveTab('history')}
      className={`py-4 font-semibold ${
        activeTab === 'history'
          ? 'text-yellow-400'
          : 'text-slate-400'
      }`}
    >
      History
    </button>

  </div>
</div>
</main>
    )
}