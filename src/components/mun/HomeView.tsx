"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Gavel,
  Globe2,
  Landmark,
  MapPin,
  Quote,
  ScrollText,
  Trophy,
  Users,
} from "lucide-react";
import { CONFERENCE, COMMITTEES } from "./data";
import { Reveal, SectionHead } from "./shared";
import type { View } from "./types";


/* ————————————————————— Countdown ————————————————————— */

function useCountdown(target: Date) {
  const [parts, setParts] = useState<{ d: string; h: string; m: string; s: string } | null>(null);
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, target.getTime() - Date.now());
      setParts({
        d: String(Math.floor(diff / 86400000)).padStart(2, "0"),
        h: String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0"),
        m: String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0"),
        s: String(Math.floor((diff % 60000) / 1000)).padStart(2, "0"),
      });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return parts;
}

function Countdown() {
  const c = useCountdown(CONFERENCE.countdownTarget);
  const cells = [
    { v: c?.d ?? "——", l: "Days" },
    { v: c?.h ?? "——", l: "Hours" },
    { v: c?.m ?? "——", l: "Mins" },
    { v: c?.s ?? "——", l: "Secs" },
  ];
  return (
    <div className="flex items-stretch divide-x divide-line border border-line bg-ink/60 backdrop-blur-sm">
      {cells.map((cell) => (
        <div key={cell.l} className="flex flex-col items-center px-4 sm:px-7 py-3.5 sm:py-4 min-w-[70px]">
          <span className="font-display text-2xl sm:text-3xl font-bold text-beige tabular-nums leading-none">
            {cell.v}
          </span>
          <span className="mt-1.5 text-[9px] uppercase tracking-[0.35em] text-beige-dim">
            {cell.l}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ————————————————————— Hero ————————————————————— */

function Hero({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-44 pb-16">
      {/* giant hollow watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-16 select-none font-display font-black leading-none text-hollow text-[42vw] sm:text-[30vw] lg:text-[26rem]"
      >
        26
      </div>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        {/* top meta row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.15 }}
          className="flex flex-wrap items-center gap-x-8 gap-y-2 text-[10px] uppercase tracking-[0.4em] text-beige-dim"
        >
          <span>Est. MMXXIII · Eighth Edition</span>
          <span className="hidden sm:inline-flex items-center gap-2">
            <span className="relative inline-flex size-1.5">
              <span className="absolute inset-0 rounded-full bg-crimson ping-soft" />
              <span className="relative rounded-full size-1.5 bg-crimson" />
            </span>
            Registrations Open
          </span>
        </motion.div>

        {/* headline */}
        <h1 className="relative mt-8 font-display font-black text-beige leading-[0.92] tracking-tight">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[15vw] sm:text-[13vw] lg:text-[10.5rem]"
          >
            SOMUN
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="block text-[15vw] sm:text-[13vw] lg:text-[10.5rem]"
          >
            <em className="text-crimson font-bold italic">&rsquo;26</em>
            <span className="ml-5 sm:ml-8 hidden sm:inline-flex flex-col text-left align-bottom mb-4 sm:mb-8 lg:mb-12">
              <span className="text-[3.4vw] sm:text-[1.6vw] lg:text-[1.35rem] tracking-[0.42em] text-beige/85 font-sans font-medium">
                MODEL UNITED
              </span>
              <span className="text-[3.4vw] sm:text-[1.6vw] lg:text-[1.35rem] tracking-[0.42em] text-beige-dim font-sans font-medium mt-1.5 lg:mt-3">
                NATIONS · HYDERABAD
              </span>
            </span>
          </motion.span>
        </h1>

        {/* sub row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_auto] lg:items-end"
        >
          <div className="max-w-xl">
            <p className="font-display italic text-xl sm:text-2xl text-beige/90 leading-snug">
              {CONFERENCE.tagline}
            </p>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-beige-dim">
              Nine committees. Five hundred delegates. Thirty institutions in one
              chamber of ideas — where every clause is contested and every voice
              counts until the final gavel falls.
            </p>

            <div className="mt-7 space-y-2.5 text-xs uppercase tracking-[0.28em] text-beige-dim">
              <p className="flex items-center gap-3">
                <CalendarDays className="size-4 text-crimson shrink-0" />
                {CONFERENCE.dates}
              </p>
              <p className="flex items-center gap-3">
                <MapPin className="size-4 text-crimson shrink-0" />
                {CONFERENCE.venue} · {CONFERENCE.city}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate("register")}
                className="group inline-flex items-center gap-3 bg-crimson hover:bg-crimson-deep text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] px-8 py-4 transition-colors duration-300"
              >
                Delegate Registration
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => onNavigate("committees")}
                className="inline-flex items-center gap-3 border border-beige/25 hover:border-beige/60 text-beige text-xs font-semibold uppercase tracking-[0.25em] px-8 py-4 transition-colors duration-300"
              >
                Explore Committees
              </button>
            </div>
          </div>

          <Countdown />
        </motion.div>

        {/* stats strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.75 }}
          className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 border-t border-l border-line"
        >
          {[
            ["09", "Committees"],
            ["500+", "Delegates"],
            ["30+", "Institutions"],
            ["03", "Unforgettable Days"],
          ].map(([n, label], i) => (
            <div
              key={label}
              className={`border-b ${i < 2 ? "md:border-r" : "md:border-r"} border-line px-6 py-7 group hover:bg-panel/60 transition-colors`}
            >
              <p className="font-display text-4xl sm:text-5xl font-bold text-beige">
                {n}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-beige-dim group-hover:text-crimson transition-colors">
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ————————————————————— Ticker ————————————————————— */

function Ticker() {
  const words = ["DIPLOMACY", "DEBATE", "NEGOTIATION", "RESOLUTION", "CAUCUS", "CONSENSUS"];
  const row = [...words, ...words];
  return (
    <div className="overflow-hidden border-y border-line bg-panel py-4 select-none" aria-hidden>
      <div className="marquee-track items-center gap-10">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-10 pr-10">
            {row.map((w, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                <span className="font-display italic text-lg text-beige/80">{w}</span>
                <span className="size-1.5 rotate-45 bg-crimson inline-block" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ————————————————————— About ————————————————————— */

function About() {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28 grid gap-14 lg:grid-cols-[auto_1fr] lg:gap-20">
      <SectionHead
        index="01"
        kicker="The Conference"
        title={
          <>
            A chamber where
            <br />
            the world <em className="italic text-crimson">argues</em><br />
            toward peace.
          </>
        }
      />
      <Reveal delay={0.15} className="max-w-2xl lg:pt-24">
        <p className="text-base sm:text-lg leading-relaxed text-beige-dim">
          SOMUN was founded on a simple conviction — that the students who
          learn to negotiate today will refuse to escalate tomorrow. Over three
          days each October, our committees replicate the pressure, procedure and
          persuasion of the real United Nations, guided by an executive board of
          champion delegates and former secretariat members.
        </p>
        <p className="mt-5 text-base sm:text-lg leading-relaxed text-beige-dim">
          Delegates leave with more than certificates. They leave with a drafted
          resolution they own, friendships across cities and schools, and the rare
          confidence of having defended a position under fire — politely,
          precisely and in perfect parliamentary order.
        </p>
        <ul className="mt-8 space-y-4">
          {[
            ["Authentic UNA-USA procedure", " Formal rolls, moderated caucuses, amendment stacks — nothing is simulated halfway."],
            ["Champion executive boards", "Every board has chaired or topped national circuits; feedback is written and personal."],
            ["Crisis injections & press influence", "The International Press publishes daily verdicts that can move committee dynamics."],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-4 border-b border-line pb-4">
              <ScrollText className="size-4 mt-1 shrink-0 text-crimson" />
              <p className="text-sm leading-relaxed text-beige-dim">
                <span className="text-beige font-medium">{t}</span> —{d}
              </p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

/* ————————————————————— Pillars ————————————————————— */

const PILLARS = [
  {
    icon: Gavel,
    title: "Rigorous Debate",
    body: "Agendas chosen to bite — autonomous weapons, electoral reform, pandemic treaties. No soft topics, no free passes.",
  },
  {
    icon: Globe2,
    title: "Global Perspective",
    body: "Committees span six continents' worth of crises. Delegates argue positions they did not choose — and understand better for it.",
  },
  {
    icon: Users,
    title: "Elite Boards",
    body: "Hand-picked executive boards that keep sessions fast, fair and fierce — with written feedback after every session.",
  },
  {
    icon: Trophy,
    title: "Coveted Awards",
    body: "Best Delegate gavels, delegation trophies and IP laurels — decided transparently against published scoring rubrics.",
  },
];

function Pillars() {
  return (
    <section className="border-t border-line bg-panel/40">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
        <SectionHead
          index="02"
          kicker="Why SOMUN"
          align="center"
          title={
            <>
              Built like a summit.
              <br />
              Run like a <em className="italic text-crimson">statecraft.</em>
            </>
          }
        />
        <div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="bg-ink">
              <div className="group h-full p-8 hover:bg-panel transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <p.icon className="size-7 text-crimson" strokeWidth={1.4} />
                  <span className="font-display italic text-beige-dim/50 text-xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold text-beige">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-beige-dim">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ————————————————————— Committees preview ————————————————————— */

function CommitteePreview({ onNavigate }: { onNavigate: (v: View) => void }) {
  const featured = COMMITTEES.slice(0, 4);
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead
          index="03"
          kicker="The Committees"
          title={
            <>
              Nine chambers,
              <br />
              one <em className="italic text-crimson">charter.</em>
            </>
          }
        />
        <Reveal delay={0.2}>
          <button
            onClick={() => onNavigate("committees")}
            className="group inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-beige-dim hover:text-beige transition-colors pb-2 border-b border-beige/20 hover:border-crimson"
          >
            View all nine
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-px border border-line bg-line md:grid-cols-2">
        {featured.map((c, i) => (
          <Reveal key={c.slug} delay={i * 0.07}>
            <button
              onClick={() => onNavigate("committees")}
              className="h-full w-full text-left bg-ink p-7 sm:p-9 hover:bg-panel transition-colors duration-300 group"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-3xl sm:text-4xl font-bold text-beige group-hover:text-crimson transition-colors">
                  {c.acronym}
                </span>
                <span className="text-[9px] uppercase tracking-[0.3em] text-beige-dim border border-line px-3 py-1.5 mt-1">
                  {c.difficulty}
                </span>
              </div>
              <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-beige-dim leading-relaxed">
                {c.name}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-beige-dim line-clamp-2">
                {c.description}
              </p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-crimson">
                {c.delegates} seats · {c.agendas.length} agendas →
              </p>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ————————————————————— Red quote band ————————————————————— */

function QuoteBand() {
  return (
    <section className="relative overflow-hidden bg-crimson-deep">
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-crimson via-crimson-deep to-crimson/80" />
      <div aria-hidden className="absolute inset-0 opacity-[0.18] mix-blend-multiply">
        <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
      </div>
      <div aria-hidden className="absolute -bottom-28 -left-28 opacity-[0.14] pointer-events-none mix-blend-screen">
        <img src="/images/somun-mark.png" alt="" className="size-[420px] max-w-none" />
      </div>
      <div aria-hidden className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-[0.08]">
        <Quote className="size-96" />
      </div>
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8 py-24 sm:py-32 text-center">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.5em] text-primary-foreground/70">
            The SOMUN Creed
          </p>
          <blockquote className="mt-8 font-display text-3xl sm:text-5xl lg:text-6xl font-semibold italic leading-tight text-primary-foreground">
            “The gavel rewards the prepared,
            <br className="hidden sm:block" /> but history remembers the
            persuasive.”
          </blockquote>
          <p className="mt-8 text-xs uppercase tracking-[0.4em] text-primary-foreground/70">
            — Secretariat Address, Opening Night MMXXV
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ————————————————————— CTA ————————————————————— */

function CTA({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <section className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-32 text-center relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display font-black text-hollow text-[38vw] sm:text-[22vw] leading-none"
      >
        IV
      </div>
      <Reveal className="relative">
        <Landmark className="size-8 mx-auto text-crimson" strokeWidth={1.3} />
        <h2 className="mt-8 font-display font-bold text-beige text-4xl sm:text-6xl lg:text-7xl leading-[1.02]">
          Secure your seat
          <br />
          at the <em className="italic text-crimson">table.</em>
        </h2>
        <p className="mt-6 mx-auto max-w-xl text-base sm:text-lg leading-relaxed text-beige-dim">
          Seats are allotted portfolio-first and close when committees fill — the
          Security Council historically does within ten days. Delegate kits,
          meals and ceremonies are included in every registration.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => onNavigate("register")}
            className="group inline-flex items-center gap-3 bg-crimson hover:bg-crimson-deep text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] px-10 py-5 transition-colors duration-300"
          >
            Register for October '26
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => onNavigate("itinerary")}
            className="inline-flex items-center gap-3 border border-beige/25 hover:border-beige/60 text-beige text-xs font-semibold uppercase tracking-[0.25em] px-10 py-5 transition-colors duration-300"
          >
            View the Itinerary
          </button>
        </div>
      </Reveal>
    </section>
  );
}

/* ————————————————————— Page ————————————————————— */

export function HomeView({ onNavigate }: { onNavigate: (v: View) => void }) {
  return (
    <main>
      <Hero onNavigate={onNavigate} />
      <Ticker />
      <About />
      <Pillars />
      <CommitteePreview onNavigate={onNavigate} />
      <QuoteBand />
      <CTA onNavigate={onNavigate} />
    </main>
  );
}
