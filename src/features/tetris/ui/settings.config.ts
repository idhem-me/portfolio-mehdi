import type { GameSettingsConfig } from "@/components/games/game-settings";
import { soundEnabled } from "../flags";

export const tetrisSettings: GameSettingsConfig = {
  gameId: "tetris",
  gameName: "Tetris",
  account: true,
  appearance: true,
  audio: soundEnabled ? {
    channels: [
      {
        id: "effectsVolume",
        label: "Effets sonores",
        description: "Rotation et chute des briques",
      },
      { id: "musicVolume", label: "Musique", description: "Fond musical" },
      { id: "voiceVolume", label: "Voix", description: "Nice et wow" },
    ],
  } : false,
  haptics: { ios: true },
  toggles: [
    { id: "reduced", label: "Effets réduits" },
    { id: "overlay", label: "Contrôles visibles" },
  ],
  about: { shareText: "Viens jouer au Tetris du portfolio." },
};
