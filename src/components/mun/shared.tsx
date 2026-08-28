"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Scroll-triggered fade-up reveal */
export function Reveal({
  children,
  delay = 0,
  className,
  y = 28,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Editorial section header with index number + rule */
export function SectionHead({
  index,
  kicker,
  title,
  intro,
  align = "left",
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <Reveal
      className={
        align === "center"
          ? "text-center max-w-3xl mx-auto"
          : "max-w-3xl"
      }
    >
      <div
        className={`flex items-center gap-4 ${
          align === "center" ? "justify-center" : ""
        }`}
      >
        <span className="font-display italic text-crimson text-lg">{index}</span>
        <span className="h-px w-10 bg-crimson/70" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.45em] text-beige-dim">
          {kicker}
        </span>
      </div>
      <h2 className="mt-5 font-display font-bold text-beige leading-[1.05] text-4xl sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {intro && (
        <p className="mt-6 text-base sm:text-lg leading-relaxed text-beige-dim">
          {intro}
        </p>
      )}
    </Reveal>
  );
}

/** Shared page-level wrapper so every view gets consistent top padding under the fixed nav */
export function PageWrap({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-32 sm:pt-40 pb-20 sm:pb-28">
      {children}
    </div>
  );
}
