import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const requiredFiles = [
  'out/index.html',
  'out/privacy/index.html',
  'out/support/index.html',
  'out/manifest.webmanifest',
  'ios/App/App/public/index.html',
  'ios/App/App/public/privacy/index.html',
  'ios/App/App/public/support/index.html',
  'ios/App/App/PrivacyInfo.xcprivacy',
  'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo.png',
  'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo@2x.png',
  'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo@3x.png',
]

for (const file of requiredFiles) {
  if (!existsSync(resolve(file))) {
    throw new Error(`Required native packaging file is missing: ${file}`)
  }
}

const read = (file) => readFileSync(resolve(file), 'utf8')
const capacitorConfig = read('capacitor.config.ts')
const generatedConfig = JSON.parse(read('ios/App/App/capacitor.config.json'))
const infoPlist = read('ios/App/App/Info.plist')
const project = read('ios/App/App.xcodeproj/project.pbxproj')
const packageSwift = read('ios/App/CapApp-SPM/Package.swift')
const privacyManifest = read('ios/App/App/PrivacyInfo.xcprivacy')
const launchStoryboard = read('ios/App/App/Base.lproj/LaunchScreen.storyboard')

const expected = {
  appId: 'com.topcut.app',
  appName: 'Top Cut',
  webDir: 'out',
}

for (const [key, value] of Object.entries(expected)) {
  if (!capacitorConfig.includes(`${key}: '${value}'`)) {
    throw new Error(`capacitor.config.ts does not define ${key} as ${value}.`)
  }

  if (generatedConfig[key] !== value) {
    throw new Error(`Generated iOS config does not define ${key} as ${value}.`)
  }
}

if (!infoPlist.includes('<string>Top Cut</string>')) {
  throw new Error('The iOS display name is not Top Cut.')
}

if (!project.includes('PRODUCT_BUNDLE_IDENTIFIER = com.topcut.app;')) {
  throw new Error('The Xcode bundle identifier is not com.topcut.app.')
}

if (!project.includes('PrivacyInfo.xcprivacy in Resources')) {
  throw new Error('PrivacyInfo.xcprivacy is not included in the app target.')
}

if (
  !launchStoryboard.includes('image="LaunchLogo"') ||
  !launchStoryboard.includes('red="0.043137254901960784"')
) {
  throw new Error('The iOS launch screen is not using the Top Cut dark branding.')
}

if (packageSwift.match(/path:\s*"[^"]*\\/)) {
  throw new Error(
    'Package.swift contains Windows path separators. Run npm run cap:sync:ios.'
  )
}

if (
  !privacyManifest.includes('<key>NSPrivacyTracking</key>') ||
  !privacyManifest.includes('<false/>')
) {
  throw new Error('The iOS privacy manifest is incomplete.')
}

const pngDimensions = (file) => {
  const data = readFileSync(resolve(file))

  if (data.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`${file} is not a PNG file.`)
  }

  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
  }
}

const expectedImages = new Map([
  [
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
    1024,
  ],
  [
    'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo.png',
    1024,
  ],
  [
    'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo@2x.png',
    1024,
  ],
  [
    'ios/App/App/Assets.xcassets/LaunchLogo.imageset/launch-logo@3x.png',
    1024,
  ],
])

for (const [file, size] of expectedImages) {
  const dimensions = pngDimensions(file)

  if (dimensions.width !== size || dimensions.height !== size) {
    throw new Error(
      `${file} must be ${size}x${size}, received ${dimensions.width}x${dimensions.height}.`
    )
  }
}

console.log(
  'iOS package verified: static routes, Capacitor config, bundle ID, privacy manifest, icon, and splash assets.'
)
