export function getDeckExportFileName(deckName: string) {
  const safeName = deckName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${safeName || 'deck-list'}.txt`
}
