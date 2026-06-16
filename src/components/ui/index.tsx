import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { forwardRef } from 'react'

type Tone =
  | 'primary'
  | 'secondary'
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

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const fieldBaseClass =
  'motion-surface w-full min-h-12 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3 text-base leading-tight text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] outline-none placeholder:text-[var(--text-subtle)] focus:border-[#176bb5]/70 focus:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-[#176bb5]/35 disabled:border-white/5 disabled:bg-white/[0.025] disabled:text-[var(--text-subtle)]'

const fieldErrorClass =
  'border-red-500/80 bg-red-950/20 ring-2 ring-red-500/40'

const feedbackToneClasses: Record<FeedbackTone, string> = {
  neutral: 'bg-slate-800 text-slate-300',
  info: 'bg-blue-500 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-400 text-black',
  danger: 'bg-red-500 text-white',
}

const matchupToneClasses: Record<MatchupTone, string> = {
  favored: 'border-green-500 bg-green-950/20',
  neutral: 'border-yellow-500 bg-yellow-950/20',
  unfavored: 'border-red-500 bg-red-950/20',
}

export function AppShell({
  children,
  bottomNavigation,
}: {
  children: ReactNode
  bottomNavigation?: ReactNode
}) {
  return (
    <main className="app-shell-surface min-h-dvh px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white sm:px-6 sm:pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-6xl">
        <div className="motion-surface pb-[calc(6rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>

      {bottomNavigation}
    </main>
  )
}

export function Panel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'surface-primary card-workflow motion-surface rounded-2xl border p-5 sm:p-6',
        className
      )}
      {...props}
    />
  )
}

export function NestedPanel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'surface-secondary card-detail motion-surface rounded-xl border p-4',
        className
      )}
      {...props}
    />
  )
}

export function OverlayCard({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'surface-overlay motion-surface z-20 overflow-hidden rounded-xl border',
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
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  ariaLabel: string
  className?: string
  contentClassName?: string
}) {
  if (!open) return null

  return (
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
          'motion-sheet-card relative max-h-full w-full rounded-[28px] p-0',
          contentClassName
        )}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/22"
        />

        {children}
      </OverlayCard>
    </div>
  )
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
        'motion-press w-full rounded-xl px-4 py-3 text-left text-sm hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
        tone === 'danger' && 'text-red-400',
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
  primary: 'bg-blue-600 text-white hover:bg-blue-500',
  secondary: 'bg-slate-800 text-slate-300 hover:bg-slate-700',
  accent: 'bg-yellow-400 text-black hover:bg-yellow-300',
  danger: 'bg-red-900/40 text-red-200 hover:bg-red-900/70',
  success: 'bg-green-500 text-white hover:bg-green-600',
  purple: 'bg-purple-500 text-white hover:bg-purple-600',
  ghost: 'bg-slate-700 text-white hover:bg-slate-600',
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
        'motion-press min-h-11 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 disabled:bg-slate-700 disabled:text-slate-500 disabled:active:scale-100',
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
        'motion-press flex min-h-11 min-w-11 items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
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
  return (
    <div
      className={cn(
        'grid gap-1 rounded-2xl border border-white/10 bg-black/20 p-1',
        options.length === 2 ? 'grid-cols-2' : '',
        className
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          tone={option.value === value ? 'primary' : 'secondary'}
          onClick={() => onChange(option.value)}
          className={buttonClassName}
        >
          {option.label}
        </Button>
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
        'inline-flex items-center gap-2 text-xs font-semibold text-blue-300',
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
          ? 'grid-rows-[1fr] opacity-100 translate-y-0'
          : 'grid-rows-[0fr] opacity-0 -translate-y-1',
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
          'motion-press flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
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

export function SourcePanel({
  sources,
  className,
}: {
  sources: Array<{
    label: ReactNode
    value: ReactNode
  }>
  className?: string
}) {
  return (
    <NestedPanel className={cn('space-y-2 p-3', className)}>
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
      className={cn('mt-1.5 text-sm font-medium text-red-300', className)}
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
      {children}
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
        <span className="type-card-title text-slate-300">{label}</span>
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
          diff > 0 ? 'text-green-400' : 'text-red-400'
        )}
      >
        {diff > 0 ? `+${diff}` : diff}
      </p>
    </div>
  )
}
