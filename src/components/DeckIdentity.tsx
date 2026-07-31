import { cn } from '@/components/ui'
import { getDeckPokemonIdentities } from '@/utils/pokemon-identity'
import { PokemonSprite, type PokemonSpriteSize } from './PokemonSprite'

export default function DeckIdentity({
  name,
  spriteSource = name,
  size = 'standard',
  maxSprites = 2,
  className,
  textClassName,
  spritePosition = 'start',
  bareSprites = false,
  showLabel = true,
}: {
  name: string
  spriteSource?: string
  size?: PokemonSpriteSize
  maxSprites?: 1 | 2 | 3
  className?: string
  textClassName?: string
  spritePosition?: 'start' | 'end'
  bareSprites?: boolean
  showLabel?: boolean
}) {
  const identities = getDeckPokemonIdentities(spriteSource).slice(0, maxSprites)
  const renderedIdentities = identities.length > 0 ? identities : [undefined]
  const sprites = (
    <span
      className="flex shrink-0 -space-x-1"
      aria-label={identities.length ? `Pokémon identity: ${identities.join(', ')}` : 'Unknown deck archetype'}
    >
      {renderedIdentities.map((identity, index) => (
        <PokemonSprite key={identity ?? `fallback-${index}`} identity={identity} size={size} bare={bareSprites} />
      ))}
    </span>
  )

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      {spritePosition === 'start' && sprites}
      {showLabel && <span className={cn('min-w-0 truncate', textClassName)}>{name}</span>}
      {spritePosition === 'end' && sprites}
    </span>
  )
}
