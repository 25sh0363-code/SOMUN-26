// ————————————————————————————————————————————————————————————————
// SOMUN '26 — create-payment (Supabase Edge Function, Deno)
// Creates a Cashfree order for a registration and stores the order id.
//
// Deploy:
//   supabase functions deploy create-payment
// Secrets (server-side ONLY — never in the browser bundle):
//   supabase secrets set CASHFREE_APP_ID=… CASHFREE_SECRET_KEY=…
//   supabase secrets set CASHFREE_MODE=sandbox            (or production)
//   supabase secrets set REGISTRATION_FEE=1499            (fallback if row has none)
//   supabase secrets set SITE_URL=https://…               (return_url base)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// While CASHFREE_APP_ID / CASHFREE_SECRET_KEY are unset the function
// answers 503 — the frontend keeps its pay box hidden, so this is
// invisible to visitors.
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

  const { ref_code } = await req.json().catch(() => ({}));
  if (!ref_code) return json({ error: "ref_code missing" }, 400);

  const SB_URL = Deno.env.get("SUPABASE_URL")!;
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sbHeaders = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

  // 1 · load the registration row (service role — anon can't read rows)
  const regRes = await fetch(
    `${SB_URL}/rest/v1/registrations?ref_code=eq.${encodeURIComponent(ref_code)}&select=*`,
    { headers: sbHeaders },
  );
  const regs = regRes.ok ? await regRes.json() : [];
  const reg = Array.isArray(regs) ? regs[0] : null;
  if (!reg) return json({ error: "registration not found for this reference code" }, 404);
  if (reg.payment_status === "paid") return json({ error: "this registration is already paid" }, 409);

  // 2 · resolve the fee (row amount wins, secret fee is the fallback)
  const amount = Number(reg.amount) || Number(Deno.env.get("REGISTRATION_FEE") ?? 0);
  if (!amount || amount <= 0) return json({ error: "fee not announced yet" }, 503);

  // 3 · create the Cashfree order
  const base = MODE === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");
  const orderId = `SM26-${reg.ref_code}-${Date.now().toString(36).toUpperCase()}`.slice(0, 45);
  const digits = String(reg.phone ?? "").replace(/\D/g, "");
  const cfRes = await fetch(`${base}/pg/orders`, {
    method: "POST",
    headers: {
      "x-client-id": APP_ID,
      "x-client-secret": SECRET,
      "x-api-version": "2023-09-30",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_name: reg.full_name,
        customer_email: reg.email,
        customer_phone: digits.length >= 10 ? digits.slice(-10) : "9999999999",
      },
      order_meta: siteUrl
        ? { return_url: `${siteUrl}/#/register?paid=${encodeURIComponent(reg.ref_code)}` }
        : undefined,
      order_note: `SOMUN '26 registration ${reg.ref_code}`,
      order_tags: { ref_code: reg.ref_code },
    }),
  });
  if (!cfRes.ok) {
    const e = await cfRes.json().catch(() => ({}));
    return json({ error: e.message || "Cashfree rejected the order" }, 502);
  }
  const order = await cfRes.json();

  // 4 · persist order id + amount on the row
  await fetch(`${SB_URL}/rest/v1/registrations?id=eq.${reg.id}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify({ cashfree_order_id: order.order_id, amount }),
  });

  return json({ order_id: order.order_id, payment_session_id: order.payment_session_id });
});
