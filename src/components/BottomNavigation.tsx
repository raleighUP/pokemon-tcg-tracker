import type { ReactNode } from 'react'
import {
  AdvisorIcon,
  CompareIcon,
  DeckIcon,
  HistoryIcon,
  SettingsIcon,
} from '@/components/NavIcons'
import { IconButton, cn } from '@/components/ui'

export type AppTab =
  | 'decks'
  | 'compare'
  | 'history'
  | 'advisor'
  | 'settings'

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
    id: 'history',
    label: 'History',
    Icon: HistoryIcon,
  },
  {
    id: 'advisor',
    label: 'Advisor',
    Icon: AdvisorIcon,
  },
  {
    id: 'settings',
    label: 'Settings',
    Icon: SettingsIcon,
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
    <nav className="fixed inset-x-0 bottom-[calc(0.875rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="surface-card-glass mx-auto grid h-[60px] max-w-[390px] grid-cols-5 items-center gap-0.5 rounded-full border border-white/12 p-1 shadow-[0_16px_44px_rgba(0,0,0,0.54)] backdrop-blur-2xl">
        {navigationItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id

          return (
            <IconButton
              key={id}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className={cn(
                'motion-nav-item group relative mx-auto flex h-12 min-h-0 min-w-0 items-center justify-center overflow-hidden !rounded-[23px]',
                isActive
                  ? 'w-[66px] bg-white/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.24)]'
                  : 'w-12 text-white/82 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'motion-surface shrink-0',
                  isActive
                    ? 'h-7 w-7 text-white'
                    : 'h-[26px] w-[26px] text-white/86 group-hover:text-white'
                )}
              />
            </IconButton>
          )
        })}
      </div>
    </nav>
  )
}
