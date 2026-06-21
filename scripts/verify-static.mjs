import { spawn } from 'node:child_process'

const port = 4173
const preview = spawn(process.execPath, ['scripts/serve-static.mjs'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
})

const startup = new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error('Static preview did not start in time.')),
    5000
  )

  preview.once('error', reject)
  preview.stderr.once('data', (data) => reject(new Error(String(data))))
  preview.stdout.once('data', () => {
    clearTimeout(timeout)
    resolve()
  })
})

try {
  await startup

  const checks = await Promise.all([
    fetch(`http://127.0.0.1:${port}/`),
    fetch(`http://127.0.0.1:${port}/privacy/`),
    fetch(`http://127.0.0.1:${port}/support/`),
    fetch(`http://127.0.0.1:${port}/manifest.webmanifest`),
    fetch(`http://127.0.0.1:${port}/intro/top-cut-intro.lottie`),
  ])

  if (checks.some((response) => !response.ok)) {
    throw new Error(
      `Static request failed: ${checks.map((response) => response.status).join(', ')}`
    )
  }

  const html = await checks[0].text()
  const privacyHtml = await checks[1].text()
  const supportHtml = await checks[2].text()
  const lottieBytes = (await checks[4].arrayBuffer()).byteLength

  if (
    !html.includes('/_next/') ||
    !privacyHtml.includes('Privacy Policy') ||
    !supportHtml.includes('Support') ||
    lottieBytes === 0
  ) {
    throw new Error('Static pages or bundled animation are incomplete.')
  }

  console.log(
    'Static export served successfully: app, privacy, support, manifest, and Lottie asset.'
  )
} finally {
  preview.kill()
}
