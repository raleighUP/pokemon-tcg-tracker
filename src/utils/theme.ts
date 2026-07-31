import {
  safeGetStorageValue,
  safeSetStorageValue,
} from '@/utils/app-storage'

export const THEME_STORAGE_KEY = 'pokemon-theme-preference'
export const THEME_CHANGE_EVENT = 'top-cut-theme-change'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export function readThemePreference(): ThemePreference {
  const storedTheme = safeGetStorageValue(THEME_STORAGE_KEY)

  return storedTheme === 'light' ||
    storedTheme === 'dark' ||
    storedTheme === 'system'
    ? storedTheme
    : 'system'
}

export function writeThemePreference(theme: ThemePreference) {
  const stored = safeSetStorageValue(THEME_STORAGE_KEY, theme)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ThemePreference>(THEME_CHANGE_EVENT, {
        detail: theme,
      })
    )
  }

  return stored
}

export function resolveTheme(
  preference: ThemePreference,
  prefersLight: boolean
): ResolvedTheme {
  if (preference === 'system') {
    return prefersLight ? 'light' : 'dark'
  }

  return preference
}
