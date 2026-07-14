import { recognizeUploadedDeckImageLocally } from '@/lib/deck-image-recognition/browser-local-recognition'
import type {
  DeckRecognitionImageInput,
  DeckRecognitionResult,
  RecognizeDeckOptions,
} from './types'

function isImageBitmapInput(image: DeckRecognitionImageInput): image is ImageBitmap {
  return (
    typeof ImageBitmap !== 'undefined' &&
    image instanceof ImageBitmap
  )
}

async function imageBitmapToBlob(image: ImageBitmap) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to prepare image bitmap for recognition.')
  }

  canvas.width = image.width
  canvas.height = image.height
  context.drawImage(image, 0, 0)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error('Unable to convert image bitmap for recognition.'))
      }
    }, 'image/png')
  })
}

async function toObjectUrl(image: DeckRecognitionImageInput) {
  if (typeof image === 'string') {
    return {
      url: image,
      revoke: () => {},
    }
  }

  const blob = isImageBitmapInput(image) ? await imageBitmapToBlob(image) : image
  const url = URL.createObjectURL(blob)

  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  }
}

function averageConfidence(entries: DeckRecognitionResult['entries']) {
  if (entries.length === 0) return 0

  return (
    entries.reduce((total, entry) => total + entry.confidence, 0) /
    entries.length
  )
}

export async function recognizeDeckImage(
  image: DeckRecognitionImageInput,
  options: RecognizeDeckOptions = {}
): Promise<DeckRecognitionResult> {
  const objectUrl = await toObjectUrl(image)

  try {
    const localResult = await recognizeUploadedDeckImageLocally(objectUrl.url)

    return {
      entries: localResult.cards,
      detectedCandidateCount: localResult.candidateCount,
      representedCandidateCount: localResult.debugMatches.length,
      estimatedTotalCards: localResult.estimatedTotalQuantity,
      sourceStrategy: options.sourceType ?? 'auto',
      confidence: averageConfidence(localResult.cards),
      warnings: localResult.warnings,
      debug: {
        localRecognition: localResult,
      },
    }
  } finally {
    objectUrl.revoke()
  }
}
