'use client'

import { useState } from 'react'
import { getPokemonSprite, type PokemonIdentity } from '@/utils/pokemon-identity'
import { cn } from '@/components/ui'

export type PokemonSpriteSize = 'compact' | 'standard' | 'expanded'

const spriteSlotPixels: Record<PokemonSpriteSize, number> = {
  compact: 28,
  standard: 36,
  expanded: 40,
}

export function PokemonSprite({
  identity,
  size = 'standard',
  className,
  bare = false,
  fallbackLabel = 'Unknown deck archetype',
}: {
  identity?: PokemonIdentity
  size?: PokemonSpriteSize
  className?: string
  bare?: boolean
  fallbackLabel?: string
}) {
  const [failedIdentity, setFailedIdentity] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const requested = identity ? getPokemonSprite(identity) : null
  const fallback = getPokemonSprite('substitute')
  const useFallback = !requested || failedIdentity === identity
  const sprite = useFallback ? fallback : requested
  const slotSize = spriteSlotPixels[size]

  if (!sprite) return <span className="type-metadata">{fallbackLabel}</span>

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden',
        !bare && 'rounded-full bg-white/8',
        bare && 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]',
        className
      )}
      style={{ width: slotSize, height: slotSize }}
    >
      {/* Local generated sprites intentionally bypass Next image optimization. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={sprite.path}
        alt={useFallback ? fallbackLabel : `${identity?.replaceAll('-', ' ')} Pokémon`}
        width={slotSize}
        height={slotSize}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!useFallback && identity) {
            setLoaded(false)
            setFailedIdentity(identity)
          }
        }}
        className={cn(
          'h-[118%] w-[118%] max-w-none object-contain [image-rendering:auto]',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </span>
  )
}
