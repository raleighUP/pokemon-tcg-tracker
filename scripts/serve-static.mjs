import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve('out')
const port = Number(process.env.PORT) || 3000
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.lottie': 'application/zip',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

if (!existsSync(root)) {
  console.error('Static output is missing. Run npm run build first.')
  process.exit(1)
}

createServer((request, response) => {
  const requestPath = decodeURIComponent(
    new URL(request.url ?? '/', 'http://localhost').pathname
  )
  const relativePath = normalize(requestPath).replace(/^([/\\])+/, '')
  let filePath = join(root, relativePath)

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end('Forbidden')
    return
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }

  if (!existsSync(filePath)) {
    filePath = join(root, '404.html')
  }

  if (!existsSync(filePath)) {
    response.writeHead(404).end('Not found')
    return
  }

  response.writeHead(filePath.endsWith('404.html') ? 404 : 200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  createReadStream(filePath).pipe(response)
}).listen(port, '127.0.0.1', () => {
  console.log(`Static export available at http://127.0.0.1:${port}`)
})
