import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packagePath = resolve('ios/App/CapApp-SPM/Package.swift')
const source = await readFile(packagePath, 'utf8')
const normalized = source.replace(
  /(path:\s*")([^"]*)(")/g,
  (_, prefix, pluginPath, suffix) =>
    `${prefix}${pluginPath.replaceAll('\\', '/')}${suffix}`
)

if (normalized !== source) {
  await writeFile(packagePath, normalized)
  console.log('Normalized Capacitor Swift package paths for macOS/Xcode.')
} else {
  console.log('Capacitor Swift package paths are already portable.')
}
