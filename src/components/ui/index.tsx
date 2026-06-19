import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactElement,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { Children, cloneElement, forwardRef, isValidElement, useRef } from 'react'
import { createPortal } from 'react-dom'
export { ContextActionSheet } from './ContextActionSheet'
export { SwipeActionRow } from './SwipeActionRow'

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'accent'
  | 'danger'
  | 'success'
  | 'purple'
  | 'ghost'

type Size = 'sm' | 'md' | 'lg'

type FeedbackTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'

type MatchupTone = 'favored' | 'neutral' | 'unfavored'
type CardVariant = 'default' | 'elevated' | 'glass' | 'compact'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const fieldBaseClass =
  'motion-surface w-full min-h-12 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-4 py-3 text-base leading-tight text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:bg-[#202024] focus-visible:ring-2 focus-visible:ring-[rgba(23,107,181,0.35)] disabled:border-[var(--surface-border)] disabled:bg-[#101012] disabled:text-[var(--text-muted)]'

const fieldErrorClass =
  'border-[var(--color-error)] bg-[rgba(160,24,24,0.16)] ring-2 ring-[rgba(160,24,24,0.38)]'

const feedbackToneClasses: Record<FeedbackTone, string> = {
  neutral: 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]',
  info: 'bg-[var(--color-primary)] text-white',
  success: 'bg-[var(--color-success)] text-white',
  warning: 'bg-[var(--color-warning)] text-black',
  danger: 'bg-[var(--color-error)] text-white',
}

const matchupToneClasses: Record<MatchupTone, string> = {
  favored: 'border-[rgba(47,116,59,0.58)] bg-[rgba(47,116,59,0.18)]',
  neutral: 'border-[rgba(220,192,65,0.52)] bg-[rgba(220,192,65,0.14)]',
  unfavored: 'border-[rgba(160,24,24,0.58)] bg-[rgba(160,24,24,0.18)]',
}

const cardVariantClasses: Record<CardVariant, string> = {
  default: 'surface-card-default p-4',
  elevated: 'surface-card-elevated p-4',
  glass: 'surface-card-glass p-4 backdrop-blur-xl',
  compact: 'surface-card-elevated p-3',
}

export function AppShell({
  children,
  bottomNavigation,
}: {
  children: ReactNode
  bottomNavigation?: ReactNode
}) {
  return (
    <main className="app-shell-surface min-h-dvh px-4 pt-[calc(1rem+env(safe-area-inset-top))] text-[var(--text-primary)] sm:px-6 sm:pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-6xl">
        <div className="pb-[calc(6.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>

      {bottomNavigation}
    </main>
  )
}

