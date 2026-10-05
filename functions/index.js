const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const twelveDataApiKey = defineSecret("TWELVEDATA_API_KEY");
const BASE = "https://api.twelvedata.com";

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.status(status);
  res.set("Cache-Control", "no-store");
  res.type(type);
  res.send(typeof body === "string" ? body : JSON.stringify(body));
}

async function twelveData(endpoint, params) {
  const key = twelveDataApiKey.value();
  if (!key) throw new Error("Server API key is not configured.");

  const url = new URL(endpoint, BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set("apikey", key);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.status === "error" || data?.code) {
    throw new Error(data?.message || data?.code || `Twelve Data HTTP ${response.status}`);
  }

  return data;
}

exports.api = onRequest(
  {
    region: "us-east1",
    secrets: [twelveDataApiKey],
  },
  async (req, res) => {
    try {
      const requestUrl = new URL(
        req.originalUrl || req.url || "/",
        "https://stockquest.local"
      );
      const pathname = requestUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/health";

      if (req.method === "OPTIONS") {
        return send(res, 204, "");
      }

      if (pathname === "/health") {
        return send(res, 200, {
          ok: true,
          configured: Boolean(twelveDataApiKey.value()),
        });
      }

      if (req.method !== "GET") {
        return send(res, 405, { error: "Method not allowed." });
      }

      if (pathname === "/price") {
        const symbol = requestUrl.searchParams.get("symbol")?.trim();
        if (!symbol) return send(res, 400, { error: "Missing symbol." });

        const data = await twelveData("/price", { symbol });
        const price = Number(data?.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("No valid price returned.");
        }

        return send(res, 200, { price });
      }

      if (pathname === "/chart") {
        const symbol = requestUrl.searchParams.get("symbol")?.trim();
        if (!symbol) return send(res, 400, { error: "Missing symbol." });

        const data = await twelveData("/time_series", {
          symbol,
          interval: "5min",
          outputsize: 24,
        });

        const values = (Array.isArray(data?.values) ? data.values : [])
          .slice()
          .reverse()
          .map((item) => Number(item?.close))
          .filter((value) => Number.isFinite(value) && value > 0);

        if (values.length < 2) throw new Error("Not enough chart data.");
        return send(res, 200, { values });
      }

      if (pathname === "/search") {
        const query = requestUrl.searchParams.get("q")?.trim();
        if (!query) return send(res, 200, { data: [] });

        const data = await twelveData("/symbol_search", {
          symbol: query,
          outputsize: 10,
        });

        const seen = new Set();
        const list = (Array.isArray(data?.data) ? data.data : [])
          .filter((item) => {
            const symbol = String(item?.symbol || "").trim().toUpperCase();
            if (!symbol || seen.has(symbol)) return false;
            seen.add(symbol);
            return true;
          })
          .map((item) => ({
            symbol: String(item.symbol).trim().toUpperCase(),
            instrument_name: item.instrument_name || item.name || item.symbol,
            exchange: item.exchange || "",
            mic_code: item.mic_code || "",
            type: item.instrument_type || item.type || "",
          }));

        return send(res, 200, { data: list });
      }

      return send(res, 404, { error: "API route not found." });
    } catch (error) {
      console.error("StockQuest API error:", error);
      return send(res, 502, {
        error: error?.message || "Upstream request failed.",
      });
    }
  }
);
