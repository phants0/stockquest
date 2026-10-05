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

## Firebase deployment

StockQuest uses **Firebase Hosting** for the website and **Firebase Cloud Functions** for the private API.

The browser calls same-origin `/api` endpoints. Firebase Hosting rewrites those requests to the `api` Cloud Function, which calls Twelve Data.

The Twelve Data key is stored in **Google Secret Manager through Firebase**. It is not committed to GitHub and is not sent to the browser.

### First-time setup

Create a Firebase project and enable billing for Cloud Functions.

Install the Firebase CLI:

~~~bash
npm install -g firebase-tools
~~~

Log in:

~~~bash
firebase login
~~~

From this repository directory, connect the folder to your Firebase project:

~~~bash
firebase use --add
~~~

Choose your Firebase project when prompted. This creates the local `.firebaserc` file; it is ignored by Git.

Store the Twelve Data key in Firebase Secret Manager:

~~~bash
firebase functions:secrets:set TWELVEDATA_API_KEY
~~~

Paste the Twelve Data key only when the Firebase CLI prompts for it.

Deploy both the API and website:

~~~bash
firebase deploy --only functions,hosting
~~~

Firebase Hosting will provide a `*.web.app` URL.

### Local development

For local testing, use the Firebase Functions emulator. Keep production credentials in Firebase Secret Manager and never put the Twelve Data key in browser-served files.

Do not put the Twelve Data key in `config.js`, `app.js`, `api.js`, HTML, or any other browser-served file.

## GitHub

StockQuest no longer uses GitHub Actions secrets or a Wasmer deployment workflow. Deployment is handled with the Firebase CLI, and the Twelve Data secret is managed by Firebase/Google Secret Manager.