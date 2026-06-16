# Pokemon TCG Tracker

Pokemon TCG Tracker is a local-first Next.js app for managing Pokemon TCG decks, logging tournament matches, reviewing event history, comparing decklists, and using matchup/meta data to choose a deck for an expected field.

## App Sections

- Decks: save decklists, detect archetypes, and view saved lists.
- Compare: select two saved decks and review card-count differences.
- Log: set an active event and record match results, game starts, and notes.
- History: review events and rounds, edit logged data, and remove old entries.
- Advisor: enter an expected meta and event size, then rank candidate decks.

## Local Development

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Production Checks

Before deploying, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Regenerating Meta Data

To refresh the suggested major-event meta data, run:

```bash
npm run build:meta
```

This regenerates `data/limitless-major-meta.json` from the configured Limitless major event sources.
