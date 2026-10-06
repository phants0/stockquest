# StockQuest Pro

StockQuest Pro is a browser-based stock-market simulation game.

## Included

- Profile creation, saved profiles, and reset
- $100,000 starting cash
- Featured markets
- Company search with best-match prioritization
- Live Twelve Data prices
- Intraday charts
- Buy shares and portfolio tracking
- Feature/unfeature markets
- Independent loading/error states for prices and charts
- Request caching, deduplication, retries, and a small request queue
- Server-side Twelve Data proxy so the API key is never shipped to the browser

## Cloudflare Workers deployment

StockQuest uses a single Cloudflare Worker for both the website and the private `/api/*` endpoints. Static assets are served by Cloudflare Workers Static Assets, while API requests are handled by `worker.js`.

The repository includes `wrangler.jsonc` with the Worker name `stockquest`, `workers_dev` enabled, and the repository root configured as the static asset directory.

### Connect GitHub

1. In Cloudflare, open **Workers & Pages**.
2. Open the existing **stockquest** Worker.
3. Go to **Settings → Builds**.
4. Under **Git Repository**, connect `phants0/stockquest` and select the `main` branch.
5. Leave the build command blank.
6. Use `npx wrangler deploy` as the deploy command.
7. Save the connection.

Cloudflare Workers Builds will deploy new commits from `main` automatically. The Worker name in the dashboard must match the `name` in `wrangler.jsonc`.

### Add the Twelve Data secret

In **Workers & Pages → stockquest → Settings → Variables and Secrets**, add an encrypted **Secret**:

`TWELVEDATA_API_KEY`

Enter your Twelve Data API key and save/deploy it for the production Worker.

The Worker reads it from `env.TWELVEDATA_API_KEY`. The key is never included in the browser code.

You can also add/update it with Wrangler:

~~~bash
npx wrangler secret put TWELVEDATA_API_KEY
~~~

`wrangler secret put` creates a new Worker version and deploys it immediately.

### API routes

- `/api/health`
- `/api/price?symbol=AAPL`
- `/api/chart?symbol=AAPL`
- `/api/search?q=Apple`

## GitHub

StockQuest no longer uses Firebase, Wasmer, or GitHub Actions secrets for stock data. Cloudflare Workers handles deployment from GitHub, and the Twelve Data credential is stored as an encrypted Cloudflare Worker secret.

Do not put the Twelve Data key in `config.js`, `app.js`, `api.js`, HTML, or any other browser-served file.