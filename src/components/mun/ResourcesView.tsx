"use client";

import { BookMarked, BookOpen, FileText, ScrollText } from "lucide-react";
import { PageWrap, Reveal, SectionHead, SoonStamp } from "./shared";

const RESOURCES = [
  {
    icon: BookOpen,
    no: "01",
    title: "Study Guides",
    desc: "Committee-wise background guides and agenda briefs in depth — everything you need before the first roll call.",
  },
  {
    icon: ScrollText,
    no: "02",
    title: "Rules of Procedure",
    desc: "The SOMUN rules of procedure — motions, precedence and draft-resolution mechanics, the fine print of every chamber.",
  },
  {
    icon: FileText,
    no: "03",
    title: "Position Paper Brief",
    desc: "Format, deadlines and assessment criteria for position papers across all nine committees.",
  },
  {
    icon: BookMarked,
    no: "04",
    title: "Delegate Handbook",
    desc: "Venue maps, dress code, kit details and conference etiquette — your pocket companion for the three days.",
  },
];

export function ResourcesView() {
  return (
    <main>
      <PageWrap>
        <SectionHead
          index="V"
          kicker="Resources · MMXXVI"
          title={
            <>
              Arm yourself with
              <br />
              <em className="italic text-crimson">knowledge.</em>
            </>
          }
          intro="The archive holds every document a delegate needs — study guides, procedure, formats and handbooks. Each release lands here as a downloadable brief, announced the moment it goes live."
        />
        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
            <SoonStamp />
            <span className="text-[10px] uppercase tracking-[0.3em] text-beige-dim">
              the archive opens soon
            </span>
          </div>
        </Reveal>

        {/* ————— the archive shelf ————— */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {RESOURCES.map((r, i) => (
            <Reveal key={r.no} delay={0.06 * i} className="h-full">
              <div className="group relative flex h-full flex-col overflow-hidden border border-line bg-panel/60 p-6 transition-colors duration-500 hover:border-beige/30">
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center border border-line text-crimson transition-colors duration-500 group-hover:border-crimson/50">
                    <r.icon className="size-4" />
                  </span>
                  <span
                    aria-hidden
                    className="select-none font-display italic text-2xl text-beige/15"
                  >
                    {r.no}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold text-beige">
                  {r.title}
                </h3>
                <p className="mt-2.5 grow text-xs leading-relaxed text-beige-dim">{r.desc}</p>
                <div className="mt-6 flex items-center justify-between gap-3 border-t border-dashed border-line pt-4">
                  <span className="text-[8px] font-semibold uppercase tracking-[0.3em] text-beige-dim/70">
                    PDF · coming to this shelf
                  </span>
                  <SoonStamp label="Soon" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* ————— committee study guides index ————— */}
        <Reveal delay={0.12} className="mt-14">
          <div className="relative overflow-hidden border border-line bg-panel/60 p-7 sm:p-9">
            <div aria-hidden className="absolute inset-0 opacity-[0.07]">
              <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="relative">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.4em] text-crimson">
                    Study Guides · IX Chambers
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-beige">
                    One guide per committee, chamber by chamber.
                  </h3>
                </div>
                <SoonStamp />
              </div>
              <ul className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  "UNSC",
                  "DISEC",
                  "UNHRC",
                  "WHO",
                  "UNESCO",
                  "UNCSW",
                  "UNICEF",
                  "AIPPM",
                  "IP",
                ].map((a) => (
                  <li
                    key={a}
                    className="flex items-center justify-between gap-3 border-b border-line/70 pb-2.5"
                  >
                    <span className="text-sm font-semibold tracking-[0.12em] text-beige/90">
                      {a}
                    </span>
                    <span className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.28em] text-beige-dim/70">
                      <span className="size-1 rotate-45 bg-crimson/70" aria-hidden />
                      releasing soon
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-7 max-w-2xl text-xs leading-relaxed text-beige-dim">
                Guides are authored by each committee&apos;s executive board and vetted by the
                secretariat. When a guide goes live, its row above unlocks into a direct download —
                no sign-in, no paywall, just the dossier.
              </p>
            </div>
          </div>
        </Reveal>
      </PageWrap>
    </main>
  );
}
