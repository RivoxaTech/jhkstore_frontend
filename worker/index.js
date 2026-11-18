// The Cloudflare Worker that serves the generated site (wrangler.jsonc: the files of .output/public are the static assets, served first).
// It only runs for an address that is NOT a file of the build. Two kinds of address are expected:
//   /product/<slug>, /category/<slug>[/<sub>], /order/<number>   a page the build did not make (a toy or a category created after the last build, an order):
//                                                               the visitor keeps his address and gets the app shell (200.html), which loads the page from the API
//   anything else                                               the friendly 404 page, with the status 404
// (The _redirects file of Cloudflare Pages and Netlify cannot do this here: a Worker with static assets turns its "200" rules into redirects to /200.)
const SHELL_PATHS = /^\/(product|category|order)\/[^/]+/

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const page = request.method === 'GET' || request.method === 'HEAD'
    if (page && SHELL_PATHS.test(url.pathname)) {
      const shell = await env.ASSETS.fetch(new Request(new URL('/200', url), { method: request.method, headers: request.headers }))
      return new Response(shell.body, { status: 200, headers: shell.headers })
    }
    if (page) {
      const notFound = await env.ASSETS.fetch(new Request(new URL('/404', url), { method: request.method, headers: request.headers }))
      return new Response(notFound.body, { status: 404, headers: notFound.headers })
    }
    return new Response('Not found', { status: 404 })
  },
}
