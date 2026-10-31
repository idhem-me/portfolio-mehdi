"use client";
import { track as usage } from "@/lib/tracking/client";

import {
  NativeInput,
  NativeButton,
} from "@/components/design-system/native-controls";
import Image from "next/image";
import Link from "next/link";
import { useIdentityState } from "@/features/account/client-store";
import { useSettings } from "./state/usePreferences";
import { useNotices } from "./state/useNotices";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChefHat,
  TrendingUp,
  Store,
  FlaskConical,
  ChartNoAxesCombined,
  Settings,
  Minus,
  Plus,
  Download,
  Upload,
  Check,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LevelUp } from "./components/LevelUp";
import {
  GameSettingsPanel,
  SettingsButton,
  SettingsCard,
} from "@/components/games/game-settings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "./components/Sheet";
import { accountSaveKey } from "./auth/useAccount";
import { useGame } from "./state/useGame";
import { BURGER_ASSETS } from "./assets/game-assets";
import { BurgerAudio } from "./feel/audio";
import { haptic } from "./feel/haptics";
import type { FeedbackKind } from "./feel/config";
import { clickerBurgerSettings } from "./settings.config";
import {
  buildingLevel,
  clickProduction,
  burgersPerClick,
  levelMultiplier,
  rates,
  cost,
  affordable,
  fmt,
  D,
  initial,
  prestige,
  prestigeGain,
  domination,
  upgradeOffer,
  eventOffer,
  traderSkill,
  marketUnlocked,
  willingnessToPay,
  restaurantCount,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_COMFORT_CAP,
  EARTH_PRICE_SOFT_CAP,
  priceAdvice,
  optimalPrice,
  spacePriceMultiplier,
  formatGameDate,
  gameDateISO,
  effectiveCooks,
  inflatedCost,
  timelineInflation,
} from "./engine/game";
import { COOKS_PER_OUTLET } from "./data/content";
import { discoveries } from "./systems/discovery";
import { parseSave, resume } from "./systems/save";
import {
  visibleMissions,
  claimMission,
  missionLabel,
  MISSIONS,
} from "./data/missions";
import { PROJECTS } from "./data/projects";
type Panel =
  | "level"
  | "upgrades"
  | "research"
  | "extensions"
  | "finance"
  | "missions-done"
  | "settings"
  | "reset"
  | "prestige"
  | "price"
  | null;
