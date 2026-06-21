'use client'

import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

const activeModals: HTMLElement[] = []
const backgroundSnapshots = new Map<
  HTMLElement,
  { inert: boolean; ariaHidden: string | null }
>()
let bodyStyleSnapshot: string | null = null
let lockedScrollY = 0

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hidden && element.offsetParent !== null)
}

function refreshModalIsolation() {
  const topModal = activeModals.at(-1)

  if (!topModal) {
    backgroundSnapshots.forEach((snapshot, element) => {
      element.inert = snapshot.inert

      if (snapshot.ariaHidden === null) {
        element.removeAttribute('aria-hidden')
      } else {
        element.setAttribute('aria-hidden', snapshot.ariaHidden)
      }
    })
    backgroundSnapshots.clear()

    if (bodyStyleSnapshot === null) {
      document.body.removeAttribute('style')
    } else {
      document.body.setAttribute('style', bodyStyleSnapshot)
    }

    window.scrollTo(0, lockedScrollY)
    return
  }

  Array.from(document.body.children).forEach((child) => {
    if (!(child instanceof HTMLElement)) return

    if (!backgroundSnapshots.has(child)) {
      backgroundSnapshots.set(child, {
        inert: child.inert,
        ariaHidden: child.getAttribute('aria-hidden'),
      })
    }

    const isTopModal = child === topModal || child.contains(topModal)
    child.inert = !isTopModal

    if (isTopModal) {
      child.removeAttribute('aria-hidden')
    } else {
      child.setAttribute('aria-hidden', 'true')
    }
  })
}

function registerModal(modal: HTMLElement) {
  if (activeModals.length === 0) {
    bodyStyleSnapshot = document.body.getAttribute('style')
    lockedScrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${lockedScrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflow = 'hidden'
  }

  activeModals.push(modal)
  refreshModalIsolation()
}

function unregisterModal(modal: HTMLElement) {
  const modalIndex = activeModals.lastIndexOf(modal)

  if (modalIndex >= 0) activeModals.splice(modalIndex, 1)
  refreshModalIsolation()
}

export function useModalBehavior(
  open: boolean,
  onClose: () => void,
  dialogRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>
) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    registerModal(dialog)

    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus = initialFocusRef?.current ?? dialog
      initialFocus.focus({ preventScroll: true })
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeModals.at(-1) !== dialog) return

      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(dialog)

      if (focusableElements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1) ?? firstElement

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      unregisterModal(dialog)

      window.requestAnimationFrame(() => {
        if (previouslyFocused?.isConnected) {
          previouslyFocused.focus({ preventScroll: true })
        }
      })
    }
  }, [dialogRef, initialFocusRef, open])
}
