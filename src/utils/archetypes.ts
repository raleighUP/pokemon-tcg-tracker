type ParsedCard = {
  name: string
  quantity: number
}

type VariantRule = {
  variant: string
  cards: string[]
  minimumTotalCopies?: number
}

type ArchetypeRule = {
  archetype: string
  keyCards: string[]
  minimumKeyCopies?: number
  priority: number
  variants?: VariantRule[]
}

export type DetectedArchetype = {
  archetype: string
  variant: string
}

const ARCHETYPE_RULES: ArchetypeRule[] = [
  {
    archetype: 'Dragapult',
    keyCards: ['Dragapult ex'],
    minimumKeyCopies: 2,
    priority: 100,
    variants: [
      {
        variant: 'Dragapult Dusknoir',
        cards: ['Duskull', 'Dusclops', 'Dusknoir'],
        minimumTotalCopies: 3,
      },
      {
        variant: 'Dragapult Blaziken',
        cards: ['Torchic', 'Combusken', 'Blaziken ex'],
        minimumTotalCopies: 2,
      },
      {
        variant: 'Dragapult Dudunsparce',
        cards: ['Dunsparce', 'Dudunsparce'],
        minimumTotalCopies: 3,
      },
    ],
  },
  {
    archetype: 'Hydrapple',
    keyCards: ['Hydrapple ex'],
    minimumKeyCopies: 2,
    priority: 95,
  },
  {
    archetype: 'Slowking',
    keyCards: ['Slowking'],
    minimumKeyCopies: 2,
    priority: 90,
  },
  {
    archetype: 'Raging Bolt',
    keyCards: ['Raging Bolt ex'],
    minimumKeyCopies: 2,
    priority: 90,
    variants: [
      {
        variant: 'Raging Bolt Ogerpon',
        cards: ['Teal Mask Ogerpon ex'],
        minimumTotalCopies: 2,
      },
    ],
  },
  {
    archetype: 'Alakazam',
    keyCards: ['Alakazam ex'],
    minimumKeyCopies: 2,
    priority: 85,
    variants: [
      {
        variant: 'Alakazam Dudunsparce',
        cards: ['Dunsparce', 'Dudunsparce'],
        minimumTotalCopies: 3,
      },
    ],
  },
  {
    archetype: 'Festival Lead',
    keyCards: ['Dipplin', 'Festival Lead'],
    minimumKeyCopies: 2,
    priority: 85,
  },
  {
    archetype: "N's Zoroark",
    keyCards: ["N's Zoroark ex"],
    minimumKeyCopies: 2,
    priority: 85,
  },
  {
    archetype: 'Ogerpon Box',
    keyCards: [
      'Teal Mask Ogerpon ex',
      'Wellspring Mask Ogerpon ex',
      'Cornerstone Mask Ogerpon ex',
      'Hearthflame Mask Ogerpon ex',
    ],
    minimumKeyCopies: 4,
    priority: 80,
  },
  {
    archetype: 'Mega Lucario',
    keyCards: ['Mega Lucario ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Crustle',
    keyCards: ['Crustle'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: "Rocket's Honchkrow",
    keyCards: ["Rocket's Honchkrow ex"],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: "Hop's Trevenant",
    keyCards: ["Hop's Trevenant"],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Beedrill',
    keyCards: ['Beedrill ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: "Lillie's Clefairy",
    keyCards: ["Lillie's Clefairy ex"],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Mega Lopunny',
    keyCards: ['Mega Lopunny ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Mega Starmie',
    keyCards: ['Mega Starmie ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: "Ethan's Typhlosion",
    keyCards: ["Ethan's Typhlosion"],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Ogerpon Meganium',
    keyCards: ['Meganium', 'Teal Mask Ogerpon ex'],
    minimumKeyCopies: 3,
    priority: 80,
  },
  {
    archetype: 'Archaludon',
    keyCards: ['Archaludon ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Mega Greninja',
    keyCards: ['Mega Greninja ex'],
    minimumKeyCopies: 2,
    priority: 80,
  },
  {
    archetype: 'Greninja',
    keyCards: ['Greninja ex'],
    minimumKeyCopies: 2,
    priority: 75,
  },
  {
    archetype: 'Metagross',
    keyCards: ['Metagross'],
    minimumKeyCopies: 2,
    priority: 75,
  },
  {
    archetype: 'Mega Diancie',
    keyCards: ['Mega Diancie ex'],
    minimumKeyCopies: 2,
    priority: 75,
  },
  {
    archetype: 'Tera Box',
    keyCards: [
      'Noctowl',
      'Area Zero Underdepths',
      'Terapagos ex',
      'Teal Mask Ogerpon ex',
    ],
    minimumKeyCopies: 4,
    priority: 70,
  },
  {
    archetype: "Rocket's Mewtwo",
    keyCards: ["Rocket's Mewtwo ex"],
    minimumKeyCopies: 2,
    priority: 70,
  },
]

function normalizeCardName(value: string) {
  return value
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDecklist(decklist: string): ParsedCard[] {
  return decklist
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/)

      if (!match) return null

      const quantity = Number(match[1])

      const name = match[2]
        .replace(/\s+[A-Z]{2,5}\s+\d+.*$/, '')
        .trim()

      return {
        quantity,
        name,
      }
    })
    .filter((card): card is ParsedCard => Boolean(card))
}

function countCards(cards: ParsedCard[], targetNames: string[]) {
  const normalizedTargets = targetNames.map(normalizeCardName)

  return cards.reduce((total, card) => {
    const normalizedCardName = normalizeCardName(card.name)

    if (normalizedTargets.includes(normalizedCardName)) {
      return total + card.quantity
    }

    return total
  }, 0)
}

export function detectDeckArchetype(decklist: string): DetectedArchetype {
  const cards = parseDecklist(decklist)

  const sortedRules = [...ARCHETYPE_RULES].sort(
    (a, b) => b.priority - a.priority
  )

  for (const rule of sortedRules) {
    const keyCopies = countCards(cards, rule.keyCards)

    if (keyCopies < (rule.minimumKeyCopies ?? 1)) {
      continue
    }

    const matchingVariant = rule.variants?.find((variant) => {
      const variantCopies = countCards(cards, variant.cards)

      return variantCopies >= (variant.minimumTotalCopies ?? 1)
    })

    return {
      archetype: rule.archetype,
      variant: matchingVariant?.variant ?? rule.archetype,
    }
  }

  return {
    archetype: 'Other',
    variant: 'Other',
  }
}