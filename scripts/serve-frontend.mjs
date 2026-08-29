import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'frontend')
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

createServer(async (request, response) => {
  const requested = decodeURIComponent((request.url || '/').split('?')[0])
  const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '')
  let file = normalize(join(root, relative))
  if (!file.startsWith(root)) { response.writeHead(403); response.end('Forbidden'); return }
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    response.end(body)
  } catch {
    response.writeHead(404); response.end('Not found')
  }
}).listen(8788, () => console.log('Static server ready'))