const TITLES: Record<Exclude<Panel, null>, string> = {
  level: "Améliorer le bâtiment",
  upgrades: "Améliorer",
  research: "Recherche",
  extensions: "Extensions",
  finance: "Bourse",
  "missions-done": "Missions réussies",
  settings: "Réglages",
  reset: "Recommencer ?",
  prestige: "Faillite stratégique",
  price: "Prix de vente",
};
export default function App({
  backHref = "http://127.0.0.1:3000/fr/jeux",
}: {
  backHref?: string;
}) {
  const account = useIdentityState();
  const saveKey = account.loaded ? accountSaveKey(account.profile) : null;
  const {
    settings,
    update: updateSettings,
    toggle: toggleSetting,
  } = useSettings();
  const game = useGame(saveKey);
  const s = game.state;
  const visible = discoveries(s);
  const r = rates(s);
  const level = buildingLevel(s);
  const asset = BURGER_ASSETS.levels[level - 1];
  const empire = clickProduction(s);
  const cpc = burgersPerClick(s);
  const upgrade = upgradeOffer(s);
  const event = eventOffer(s);
  const stockCap = Math.max(r.demand * 30, Math.min(r.production, 1));
  const stockRoom = Math.max(0, stockCap - s.stock);
  const cashForIngredients =
    s.price > r.ingredientCost
      ? Math.max(0, D(s.money).div(r.ingredientCost).toNumber())
      : 0;
  const fundedProduction = Math.min(
    r.production,
    stockRoom,
    s.ingredients + cashForIngredients,
  );
  const soldPerSec = Math.min(s.stock + fundedProduction, r.demand);
  const income = soldPerSec * (s.price - r.ingredientCost);
  const [panel, setPanel] = useState<Panel>(null);
  const [priceDraft, setPriceDraft] = useState("");
  const [quantity, setQuantity] = useState<number | "max">(1);
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const [particles, setParticles] = useState<{ id: number; text: string }[]>(
    [],
  );
  const particleId = useRef(0);
  const particleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const audio = useRef<BurgerAudio | null>(null);
  const iosSwitch = useRef<HTMLInputElement>(null);
  const settingsRef = useRef(settings);
  const noticedTotal = useRef<number | null>(null);
  const levelNoticeRef = useRef<number | null>(null);
  const missions = visibleMissions(s);
  const groups = {
    upgrades: visible.generators.map((g) => g.id),
    research: [
      ...visible.research.map((v) => v.id),
      ...visible.projects.map((p) => p.id),
    ],
    missions: missions
      .filter(
        (m) => !s.missionClaims.includes(m.id) && m.progress(s) >= m.target,
      )
      .map((m) => m.id),
    extensions: [
      ...visible.markets
        .filter((m) => !s.markets.includes(m.id))
        .map((m) => m.id),
      ...visible.rivals
        .filter((v) => !s.rivals.includes(v.id))
        .map((v) => v.id),
    ],
    finance: marketUnlocked(s) ? ["market"] : [],
  };
  const groupSignature = JSON.stringify(groups);
  const seenKey = `${saveKey ?? "pending"}.seen`;
  const notices = useNotices(seenKey);
  const { seen } = notices;
  const { mark: markNotices } = notices;
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  const unlockFeel = () => {
    if (!audio.current) audio.current = new BurgerAudio();
    audio.current.setVolume(settingsRef.current.effectsVolume);
    if (settingsRef.current.sound) audio.current.unlock();
  };
  const feedback = (kind: FeedbackKind) => {
    const current = settingsRef.current;
    if (current.sound) {
      unlockFeel();
      audio.current?.emit(kind);
    }
    haptic(kind, current, iosSwitch.current);
  };
  useEffect(() => {
    if (!panel) return;
    const ids = (JSON.parse(groupSignature) as Record<string, string[]>)[panel];
    if (ids) markNotices(panel, ids);
  }, [panel, groupSignature, markNotices]);
  useEffect(() => {
    if (!game.ready) return;
    const ids = groups.missions;
    if (ids.length) markNotices("missions", ids);
  }, [game.ready, groupSignature, markNotices]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => () => particleTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    audio.current ??= new BurgerAudio();
    audio.current.setVolume(settings.effectsVolume);
    if (!settings.sound) audio.current.mute();
  }, [settings.sound, settings.effectsVolume]);
  useEffect(
    () => () => {
      audio.current?.close();
      audio.current = null;
    },
    [],
  );
  const canCook =
    s.ingredients >= cpc ||
    D(s.money).gte(D(cpc - s.ingredients).mul(r.ingredientCost));
  const notification = (id: keyof typeof groups) =>
    groups[id].filter(
      (key) => !Array.isArray(seen[id]) || !seen[id].includes(key),
    ).length;
  const noveltyCount =
    notification("upgrades") +
    notification("research") +
    notification("extensions") +
    notification("finance") +
    (upgrade?.affordable ? 1 : 0) +
    groups.missions.length;
  useEffect(() => {
    if (noticedTotal.current === null) {
      noticedTotal.current = noveltyCount;
      return;
    }
    if (noveltyCount > noticedTotal.current) feedback("novelty");
    noticedTotal.current = noveltyCount;
  }, [noveltyCount]);
  useEffect(() => {
    if (game.levelNotice === null) {
      levelNoticeRef.current = null;
      return;
    }
    if (levelNoticeRef.current !== game.levelNotice) {
      levelNoticeRef.current = game.levelNotice;
      feedback("levelUp");
    }
  }, [game.levelNotice]);
  const cook = () => {
    if (!canCook) return;
    unlockFeel();
    usage.game("clicker-burger");
    game.dispatch({ type: "cook" });
    feedback("cook");
    setPulse((v) => v + 1);
    const id = particleId.current++;
    setParticles((old) => [
      ...old.slice(-6),
      { id, text: `+${fmt(cpc)} burger${cpc > 1 ? "s" : ""}` },
    ]);
    const timer = setTimeout(() => {
      setParticles((old) => old.filter((p) => p.id !== id));
      particleTimers.current = particleTimers.current.filter(
        (t) => t !== timer,
      );
    }, 800);
    particleTimers.current.push(timer);
  };
  const cookRef = useRef(cook);
  useEffect(() => {
    cookRef.current = cook;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        setPanel(null);
        return;
      }
      if (target?.closest('[role="dialog"]')) return;
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        cookRef.current();
        return;
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        settingsTriggerRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        setPanel((p) => (p === "settings" ? null : "settings"));
        return;
      }
      const map: Record<string, Exclude<Panel, null>> = {
        "1": "upgrades",
        "2": "extensions",
        "3": "research",
        "4": "finance",
      };
      const next = map[event.key];
      if (!next) return;
      event.preventDefault();
      setPanel((p) => (p === next ? null : next));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function exportSave() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify({ ...s, lastSaved: Date.now() }, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "clicker-burger-sauvegarde.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importSave(f?: File) {
    if (!f || !game.ready) return;
    try {
      if (f.size > 2000000) throw Error("Fichier trop volumineux.");
      const saved = game.replace(resume(parseSave(await f.text())).state);
      setToast(
        saved
          ? "Sauvegarde importée et enregistrée sur cet appareil."
          : "Importée en mémoire, mais l’enregistrement local a échoué.",
      );
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Import impossible.");
    }
    if (file.current) file.current.value = "";
  }
  const nav = [
    {
      id: "upgrades",
      label: "Améliorer",
      icon: TrendingUp,
      disabled: groups.upgrades.length === 0,
    },
    {
      id: "extensions",
      label: "Extensions",
      icon: Store,
      disabled: groups.extensions.length === 0,
    },
    {
      id: "research",
      label: "Recherche",
      icon: FlaskConical,
      disabled: groups.research.length === 0 && s.projects.length === 0,
    },
    {
      id: "finance",
      label: "Bourse",
      icon: ChartNoAxesCombined,
      disabled: !marketUnlocked(s),
    },
  ] as const;
  const activeMissions = missions.filter(
    (m) => !s.missionClaims.includes(m.id),
  );
  if (!game.ready) {
    return (
      <div className="clicker-burger" role="status">
        <p className="empty-state">Chargement de la sauvegarde…</p>
      </div>
    );
  }
  const settingsCustomSections = [
    {
      title: "Raccourcis clavier",
      content: (
        <SettingsCard>
          <p className="game-settings-note">
            Espace : préparer un burger · Échap : fermer · R : réglages · 1–5 :
            Améliorer, Recherche, Missions, Extensions, Bourse.
          </p>
        </SettingsCard>
      ),
    },
    {
      title: "Sauvegarde",
      content: (
        <SettingsCard className="is-borderless">
          <p className="game-settings-note">
            {game.saved
              ? "Automatique sur cet appareil"
              : "Enregistrement indisponible"} · hors ligne : 8 h maximum.
          </p>
          <SettingsButton type="button" onClick={exportSave}>
            <Download aria-hidden="true" /> Exporter
          </SettingsButton>
          <SettingsButton type="button" onClick={() => file.current?.click()}>
            <Upload aria-hidden="true" /> Importer
          </SettingsButton>
          <NativeInput
            hidden
            type="file"
            accept=".json,application/json"
            ref={file}
            onChange={(event) => void importSave(event.target.files?.[0])}
          />
          {game.error && <p role="alert" className="error-message">{game.error}</p>}
          {game.error && (
            <SettingsButton type="button" onClick={game.allowSave}>
              Remplacer la sauvegarde illisible
            </SettingsButton>
          )}
          <SettingsButton
            type="button"
            variant="danger"
            onClick={() => setPanel("reset")}
          >
            Recommencer
          </SettingsButton>
        </SettingsCard>
      ),
    },
    ...(visible.prestige
      ? [
          {
            title: "Faillite stratégique",
            content: (
              <SettingsCard>
                <p className="game-settings-note">
                  Chaque point de capital augmente la production et les clics de
                  10 % et la demande de 4 % pour les parties suivantes.
                </p>
                <p className="game-settings-note">
                  Gain à la liquidation : +{prestigeGain(s)} point
                  {prestigeGain(s) === 1 ? "" : "s"}. Capital permanent actuel : {s.capital}.
                </p>
                <SettingsButton
                  type="button"
                  disabled={prestigeGain(s) < 1}
                  onClick={() => setPanel("prestige")}
                >
                  Liquider
                </SettingsButton>
              </SettingsCard>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="clicker-burger burger-dashboard">
      <header className="game-header">
        <div className="burger-heading">
          <Link
            href={backHref}
            className="burger-breadcrumb"
            aria-label="Retour aux jeux"
            onClick={() => game.persist()}
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
            Jeux
          </Link>
          <h1>Clicker Burger</h1>
        </div>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Réglages"
            onClick={(event) => {
              settingsTriggerRef.current = event.currentTarget;
              setPanel("settings");
            }}
          >
            <Settings />
          </Button>
        </div>
        <NativeInput
          ref={iosSwitch}
          type="checkbox"
          {...({ switch: "" } as Record<string, string>)}
          className="burger-ios-switch"
          tabIndex={-1}
          aria-hidden="true"
        />
      </header>
      <div className="home">
        <section className="balance-row" aria-label="Progression">
          <div className="cash">
            <span>Trésorerie</span>
            <strong title={`${s.money} €`}>{fmt(s.money, 2)} €</strong>
            <small>
              {asset.name} · Niv. {level}
            </small>
            <time
              className="game-date"
              dateTime={gameDateISO(s)}
              title="1 seconde réelle = 1 jour dans le jeu"
            >
              <span className="game-date-fixed">{formatGameDate(s)}</span>
              <span className="game-date-elapsed">J+{fmt(s.elapsed, 0)}</span>
            </time>
          </div>
          <NativeButton
            className="building-upgrade"
            aria-label="Améliorer le bâtiment"
            onClick={() => setPanel("level")}
          >
            <Image
              key={level}
              className="building-image"
              src={asset.image}
              alt={`${asset.name}, niveau ${level}`}
              width={128}
              height={128}
            />
            {upgrade?.affordable && (
              <span
                className="building-notification"
                role="status"
                aria-label="Amélioration disponible"
              />
            )}
          </NativeButton>
        </section>
        <section
          className="restaurant-card"
          aria-label="Activité du restaurant"
        >
          <div className="card-heading">
            <h2>Votre activité</h2>
            <Store size={16} aria-hidden="true" />
          </div>
          <dl className="metrics">
            <div>
              <dt title="Bonus du niveau de bâtiment sur la production et les clics">
                Bonus
              </dt>
              <dd>×{levelMultiplier(s)}</dd>
            </div>
            <div>
              <dt
                title={`Cuisine plafonnée à ~${COOKS_PER_OUTLET} postes utiles par adresse`}
              >
                Équipe
              </dt>
              <dd>
                {fmt(s.counts.cook + s.counts.trader, 0)}
                <small> · {fmt(effectiveCooks(s), 0)} cuisine</small>
              </dd>
            </div>
            <div>
              <dt>Restaurants</dt>
              <dd>{fmt(restaurantCount(s), 0)}</dd>
            </div>
            <div>
              <dt>En stock</dt>
              <dd>{fmt(s.stock, 0)}</dd>
            </div>
            <div>
              <dt>Vendus</dt>
              <dd>{fmt(s.sold, 0)}</dd>
            </div>
            <div>
              <dt title="Ventes − coût des ingrédients, par jour de jeu (1 s = 1 j). Un prix trop haut freine la demande.">
                Revenu net / j
              </dt>
              <dd>{fmt(income, 2)} €</dd>
            </div>
            <div>
              <dt>
                Par clic{" "}
                <span title="Valeur des burgers produits, encaissée à leur vente">
                  ⓘ
                </span>
              </dt>
              <dd>
                {fmt(cpc * s.price, 2)} € <small>({fmt(cpc)} burgers)</small>
              </dd>
            </div>
            <div className="price-row">
              <dt>
                Prix de vente
                {s.counts.trader > 0 && (
                  <small className="price-managed">
                    {" "}
                    ·{" "}
                    {s.elapsed < s.priceHoldUntil
                      ? "équipe en pause"
                      : `équipe ×${s.counts.trader}`}
                  </small>
                )}
              </dt>
              <dd>
                <Button
                  type="button"
                  variant="secondary"
                  className="price-open"
                  aria-label="Régler le prix de vente"
                  onClick={() => {
                    setPriceDraft(String(s.price));
                    setPanel("price");
                  }}
                >
                  {s.price.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Button>
              </dd>
            </div>
            <div>
              <dt
                title={`Confort clients. Sur Terre, au-delà de ${EARTH_PRICE_SOFT_CAP} € la demande s’écroule ; Mars et le spatial multiplient le ticket viable.`}
              >
                Confort ~
                {willingnessToPay(s).toLocaleString("fr-FR", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                })}{" "}
                €
              </dt>
              <dd />
            </div>
          </dl>
        </section>
        <section className="missions-card" aria-label="Missions">
          <div className="card-heading">
            <h2>Missions</h2>
            {s.missionClaims.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="missions-done-trigger"
                onClick={() => setPanel("missions-done")}
              >
                {s.missionClaims.length} réussie
                {s.missionClaims.length > 1 ? "s" : ""}
              </Button>
            )}
          </div>
          {activeMissions.map((m) => {
            const progress = Math.min(m.target, m.progress(s));
            const ready = progress >= m.target;
            return (
              <div
                className={`mission home-mission ${ready ? "ready" : ""}`}
                key={m.id}
              >
                <div className="home-mission-body">
                  <h3>{missionLabel(m, s)}</h3>
                  <div className="mission-meta">
                    <span>
                      {fmt(progress, 0)} / {fmt(m.target, 0)}
                    </span>
                    <span>+{fmt(m.reward)} €</span>
                  </div>
                  <progress
                    aria-label={missionLabel(m, s)}
                    max={m.target}
                    value={progress}
                  />
                </div>
                <Button
                  variant={ready ? "primary" : "outline"}
                  disabled={!ready}
                  onClick={() =>
                    game.update((current) => claimMission(current, m.id))
                  }
                >
                  {ready ? "Récupérer" : "En cours"}
                </Button>
              </div>
            );
          })}
          {activeMissions.length === 0 && (
            <p className="footnote">Toutes les missions sont terminées.</p>
          )}
          {s.counts.cook > 0 && (
            <div className="event-slot">
              {event ? (
                <div className="event">
                  <h3>{event.title}</h3>
                  <p>
                    +{fmt(event.reward)} € · demande ×{event.multiplier} pendant{" "}
                    {event.duration} s.
                  </p>
                  <div className="event-actions">
                    <Button
                      variant="outline"
                      disabled={D(s.money).lt(event.cost)}
                      onClick={() =>
                        game.dispatch({ type: "event", accept: true })
                      }
                    >
                      Participer · {fmt(event.cost)} €
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        game.dispatch({ type: "event", accept: false })
                      }
                    >
                      Passer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="event event-empty" role="status">
                  <h3>
                    {s.elapsed < s.boostUntil
                      ? "Bonus actif"
                      : "Prochain événement"}
                  </h3>
                  <p>
                    {s.elapsed < s.boostUntil
                      ? `Demande ×${s.boost} · ${Math.ceil(s.boostUntil - s.elapsed)} j restants.`
                      : "Une nouvelle occasion arrive bientôt."}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      <section className="control-dock" aria-label="Cuisine">
        <div className="kitchen-heading">
          <Badge variant="secondary">Niveau {level}</Badge>
          <h2>{asset.name}</h2>
          <p>Chaque burger compte.</p>
        </div>
        <nav className="game-actions" aria-label="Actions du jeu">
          {nav.map((v) => (
            <Button
              key={v.id}
              variant="secondary"
              disabled={v.disabled}
              onClick={() => setPanel(v.id)}
            >
              <v.icon aria-hidden="true" size={16} />
              {v.label}
              {notification(v.id) > 0 && (
                <span
                  className="notification-badge"
                  aria-label={`${notification(v.id)} nouveautés`}
                >
                  {notification(v.id) > 19 ? "19+" : notification(v.id)}
                </span>
              )}
            </Button>
          ))}
        </nav>
        <div className="clicker-bar">
          <NativeButton
            className="kitchen-scene"
            aria-label="Préparer un burger depuis le restaurant"
            disabled={!canCook}
            onClick={cook}
          >
            <Image src={asset.image} alt="" width={240} height={240} priority />
            <span className="kitchen-scene-caption">
              {fmt(cpc)} burger{cpc > 1 ? "s" : ""} par clic
            </span>
          </NativeButton>
          <div className="click-particles" aria-live="off">
            {particles.map((p) => (
              <span key={p.id}>{p.text}</span>
            ))}
          </div>
          <Button
            variant="accent"
            className={`clicker-button pulse-${pulse % 2}`}
            disabled={!canCook}
            onClick={cook}
          >
            <ChefHat aria-hidden="true" /> Prépare un burger
          </Button>
          <p title="1 s réelle = 1 jour. Le clic suit ~3 % de ta prod / j. Si la demande suit, le stock reste à 0.">
            Clic {fmt(cpc)} <span>·</span> Prod. {fmt(r.production)}/j{" "}
            <span>·</span> Vente {fmt(Math.min(fundedProduction, r.demand))}/j
          </p>
        </div>
      </section>
      {panel && panel !== "settings" && (
        <Sheet
          title={TITLES[panel]}
          onClose={() => setPanel(null)}
          side={
            panel === "reset" ||
            panel === "prestige" ||
            panel === "missions-done"
              ? "right"
              : "bottom"
          }
          stableHeight={panel === "extensions"}
        >
          {panel === "missions-done" &&
            (s.missionClaims.length > 0 ? (
              <ul className="completed-missions">
                {[...s.missionClaims]
                  .reverse()
                  .map((id) => MISSIONS.find((m) => m.id === id))
                  .filter((m) => m !== undefined)
                  .map((m) => (
                    <li key={m.id} className="completed-mission">
                      <span>{m.title}</span>
                      <Check size={18} aria-label="Réussie" />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="footnote">Aucune mission réussie.</p>
            ))}
          {panel === "price" && (
            <div className="price-sheet">
              <div className="price-sheet-controls">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Baisser le prix"
                  disabled={s.price <= PRICE_MIN}
                  onClick={() => {
                    const next = Math.max(PRICE_MIN, s.price - 0.5);
                    game.dispatch({ type: "price", value: next });
                    setPriceDraft(String(next));
                  }}
                >
                  <Minus />
                </Button>
                <label className="price-sheet-input">
                  <span className="sr-only">Prix en euros</span>
                  <NativeInput
                    type="number"
                    inputMode="decimal"
                    min={PRICE_MIN}
                    max={PRICE_MAX}
                    step={0.5}
                    value={priceDraft}
                    onChange={(event) => setPriceDraft(event.target.value)}
                    onBlur={() => {
                      const parsed = Number(priceDraft.replace(",", "."));
                      if (!Number.isFinite(parsed)) {
                        setPriceDraft(String(s.price));
                        return;
                      }
                      const next = Math.min(
                        PRICE_MAX,
                        Math.max(PRICE_MIN, Math.round(parsed * 2) / 2),
                      );
                      game.dispatch({ type: "price", value: next });
                      setPriceDraft(String(next));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter")
                        (event.target as HTMLInputElement).blur();
                    }}
                  />
                  <span aria-hidden>€</span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Augmenter le prix"
                  disabled={s.price >= PRICE_MAX}
                  onClick={() => {
                    const next = Math.min(PRICE_MAX, s.price + 0.5);
                    game.dispatch({ type: "price", value: next });
                    setPriceDraft(String(next));
                  }}
                >
                  <Plus />
                </Button>
              </div>
              <div className="price-sheet-quick">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const next = willingnessToPay(s);
                    game.dispatch({ type: "price", value: next });
                    setPriceDraft(String(next));
                  }}
                >
                  Confort ({willingnessToPay(s).toLocaleString("fr-FR")} €)
                </Button>
                {s.counts.trader > 0 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const next = optimalPrice(s);
                      game.dispatch({ type: "price", value: next });
                      setPriceDraft(String(next));
                    }}
                  >
                    Conseil équipe ({optimalPrice(s).toLocaleString("fr-FR")} €)
                  </Button>
                )}
              </div>
              <section className="price-sheet-advice" aria-label="Conseils">
                <h3>
                  Équipe des ventes
                  {s.counts.trader > 0
                    ? ` · précision ~${Math.round(traderSkill(s.counts.trader) * 100)} %`
                    : ""}
                </h3>
                <ul>
                  {priceAdvice(s).map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
                <p className="footnote">
                  {spacePriceMultiplier(s) <= 1
                    ? `Au-delà de ${EARTH_PRICE_SOFT_CAP} € sur Terre, presque personne n’achète. Lune / Mars font monter le confort.`
                    : `Confort de fin de partie ~${PRICE_COMFORT_CAP.toLocaleString("fr-FR")} €.`}{" "}
                  Saisie libre jusqu’à {fmt(PRICE_MAX)} € — au-delà du confort,
                  les ventes tombent à zéro.
                </p>
              </section>
            </div>
          )}
          {panel === "level" && (
            <div className="building-offer">
              {upgrade ? (
                <>
                  <Image
                    src={upgrade.image}
                    alt={upgrade.name}
                    width={180}
                    height={180}
                  />
                  <h3>
                    Niveau {upgrade.level} · {upgrade.name}
                  </h3>
                  <p className="footnote">
                    Bonus de niveau ×{upgrade.multiplier} sur la production et
                    les clics.
                  </p>
                  {!upgrade.unlocked && (
                    <p className="footnote">{upgrade.requirement}</p>
                  )}
                  <Button
                    variant="accent"
                    disabled={!upgrade.affordable}
                    onClick={() => {
                      game.dispatch({ type: "level-up" });
                      feedback("buy");
                      if (!settings.levelPopups) game.dismissLevel();
                      setPanel(null);
                    }}
                  >
                    Améliorer · {fmt(upgrade.cost)} €
                  </Button>
                </>
              ) : (
                <p className="footnote">Niveau maximum atteint.</p>
              )}
            </div>
          )}
          {panel === "upgrades" && (
            <>
              <p className="footnote">
                Prix unitaires stables : seule l’inflation du calendrier
                s’applique (+
                {Math.round((timelineInflation(s) - 1) * 100)} % aujourd’hui,
                plafond ~25 %). Les grosses infrastructures restent chères à
                l’unité — on scale en volume.
              </p>
              {visible.bulk && (
                <div className="quantity" aria-label="Quantité d’achat">
                  {([1, 10, 100, "max"] as const).map((q) => (
                    <NativeButton
                      key={q}
                      aria-pressed={quantity === q}
                      onClick={() => setQuantity(q)}
                    >
                      {q === "max" ? "Max" : `×${q}`}
                    </NativeButton>
                  ))}
                </div>
              )}
              {visible.generators.map((g) => {
                const q = affordable(s, g.id, visible.bulk ? quantity : 1);
                return (
                  <div className="upgrade" key={g.id}>
                    <div>
                      <h3>
                        {g.name}
                        <span>{s.counts[g.id]}</span>
                      </h3>
                      <p>
                        {g.id === "trader"
                          ? `Auto-prix · précision ~${Math.round(traderSkill(s.counts.trader + 1) * 100)} % au prochain`
                          : g.production
                            ? `+${fmt(g.production * empire)} burgers / j`
                            : g.demand
                              ? `+${fmt(g.demand)} demande / j`
                              : g.id === "farm"
                                ? "+1 500 ingrédients / j"
                                : "+2 000 distribution / j"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={q === 0}
                      aria-label={`Acheter ${g.name}`}
                      onClick={() => {
                        game.dispatch({
                          type: "buy",
                          id: g.id,
                          quantity: visible.bulk ? quantity : 1,
                        });
                        feedback("buy");
                      }}
                    >
                      {q > 1 ? `×${q} · ` : ""}
                      {fmt(cost(s, g.id, Math.max(1, q)))} €
                    </Button>
                  </div>
                );
              })}
            </>
          )}
          {panel === "research" && (
            <Tabs defaultValue="tech" className="game-tabs">
              <TabsList aria-label="Recherche">
                <TabsTrigger value="tech">Technologies</TabsTrigger>
                <TabsTrigger value="projects">Projets</TabsTrigger>
              </TabsList>
              <TabsContent value="tech">
                {visible.research.length === 0 ? (
                  <p className="empty-state">Aucune recherche disponible.</p>
                ) : (
                  visible.research.map((v) => (
                    <div className="research-item" key={v.id}>
                      <h3>{v.name}</h3>
                      <p>{v.description}</p>
                      <Button
                        variant="outline"
                        disabled={D(s.money).lt(inflatedCost(s, v.cost))}
                        onClick={() =>
                          game.dispatch({ type: "research", id: v.id })
                        }
                      >
                        {fmt(inflatedCost(s, v.cost))} €
                      </Button>
                    </div>
                  ))
                )}
              </TabsContent>
              <TabsContent value="projects">
                {visible.projects.length === 0 && s.projects.length === 0 ? (
                  <p className="empty-state">
                    Aucun projet. Débloquez la franchise pour investir des
                    ressources.
                  </p>
                ) : (
                  <>
                    {visible.projects.map((p) => {
                      const cash = inflatedCost(s, p.money);
                      const ready =
                        D(s.money).gte(cash) &&
                        s.stock >= p.stock &&
                        s.ingredients >= p.ingredients;
                      return (
                        <div className="research-item" key={p.id}>
                          <h3>{p.name}</h3>
                          <p>{p.description}</p>
                          <p className="footnote">
                            {fmt(cash)} €
                            {p.stock > 0 ? ` · ${fmt(p.stock, 0)} burgers` : ""}
                            {p.ingredients > 0
                              ? ` · ${fmt(p.ingredients, 0)} ingrédients`
                              : ""}
                          </p>
                          <Button
                            variant="outline"
                            disabled={!ready}
                            onClick={() =>
                              game.dispatch({ type: "project", id: p.id })
                            }
                          >
                            Lancer
                          </Button>
                        </div>
                      );
                    })}
                    {s.projects.length > 0 && (
                      <ul className="completed-missions">
                        {[...s.projects].reverse().map((id) => {
                          const p = PROJECTS.find((x) => x.id === id);
                          return (
                            <li key={id} className="completed-mission">
                              <span>{p?.name ?? id}</span>
                              <Check size={18} aria-label="Achevé" />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
          {panel === "finance" && (
            <div className="finance-panel">
              <div className="finance-stats">
                <div>
                  <span>Indice BGR</span>
                  <strong>
                    {s.marketIndex.toLocaleString("fr-FR", {
                      maximumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  <span>Fonds investis</span>
                  <strong>{fmt(s.marketFund, 2)} €</strong>
                </div>
              </div>
              <p className="footnote">
                L’indice oscille avec votre activité. Achetez bas, vendez haut —
                ce n’est pas un revenu passif garanti.
              </p>
              <h3 className="section-label">Acheter</h3>
              <div className="finance-actions">
                {([0.25, 0.5, 1] as const).map((fraction) => (
                  <Button
                    key={`buy-${fraction}`}
                    variant="outline"
                    disabled={D(s.money).lte(0)}
                    onClick={() =>
                      game.dispatch({ type: "stock-buy", fraction })
                    }
                  >
                    {fraction === 1 ? "Tout" : `${fraction * 100} %`} cash
                  </Button>
                ))}
              </div>
              <h3 className="section-label">Vendre</h3>
              <div className="finance-actions">
                {([0.25, 0.5, 1] as const).map((fraction) => (
                  <Button
                    key={`sell-${fraction}`}
                    variant="outline"
                    disabled={D(s.marketFund).lte(0)}
                    onClick={() =>
                      game.dispatch({ type: "stock-sell", fraction })
                    }
                  >
                    {fraction === 1 ? "Tout" : `${fraction * 100} %`} fonds
                  </Button>
                ))}
              </div>
            </div>
          )}
          {panel === "extensions" && (
            <Tabs defaultValue="available" className="game-tabs">
              <p className="footnote">
                Emplacements : {s.markets.length} / {restaurantCount(s)}. Siège,
                succursales, extensions et acquisitions comptent chacun pour 1
                restaurant.
              </p>
              <TabsList aria-label="Extensions">
                <TabsTrigger value="available">Disponibles</TabsTrigger>
                <TabsTrigger value="owned">Acquises</TabsTrigger>
              </TabsList>
              {["available", "owned"].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  {visible.markets
                    .filter(
                      (m) => s.markets.includes(m.id) === (tab === "owned"),
                    )
                    .map((m) => (
                      <div className="market-row" key={m.id}>
                        <div>
                          <h3>{m.name}</h3>
                          <p>
                            +{fmt(m.demand)} demande / j · pouvoir d’achat ×
                            {m.power}
                          </p>
                        </div>
                        {s.markets.includes(m.id) ? (
                          <Check size={18} aria-label="Marché ouvert" />
                        ) : (
                          <Button
                            variant="outline"
                            disabled={D(s.money).lt(inflatedCost(s, m.cost))}
                            onClick={() =>
                              game.dispatch({ type: "market", id: m.id })
                            }
                          >
                            {fmt(inflatedCost(s, m.cost))} €
                          </Button>
                        )}
                      </div>
                    ))}
                  {visible.rivals.some(
                    (v) => s.rivals.includes(v.id) === (tab === "owned"),
                  ) && <h3 className="section-label">Acquisitions</h3>}
                  {visible.rivals
                    .filter(
                      (v) => s.rivals.includes(v.id) === (tab === "owned"),
                    )
                    .map((v) => (
                      <div className="market-row" key={v.id}>
                        <div>
                          <h3>{v.name}</h3>
                          <p>
                            {v.share} % du marché · +10 % de demande · +{v.crew}{" "}
                            employés
                          </p>
                        </div>
                        {s.rivals.includes(v.id) ? (
                          <Check size={18} />
                        ) : (
                          <Button
                            variant="outline"
                            disabled={D(s.money).lt(inflatedCost(s, v.cost))}
                            onClick={() =>
                              game.dispatch({ type: "acquire", id: v.id })
                            }
                          >
                            {fmt(inflatedCost(s, v.cost))} €
                          </Button>
                        )}
                      </div>
                    ))}
                  {domination(s) > 0 && (
                    <p className="footnote">
                      Part mondiale : {domination(s)} %
                    </p>
                  )}
                  {!visible.markets.some(
                    (m) => s.markets.includes(m.id) === (tab === "owned"),
                  ) &&
                    !visible.rivals.some(
                      (v) => s.rivals.includes(v.id) === (tab === "owned"),
                    ) && (
                      <p className="footnote">
                        {tab === "owned"
                          ? "Aucune extension acquise."
                          : "Aucune extension disponible."}
                      </p>
                    )}
                </TabsContent>
              ))}
            </Tabs>
          )}
          {(panel === "reset" || panel === "prestige") && (
            <>
              <p className="confirm-text">
                {panel === "reset"
                  ? "La progression du profil actif sera effacée."
                  : `Repartir à zéro avec ${s.capital + prestigeGain(s)} points permanents.`}
              </p>
              <div className="burger-settings-actions">
                <Button
                  variant="secondary"
                  onClick={() => setPanel("settings")}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    game.replace(panel === "reset" ? initial() : prestige(s));
                    try {
                      localStorage.removeItem(seenKey);
                    } catch {
                      /* Optional. */
                    }
                    notices.clear();
                    setPanel(null);
                  }}
                >
                  Confirmer
                </Button>
              </div>
            </>
          )}
        </Sheet>
      )}
      <GameSettingsPanel
        open={panel === "settings"}
        onClose={() => setPanel(null)}
        triggerRef={settingsTriggerRef}
        config={clickerBurgerSettings}
        settings={settings}
        customSections={settingsCustomSections}
        onSettingChange={(id, value) => {
          if (id === "sound") {
            unlockFeel();
            toggleSetting("sound");
          } else if (id === "effectsVolume") {
            const next = Number(value);
            updateSettings({ effectsVolume: next });
            audio.current?.setVolume(next);
          } else if (id === "haptics" || id === "ios") {
            toggleSetting(id);
          } else if (id === "levelPopups") {
            toggleSetting("levelPopups");
            if (settings.levelPopups) game.dismissLevel();
          }
        }}
      />
      {settings.levelPopups && game.levelNotice !== null && (
        <LevelUp level={game.levelNotice} onClose={game.dismissLevel} />
      )}
      {toast && (
        <div role="status" className="toast">
          {toast}
          <NativeButton
            aria-label="Fermer la notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </NativeButton>
        </div>
      )}
    </div>
  );
}
