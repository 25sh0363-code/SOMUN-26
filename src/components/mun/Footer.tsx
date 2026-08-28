"use client";

import { Instagram, Twitter, Mail, MapPin } from "lucide-react";
import { CONFERENCE } from "./data";
import type { View } from "./types";

export function Footer({
  onNavigate,
}: {
  onNavigate: (v: View) => void;
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line bg-panel">
      {/* Top strip */}
      <div className="border-b border-line">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-14 sm:py-16 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-4">
              <img
                src="/images/somun-mark.png"
                alt="SOMUN mark"
                className="size-16 mix-blend-screen"
              />
              <div>
                <p className="font-display text-2xl font-bold tracking-[0.12em] text-beige leading-none">
                  SOMUN
                </p>
                <p className="text-[10px] tracking-[0.45em] text-crimson mt-2">
                  MODEL UNITED NATIONS · EST. MMXXIII
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-beige-dim">
              SOMUN convenes young diplomats for three days of rigorous debate at
              the Hyderabad International Convention Centre. Words, not war —
              resolve, don&apos;t rally.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[Instagram, Twitter, Mail].map((Icon, i) => (
                <a
                  key={i}
                  href="#/"
                  onClick={(e) => e.preventDefault()}
                  aria-label={i === 0 ? "Instagram" : i === 1 ? "Twitter" : "Email"}
                  className="inline-flex items-center justify-center size-11 border border-line text-beige-dim hover:text-beige hover:border-crimson transition-colors duration-300"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <nav aria-label="Footer">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
              Explore
            </h3>
            <ul className="mt-5 space-y-3.5">
              {(
                [
                  ["home", "Home"],
                  ["committees", "Committees"],
                  ["itinerary", "Itinerary"],
                  ["register", "Register"],
                ] as [View, string][]
              ).map(([id, label]) => (
                <li key={id}>
                  <button
                    onClick={() => onNavigate(id)}
                    className="group inline-flex items-center gap-2.5 text-sm text-beige-dim hover:text-beige transition-colors"
                  >
                    <span className="size-1 rotate-45 bg-crimson opacity-0 group-hover:opacity-100 transition-opacity" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.4em] text-beige-dim">
              Secretariat
            </h3>
            <ul className="mt-5 space-y-4 text-sm text-beige-dim">
              <li className="flex gap-3">
                <MapPin className="size-4 mt-0.5 shrink-0 text-crimson" />
                <span>
                  {CONFERENCE.venue},<br />
                  {CONFERENCE.city}
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="size-4 mt-0.5 shrink-0 text-crimson" />
                <span>{CONFERENCE.email}</span>
              </li>
              <li className="text-xs leading-relaxed pt-1">
                {CONFERENCE.phone} · Responses within 24 hours on weekdays.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-line overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-[0.13]">
          <img src="/images/textures/red-texture.jpg" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] uppercase tracking-[0.3em] text-beige-dim/70">
          <p>© {year} SOMUN — Model United Nations</p>
          <p className="flex items-center gap-2">
            Eighth Edition · MMXXVI
          </p>
        </div>
      </div>
    </footer>
  );
}
