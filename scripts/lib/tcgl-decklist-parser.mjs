const sectionNames = new Map([
  ['pokemon', 'Pokemon'],
  ['pokémon', 'Pokemon'],
  ['trainer', 'Trainer'],
  ['energy', 'Energy'],
])

export function normalizeDeckText(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function parseTcglDecklist(text) {
  const rows = []
  let currentCategory = 'Unknown'

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) continue

    const headerMatch = line.match(/^([^:]+):\s*(\d+)?$/)
    if (headerMatch) {
      const normalizedHeader = normalizeDeckText(headerMatch[1])
      currentCategory = sectionNames.get(normalizedHeader) ?? currentCategory
      continue
    }

    if (/^total cards:/i.test(line)) continue

    const rowMatch = line.match(/^(\d+)\s+(.+)$/)
    if (!rowMatch) continue

    const quantity = Number(rowMatch[1])
    const rest = rowMatch[2].trim()
    const parts = rest.split(/\s+/)
    const maybeNumber = parts.at(-1) ?? ''
    const maybeSet = parts.at(-2) ?? ''
    const hasPrintSuffix =
      parts.length >= 3 &&
      /^[A-Z0-9]{2,8}$/.test(maybeSet) &&
      /^[A-Z0-9-]+$/.test(maybeNumber)

    rows.push({
      category: currentCategory,
      quantity,
      name: hasPrintSuffix ? parts.slice(0, -2).join(' ') : rest,
      setCode: hasPrintSuffix ? maybeSet : '',
      cardNumber: hasPrintSuffix ? maybeNumber : '',
    })
  }

  return rows
}

export function tcglRowKey(row) {
  return [
    row.category,
    row.quantity,
    normalizeDeckText(row.name),
    normalizeDeckText(row.setCode),
    normalizeDeckText(row.cardNumber),
  ].join('|')
}

export function tcglIdentityKey(row) {
  return [
    row.category,
    normalizeDeckText(row.name),
    normalizeDeckText(row.setCode),
    normalizeDeckText(row.cardNumber),
  ].join('|')
}

export function tcglNameKey(row) {
  return [
    row.category,
    normalizeDeckText(row.name),
  ].join('|')
}
