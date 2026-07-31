'use client'

import { useEffect } from 'react'

import {
  readThemePreference,
  resolveTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/utils/theme'

export default function ThemeController() {
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    let preference = readThemePreference()

    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveTheme(
        preference,
        mediaQuery.matches
      )
    }

    const handleThemeChange = (event: Event) => {
      preference = (event as CustomEvent<ThemePreference>).detail
      applyTheme()
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return

      preference = readThemePreference()
      applyTheme()
    }

    const handleSystemChange = () => {
      if (preference === 'system') applyTheme()
    }

    applyTheme()
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    window.addEventListener('storage', handleStorage)
    mediaQuery.addEventListener('change', handleSystemChange)

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      window.removeEventListener('storage', handleStorage)
      mediaQuery.removeEventListener('change', handleSystemChange)
    }
  }, [])

  return null
}
