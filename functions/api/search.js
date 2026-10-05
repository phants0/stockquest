const BASE = "https://api.twelvedata.com";

export async function onRequestGet(context) {
  try {
    const query = new URL(context.request.url).searchParams.get("q")?.trim();
    const key = context.env.TWELVEDATA_API_KEY;
    if (!query) return Response.json({ data: [] });
    if (!key) throw new Error("Stock data service is not configured.");

    const url = new URL("/symbol_search", BASE);
    url.searchParams.set("symbol", query);
    url.searchParams.set("outputsize", "10");
    url.searchParams.set("apikey", key);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.status === "error" || data?.code) {
      throw new Error(data?.message || data?.code || ("Twelve Data HTTP " + response.status));
    }

    const seen = new Set();
    const list = (Array.isArray(data?.data) ? data.data : [])
      .filter(item => {
        const symbol = String(item?.symbol || "").trim().toUpperCase();
        if (!symbol || seen.has(symbol)) return false;
        seen.add(symbol);
        return true;
      })
      .map(item => ({
        symbol: String(item.symbol).trim().toUpperCase(),
        instrument_name: item.instrument_name || item.name || item.symbol,
        exchange: item.exchange || "",
        mic_code: item.mic_code || "",
        type: item.instrument_type || item.type || ""
      }));

    return Response.json({ data: list }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error?.message || "Upstream request failed." }, { status: 502 });
  }
}
