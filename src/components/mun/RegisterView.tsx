"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, ChevronDown, Loader2, PartyPopper, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { COMMITTEES, CONFERENCE, FEES } from "./data";
import { PageWrap, Reveal, SectionHead } from "./shared";

const EXPERIENCE = [
  { value: "novice", label: "Novice — 0 conferences" },
  { value: "intermediate", label: "Intermediate — 1–4 conferences" },
  { value: "veteran", label: "Veteran — 5+ conferences" },
];

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  institution: string;
  gradeOrTitle: string;
  experience: string;
  committeePref1: string;
  committeePref2: string;
  committeePref3: string;
  portfolio: string;
  accommodation: boolean;
  notes: string;
}

const INITIAL: FormState = {
  fullName: "",
  email: "",
  phone: "",
  institution: "",
  gradeOrTitle: "",
  experience: "novice",
  committeePref1: "",
  committeePref2: "",
  committeePref3: "",
  portfolio: "",
  accommodation: false,
  notes: "",
};

function CommitteeSelect({
  value,
  onChange,
  label,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
        {label} {required && <span className="text-crimson">*</span>}
      </Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full min-h-[44px] border-input bg-ink/70 hover:border-beige/40 data-[placeholder]:text-beige-dim/60 font-normal">
          <span className="flex w-full items-center justify-between gap-2 truncate">
            <span className={value ? "text-beige" : "text-beige-dim/60"}>
              {value
                ? `${COMMITTEES.find((c) => c.slug === value)?.acronym ?? ""} — ${COMMITTEES.find((c) => c.slug === value)?.name ?? ""}`
                : "Select a committee"}
            </span>
            <ChevronDown className="size-4 opacity-50 shrink-0" />
          </span>
        </SelectTrigger>
        <SelectContent className="bg-popover border-line max-h-72 overflow-y-auto">
          {COMMITTEES.map((c) => (
            <SelectItem key={c.slug} value={c.slug} className="text-sm focus:bg-accent focus:text-beige">
              <span className="font-semibold">{c.acronym}</span>
              <span className="text-beige-dim"> · {c.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RegisterView() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const { toast } = useToast();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed.");
      setRefCode(data.refCode);
      toast({
        title: "Registration received",
        description: `Your reference code is ${data.refCode}.`,
      });
    } catch (err) {
      toast({
        title: "Could not submit",
        description:
          err instanceof Error ? err.message : "Unexpected error. Please retry.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /* ————— success state ————— */
  if (refCode) {
    return (
      <main>
        <PageWrap>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-2xl mt-8 sm:mt-16 text-center"
          >
            <PartyPopper className="size-10 mx-auto text-crimson" strokeWidth={1.3} />
            <h1 className="mt-7 font-display text-4xl sm:text-6xl font-bold text-beige leading-tight">
              You&apos;re on the roll, <em className="italic text-crimson">delegate.</em>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-beige-dim">
              Your application has been recorded and forwarded to the secretariat.
              Allocations are announced over email within ten working days of the
              early-bird deadline. Watch your inbox — and start reading your study guide.
            </p>

            <div className="mt-10 border border-crimson/50 bg-panel/70 px-8 py-9 inline-block">
              <p className="text-[10px] uppercase tracking-[0.4em] text-beige-dim">
                Your Reference Code
              </p>
              <p className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-[0.12em] text-beige">
                {refCode}
              </p>
              <p className="mt-3 text-xs text-beige-dim/80">
                Quote this code in every email to the secretariat.
              </p>
            </div>

            <div className="mt-10 grid gap-4 text-left max-w-md mx-auto">
              {[
                ["Payment", "The invoice attached to your allocation email is payable via UPI or bank transfer."],
                ["Study guides", "Background guides release on October 1, 2026 under committee pages."],
                ["Amendments", "Committee and portfolio change requests close October 5, 2026."],
              ].map(([t, d]) => (
                <div key={t} className="flex gap-4 border-b border-line pb-4">
                  <BadgeCheck className="size-4 mt-0.5 shrink-0 text-crimson" />
                  <p className="text-sm leading-relaxed text-beige-dim">
                    <span className="text-beige font-medium">{t}</span> — {d}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </PageWrap>
      </main>
    );
  }

  /* ————— form state ————— */
  const inputCls =
    "min-h-[44px] bg-ink/70 border-input text-beige placeholder:text-beige-dim/50 focus-visible:ring-crimson focus-visible:border-beige/40";

  return (
    <main>
      <PageWrap>
        <SectionHead
          index="VI"
          kicker="Registration · Oct '26"
          title={
            <>
              Take your seat
              <br />
              at the <em className="italic text-crimson">table.</em>
            </>
          }
          intro={`Complete the form below and the secretariat will respond with your portfolio allotment and payment link. Early-bird rates apply until September 30, 2026 — for assistance write to ${CONFERENCE.email}.`}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_360px] items-start">
          {/* ————— form card ————— */}
          <Reveal delay={0.05}>
            <form
              onSubmit={onSubmit}
              className="border border-line bg-panel/50 p-6 sm:p-10 space-y-8"
              noValidate={false}
            >
              {/* identity */}
              <fieldset className="space-y-5">
                <legend className="flex items-center gap-4 mb-6">
                  <span className="font-display italic text-crimson text-lg">i</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
                    Delegate Identity
                  </span>
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                      Full Name <span className="text-crimson">*</span>
                    </Label>
                    <Input id="fullName" required placeholder="e.g. Aarav Sharma"
                      className={inputCls}
                      value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                      Email <span className="text-crimson">*</span>
                    </Label>
                    <Input id="email" type="email" required placeholder="you@school.edu"
                      className={inputCls}
                      value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                      Phone (WhatsApp preferred) <span className="text-crimson">*</span>
                    </Label>
                    <Input id="phone" required inputMode="tel" placeholder="+91 …"
                      className={inputCls}
                      value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                      Institution / Organisation <span className="text-crimson">*</span>
                    </Label>
                    <Input id="institution" required placeholder="School / college / IP house"
                      className={inputCls}
                      value={form.institution} onChange={(e) => set("institution", e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="gradeOrTitle" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                      Class / Year / Professional Title
                    </Label>
                    <Input id="gradeOrTitle" placeholder="e.g. Grade XI · B.A. LL.B., 2nd year"
                      className={inputCls}
                      value={form.gradeOrTitle} onChange={(e) => set("gradeOrTitle", e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <div className="h-px bg-line" />

              {/* experience */}
              <fieldset className="space-y-5">
                <legend className="flex items-center gap-4 mb-6">
                  <span className="font-display italic text-crimson text-lg">ii</span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
                    Experience & Preferences
                  </span>
                </legend>
                <div className="space-y-2 max-w-md">
                  <Label className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                    MUN Experience
                  </Label>
                  <Select value={form.experience} onValueChange={(v) => set("experience", v)}>
                    <SelectTrigger className="w-full min-h-[44px] border-input bg-ink/70 hover:border-beige/40 font-normal text-beige">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-line">
                      {EXPERIENCE.map((x) => (
                        <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-5 sm:grid-cols-3">
                  <CommitteeSelect label="Preference I" required value={form.committeePref1}
                    onChange={(v) => set("committeePref1", v)} />
                  <CommitteeSelect label="Preference II" value={form.committeePref2}
                    onChange={(v) => set("committeePref2", v)} />
                  <CommitteeSelect label="Preference III" value={form.committeePref3}
                    onChange={(v) => set("committeePref3", v)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                    Preferred Country / Leader Portfolio
                  </Label>
                  <Input id="portfolio" placeholder="e.g. France in UNSC · PM in AIPPM"
                    className={inputCls}
                    value={form.portfolio} onChange={(e) => set("portfolio", e.target.value)} />
                </div>

                <div className="flex items-center justify-between gap-6 border border-line bg-ink/40 px-5 py-4">
                  <div>
                    <Label htmlFor="accommodation" className="text-sm text-beige">
                      Accommodation needed
                    </Label>
                    <p className="mt-1 text-xs leading-relaxed text-beige-dim">
                      Twin-sharing rooms near the venue at ₹2,400 per night for outstation delegates.
                    </p>
                  </div>
                  <Switch
                    id="accommodation"
                    checked={form.accommodation}
                    onCheckedChange={(v) => set("accommodation", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
                    Anything the secretariat should know?
                  </Label>
                  <Textarea id="notes" rows={4}
                    placeholder="Dietary requirements, prior achievements, delegation groupings…"
                    className="bg-ink/70 border-input text-beige placeholder:text-beige-dim/50 focus-visible:ring-crimson resize-none"
                    value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </div>
              </fieldset>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto min-h-[52px] px-10 bg-crimson hover:bg-crimson-deep text-primary-foreground text-xs font-semibold uppercase tracking-[0.3em]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </Reveal>

          {/* ————— fees sidebar ————— */}
          <Reveal delay={0.15} className="space-y-6 lg:sticky lg:top-28">
            <div className="border border-line bg-panel/60 p-7">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
                Registration Fees
              </h3>
              <ul className="mt-6 space-y-6">
                {FEES.map((f) => (
                  <li key={f.label} className="border-b border-line pb-5 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm font-medium text-beige">{f.label}</span>
                      <span className="font-display text-xl text-beige">
                        {f.standard !== f.early && (
                          <s className="text-sm text-beige-dim/60 mr-2 no-underline line-through decoration-crimson/60">
                            {f.standard}
                          </s>
                        )}
                        {f.early}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-beige-dim">{f.note}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex gap-2.5 text-[11px] leading-relaxed text-beige-dim">
                <ShieldAlert className="size-4 shrink-0 text-crimson" />
                Every pass includes delegate kit, all three days of meals, socials entry and certificates.
              </p>
            </div>

            <div className="border border-crimson/50 bg-crimson-deep/20 p-7">
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary-foreground/80">
                Deadlines
              </p>
              <ul className="mt-4 space-y-3 text-sm text-beige-dim">
                <li className="flex justify-between gap-4"><span>Early-bird pricing</span><span className="text-beige">Sep 30</span></li>
                <li className="flex justify-between gap-4"><span>Allocations announced</span><span className="text-beige">Oct 4</span></li>
                <li className="flex justify-between gap-4"><span>Study guides released</span><span className="text-beige">Oct 1</span></li>
                <li className="flex justify-between gap-4"><span>Final changes</span><span className="text-beige">Oct 5</span></li>
              </ul>
            </div>
          </Reveal>
        </div>
      </PageWrap>
    </main>
  );
}
