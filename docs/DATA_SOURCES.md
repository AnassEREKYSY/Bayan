# Data sources

All sources are optional. A missing key disables that source; the rest of the app keeps working.
Free-tier limits change: check each provider's current terms before relying on them.

## How data flows

```
Vercel Cron / external scheduler
        │  GET /api/cron?jobs=…  (Bearer CRON_SECRET)
        ▼
  server/jobs/jobs.ts
   ├─ fx         → fx_rates            (open.er-api.com)
   ├─ quotes     → asset_quotes + asset_prices (assets someone holds, follows or has an alert on; stalest first)
   ├─ news       → news_items + news_item_assets (RSS, matched to assets by keywords)
   ├─ summaries  → news_items.summary_fr / summary_en (AI, checked against the source)
   └─ alerts     → notifications (price alerts + event reminders)
```

Every run is logged in `job_runs` (visible on the Admin page).

On top of the schedule:

- **Opening an asset page** refreshes that asset when its price is older than 6 hours (30 minutes for crypto), at most once every 30 minutes per asset. This is how assets nobody follows stay usable without spending the daily quota.
- **Searching on the Markets page** also looks in Twelve Data's and CoinGecko's catalogues. "Add" stores the asset (checked again with the provider), fetches its price and a year of history, and opens it. Each user can add 25 new assets per day. Catalogue searches are cached for a day.

## Prices

| Market | Provider | `provider_ref` format | Notes |
| --- | --- | --- | --- |
| Crypto | CoinGecko | coin id, e.g. `bitcoin` | Works without a key; a free demo key raises limits |
| US / Europe / gold / silver | Twelve Data | `AAPL`, `MC\|Euronext`, `AAPL\|XNGS` (symbol + MIC) or `XAU/USD` | Free Basic plan: 8 credits/minute, 800/day. The scheduled run makes up to 4 rounds of 8, one minute apart (~3 minutes) |
| Bourse de Casablanca | Admin → Closing prices (manual), your JSON feed (`CASABLANCA_FEED_URL`), or Twelve Data (`TWELVE_DATA_CASABLANCA=true`) | the ticker, e.g. `MSA` | See below |

On the first runs, Bayan also backfills one year of daily history for assets that have little or none (2 per round).

Vercel's free plan runs the schedule once a day. To refresh more often, call `GET /api/cron?jobs=fx,quotes,alerts` with the header `Authorization: Bearer <CRON_SECRET>` from any free scheduler (for example cron-job.org), a few times a day.

### Casablanca: three options

1. **Manual (free, works today).** Admin → *Closing prices*: pick the asset, paste one line per day
   (`16/10/2026;712,50` or `2026-10-16,712.50`). The last line becomes the current price, the one before
   it the previous close, and all lines feed the chart. Source the numbers from the official site
   (casablanca-bourse.com) for your own tracking.
2. **Twelve Data (paid, automatic).** Twelve Data lists the Casablanca exchange (MIC `XCAS`, end of day),
   but not on the free Basic plan as far as we can tell. If your plan includes it, set
   `TWELVE_DATA_CASABLANCA=true`: tickers are sent as `TICKER|XCAS`. Check a ticker in your Twelve Data
   dashboard first, since their symbols may differ from the Bourse's.
3. **Licensed feed.** Data from the Bourse's official redistributors, or from a partner like Borsalia,
   exposed as the JSON below through `CASABLANCA_FEED_URL`. It takes priority over Twelve Data.

Manual prices are never overwritten unless one of the automatic sources is configured.

### Casablanca feed format

There is no official free API for the Bourse de Casablanca. Point `CASABLANCA_FEED_URL` to any JSON source you are **allowed** to use (a broker's data feed, your own service, a licensed provider):

```json
{
  "asOf": "2026-10-17T15:30:00Z",
  "quotes": [
    { "symbol": "MSA", "price": 902.0, "previousClose": 891.0 },
    { "symbol": "MASI", "price": 18452.3, "previousClose": 18390.1 }
  ]
}
```

Check the Bourse de Casablanca's terms of use before collecting anything from its website.

## Exchange rates

`https://open.er-api.com/v6/latest/USD` — free, no key, includes MAD. Rates are stored as "units per 1 USD"; all conversions go through USD.

## News

Configured in `src/server/jobs/jobs.ts` (`newsSources`): Médias24 and Hespress Économie (RSS, checked October 2026). Only items that mention a tracked asset (by its `keywords`) are stored. Bayan stores the title, the feed's short description and the link — never the full article — and always links to the original.

## AI summaries

Any **OpenAI-compatible** chat completions API works:

| Provider | `AI_BASE_URL` | Example `AI_MODEL` |
| --- | --- | --- |
| Groq (free tier) | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-2.0-flash` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-small-latest` |
| OpenRouter | `https://openrouter.ai/api/v1` | any free model |
| Ollama (your PC) | `http://localhost:11434/v1` | `qwen2.5:7b` |

Model names change; pick a current one from the provider's list.

Each news item is summarised **once** and shared by all users, so costs stay near zero. A summary is published only if every number in it also appears in the source text; otherwise it is marked `rejected` and the app shows the feed excerpt instead. Only public news text is sent to the AI — never user data.
