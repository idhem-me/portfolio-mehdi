import type { GameSettingsConfig } from "@/components/games/game-settings";

export const clickerBurgerSettings: GameSettingsConfig = {
  gameId: "clicker-burger",
  gameName: "Clicker Burger",
  account: true,
  appearance: true,
  audio: {
    channels: [
      {
        id: "effectsVolume",
        label: "Effets sonores",
        description: "Clics, nouveautés et niveaux",
      },
    ],
  },
  haptics: { ios: true },
  toggles: [{ id: "levelPopups", label: "Popups de félicitation" }],
  about: { shareText: "Viens gérer ton empire de burgers." },
};
