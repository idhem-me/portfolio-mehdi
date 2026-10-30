"use client";

import { NativeInput } from "@/components/design-system/native-controls";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type GameFeelSettingsValue = {
  sound: boolean;
  effectsVolume: number;
  haptics: boolean;
  ios: boolean;
};

export type GameFeelSettingsProps = {
  value: GameFeelSettingsValue;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onToggleIos: () => void;
  onEffectsVolume: (value: number) => void;
  /** Called when the user interacts with audio controls (unlock AudioContext). */
  onUnlockAudio?: () => void;
  /** Preview sound when adjusting the effects slider. */
  onPreviewEffects?: () => void;
  volumeDescription?: string;
  volumeInputId?: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Shared sound / volume / haptics / iOS controls used by portfolio games.
 * Visual pattern matches Clicker Burger settings.
 */
export function GameFeelSettings({
  value,
  onToggleSound,
  onToggleHaptics,
  onToggleIos,
  onEffectsVolume,
  onUnlockAudio,
  onPreviewEffects,
  volumeDescription = "Effets d’ouverture et interactions",
  volumeInputId = "game-effects-volume",
  className,
  children,
}: GameFeelSettingsProps) {
  return (
    <div className={className}>
      <Button
        variant="outline"
        role="switch"
        aria-label="Son"
        aria-checked={value.sound}
        onClick={() => {
          onUnlockAudio?.();
          onToggleSound();
        }}
      >
        Son
        <Badge variant={value.sound ? "default" : "secondary"}>
          {value.sound ? "Oui" : "Non"}
        </Badge>
      </Button>
      {value.sound && (
        <fieldset className="game-feel-audio-mixer">
          <legend className="sr-only">Volume des effets</legend>
          <div>
            <div className="game-feel-audio-heading">
              <label htmlFor={volumeInputId}>Effets sonores</label>
              <span aria-hidden="true">{value.effectsVolume} %</span>
            </div>
            <p id={`${volumeInputId}-description`}>{volumeDescription}</p>
            <NativeInput
              id={volumeInputId}
              type="range"
              min={0}
              max={100}
              step={5}
              value={value.effectsVolume}
              aria-valuetext={`${value.effectsVolume} %`}
              aria-describedby={`${volumeInputId}-description`}
              onChange={(event) => {
                const next = Number(event.target.value);
                onEffectsVolume(next);
                onUnlockAudio?.();
                onPreviewEffects?.();
              }}
            />
          </div>
        </fieldset>
      )}
      <Button
        variant="outline"
        role="switch"
        aria-checked={value.haptics}
        onClick={onToggleHaptics}
      >
        Haptiques
        <Badge variant={value.haptics ? "default" : "secondary"}>
          {value.haptics ? "Oui" : "Non"}
        </Badge>
      </Button>
      <Button
        variant="outline"
        role="switch"
        aria-checked={value.ios}
        onClick={onToggleIos}
      >
        Haptiques iOS expérimentales
        <Badge variant={value.ios ? "default" : "secondary"}>
          {value.ios ? "Oui" : "Non"}
        </Badge>
      </Button>
      <p className="game-feel-settings-note">
        L’option iOS utilise une astuce non officielle de Safari 18+. Elle peut
        ne produire aucune vibration. Safari iOS ne prend pas en charge
        navigator.vibrate.
      </p>
      {children}
    </div>
  );
}
