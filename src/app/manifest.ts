import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Top Cut',
    short_name: 'Top Cut',
    description:
      'Track Pokémon TCG decks, log matches, review events, and compare tournament choices with Top Cut.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0B0B0D',
    theme_color: '#0B0B0D',
    categories: ['games', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/app-icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/top-cut-app-icon-dark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
