import type { NormalizedBounds } from './schema.ts'

export function screenBoundsToNormalized(bounds: NormalizedBounds, displayWidth: number, displayHeight: number): NormalizedBounds {
  return {
    x: bounds.x / displayWidth,
    y: bounds.y / displayHeight,
    width: bounds.width / displayWidth,
    height: bounds.height / displayHeight,
  }
}

export function normalizedBoundsToDisplay(bounds: NormalizedBounds, displayWidth: number, displayHeight: number): NormalizedBounds {
  return {
    x: bounds.x * displayWidth,
    y: bounds.y * displayHeight,
    width: bounds.width * displayWidth,
    height: bounds.height * displayHeight,
  }
}

export function clampNormalizedBounds(bounds: NormalizedBounds): NormalizedBounds {
  const x = Math.max(0, Math.min(1, bounds.x))
  const y = Math.max(0, Math.min(1, bounds.y))
  return {
    x,
    y,
    width: Math.max(0, Math.min(1 - x, bounds.width)),
    height: Math.max(0, Math.min(1 - y, bounds.height)),
  }
}
