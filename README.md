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

## API key and deployment

StockQuest does not ask users for an API key.

The frontend calls same-origin /api endpoints. server.js reads TWELVEDATA_API_KEY from the server environment and forwards requests to Twelve Data.

For automatic deployment, add these GitHub repository Actions secrets:

- TWELVEDATA_API_KEY — your Twelve Data key
- WASMER_TOKEN — a Wasmer access token used by the deployment workflow

The workflow deploys the app to Wasmer, then creates or updates the Wasmer runtime secret named TWELVEDATA_API_KEY, and redeploys.

The Twelve Data key is never committed to this repository and is never exposed to StockQuest users.

## Local development

Set TWELVEDATA_API_KEY in your local environment, then run:

npm start

Open the local server URL shown by Node. Do not put the key in config.js.
