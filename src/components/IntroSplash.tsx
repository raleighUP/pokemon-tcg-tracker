'use client'

import { useCallback, useEffect, useState } from 'react'

const INTRO_LAST_SHOWN_KEY = 'top-cut-intro-last-shown'
const INTRO_COOLDOWN_MS = 8 * 60 * 60 * 1000
const INTRO_VISIBLE_DURATION_SECONDS = 1.6
const INTRO_FALLBACK_MS = 4000
const INTRO_EXIT_MS = 240

type IntroPhase = 'checking' | 'playing' | 'leaving' | 'hidden'

export default function IntroSplash() {
  const [phase, setPhase] = useState<IntroPhase>('checking')

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
        <button
          type="button"
          aria-label="Skip introduction"
          onClick={dismiss}
          className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[rgba(220,192,65,0.7)]"
        >
          <video
            autoPlay
            muted
            playsInline
            preload="auto"
            onTimeUpdate={(event) => {
              if (
                event.currentTarget.currentTime >=
                INTRO_VISIBLE_DURATION_SECONDS
              ) {
                dismiss()
              }
            }}
            onEnded={dismiss}
            onError={dismiss}
            className="pointer-events-none h-full w-full object-contain"
          >
            <source
              src="/intro/top-cut-intro.mp4"
              type="video/mp4"
            />
          </video>
        </button>
      )}
    </div>
  )
}
