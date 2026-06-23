'use client'

import { useEffect, useState } from 'react'

import AddDeckForm from '@/components/AddDeckForm'
import SavedDecks from '@/components/SavedDecks'
import CompareDecks from '@/components/CompareDecks'
import MatchHistory from '@/components/MatchHistory'
import DeckAdvisor from '@/components/DeckAdvisor'
import IntroSplash from '@/components/IntroSplash'
import SettingsPage from '@/components/SettingsPage'
import BottomNavigation, {
  AppTab,
} from '@/components/BottomNavigation'
import { AppShell } from '@/components/ui'
import { normalizeComfort } from '@/utils/comfort'
import { detectDeckArchetype } from '@/utils/archetypes'
import {
  readAppStorage,
  writeDecks,
  writeEvents,
  writeMatches,
} from '@/utils/app-storage'

import { Deck, EventRecord, Match, CardEntry } from '@/types'

export default function Home() {
const [activeTab, setActiveTab] = useState<AppTab>('decks')
  const [storageReady, setStorageReady] = useState(false)
  const [deckName, setDeckName] = useState('')
  const [decklist, setDecklist] = useState('')
  const [deckComfort, setDeckComfort] = useState(3)

  const [decks, setDecks] = useState<Deck[]>([])

  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [editingDeckId, setEditingDeckId] = useState<number | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])

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
  const storedData = readAppStorage()
  const restoreTimer = window.setTimeout(() => {
    setDecks(storedData.decks)
    setMatches(storedData.matches)
    setEvents(storedData.events)
    setStorageReady(true)
  }, 0)

  return () => window.clearTimeout(restoreTimer)
}, [])
useEffect(() => {
  if (storageReady) writeDecks(decks)
}, [decks, storageReady])
useEffect(() => {
  if (storageReady) writeMatches(matches)
}, [matches, storageReady])
useEffect(() => {
  if (storageReady) writeEvents(events)
}, [events, storageReady])

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
            comfort: deckComfort,
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
      comfort: deckComfort,
    }

    const updatedDecks = [...decks, newDeck]

    setDecks(updatedDecks)

    setSelectedDeck(newDeck)
  }

  setDeckName('')
  setDecklist('')
  setDeckComfort(3)
}
const editDeck = (deck: Deck) => {
  setDeckName(deck.name)
  setDecklist(deck.decklist)
  setDeckComfort(normalizeComfort(deck.comfort))

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
    setDeckComfort(3)
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

  const refreshStoredData = () => {
    const storedData = readAppStorage()

    setDecks(storedData.decks)
    setMatches(storedData.matches)
    setEvents(storedData.events)
    setSelectedDeck(null)
    setEditingDeckId(null)
    setEditingMatch(null)
    setEditingEvent(null)
    setCompareDeck1('')
    setCompareDeck2('')
  }

  const focusDeckForm = () => {
    setActiveTab('decks')

    window.setTimeout(() => {
      if (typeof window === 'undefined') return

      const deckNameInput = document.getElementById('deck-name-input')
      const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      deckNameInput?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
      })
      deckNameInput?.focus()
    }, 0)
  }

  const bottomNavigation = (
    <BottomNavigation
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  )

  const renderTab = (tab: AppTab) => (
    <>
      {tab === 'decks' && (
        <div className="space-y-5">
          <AddDeckForm
            deckName={deckName}
            setDeckName={setDeckName}
            decklist={decklist}
            setDecklist={setDecklist}
            deckComfort={deckComfort}
            setDeckComfort={setDeckComfort}
            addDeck={addDeck}
            editingDeckId={editingDeckId}
            hasSavedDecks={decks.length > 0}
          />

          <SavedDecks
            decks={decks}
            selectedDeck={selectedDeck}
            setSelectedDeck={setSelectedDeck}
            editDeck={editDeck}
            deleteDeck={deleteDeck}
            onAddFirstDeck={focusDeckForm}
          />
        </div>
      )}

      {tab === 'compare' && (
        <CompareDecks
          decks={decks}
          compareDeck1={compareDeck1}
          setCompareDeck1={setCompareDeck1}
          compareDeck2={compareDeck2}
          setCompareDeck2={setCompareDeck2}
          changes={changes}
          onAddFirstDeck={focusDeckForm}
        />
      )}

      {tab === 'history' && (
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
          onAddFirstDeck={focusDeckForm}
        />
      )}

      {tab === 'advisor' && <DeckAdvisor decks={decks} />}

      {tab === 'settings' && (
        <SettingsPage
          onDataChanged={refreshStoredData}
        />
      )}
    </>
  )

  if (!storageReady) {
    return (
      <>
        <IntroSplash />
        <main
          aria-busy="true"
          aria-label="Loading saved data"
          className="min-h-dvh bg-[var(--surface-app)]"
        />
      </>
    )
  }

  return (
    <>
      <IntroSplash />

      <AppShell bottomNavigation={bottomNavigation}>
        <div key={activeTab} className="motion-tab-panel">
          {renderTab(activeTab)}
        </div>
      </AppShell>
    </>
  )
}
