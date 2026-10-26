"use client";
import Image from "next/image";
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
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { LevelUp } from "./components/LevelUp";
import { Button } from "@/components/ui/button";
import { Sheet } from "./components/Sheet";
import { useAccount, accountSaveKey } from "./auth/useAccount";
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
} from "./engine/game";
import { discoveries } from "./systems/discovery";
import { parseSave, resume, SAVE_KEY } from "./systems/save";
import { visibleMissions, claimMission } from "./data/missions";
import { EVENTS } from "./data/content";
type Panel =
  | "upgrades"
  | "research"
  | "missions"
  | "extensions"
  | "settings"
  | "account"
  | "reset"
  | "prestige"
  | null;
const TITLES: Record<Exclude<Panel, null>, string> = {
  upgrades: "Améliorer",
  research: "Recherche",
  missions: "Missions",
  extensions: "Extensions",
  settings: "Réglages",
  account: "Compte",
  reset: "Recommencer ?",
  prestige: "Faillite stratégique",
};
export default function App({
  backHref = "http://127.0.0.1:3000/fr/jeux",
}: {
  backHref?: string;
}) {
  const account = useAccount();
  const game = useGame(accountSaveKey(account.profile));
  const s = game.state;
  const visible = discoveries(s);
  const r = rates(s);
  const level = buildingLevel(s);
  const asset = BURGER_ASSETS.levels[level - 1];
  const cpc = clickProduction(s);
  const fundedProduction = Math.min(
    r.production,
    s.ingredients + Math.max(0, D(s.money).div(r.ingredientCost).toNumber()),
  );
  const income = Math.min(s.stock + fundedProduction, r.demand) * s.price;
  const [panel, setPanel] = useState<Panel>(null);
  const [menu, setMenu] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [quantity, setQuantity] = useState<number | "max">(1);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("food-empire.theme.v2") ?? "light";
    } catch {
      return "light";
    }
  });
  const [toast, setToast] = useState("");
  const [pulse, setPulse] = useState(0);
  const [particles, setParticles] = useState<{ id: number; text: string }[]>(
    [],
  );
  const particleId = useRef(0);
  const particleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
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
    try {
      localStorage.setItem("food-empire.theme.v2", theme);
    } catch {
      /* Theme is optional. */
    }
  }, [theme]);
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
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
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
  const displayName = account.profile?.name ?? "Invité";
  const initials = account.profile
    ? displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "AU";
  return (
    <div className="clicker-burger" data-theme={theme}>
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
          <div className="account-menu" ref={menuRef}>
            <button
              className="avatar"
              aria-label={`Compte : ${displayName}`}
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {account.profile?.avatar ? (
                <Image
                  width={40}
                  height={40}
                  unoptimized
                  src={account.profile.avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(ev) => {
                    ev.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <span>{initials}</span>
            </button>
            {menu && (
              <div className="dropdown" role="menu">
                <div className="dropdown-heading">
                  <b>{displayName}</b>
                  <small>
                    {account.profile?.kind === "google"
                      ? "Google"
                      : account.profile
                        ? "Profil local"
                        : "Partie invitée"}
                  </small>
                </div>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setProfileName(account.profile?.name ?? "");
                    setPanel("account");
                  }}
                >
                  <UserRound size={16} />
                  Mon profil
                </button>
                {account.profile?.kind === "google" ? (
                  <button
                    role="menuitem"
                    disabled={account.busy}
                    onClick={() => {
                      game.persist();
                      setMenu(false);
                      void account.logout();
                    }}
                  >
                    <LogOut size={16} />
                    Se déconnecter
                  </button>
                ) : (
                  <button
                    role="menuitem"
                    disabled={!account.available || account.busy}
                    onClick={() => {
                      game.persist();
                      setMenu(false);
                      account.login();
                    }}
                  >
                    <GoogleIcon />
                    {account.busy ? "Connexion…" : "Se connecter avec Google"}
                  </button>
                )}
                {!account.available && (
                  <p className="account-hint">
                    {account.online
                      ? "Google n’est pas encore configuré."
                      : "Service de compte indisponible."}
                  </p>
                )}
              </div>
            )}
          </div>
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
          <Image
            key={level}
            className="building-image"
            src={asset.image}
            alt={`${asset.name}, niveau ${level}`}
            width="128"
            height="128"
          />
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
          theme={theme}
        >
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
                    <p>
                      {v.id === "recipe"
                        ? "Production et clics ×2"
                        : v.id === "franchise"
                          ? "Ouvrir de nouvelles villes"
                          : v.id === "coldchain"
                            ? "Coût des ingrédients ÷2"
                            : v.id === "global"
                              ? "Ouvrir de nouveaux marchés"
                              : v.id === "space"
                                ? "Programme orbital · 70 % de domination et 3 mégafactories nécessaires"
                                : "Nouvelles destinations"}
                    </p>
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
            <>
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
                          game.update((current) => claimMission(current, m.id))
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
              {missions.some((m) => s.missionClaims.includes(m.id)) && (
                <Accordion
                  type="single"
                  collapsible
                  className="mission-history"
                >
                  <AccordionItem value="completed">
                    <AccordionTrigger>Missions réussies</AccordionTrigger>
                    <AccordionContent>
                      {missions
                        .filter((m) => s.missionClaims.includes(m.id))
                        .map((m) => (
                          <p
                            key={m.id}
                            className="completed-mission"
                            aria-disabled="true"
                          >
                            {m.title}
                          </p>
                        ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
              {s.event >= 0 && s.counts.cook > 0 && (
                <div className="event">
                  <h3>{EVENTS[s.event].title}</h3>
                  <p>
                    Demande ×{EVENTS[s.event].multiplier} pendant{" "}
                    {EVENTS[s.event].duration} s.
                  </p>
                  <div className="settings-actions">
                    <Button
                      variant="outline"
                      disabled={D(s.money).lt(EVENTS[s.event].cost)}
                      onClick={() =>
                        game.dispatch({ type: "event", accept: true })
                      }
                    >
                      {EVENTS[s.event].cost} €
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
              )}
            </>
          )}
          {panel === "extensions" && (
            <>
              {visible.markets.map((m) => (
                <div className="market-row" key={m.id}>
                  <div>
                    <h3>{m.name}</h3>
                    <p>
                      +{fmt(m.demand)} demande / s · pouvoir d’achat ×{m.power}
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
              {visible.rivals.length > 0 && (
                <h3 className="section-label">Acquisitions</h3>
              )}
              {visible.rivals.map((v) => (
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
                <p className="footnote">Part mondiale : {domination(s)} %</p>
              )}
            </>
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
          {panel === "account" && (
            <>
              <div className="profile-summary">
                <span className="profile-avatar">{initials}</span>
                <div>
                  <h3>{displayName}</h3>
                  <p>
                    {account.profile?.kind === "google"
                      ? "Compte Google"
                      : account.profile
                        ? "Profil local"
                        : "Invité"}
                  </p>
                </div>
              </div>
              {account.profile?.kind !== "google" && (
                <form
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    game.persist();
                    void account.saveProfile(profileName).then((ok) => {
                      if (ok) setToast("Profil enregistré.");
                    });
                  }}
                >
                  <label className="profile-label">
                    Pseudo
                    <input
                      required
                      minLength={2}
                      maxLength={20}
                      value={profileName}
                      onChange={(ev) => setProfileName(ev.target.value)}
                      placeholder="Votre pseudo"
                      autoComplete="nickname"
                    />
                  </label>
                  <Button
                    variant="outline"
                    disabled={account.busy}
                    type="submit"
                  >
                    {account.profile ? "Enregistrer" : "Créer un profil local"}
                  </Button>
                </form>
              )}
              {account.profile?.kind === "local" && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    game.persist();
                    account.playGuest();
                  }}
                >
                  Jouer en invité
                </Button>
              )}
              {!account.profile && account.hasLocalProfile && (
                <Button
                  variant="outline"
                  onClick={() => {
                    game.persist();
                    account.selectLocal();
                  }}
                >
                  Reprendre mon profil local
                </Button>
              )}
              <div className="account-connect">
                {account.profile?.kind === "google" ? (
                  <Button
                    variant="outline"
                    disabled={account.busy}
                    onClick={() => {
                      game.persist();
                      void account.logout();
                    }}
                  >
                    <LogOut />
                    Se déconnecter
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    disabled={!account.available || account.busy}
                    onClick={() => {
                      game.persist();
                      account.login();
                    }}
                  >
                    <GoogleIcon />
                    {account.busy ? "Connexion…" : "Se connecter avec Google"}
                  </Button>
                )}
                {!account.available && (
                  <p className="footnote">
                    {account.online
                      ? "La connexion Google nécessite la configuration Supabase du service Tetris."
                      : "Le service de compte doit être démarré sur cet ordinateur."}
                  </p>
                )}
              </div>
              {account.profile && (
                <div className="guest-copy">
                  <p className="footnote">
                    Chaque profil possède sa sauvegarde sur cet appareil.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        const guest = localStorage.getItem(SAVE_KEY);
                        if (!guest) throw Error("Aucune partie invitée.");
                        if (
                          s.manual > 0 ||
                          D(s.earned).gt(0) ||
                          s.capital > 0 ||
                          s.stock > 0 ||
                          s.missionClaims.length > 0 ||
                          Object.values(s.counts).some((n) => n > 0) ||
                          !D(s.money).eq(20)
                        ) {
                          setToast(
                            "Exportez votre progression avant de remplacer cette partie.",
                          );
                          return;
                        }
                        game.replace(resume(parseSave(guest)).state);
                        setToast("Partie invitée copiée dans ce profil.");
                      } catch (error) {
                        setToast(
                          error instanceof Error
                            ? error.message
                            : "Copie impossible.",
                        );
                      }
                    }}
                  >
                    Reprendre ma partie invitée
                  </Button>
                </div>
              )}
              {account.error && (
                <p className="error-message" role="alert">
                  {account.error}
                </p>
              )}
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
      {game.levelNotice !== null && (
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
function GoogleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21 12.2c0-.7-.1-1.4-.2-2.1H12v4h5a4.3 4.3 0 0 1-1.9 2.8v2.4h3.1c1.8-1.7 2.8-4.1 2.8-7.1Z"
        fill="currentColor"
      />
      <path
        d="M12 21c2.5 0 4.6-.8 6.2-2.2l-3.1-2.4c-.8.5-1.8.8-3.1.8-2.4 0-4.4-1.6-5.1-3.8H3.7v2.5A9.3 9.3 0 0 0 12 21Zm-5.1-7.6a5.6 5.6 0 0 1 0-2.8V8.1H3.7a9 9 0 0 0 0 7.8l3.2-2.5ZM12 6.8c1.4 0 2.6.5 3.5 1.4l2.7-2.7A8.7 8.7 0 0 0 12 3a9.3 9.3 0 0 0-8.3 5.1l3.2 2.5C7.6 8.4 9.6 6.8 12 6.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
