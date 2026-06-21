'use client'

import Link from 'next/link'

import {
  APP_NAME,
  PRIVACY_POLICY_EFFECTIVE_DATE,
  SUPPORT_EMAIL,
  SUPPORT_PATH,
} from '@/constants/app-info'
import { AppShell, Panel, SectionHeader } from '@/components/ui'

const emailHref = `mailto:${SUPPORT_EMAIL}`

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold text-[#6fb2ed] hover:text-white"
        >
          ← Back to {APP_NAME}
        </Link>

        <SectionHeader
          title="Privacy Policy"
          description={`Effective date: ${PRIVACY_POLICY_EFFECTIVE_DATE}`}
          level={1}
        />

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Overview" level={2} />
          <p>
            This Privacy Policy explains how {APP_NAME} handles information. {APP_NAME} is an independent Pokémon TCG tournament tracking and deck analysis tool.
          </p>
          <p>
            The app currently works without an account and does not collect or transmit your tournament data to a remote service.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Information Stored on Your Device" level={2} />
          <p>
            Decks, matches, events, advisor settings, intro history, and other app preferences may be stored locally on your device using app storage.
          </p>
          <p>
            {APP_NAME} does not currently provide cloud backup or synchronization across devices. Removing the app, clearing its storage, or losing access to the device may permanently remove this local data.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Accounts, Analytics, and Tracking" level={2} />
          <p>
            {APP_NAME} does not currently require account creation and does not currently use analytics, advertising, behavioral tracking, or remote user-data collection.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Importing and Exporting Data" level={2} />
          <p>
            You can export your local {APP_NAME} data as a JSON backup file. The exported file may include decks, matches, events, advisor settings, app preferences, a schema version, and an export timestamp.
          </p>
          <p>
            Import reads a backup file that you select and, after confirmation, replaces the corresponding local data on your device. {APP_NAME} does not upload exported or imported files. You control where exported files are stored or shared.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Support Communications" level={2} />
          <p>
            If you contact support by email, we receive the email address and information you choose to include so that we can respond. The app does not automatically attach or transmit your locally stored data. Please do not include sensitive personal information in support messages.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Children’s Privacy" level={2} />
          <p>
            {APP_NAME} does not knowingly collect personal information from children through the app. Because no account is required and app records remain local, users should avoid entering sensitive personal information into deck, event, match, or notes fields. Children should involve a parent or guardian when contacting support where appropriate.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Changes to This Policy" level={2} />
          <p>
            This policy may be updated if {APP_NAME}’s features or data practices change. Any updated version will include a revised effective date.
          </p>
        </Panel>

        <Panel className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <SectionHeader title="Contact" level={2} />
          <p>
            For privacy questions or requests, email{' '}
            <a
              href={emailHref}
              className="break-all font-semibold text-[#6fb2ed] underline decoration-[#6fb2ed]/40 underline-offset-4 hover:text-white"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          <Link
            href={SUPPORT_PATH}
            className="inline-flex min-h-11 items-center font-semibold text-[#6fb2ed] hover:text-white"
          >
            View Support
          </Link>
        </Panel>
      </div>
    </AppShell>
  )
}
