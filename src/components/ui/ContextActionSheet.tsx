'use client'

import { useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useModalBehavior } from './useModalBehavior'

type ContextAction = {
  label: ReactNode
  onSelect: () => void
  tone?: 'primary' | 'secondary' | 'tertiary' | 'danger'
}

export function ContextActionSheet({
  open,
  onClose,
  title,
  subtitle,
  details = [],
  actions = [],
  children,
  ariaLabel = 'context actions',
  initialFocus = 'dialog',
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  details?: Array<{
    label: ReactNode
    value: ReactNode
  }>
  actions?: ContextAction[]
  children?: ReactNode
  ariaLabel?: string
  initialFocus?: 'dialog' | 'close' | 'first-action'
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const firstActionRef = useRef<HTMLButtonElement>(null)
  const initialFocusRef =
    initialFocus === 'close'
      ? closeButtonRef
      : initialFocus === 'first-action'
        ? firstActionRef
        : undefined

  useModalBehavior(open, onClose, dialogRef, initialFocusRef)

  if (!open) return null

  const sheet = (
    <div
      ref={dialogRef}
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-modal="true"
      role="dialog"
      className="motion-sheet-backdrop ios-modal-scroll fixed inset-0 z-[60] flex items-end overflow-y-auto overscroll-contain bg-black/65 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] backdrop-blur-md outline-none"
    >
      <button
        aria-label={`Close ${ariaLabel}`}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="surface-card-glass motion-sheet-card relative z-10 max-h-full w-full overflow-hidden rounded-[18px] border border-[var(--surface-border)]">
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/22"
        />

        <div className="ios-modal-scroll max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain p-4 pt-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="type-section-title truncate text-[var(--text-primary)]">
                {title}
              </h3>

              {subtitle && (
                <p className="type-helper mt-1 text-[var(--text-muted)]">
                  {subtitle}
                </p>
              )}
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="motion-press min-h-9 shrink-0 rounded-[14px] bg-transparent px-2 text-sm font-semibold text-[#6fb2ed] hover:bg-[rgba(23,107,181,0.1)] hover:text-white"
            >
              Done
            </button>
          </div>

          {details.length > 0 && (
            <div className="surface-card-elevated mb-4 space-y-2 rounded-2xl border border-[var(--surface-border)] p-3">
              {details.map((detail) => (
                <div
                  key={String(detail.label)}
                  className="flex justify-between gap-3"
                >
                  <span className="type-metadata text-[var(--text-muted)]">
                    {detail.label}
                  </span>
                  <span className="type-card-title text-right text-[var(--text-primary)]">
                    {detail.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {children && (
            <div className="mb-4 space-y-3">
              {children}
            </div>
          )}

          {actions.length > 0 && (
            <div className={`grid gap-2 ${actions.length > 1 ? 'grid-cols-2' : ''}`}>
              {actions.map((action) => (
                <button
                  ref={action === actions[0] ? firstActionRef : undefined}
                  key={String(action.label)}
                  type="button"
                  onClick={() => {
                    action.onSelect()
                    onClose()
                  }}
                  className={`motion-press min-h-12 rounded-[14px] px-4 py-3 text-sm font-semibold ${
                    action.tone === 'primary'
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[#1d78c8]'
                      : action.tone === 'tertiary'
                      ? 'bg-transparent text-[#6fb2ed] hover:bg-[rgba(23,107,181,0.1)] hover:text-white'
                      : action.tone === 'danger'
                      ? 'bg-transparent text-[#ff9a9a] hover:bg-[rgba(160,24,24,0.14)]'
                      : 'border border-[var(--surface-border)] bg-[rgba(26,26,29,0.84)] text-[var(--text-secondary)] hover:bg-[#232327] hover:text-white'
                  }`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return sheet

  return createPortal(sheet, document.body)
}
