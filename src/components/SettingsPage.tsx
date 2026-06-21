'use client'

import { ChangeEvent, useRef, useState } from 'react'
import Link from 'next/link'

import {
  Button,
  ConfirmationDialog,
  Panel,
  SectionHeader,
} from '@/components/ui'
import {
  AppDataSnapshot,
  clearAppStorage,
  createAppDataExport,
  parseAppDataExport,
  replaceAppStorage,
} from '@/utils/app-storage'
import {
  PRIVACY_POLICY_PATH,
  SUPPORT_EMAIL,
  SUPPORT_PATH,
} from '@/constants/app-info'

type Feedback = {
  tone: 'success' | 'error'
  message: string
}

function formatImportCount(
  count: number,
  singular: string,
  plural = `${singular}s`
) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default function SettingsPage({
  onDataChanged,
}: {
  onDataChanged: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [pendingImport, setPendingImport] =
    useState<AppDataSnapshot | null>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)

  const downloadExport = () => {
    const exportData = createAppDataExport()
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = exportData.exportedAt.slice(0, 10)

    link.href = url
    link.download = `top-cut-data-${date}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)

    setFeedback({
      tone: 'success',
      message: 'Your Top Cut data export is ready.',
    })
  }

  const selectImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    try {
      const snapshot = parseAppDataExport(await file.text())
      setPendingImport(snapshot)
      setFeedback(null)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The selected file could not be imported.',
      })
    }
  }

  const confirmImport = () => {
    if (!pendingImport) return

    if (!replaceAppStorage(pendingImport)) {
      setFeedback({
        tone: 'error',
        message: 'Top Cut could not replace the data stored on this device.',
      })
      return
    }

    setPendingImport(null)
    onDataChanged()
    setFeedback({
      tone: 'success',
      message: 'Your Top Cut data was imported successfully.',
    })
  }

  const confirmClear = () => {
    if (!clearAppStorage()) {
      setFeedback({
        tone: 'error',
        message: 'Top Cut could not clear all data from this device.',
      })
      return
    }

    setClearDialogOpen(false)
    onDataChanged()
    setFeedback({
      tone: 'success',
      message: 'All local Top Cut data has been cleared.',
    })
  }

  const emailLink = (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="break-all font-semibold text-[#6fb2ed] underline decoration-[#6fb2ed]/40 underline-offset-4 hover:text-white"
    >
      {SUPPORT_EMAIL}
    </a>
  )
  const advisorSettingsIncluded = pendingImport
    ? Object.keys(pendingImport.advisor).length > 0
    : false

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionHeader
        title="Settings"
        description="App information, support, privacy, and local data controls."
        level={1}
      />

      <Panel className="space-y-3">
        <SectionHeader title="App Info" level={3} />
        <div className="space-y-1 text-sm text-[var(--text-secondary)]">
          <p className="text-base font-semibold text-[var(--text-primary)]">Top Cut</p>
          <p>Version 1.0</p>
          <p>Contact: {emailLink}</p>
        </div>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Top Cut is a tournament tracking and deck analysis tool for Pokémon TCG players.
        </p>
      </Panel>

      <Panel className="space-y-3">
        <SectionHeader title="Support" level={3} />
        <p className="text-sm text-[var(--text-secondary)]">
          Contact Email: {emailLink}
        </p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          For bug reports, support requests, feedback, feature suggestions, privacy questions, or business inquiries.
        </p>
        <Link
          href={SUPPORT_PATH}
          className="inline-flex min-h-11 items-center font-semibold text-[#6fb2ed] underline decoration-[#6fb2ed]/40 underline-offset-4 hover:text-white"
        >
          Visit Support
        </Link>
      </Panel>

      <Panel className="space-y-3">
        <SectionHeader title="Legal Disclaimer" level={3} />
        <div className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <p>Top Cut is an independent tournament tracking and deck analysis tool.</p>
          <p>
            Top Cut is not affiliated with, endorsed by, sponsored by, or approved by Nintendo, The Pokémon Company, Game Freak, Creatures Inc., Play! Pokémon, or any tournament organizer.
          </p>
          <p>
            Pokémon and all related names, characters, images, logos, and trademarks are property of their respective owners.
          </p>
          <p>
            Tournament results, matchup analysis, recommendations, and projections provided by Top Cut are informational only and are not guarantees of tournament performance or results.
          </p>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <SectionHeader title="Privacy" level={3} />
        <div className="space-y-3 text-sm leading-6 text-[var(--text-muted)]">
          <p>
            Top Cut currently stores decks, matches, events, and advisor settings locally on your device.
          </p>
          <p>
            Top Cut does not currently require account creation and does not currently synchronize data across devices.
          </p>
          <p>
            Removing the application or clearing device storage may permanently remove locally stored data.
          </p>
          <p>
            Questions regarding the app, support requests, bug reports, or privacy concerns may be directed to: {emailLink}
          </p>
        </div>
        <Link
          href={PRIVACY_POLICY_PATH}
          className="inline-flex min-h-11 items-center font-semibold text-[#6fb2ed] underline decoration-[#6fb2ed]/40 underline-offset-4 hover:text-white"
        >
          View Privacy Policy
        </Link>
      </Panel>

      <Panel className="space-y-4">
        <SectionHeader
          title="Data Controls"
          level={3}
          description="Manage the Top Cut data stored locally on this device."
        />

        {feedback && (
          <p
            role={feedback.tone === 'error' ? 'alert' : 'status'}
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              feedback.tone === 'success'
                ? 'bg-[rgba(47,116,59,0.18)] text-[#8ed49a]'
                : 'bg-[rgba(160,24,24,0.18)] text-[#ff9a9a]'
            }`}
          >
            {feedback.message}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button tone="primary" onClick={downloadExport}>
            Export Data
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            Import Data
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={selectImportFile}
          className="sr-only"
          aria-label="Choose Top Cut data export"
        />
        <p className="text-xs leading-5 text-[var(--text-subtle)]">
          Export downloads a JSON backup file. Inside the installed app, your device may open or save the file instead of showing a share sheet.
        </p>

        <div className="border-t border-white/10 pt-4">
          <Button
            tone="danger"
            onClick={() => setClearDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            Clear All Data
          </Button>
        </div>
      </Panel>

      <ConfirmationDialog
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        onConfirm={confirmImport}
        title="Replace local data?"
        description={
          pendingImport
            ? `This import contains ${formatImportCount(pendingImport.decks.length, 'deck')}, ${formatImportCount(pendingImport.matches.length, 'match', 'matches')}, and ${formatImportCount(pendingImport.events.length, 'event')}. Advisor settings are ${advisorSettingsIncluded ? 'included' : 'not included'}. It will replace the local data currently on this device. This action cannot be undone.`
            : 'This will replace the local data currently on this device. This action cannot be undone.'
        }
        confirmLabel="Replace Data"
      />

      <ConfirmationDialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        onConfirm={confirmClear}
        title="Clear all local data?"
        description="This permanently removes all decks, matches, events, advisor settings, and intro metadata from this device. This action cannot be undone."
        confirmLabel="Clear All Data"
      />
    </div>
  )
}
