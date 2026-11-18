# JHK Store: storefront (Nuxt 4, static)

The customer website of the shop: a **Nuxt 4** app (Vue 3, TypeScript, Tailwind CSS 4) that is generated into **plain static files** (`nuxt generate`) and hosted on **Cloudflare Pages**. What search engines read (products, categories, texts, the theme, titles, canonical links, Open Graph, JSON-LD) is fetched from the Laravel API at build time and baked into the HTML. What must be current (price, stock, product lists, banners, the cart, coupons, checkout, order tracking, search) is fetched from the API in the browser, so a change in the admin panel shows without a rebuild; a rebuild is only for what Google reads (see the guides).

This repository is one of three (the project README and **all the guides** are in the backend repository, folder `backend/docs/`):

| Repository | What it is |
|---|---|
| [jhkstore_backend](https://github.com/RivoxaTech/jhkstore_backend) | the Laravel API, the guides (`backend/docs/`), the CHANGELOG |
| [jhkstore_admin-frontend](https://github.com/RivoxaTech/jhkstore_admin-frontend) | the Vue admin panel (installable app) and the Help video maker |
| **jhkstore_frontend** (this one) | the storefront |

## Run it

```bash
cp .env.example .env     # NUXT_PUBLIC_API_BASE=http://127.0.0.1:8002/api/v1/store (the API of the backend repository)
npm install
npm run dev              # http://localhost:3000, live reload (needs the API)
npm run generate         # the static site in .output/public (stops with an error when the API cannot be reached)
npm run preview          # serves .output/public the way the hosts do (200.html fallback, 404.html)
npm run test:e2e         # the browser tests over the generated site (the API with the demo catalogue running)
```

Environment (`.env`, and the Cloudflare Pages settings): `NUXT_PUBLIC_API_BASE` (for example `https://api.example.com/api/v1/store`) and `NUXT_PUBLIC_SITE_URL` (the public address of this website, no trailing slash). Node 22.22.3+ or 24.15+ (`NODE_VERSION=24` on Cloudflare Pages).

## Deploy on Cloudflare

**As a Worker with static assets** (the usual set-up, `<name>.workers.dev`): `wrangler.jsonc` and `worker/index.js` are in this repository. Build command `npm run generate`, deploy command `npx wrangler deploy`, root directory empty, the build variables below. The Worker serves the files and gives the app shell (with its own address) to a product, category or order page that the build did not make; the `_redirects` file of Pages and Netlify does not work in a Worker, so it is kept as `public/_redirects.example`.

**As a Pages project** (or Netlify): copy `public/_redirects.example` to `public/_redirects` and continue as follows.


Connect this repository. **Root directory: empty** (the project is at the root of the repository). Framework preset: Nuxt.js (or None). Build command `npm run generate`, output directory `.output/public`. Environment variables `NUXT_PUBLIC_API_BASE`, `NUXT_PUBLIC_SITE_URL`, `NODE_VERSION=24`. The deploy hook for the admin panel's *Rebuild website now* button: Pages project → Settings → Builds & deployments → Deploy hooks. Build from the repository's production branch only, and do not rebuild after every admin edit (the free plan has about 500 builds a month): see `backend/docs/GO_LIVE.md`, "How often must the storefront be rebuilt?". The whole guide: `backend/docs/STOREFRONT.md`.

## Where things are

* `app/config/site.ts`, `app/content/*.ts`: the menu, the trust bar and the static pages (About, Shipping, Returns, Terms, Privacy): **edit per client**.
* `app/composables/` (`useApi`, `useCart`, `useSettings`, `useFastData`, ...), `app/components/`, `app/pages/`.
* `wrangler.jsonc` + `worker/index.js` (Cloudflare Worker), `public/_headers`, `public/_redirects.example` (Pages / Netlify), `public/.htaccess.example` (cPanel).
* `scripts/serve-static.mjs` serves the built site like the hosts do. `tests/`: `e2e.mjs` (the site), `perf.mjs` and `perf-actions.mjs` (speed; the second one with `delay-proxy.mjs`, which makes the API "far away"), `journey.mjs` (a customer and the shop owner in one browser session: needs the backend and admin repositories cloned next to this one, in folders named `backend` and `admin-frontend`, and the log mailer).
* No analytics, advertising or tracking script of any kind: do not add one without updating the privacy policy.
