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
      <div className="bottom-nav-surface surface-card-glass mx-auto grid h-[66px] max-w-[390px] grid-cols-5 items-center gap-0.5 rounded-full border p-1 backdrop-blur-2xl">
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
                  ? 'bottom-nav-item-active w-[70px]'
                  : 'bottom-nav-item-inactive w-[58px]'
              )}
            >
              <span className="flex min-w-0 flex-col items-center justify-center gap-0.5">
                <Icon
                  className={cn(
                    'motion-surface shrink-0',
                    isActive
                      ? 'h-[23px] w-[23px]'
                      : 'h-[22px] w-[22px]'
                  )}
                />
                <span
                  className={cn(
                    'max-w-full truncate text-[0.625rem] font-semibold leading-none tracking-normal',
                    isActive
                      ? 'bottom-nav-label-active'
                      : 'bottom-nav-label-inactive'
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
