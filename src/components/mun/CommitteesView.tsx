"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  type Variants,
} from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Lock, MoveDown, Users } from "lucide-react";
import { COMMITTEES, COMMITTEE_ART, type Difficulty } from "./data";
import { PageWrap, Reveal, SectionHead, SoonStamp } from "./shared";
import type { View } from "./types";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

const STAMP_STYLES: Record<Difficulty, string> = {
  Beginner: "border-beige/25 text-beige-dim",
  Intermediate: "border-beige/50 text-beige",
  Advanced: "border-crimson text-crimson bg-crimson/10",
};

/* staggered entrance choreography — each dossier reveals piece by piece
   the moment it takes the stage */
const panelVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.085, delayChildren: 0.08 } },
};
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 64, rotateY: 7, rotateZ: -0.6 },
  show: {
    opacity: 1,
    y: 0,
    rotateY: 0,
    rotateZ: 0,
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};
const artVariants: Variants = {
  hidden: { opacity: 0, scale: 1.08 },
  show: { opacity: 1, scale: 1, transition: { duration: 1.05, ease: [0.22, 1, 0.36, 1] } },
};
const figureVariants: Variants = {
  hidden: { opacity: 0, y: 42 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

/* filigree corner for the dossier frame */
function Corner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn("pointer-events-none absolute size-9 text-beige/30", className)}
    >
      <path d="M2 46 V14 Q2 2 14 2 H46" stroke="currentColor" strokeWidth="2" />
      <path d="M10 46 V20 Q10 10 20 10 H46" stroke="currentColor" strokeWidth="0.75" />
      <rect x="15.5" y="15.5" width="6" height="6" transform="rotate(45 18.5 18.5)" fill="currentColor" />
    </svg>
  );
}

/* wax seal medallion bearing the chamber numeral */
function WaxSeal({ numeral }: { numeral: string }) {
  return (
    <motion.div
      variants={itemVariants}
      className="absolute -top-7 left-7 sm:left-10 z-20 rotate-[-7deg]"
      aria-hidden
    >
      <div className="relative size-14 sm:size-16 rounded-full bg-[radial-gradient(circle_at_32%_28%,#e2485c,#c8102e_52%,#75091c_100%)] shadow-[0_12px_28px_rgba(200,16,46,0.4),inset_0_2px_6px_rgba(255,255,255,0.25)] flex items-center justify-center">
        <span className="absolute inset-1.5 rounded-full border border-primary-foreground/30" />
        <span className="absolute inset-3 rounded-full border border-primary-foreground/15" />
        <span className="font-display italic font-semibold text-primary-foreground text-lg sm:text-xl drop-shadow-sm">
          {numeral}
        </span>
      </div>
    </motion.div>
  );
}

