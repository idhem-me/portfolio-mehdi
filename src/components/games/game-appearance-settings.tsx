"use client";

import { useId } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./game-appearance-settings.css";

export function GameAppearanceSettings() {
  const titleId = useId();
  const { theme, setTheme } = useTheme();
  return (
    <section className="game-appearance" aria-labelledby={titleId}>
      <h2 id={titleId}>Apparence</h2>
      <p>Le thème est partagé avec le portfolio.</p>
      <div
        className="game-appearance-options"
        role="group"
        aria-label="Thème du jeu"
      >
        {(
          [
            ["light", "Clair", Sun],
            ["dark", "Sombre", Moon],
            ["system", "Système", Monitor],
          ] as const
        ).map(([value, label, Icon]) => (
          <Button
            key={value}
            variant={theme === value ? "secondary" : "ghost"}
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <Icon aria-hidden="true" />
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}
