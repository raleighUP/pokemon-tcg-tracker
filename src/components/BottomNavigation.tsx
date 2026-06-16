import type { ReactNode } from 'react'
import {
  AdvisorIcon,
  CompareIcon,
  DeckIcon,
  HistoryIcon,
  LogIcon,
} from '@/components/NavIcons'
import { IconButton, cn } from '@/components/ui'

export type AppTab =
  | 'decks'
  | 'compare'
  | 'matches'
  | 'history'
  | 'advisor'

const navigationItems: Array<{
  id: AppTab
  label: string
  Icon: (props: { className?: string }) => ReactNode
}> = [
  {
    id: 'decks',
    label: 'Decks',
    Icon: DeckIcon,
  },
  {
    id: 'compare',
    label: 'Compare',
    Icon: CompareIcon,
  },
  {
    id: 'matches',
    label: 'Log',
    Icon: LogIcon,
  },
  {
    id: 'history',
    label: 'History',
    Icon: HistoryIcon,
  },
  {
    id: 'advisor',
    label: 'Advisor',
    Icon: AdvisorIcon,
  },
]

type Props = {
  activeTab: AppTab
  setActiveTab: (tab: AppTab) => void
}

export default function BottomNavigation({
  activeTab,
  setActiveTab,
}: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="surface-overlay mx-auto grid h-[68px] max-w-md grid-cols-5 gap-1 rounded-[30px] border p-1.5 shadow-[0_22px_70px_rgba(0,0,0,0.58)] backdrop-blur-2xl">
        {navigationItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id

          return (
            <IconButton
              key={id}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className={cn(
                'motion-nav-item group relative flex min-h-[56px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[24px]',
                isActive
                  ? 'bg-white/[0.92] text-[#050506] shadow-[0_12px_30px_rgba(23,107,181,0.24),inset_0_1px_0_rgba(255,255,255,0.72)]'
                  : 'text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-primary)]'
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-5 top-1 h-px rounded-full bg-[#176bb5]/70 motion-surface"
                />
              )}

              <Icon
                className={cn(
                  'motion-surface shrink-0',
                  isActive
                    ? 'h-[21px] w-[21px] text-[#050506]'
                    : 'h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                )}
              />

              <span
                className={cn(
                  'motion-surface max-w-full truncate text-[10px] font-semibold leading-none tracking-normal',
                  isActive
                    ? 'text-[#050506]'
                    : 'text-[var(--text-subtle)] group-hover:text-[var(--text-secondary)]'
                )}
              >
                {label}
              </span>
            </IconButton>
          )
        })}
      </div>
    </nav>
  )
}