export function Panel({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}) {
  return (
    <div
      className={cn(
        'motion-surface rounded-[18px] border',
        cardVariantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export function NestedPanel({
  className,
  variant = 'elevated',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}) {
  return (
    <div
      className={cn(
        'motion-surface rounded-2xl border',
        cardVariantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export function OverlayCard({
  className,
  variant = 'glass',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}) {
  return (
    <div
      className={cn(
        'motion-surface z-20 overflow-hidden rounded-[18px] border',
        cardVariantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export function Sheet({
  open,
  onClose,
  children,
  ariaLabel,
  className,
  contentClassName,
  contentStyle,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel: string
  className?: string
  contentClassName?: string
  contentStyle?: CSSProperties
}) {
  const sheetTouchStart = useRef<{
    x: number
    y: number
    enabled: boolean
  } | null>(null)

  if (!open) return null

  const sheet = (
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      role="dialog"
      className={cn(
        'motion-sheet-backdrop fixed inset-0 z-[60] flex items-end bg-black/65 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))] backdrop-blur-md',
        className
      )}
    >
      <button
        aria-label={`Close ${ariaLabel}`}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <OverlayCard
        className={cn(
          'motion-sheet-card relative max-h-full w-full rounded-[18px] p-0',
          contentClassName
        )}
        style={contentStyle}
        onTouchStart={(event) => {
          const touch = event.touches[0]
          const bounds = event.currentTarget.getBoundingClientRect()

          sheetTouchStart.current = {
            x: touch.clientX,
            y: touch.clientY,
            enabled: touch.clientY - bounds.top <= 96,
          }
        }}
        onTouchEnd={(event) => {
          const start = sheetTouchStart.current
          sheetTouchStart.current = null

          if (!start?.enabled) return

          const touch = event.changedTouches[0]
          const deltaX = touch.clientX - start.x
          const deltaY = touch.clientY - start.y

          if (deltaY > 72 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
            onClose()
          }
        }}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-2 w-16 rounded-full bg-white/22"
        />

        {children}
      </OverlayCard>
    </div>
  )

  if (typeof document === 'undefined') {
    return sheet
  }

  return createPortal(sheet, document.body)
}

export function OverflowMenu({
  open,
  onClose,
  children,
  className,
  backdropClassName,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  backdropClassName?: string
}) {
  if (!open) return null

  return (
    <>
      <button
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-10 cursor-default',
          backdropClassName
        )}
      />

      <OverlayCard
        className={cn(
          'motion-sheet-card absolute right-0 top-11 w-44 rounded-2xl p-1',
          className
        )}
      >
        {children}
      </OverlayCard>
    </>
  )
}

export function MenuItem({
  className,
  tone = 'default',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type={type}
      className={cn(
        'motion-press w-full rounded-xl px-4 py-3 text-left text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(220,192,65,0.7)]',
        tone === 'danger' && 'text-[var(--color-error)]',
        className
      )}
      {...props}
    />
  )
}

export function SectionHeader({
  title,
  description,
  level = 2,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  level?: 2 | 3
  className?: string
}) {
  const HeadingTag = level === 2 ? 'h2' : 'h3'

  return (
    <div className={className}>
      <HeadingTag
        className={
          level === 2
            ? 'type-screen-title text-[var(--text-primary)]'
            : 'type-section-title text-[var(--text-primary)]'
        }
      >
        {title}
      </HeadingTag>

      {description && (
        <p className="type-helper mt-1 text-[var(--text-muted)]">
          {description}
        </p>
      )}
    </div>
  )
}

const buttonToneClasses: Record<Tone, string> = {
  primary: 'bg-[var(--color-primary)] text-white hover:bg-[#1d78c8]',
  secondary: 'border border-[var(--surface-border)] bg-[rgba(26,26,29,0.84)] text-[var(--text-secondary)] hover:border-[#3a3a40] hover:bg-[#232327] hover:text-white',
  tertiary: 'bg-transparent text-[#6fb2ed] hover:bg-[rgba(23,107,181,0.1)] hover:text-white',
  accent: 'bg-[var(--color-warning)] text-black hover:bg-[#ead053]',
  danger: 'bg-transparent text-[#ff9a9a] hover:bg-[rgba(160,24,24,0.14)]',
  success: 'bg-[var(--color-success)] text-white hover:bg-[#3a8546]',
  purple: 'bg-[var(--color-primary)] text-white hover:bg-[#1d78c8]',
  ghost: 'border border-[var(--surface-border)] bg-white/8 text-[var(--text-secondary)] hover:bg-white/12 hover:text-white',
}

const buttonSizeClasses: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-4 py-3 text-sm',
  lg: 'px-4 py-4',
}

export function Button({
  tone = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone
  size?: Size
}) {
  return (
    <button
      type={type}
      className={cn(
        'motion-press min-h-11 rounded-[14px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(23,107,181,0.45)] disabled:border-transparent disabled:bg-[#161619] disabled:text-[var(--text-muted)] disabled:active:scale-100',
        buttonToneClasses[tone],
        buttonSizeClasses[size],
        className
      )}
      {...props}
    />
  )
}

export function IconButton({
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        'motion-press flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(220,192,65,0.7)]',
        className
      )}
      {...props}
    />
  )
}

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  className,
  buttonClassName,
}: {
  options: Array<{
    label: ReactNode
    value: TValue
  }>
  value: TValue
  onChange: (value: TValue) => void
  className?: string
  buttonClassName?: string
}) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )

  return (
    <div
      className={cn(
        'relative grid min-h-10 overflow-hidden rounded-[14px] border border-[var(--surface-border)] bg-[#101012] p-1',
        className
      )}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      <span
        aria-hidden="true"
        className="motion-surface absolute bottom-1 top-1 rounded-[11px] bg-[var(--color-primary)] shadow-[0_6px_18px_rgba(23,107,181,0.22)]"
        style={{
          left: `calc(${activeIndex} * ((100% - 0.5rem) / ${options.length}) + 0.25rem)`,
          width: `calc((100% - 0.5rem) / ${options.length})`,
        }}
      />

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'motion-press relative z-10 min-h-9 rounded-[11px] px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(23,107,181,0.45)]',
            option.value === value
              ? 'text-white'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            buttonClassName
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'surface-empty card-empty motion-surface type-helper rounded-xl border border-dashed px-4 py-3 text-[var(--text-muted)]',
        className
      )}
    >
      {children}
    </div>
  )
}

export function DisclosureAction({
  open,
  openLabel = 'Show',
  closeLabel = 'Hide',
  className,
}: {
  open: boolean
  openLabel?: string
  closeLabel?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-semibold text-[#6fb2ed]',
        className
      )}
    >
      <span>{open ? closeLabel : openLabel}</span>
      <span
        aria-hidden="true"
        className={`mt-[-1px] h-2 w-2 shrink-0 border-r-2 border-b-2 border-current transition-transform duration-[var(--motion-base)] ease-[var(--motion-standard)] ${
          open ? 'rotate-45' : '-rotate-45'
        }`}
      />
    </span>
  )
}

