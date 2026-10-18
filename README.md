# Bayan

**All your investments, explained clearly.** Bayan brings Bourse de Casablanca stocks, US and European stocks and ETFs, gold and crypto into one portfolio, valued in one currency (MAD, EUR or USD), with the news about your assets summarised in plain words.

French and English · light and dark mode · responsive from phone to desktop.

> Bayan informs; it never gives investment advice. Keep it that way — see [Regulation](#regulation).

---

## Features

| Area | What the user gets |
| --- | --- |
| Overview | Total value, daily change, unrealised and realised gains, dividends, value history (1M/3M/1Y), allocation by market, today's movers, news and upcoming events |
| Portfolio | Several portfolios, holdings table (cards on phones), weighted average cost, allocation by market and asset type |
| Transactions | Buy, sell, dividend, fee; edit and delete with checks (you can never sell more than you held at that date); filters; CSV export |
| Markets | Every tracked asset with latest price and daily change, filter by market, search |
| Asset page | Price chart, your position, news, upcoming events, watch, alert, add transaction |
| Watchlist | Assets you follow without owning them |
| News | News about your assets from public feeds, with AI summaries in FR/EN that are checked against the source |
| Calendar | Dividends, general meetings and results for the next six months |
| Alerts | Price above/below, daily move %, plus automatic reminders 3 days before events; in-app notifications |
| Settings | Name, base currency, language, theme, password, data export, account deletion |
| Admin | Add assets and events, refresh data on demand, see job runs |

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts`) + **React 19** + **TypeScript** (strict)
- **Supabase**: Postgres, Auth, Row Level Security
- **Tailwind CSS 4** with design tokens for light/dark themes
- **next-intl** (FR/EN, no locale prefix in URLs), **next-themes**, **zod** validation, **Radix** primitives for accessible dialogs and menus
- **Vitest** for the domain logic
- Hosted on **Vercel**, scheduled jobs with **Vercel Cron**

## Project structure

```
messages/                 en.json, fr.json — every UI string
public/logo.svg           the logo
supabase/
  migrations/             database schema, RLS policies, grants
  seed.sql                starter list of assets
src/
  app/
    (auth)/               login, signup, forgot/reset password
    (app)/                signed-in pages (dashboard, portfolio, …)
    api/cron/             scheduled jobs endpoint (secret-protected)
    api/export/           CSV export of the user's transactions
    auth/callback/        email link handler
    page.tsx              landing page
  components/
    ui/                   buttons, forms, cards, dialogs, menus
    layout/               sidebar, mobile nav, theme & language switchers
    finance/ charts/ news/ forms/
  domain/                 pure business logic (portfolio maths, money, AI guard) + tests
  i18n/                   locale resolution
  lib/                    env validation, Supabase clients, security helpers, validation schemas
  server/
    actions/              Server Actions (all inputs validated with zod)
    data/                 data-access functions
    jobs/                 market data providers, news, AI summaries, alerts
  proxy.ts                session refresh, route guards, CSP nonce
```

**Layers.** Pages call `server/data` (reads) and `server/actions` (writes). Business rules live in `domain/` and have no I/O, so they are unit-tested. Market data providers are adapters behind one interface, so a source can be replaced without touching the rest.

---

## Getting started

### 1. Requirements

- Node.js 20.9 or newer
- A free [Supabase](https://supabase.com) project
- A free [Vercel](https://vercel.com) account for hosting

### 2. Install

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Supabase URL, anon key and service role key (Supabase → Project Settings → API). Generate `CRON_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the database

In the Supabase dashboard → **SQL Editor**, run in this order:

1. `supabase/migrations/20261017000000_initial_schema.sql`
2. `supabase/seed.sql`

Or with the Supabase CLI: `npx supabase link` then `npx supabase db push` and run the seed.

### 4. Configure Supabase Auth

Supabase → **Authentication**:

- **URL Configuration** → Site URL: `http://localhost:3000` (later your Vercel URL). Add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
- **Providers → Email**: keep "Confirm email" on.
- **Policies / Passwords**: minimum length 10, require letters and digits (matches the app's rules).

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000, create an account, confirm the email, and you're in.

### 6. Make yourself admin

In the SQL Editor (replace the email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

The **Admin** link then appears in the sidebar. Use **Refresh data now** to load prices, FX rates and news immediately.

---

## Market data, news and AI

See [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) for details and free tiers.

| Data | Source | Key |
| --- | --- | --- |
| Crypto | CoinGecko | optional (`COINGECKO_API_KEY`) |
| US/EU stocks, ETFs, gold, silver | Twelve Data | `TWELVE_DATA_API_KEY` (free plan) |
| Bourse de Casablanca | Your own JSON feed | `CASABLANCA_FEED_URL` |
| Exchange rates | open.er-api.com | none |
| News | Médias24 and Hespress Économie RSS | none |
| AI summaries | Any OpenAI-compatible API (Groq, Mistral, Gemini, OpenRouter, Ollama) | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` |

Any missing key simply disables that source.

## Deploying to Vercel

1. Push the project to GitHub.
2. Vercel → **Add New Project** → import the repository (framework: Next.js, detected automatically).
3. Add every variable from `.env.example` in **Settings → Environment Variables**, with `NEXT_PUBLIC_SITE_URL` set to your Vercel URL.
4. Deploy. Then set the same URL in Supabase Auth (Site URL and Redirect URLs).

**Scheduled jobs.** `vercel.json` runs all jobs once a day at 18:00 UTC (after the Casablanca close). On the Vercel Hobby plan, crons run at most once a day. For fresher prices, call the endpoint more often from any free scheduler (cron-job.org, GitHub Actions):

```
GET https://YOUR-DOMAIN/api/cron?jobs=quotes,alerts
Authorization: Bearer YOUR_CRON_SECRET
```

---

## Security

- **Row Level Security on every table.** Users can only read and write their own portfolios, transactions, watchlist, alerts and notifications. Shared market data is read-only for users.
- **Column-level grants**: users cannot change their role, IDs or timestamps, even through the API.
- **Service role key** is used only in server-only modules (`import "server-only"`) for scheduled jobs and account deletion.
- **Server-side validation** of every input with zod, even when the form already checks it. Errors returned to the browser are translation keys, never database messages.
- **Auth**: Supabase Auth with email confirmation; sessions are validated with `getUser()` on the server; login errors never reveal whether an account exists; open-redirects through `?next=` are blocked.
- **HTTP headers**: per-request nonce-based Content-Security-Policy, HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, restrictive permissions policy.
- **Cron endpoint** protected by a secret compared in constant time.
- **CSV export** neutralises spreadsheet formula injection.
- **External calls** have timeouts and size limits; external data is validated with zod before being stored.
- **Secrets** live only in environment variables; `.env*` files are git-ignored.

## Regulation

In Morocco, advising on buying or selling financial instruments is a regulated activity (loi 19-14, AMMC registration). Bayan only restates official information and its AI prompt forbids recommendations. Before a public launch, check the wording with a lawyer, read each data source's terms of use, and declare personal data processing to the CNDP (loi 09-08).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run check` | Typecheck + lint + tests |
| `npm test` | Unit tests |
| `npm run db:types` | Regenerate database types from your linked Supabase project |
