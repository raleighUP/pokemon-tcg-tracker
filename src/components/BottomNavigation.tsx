import type { ReactNode } from 'react'
import {
  AdvisorIcon,
  CompareIcon,
  DeckIcon,
  HistoryIcon,
  LogIcon,
} from '@/components/NavIcons'
import { IconButton } from '@/components/ui'

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
    <nav className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto grid h-[76px] max-w-md grid-cols-5 gap-1 rounded-[28px] border border-white/10 bg-slate-900/88 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {navigationItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id

          return (
            <IconButton
              key={id}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className={`group flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[20px] transition duration-200 ease-out ${
                isActive
                  ? 'scale-[1.03] bg-white text-slate-950 shadow-lg shadow-black/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon
                className={`h-6 w-6 transition duration-200 ${
                  isActive
                    ? 'text-slate-950'
                    : 'text-slate-400 group-hover:text-white'
                }`}
              />

              <span
                className={`max-w-full truncate text-[10px] font-semibold leading-none transition duration-200 ${
                  isActive ? 'text-slate-950' : 'text-slate-400'
                }`}
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
