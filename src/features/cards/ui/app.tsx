"use client";

import { Badge } from "@/components/ui/badge";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GameFeelSettings } from "@/components/games/game-feel-settings";
import { GameSettingsOutreach } from "@/components/games/game-settings-outreach";
import { PlayerProfileButton } from "@/features/account/ui/profile-button";
import { createOpeningController } from "../engine/opening";
import { createLocalCardsRepository } from "../persistence/repository";
import { CardsAudio } from "../feel/audio";
import {
  defaults,
  loadSettings,
  saveSettings,
  type CardsSettings,
} from "../feel/config";
import { useCardsCloudSync } from "../persistence/cloud-client";
import { CloudSaveStatus } from "./cloud-save-status";
import { LocalSaveNotice } from "./local-save-notice";
import { CollectionScreen } from "./collection-screen";
import { OpeningScene } from "./opening-scene";
import { ProfileScreen } from "./profile-screen";

function readClientSettings(): CardsSettings {
  if (typeof window === "undefined") return defaults;
  return loadSettings();
}

export default function CardsApp({ backHref }: { backHref: string }) {
  const repo = useMemo(() => createLocalCardsRepository(), []);
  const controller = useMemo(() => createOpeningController(repo), [repo]);
  const [saveVersion, setSaveVersion] = useState(0);
  const notify = useCallback(() => setSaveVersion((value) => value + 1), []);
  const cloud = useCardsCloudSync(controller, notify);
  const [settings, setSettings] = useState<CardsSettings>(readClientSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tab, setTab] = useState("open");
  const audio = useRef<CardsAudio | null>(null);
  const iosSwitch = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const instance = new CardsAudio();
    audio.current = instance;
    instance.setVolume(settings.effectsVolume);
    if (!settings.sound) instance.mute();
    return () => {
      instance.close();
      if (audio.current === instance) audio.current = null;
    };
    // Mount-only audio lifecycle; volume/mute synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = audio.current;
    if (!instance) return;
    instance.setVolume(settings.effectsVolume);
    if (!settings.sound) instance.mute();
    else instance.unmute();
  }, [settings.sound, settings.effectsVolume]);

  const save = controller.getSave();
  void saveVersion;

  const updateSettings = (patch: Partial<CardsSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const unlockFeel = () => {
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.setVolume(settings.effectsVolume);
    }
  };

  return (
    <div className="cards-game">
      <header className="cards-header">
        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label="Retour aux jeux"
        >
          <Link href={backHref}>
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="cards-title">Cartes</h1>
          <Badge variant="secondary">Work in progress</Badge>
        </div>
        <div className="cards-header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Réglages"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 />
          </Button>
          <PlayerProfileButton />
        </div>
      </header>

      <LocalSaveNotice boostersOpened={save.stats.boostersOpened} />
      <CloudSaveStatus
        cloud={cloud}
        openingActive={Boolean(
          save.activeOpen &&
          !["summary", "closed", "idle"].includes(save.activeOpen.phase),
        )}
      />

      <Tabs value={tab} onValueChange={setTab} className="cards-tabs">
        <TabsList className="cards-tabs-list w-full">
          <TabsTrigger value="collection" className="flex-1 min-h-11">
            Collection
          </TabsTrigger>
          <TabsTrigger value="open" className="flex-1 min-h-11">
            Ouvrir
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-1 min-h-11">
            Profil
          </TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="cards-tab-panel">
          <CollectionScreen save={save} />
        </TabsContent>
        <TabsContent value="open" className="cards-tab-panel">
          <OpeningScene
            controller={controller}
            settings={settings}
            audio={audio}
            iosSwitch={iosSwitch}
            collection={save.collection}
            onSaveChange={notify}
          />
        </TabsContent>
        <TabsContent value="profile" className="cards-tab-panel">
          <ProfileScreen
            save={save}
            onOpenSettings={() => setSettingsOpen(true)}
            onResetLocal={() => {
              controller.resetLocal();
              setSaveVersion((v) => v + 1);
            }}
          />
        </TabsContent>
      </Tabs>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Réglages</SheetTitle>
          </SheetHeader>
          <div className="cards-settings mt-4 px-4 pb-4">
            <GameFeelSettings
              className="cards-feel-settings"
              value={settings}
              volumeInputId="cards-effects-volume"
              volumeDescription="Déchirure, flips et révélations"
              onUnlockAudio={unlockFeel}
              onToggleSound={() => updateSettings({ sound: !settings.sound })}
              onToggleHaptics={() =>
                updateSettings({ haptics: !settings.haptics })
              }
              onToggleIos={() => updateSettings({ ios: !settings.ios })}
              onEffectsVolume={(effectsVolume) => {
                updateSettings({ effectsVolume });
                audio.current?.setVolume(effectsVolume);
              }}
              onPreviewEffects={() => audio.current?.emit("flip")}
            />
            <GameSettingsOutreach
              className="mt-6"
              gameName="Cartes"
              shareText="Viens ouvrir des boosters sur mon portfolio."
            />
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={iosSwitch}
        type="checkbox"
        {...({ switch: "" } as Record<string, string>)}
        className="cards-ios-switch"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
