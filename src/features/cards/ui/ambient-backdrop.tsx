"use client";

import { useMemo } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

const DUST_COUNT = 32;

/** Soft pastel wash + light random dust for the Cards shell. */
export function AmbientBackdrop() {
  const reduced = usePrefersReducedMotion();
  const dust = useMemo(
    () =>
      Array.from({ length: DUST_COUNT }, (_, index) => ({
        id: index,
        left: ((index * 47) % 97) + 1.5,
        top: ((index * 31) % 93) + 2,
        size: 1.25 + ((index * 13) % 18) / 10,
        delay: -((index * 1.7) % 20),
        duration: 16 + ((index * 5) % 18),
        drift: -14 + ((index * 7) % 28),
        opacity: 0.18 + ((index * 11) % 20) / 100,
      })),
    [],
  );

  return (
    <div className="cards-ambient" aria-hidden="true">
      <span className="cards-ambient-orb cards-ambient-orb-a" />
      <span className="cards-ambient-orb cards-ambient-orb-b" />
      <span className="cards-ambient-orb cards-ambient-orb-c" />
      <span className="cards-ambient-orb cards-ambient-orb-d" />
      {!reduced &&
        dust.map((particle) => (
          <span
            key={particle.id}
            className="cards-ambient-dust"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height: particle.size,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
              ["--dust-drift" as string]: `${particle.drift}px`,
              ["--dust-opacity" as string]: String(particle.opacity),
            }}
          />
        ))}
    </div>
  );
}
