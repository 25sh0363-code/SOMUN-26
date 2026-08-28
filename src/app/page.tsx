"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigation } from "@/components/mun/Navigation";
import { Footer } from "@/components/mun/Footer";
import { HomeView } from "@/components/mun/HomeView";
import { CommitteesView } from "@/components/mun/CommitteesView";
import { SecretariatView } from "@/components/mun/SecretariatView";
import { ItineraryView } from "@/components/mun/ItineraryView";
import { ResourcesView } from "@/components/mun/ResourcesView";
import { RegisterView } from "@/components/mun/RegisterView";
import { EnterGate } from "@/components/mun/EnterGate";
import type { View } from "@/components/mun/types";

const HASHES: Record<View, string> = {
  home: "#/",
  committees: "#/committees",
  secretariat: "#/secretariat",
  itinerary: "#/itinerary",
  resources: "#/resources",
  register: "#/register",
};

function viewFromHash(): View {
  if (typeof window === "undefined") return "home";
  const h = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  if (h === "committees") return "committees";
  if (h === "secretariat") return "secretariat";
  if (h === "itinerary") return "itinerary";
  if (h === "resources") return "resources";
  if (h === "register") return "register";
  return "home";
}

type Phase = "checking" | "gated" | "live";

export default function Page() {
  const [view, setView] = useState<View>("home");

  /* entry gate — once per browser session, then straight in */
  const [phase, setPhase] = useState<Phase>("checking");
  const [gateUp, setGateUp] = useState(false);

  useEffect(() => {
    // one-frame defer keeps the mount check out of the synchronous render pass
    let seen = false;
    try {
      seen = sessionStorage.getItem("somun-entered") === "1";
    } catch {
      seen = false;
    }
    const raf = requestAnimationFrame(() => {
      if (seen) setPhase("live");
      else {
        setPhase("gated");
        setGateUp(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const revealSite = useCallback(() => setPhase("live"), []);
  const dismissGate = useCallback(() => setGateUp(false), []);

  useEffect(() => {
    const sync = () => {
      const v = viewFromHash();
      setView(v);
      // keep deep links landing at the top of the requested section
      requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const navigate = useCallback((v: View) => {
    if (HASHES[v] === window.location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setView(v);
    } else {
      window.location.hash = HASHES[v];
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-ink grain">
      {phase === "live" && (
        <>
          <Navigation view={view} onNavigate={navigate} />

          <div className="grow flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grow"
              >
                {view === "home" && <HomeView onNavigate={navigate} />}
                {view === "committees" && <CommitteesView onNavigate={navigate} />}
                {view === "secretariat" && <SecretariatView />}
                {view === "itinerary" && <ItineraryView />}
                {view === "resources" && <ResourcesView />}
                {view === "register" && <RegisterView />}
              </motion.div>
            </AnimatePresence>
          </div>

          <Footer onNavigate={navigate} />
        </>
      )}

      {gateUp && (
        <EnterGate onReveal={revealSite} onDone={dismissGate} />
      )}
    </div>
  );
}
