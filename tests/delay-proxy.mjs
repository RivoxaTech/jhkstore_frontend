// A tiny proxy that makes the API "far away": it holds every request for DELAY/2 ms before it reaches the API and every answer for DELAY/2 ms before it goes back,
// so one round trip costs DELAY ms more (the CORS preflight included, because it is a request like any other). Chrome's own network throttling did not
// delay these calls reliably, a proxy does. Used by tests/perf-actions.mjs; the numbers in docs/PERFORMANCE.md come from it.
//
//   node tests/delay-proxy.mjs 8012 8013 150      listens on 8012, forwards to the API on 8013, 150 ms per round trip
import http from 'node:http'

const [listen, target, delay] = [Number(process.argv[2] || 8012), Number(process.argv[3] || 8013), Number(process.argv[4] ?? 150)]
const half = delay / 2
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

http.createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const body = Buffer.concat(chunks)
  await wait(half)
  const up = http.request({ host: '127.0.0.1', port: target, path: req.url, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${target}` } }, async (r) => {
    const out = []
    for await (const c of r) out.push(c)
    await wait(half)
    res.writeHead(r.statusCode, r.headers)
    res.end(Buffer.concat(out))
  })
  up.on('error', (e) => { res.writeHead(502); res.end(String(e)) })
  up.end(body)
}).listen(listen, '127.0.0.1', () => console.log(`delay proxy :${listen} -> :${target}, ${delay} ms per round trip`))
