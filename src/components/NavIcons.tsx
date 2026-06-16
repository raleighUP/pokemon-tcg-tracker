type IconProps = {
  className?: string
}

const iconStroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function DeckIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect {...iconStroke} x="7" y="4" width="10" height="15" rx="2.5" />
      <path {...iconStroke} d="M10 7h4" />
      <path {...iconStroke} d="M9 16h6" />
    </svg>
  )
}

export function CompareIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconStroke} d="M7 7h10" />
      <path {...iconStroke} d="m14 4 3 3-3 3" />
      <path {...iconStroke} d="M17 17H7" />
      <path {...iconStroke} d="m10 14-3 3 3 3" />
    </svg>
  )
}

export function LogIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect {...iconStroke} x="6" y="4" width="12" height="16" rx="2.5" />
      <path {...iconStroke} d="M9 9h6" />
      <path {...iconStroke} d="M9 13h4" />
      <path {...iconStroke} d="m9 17 2 2 4-5" />
    </svg>
  )
}

export function HistoryIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconStroke} d="M4 12a8 8 0 1 0 2.35-5.65" />
      <path {...iconStroke} d="M4 5v5h5" />
      <path {...iconStroke} d="M12 8v5l3 2" />
    </svg>
  )
}

export function AdvisorIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconStroke} d="M4 18h16" />
      <path {...iconStroke} d="m5 15 4-4 3 3 6-7" />
      <path {...iconStroke} d="M15 7h3v3" />
    </svg>
  )
}
