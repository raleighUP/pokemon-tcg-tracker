type IconProps = {
  className?: string
}

const iconStroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 5.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function DeckIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect {...iconStroke} x="41" y="18" width="32" height="48" rx="7" transform="rotate(7 41 18)" />
      <rect {...iconStroke} x="29" y="24" width="32" height="48" rx="7" transform="rotate(-4 29 24)" />
      <rect {...iconStroke} x="18" y="34" width="32" height="48" rx="7" transform="rotate(-10 18 34)" />
    </svg>
  )
}

export function CompareIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect {...iconStroke} x="18" y="38" width="22" height="36" rx="7" />
      <rect {...iconStroke} x="60" y="24" width="22" height="36" rx="7" />
      <path {...iconStroke} d="M45 38h19" />
      <path {...iconStroke} d="M58 28l12 10-12 10" />
      <path {...iconStroke} d="M55 74H36" />
      <path {...iconStroke} d="M42 64 30 74l12 10" />
    </svg>
  )
}

export function LogIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <rect {...iconStroke} x="24" y="22" width="38" height="56" rx="8" />
      <path {...iconStroke} d="M36 22v-4c0-9 14-9 14 0v4" />
      <path {...iconStroke} d="M35 40h18" />
      <path {...iconStroke} d="M35 55h15" />
      <path {...iconStroke} d="M58 75 78 55l10 10-20 20H58V75Z" />
    </svg>
  )
}

export function HistoryIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path {...iconStroke} d="M22 30v22h22" />
      <path {...iconStroke} d="M25 52c0-17 13-30 30-30s30 13 30 30-13 30-30 30c-13 0-24-8-28-19" />
      <path {...iconStroke} d="M55 36v18l13 8" />
    </svg>
  )
}

export function AdvisorIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <path {...iconStroke} d="M22 72 39 55l12 10 27-31" />
      <path {...iconStroke} d="M67 34h11v11" />
      <path {...iconStroke} d="M22 26h18" />
      <path {...iconStroke} d="M22 42h30" />
      <path {...iconStroke} d="M22 86h56" />
    </svg>
  )
}