export function CommitteesView({ onNavigate }: { onNavigate: (v: View) => void }) {
  const n = COMMITTEES.length;

  /* ————— pinned deck state ————— */
  const sectionRef = useRef<HTMLElement | null>(null);
  const [current, setCurrent] = useState(0);
  const activeIdx = useRef(0);
  const x = useMotionValue(0);

  /* glide to the requested chamber with a spring — one slide per gesture */
  const snapTo = useCallback(
    (idx: number) => {
      activeIdx.current = idx;
      animate(x, -idx * window.innerWidth, {
        type: "spring",
        stiffness: 110,
        damping: 24,
        mass: 0.9,
      });
    },
    [x]
  );

  /* vertical runway for one unhurried step per chamber */
  const scrollLength = Math.max(280, n * 78);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const clamped = Math.min(0.99999, Math.max(0, v));
    const target = Math.round(clamped * (n - 1));
    setCurrent(target);
    if (target !== activeIdx.current) snapTo(target);
  });

  /* viewport resized → re-anchor the active chamber to the new width,
     otherwise the deck lands between two panels */
  useEffect(() => {
    const onResize = () => {
      x.jump(-activeIdx.current * window.innerWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [x]);

  /* jump to a chamber by scrolling the runway (rail + chevrons) */
  const goTo = (idx: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const i = Math.min(n - 1, Math.max(0, idx));
    const top = el.offsetTop + (i / (n - 1)) * (el.offsetHeight - window.innerHeight);
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <main>
      <PageWrap>
        {/* header */}
        <SectionHead
          index="II"
          kicker="Committees · MMXXVI"
          title={
            <>
              Choose your <em className="italic text-crimson">arena.</em>
            </>
          }
          intro="Nine chambers of the United Nations system and India's political theatre, catalogued as a gallery of dossiers — one on stage at a time. Scroll, and each takes its turn; every portfolio is allotted after preference review by the secretariat."
        />
        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-beige-dim">
            <span className="inline-flex items-center gap-2">
              scroll to advance
              <MoveDown className="size-4 text-crimson" />
            </span>
            <span className="h-px w-10 bg-line" aria-hidden />
            <span>or leaf through with the numerals below</span>
          </div>
        </Reveal>
      </PageWrap>

      {/* ————— pinned deck: one dossier on stage at a time ————— */}
      <section
        ref={sectionRef}
        className="relative"
        style={{ height: `${scrollLength}vh` }}
        aria-label="Committees deck"
      >
        <div className="sticky top-0 flex h-screen flex-col overflow-hidden">
          {/* atmospheric backdrop — secretariat archive collage */}
          <div aria-hidden className="absolute inset-0">
            <img
              src="/images/textures/hero-collage.jpg"
              alt=""
              className="h-full w-full object-cover opacity-[0.07] grayscale-[45%] blur-[2px] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
          </div>

          {/* progress rail */}
          <div className="relative z-20 shrink-0 mx-auto w-full max-w-7xl px-5 sm:px-8 pt-[76px] pb-3 sm:pt-24 sm:pb-4 flex items-center gap-5">
            <span className="font-display italic text-2xl text-beige tabular-nums w-10 text-left">
              {String(current + 1).padStart(2, "0")}
            </span>
            <div className="relative h-px grow bg-line">
              <motion.div
                aria-hidden
                className="absolute top-[-1px] h-[3px] bg-crimson origin-left"
                animate={{ width: `${((current + 1) / n) * 100}%` }}
                transition={{ type: "spring", stiffness: 140, damping: 26 }}
                style={{ width: `${((current + 1) / n) * 100}%` }}
              />
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-beige-dim tabular-nums whitespace-nowrap">
              / {String(n).padStart(2, "0")} chambers
            </span>
          </div>

          {/* sliding viewport */}
          <div className="relative z-10 grow overflow-hidden">
            <motion.div style={{ x }} className="flex h-full will-change-transform">
              {COMMITTEES.map((c, i) => {
                const art = COMMITTEE_ART[c.slug];
                return (
                  <article
                    key={c.slug}
                    aria-hidden={i !== current}
                    inert={i !== current ? true : undefined}
                    className="relative h-full w-full shrink-0 px-3.5 sm:px-8 lg:px-12"
                  >
                    {/* giant hollow acronym watermark behind the card —
                        dims while off-stage so mid-slide seams stay ink-clean */}
                    <motion.div
                      aria-hidden
                      className="pointer-events-none select-none absolute inset-0 flex items-center justify-center"
                      initial={false}
                      animate={{ opacity: i === current ? 1 : 0.14 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <span className="text-hollow font-display font-black italic leading-none text-[34vw] lg:text-[24rem]">
                        {c.acronym}
                      </span>
                    </motion.div>

                    {/* seam vignettes — panels melt into ink at their edges */}
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-16 sm:w-36 bg-gradient-to-r from-ink via-ink/60 to-transparent"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-16 sm:w-36 bg-gradient-to-l from-ink via-ink/60 to-transparent"
                    />

                    <div className="relative z-10 mx-auto flex h-full max-w-6xl items-center">
                      {/* ——— THE DOSSIER CARD ——— */}
                      <motion.div
                        variants={panelVariants}
                        initial="hidden"
                        whileInView="show"
                        viewport={{ amount: 0.3 }}
                        className="relative w-full lg:h-[min(66vh,620px)] border border-beige/20 bg-[linear-gradient(160deg,rgba(30,23,18,0.96),rgba(13,10,8,0.97))] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)]"
                      >
                        <WaxSeal numeral={ROMAN[i]} />
                        <Corner className="-top-2 -left-2" />
                        <Corner className="-top-2 -right-2 -scale-x-100" />
                        <Corner className="-bottom-2 -left-2 -scale-y-100" />
                        <Corner className="-bottom-2 -right-2 -scale-100" />
                        <div aria-hidden className="pointer-events-none absolute inset-2 border border-crimson/20" />

                        <div className="grid grid-rows-[auto_auto] lg:h-full lg:grid-cols-[0.95fr_1.05fr] lg:grid-rows-1">
                          {/* ——— plate: the artwork ——— */}
                          <div className="relative h-44 sm:h-52 lg:h-auto overflow-hidden border-b border-dashed border-beige/20 lg:border-b-0 lg:border-r-2 min-h-0">
                            <motion.img
                              variants={artVariants}
                              src={art.photo}
                              alt={`${c.acronym} — ${c.name}`}
                              className="absolute inset-0 h-full w-full object-cover [filter:grayscale(0.22)_sepia(0.14)_contrast(1.06)]"
                              loading={i <= 1 ? "eager" : "lazy"}
                            />
                            <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-transparent to-ink/20" />
                            <div aria-hidden className="pointer-events-none absolute inset-0 bg-crimson/10 mix-blend-multiply" />
                            {art.figure && (
                              <motion.img
                                variants={figureVariants}
                                src={art.figure}
                                alt=""
                                aria-hidden
                                className="absolute bottom-0 right-0 h-[92%] object-contain drop-shadow-[0_24px_40px_rgba(0,0,0,0.65)]"
                              />
                            )}
                            {/* plate caption */}
                            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-4">
                              <p className="max-w-[75%] text-[8px] sm:text-[9px] uppercase tracking-[0.22em] leading-relaxed text-beige/70">
                                {art.credit}
                              </p>
                              <span className="font-display italic text-2xl sm:text-3xl text-beige/30 select-none">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                            </div>
                          </div>

                          {/* ——— particulars: the details ——— */}
                          <div className="relative flex min-h-0 flex-col justify-center p-4 sm:p-7 lg:p-9">
                            <div className="flex min-h-0 flex-col lg:max-w-xl">
                              <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.35em] text-crimson">
                                  Dossier Nº {ROMAN[i]}
                                </p>
                                <span
                                  className={cn(
                                    "rotate-[-2deg] border px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.3em]",
                                    STAMP_STYLES[c.difficulty]
                                  )}
                                >
                                  {c.difficulty}
                                </span>
                              </motion.div>

                              <motion.h3
                                variants={itemVariants}
                                className="mt-2 font-display text-4xl font-bold leading-none text-beige sm:text-6xl lg:text-7xl"
                              >
                                {c.acronym}
                              </motion.h3>

                              <motion.p
                                variants={itemVariants}
                                className="mt-2.5 text-[9px] sm:text-[11px] uppercase tracking-[0.2em] leading-relaxed text-beige-dim"
                              >
                                {c.name}
                              </motion.p>

                              {/* fleuron rule */}
                              <motion.div variants={itemVariants} className="mt-4 hidden sm:flex items-center gap-3" aria-hidden>
                                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-beige/25" />
                                <span className="size-1.5 rotate-45 bg-crimson" />
                                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-beige/25" />
                              </motion.div>

                              <motion.p
                                variants={itemVariants}
                                className="mt-3 line-clamp-3 lg:line-clamp-4 shrink-0 text-[13px] sm:text-sm leading-relaxed text-beige-dim"
                              >
                                {c.description}
                              </motion.p>

                              <motion.div variants={itemVariants} className="mt-3.5 sm:mt-4 space-y-1.5 sm:space-y-2.5">
                                <p className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.35em] text-crimson">
                                  Before the house
                                </p>
                                {c.agendas.map((a, ai) => (
                                  <p key={ai} className="flex gap-3 text-[13px] sm:text-sm leading-relaxed text-beige/90">
                                    <span className="mt-[7px] size-1.5 shrink-0 rotate-45 bg-crimson/80" aria-hidden />
                                    {a}
                                  </p>
                                ))}
                              </motion.div>

                              <motion.div variants={itemVariants} className="mt-auto pt-3.5 sm:pt-6">
                                <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3">
                                  <span className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-beige-dim">
                                    <Users className="size-3.5" />
                                    {c.delegates} delegations
                                  </span>
                                  <button
                                    onClick={() => onNavigate("register")}
                                    className="group/btn relative overflow-hidden border border-beige/25 px-4 py-2.5 sm:px-5 sm:py-3 text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-beige transition-colors duration-500 hover:border-crimson"
                                    aria-label={`Register for ${c.acronym}`}
                                  >
                                    <span
                                      aria-hidden
                                      className="absolute inset-0 -translate-x-full bg-crimson transition-transform duration-500 ease-out group-hover/btn:translate-x-0"
                                    />
                                    <span className="relative inline-flex items-center gap-2 whitespace-nowrap">
                                      Take the seat
                                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                                    </span>
                                  </button>
                                </div>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </article>
                );
              })}
            </motion.div>
          </div>

          {/* numeral rail + chevrons */}
          <div className="relative z-20 shrink-0 pb-4 sm:pb-6 pt-1">
            <div className="mx-auto flex max-w-fit items-center gap-0.5 sm:gap-1.5 px-3">
              <button
                onClick={() => goTo(current - 1)}
                disabled={current === 0}
                aria-label="Previous committee"
                className="inline-flex size-8 sm:size-10 items-center justify-center border border-line text-beige-dim hover:text-beige hover:border-beige/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="size-4" />
              </button>
              {ROMAN.slice(0, n).map((r, i) => (
                <button
                  key={r}
                  onClick={() => goTo(i)}
                  aria-label={`Go to committee ${i + 1}`}
                  aria-current={current === i}
                  className={cn(
                    "relative min-w-[26px] sm:min-w-[38px] min-h-[38px] sm:min-h-[44px] px-1 font-display italic text-[10px] sm:text-sm transition-all duration-300",
                    current === i ? "text-crimson scale-110" : "text-beige-dim/50 hover:text-beige"
                  )}
                >
                  {r}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-1/2 -translate-x-1/2 bottom-1 size-1 rotate-45 bg-crimson transition-opacity duration-300",
                      current === i ? "opacity-100" : "opacity-0"
                    )}
                  />
                </button>
              ))}
              <button
                onClick={() => goTo(current + 1)}
                disabled={current === n - 1}
                aria-label="Next committee"
                className="inline-flex size-8 sm:size-10 items-center justify-center border border-line text-beige-dim hover:text-beige hover:border-beige/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* edge fades */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-ink to-transparent" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-ink to-transparent" />
        </div>
      </section>

      {/* ————— executive boards: releasing soon ————— */}
      <PageWrap>
        <section aria-label="Executive boards">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <div className="flex items-center gap-4">
                  <span className="h-px w-10 bg-crimson/70" aria-hidden />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-beige-dim">
                    Executive Boards · IX Chambers
                  </p>
                </div>
                <h2 className="mt-4 font-display font-bold text-beige leading-[1.05] text-3xl sm:text-4xl lg:text-5xl">
                  Meet the chairs, <em className="italic text-crimson">soon.</em>
                </h2>
                <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-beige-dim">
                  Every chamber is run by a three-member executive board. Chair, vice chair and
                  committee secretary — the full line-up is being finalised and will be unveiled
                  chamber by chamber.
                </p>
              </div>
              <SoonStamp />
            </div>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {COMMITTEES.map((c, i) => (
              <Reveal key={c.slug} delay={0.04 * i} className="h-full">
                <div className="relative h-full overflow-hidden border border-line bg-panel/60 p-6 transition-colors duration-500 hover:border-beige/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-beige">{c.acronym}</h3>
                      <p className="mt-1.5 max-w-[26ch] text-[9px] uppercase leading-relaxed tracking-[0.18em] text-beige-dim">
                        {c.name}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="select-none font-display text-2xl italic text-beige/15"
                    >
                      {ROMAN[i]}
                    </span>
                  </div>
                  <div className="mt-5 h-px bg-line" aria-hidden />
                  <ul className="mt-5 space-y-3">
                    {["Chair", "Vice Chair", "Secretary"].map((role) => (
                      <li key={role} className="flex items-center justify-between gap-3">
                        <span className="text-[10px] uppercase tracking-[0.25em] text-beige/80">
                          {role}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-beige-dim/70">
                          <Lock className="size-3 text-crimson/70" aria-hidden />
                          to be announced
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </PageWrap>

      {/* bottom note */}
      <PageWrap>
        <Reveal delay={0.1} className="mt-16 relative overflow-hidden border border-line bg-panel/60 p-7 sm:p-9 grid gap-6 sm:grid-cols-[auto_1fr] items-start">
          <div aria-hidden className="absolute inset-0 opacity-[0.08]">
            <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <span className="relative font-display italic text-5xl text-crimson leading-none">§</span>
          <div className="relative">
            <h3 className="font-display text-xl font-semibold text-beige">
              Not sure which chamber suits you?
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-beige-dim">
              First-timers are strongest in UNICEF, WHO or UNESCO where procedure is taught live; seasoned delegates
              should aim at UNSC or AIPPM, where crisis updates arrive without warning. Every applicant submits three
              committee preferences — the secretariat matches portfolios to keep competition balanced. Questions? Write
              to us any time before allocations are published.
            </p>
          </div>
        </Reveal>
      </PageWrap>
    </main>
  );
}
