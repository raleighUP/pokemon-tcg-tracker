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
    <nav className="fixed inset-x-0 bottom-[max(0.5rem,calc(env(safe-area-inset-bottom)-0.5rem))] z-50 px-4">
      <div className="surface-card-glass mx-auto grid h-[66px] max-w-[390px] grid-cols-5 items-center gap-0.5 rounded-full border border-white/12 p-1 shadow-[0_16px_44px_rgba(0,0,0,0.54)] backdrop-blur-2xl">
        {navigationItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id

          return (
            <IconButton
              key={id}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className={cn(
                'motion-nav-item t-resize group relative mx-auto flex h-12 min-h-0 min-w-0 items-center justify-center overflow-hidden !rounded-[23px]',
                isActive
                  ? 'w-[70px] bg-white/24 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_8px_18px_rgba(0,0,0,0.24)]'
                  : 'w-[58px] text-white/82 hover:bg-white/10 hover:text-white'
              )}
            >
              <span className="flex min-w-0 flex-col items-center justify-center gap-0.5">
                <Icon
                  className={cn(
                    'motion-surface shrink-0',
                    isActive
                      ? 'h-[23px] w-[23px] text-white'
                      : 'h-[22px] w-[22px] text-white/86 group-hover:text-white'
                  )}
                />
                <span
                  className={cn(
                    'max-w-full truncate text-[0.625rem] font-semibold leading-none tracking-normal',
                    isActive ? 'text-white' : 'text-white/72'
                  )}
                >
                  {label}
                </span>
              </span>
            </IconButton>
          )
        })}
      </div>
    </nav>
  )
}
