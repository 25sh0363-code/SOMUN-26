"use client";

import { Lock, Mail } from "lucide-react";
import { CONFERENCE } from "./data";
import { PageWrap, Reveal, SectionHead, SoonStamp } from "./shared";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const CORE_SEATS = 7;
const USG_SEATS = 6;

export function SecretariatView() {
  return (
    <main>
      <PageWrap>
        <SectionHead
          index="III"
          kicker="Secretariat · MMXXVI"
          title={
            <>
              The hands behind
              <br />
              the <em className="italic text-crimson">gavel.</em>
            </>
          }
          intro={`Every SOMUN edition is steered by a core secretariat of seven, backed by a corps of Under-Secretaries-General. The Eighth Secretariat is already at work — names, faces and portfolios will be unveiled right here, seat by seat.`}
        />
        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
            <SoonStamp />
            <span className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
              announcements begin shortly
            </span>
          </div>
        </Reveal>
      </PageWrap>

      {/* ————— the core seven ————— */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-20 sm:pb-24" aria-label="The core seven">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-crimson/70" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-beige-dim">
                  The Core · VII Seats
                </p>
              </div>
              <h2 className="mt-4 font-display font-bold text-beige leading-[1.05] text-3xl sm:text-4xl lg:text-5xl">
                Seven seats, <em className="italic text-crimson">one gavel.</em>
              </h2>
            </div>
            <SoonStamp />
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: CORE_SEATS }, (_, i) => (
            <Reveal key={ROMAN[i]} delay={0.05 * i} className="h-full">
              <div className="group relative h-full overflow-hidden border border-line bg-panel/60 p-6 transition-colors duration-500 hover:border-beige/30">
                {/* watermark numeral */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -bottom-5 -right-1 select-none font-display italic text-8xl leading-none text-beige/5 transition-colors duration-500 group-hover:text-beige/10"
                >
                  {ROMAN[i]}
                </span>
                <span className="inline-flex size-10 items-center justify-center border border-line text-crimson transition-colors duration-500 group-hover:border-crimson/50">
                  <Lock className="size-4" />
                </span>
                <p className="mt-6 text-[9px] font-semibold uppercase tracking-[0.35em] text-crimson">
                  Seat {ROMAN[i]}
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-beige/90">
                  To be announced
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-beige-dim">
                  Revealed with the first secretariat release.
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————— the USG corps ————— */}
      <section className="mx-auto max-w-7xl px-5 sm:px-8 pb-20 sm:pb-24" aria-label="Under-Secretaries-General">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-4">
                <span className="h-px w-10 bg-crimson/70" aria-hidden />
                <p className="text-[10px] font-semibold uppercase tracking-[0.45em] text-beige-dim">
                  The Corps · USGs
                </p>
              </div>
              <h2 className="mt-4 font-display font-bold text-beige leading-[1.05] text-3xl sm:text-4xl">
                The machinery behind <em className="italic text-crimson">every session.</em>
              </h2>
            </div>
            <SoonStamp />
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {Array.from({ length: USG_SEATS }, (_, i) => (
            <Reveal key={i} delay={0.05 * i} className="h-full">
              <div className="group relative h-full overflow-hidden border border-line bg-panel/60 p-6 transition-colors duration-500 hover:border-beige/30">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center border border-line text-crimson transition-colors duration-500 group-hover:border-crimson/50">
                    <Lock className="size-4" />
                  </span>
                  <span
                    aria-hidden
                    className="select-none font-display italic text-2xl text-beige/15"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.35em] text-crimson">
                  Under-Secretary-General
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-beige/90">
                  Portfolio to be announced
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-beige-dim">
                  Delegation affairs, procedure, press, logistics and more.
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ————— closing note ————— */}
      <PageWrap>
        <Reveal
          delay={0.1}
          className="relative grid items-start gap-6 overflow-hidden border border-line bg-panel/60 p-7 sm:grid-cols-[auto_1fr] sm:p-9"
        >
          <div aria-hidden className="absolute inset-0 opacity-[0.08]">
            <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
          </div>
          <span className="relative font-display text-5xl italic leading-none text-crimson">§</span>
          <div className="relative">
            <p className="max-w-3xl font-display text-xl italic leading-snug text-beige">
              “The Eighth Secretariat is already at work — agendas, background guides and the
              machinery of diplomacy are being built for you.”
            </p>
            <p className="mt-4 text-[9px] uppercase tracking-[0.35em] text-beige-dim">
              — The SOMUN Secretariat
            </p>
            <a
              href={`mailto:${CONFERENCE.email}`}
              className="mt-6 inline-flex items-center gap-2.5 border border-beige/25 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-beige transition-colors duration-500 hover:border-crimson hover:text-beige"
            >
              <Mail className="size-3.5 text-crimson" />
              Write to the secretariat
            </a>
          </div>
        </Reveal>
      </PageWrap>
    </main>
  );
}
