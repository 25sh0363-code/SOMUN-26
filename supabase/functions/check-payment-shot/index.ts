// ════════════════════════════════════════════════════════════════
   SOMUN '26 — check-payment-shot (edge function)
   ════════════════════════════════════════════════════════════════
   Gemini 2.5 Flash reads a delegate's UPI success screenshot back and
   cross-checks it against what the row DECLARES: the unique invoiced
   amount (paise included — they are the watermark), the payee VPA and
   the submitted UTR.

   TRUST CONTRACT (also written into the prompt):
   · The model is NOT a forensic tool — it never claims an image is
     authentic or manipulated.
   · Its verdict is ADVISORY ONLY. Nothing in this function ever flips
     `payment_status` — that switch stays with the bank statement
     reconcile or the secretariat's own click in #/verify.
   · No GEMINI_API_KEY configured → 503 → the frontend silently skips.
   · Per-registration attempt cap: 3 stored reads.

   Deploy:  supabase functions deploy check-payment-shot
   Secret:  supabase secrets set GEMINI_API_KEY=…   (aistudio.google.com)
   ════════════════════════════════════════════════════════════════

const MODEL = "gemini-2.5-flash";
const MAX_ATTEMPTS = 3;

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHOT_SCHEMA = {
  type: "object",
  properties: {
    app: { type: "string", description: "UPI app name if visible, else empty" },
    payment_complete: { type: "boolean", description: "true only if the screen shows a completed/successful payment (tick / 'Paid' / 'Success')" },
    amount: { type: "number", description: "the amount the screenshot shows as paid, 0 if unreadable" },
    payee_vpa: { type: "string", description: "payee UPI id shown on the screen, empty if unreadable" },
    payee_name: { type: "string", description: "payee name shown on the screen, empty if unreadable" },
    utr: { type: "string", description: "UTR / transaction id shown on the screen, empty if unreadable" },
    anomalies: { type: "array", items: { type: "string" }, description: "readable contradictions vs the declared values, empty if none" },
    consistency: { type: "string", enum: ["match", "mismatch", "unclear"] },
    notes: { type: "string", description: "one short sentence a human can act on" },
  },
  required: ["consistency", "notes"],
};

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000; // 32k chunks — spreading the whole image would blow the stack
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function supabaseGet(path: string): Promise<Response> {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_SERVICE,
      Authorization: `Bearer ${SB_SERVICE}`,
    },
  });
}

async function readRow(refCode: string) {
  const q = encodeURIComponent(`ref_code=eq.${refCode}`);
  const res = await supabaseGet(
    `registrations?${q}&select=id,payment_status,expected_amount,upi_utr,shot_path,shot_check&limit=1`,
  );
  if (!res.ok) throw new Error(`registrations lookup failed (${res.status})`);
  const rows = await res.json();
  return rows && rows.length ? rows[0] : null;
}