export function DisclosureContent({
  open,
  children,
  className,
  innerClassName,
}: {
  open: boolean
  children: ReactNode
  className?: string
  innerClassName?: string
}) {
  return (
    <div
      className={cn(
        'motion-disclosure grid',
        open
          ? 'grid-rows-[1fr] opacity-100 translate-y-0 scale-100'
          : 'grid-rows-[0fr] opacity-0 -translate-y-1 scale-[0.985]',
        className
      )}
    >
      <div className="overflow-hidden">
        <div className={innerClassName}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function DisclosurePanel({
  open,
  actionOpen = open,
  onToggle,
  title,
  description,
  actionOpenLabel = 'Open',
  actionCloseLabel = 'Hide',
  showAction = true,
  header,
  children,
  className,
  buttonClassName,
  actionClassName,
  contentClassName,
  bodyClassName,
}: {
  open: boolean
  actionOpen?: boolean
  onToggle: () => void
  title?: ReactNode
  description?: ReactNode
  actionOpenLabel?: string
  actionCloseLabel?: string
  showAction?: boolean
  header?: ReactNode
  children: ReactNode
  className?: string
  buttonClassName?: string
  actionClassName?: string
  contentClassName?: string
  bodyClassName?: string
}) {
  return (
    <NestedPanel
      className={cn(
        'motion-surface overflow-hidden rounded-2xl p-0',
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'motion-press flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(220,192,65,0.7)]',
          buttonClassName
        )}
      >
        {header ?? (
          <span>
            {title && (
              <span className="type-card-title block text-[var(--text-primary)]">
                {title}
              </span>
            )}

            {description && (
              <span className="type-metadata mt-1 block text-[var(--text-subtle)]">
                {description}
              </span>
            )}
          </span>
        )}

        {showAction && (
          <DisclosureAction
            open={actionOpen}
            openLabel={actionOpenLabel}
            closeLabel={actionCloseLabel}
            className={cn('shrink-0', actionClassName)}
          />
        )}
      </button>

      <DisclosureContent
        open={open}
        className={bodyClassName}
        innerClassName={contentClassName}
      >
        {children}
      </DisclosureContent>
    </NestedPanel>
  )
}

export function LayeredDisclosurePanel({
  open,
  onToggle,
  title,
  description,
  eyebrow,
  children,
  className,
  headerClassName,
  contentClassName,
}: {
  open: boolean
  onToggle: () => void
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  children: ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}) {
  return (
    <NestedPanel
      className={cn(
        'motion-layered-disclosure-shell overflow-hidden rounded-[18px] p-0',
        open && 'is-open',
        className
      )}
    >
      <Button
        tone="ghost"
        onClick={onToggle}
        aria-expanded={open}
        className={cn(
          'min-h-0 w-full rounded-none border-0 bg-transparent px-4 py-4 text-left hover:bg-white/[0.035] active:scale-100',
          headerClassName
        )}
      >
        <span className="flex w-full items-start justify-between gap-3">
          <span className="min-w-0">
            {eyebrow && (
              <span className="type-metadata mb-1 block text-[var(--text-subtle)]">
                {eyebrow}
              </span>
            )}

            <span className="type-section-title block text-[var(--text-primary)]">
              {title}
            </span>

            {description && (
              <span className="type-helper mt-1 block text-[var(--text-muted)]">
                {description}
              </span>
            )}
          </span>

          <span
            aria-hidden="true"
            className={cn(
              'motion-layered-disclosure-chevron mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-[var(--text-secondary)]',
              open && 'is-open'
            )}
          >
            <span className="h-2.5 w-2.5 border-r-2 border-b-2 border-current" />
          </span>
        </span>
      </Button>

      <div
        data-open={open ? 'true' : 'false'}
        className="motion-layered-disclosure-body grid"
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'motion-layered-disclosure-content border-t border-white/10 px-4 pb-4 pt-3',
              contentClassName
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </NestedPanel>
  )
}

export function SourcePanel({
  sources,
  className,
  variant = 'compact',
}: {
  sources: Array<{
    label: ReactNode
    value: ReactNode
  }>
  className?: string
  variant?: CardVariant
}) {
  return (
    <NestedPanel variant={variant} className={cn('space-y-2', className)}>
      {sources.map((source) => (
        <div
          key={String(source.label)}
          className="flex justify-between gap-3"
        >
          <span className="type-metadata text-[var(--text-muted)]">
            {source.label}
          </span>
          <span className="type-card-title text-right text-[var(--text-primary)]">
            {source.value}
          </span>
        </div>
      ))}
    </NestedPanel>
  )
}

export function FieldLabel({
  className,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'type-form-label mb-2 block text-[var(--text-secondary)]',
        className
      )}
      {...props}
    />
  )
}

