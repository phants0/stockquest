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

## Twelve Data setup

The repository is public, so the API key is intentionally not committed. Put your Twelve Data key in `config.js`:

```js
window.STOCKQUEST_CONFIG = {
    TWELVEDATA_API_KEY: "YOUR_TWELVE_DATA_API_KEY"
};
```

`config.example.js` contains the same structure.

Then open `index.html` through a local/static web server.