async function readSecret(key: string): Promise<string> {
  const res = await supabaseGet(
    `app_secrets?key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
  );
  if (!res.ok) return "";
  const rows = await res.json();
  return rows && rows.length ? String(rows[0].value || "") : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return json(503, { error: "AI assistant not configured" });

  let refCode = "";
  try {
    const body = await req.json();
    refCode = String(body.ref_code || "").trim().toUpperCase();
  } catch {
    return json(400, { error: "Invalid request body" });
  }
  if (!/^SM26-[A-Z0-9]{5}$/.test(refCode)) {
    return json(400, { error: "Invalid reference code" });
  }

  let row: any;
  try {
    row = await readRow(refCode);
  } catch (e) {
    return json(502, { error: String((e as Error).message || e) });
  }
  if (!row) return json(404, { error: "No registration for that reference code" });
  if (row.payment_status === "paid") return json(200, { status: "paid" });
  if (!row.shot_path) return json(400, { error: "No payment screenshot on the row" });

  // attempt cap — return the cached verdict once three reads are spent
  const prev = row.shot_check && typeof row.shot_check === "object" ? row.shot_check : null;
  const attempts = prev?.attempts ?? 0;
  if (attempts >= MAX_ATTEMPTS && prev?.verdict) {
    return json(200, { status: row.payment_status, verdict: prev.verdict, cached: true });
  }

  // the invoice this row was stamped with — paise included
  const expectedAmount = row.expected_amount != null ? Number(row.expected_amount) : null;
  const expectedVpa = await readSecret("payee_vpa");
  const declaredUtr = row.upi_utr ? String(row.upi_utr) : "";

  // pull the screenshot out of the private bucket (service role)
  let imgBytes: Uint8Array;
  try {
    const imgRes = await fetch(
      `${SB_URL}/storage/v1/object/payment-shots/${row.shot_path}`,
      { headers: { Authorization: `Bearer ${SB_SERVICE}` } },
    );
    if (!imgRes.ok) return json(404, { error: "Screenshot no longer readable" });
    imgBytes = new Uint8Array(await imgRes.arrayBuffer());
  } catch {
    return json(502, { error: "Could not fetch the screenshot" });
  }
  if (imgBytes.byteLength > 8 * 1024 * 1024) {
    return json(413, { error: "Screenshot too large for the AI desk" });
  }

  const mime = row.shot_path.toLowerCase().endsWith(".png")
    ? "image/png"
    : row.shot_path.toLowerCase().endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  const declared = [
    expectedAmount != null ? `invoiced amount: ₹${expectedAmount.toFixed(2)} — the paise digits are a deliberate unique watermark; treat them as significant` : null,
    expectedVpa ? `payee VPA: ${expectedVpa}` : null,
    declaredUtr ? `declared UTR: ${declaredUtr}` : null,
  ].filter(Boolean).join("\n");

  const prompt =
    "You are a payment-desk assistant for a school Model UN conference. A delegate uploaded a UPI app screenshot as evidence of paying their fee. Read the screenshot and compare ONLY what is plainly readable on it against these declared values:\n" +
    declared +
    "\n\nRules:\n" +
    "- You are NOT a forensic tool. Never claim the image is authentic, edited or manipulated; judge only the readable values.\n" +
    "- consistency = 'match' only when payment_complete is true AND the amount equals the invoiced amount exactly (to the paisa) AND the payee VPA matches when readable AND the UTR matches when both are readable.\n" +
    "- consistency = 'mismatch' when any readable value plainly contradicts the declared ones (wrong amount, wrong payee, failed/declined screen).\n" +
    "- consistency = 'unclear' when you cannot read enough to decide.\n" +
    "- Keep notes to one short, kind, actionable sentence.";

  try {
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mime, data: toBase64(imgBytes) } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: SHOT_SCHEMA,
          },
        }),
      },
    );
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json(502, { error: `AI desk unavailable (${aiRes.status})`, detail: t.slice(0, 300) });
    }
    const aiOut = await aiRes.json();
    const rawText = aiOut?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let verdict: any;
    try {
      verdict = JSON.parse(rawText);
    } catch {
      return json(502, { error: "AI answer was not parseable" });
    }

    const shotCheck = {
      checked_at: new Date().toISOString(),
      attempts: Math.min(attempts + 1, MAX_ATTEMPTS),
      model: MODEL,
      expected: { amount: expectedAmount, vpa: expectedVpa, utr: declaredUtr },
      verdict,
    };

    // store the read — advisory only, payment_status is never touched
    await fetch(`${SB_URL}/rest/v1/registrations?id=eq.${row.id}`, {
      method: "PATCH",
      headers: {
        apikey: SB_SERVICE,
        Authorization: `Bearer ${SB_SERVICE}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ shot_check: shotCheck }),
    });

    return json(200, { status: row.payment_status, verdict });
  } catch (e) {
    return json(502, { error: String((e as Error).message || e) });
  }
});
