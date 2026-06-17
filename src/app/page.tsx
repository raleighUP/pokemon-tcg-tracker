'use client'

import { useEffect, useState } from 'react'

import AddDeckForm from '@/components/AddDeckForm'
import SavedDecks from '@/components/SavedDecks'
import CompareDecks from '@/components/CompareDecks'
import MatchHistory from '@/components/MatchHistory'
import DeckAdvisor from '@/components/DeckAdvisor'
import BottomNavigation, {
  AppTab,
} from '@/components/BottomNavigation'
import { AppShell } from '@/components/ui'
import { detectDeckArchetype } from '@/utils/archetypes'

import { Deck, EventRecord, Match, CardEntry } from '@/types'

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

  const diceRollWins = Array.isArray(value.diceRollWins)
    ? value.diceRollWins.filter(
        (diceRollWin): diceRollWin is boolean =>
          typeof diceRollWin === 'boolean'
      )
    : undefined

  return {
    id: value.id,
    eventName: value.eventName,
    eventType:
      typeof value.eventType === 'string'
        ? value.eventType
        : undefined,
    round: value.round,
    format: value.format,
    deck: value.deck,
    opponentDeck: value.opponentDeck,
    matchType: value.matchType,
    games,
    gameStarts,
    diceRollWins,
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

function normalizeEvent(value: unknown): EventRecord | null {
  if (!isRecord(value)) return null

  if (
    typeof value.id !== 'number' ||
    typeof value.eventName !== 'string' ||
    typeof value.eventType !== 'string' ||
    typeof value.format !== 'string' ||
    typeof value.deck !== 'string'
  ) {
    return null
  }

  return {
    id: value.id,
    eventName: value.eventName,
    eventType: value.eventType,
    format: value.format,
    deck: value.deck,
    playerCount:
      typeof value.playerCount === 'number'
        ? value.playerCount
        : undefined,
    finalPlacement:
      typeof value.finalPlacement === 'string'
        ? value.finalPlacement
        : undefined,
    championshipPoints:
      typeof value.championshipPoints === 'string'
        ? value.championshipPoints
        : undefined,
    prizing:
      typeof value.prizing === 'string'
        ? value.prizing
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
  const [events, setEvents] = useState<EventRecord[]>(() =>
  readStoredArray<EventRecord>('pokemon-events', normalizeEvent)
)

  const [editingMatch, setEditingMatch] =
  useState<Match | null>(null)

  const [editingEvent, setEditingEvent] =
  useState<string | null>(null)

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
useEffect(() => {
  localStorage.setItem(
    'pokemon-events',
    JSON.stringify(events)
  )
}, [events])

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

const deleteMatch = (id: number) => {
  setMatches(matches.filter((m) => m.id !== id))
}

const deleteEvent = (eventName: string) => {
  setMatches(
    matches.filter(
      (m) => m.eventName !== eventName
    )
  )
  setEvents(
    events.filter(
      (event) => event.eventName !== eventName
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

const addMatch = (match: Match) => {
  setMatches([...matches, match])
}

const addEvent = (event: EventRecord) => {
  setEvents([...events, event])
}

const editEvent = (
  oldEventName: string,
  updatedData: {
    eventName: string
    eventType: string
    format: string
    deck: string
    playerCount?: number
    finalPlacement?: string
    championshipPoints?: string
    prizing?: string
  }
) => {
  setMatches(
    matches.map((match) =>
      match.eventName === oldEventName
        ? {
            ...match,
            eventName:
              updatedData.eventName,
            eventType: updatedData.eventType,
            format: updatedData.format,
            deck: updatedData.deck,
          }
        : match
    )
  )
  setEvents(
    events.map((event) =>
      event.eventName === oldEventName
        ? {
            ...event,
            eventName: updatedData.eventName,
            eventType: updatedData.eventType,
            format: updatedData.format,
            deck: updatedData.deck,
            playerCount:
              updatedData.playerCount ?? event.playerCount,
            finalPlacement:
              updatedData.finalPlacement ?? event.finalPlacement,
            championshipPoints:
              updatedData.championshipPoints ??
              event.championshipPoints,
            prizing: updatedData.prizing ?? event.prizing,
          }
        : event
    )
  )
}

  const bottomNavigation = (
    <BottomNavigation
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  )

  return (
    <AppShell bottomNavigation={bottomNavigation}>
      <div key={activeTab} className="motion-tab-panel">
        {activeTab === 'decks' && (
          <div className="space-y-5">
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
          <MatchHistory
            events={events}
            matches={matches}
            deleteMatch={deleteMatch}
            deleteEvent={deleteEvent}
            editMatch={editMatch}
            addMatch={addMatch}
            addEvent={addEvent}
            editEvent={editEvent}
            editingMatch={editingMatch}
            setEditingMatch={setEditingMatch}
            editingEvent={editingEvent}
            setEditingEvent={setEditingEvent}
            decks={decks}
          />
        )}

        {activeTab === 'history' && (
          <MatchHistory
            events={events}
            matches={matches}
            deleteMatch={deleteMatch}
            deleteEvent={deleteEvent}
            editMatch={editMatch}
            addMatch={addMatch}
            addEvent={addEvent}
            editEvent={editEvent}
            editingMatch={editingMatch}
            setEditingMatch={setEditingMatch}
            editingEvent={editingEvent}
            setEditingEvent={setEditingEvent}
            decks={decks}
          />
        )}

        {activeTab === 'advisor' && <DeckAdvisor decks={decks} />}
      </div>
    </AppShell>
  )
}
