'use client'

import { useState } from 'react'

export default function Home() {
  const [deckName, setDeckName] = useState('')
  const [decks, setDecks] = useState<string[]>([])

  const addDeck = () => {
    if (!deckName.trim()) return

    setDecks([...decks, deckName])
    setDeckName('')
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">
          Pokémon TCG Tournament Tracker
        </h1>

        <p className="text-slate-400 mb-8">
          Save decks and track tournament performance.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Add Deck
          </h2>

          <div className="flex gap-4">
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name"
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-yellow-400"
            />

            <button
              onClick={addDeck}
              className="bg-yellow-400 text-black font-semibold px-6 py-3 rounded-xl hover:scale-105 transition"
            >
              Save Deck
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-4">
            Saved Decks
          </h2>

          {decks.length === 0 ? (
            <p className="text-slate-400">
              No decks saved yet.
            </p>
          ) : (
            <div className="space-y-3">
              {decks.map((deck, index) => (
                <div
                  key={index}
                  className="bg-slate-800 rounded-xl px-4 py-3"
                >
                  {deck}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}