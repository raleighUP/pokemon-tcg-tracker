# Pokemon TCG Tracker - Project Specification

## Repository

pokemon-tcg-tracker

## Purpose

A web application designed for competitive Pokémon TCG players to:

* Store decklists
* Compare deck versions
* Log tournament matches
* Review tournament history
* Analyze expected metagames
* Receive deck recommendations based on matchup data and player comfort

---

# Current Architecture

## Tech Stack

* Next.js
* React
* TypeScript
* Tailwind CSS
* LocalStorage persistence

---

# Core Features

## Deck Management

Users can:

* Save decklists
* Edit decklists
* Delete decklists
* View full decklists

Decklists are automatically classified into:

* Archetype
* Variant

Examples:

* Dragapult
* Dragapult Dusknoir
* Raging Bolt Ogerpon
* Gardevoir

Fallback:

* Other

---

## Deck Comparison

Users can:

* Select two saved decks
* Compare card counts
* View additions/removals

---

## Match Logger

Tracks:

* Event Name
* Round Number
* Format
* Player Deck
* Opponent Deck
* BO1 / BO3
* Game Results
* Notes

Supports:

* Next Round
* New Event
* Edit Match
* Delete Match

---

## Match History

Groups rounds by event.

Displays:

* Event Record
* Deck
* Format
* Individual Rounds
* Notes

Supports:

* Edit Event
* Edit Match
* Delete Event
* Delete Match

---

# Deck Advisor

## Purpose

Answer:

"Given this expected field, what should I play?"

---

## Matchup Data

Source:

data/limitless-matchups.json

Contains:

* Archetype vs Archetype win rates
* Match sample sizes

Built from approximately 20 major online Limitless tournaments.

Unknown matchup:

* Defaults to 50%

---

## Meta Data

Source:

data/limitless-major-meta.json

Used by:

Use Suggested Meta button

Allows user to load:

Expected metagame percentages

Users may manually adjust percentages afterward.

---

## Recommendation Formula

Inputs:

* Expected Meta Share
* Matchup Win Rates
* Player Comfort

Outputs:

* Field WR
* Comfort Impact
* Final Score

---

## Recommendation Card

Displays:

* Deck Name
* Archetype
* Comfort
* Recommendation Insight
* Field WR
* Comfort Impact
* Final Score
* Field Coverage
* Best Matchups
* Worst Matchups

---

## Matchup Color Coding

Green:

* Greater than 55%

Yellow:

* 45% to 55%

Red:

* Below 45%

---

## Best Matchups

Requirements:

* Sample Size > 0
* Win Rate > 50%

Display:

Top 2

---

## Worst Matchups

Requirements:

* Sample Size > 0
* Win Rate < 50%

Display:

Bottom 2

---

## Advisor Modes

### Owned Decks

Uses user-owned decks.

Current implementation:

Candidate deck system.

Future implementation:

Automatically generate candidates from saved decks.

---

### Top Meta

Uses top meta archetypes.

Current cap:

10 archetypes.

Comfort:

Neutral (3)

Purpose:

"What should I play if I can play anything?"

---

# Planned Features

## Priority 5

Auto Candidate Generation

Goals:

* Remove manual candidate deck management
* Automatically use saved decks
* Preserve comfort ratings
* Continue supporting Top Meta mode

---

## Priority 6

Meta Aggregation

Current:

Single event

Future:

Aggregate:

* Regionals
* Special Events
* Internationals
* Worlds

Produce a more stable expected field.

---

## Priority 7

Data Source Transparency

Display:

Meta Source

Matchup Source

Examples:

Meta Source:
NAIC + Turin

Matchup Source:
20 Online Limitless Events

---

## Priority 8

Future Metrics

Potential additions:

* Expected Record
* Positive Record %
* Top Cut %
* Win Tournament %
* Confidence Rating

---

# Product Philosophy

The advisor should feel like a testing partner.

Goal:

Not just:

"Which deck has the highest number?"

But:

"Which deck gives me the best chance to succeed in this expected tournament field?"
