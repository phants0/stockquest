const BASE = "https://api.twelvedata.com";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function twelveData(endpoint, params, key) {
  if (!key) throw new Error("Stock data service is not configured.");

  const url = new URL(endpoint, BASE);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, String(value));
  }
  url.searchParams.set("apikey", key);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.status === "error" || data?.code) {
    throw new Error(
      data?.message || data?.code || `Twelve Data HTTP ${response.status}`
    );
  }

  return data;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        if (request.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type",
            },
          });
        }

        if (url.pathname === "/api/health") {
          return json({
            ok: true,
            configured: Boolean(env.TWELVEDATA_API_KEY),
          });
        }

        if (request.method !== "GET") {
          return json({ error: "Method not allowed." }, 405);
        }

        if (url.pathname === "/api/price") {
          const symbol = url.searchParams.get("symbol")?.trim();
          if (!symbol) return json({ error: "Missing symbol." }, 400);

          const data = await twelveData(
            "/price",
            { symbol },
            env.TWELVEDATA_API_KEY
          );
          const price = Number(data?.price);

          if (!Number.isFinite(price) || price <= 0) {
            throw new Error("No valid price returned.");
          }

          return json({ price });
        }

        if (url.pathname === "/api/chart") {
          const symbol = url.searchParams.get("symbol")?.trim();
          if (!symbol) return json({ error: "Missing symbol." }, 400);

          const data = await twelveData(
            "/time_series",
            {
              symbol,
              interval: "5min",
              outputsize: 24,
            },
            env.TWELVEDATA_API_KEY
          );

          const values = (Array.isArray(data?.values) ? data.values : [])
            .slice()
            .reverse()
            .map((item) => Number(item?.close))
            .filter((value) => Number.isFinite(value) && value > 0);

          if (values.length < 2) {
            throw new Error("Not enough chart data.");
          }

          return json({ values });
        }

        if (url.pathname === "/api/search") {
          const query = url.searchParams.get("q")?.trim();
          if (!query) return json({ data: [] });

          const data = await twelveData(
            "/symbol_search",
            {
              symbol: query,
              outputsize: 10,
            },
            env.TWELVEDATA_API_KEY
          );

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
              instrument_name:
                item.instrument_name || item.name || item.symbol,
              exchange: item.exchange || "",
              mic_code: item.mic_code || "",
              type: item.instrument_type || item.type || "",
            }));

          return json({ data: list });
        }

        return json({ error: "API route not found." }, 404);
      } catch (error) {
        console.error("StockQuest API error:", error);
        return json(
          { error: error?.message || "Upstream request failed." },
          502
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
