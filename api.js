const API_KEY = String(window.STOCKQUEST_CONFIG?.TWELVEDATA_API_KEY || "").trim();
const API_BASE = "https://api.twelvedata.com";

const quoteCache = new Map();
const graphCache = new Map();
const searchCache = new Map();
const inFlight = new Map();
const queue = [];
let activeRequests = 0;

const SETTINGS = {
    quoteTTL: 30000,
    graphTTL: 300000,
    searchTTL: 300000,
    staleTTL: 1800000,
    retries: 2,
    retryDelay: 700,
    maxConcurrent: 3
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeTicker(ticker) {
    return String(ticker || "").trim().toUpperCase();
}

function fresh(entry, ttl) {
    return !!entry && Date.now() - entry.time < ttl;
}

function usable(entry) {
    return !!entry && entry.value !== undefined && Date.now() - entry.time < SETTINGS.staleTTL;
}

function runQueued(task) {
    return new Promise((resolve, reject) => {
        queue.push({ task, resolve, reject });
        pumpQueue();
    });
}

function pumpQueue() {
    while (activeRequests < SETTINGS.maxConcurrent && queue.length) {
        const item = queue.shift();
        activeRequests++;
        Promise.resolve()
            .then(item.task)
            .then(item.resolve, item.reject)
            .finally(() => {
                activeRequests--;
                pumpQueue();
            });
    }
}

function dedupe(key, task) {
    if (inFlight.has(key)) return inFlight.get(key);
    const promise = runQueued(task).finally(() => inFlight.delete(key));
    inFlight.set(key, promise);
    return promise;
}

async function fetchJSON(url) {
    let lastError;

    for (let attempt = 0; attempt <= SETTINGS.retries; attempt++) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            let data;
            try {
                data = await response.json();
            } catch {
                throw new Error(`Invalid API response (${response.status})`);
            }

            if (!response.ok || data?.status === "error" || data?.code) {
                throw new Error(data?.message || `HTTP ${response.status}`);
            }
            return data;
        } catch (error) {
            lastError = error;
            if (attempt < SETTINGS.retries) {
                await sleep(SETTINGS.retryDelay * Math.pow(2, attempt));
            }
        }
    }

    throw lastError || new Error("Request failed");
}

async function getStock(ticker) {
    if (!API_KEY) return { price: null, green: true, stale: false, error: "Twelve Data API key is not configured" };
    const symbol = normalizeTicker(ticker);
    if (!symbol) return { price: null, green: true, stale: false, error: "Missing ticker" };

    const cached = quoteCache.get(symbol);
    if (fresh(cached, SETTINGS.quoteTTL)) {
        return { ...cached.value, cached: true, stale: false };
    }

    try {
        const value = await dedupe(`quote:${symbol}`, async () => {
            const url = `${API_BASE}/price?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(API_KEY)}`;
            const data = await fetchJSON(url);
            const price = Number(data?.price);
            if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price returned by TwelveData");

            const previous = quoteCache.get(symbol)?.value?.price;
            const result = {
                price,
                green: Number.isFinite(previous) ? price >= previous : true,
                stale: false,
                error: null
            };
            quoteCache.set(symbol, { time: Date.now(), value: result });
            return result;
        });
        return { ...value, cached: false, stale: false };
    } catch (error) {
        if (usable(quoteCache.get(symbol))) {
            return {
                ...quoteCache.get(symbol).value,
                cached: true,
                stale: true,
                error: error?.message || "Refresh failed"
            };
        }
        return { price: null, green: true, stale: false, cached: false, error: error?.message || "Unable to load price" };
    }
}

async function getGraphData(ticker) {
    if (!API_KEY) return [];
    const symbol = normalizeTicker(ticker);
    if (!symbol) return [];

    const cached = graphCache.get(symbol);
    if (fresh(cached, SETTINGS.graphTTL)) return cached.value.slice();

    try {
        const prices = await dedupe(`graph:${symbol}`, async () => {
            const url = `${API_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=5min&outputsize=24&apikey=${encodeURIComponent(API_KEY)}`;
            const data = await fetchJSON(url);
            if (!Array.isArray(data?.values)) throw new Error("No graph data returned by TwelveData");

            const values = data.values
                .slice()
                .reverse()
                .map(item => Number(item?.close))
                .filter(value => Number.isFinite(value) && value > 0);

            if (values.length < 2) throw new Error("Not enough graph data");
            graphCache.set(symbol, { time: Date.now(), value: values });
            return values;
        });
        return prices.slice();
    } catch (error) {
        console.error(`Graph failed for ${symbol}:`, error);
        if (usable(graphCache.get(symbol))) return graphCache.get(symbol).value.slice();
        return [];
    }
}

async function fetchSearch(query) {
    if (!API_KEY) return [];
    const clean = String(query || "").trim();
    if (!clean) return [];

    const key = clean.toLowerCase();
    const cached = searchCache.get(key);
    if (fresh(cached, SETTINGS.searchTTL)) return cached.value.map(item => ({ ...item }));

    try {
        const results = await dedupe(`search:${key}`, async () => {
            const url = `${API_BASE}/symbol_search?symbol=${encodeURIComponent(clean)}&apikey=${encodeURIComponent(API_KEY)}`;
            const data = await fetchJSON(url);
            if (!Array.isArray(data?.data)) throw new Error("No search data returned by TwelveData");

            const seen = new Set();
            const list = data.data.filter(item => {
                const symbol = normalizeTicker(item?.symbol);
                if (!symbol || seen.has(symbol)) return false;
                seen.add(symbol);
                return true;
            }).slice(0, 10).map(item => ({
                symbol: normalizeTicker(item.symbol),
                instrument_name: item.instrument_name || item.name || item.symbol,
                exchange: item.exchange || "",
                mic_code: item.mic_code || "",
                type: item.type || ""
            }));

            searchCache.set(key, { time: Date.now(), value: list });
            return list;
        });
        return results.map(item => ({ ...item }));
    } catch (error) {
        console.error("Search failed:", error);
        if (usable(searchCache.get(key))) return searchCache.get(key).value.map(item => ({ ...item }));
        return [];
    }
}

function clearStockCache(ticker) {
    if (!ticker) {
        quoteCache.clear();
        graphCache.clear();
        searchCache.clear();
        return;
    }
    const symbol = normalizeTicker(ticker);
    quoteCache.delete(symbol);
    graphCache.delete(symbol);
}

function getDataLayerStatus(ticker) {
    const symbol = normalizeTicker(ticker);
    return {
        activeRequests,
        queuedRequests: queue.length,
        quoteCached: quoteCache.has(symbol),
        graphCached: graphCache.has(symbol),
        quoteInFlight: inFlight.has(`quote:${symbol}`),
        graphInFlight: inFlight.has(`graph:${symbol}`)
    };
}
