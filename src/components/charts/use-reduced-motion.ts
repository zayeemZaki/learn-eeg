"use client";

import { useEffect, useState } from "react";

/**
 * Whether the user has asked for reduced motion. Recharts animates via a JS
 * prop (`isAnimationActive`), not CSS, so the `prefers-reduced-motion` media
 * query can't reach it — we read the query here and feed the result into every
 * chart so animation is suppressed for users who request it.
 *
 * Starts `true` (animation off) so the very first paint — including SSR and the
 * pre-hydration client render — never animates; we only enable animation after
 * confirming the user has NOT asked to reduce motion. Updates live if the OS
 * setting changes.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
