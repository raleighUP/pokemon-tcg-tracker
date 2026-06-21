import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const sourceSvgPath = resolve(
  root,
  'public/icons/top-cut-app-icon-dark.svg'
)
const sourcePngPath = resolve(
  root,
  'resources/top-cut-app-icon-1024.png'
)
const iosIconPath = resolve(
  root,
  'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
)

const backgroundColor = '#0B0B0D'
const sourceSize = 1024
const sourceArtworkSize = 820
const adaptiveMasterSize = 432
const adaptiveArtworkSize = 264

const androidDensities = [
  { density: 'mdpi', legacy: 48, foreground: 108 },
  { density: 'hdpi', legacy: 72, foreground: 162 },
  { density: 'xhdpi', legacy: 96, foreground: 216 },
  { density: 'xxhdpi', legacy: 144, foreground: 324 },
  { density: 'xxxhdpi', legacy: 192, foreground: 432 },
]

await mkdir(dirname(sourcePngPath), { recursive: true })

const originalSvg = await readFile(sourceSvgPath, 'utf8')
const normalizedSvg = originalSvg.replaceAll(
  'fill="black"',
  `fill="${backgroundColor}"`
)

const paddedArtwork = await sharp(Buffer.from(normalizedSvg))
  .resize(sourceArtworkSize, sourceArtworkSize, { fit: 'contain' })
  .png()
  .toBuffer()

const opaqueSource = await sharp({
  create: {
    width: sourceSize,
    height: sourceSize,
    channels: 3,
    background: backgroundColor,
  },
})
  .composite([
    {
      input: paddedArtwork,
      left: (sourceSize - sourceArtworkSize) / 2,
      top: (sourceSize - sourceArtworkSize) / 2,
    },
  ])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toBuffer()

await sharp(opaqueSource).toFile(sourcePngPath)
await sharp(opaqueSource).toFile(iosIconPath)

const foregroundSvg = normalizedSvg.replace(
  /(<g clip-path="url\(#clip0_1_70\)">)[\s\S]*?(<path d="M777\.454)/,
  '$1\n$2'
)
const adaptiveArtwork = await sharp(Buffer.from(foregroundSvg))
  .resize(adaptiveArtworkSize, adaptiveArtworkSize, { fit: 'contain' })
  .png()
  .toBuffer()
const adaptiveForeground = await sharp({
  create: {
    width: adaptiveMasterSize,
    height: adaptiveMasterSize,
    channels: 4,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  },
})
  .composite([
    {
      input: adaptiveArtwork,
      left: (adaptiveMasterSize - adaptiveArtworkSize) / 2,
      top: (adaptiveMasterSize - adaptiveArtworkSize) / 2,
    },
  ])
  .png({ compressionLevel: 9 })
  .toBuffer()

for (const { density, legacy, foreground } of androidDensities) {
  const directory = resolve(root, `android/app/src/main/res/mipmap-${density}`)
  await mkdir(directory, { recursive: true })

  const legacyIcon = await sharp(opaqueSource)
    .resize(legacy, legacy)
    .png({ compressionLevel: 9 })
    .toBuffer()
  await sharp(legacyIcon).toFile(resolve(directory, 'ic_launcher.png'))

  const roundMask = Buffer.from(
    `<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}" fill="white"/></svg>`
  )
  const roundIcon = await sharp(legacyIcon)
    .ensureAlpha()
    .composite([{ input: roundMask, blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer()
  await sharp(roundIcon).toFile(
    resolve(directory, 'ic_launcher_round.png')
  )

  await sharp(adaptiveForeground)
    .resize(foreground, foreground)
    .png({ compressionLevel: 9 })
    .toFile(resolve(directory, 'ic_launcher_foreground.png'))
}

console.log('Generated Top Cut native icons from:', sourceSvgPath)
