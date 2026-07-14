import { useEffect, useMemo, useState } from 'react'

import { EmptyState, MetricTile, NestedPanel } from '@/components/ui'
import {
  detectDeckEntryCandidates,
  type DeckEntryCandidate,
} from '@/lib/deck-image-recognition'

type CropPreview = {
  id: string
  dataUrl: string
}

function loadImage(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load deck image.'))
    image.src = imageUrl
  })
}

function cropCandidateToDataUrl(
  image: HTMLImageElement,
  candidate: DeckEntryCandidate
) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) return ''

  canvas.width = Math.max(1, candidate.representativeBounds.width)
  canvas.height = Math.max(1, candidate.representativeBounds.height)
  context.drawImage(
    image,
    candidate.representativeBounds.x,
    candidate.representativeBounds.y,
    candidate.representativeBounds.width,
    candidate.representativeBounds.height,
    0,
    0,
    canvas.width,
    canvas.height
  )

  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function DeckImageCropDebugView({
  imageUrl,
  imageName,
}: {
  imageUrl: string
  imageName: string
}) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [candidates, setCandidates] = useState<DeckEntryCandidate[]>([])
  const [cropPreviews, setCropPreviews] = useState<CropPreview[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function detectCrops() {
      try {
        setError('')
        const image = await loadImage(imageUrl)
        const nextCandidates = await detectDeckEntryCandidates(image)
        const nextPreviews = nextCandidates.map((candidate) => ({
          id: candidate.id,
          dataUrl: cropCandidateToDataUrl(image, candidate),
        }))

        if (cancelled) return

        setImageSize({
          width: image.naturalWidth,
          height: image.naturalHeight,
        })
        setCandidates(nextCandidates)
        setCropPreviews(nextPreviews)
      } catch (caughtError) {
        if (cancelled) return

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to detect deck entries.'
        )
        setCandidates([])
        setCropPreviews([])
      }
    }

    detectCrops()

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  const sourceStrategy = useMemo(() => {
    const strategies = Array.from(
      new Set(candidates.map((candidate) => candidate.sourceStrategy))
    )

    return strategies.join(', ') || 'unknown'
  }, [candidates])

  return (
    <NestedPanel variant="compact" className="space-y-4">
      <div>
        <h3 className="type-section-title text-[var(--text-primary)]">
          Experimental Crop Debug
        </h3>
        <p className="type-helper mt-1 text-[var(--text-muted)]">
          Development-only coarse overlay experiment for {imageName}.
        </p>
      </div>

      {error && (
        <EmptyState className="border-[var(--loss-border)] bg-[var(--loss-soft)] text-[var(--loss-text)]">
          {error}
        </EmptyState>
      )}

      <div className="grid grid-cols-2 gap-2">
        <MetricTile label="Estimated Entries" value={candidates.length} />
        <MetricTile label="Strategy" value={sourceStrategy} />
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-inset)]">
        {/* Blob previews are local-only and cannot be optimized by Next Image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Crop debug preview for ${imageName}`}
          className="block w-full"
        />

        {imageSize.width > 0 &&
          imageSize.height > 0 &&
          candidates.map((candidate) => {
            const groupBounds = candidate.groupBounds
            const representativeBounds = candidate.representativeBounds

            return (
              <div key={candidate.id}>
                {groupBounds && (
                  <div
                    className="absolute border border-dashed border-[var(--tie-border)] bg-[var(--tie-soft)]/20"
                    style={{
                      left: `${(groupBounds.x / imageSize.width) * 100}%`,
                      top: `${(groupBounds.y / imageSize.height) * 100}%`,
                      width: `${(groupBounds.width / imageSize.width) * 100}%`,
                      height: `${(groupBounds.height / imageSize.height) * 100}%`,
                    }}
                  />
                )}
                <div
                  className="absolute border-2 border-[var(--color-primary)] bg-[rgba(23,107,181,0.14)]"
                  style={{
                    left: `${(representativeBounds.x / imageSize.width) * 100}%`,
                    top: `${(representativeBounds.y / imageSize.height) * 100}%`,
                    width: `${(representativeBounds.width / imageSize.width) * 100}%`,
                    height: `${(representativeBounds.height / imageSize.height) * 100}%`,
                  }}
                >
                  <span className="absolute left-0 top-0 bg-[var(--color-primary)] px-1 text-[0.625rem] font-bold leading-4 text-white">
                    {candidate.id} x{candidate.estimatedQuantity}
                  </span>
                </div>
              </div>
            )
          })}
      </div>

      {cropPreviews.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {cropPreviews.map((preview, index) => {
            const candidate = candidates[index]

            return (
              <div
                key={preview.id}
                className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface-inset)]"
              >
                <div className="border-b border-[var(--surface-border)] px-2 py-1">
                  <p className="type-metadata text-[var(--text-primary)]">
                  Estimated Entry #{index + 1}
                  </p>
                  <p className="text-[0.6875rem] font-semibold text-[var(--text-muted)]">
                    Quantity: {candidate?.estimatedQuantity ?? '?'}
                  </p>
                  {candidate?.notes?.length ? (
                    <p className="mt-1 text-[0.625rem] leading-4 text-[var(--text-muted)]">
                      {candidate.notes[0]}
                    </p>
                  ) : null}
                </div>
                {/* Canvas crops are generated locally from the uploaded image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.dataUrl}
                  alt={`Detected deck entry ${index + 1}`}
                  className="aspect-[63/88] w-full object-cover"
                />
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState>No experimental entry boxes detected yet.</EmptyState>
      )}
    </NestedPanel>
  )
}
