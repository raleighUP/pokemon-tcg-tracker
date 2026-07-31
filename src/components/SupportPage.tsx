'use client'

import Link from 'next/link'

import {
  APP_NAME,
  PRIVACY_POLICY_PATH,
  SUPPORT_EMAIL,
} from '@/constants/app-info'
import { AppShell, Panel, SectionHeader } from '@/components/ui'

const emailHref = `mailto:${SUPPORT_EMAIL}`

export default function SupportPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-[var(--link-color)] hover:text-[var(--text-primary)]"
        >
          ← Back to {APP_NAME}
        </Link>

        <SectionHeader
          title="Support"
          description={`Help with ${APP_NAME}`}
          level={1}
        />

        <Panel className="space-y-3">
          <SectionHeader title="Contact Support" level={2} />
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Email{' '}
            <a
              href={emailHref}
              className="break-all font-semibold text-[var(--link-color)] underline decoration-current/40 underline-offset-4 hover:text-[var(--text-primary)]"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Contact us for bug reports, feature suggestions, privacy questions, data export or import help, general support, or business inquiries.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Troubleshooting" level={2} />
          <ul className="list-disc space-y-2 pl-5">
            <li>Export your data before deleting or reinstalling the app.</li>
            <li>Local data does not currently synchronize across devices.</li>
            <li>Use Import Data in Settings to restore a compatible previous export.</li>
            <li>If import fails, confirm that the selected file is an unmodified {APP_NAME} JSON export.</li>
          </ul>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Data and Privacy" level={2} />
          <p>
            Your decks, matches, events, advisor settings, and app preferences are currently stored locally on your device. {APP_NAME} does not currently offer cloud backup or cross-device synchronization.
          </p>
          <Link
            href={PRIVACY_POLICY_PATH}
            className="inline-flex min-h-11 items-center font-semibold text-[var(--link-color)] hover:text-[var(--text-primary)]"
          >
            View Privacy Policy
          </Link>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Independent and Unofficial" level={2} />
          <p>
            {APP_NAME} is an independent tournament tracking and deck analysis tool. It is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, The Pokémon Company, Game Freak, Creatures Inc., Play! Pokémon, or any tournament organizer.
          </p>
        </Panel>
      </div>
    </AppShell>
  )
}
