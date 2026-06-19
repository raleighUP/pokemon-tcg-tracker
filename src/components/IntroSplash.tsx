'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DotLottieReact,
  type DotLottie,
} from '@lottiefiles/dotlottie-react'

const INTRO_LAST_SHOWN_KEY = 'top-cut-intro-last-shown'
const INTRO_COOLDOWN_MS = 8 * 60 * 60 * 1000
const INTRO_VISIBLE_DURATION_MS = 1600
const INTRO_FALLBACK_MS = 4000
const INTRO_EXIT_MS = 240

type IntroPhase = 'checking' | 'playing' | 'leaving' | 'hidden'

export default function IntroSplash() {
  const [phase, setPhase] = useState<IntroPhase>('checking')
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null)

  const dismiss = useCallback(() => {
    setPhase((current) =>
      current === 'playing' ? 'leaving' : current
    )
  }, [])

  useEffect(() => {
    const now = Date.now()
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    let nextPhase: IntroPhase = 'playing'

    try {
      const lastShown = Number(
        localStorage.getItem(INTRO_LAST_SHOWN_KEY)
      )
      const isCoolingDown =
        Number.isFinite(lastShown) &&
        lastShown > 0 &&
        now - lastShown < INTRO_COOLDOWN_MS

      if (isCoolingDown || prefersReducedMotion) {
        if (!isCoolingDown) {
          localStorage.setItem(INTRO_LAST_SHOWN_KEY, String(now))
        }

        nextPhase = 'hidden'
      } else {
        localStorage.setItem(INTRO_LAST_SHOWN_KEY, String(now))
      }
    } catch {
      if (prefersReducedMotion) {
        nextPhase = 'hidden'
      }
    }

    const phaseTimer = window.setTimeout(
      () => setPhase(nextPhase),
      0
    )

    return () => window.clearTimeout(phaseTimer)
  }, [])

  useEffect(() => {
    if (!dotLottie || phase !== 'playing') return

    let cutoffTimer: number | undefined

    const startCutoffTimer = () => {
      window.clearTimeout(cutoffTimer)
      cutoffTimer = window.setTimeout(
        dismiss,
        INTRO_VISIBLE_DURATION_MS
      )
    }
    const handlePlaybackError = () => dismiss()

    dotLottie.addEventListener('play', startCutoffTimer)
    dotLottie.addEventListener('complete', dismiss)
    dotLottie.addEventListener('loadError', handlePlaybackError)
    dotLottie.addEventListener('renderError', handlePlaybackError)

    if (dotLottie.isPlaying) {
      startCutoffTimer()
    }

    return () => {
      window.clearTimeout(cutoffTimer)
      dotLottie.removeEventListener('play', startCutoffTimer)
      dotLottie.removeEventListener('complete', dismiss)
      dotLottie.removeEventListener('loadError', handlePlaybackError)
      dotLottie.removeEventListener('renderError', handlePlaybackError)
    }
  }, [dismiss, dotLottie, phase])

  useEffect(() => {
    if (phase === 'playing') {
      const fallbackTimer = window.setTimeout(
        dismiss,
        INTRO_FALLBACK_MS
      )

      return () => window.clearTimeout(fallbackTimer)
    }

    if (phase === 'leaving') {
      const exitTimer = window.setTimeout(
        () => setPhase('hidden'),
        INTRO_EXIT_MS
      )

      return () => window.clearTimeout(exitTimer)
    }
  }, [dismiss, phase])

  if (phase === 'hidden') return null

  return (
    <div
      role="dialog"
      aria-label="Top Cut introduction"
      className={`fixed inset-0 z-[100] bg-[#0a0a0d] transition-opacity duration-[var(--motion-slow)] ease-[var(--motion-standard)] ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {phase !== 'checking' && (
        <>
          <DotLottieReact
            src="/intro/top-cut-intro.lottie"
            autoplay
            loop={false}
            layout={{ fit: 'contain', align: [0.5, 0.5] }}
            renderConfig={{ autoResize: true }}
            dotLottieRefCallback={setDotLottie}
            className="pointer-events-none h-full w-full"
          />

          <button
            type="button"
            aria-label="Skip introduction"
            onClick={dismiss}
            className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(220,192,65,0.7)]"
          />
        </>
      )}
    </div>
  )
}
