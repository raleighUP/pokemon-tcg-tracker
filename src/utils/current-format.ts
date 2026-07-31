import manifest from '@/data/current-format-manifest.json'

export type CurrentFormatManifest = typeof manifest

export const currentStandardFormat: CurrentFormatManifest = manifest

export const CURRENT_FORMAT_OPTIONS = [
  currentStandardFormat.label,
  'Gym Leader Challenge',
  'Expanded',
] as const
