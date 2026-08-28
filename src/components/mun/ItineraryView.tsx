"use client";

import { CalendarClock } from "lucide-react";
import { CONFERENCE } from "./data";
import { PageWrap, Reveal, SectionHead, SoonStamp } from "./shared";

export function ItineraryView() {
  return (
    <main>
      <PageWrap>
        <SectionHead
          index="IV"
          kicker="Itinerary · Oct 16–18"
          title={
            <>
              Three days,
              <br />
              choreographed to the <em className="italic text-crimson">minute.</em>
            </>
          }
          intro={`From the first roll call to the final gavel — the full three-day programme at ${CONFERENCE.venue} will be published right here, day by day.`}
        />

        <Reveal delay={0.12} className="mt-10">
          <div className="relative overflow-hidden border border-line bg-panel/60 px-7 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden className="absolute inset-0 opacity-[0.08]">
              <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="relative flex flex-col items-center">
              <span className="inline-flex size-14 items-center justify-center rounded-full border border-crimson/50 bg-crimson/10 text-crimson">
                <CalendarClock className="size-6" />
              </span>
              <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.45em] text-beige-dim">
                Full programme
              </p>
              <p className="mt-3 font-display text-4xl font-semibold italic text-beige sm:text-5xl">
                Releasing soon
              </p>
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-beige-dim">
                Day-wise ceremonies, committee sessions, meals and socials are being finalised by
                the secretariat. Delegates also receive the printed programme in their kits on Day
                One.
              </p>
              <div className="mt-8">
                <SoonStamp />
              </div>
            </div>
          </div>
        </Reveal>
      </PageWrap>
    </main>
  );
}
