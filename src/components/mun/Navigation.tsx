"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { View } from "./types";

const LINKS: { id: View; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "committees", label: "Committees" },
  { id: "itinerary", label: "Itinerary" },
];

export function Navigation({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: View) => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (v: View) => {
    setOpen(false);
    onNavigate(v);
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500 border-b",
          scrolled
            ? "bg-ink/90 backdrop-blur-md border-line"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[76px]">
            {/* Brand */}
            <button
              onClick={() => go("home")}
              className="flex items-center gap-3 group"
              aria-label="SOMUN home"
            >
              <img
                src="/images/somun-mark.png"
                alt="SOMUN mark"
                className="size-11 sm:size-12 mix-blend-screen transition-transform duration-500 group-hover:scale-105"
              />
              <span className="text-left leading-none">
                <span className="block text-[9px] sm:text-[10px] tracking-[0.42em] text-beige-dim group-hover:text-beige transition-colors">
                  MODEL UN · HYDERABAD · MMXXVI
                </span>
              </span>
            </button>

            {/* Desktop links */}
            <nav className="hidden md:flex items-center gap-9" aria-label="Primary">
              {LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className={cn(
                    "relative py-2 text-[11px] font-medium uppercase tracking-[0.28em] transition-colors duration-300",
                    view === l.id ? "text-beige" : "text-beige-dim hover:text-beige"
                  )}
                >
                  {l.label}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-px bg-crimson transition-all duration-300",
                      view === l.id ? "w-full" : "w-0"
                    )}
                  />
                  {view === l.id && (
                    <span className="absolute top-1/2 -left-3 -translate-y-1/2 size-1 rotate-45 bg-crimson" />
                  )}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={() => go("register")}
                className="hidden md:inline-flex items-center gap-2 bg-crimson hover:bg-crimson-deep text-primary-foreground text-[11px] font-semibold uppercase tracking-[0.22em] px-5 py-2.5 transition-colors duration-300 min-h-[44px]"
              >
                Register Now
              </button>

              {/* Mobile toggle */}
              <button
                className="md:hidden inline-flex items-center justify-center size-11 border border-line text-beige"
                onClick={() => setOpen((o) => !o)}
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div className="absolute inset-0 bg-ink/95 backdrop-blur-sm" onClick={() => setOpen(false)} />
        <nav
          className="absolute inset-x-0 top-16 border-y border-line bg-panel px-6 py-8 flex flex-col gap-1"
          aria-label="Mobile"
        >
          {LINKS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => go(l.id)}
              className={cn(
                "flex items-baseline justify-between py-4 border-b border-line last:border-0 text-left",
                view === l.id ? "text-beige" : "text-beige-dim"
              )}
            >
              <span className="font-display text-3xl italic">{l.label}</span>
              <span className="text-[10px] tracking-[0.3em]">0{i + 1}</span>
            </button>
          ))}
          <button
            onClick={() => go("register")}
            className="mt-6 w-full bg-crimson hover:bg-crimson-deep text-primary-foreground text-xs font-semibold uppercase tracking-[0.25em] py-4 transition-colors"
          >
            Register Now
          </button>
        </nav>
      </div>
    </>
  );
}
