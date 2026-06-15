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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const fieldBaseClass =
  'w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-yellow-400'

const fieldErrorClass = 'border-red-500 ring-2 ring-red-500/60'

export function AppShell({
  children,
  bottomNavigation,
}: {
  children: ReactNode
  bottomNavigation?: ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="pb-24">{children}</div>
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
        'rounded-2xl border border-slate-800 bg-slate-900 p-6',
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
  accent: 'bg-yellow-400 text-black hover:scale-[1.02]',
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
        'rounded-xl font-semibold transition disabled:bg-slate-700 disabled:text-slate-500',
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
        'flex items-center justify-center rounded-xl transition',
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
    <p className={cn('text-sm text-slate-400', className)}>
      {children}
    </p>
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
