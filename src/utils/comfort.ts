export const comfortLabels: Record<number, string> = {
  1: 'What do these cards even do?',
  2: "I know the deck, but haven't played it before",
  3: "I've got some games on this deck",
  4: 'I know some of the matchups and lines for this deck',
  5: "I've won events with this deck, know all the matchups, lines, and techs to consider",
}

export const comfortColors: Record<number, string> = {
  1: '#d75d5d',
  2: '#d98a45',
  3: '#dcc041',
  4: '#9fbd4d',
  5: '#64b572',
}

export function normalizeComfort(value: unknown) {
  const comfort = Number(value)

  if (!Number.isFinite(comfort)) return 3

  return Math.min(5, Math.max(1, Math.round(comfort)))
}

export function getComfortLabel(comfort: number) {
  return comfortLabels[normalizeComfort(comfort)]
}

export function getComfortColor(comfort: number) {
  return comfortColors[normalizeComfort(comfort)]
}

export function getComfortProgress(comfort: number) {
  return `${((normalizeComfort(comfort) - 1) / 4) * 100}%`
}
