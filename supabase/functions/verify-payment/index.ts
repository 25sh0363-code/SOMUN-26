// ————————————————————————————————————————————————————————————————
// SOMUN '26 — verify-payment (Supabase Edge Function, Deno)
// Confirms a Cashfree order's status against the Cashfree API (never
// the browser's word) and flips the registration row to paid.
//
// Deploy:
//   supabase functions deploy verify-payment
// Secrets: same set as create-payment (CASHFREE_APP_ID, CASHFREE_SECRET_KEY,
// CASHFREE_MODE). SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected.
// ————————————————————————————————————————————————————————————————

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const APP_ID = Deno.env.get("CASHFREE_APP_ID") ?? "";
  const SECRET = Deno.env.get("CASHFREE_SECRET_KEY") ?? "";
  const MODE = Deno.env.get("CASHFREE_MODE") ?? "sandbox";
  if (!APP_ID || !SECRET) return json({ error: "payments not configured yet" }, 503);

  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return json({ error: "order_id missing" }, 400);

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sbHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

  // 1 · ask Cashfree directly — the client's answer is never trusted
  const base = MODE === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
  const cfRes = await fetch(`${base}/pg/orders/${encodeURIComponent(order_id)}`, {
    headers: { "x-client-id": APP_ID, "x-client-secret": SECRET, "x-api-version": "2023-09-30" },
  });
  if (!cfRes.ok) {
    const e = await cfRes.json().catch(() => ({}));
    return json({ error: e.message || "could not reach Cashfree" }, 502);
  }
  const order = await cfRes.json();
  const status = String(order.order_status ?? "UNKNOWN").toUpperCase();

  // 2 · PAID → mark the registration row (match on the stored order id)
  if (status === "PAID") {
    await fetch(`${SB_URL}/rest/v1/registrations?cashfree_order_id=eq.${encodeURIComponent(order_id)}`, {
      method: "PATCH",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ payment_status: "paid", paid_at: new Date().toISOString() }),
    });
  }

  return json({ status, order_id });
});
