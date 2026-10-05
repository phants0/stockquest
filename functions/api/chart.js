const BASE = "https://api.twelvedata.com";

export async function onRequestGet(context) {
  try {
    const symbol = new URL(context.request.url).searchParams.get("symbol")?.trim();
    const key = context.env.TWELVEDATA_API_KEY;
    if (!symbol) return Response.json({ error: "Missing symbol." }, { status: 400 });
    if (!key) throw new Error("Stock data service is not configured.");

    const url = new URL("/time_series", BASE);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", "5min");
    url.searchParams.set("outputsize", "24");
    url.searchParams.set("apikey", key);

    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.status === "error" || data?.code) {
      throw new Error(data?.message || data?.code || ("Twelve Data HTTP " + response.status));
    }

    const values = (Array.isArray(data?.values) ? data.values : [])
      .slice()
      .reverse()
      .map(item => Number(item?.close))
      .filter(value => Number.isFinite(value) && value > 0);

    if (values.length < 2) throw new Error("Not enough chart data.");
    return Response.json({ values }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error?.message || "Upstream request failed." }, { status: 502 });
  }
}
