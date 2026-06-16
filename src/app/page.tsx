'use client'

import { useEffect, useState } from 'react'

import DeckViewer from '@/components/DeckViewer'
import AddDeckForm from '@/components/AddDeckForm'
import SavedDecks from '@/components/SavedDecks'
import CompareDecks from '@/components/CompareDecks'
import MatchLogger from '@/components/MatchLogger'
import MatchHistory from '@/components/MatchHistory'
import DeckAdvisor from '@/components/DeckAdvisor'
import BottomNavigation, {
  AppTab,
} from '@/components/BottomNavigation'
import { AppShell } from '@/components/ui'
import { detectDeckArchetype } from '@/utils/archetypes'

import { Deck, Match, CardEntry } from '@/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeDeck(value: unknown): Deck | null {
  if (!isRecord(value)) return null

  if (
    typeof value.id !== 'number' ||
    typeof value.name !== 'string' ||
    typeof value.decklist !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    decklist: value.decklist,
    archetype:
      typeof value.archetype === 'string'
        ? value.archetype
        : undefined,
    variant:
      typeof value.variant === 'string'
        ? value.variant
        : undefined,
  }
}

function normalizeMatch(value: unknown): Match | null {
  if (!isRecord(value)) return null

  if (
    typeof value.id !== 'number' ||
    typeof value.eventName !== 'string' ||
    typeof value.round !== 'number' ||
    typeof value.format !== 'string' ||
    typeof value.deck !== 'string' ||
    typeof value.opponentDeck !== 'string' ||
    (value.matchType !== 'BO1' && value.matchType !== 'BO3') ||
    !Array.isArray(value.games)
  ) {
    return null
  }

  const games = value.games.filter(
    (game): game is string =>
      game === 'W' || game === 'L' || game === 'T'
  )

  const gameStarts = Array.isArray(value.gameStarts)
    ? value.gameStarts.filter(
        (start): start is '1st' | '2nd' =>
          start === '1st' || start === '2nd'
      )
    : []

  return {
    id: value.id,
    eventName: value.eventName,
    round: value.round,
    format: value.format,
    deck: value.deck,
    opponentDeck: value.opponentDeck,
    matchType: value.matchType,
    games,
    gameStarts,
    finalResult:
      typeof value.finalResult === 'string'
        ? value.finalResult
        : '',
    notes:
      typeof value.notes === 'string'
        ? value.notes
        : undefined,
  }
}

function readStoredArray<T>(
  key: string,
  normalizeItem: (value: unknown) => T | null
): T[] {
  if (typeof window === 'undefined') return []

  const savedValue = localStorage.getItem(key)

  if (!savedValue) return []

  try {
    const parsedValue = JSON.parse(savedValue)

    if (!Array.isArray(parsedValue)) return []

    return parsedValue
      .map(normalizeItem)
      .filter((item): item is T => item !== null)
  } catch {
    localStorage.removeItem(key)
    return []
  }
}

export default function Home() {
const [activeTab, setActiveTab] = useState<AppTab>('decks')
  const [deckName, setDeckName] = useState('')
  const [decklist, setDecklist] = useState('')

  const [decks, setDecks] = useState<Deck[]>(() =>
  readStoredArray<Deck>('pokemon-decks', normalizeDeck)
)

  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>(() =>
  readStoredArray<Match>('pokemon-matches', normalizeMatch)
)

  const [invalidMatchFields, setInvalidMatchFields] = useState<string[]>([])

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

const [gameStarts, setGameStarts] = useState<
  ('1st' | '2nd')[]
>([])

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

  const detectedDeck = detectDeckArchetype(decklist)

  if (editingDeckId !== null) {
    const updatedDecks = decks.map((deck) =>
      deck.id === editingDeckId
        ? {
            ...deck,
            name: deckName,
            decklist: decklist,
            archetype: detectedDeck.archetype,
            variant: detectedDeck.variant,
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
      archetype: detectedDeck.archetype,
      variant: detectedDeck.variant,
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
  setGameStarts([])
}

const toggleGameStart = (gameIndex: number) => {
  setGameStarts((prev) => {
    const updated = [...prev]

    updated[gameIndex] =
      updated[gameIndex] === '2nd'
        ? '1st'
        : '2nd'

    return updated
  })
}
const clearCurrentMatch = () => {
  setInvalidMatchFields([])
  setOpponentDeck('')
  setGames([])
  setGameStarts([])

  setClearSuccess(true)

  setTimeout(() => {
    setClearSuccess(false)
  }, 1500)

  if (navigator.vibrate) {
    navigator.vibrate(40)
  }
}
const startNewEvent = () => {
  setInvalidMatchFields([])
  setEventName('')
  setFormat('')
  setSelectedMatchDeck('')
  setOpponentDeck('')
  setGames([])
  setGameStarts([])

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
  setInvalidMatchFields([])
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
setGameStarts([])
setOpponentDeck('')
setNotes('')
}
const clearEvent = () => {
  setCurrentRound(1)

  setEventName('')
  setSelectedMatchDeck('')
  setOpponentDeck('')
  setGames([])
  setGameStarts([])
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
  const missingFields: string[] = []

if (!eventName.trim()) missingFields.push('eventName')
if (!format.trim()) missingFields.push('format')
if (!selectedMatchDeck.trim()) missingFields.push('selectedMatchDeck')
if (!opponentDeck.trim()) missingFields.push('opponentDeck')
if (games.length === 0) missingFields.push('games')

if (missingFields.length > 0) {
  setInvalidMatchFields(missingFields)

  setTimeout(() => {
    setInvalidMatchFields([])
  }, 1800)

  return
}

setInvalidMatchFields([])

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
  gameStarts,
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
setGameStarts([])
setNotes('')
}
  const bottomNavigation = (
    <BottomNavigation
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  )

  return (
    <AppShell bottomNavigation={bottomNavigation}>
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
  currentRound={currentRound}

games={games}
gameStarts={gameStarts}

toggleGameResult={toggleGameResult}
toggleGameStart={toggleGameStart}

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
invalidMatchFields={invalidMatchFields}
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

  {activeTab === 'advisor' && (
    <DeckAdvisor decks={decks} />
  )}  
    </AppShell>
  )
}