export function ValidationMessage({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      role="alert"
      className={cn('mt-1.5 text-sm font-medium text-[#ff9a9a]', className)}
      {...props}
    />
  )
}

export const FieldError = ValidationMessage

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean
  }
>(function TextInput(
  { className, invalid = false, type = 'text', autoComplete, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      autoComplete={autoComplete}
      autoCapitalize="words"
      enterKeyHint="next"
      className={cn(
        fieldBaseClass,
        invalid && fieldErrorClass,
        className
      )}
      {...props}
    />
  )
})

export const NumberInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    invalid?: boolean
  }
>(function NumberInput(
  {
    className,
    invalid = false,
    type = 'number',
    inputMode = 'numeric',
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      inputMode={inputMode}
      enterKeyHint="next"
      className={cn(
        fieldBaseClass,
        invalid && fieldErrorClass,
        className
      )}
      {...props}
    />
  )
})

export const SelectField = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & {
    invalid?: boolean
  }
>(function SelectField(
  { className, invalid = false, children, style, ...props },
  ref
) {
  const normalizedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child

    const option = child as ReactElement<{
      value?: string
      disabled?: boolean
    }>

    if (option.type === 'option' && option.props.value === '') {
      return cloneElement(option, {
        disabled: true,
      })
    }

    return child
  })

  return (
    <select
      ref={ref}
      style={{
        backgroundImage:
          'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)',
        backgroundPosition:
          'calc(100% - 1.18rem) 52%, calc(100% - 0.88rem) 52%',
        backgroundSize: '0.32rem 0.32rem, 0.32rem 0.32rem',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
      className={cn(
        fieldBaseClass,
        'appearance-none pr-10',
        invalid && fieldErrorClass,
        className
      )}
      {...props}
    >
      {normalizedChildren}
    </select>
  )
})

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    expandable?: boolean
    invalid?: boolean
  }
