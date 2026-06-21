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
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <mask id="deck-back-card-mask">
          <rect width="32" height="32" fill="white" />
          <rect x="8" y="8" width="16" height="20" rx="2.5" fill="black" />
        </mask>
        <mask id="deck-middle-card-mask">
          <rect width="32" height="32" fill="white" />
          <rect x="12" y="4" width="16" height="20" rx="2.5" fill="black" />
        </mask>
      </defs>
      <rect
        {...iconStroke}
        x="5"
        y="13"
        width="14"
        height="18"
        rx="1.5"
        mask="url(#deck-back-card-mask)"
      />
      <rect
        {...iconStroke}
        x="9"
        y="9"
        width="14"
        height="18"
        rx="1.5"
        mask="url(#deck-middle-card-mask)"
      />
      <rect
        {...iconStroke}
        x="13"
        y="5"
        width="14"
        height="18"
        rx="1.5"
      />
    </svg>
  )
}

export function CompareIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...iconStroke} d="M4 7h16" />
      <path {...iconStroke} d="m16 3 4 4-4 4" />
      <path {...iconStroke} d="M20 17H4" />
      <path {...iconStroke} d="m8 13-4 4 4 4" />
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
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect {...iconStroke} x="6" y="6" width="20" height="24" rx="2" />
      <rect
        {...iconStroke}
        x="11"
        y="4"
        width="10"
        height="4"
        rx="1"
        fill="var(--surface-elevated)"
      />
      <polyline
        points="10,17 14,21 22,12"
        {...iconStroke}
        strokeWidth="2.5"
      />
    </svg>
  )
}

export function AdvisorIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect {...iconStroke} x="11" y="5" width="10" height="24" rx="1" />
      <rect {...iconStroke} x="3" y="12" width="8" height="17" rx="1" />
      <rect {...iconStroke} x="21" y="14" width="8" height="15" rx="1" />
      <line {...iconStroke} x1="3" y1="29" x2="29" y2="29" />
    </svg>
  )
}

export function SettingsIcon({ className = '' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        {...iconStroke}
        strokeWidth="2"
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"
      />
      <circle {...iconStroke} strokeWidth="2" cx="12" cy="12" r="2.75" />
    </svg>
  )
}
