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
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-yellow-400 focus-visible:ring-2 focus-visible:ring-yellow-400/60'

const fieldErrorClass = 'border-red-500 ring-2 ring-red-500/60'

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
    <main className="min-h-screen bg-slate-950 px-4 pt-5 text-white sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-6xl">
        <div className="pb-[calc(7.5rem+env(safe-area-inset-bottom))] transition-opacity duration-200 ease-out">
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
        'rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-black/10 sm:p-6',
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
        'rounded-xl border border-slate-800 bg-slate-950 p-4',
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
        'z-20 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 shadow-xl',
        className
      )}
      {...props}
    />
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

      <OverlayCard className={cn('absolute right-0 top-10 w-40', className)}>
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
        'w-full px-4 py-3 text-left text-sm transition duration-200 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
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
        className={level === 2 ? 'text-2xl font-bold' : 'text-lg font-bold'}
      >
        {title}
      </HeadingTag>

      {description && (
        <p className="mt-1 text-sm text-slate-400">
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
        'min-h-11 rounded-xl font-semibold transition duration-200 ease-out active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 disabled:bg-slate-700 disabled:text-slate-500 disabled:active:scale-100',
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
        'flex min-h-11 min-w-11 items-center justify-center rounded-xl transition duration-200 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
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
        'grid gap-2',
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
        'rounded-xl border border-dashed border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400',
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
        className={`transition-transform duration-200 ease-out ${
          open ? 'rotate-90' : ''
        }`}
      >
        &gt;
      </span>
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
        'grid transition-all duration-200 ease-out',
        open
          ? 'grid-rows-[1fr] opacity-100'
          : 'grid-rows-[0fr] opacity-0',
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
        'overflow-hidden rounded-[8px] bg-slate-950 p-0',
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70',
          buttonClassName
        )}
      >
        {header ?? (
          <span>
            {title && (
              <span className="block text-sm font-semibold text-white">
                {title}
              </span>
            )}

            {description && (
              <span className="mt-1 block text-xs text-slate-500">
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
    <NestedPanel className={cn('space-y-2 p-3 text-xs', className)}>
      {sources.map((source) => (
        <div
          key={String(source.label)}
          className="flex justify-between gap-3"
        >
          <span className="text-slate-400">{source.label}</span>
          <span className="text-right font-semibold">
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
      className={cn('mb-2 block text-sm font-semibold', className)}
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
      className={cn('mt-1 text-sm text-red-400', className)}
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
  { className, invalid = false, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        fieldBaseClass,
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
        'resize-none',
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
      className={cn('w-full', className)}
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
    <div className={cn('rounded-xl bg-slate-900 p-3', className)}>
      <p className={cn('text-slate-400', labelClassName)}>{label}</p>
      <p className={cn('font-bold', valueClassName)}>{value}</p>
      {detail && (
        <p className={cn('text-[10px] text-slate-500', detailClassName)}>
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
        'inline-flex items-center rounded-full px-2 py-1 text-xs font-bold',
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
        'rounded-xl border px-4 py-3',
        matchupToneClasses[tone],
        className
      )}
    >
      <div className="flex justify-between gap-3">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>

      {detail && (
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
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
      <span className={cn('text-slate-400', labelClassName)}>
        {label}
      </span>
      <span className={cn('text-right font-bold', valueClassName)}>
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
        'flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3',
        className
      )}
    >
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-slate-400">
          {before} -&gt; {after}
        </p>
      </div>

      <p
        className={cn(
          'font-bold',
          diff > 0 ? 'text-green-400' : 'text-red-400'
        )}
      >
        {diff > 0 ? `+${diff}` : diff}
      </p>
    </div>
  )
}