>(function TextareaField(
  {
    className,
    expandable = false,
    invalid = false,
    onInput,
    ...props
  },
  ref
) {
  return (
    <textarea
      ref={ref}
      onInput={(event) => {
        if (expandable) {
          event.currentTarget.style.height = 'auto'
          event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`
        }

        onInput?.(event)
      }}
      className={cn(
        fieldBaseClass,
        'resize-none leading-6',
        expandable && 'overflow-hidden',
        invalid && fieldErrorClass,
        className
      )}
      {...props}
    />
  )
})

export const RangeField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function RangeField({ className, type = 'range', ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-7 w-full cursor-pointer accent-[#176bb5]',
        className
      )}
      {...props}
    />
  )
})

export function MetricTile({
  label,
  value,
  detail,
  className,
  labelClassName,
  valueClassName,
  detailClassName,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
  detailClassName?: string
}) {
  return (
    <div className={cn('card-data motion-surface rounded-xl p-3', className)}>
      <p
        className={cn(
          'type-metadata text-[var(--text-muted)]',
          labelClassName
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'type-metric-value mt-1 text-[var(--text-primary)]',
          valueClassName
        )}
      >
        {value}
      </p>
      {detail && (
        <p
          className={cn(
            'type-metadata mt-1 text-[0.6875rem] text-[var(--text-subtle)]',
            detailClassName
          )}
        >
          {detail}
        </p>
      )}
    </div>
  )
}

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: FeedbackTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold leading-tight tracking-normal',
        'motion-surface',
        feedbackToneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

export function ResultPill({
  result,
  className,
}: {
  result: string
  className?: string
}) {
  const tone =
    result === 'W'
      ? 'success'
      : result === 'L'
      ? 'danger'
      : 'warning'

  return (
    <StatusBadge
      tone={tone}
      className={cn(
        'h-7 min-w-7 justify-center px-2',
        className
      )}
    >
      {result}
    </StatusBadge>
  )
}

export function MatchupBadge({
  label,
  value,
  detail,
  tone = 'neutral',
  className,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  tone?: MatchupTone
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-data rounded-xl px-4 py-3',
        'motion-surface',
        matchupToneClasses[tone],
        className
      )}
    >
      <div className="flex justify-between gap-3">
        <span className="type-card-title text-[var(--text-secondary)]">{label}</span>
        <span className="type-metric-value">{value}</span>
      </div>

      {detail && (
        <p className="type-metadata mt-1 text-[var(--text-muted)]">
          {detail}
        </p>
      )}
    </div>
  )
}

export function MetricRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  label: ReactNode
  value: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
}) {
  return (
    <div className={cn('flex justify-between gap-3', className)}>
      <span
        className={cn(
          'type-metadata text-[var(--text-muted)]',
          labelClassName
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'type-card-title text-right text-[var(--text-primary)]',
          valueClassName
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function KeyValueList({
  items,
  className,
  itemClassName,
  labelClassName,
  valueClassName,
}: {
  items: Array<{
    label: ReactNode
    value: ReactNode
  }>
  className?: string
  itemClassName?: string
  labelClassName?: string
  valueClassName?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <MetricRow
          key={String(item.label)}
          label={item.label}
          value={item.value}
          className={itemClassName}
          labelClassName={labelClassName}
          valueClassName={valueClassName}
        />
      ))}
    </div>
  )
}

export function DeltaRow({
  label,
  before,
  after,
  diff,
  className,
}: {
  label: ReactNode
  before: ReactNode
  after: ReactNode
  diff: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-row motion-surface flex items-center justify-between rounded-xl px-4 py-3',
        className
      )}
    >
      <div>
        <p className="type-card-title text-[var(--text-primary)]">
          {label}
        </p>
        <p className="type-helper mt-1 text-[var(--text-muted)]">
          {before} -&gt; {after}
        </p>
      </div>

      <p
        className={cn(
          'type-metric-value',
          diff > 0 ? 'text-[#64b572]' : 'text-[#d75d5d]'
        )}
      >
        {diff > 0 ? `+${diff}` : diff}
      </p>
    </div>
  )
}
