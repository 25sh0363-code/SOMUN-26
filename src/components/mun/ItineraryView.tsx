"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Clock, Coffee, Flag, Gavel, PartyPopper } from "lucide-react";
import { CONFERENCE, ITINERARY, type DaySchedule } from "./data";
import { PageWrap, Reveal, SectionHead } from "./shared";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  DaySchedule["events"][number]["type"],
  { label: string; cls: string; icon: typeof Gavel }
> = {
  ceremony: { label: "Ceremony", cls: "bg-crimson text-primary-foreground", icon: Flag },
  session: { label: "Committee Session", cls: "border border-beige/35 text-beige", icon: Gavel },
  break: { label: "Meal / Break", cls: "border border-line text-beige-dim", icon: Coffee },
  social: { label: "Socials & Press", cls: "bg-panel-2 text-beige border border-crimson/40", icon: PartyPopper },
};

export function ItineraryView() {
  const [dayIdx, setDayIdx] = useState(0);
  const day = ITINERARY[dayIdx];

  return (
    <main>
      <PageWrap>
        <SectionHead
          index="III"
          kicker="Itinerary · Oct 16–18"
          title={
            <>
              Three days,
              <br />
              choreographed to the <em className="italic text-crimson">minute.</em>
            </>
          }
          intro={`From the first roll call to the final gavel — everything at ${CONFERENCE.venue}. Delegates receive the printed programme in their kits on Day One.`}
        />

        {/* day tabs */}
        <Reveal delay={0.1} className="mt-12">
          <div className="grid sm:grid-cols-3 border border-line" role="tablist" aria-label="Conference days">
            {ITINERARY.map((d, i) => (
              <button
                key={d.day}
                role="tab"
                aria-selected={dayIdx === i}
                onClick={() => setDayIdx(i)}
                className={cn(
                  "relative text-left px-6 py-5 transition-colors duration-300 min-h-[44px]",
                  dayIdx === i ? "bg-crimson" : "hover:bg-panel",
                  i > 0 && "sm:border-l border-line",
                  dayIdx !== i && "border-t sm:border-t-0 border-line"
                )}
              >
                <span
                  className={cn(
                    "block font-display italic text-lg leading-none",
                    dayIdx === i ? "text-primary-foreground" : "text-beige"
                  )}
                >
                  {d.day}
                </span>
                <span
                  className={cn(
                    "mt-2 block text-[9px] uppercase tracking-[0.3em]",
                    dayIdx === i ? "text-primary-foreground/75" : "text-beige-dim"
                  )}
                >
                  {d.weekday} · {d.date}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* timeline */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_320px] items-start">
          <AnimatePresence mode="wait">
            <motion.ol
              key={day.day}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative border-l border-line ml-2 space-y-8 pb-4"
              aria-label={`${day.day} schedule`}
            >
              {day.events.map((e, i) => {
                const meta = TYPE_META[e.type];
                return (
                  <motion.li
                    key={e.time + e.title}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: i * 0.06 }}
                    className="relative pl-10 group"
                  >
                    {/* node */}
                    <span
                      className={cn(
                        "absolute -left-[5px] top-1.5 size-2.5 rotate-45 border border-crimson bg-ink group-hover:bg-crimson transition-colors"
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className="inline-flex items-center gap-2 font-display text-2xl font-semibold text-beige tabular-nums">
                        <Clock className="size-4 text-crimson" />
                        {e.time}
                      </span>
                      <span
                        className={cn(
                          "px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.28em]",
                          meta.cls
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="mt-2.5 font-display text-xl sm:text-2xl font-semibold text-beige/95">
                      {e.title}
                    </h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-beige-dim">{e.detail}</p>
                  </motion.li>
                );
              })}
            </motion.ol>
          </AnimatePresence>

          {/* side notes */}
          <Reveal delay={0.15} className="space-y-6 lg:sticky lg:top-28">
            <div className="border border-line bg-panel/60 p-7">
              <h3 className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
                <CalendarDays className="size-4 text-crimson" /> Protocol Notes
              </h3>
              <ul className="mt-5 space-y-4 text-sm leading-relaxed text-beige-dim">
                <li className="flex gap-3">
                  <span className="mt-2 size-1 shrink-0 rotate-45 bg-crimson" />
                  Western business attire is mandatory for all sessions; badges must be worn at all times inside the venue.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 size-1 shrink-0 rotate-45 bg-crimson" />
                  Crisis updates and IP bulletins drop without notice — staying plugged in is part of the game.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 size-1 shrink-0 rotate-45 bg-crimson" />
                  Country policy documents are permitted; pre-written resolutions are grounds for disqualification.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 size-1 shrink-0 rotate-45 bg-crimson" />
                  Meals listed on this itinerary are included with every delegate pass.
                </li>
              </ul>
            </div>

            <div className="border border-crimson/50 bg-crimson-deep/20 p-7">
              <p className="font-display italic text-xl text-beige leading-snug">
                “Be early. The doors close exactly when the gavel says so.”
              </p>
              <p className="mt-3 text-[9px] uppercase tracking-[0.35em] text-beige-dim">
                — Under-Secretary-General, Procedure
              </p>
            </div>
          </Reveal>
        </div>
      </PageWrap>
    </main>
  );
}
