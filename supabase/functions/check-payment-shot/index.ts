// ————————————————————————————————————————————————————————————————
// SOMUN '26 — check-payment-shot (Supabase Edge Function, Deno)
// AI assistant for the UPI QR pipeline: reads a delegate's payment
// screenshot with Gemini 2.5 Flash, extracts {app, UTR, amount, payee
// VPA, payment_complete}, cross-checks them against the DECLARED values
// on the registration row, and stores the verdict in
// registrations.shot_check (jsonb) for the #/verify console badges.
//
// TRUST CONTRACT (do not change): the verdict NEVER flips a registration
// to paid. It is a consistency read — the "paid" switch stays owned by
// the bank credit feed or the secretariat's Verify/Bind click. The model
// is explicitly told it is NOT a forgery forensics tool; pixels cannot
// prove authenticity, only the bank feed can.
//
// Deploy:
//   supabase functions deploy check-payment-shot
//   (or dashboard → Edge Functions → Create a new one → paste this file)
// Secrets (dashboard → Edge Functions → Secrets, server-side ONLY):
//   GEMINI_API_KEY=…          (aistudio.google.com → Get API key)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.
// The payee VPA to check against is read from app_secrets.payee_vpa
// (set it in the SQL Editor — see PAYMENT-SETUP.md).
// With GEMINI_API_KEY unset the function answers 503 and the frontend
// silently skips the check — the pipeline runs fine without it.
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

const MODEL = "gemini-2.5-flash";
const MAX_ATTEMPTS = 3;          // AI reads per registration (cost cap)
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const SHOT_SCHEMA = {
  type: "OBJECT",
  properties: {
    screen_type:      { type: "STRING", nullable: true },
    app:              { type: "STRING", nullable: true },
    payment_complete: { type: "BOOLEAN", nullable: true },
    utr:              { type: "STRING", nullable: true },
    amount:           { type: "NUMBER", nullable: true },
    payee_vpa:        { type: "STRING", nullable: true },
    payee_name:       { type: "STRING", nullable: true },
    anomalies:        { type: "ARRAY", items: { type: "STRING" } },
    consistency:      { type: "STRING", enum: ["match", "mismatch", "unclear"] },
    notes:            { type: "STRING" },
  },
  required: ["consistency", "anomalies", "notes", "payment_complete"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const GEMINI = Deno.env.get("GEMINI_API_KEY") ?? "";
  if (!SB_URL || !SRK) return json({ error: "supabase env missing" }, 500);
  if (!GEMINI) return json({ error: "AI check not configured — set GEMINI_API_KEY" }, 503);

  const { ref_code } = await req.json().catch(() => ({}));
  const code = String(ref_code ?? "").toUpperCase().trim();
  if (!code) return json({ error: "ref_code missing" }, 400);

  const auth = { apikey: SRK, Authorization: `Bearer ${SRK}`, "Content-Type": "application/json" };

  try {
    // — the registration row —
    const r = await fetch(
      `${SB_URL}/rest/v1/registrations?ref_code=eq.${encodeURIComponent(code)}&select=id,ref_code,payment_status,upi_utr,amount,shot_path,shot_check`,
      { headers: auth },
    );
    if (!r.ok) return json({ error: "registrations read failed" }, 500);
    const rows = await r.json();
    const reg = rows?.[0];
    if (!reg) return json({ error: "Reference code not found." }, 404);
    if (reg.payment_status === "paid") return json({ status: "paid", ref_code: reg.ref_code });
    if (!reg.shot_path) return json({ error: "No screenshot on file for this registration." }, 400);

    // cost cap — a row is read at most MAX_ATTEMPTS times, then cached
    const prev = reg.shot_check ?? {};
    if (prev.verdict && (prev.attempts ?? 0) >= MAX_ATTEMPTS) {
      return json({ cached: true, ...prev });
    }

    // — pull the image from the private bucket —
    const dl = await fetch(
      `${SB_URL}/storage/v1/object/payment-shots/${reg.shot_path.split("/").map(encodeURIComponent).join("/")}`,
      { headers: { Authorization: `Bearer ${SRK}` } },
    );
    if (!dl.ok) return json({ error: "screenshot could not be loaded" }, 400);
    const blob = await dl.blob();
    if (blob.size > MAX_IMAGE_BYTES) return json({ error: "screenshot too large" }, 400);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const b64 = btoa(bin);

    // — expected payee VPA from app_secrets —
    const s = await fetch(`${SB_URL}/rest/v1/app_secrets?name=eq.payee_vpa&select=value`, { headers: auth });
    const secret = s.ok ? (await s.json())?.[0]?.value ?? "" : "";
    const expectedVpa = secret.trim();

    // — Gemini 2.5 Flash, structured output —
    const prompt = [
      "You are the payment-desk assistant of a school Model UN conference.",
      "The image is a screenshot a delegate uploaded as proof of a UPI payment.",
      "",
      "Read the screen and extract: the UPI app it shows, whether a completed",
      "payment is visible, the transaction / UTR reference id, the amount paid,",
      "and the payee UPI ID (VPA) and payee name if shown.",
      "",
      "Then cross-check the extracted values against the DECLARED values:",
      `- declared transaction id : ${reg.upi_utr ?? "(none)"}`,
      `- declared amount         : ₹${reg.amount ?? "(none)"}`,
      `- expected payee VPA      : ${expectedVpa || "(not configured — skip this check)"}`,
      "",
      "Rules:",
      '- consistency is "match" when a completed payment is visible and the',
      "  transaction id and amount agree with the declared values (and the",
      "  payee VPA agrees when one is configured); \"mismatch\" when any checked",
      '  value differs; "unclear" when the image is unreadable, cropped or the',
      "  fields are missing.",
      "- Only judge what is visibly written in the image.",
      "- You are NOT a forensic tool: never claim the image is authentic or",
      "  manipulated, and never analyse fonts, compression or editing artifacts.",
      "- Put every concrete disagreement into anomalies as short strings, e.g.",
      '  "shot shows ₹99, declared ₹1499".',
      "- notes: one short sentence addressed to the secretariat.",
    ].join("\n");

    const g = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: blob.type || "image/jpeg", data: b64 } }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: SHOT_SCHEMA,
          },
        }),
      },
    );
    if (!g.ok) {
      const detail = await g.text().catch(() => "");
      return json({ error: `Gemini call failed (${g.status})`, detail: detail.slice(0, 300) }, 502);
    }
    const gOut = await g.json();
    const text = gOut?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    let verdict: Record<string, unknown>;
    try {
      verdict = JSON.parse(text);
    } catch {
      return json({ error: "AI returned an unreadable verdict — retry." }, 502);
    }

    // — persist on the row (service role write; anon never sees it) —
    const record = {
      checked_at: new Date().toISOString(),
      attempts: (prev.attempts ?? 0) + 1,
      model: MODEL,
      expected: { utr: reg.upi_utr ?? null, amount: reg.amount ?? null, vpa: expectedVpa || null },
      verdict,
    };
    await fetch(`${SB_URL}/rest/v1/registrations?id=eq.${reg.id}`, {
      method: "PATCH",
      headers: { ...auth, Prefer: "return=minimal" },
      body: JSON.stringify({ shot_check: record }),
    });

    return json({ ref_code: reg.ref_code, ...record });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
