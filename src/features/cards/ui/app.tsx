"use client";

import { SaveChoiceDialog } from "../account/save-choice";
import { ScopedTheme } from "@/components/ui/scoped-theme";
import { Shop } from "../shop/shop";
import { useLocale } from "next-intl";
import { usePathname, getPathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CardsPlayerAvatar } from "../avatar/player-avatar";
import { Badge } from "@/components/ui/badge";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Settings2, Gem, Store } from "lucide-react";
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
import { createAccountController } from "../account/controller";
import { cardsRequest, useCardsAccount } from "../account/client";
import { formatCredits } from "../shop/catalog";
import { Toast } from "@/components/ui/toast";

import { CardsAudio } from "../feel/audio";
import { defaults, type CardsSettings } from "../feel/config";

import { CollectionScreen } from "./collection-screen";
import { OpeningScene } from "./opening-scene";
import { ResetCollection } from "./reset-collection";
import { ProfileScreen } from "./profile-screen";

export default function CardsApp({
  backHref,
  initialTheme = "default",
}: {
  backHref: string;
  initialTheme?: string;
}) {
  const account = useCardsAccount();
  const [message, setMessage] = useState<string | null>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const notify = useCallback(() => setSaveVersion((value) => value + 1), []);
  const session = useMemo(
    () => createAccountController(notify, setMessage),
    [notify],
  );
  const controller = session.controller;
  const settings = account.data?.profile.settings ?? defaults;
  useEffect(() => {
    if (account.data) {
      controller.replaceSave(account.data.save);
      const frame = requestAnimationFrame(notify);
      return () => cancelAnimationFrame(frame);
    }
  }, [account.data, controller, notify]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const query = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const tab =
    pathname === "/boutique"
      ? "shop"
      : ["profile", "collection"].includes(query.get("tab") ?? "")
        ? query.get("tab")!
        : "open";
  const setTab = (value: string) => {
    const href =
      value === "shop" ? "/boutique?tab=credits" : `/jeux/cards?tab=${value}`;
    window.history.pushState(null, "", getPathname({ locale, href }));
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const theme = account.data?.profile.theme ?? initialTheme;
  const reducedMotion = useReducedMotion();
  const navigation = [
    { value: "collection", label: "Collection" },
    { value: "open", label: "Ouvrir" },
    { value: "profile", label: "Profil" },
    { value: "shop", label: "Boutique" },
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
    void cardsRequest("settings", {
      settings: { ...settings, ...patch },
    }).catch((error) => setMessage(error.message));
  };

  const unlockFeel = () => {
    if (settings.sound) {
      audio.current?.unlock();
      audio.current?.setVolume(settings.effectsVolume);
    }
  };

  return (
    <ScopedTheme value={theme}>
      <div className="cards-game" data-cards-theme={theme}>
        <header className="cards-header">
          <div className="cards-header-inner">
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
                asChild
                aria-label={`Gems : ${formatCredits(account.data?.profile.credits ?? 0)} – ouvrir la boutique`}
              >
                <Link href="/boutique?tab=credits">
                  <Gem aria-hidden="true" />
                  <span>
                    {formatCredits(account.data?.profile.credits ?? 0)}
                  </span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Réglages"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 />
              </Button>
              <PlayerProfileButton
                showHelp={false}
                avatarOverride={<CardsPlayerAvatar />}
              />
            </div>
          </div>
        </header>

        {account.error && (
          <p role="alert" className="p-4 text-sm text-destructive">
            {account.error}
          </p>
        )}
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
                onStart={session.start}
                credits={account.data?.profile.credits ?? 0}
                ready={!!account.data}
                settings={settings}
                audio={audio}
                iosSwitch={iosSwitch}
                collection={save.collection}
                onSaveChange={notify}
                onViewCollection={() => setTab("collection")}
              />
            </TabsContent>
            <TabsContent value="shop" className="cards-tab-panel">
              <Shop />
            </TabsContent>
            <TabsContent value="profile" className="cards-tab-panel">
              <ProfileScreen save={save} />
            </TabsContent>
          </motion.div>
          <div className="cards-navigation-dock">
            <TabsList
              className="cards-tabs-list"
              aria-label="Navigation du jeu"
            >
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
                  {value === "shop" ? (
                    <Store
                      aria-hidden="true"
                      className="cards-navigation-icon"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="cards-navigation-icon"
                      style={{
                        maskImage: `url(/img/cards/navigation/${value}${tab === value ? "-active" : ""}.svg)`,
                      }}
                    />
                  )}
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
                  onToggleSound={() =>
                    updateSettings({ sound: !settings.sound })
                  }
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
              <section
                className="cards-settings-section"
                aria-label="Sauvegarde"
              >
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

        <SaveChoiceDialog />
        <Toast message={message} error onDismiss={() => setMessage(null)} />
        <input
          ref={iosSwitch}
          type="checkbox"
          {...({ switch: "" } as Record<string, string>)}
          className="cards-ios-switch"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>
    </ScopedTheme>
  );
}
