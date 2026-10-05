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

## Cloudflare Pages deployment

StockQuest uses Cloudflare Pages for the website and Pages Functions for the private `/api/*` endpoints.

The browser calls same-origin `/api` endpoints. Cloudflare routes those requests to the Pages Functions, which call Twelve Data.

The Twelve Data key is stored as an encrypted Cloudflare secret. It is not committed to GitHub and is never sent to the browser.

### Cloudflare Dashboard setup

1. Open Cloudflare **Workers & Pages**.
2. Choose **Create application → Pages → Import an existing Git repository**.
3. Connect GitHub and select `phants0/stockquest`.
4. Set the production branch to `main`.
5. Leave the **Build command** blank because this is a plain HTML/JS project with no build step.
6. Set the **Build output directory** to `.` so the repository root is served.
7. Save and deploy.

Cloudflare Pages can automatically redeploy whenever a new commit is pushed to the connected GitHub repository.

### Add the Twelve Data secret

In the Cloudflare Pages project, open **Settings → Variables and Secrets → Add**.

Create an encrypted secret named:

`TWELVEDATA_API_KEY`

Paste your Twelve Data API key, choose **Encrypt**, and save it for the **Production** environment.

The Pages Functions read the secret as `context.env.TWELVEDATA_API_KEY`.

### API routes

- `/api/health`
- `/api/price?symbol=AAPL`
- `/api/chart?symbol=AAPL`
- `/api/search?q=Apple`

The repository includes `_routes.json` so only `/api/*` invokes Pages Functions. Static assets remain normal Pages requests.

## GitHub

StockQuest no longer uses Firebase, Wasmer, or GitHub Actions secrets for stock data. Cloudflare Pages handles deployment from GitHub, and the Twelve Data credential is stored as an encrypted Cloudflare secret.

Do not put the Twelve Data key in `config.js`, `app.js`, `api.js`, HTML, or any other browser-served file.