import type { ReactNode } from "react";

export type AudioChannel = {
  id: string;
  label: string;
  description?: string;
};

export type ToggleOption = {
  id: string;
  label: string;
  description?: string;
};

export type CustomSection = {
  title: string;
  description?: string;
  content: ReactNode;
};

export type GameSettingsConfig = {
  gameId: string;
  gameName: string;
  account?: boolean;
  appearance?: boolean;
  audio?: false | { sound?: boolean; channels: AudioChannel[] };
  haptics?: false | { enabled?: boolean; ios?: boolean };
  toggles?: ToggleOption[];
  customSections?: CustomSection[];
  about?:
    | false
    | {
        shareText?: string;
      };
};

export type SettingsValue = Record<string, boolean | number>;
export type SettingsChange = (id: string, value: boolean | number) => void;
