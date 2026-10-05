const BASE = "https://api.twelvedata.com";

async function getQuote(symbol, key) {
  if (!key) throw new Error("Stock data service is not configured.");
  const url = new URL("/price", BASE);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", key);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status === "error" || data?.code) {
    throw new Error(data?.message || data?.code || ("Twelve Data HTTP " + response.status));
  }
  const price = Number(data?.price);
  if (!Number.isFinite(price) || price <= 0) throw new Error("No valid price returned.");
  return price;
}

export async function onRequestGet(context) {
  try {
    const symbol = new URL(context.request.url).searchParams.get("symbol")?.trim();
    if (!symbol) return Response.json({ error: "Missing symbol." }, { status: 400 });
    const price = await getQuote(symbol, context.env.TWELVEDATA_API_KEY);
    return Response.json({ price }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error?.message || "Upstream request failed." }, { status: 502 });
  }
}
