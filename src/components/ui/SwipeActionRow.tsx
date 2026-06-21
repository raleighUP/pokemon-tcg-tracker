'use client'

import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import { useEffect, useRef, useState } from 'react'

type SwipeAction = {
  label: ReactNode
  onSelect: () => void
  tone?: 'edit' | 'delete'
}

type GestureAxis = 'pending' | 'horizontal' | 'vertical'

type GestureState = {
  pointerId: number
  startX: number
  startY: number
  startTranslate: number
  currentTranslate: number
  axis: GestureAxis
}

const ACTION_WIDTH = 72
const INTENT_THRESHOLD = 8
const AXIS_LOCK_RATIO = 1.15
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
  surface = 'default',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  actions: SwipeAction[]
  children: ReactNode
  className?: string
  contentClassName?: string
  actionClassName?: string
  onContextOpen?: () => void
  surface?: 'default' | 'solid'
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<GestureState | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)
  const [dragX, setDragX] = useState<number | null>(null)

  const actionWidth = actions.length * ACTION_WIDTH
  const canSwipe = actionWidth > 0
  const isDragging = dragX !== null
  const translateX = dragX ?? (open && canSwipe ? -actionWidth : 0)

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const resetGesture = () => {
    clearLongPress()
    gestureRef.current = null
    setDragX(null)
  }

  useEffect(() => {
    if (!open) return

    const closeOnOutside = (event: MouseEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    document.addEventListener('click', closeOnOutside, true)

    return () => {
      document.removeEventListener('click', closeOnOutside, true)
    }
  }, [onOpenChange, open])

  useEffect(() => {
    return () => clearLongPress()
  }, [])

  const startLongPress = () => {
    if (!onContextOpen) return

    clearLongPress()
    longPressTimer.current = setTimeout(() => {
      suppressClick.current = true
      onOpenChange(false)
      onContextOpen()
    }, LONG_PRESS_DELAY)
  }

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!event.isPrimary) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!canSwipe && !onContextOpen) return

    suppressClick.current = false
    const startTranslate = open && canSwipe ? -actionWidth : 0

    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslate,
      currentTranslate: startTranslate,
      axis: 'pending',
    }

    startLongPress()
  }

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const gesture = gestureRef.current

    if (!gesture || gesture.pointerId !== event.pointerId) return

    const deltaX = event.clientX - gesture.startX
    const deltaY = event.clientY - gesture.startY
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (gesture.axis === 'pending') {
      if (Math.max(absX, absY) < INTENT_THRESHOLD) return

      clearLongPress()

      if (!canSwipe) {
        gesture.axis = 'vertical'
        suppressClick.current = true
        return
      }

      if (absY > absX * AXIS_LOCK_RATIO) {
        gesture.axis = 'vertical'
        return
      }

      if (absX > absY * AXIS_LOCK_RATIO) {
        gesture.axis = 'horizontal'
        suppressClick.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragX(gesture.startTranslate)
      } else {
        return
      }
    }

    if (gesture.axis !== 'horizontal') return

    event.preventDefault()

    const nextTranslate = Math.min(
      0,
      Math.max(-actionWidth, gesture.startTranslate + deltaX)
    )

    gesture.currentTranslate = nextTranslate
    setDragX(nextTranslate)
  }

  const finishPointerGesture = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const gesture = gestureRef.current

    if (!gesture || gesture.pointerId !== event.pointerId) return

    clearLongPress()

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (gesture.axis === 'horizontal') {
      const moved = gesture.currentTranslate - gesture.startTranslate
      const settleDistance = 28
      const shouldOpen = open
        ? moved < settleDistance
        : moved <= -settleDistance

      onOpenChange(shouldOpen)
    }

    gestureRef.current = null
    setDragX(null)
  }

  return (
    <div
      ref={rowRef}
      className={cn(
        'relative overflow-hidden',
        surface === 'solid' &&
          'rounded-2xl bg-[#17171a] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]',
        className
      )}
      onContextMenu={(event) => {
        if (!onContextOpen) return

        event.preventDefault()
        onOpenChange(false)
        onContextOpen()
      }}
    >
      <div
        aria-hidden={!(open || translateX < 0)}
        className="motion-surface absolute inset-0 z-0 overflow-hidden rounded-2xl bg-[var(--color-primary)]"
        style={{ opacity: open || translateX < 0 ? 1 : 0 }}
      >
        <div
          className="absolute bottom-0 right-0 top-0 flex items-stretch justify-end"
          style={{ width: actionWidth }}
        >
          {actions.map((action, index) => (
            <button
              key={String(action.label)}
              type="button"
              tabIndex={open ? 0 : -1}
              onClick={() => {
                action.onSelect()
                onOpenChange(false)
              }}
              className={cn(
                'motion-press w-[72px] text-xs font-bold text-white',
                action.tone === 'delete'
                  ? cn(
                      'bg-[var(--color-error)] hover:bg-[#b32020]',
                      index === actions.length - 1 && 'rounded-r-2xl'
                    )
                  : 'bg-[var(--color-primary)] hover:bg-[#1d78c8]',
                actionClassName
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          'swipe-action-row-content motion-surface relative z-10 w-full overflow-hidden rounded-2xl will-change-transform',
          surface === 'solid' && 'bg-[#17171a]',
          contentClassName
        )}
        data-open={open ? 'true' : 'false'}
        data-dragging={isDragging ? 'true' : 'false'}
        style={{
          touchAction: canSwipe || onContextOpen ? 'pan-y' : 'auto',
          transform: `translate3d(${translateX}px, 0, 0)`,
          transitionDuration: isDragging ? '0ms' : undefined,
          userSelect: isDragging ? 'none' : undefined,
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return

          suppressClick.current = false
          event.preventDefault()
          event.stopPropagation()
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishPointerGesture(event)}
        onPointerCancel={finishPointerGesture}
        onPointerLeave={(event) => {
          if (
            event.pointerType === 'mouse' &&
            gestureRef.current?.axis !== 'horizontal'
          ) {
            resetGesture()
          }
        }}
      >
        {children}
      </div>
    </div>
  )
}
