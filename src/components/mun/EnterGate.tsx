"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";

/* Cinematic entry gate — plays once per browser session, then never again.
   Click ENTER → keyhole flash → the gate splits like chamber doors
   and reveals the site underneath (which mounts & animates live). */

const DOOR_EASE = [0.76, 0, 0.24, 1] as const;

const CORNERS = [
  { cls: "left-5 top-20 sm:left-9 sm:top-24", text: "SOMUN ’26" },
  { cls: "right-5 top-20 sm:right-9 sm:top-24 text-right", text: "Eighth Edition" },
  {
    cls: "left-5 bottom-8 sm:left-9 sm:bottom-10",
    text: "October XVI – XVIII · MMXXVI",
  },
  { cls: "right-5 bottom-8 sm:right-9 sm:bottom-10 text-right", text: "Hyderabad, IN" },
];

function setGatePassed() {
  try {
    sessionStorage.setItem("somun-entered", "1");
  } catch {
    /* private mode — gate simply replays next load */
  }
}

export function EnterGate({
  onReveal,
  onDone,
}: {
  onReveal: () => void;
  onDone: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);

  /* lock scroll while the gate holds the screen */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  /* focus the enter button once the intro settles → keyboard-friendly */
  useEffect(() => {
    const t = window.setTimeout(
      () => btnRef.current?.focus({ preventScroll: true }),
      1700,
    );
    timers.current.push(t);
    const list = timers.current;
    return () => list.forEach((id) => window.clearTimeout(id));
  }, []);

  /* mouse parallax on the crest — desktop only flourish */
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rX = useSpring(useTransform(my, [0, 1], [4.5, -4.5]), {
    stiffness: 60,
    damping: 16,
  });
  const rY = useSpring(useTransform(mx, [0, 1], [-4.5, 4.5]), {
    stiffness: 60,
    damping: 16,
  });
  const onMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (opening) return;
      const r = e.currentTarget.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width);
      my.set((e.clientY - r.top) / r.height);
    },
    [mx, my, opening],
  );

  const handleEnter = useCallback(() => {
    if (opening) return;
    setOpening(true);
    setGatePassed();
    document.body.style.overflow = "";
    onReveal(); // site mounts NOW — its hero animates as the doors part
    timers.current.push(window.setTimeout(onDone, 1550));
  }, [opening, onReveal, onDone]);

  /* shared backdrop, rendered inside each door so it lines up seamlessly */
  const backdrop = (anchorRight: boolean) => (
    <div
      aria-hidden
      className={`absolute inset-y-0 h-full w-screen overflow-hidden ${
        anchorRight ? "right-0" : "left-0"
      }`}
    >
      <motion.div className="absolute inset-0" animate={opening ? undefined : { scale: [1.04, 1.12, 1.04] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}>
        <img
          src="/images/textures/hero-collage.jpg"
          alt=""
          className="h-full w-full object-cover opacity-[0.14] mix-blend-screen [filter:grayscale(35%)_sepia(25%)]"
        />
      </motion.div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(13,10,8,0.78)_72%,rgba(13,10,8,0.97)_100%)]" />
      {/* soft dark edge along the seam for a motion-blur feel while parting */}
      <div
        className={`absolute inset-y-0 w-28 ${anchorRight ? "left-0 bg-gradient-to-r from-ink/70 to-transparent" : "right-0 bg-gradient-to-l from-ink/70 to-transparent"}`}
      />
    </div>
  );

  return (
    <motion.section
      onMouseMove={onMove}
      aria-label="Entrance"
      className="fixed inset-0 z-[80] select-none overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 1 }}
    >
      {/* —— the two doors —— */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 left-0 z-10 w-1/2 overflow-hidden bg-ink"
        initial={false}
        animate={opening ? { x: "-102%" } : { x: 0 }}
        transition={{ duration: 1.15, delay: 0.2, ease: DOOR_EASE }}
      >
        {backdrop(false)}
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute inset-y-0 right-0 z-10 w-1/2 overflow-hidden bg-ink"
        initial={false}
        animate={opening ? { x: "102%" } : { x: 0 }}
        transition={{ duration: 1.15, delay: 0.2, ease: DOOR_EASE }}
      >
        {backdrop(true)}
      </motion.div>

      {/* faint travelling sheen across the doors */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-y-6 z-[12] w-[38vw]"
        style={{
          left: "-40vw",
          background:
            "linear-gradient(105deg, transparent 0%, rgba(236,225,203,0.05) 45%, rgba(236,225,203,0.085) 50%, rgba(236,225,203,0.05) 55%, transparent 100%)",
        }}
        initial={{ x: 0 }}
        animate={opening ? undefined : { x: ["0vw", "185vw"] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
      />

      {/* keyhole beam — ignites down the seam at the moment of entry */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-30 w-[3px]"
        style={{ left: "calc(50% - 1.5px)" }}
      >
        <motion.div
          className="h-full w-full origin-center bg-crimson"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={
            opening
              ? {
                  scaleY: [0, 1, 1, 1],
                  opacity: [0, 1, 0.9, 0],
                  boxShadow: [
                    "0px 0px 0px 0px rgba(200,16,46,0)",
                    "0px 0px 90px 26px rgba(200,16,46,0.65)",
                    "0px 0px 140px 40px rgba(200,16,46,0.45)",
                    "0px 0px 0px 0px rgba(200,16,46,0)",
                  ],
                }
              : { scaleY: 0 }
          }
          transition={
            opening
              ? { duration: 1.15, times: [0, 0.3, 0.55, 1], ease: "easeInOut" }
              : undefined
          }
        />
      </div>

      {/* shutter flash for punch */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-40 bg-beige"
        initial={{ opacity: 0 }}
        animate={opening ? { opacity: [0, 0.07, 0] } : { opacity: 0 }}
        transition={opening ? { duration: 0.32, times: [0, 0.3, 1] } : undefined}
      />

      {/* —— content layer (crest, copy, ENTER control, frame) —— */}
      <motion.div
        className="relative z-20 grid h-full place-items-center px-5"
        initial={{ opacity: 1, scale: 1 }}
        animate={
          opening
            ? { opacity: 0, scale: 1.09, filter: "blur(10px)" }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
        }
        transition={
          opening
            ? { duration: 0.42, ease: [0.64, 0, 0.78, 0] }
            : undefined
        }
      >
        {/* hairline frame + corner metas */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 inset-y-14 border border-line/90 sm:inset-x-7 sm:inset-y-16"
          initial={{ opacity: 0 }}
          animate={opening ? undefined : { opacity: 1 }}
          transition={{ duration: 1.4, delay: 0.55 }}
        >
          {[0.18, 0.82].map((x) =>
            [0.35, 0.65].map((y) => (
              <span
                key={`${x}-${y}`}
                className="absolute size-[5px] rotate-45 bg-crimson/70"
                style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: "translate(-50%,-50%) rotate(45deg)" }}
              />
            )),
          )}
        </motion.div>

        {CORNERS.map((c, i) => (
          <motion.span
            key={c.text}
            aria-hidden
            className={`pointer-events-none absolute hidden text-[9px] uppercase tracking-[0.4em] text-beige-dim/90 sm:block ${c.cls}`}
            initial={{ opacity: 0, y: 6 }}
            animate={opening ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.75 + i * 0.09 }}
          >
            {c.text}
          </motion.span>
        ))}

        <div className="flex flex-col items-center pt-6">
          {/* kicker */}
          <motion.p
            className="text-center text-[9px] font-medium uppercase tracking-[0.55em] text-crimson sm:text-[10px]"
            initial={{ letterSpacing: "1.1em", opacity: 0 }}
            animate={opening ? undefined : { letterSpacing: "0.55em", opacity: 1 }}
            transition={{ duration: 1.3, delay: 0.2, ease: "easeOut" }}
          >
            The Secretariat invites you to
          </motion.p>

          {/* crest with parallax tilt + breathing glow */}
          <div style={{ perspective: 650 }} className="mt-9 sm:mt-11">
            <motion.div
              style={{ rotateX: rX, rotateY: rY, transformStyle: "preserve-3d" }}
              className="relative flex flex-col items-center"
            >
              <motion.span
                aria-hidden
                className="absolute -inset-12 rounded-full bg-crimson/20 blur-3xl"
                initial={{ opacity: 0 }}
                animate={opening ? undefined : { opacity: [0.35, 0.62, 0.35] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.img
                src="/images/somun-mark.png"
                alt="SOMUN — Model United Nations"
                className="relative size-36 object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)] mix-blend-screen sm:size-44 lg:size-48"
                initial={{ y: 34, opacity: 0, filter: "blur(14px)", scale: 0.94 }}
                animate={
                  opening
                    ? { y: 34, opacity: 0 }
                    : { y: 0, opacity: 1, filter: "blur(0px)", scale: 1 }
                }
                transition={{ duration: 1.15, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />

              {/* fleuron divider */}
              <motion.div
                className="relative mt-7 flex items-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={opening ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.95 }}
              >
                <span className="h-px w-14 bg-gradient-to-l from-transparent via-crimson/70 to-crimson/70 sm:w-20" />
                <span className="size-[5px] rotate-45 bg-crimson" />
                <span className="h-px w-14 bg-gradient-to-r from-transparent via-crimson/70 to-crimson/70 sm:w-20" />
              </motion.div>

              <motion.h1
                className="relative mt-6 text-center font-sans text-[11px] font-medium uppercase tracking-[0.48em] text-beige sm:text-sm sm:tracking-[0.56em]"
                initial={{ opacity: 0, y: 14 }}
                animate={opening ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.08 }}
              >
                Model United Nations
                <span className="mt-2 block text-[9px] tracking-[0.52em] text-beige-dim sm:text-[10px] sm:tracking-[0.6em]">
                  Hyderabad · October ’26
                </span>
              </motion.h1>
            </motion.div>
          </div>

          {/* ENTER control */}
          <motion.button
            ref={btnRef}
            type="button"
            onClick={handleEnter}
            aria-label="Enter the SOMUN website"
            className="group relative mt-10 grid size-32 cursor-pointer place-items-center outline-none sm:size-36"
            initial={{ opacity: 0, y: 22 }}
            animate={opening ? { opacity: 0, y: 22 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 1.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* hover bloom */}
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 -z-10 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-crimson/30 blur-2xl transition-transform duration-700 group-hover:scale-[1.9]"
            />
            {/* rotating word ring */}
            <svg
              viewBox="0 0 200 200"
              aria-hidden
              className="spin-slower absolute inset-0 size-full transition-opacity group-hover:opacity-100"
            >
              <defs>
                <path
                  id="gate-ring-path"
                  d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0"
                />
              </defs>
              <text className="fill-beige-dim font-sans uppercase" fontSize="12" letterSpacing="3">
                <textPath href="#gate-ring-path" textLength="487">
                  Take your seat · The chamber awaits ·
                </textPath>
              </text>
            </svg>
            {/* counter-spinning dashed ring */}
            <span
              aria-hidden
              className="spin-reverse absolute inset-[20px] rounded-full border border-dashed border-crimson/45 sm:inset-6"
            />
            {/* core disc */}
            <span className="grid size-[74px] place-items-center rounded-full border border-beige/20 bg-panel shadow-[inset_0_0_22px_rgba(0,0,0,0.55)] transition-all duration-500 group-hover:border-crimson group-hover:bg-crimson group-focus-visible:border-crimson sm:size-[86px]">
              <ArrowRight className="size-6 text-beige transition-all duration-500 group-hover:translate-x-1 group-hover:text-white sm:size-7" />
            </span>
            <span className="sr-only">Enter</span>
          </motion.button>

          <motion.p
            aria-hidden
            className="mt-5 flex items-baseline gap-2 font-display text-lg font-bold uppercase tracking-[0.3em] text-beige sm:text-xl"
            initial={{ opacity: 0 }}
            animate={opening ? undefined : { opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.55 }}
          >
            Enter<span className="animate-pulse text-crimson">_</span>
          </motion.p>

          <motion.p
            className="mt-3 text-[9px] uppercase tracking-[0.34em] text-beige-dim/70"
            initial={{ opacity: 0 }}
            animate={opening ? undefined : { opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.8 }}
          >
            Press the seal to open the chamber
          </motion.p>
        </div>
      </motion.div>
    </motion.section>
  );
}
