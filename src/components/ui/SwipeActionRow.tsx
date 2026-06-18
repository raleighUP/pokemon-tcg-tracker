'use client'

import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  TouchEvent as ReactTouchEvent,
} from 'react'
import { useEffect, useRef, useState } from 'react'

type SwipeAction = {
  label: ReactNode
  onSelect: () => void
  tone?: 'edit' | 'delete'
}

const ACTION_WIDTH = 64
const LONG_PRESS_DELAY = 520

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function SwipeActionRow({
  open,
  onOpenChange,
  actions,
  children,
  className,
  contentClassName,
  actionClassName,
  onContextOpen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: SwipeAction[]
  children: ReactNode
  className?: string
  contentClassName?: string
  actionClassName?: string
  onContextOpen?: () => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dragX, setDragX] = useState(0)

  const actionWidth = actions.length * ACTION_WIDTH

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  useEffect(() => {
    if (!open) return

    const closeOnOutside = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    const closeOnScroll = () => {
      onOpenChange(false)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('scroll', closeOnScroll, true)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [onOpenChange, open])

  useEffect(() => clearLongPress, [])

  const startLongPress = () => {
    if (!onContextOpen) return

    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      onOpenChange(false)
      onContextOpen()
    }, LONG_PRESS_DELAY)
  }

  const translateX =
    dragX !== 0 ? dragX : open ? -actionWidth : 0

  return (
    <div
      ref={rowRef}
      className={cn('relative overflow-hidden', className)}
      onContextMenu={(event) => {
        if (!onContextOpen) return

        event.preventDefault()
        onOpenChange(false)
        onContextOpen()
      }}
      onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType === 'touch') return
        if (event.pointerType === 'mouse' && event.button !== 0) return
        startLongPress()
      }}
      onPointerUp={clearLongPress}
      onPointerCancel={clearLongPress}
      onPointerLeave={clearLongPress}
    >
      <div
        aria-hidden={!open}
        className="absolute bottom-px right-px top-px flex items-stretch justify-end overflow-hidden rounded-r-2xl"
        style={{ width: actionWidth }}
      >
        {actions.map((action) => (
          <button
            key={String(action.label)}
            type="button"
            onClick={() => {
              action.onSelect()
              onOpenChange(false)
            }}
            className={cn(
              'motion-press w-16 text-xs font-bold text-white',
              action.tone === 'delete'
                ? 'bg-[var(--color-error)] hover:bg-[#b32020]'
                : 'bg-[var(--color-primary)] hover:bg-[#1d78c8]',
              actionClassName
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div
        className={cn(
          'swipe-action-row-content motion-surface relative will-change-transform',
          contentClassName,
          open && actions.length > 0 && 'rounded-r-none'
        )}
        data-open={open ? 'true' : 'false'}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
        onTouchStart={(event: ReactTouchEvent<HTMLDivElement>) => {
          touchStartX.current = event.touches[0].clientX
          touchStartY.current = event.touches[0].clientY
          startLongPress()
        }}
        onTouchMove={(event: ReactTouchEvent<HTMLDivElement>) => {
          if (
            touchStartX.current === null ||
            touchStartY.current === null
          ) {
            return
          }

          const deltaX = event.touches[0].clientX - touchStartX.current
          const deltaY = event.touches[0].clientY - touchStartY.current

          if (Math.abs(deltaY) > 10) {
            clearLongPress()
            setDragX(0)
            return
          }

          if (Math.abs(deltaX) > 8) {
            clearLongPress()
          }

          if (deltaX < 0) {
            setDragX(Math.max(deltaX, -actionWidth))
          } else if (open) {
            setDragX(Math.min(deltaX - actionWidth, 0))
          }
        }}
        onTouchEnd={() => {
          clearLongPress()

          if (dragX < -(actionWidth * 0.4)) {
            onOpenChange(true)
          } else if (dragX > -(actionWidth * 0.65)) {
            onOpenChange(false)
          }

          setDragX(0)
          touchStartX.current = null
          touchStartY.current = null
        }}
      >
        {children}
      </div>
    </div>
  )
}
