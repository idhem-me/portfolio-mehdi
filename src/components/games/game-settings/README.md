# Réglages d’un jeu

`GameSettingsPanel` fournit le drawer commun. Les écrans de jeu gardent leur état, leurs effets audio/haptiques et leurs actions spécifiques ; ils transmettent les valeurs et `onSettingChange`. `useGameSettings` synchronise les préférences entre composants et onglets.

Chaque jeu exporte une config de présentation depuis son dossier. Les identifiants des canaux audio et options doivent correspondre aux clés de son type de préférences.

Le hook reçoit le jeu, ses valeurs par défaut et les fonctions de chargement/enregistrement du jeu. Les clés persistées restent préfixées par l’identifiant du jeu ; le chargeur peut migrer une ancienne clé lors de sa première lecture.

```tsx
const { settings, update } = useGameSettings(
  "example-game",
  defaults,
  loadSettings,
  saveSettings,
);

const settingsConfig: GameSettingsConfig = {
  gameId: "example-game",
  gameName: "Example Game",
  account: true,
  appearance: true,
  audio: {
    channels: [
      { id: "effectsVolume", label: "Effets sonores", description: "Interactions" },
    ],
  },
  haptics: { ios: true },
  toggles: [{ id: "reduced", label: "Effets réduits" }],
  about: { shareText: "Viens jouer." },
};
```

Passe `open`, `onClose`, `settings` et `onSettingChange` au panneau. Les sections spécifiques sont fournies via `customSections`, avec les primitives exportées par ce dossier.
