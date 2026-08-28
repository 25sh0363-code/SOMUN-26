import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeRefCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SM26-${code}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const institution = String(body.institution ?? "").trim();
    const committeePref1 = String(body.committeePref1 ?? "").trim();

    if (!fullName || fullName.length < 3) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Please enter a valid phone number." }, { status: 400 });
    }
    if (!institution) {
      return NextResponse.json({ error: "Institution / organisation is required." }, { status: 400 });
    }
    if (!committeePref1) {
      return NextResponse.json({ error: "Please choose at least one committee preference." }, { status: 400 });
    }

    const clean = (v: unknown, max = 300) => {
      const s = String(v ?? "").trim();
      return s ? s.slice(0, max) : null;
    };

    // ensure unique ref code
    let refCode = makeRefCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await db.registration.findUnique({ where: { refCode } });
      if (!exists) break;
      refCode = makeRefCode();
    }

    const registration = await db.registration.create({
      data: {
        refCode,
        fullName,
        email,
        phone,
        institution,
        gradeOrTitle: clean(body.gradeOrTitle, 60),
        experience: String(body.experience ?? "novice"),
        committeePref1,
        committeePref2: clean(body.committeePref2, 40),
        committeePref3: clean(body.committeePref3, 40),
        portfolio: clean(body.portfolio, 120),
        accommodation: Boolean(body.accommodation),
        notes: clean(body.notes, 1000),
      },
    });

    return NextResponse.json({
      ok: true,
      refCode: registration.refCode,
      message: "Registration received.",
    });
  } catch (err) {
    console.error("register api error:", err);
    return NextResponse.json(
      { error: "Something went wrong while saving your registration. Please retry." },
      { status: 500 }
    );
  }
}
