"use client";

import { Badge } from "@/components/ui/badge";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { GameFeelSettings } from "@/components/games/game-feel-settings";
import { GameAppearanceSettings } from "@/components/games/game-appearance-settings";
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
import { ResetCollection } from "./reset-collection";
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
  const reducedMotion = useReducedMotion();
  const navigation = [
    { value: "collection", label: "Collection" },
    { value: "open", label: "Ouvrir" },
    { value: "profile", label: "Profil" },
  ];
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
        showStatus={false}
        openingActive={Boolean(
          save.activeOpen &&
          !["summary", "closed", "idle"].includes(save.activeOpen.phase),
        )}
      />

      <Tabs value={tab} onValueChange={setTab} className="cards-tabs">
        <motion.div
          key={tab}
          className="cards-tab-transition"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.22, 0.8, 0.25, 1] }}
        >
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
              onViewCollection={() => setTab("collection")}
            />
          </TabsContent>
          <TabsContent value="profile" className="cards-tab-panel">
            <ProfileScreen save={save} cloud={cloud} />
          </TabsContent>
        </motion.div>
        <div className="cards-navigation-dock">
          <TabsList className="cards-tabs-list" aria-label="Navigation du jeu">
            {navigation.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                aria-label={label}
                className="cards-navigation-tab"
              >
                {tab === value && (
                  <motion.span
                    className="cards-navigation-indicator"
                    layoutId="cards-navigation-indicator"
                    transition={
                      reducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 440, damping: 35 }
                    }
                  />
                )}
                <span
                  aria-hidden="true"
                  className="cards-navigation-icon"
                  style={{
                    maskImage: `url(/img/cards/navigation/${value}${tab === value ? "-active" : ""}.svg)`,
                  }}
                />
                <span className="cards-navigation-label" aria-hidden="true">
                  {label}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent
          side="right"
          className="cards-settings-sheet w-full sm:max-w-md overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>Réglages</SheetTitle>
            <SheetDescription>
              Personnalise l’apparence et les sensations du jeu.
            </SheetDescription>
          </SheetHeader>
          <div className="cards-settings px-4 pb-6">
            <GameAppearanceSettings />
            <section
              className="cards-settings-section"
              aria-labelledby="cards-feel-title"
            >
              <h2 id="cards-feel-title">Son et vibrations</h2>
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
            </section>
            <section className="cards-settings-section" aria-label="Sauvegarde">
              <h2>Sauvegarde</h2>
              <ResetCollection
                onResetLocal={() => {
                  controller.resetLocal();
                  notify();
                }}
              />
            </section>
            <GameSettingsOutreach
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
