'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

import {
  Button,
  ConfirmationDialog,
  Panel,
  SegmentedControl,
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
import { bucketCount, trackEvent } from '@/utils/analytics'
import {
  CardReferenceCacheDiagnostics,
  CardReferenceManifest,
  getCardReferenceCacheDiagnostics,
} from '@/lib/card-reference-cache-update'
import { FEATURE_FLAGS } from '@/config/features'
import type { ThemePreference } from '@/utils/theme'
import { currentStandardFormat } from '@/utils/current-format'

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
  themePreference,
  onThemeChange,
}: {
  onDataChanged: () => void
  themePreference: ThemePreference
  onThemeChange: (theme: ThemePreference) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [pendingImport, setPendingImport] =
    useState<AppDataSnapshot | null>(null)
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [cardReferenceDiagnostics, setCardReferenceDiagnostics] =
    useState<CardReferenceCacheDiagnostics | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadDiagnostics() {
      let bundledManifest: CardReferenceManifest | undefined

      try {
        const response = await fetch('/card-reference/card-reference-manifest.json')
        if (response.ok) {
          bundledManifest = (await response.json()) as CardReferenceManifest
        }
      } catch {
        bundledManifest = undefined
      }

      if (!cancelled) {
        setCardReferenceDiagnostics(
          getCardReferenceCacheDiagnostics(bundledManifest)
        )
      }
    }

    loadDiagnostics()

    return () => {
      cancelled = true
    }
  }, [])

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

    trackEvent('export_completed', {
      deck_count_bucket: bucketCount(
        Array.isArray(exportData.data.decks.data)
          ? exportData.data.decks.data.length
          : 0
      ),
      match_count_bucket: bucketCount(
        Array.isArray(exportData.data.matches.data)
          ? exportData.data.matches.data.length
          : 0
      ),
      event_count_bucket: bucketCount(
        Array.isArray(exportData.data.events.data)
          ? exportData.data.events.data.length
          : 0
      ),
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

    trackEvent('import_completed', {
      source: 'json_backup',
      deck_count_bucket: bucketCount(pendingImport.decks.length),
      match_count_bucket: bucketCount(pendingImport.matches.length),
      event_count_bucket: bucketCount(pendingImport.events.length),
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
      className="break-all font-semibold text-[var(--link-color)] underline decoration-current/40 underline-offset-4 hover:text-[var(--text-primary)]"
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
        className="page-header"
      />

      <Panel variant="elevated" className="space-y-3">
        <SectionHeader
          title="Appearance"
          description="Choose how Top Cut looks on this device."
          level={3}
        />
        <SegmentedControl
          ariaLabel="Appearance"
          value={themePreference}
          onChange={onThemeChange}
          options={[
            { label: 'System', value: 'system' },
            { label: 'Dark', value: 'dark' },
            { label: 'Light', value: 'light' },
          ]}
        />
      </Panel>

      <Panel variant="elevated" className="space-y-3">
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

      <Panel variant="elevated" className="space-y-3">
        <details className="group">
          <summary className="cursor-pointer list-none">
            <SectionHeader
              title="Card Database"
              level={3}
              description={
                FEATURE_FLAGS.deckPhotoImport
                  ? 'Reference data used by deck image and decklist identification.'
                  : 'Reference data used by decklist identification.'
              }
            />
          </summary>
          <div className="mt-3 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
            <p>
              Source:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.source ?? 'bundled'}
              </span>
            </p>
            <p>
              Version:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.active?.cacheVersion?.slice(0, 12) ??
                  'Unknown'}
              </span>
            </p>
            <p>
              Cards:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.active?.totalCards?.toLocaleString() ??
                  'Unknown'}
              </span>
            </p>
            <p>
              Sets:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.active?.totalSets?.toLocaleString() ??
                  'Unknown'}
              </span>
            </p>
            <p>
              Updated:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.active?.generatedAt
                  ? new Date(
                      cardReferenceDiagnostics.active.generatedAt
                    ).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </p>
            <p>
              Fallback:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {cardReferenceDiagnostics?.source === 'downloaded'
                  ? 'Bundled available'
                  : 'Using bundled'}
              </span>
            </p>
            <p>
              Current format:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {currentStandardFormat.label}
              </span>
            </p>
            <p>
              Format data:{' '}
              <span className="font-semibold text-[var(--text-primary)]">
                {currentStandardFormat.fallback ? 'Verified fallback' : 'Generated'}
              </span>
            </p>
          </div>
          {cardReferenceDiagnostics?.lastError && (
            <p className="mt-3 text-xs leading-5 text-[var(--text-subtle)]">
              Last update check: {cardReferenceDiagnostics.lastError}
            </p>
          )}
        </details>
      </Panel>

      <Panel variant="elevated" className="space-y-3">
        <SectionHeader title="Support" level={3} />
        <p className="text-sm text-[var(--text-secondary)]">
          Contact Email: {emailLink}
        </p>
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          For bug reports, support requests, feedback, feature suggestions, privacy questions, or business inquiries.
        </p>
        <Link
          href={SUPPORT_PATH}
          className="inline-flex min-h-11 items-center font-semibold text-[var(--link-color)] underline decoration-current/40 underline-offset-4 hover:text-[var(--text-primary)]"
        >
          Visit Support
        </Link>
      </Panel>

      <Panel variant="elevated" className="space-y-3">
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

      <Panel variant="elevated" className="space-y-3">
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
          className="inline-flex min-h-11 items-center font-semibold text-[var(--link-color)] underline decoration-current/40 underline-offset-4 hover:text-[var(--text-primary)]"
        >
          View Privacy Policy
        </Link>
      </Panel>

      <Panel variant="elevated" className="space-y-4">
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
                ? 'border border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]'
                : 'border border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss-text)]'
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

        <div className="border-t border-[var(--divider)] pt-4">
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
