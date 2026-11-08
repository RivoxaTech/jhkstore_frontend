// A tiny static file server that behaves like the real hosts for this site: files first (also /page -> /page/index.html), then the app shell (200.html) for the paths
// listed in public/_redirects (/product/*, /category/*, /order/*), otherwise 404.html with status 404. Used to look at and test the generated site locally.
//
//   node scripts/serve-static.mjs .output/public [port]        (npm run preview)
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(process.argv[2] || '.output/public')
const port = Number(process.argv[3] || process.env.PORT || 3000)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' }
const SHELL = [/^\/product\//, /^\/category\//, /^\/order\//]

async function exists(file) { try { return (await stat(file)).isFile() } catch { return false } }

async function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/\/+$/, '') || '/'
  const rel = path.normalize(clean).replace(/^([/\\])+/, '')
  const candidates = [path.join(root, rel), path.join(root, rel, 'index.html'), `${path.join(root, rel)}.html`]
  for (const c of candidates) if (c.startsWith(root) && (await exists(c))) return { file: c, status: 200 }
  if (SHELL.some((r) => r.test(clean))) return { file: path.join(root, '200.html'), status: 200 }
  return { file: path.join(root, '404.html'), status: 404 }
}

createServer(async (req, res) => {
  try {
    const { file, status } = await resolve(req.url || '/')
    const body = await readFile(file)
    res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} on http://127.0.0.1:${port}`))
