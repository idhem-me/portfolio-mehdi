"use client";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useIdentityState } from "@/features/account/client-store";
import { PlayerProfileButton } from "@/features/account/ui/profile-button";
import { useLevelPopups } from "./state/usePreferences";
import { Switch } from "@/components/ui/switch";
import { useNotices } from "./state/useNotices";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Settings,
  Sun,
  Moon,
  Minus,
  Plus,
  Download,
  Upload,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LevelUp } from "./components/LevelUp";
import { Button } from "@/components/ui/button";
import { Sheet } from "./components/Sheet";
import { accountSaveKey } from "./auth/useAccount";
import { useGame } from "./state/useGame";
import { BURGER_ASSETS } from "./assets/game-assets";
import {
  buildingLevel,
  clickProduction,
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
} from "./engine/game";
import { discoveries } from "./systems/discovery";
import { parseSave, resume } from "./systems/save";
import { visibleMissions, claimMission } from "./data/missions";
type Panel =
  | "level"
  | "upgrades"
  | "research"
  | "missions"
  | "extensions"
  | "settings"
  | "reset"
  | "prestige"
  | null;
const TITLES: Record<Exclude<Panel, null>, string> = {
  level: "Améliorer le bâtiment",
  upgrades: "Améliorer",
  research: "Recherche",
  missions: "Missions",
  extensions: "Extensions",
  settings: "Réglages",
  reset: "Recommencer ?",
  prestige: "Faillite stratégique",
};
export default function App({
  backHref = "http://127.0.0.1:3000/fr/jeux",
}: {
  backHref?: string;
}) {
  const account = useIdentityState();
  const { resolvedTheme, setTheme } = useTheme();
  const theme = resolvedTheme ?? "light";
  const popups = useLevelPopups();
  const game = useGame(accountSaveKey(account.profile));
  const s = game.state;
  const visible = discoveries(s);
  const r = rates(s);
  const level = buildingLevel(s);
  const asset = BURGER_ASSETS.levels[level - 1];
  const cpc = clickProduction(s);
  const upgrade = upgradeOffer(s);
  const event = eventOffer(s);
  const fundedProduction = Math.min(
    r.production,
    s.ingredients + Math.max(0, D(s.money).div(r.ingredientCost).toNumber()),
  );
  const income = Math.min(s.stock + fundedProduction, r.demand) * s.price;
  const [panel, setPanel] = useState<Panel>(null);
  const [quantity, setQuantity] = useState<number | "max">(1);
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const [particles, setParticles] = useState<{ id: number; text: string }[]>(
    [],
  );
  const particleId = useRef(0);
  const particleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const file = useRef<HTMLInputElement>(null);
  const missions = visibleMissions(s);
  const groups = {
    upgrades: visible.generators.map((g) => g.id),
    research: visible.research.map((v) => v.id),
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
  };
  const groupSignature = JSON.stringify(groups);
  const seenKey = `${game.key}.seen`;
  const notices = useNotices(seenKey);
  const { seen } = notices;
  const { mark: markNotices } = notices;
  useEffect(() => {
    if (!panel) return;
    const ids = (JSON.parse(groupSignature) as Record<string, string[]>)[panel];
    if (ids) markNotices(panel, ids);
  }, [panel, groupSignature, markNotices]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => () => particleTimers.current.forEach(clearTimeout), []);
  const cook = () => {
    if (!canCook) return;
    game.dispatch({ type: "cook" });
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
  const canCook =
    s.ingredients >= cpc ||
    D(s.money).gte(D(cpc - s.ingredients).mul(r.ingredientCost));
  const notification = (id: keyof typeof groups) =>
    groups[id].filter(
      (key) => !Array.isArray(seen[id]) || !seen[id].includes(key),
    ).length;
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
    if (!f) return;
    try {
      if (f.size > 2000000) throw Error("Fichier trop volumineux.");
      game.replace(resume(parseSave(await f.text())).state);
      setToast("Sauvegarde importée.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Import impossible.");
    }
    if (file.current) file.current.value = "";
  }
  const nav = [
    {
      id: "upgrades",
      label: "Améliorer",
      disabled: groups.upgrades.length === 0,
    },
    {
      id: "research",
      label: "Recherche",
      disabled: groups.research.length === 0,
    },
    { id: "missions", label: "Missions", disabled: false },
    {
      id: "extensions",
      label: "Extensions",
      disabled: groups.extensions.length === 0,
    },
  ] as const;
  return (
    <div className="clicker-burger">
      <header className="game-header">
        <Button
          variant="outline"
          size="icon"
          aria-label="Retour"
          onClick={() => {
            if (panel) setPanel(null);
            else {
              game.persist();
              location.assign(backHref);
            }
          }}
        >
          <ArrowLeft />
        </Button>
        <h1>Clicker Burger</h1>
        <div className="header-actions">
          <Button
            variant="outline"
            size="icon"
            aria-label="Réglages"
            onClick={() => setPanel("settings")}
          >
            <Settings />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={
              theme === "light"
                ? "Activer le thème sombre"
                : "Activer le thème clair"
            }
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
          <PlayerProfileButton />
        </div>
      </header>
      <main className="home">
        <section className="balance-row" aria-label="Progression">
          <div className="cash">
            <span>Trésorerie</span>
            <strong title={`${s.money} €`}>{fmt(s.money, 2)} €</strong>
            <small>
              {asset.name} · Niv. {level}
            </small>
          </div>
          <button
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
          </button>
        </section>
        <section className="restaurant-card">
          <div className="card-heading">
            <h2>Restaurant</h2>
            <span>×{levelMultiplier(s)}</span>
          </div>
          <dl className="metrics">
            <div>
              <dt>En stock</dt>
              <dd>{fmt(s.stock, 0)}</dd>
            </div>
            <div>
              <dt>Vendus</dt>
              <dd>{fmt(s.sold, 0)}</dd>
            </div>
            <div>
              <dt>Revenu / s</dt>
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
              <dt>Prix de vente</dt>
              <dd>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Baisser le prix"
                  disabled={s.price <= 1}
                  onClick={() =>
                    game.dispatch({ type: "price", value: s.price - 0.5 })
                  }
                >
                  <Minus />
                </Button>
                <span>
                  {s.price.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Augmenter le prix"
                  disabled={s.price >= 20}
                  onClick={() =>
                    game.dispatch({ type: "price", value: s.price + 0.5 })
                  }
                >
                  <Plus />
                </Button>
              </dd>
            </div>
          </dl>
        </section>
      </main>
      <div className="control-dock">
        <nav className="game-actions" aria-label="Actions du jeu">
          {nav.map((v) => (
            <Button
              key={v.id}
              variant="outline"
              disabled={v.disabled}
              onClick={() => setPanel(v.id)}
            >
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
            Prépare un burger
          </Button>
          <p>
            Multiplicateur ×{fmt(cpc)} <span>·</span> {fmt(r.production)}{" "}
            burgers / s
          </p>
        </div>
      </div>
      {panel && (
        <Sheet
          title={TITLES[panel]}
          onClose={() => setPanel(null)}
          stableHeight={panel === "missions" || panel === "extensions"}
        >
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
                    Multiplicateur ×{upgrade.multiplier}.
                  </p>
                  {!upgrade.unlocked && (
                    <p className="footnote">{upgrade.requirement}</p>
                  )}
                  <Button
                    variant="accent"
                    disabled={!upgrade.affordable}
                    onClick={() => {
                      game.dispatch({ type: "level-up" });
                      if (!popups.enabled) game.dismissLevel();
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
              {visible.bulk && (
                <div className="quantity" aria-label="Quantité d’achat">
                  {([1, 10, 100, "max"] as const).map((q) => (
                    <button
                      key={q}
                      aria-pressed={quantity === q}
                      onClick={() => setQuantity(q)}
                    >
                      {q === "max" ? "Max" : `×${q}`}
                    </button>
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
                        {g.production
                          ? `+${fmt(g.production * cpc)} burgers / s`
                          : g.demand
                            ? `+${fmt(g.demand)} demande / s`
                            : g.id === "farm"
                              ? "+35 ingrédients / s"
                              : "+60 distribution / s"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={q === 0}
                      aria-label={`Acheter ${g.name}`}
                      onClick={() =>
                        game.dispatch({
                          type: "buy",
                          id: g.id,
                          quantity: visible.bulk ? quantity : 1,
                        })
                      }
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
            <>
              {visible.research.length === 0 ? (
                <p className="empty-state">Aucune recherche disponible.</p>
              ) : (
                visible.research.map((v) => (
                  <div className="research-item" key={v.id}>
                    <h3>{v.name}</h3>
                    <p>{v.description}</p>
                    <Button
                      variant="outline"
                      disabled={D(s.money).lt(v.cost)}
                      onClick={() =>
                        game.dispatch({ type: "research", id: v.id })
                      }
                    >
                      {fmt(v.cost)} €
                    </Button>
                  </div>
                ))
              )}
            </>
          )}
          {panel === "missions" && (
            <Tabs defaultValue="current" className="game-tabs">
              <TabsList aria-label="Missions">
                <TabsTrigger value="current">En cours</TabsTrigger>
                <TabsTrigger value="completed">Réussies</TabsTrigger>
              </TabsList>
              <TabsContent value="current">
                {missions
                  .filter((m) => !s.missionClaims.includes(m.id))
                  .map((m) => {
                    const claimed = s.missionClaims.includes(m.id);
                    const progress = Math.min(m.target, m.progress(s));
                    return (
                      <div
                        className={`mission ${claimed ? "claimed" : ""}`}
                        key={m.id}
                      >
                        <h3>{m.title}</h3>
                        <div className="mission-meta">
                          <span>
                            {fmt(progress, 0)} / {fmt(m.target, 0)}
                          </span>
                          <span>+{fmt(m.reward)} €</span>
                        </div>
                        <progress max={m.target} value={progress} />
                        <Button
                          variant="outline"
                          disabled={claimed || progress < m.target}
                          onClick={() =>
                            game.update((current) =>
                              claimMission(current, m.id),
                            )
                          }
                        >
                          {claimed ? (
                            <>
                              <Check />
                              Récompense reçue
                            </>
                          ) : (
                            "Récupérer"
                          )}
                        </Button>
                      </div>
                    );
                  })}
                {s.counts.cook > 0 && (
                  <div className="event-slot">
                    {event ? (
                      <div className="event">
                        <h3>{event.title}</h3>
                        <p>
                          +{fmt(event.reward)} € · demande ×{event.multiplier}{" "}
                          pendant {event.duration} s.
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
                            ? `Demande ×${s.boost} · ${Math.ceil(s.boostUntil - s.elapsed)} s restantes.`
                            : "Une nouvelle occasion arrive bientôt."}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="completed">
                {missions.some((m) => s.missionClaims.includes(m.id)) ? (
                  <ul className="completed-missions">
                    {[...s.missionClaims]
                      .reverse()
                      .map((id) => missions.find((m) => m.id === id))
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
                )}
              </TabsContent>
            </Tabs>
          )}
          {panel === "extensions" && (
            <Tabs defaultValue="available" className="game-tabs">
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
                            +{fmt(m.demand)} demande / s · pouvoir d’achat ×
                            {m.power}
                          </p>
                        </div>
                        {s.markets.includes(m.id) ? (
                          <Check size={18} aria-label="Marché ouvert" />
                        ) : (
                          <Button
                            variant="outline"
                            disabled={D(s.money).lt(m.cost)}
                            onClick={() =>
                              game.dispatch({ type: "market", id: m.id })
                            }
                          >
                            {fmt(m.cost)} €
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
                          <p>{v.share} % du marché · +10 % de demande</p>
                        </div>
                        {s.rivals.includes(v.id) ? (
                          <Check size={18} />
                        ) : (
                          <Button
                            variant="outline"
                            disabled={D(s.money).lt(v.cost)}
                            onClick={() =>
                              game.dispatch({ type: "acquire", id: v.id })
                            }
                          >
                            {fmt(v.cost)} €
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
          {panel === "settings" && (
            <>
              <div className="settings-row">
                <span>Apparence</span>
                <Button
                  variant="outline"
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                >
                  {theme === "light" ? <Sun /> : <Moon />}
                  {theme === "light" ? "Clair" : "Sombre"}
                  <ChevronDown size={14} />
                </Button>
              </div>
              <div className="settings-row">
                <label htmlFor="level-popups">Popups de félicitation</label>
                <Switch
                  id="level-popups"
                  checked={popups.enabled}
                  onCheckedChange={(value) => {
                    popups.setEnabled(value);
                    if (!value) game.dismissLevel();
                  }}
                />
              </div>
              <h3>Sauvegarde</h3>
              <p className="footnote">
                {game.saved
                  ? "Automatique sur cet appareil"
                  : "Enregistrement indisponible"}{" "}
                · hors ligne : 8 h maximum.
              </p>
              <div className="settings-actions">
                <Button variant="outline" onClick={exportSave}>
                  <Download />
                  Exporter
                </Button>
                <Button variant="outline" onClick={() => file.current?.click()}>
                  <Upload />
                  Importer
                </Button>
                <input
                  hidden
                  type="file"
                  accept=".json,application/json"
                  ref={file}
                  onChange={(ev) => void importSave(ev.target.files?.[0])}
                />
              </div>
              {game.error && (
                <>
                  <p role="alert" className="error-message">
                    {game.error}
                  </p>
                  <Button variant="outline" onClick={game.allowSave}>
                    Remplacer la sauvegarde illisible
                  </Button>
                </>
              )}
              {visible.prestige && (
                <div className="prestige">
                  <h3>Faillite stratégique</h3>
                  <p className="footnote">
                    Gain : +{prestigeGain(s)} points permanents. Capital actuel
                    : {s.capital}.
                  </p>
                  <Button
                    variant="outline"
                    disabled={prestigeGain(s) < 1}
                    onClick={() => setPanel("prestige")}
                  >
                    Liquider
                  </Button>
                </div>
              )}
              <Button variant="destructive" onClick={() => setPanel("reset")}>
                Recommencer
              </Button>
            </>
          )}
          {(panel === "reset" || panel === "prestige") && (
            <>
              <p className="confirm-text">
                {panel === "reset"
                  ? "La progression du profil actif sera effacée."
                  : `Repartir à zéro avec ${s.capital + prestigeGain(s)} points permanents.`}
              </p>
              <div className="settings-actions">
                <Button variant="outline" onClick={() => setPanel("settings")}>
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
      {popups.enabled && game.levelNotice !== null && (
        <LevelUp level={game.levelNotice} onClose={game.dismissLevel} />
      )}
      {toast && (
        <div role="status" className="toast">
          {toast}
          <button
            aria-label="Fermer la notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
