export function onRequestGet(context) {
  return Response.json({ ok: true, configured: Boolean(context.env.TWELVEDATA_API_KEY) });
}
