# Audit de sécurité — portfolio-mehdi

> État initial audité, conservé pour traçabilité. Les correctifs et leur validation sont suivis dans [SECURITY_REMEDIATION.md](SECURITY_REMEDIATION.md). Les lignes ci-dessous désignent le code avant correction.

## 1. Résumé exécutif

**Date : 31 octobre 2026 (Europe/Paris). Note indicative : 6/10 — protections solides sur les données métier, exposition et résistance aux abus à renforcer.** Cette note est qualitative, pas un score CVSS ni une certification.

Le dépôt utilise **Next.js 16.4.2, App Router exclusivement**, React/React DOM 19.3.0, Supabase JS 2.118.0 et Supabase SSR 0.12.7 (versions du lockfile et des modules installés concordantes). `src/proxy.ts` remplace ici `middleware.ts`. Le code métier vérifie généralement l'identité et la propriété des ressources, et tous les objets `public` créés dans les scripts SQL examinés ont la RLS activée.

Le point le plus urgent est **sharp 0.34.5**, dépendance vulnérable utilisée sur des images contrôlées par les utilisateurs. Les autres priorités sont le partage public de sessions individuelles du back-office, l'absence de limitation du login administrateur et le jeton de session administrateur réutilisable sans expiration serveur. Le caractère public du back-office est documenté : le rapport le traite comme une décision de confidentialité à réexaminer, sans prétendre avoir découvert un contournement d'une authentification existante.

| Sévérité des constats applicatifs | Nombre |
|---|---:|
| 🔴 Critique | 0 |
| 🟠 Élevée | 1 |
| 🟡 Moyenne | 7 |
| 🔵 Faible | 4 |
| ⚪ Info / défense en profondeur | 3 |
| **Total** | **15** |

**Comptage distinct npm :** 24 paquets affectés (0 critique, 2 élevés, 19 moyens, 3 faibles), issus de 6 avis racines. Les dépendances et leurs effets transitifs ne sont pas 24 failles applicatives indépendantes. `sharp` est compté dans SEC-001 ; les autres avis sont regroupés dans SEC-012.

### Méthode et limites

- Lecture du code courant, de 17 migrations Supabase, des 3 scripts `docs/sql/*.sql`, du script SQL de test Cartes, des configurations et des chemins d'import serveur/client.
- Analyse de `git log --all -p` sur **162 commits accessibles**, des chemins `.env*` historiques et des fichiers suivis. Recherche de formats de clés, JWT, clés privées et affectations littérales suspectes. Aucun secret privilégié réel détecté avec ces recherches ; le seul littéral long ressemblant à un jeton est une fixture de test. Ce n'est pas une garantie sur les commits inaccessibles, les objets supprimés ou tout secret sans format reconnaissable.
- Lecture du guide installé `node_modules/next/dist/docs/01-app/02-guides/data-security.md` et consultation des avis officiels actuels. L'index Markdown du changelog Supabase n'a pas pu être lu par l'outil web (type MIME non pris en charge) ; aucune API Supabase n'a été modifiée.
- `npm audit --json --ignore-scripts` exécuté avec accès au registre après un premier échec DNS dans l'environnement restreint. Aucun `audit fix`, installation ou script de dépendance exécuté.
- **18 tests passent**, 0 échec : `node --import tsx --test tests/backoffice.test.ts tests/gift-lists.test.ts tests/gift-product-metadata.test.ts`. PostgreSQL embarqué PGlite et simulations réseau ; aucune connexion à la base de production.
- Vérifications locales supplémentaires : garde back-office acceptant un cookie fabriqué ; validation d'une collection fabriquée contenant 1 000 000 de copies ; conservation d'une URI SVG encodée par le sanitizer. Aucun exploit natif ni test de charge effectué.
- Aucun dashboard distant inspecté, aucune requête d'attaque contre le site publié, aucun secret local affiché. Les protections Vercel et l'état SQL réellement déployé restent à confirmer.
- **Seul ce rapport est créé. Aucun correctif appliqué.** Le dépôt contenait des modifications utilisateur avant l'audit ; d'autres changements ont été observés pendant la lecture, notamment le shell du back-office. Les lignes sont celles du workspace examiné, pas nécessairement celles du dernier commit.

### Cartographie des surfaces

| Surface | Localisation et contrôle observé |
|---|---|
| Pages | `src/app`, groupes `(site)`, `(game)`, `(gifts)`, `(dashboard)`, `(playground)` ; locales fr/en/zh/ar/es/it/de ; aucun `pages/api` trouvé |
| API | **27 fichiers `route.ts`**, inventaire complet ci-dessous |
| Server Actions | Aucune directive `'use server'` / `"use server"` trouvée dans le code applicatif |
| Proxy | `src/proxy.ts` : internationalisation, publication des jeux, protection `/dashboard` et `/api/analytics` ; pas de rafraîchissement Supabase global |
| Auth | `src/features/tetris/server/auth.ts` : SSR par requête, `auth.getUser()`, cookies HttpOnly limités à `/api/tetris`, réponses privées sans cache |
| Clients privilégiés | `src/lib/backoffice/server.ts`, `src/features/gift-lists/server/api.ts`, `src/features/cards/server/{progress-store,save-choice}.ts`, `src/features/tetris/server/{store,supabase-store}.ts`, route Cartes compte ; appels depuis des routes serveur |
| Données | Supabase principal ; alternatives SQLite locale et Turso dans les adaptateurs Tetris/Cartes ; absence de backend persistant sur Vercel traitée explicitement |
| SQL | 17 migrations ; base cadeaux dans `docs/sql/gift-lists.sql`, compléments occasion et couverture ; ne pas confondre absence dans migrations et absence du dépôt |
| Stockage | Bucket privé `avatars`, conversion serveur WebP ; couvertures en data URI ; outils image/PDF exécutés côté navigateur |
| Services tiers | PostHog, Clarity, Vercel Analytics après consentement initial ; Web3Forms depuis le navigateur |
| Cron | `vercel.json` → `/api/cron/purge`, quotidien à 03:00 UTC ; contrôle Bearer `CRON_SECRET` |
| Paiements / Realtime / Edge Functions | Aucun prestataire de paiement, canal Supabase Realtime ni Edge Function Supabase trouvé ; contributions cadeaux déclaratives, crédits Cartes gratuits par conception |

### Matrice d'accès de toutes les routes

Préfixes abrégés uniquement dans ce tableau. « Origine » est un contrôle CSRF, pas une authentification ni une protection anti-bot.

| Route sous `/api` | Méthodes | Authentification / autorisation / validation |
|---|---|---|
| `analytics/summary` | GET | Cookie dashboard via proxy seulement ; période bornée 7/30 ; SEC-014 |
| `assets/svg/[...path]` | GET | Public ; segments et confinement sous `public` ; CSP sandbox ; SEC-015 |
| `backoffice/stats` | GET | Consentement seulement ; plages autorisées ; SEC-002 |
| `backoffice/sessions` | GET | Consentement seulement ; tri autorisé, pagination 15 ; données de tous les visiteurs ; SEC-002 |
| `backoffice/sessions/[id]` | GET | Consentement seulement ; UUID validé, aucun propriétaire exigé ; SEC-002 |
| `backoffice/me` | GET, DELETE | UUID du header fait autorité ; GET avec consentement, DELETE avec contrôle d'origine ; SEC-007 |
| `track` | POST | Consentement, origine, Zod, taille 2 Ko après lecture ; UUID choisis par client ; SEC-005/007 |
| `contact` | POST | Répond 410, n'envoie aucun email |
| `cron/purge` | GET | Refus si secret absent ou Bearer incorrect |
| `dashboard/login` | POST | Mot de passe partagé, sans limite ni contrôle d'origine explicite ; SEC-003/004 |
| `dashboard/logout` | POST | Efface uniquement le cookie du navigateur ; pas de révocation serveur |
| `gifts/[slug]` | GET, POST | Lecture publique par capacité 80 bits ; réservation scoped slug + item dans SQL, Zod, origine et budget local |
| `gifts/cancel` | POST | Capacité 256 bits ; JSON et origine ; aucun GET destructif |
| `tetris/gifts` | GET, POST | `getUser()` Google/Apple ; filtre propriétaire, schémas Zod ; `ownedList` avant chaque mutation d'une liste existante |
| `tetris/gifts/extract` | POST | Compte vérifié, origine obligatoire, JSON borné, budget/concurrence locaux, protection SSRF |
| `tetris/auth` | GET, POST | Identité validée, DTO limité ; POST déconnecte avec origine |
| `tetris/auth/google` | GET | Démarre OAuth PKCE ; retour limité par `safeGamePath` |
| `tetris/auth/apple` | GET | Même contrôle, provider activé par configuration serveur |
| `tetris/auth/callback` | GET | Échange du code, `getUser()`, contrôle provider, retour interne validé ; ticket à usage unique |
| `tetris/auth/credential` | GET, POST | ID Google public et nonce ; POST origine, nonce constant-time, Supabase vérifie le token |
| `tetris/cards` | GET, PUT | Ancienne sauvegarde complète retirée, 410 |
| `tetris/cards/account` | POST | `getUser()` ou création invité Supabase ; opérations whitelistées puis RPC liées à `auth.uid()` ; SEC-009 |
| `tetris/cards/avatar` | GET, POST | `getUser()` ; lecture chemin utilisateur, achat cosmétique requis pour upload, signature/taille et WebP ; erreurs brutes SEC-011 |
| `tetris/profile` | GET, POST | Compte vérifié ou capacité aléatoire locale `lava-player` ; origine en POST, validations profil/avatar |
| `tetris/sessions` | POST | Public si jeu actif ; capacité locale aléatoire ; origine et budget SQL par propriétaire |
| `tetris/leaderboard` | GET, POST | Classement public ; POST vérifie session de jeu/replay et identité déclarée Google/Apple ; montant du score recalculé serveur |
| `tetris/local-scores` | POST | Capacité locale et profil existant, session propriétaire et replay ; contrôle d'origine |

## 2. Liste détaillée des vulnérabilités

Les extraits « avant » sont issus directement du dépôt. Les blocs « après » sont des propositions **non appliquées**. Les helpers d'authentification, budget distribué et stockage de sessions proposés sont des contrats à implémenter, pas des fonctions déjà disponibles. Les scénarios non exécutés contre un service sont explicitement distingués des vérifications locales.

### SEC-001 — Décodeur sharp vulnérable sur des images utilisateur

| Champ | Contenu |
|---|---|
| **ID** | SEC-001 |
| **Titre** | Décodeur sharp vulnérable sur des images utilisateur |
| **Sévérité** | 🟠 Élevée |
| **Catégorie** | OWASP A06 — Vulnerable and Outdated Components |
| **Localisation** | package-lock.json:13761 ; src/features/gift-lists/server/cover-image.ts:12 ; src/app/api/tetris/cards/avatar/route.ts:29 |
| **Description** | Le lockfile impose sharp 0.34.5. npm remonte trois avis élevés sur libvips, libheif et librsvg. Le serveur cadeaux appelle metadata() avant de vérifier le format réel : le préfixe data:image/png est fourni par le client. La route avatar possède, elle, un contrôle de signature préalable et réduit la surface. Une exécution de code dans cette application n’a pas été démontrée ; elle dépend du codec atteint, du binaire natif et du runtime. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un compte créateur envoie une couverture déclarée PNG dont les octets ciblent un lecteur natif vulnérable. Le lecteur est sollicité avant le rejet du format. Aucun fichier malveillant natif n’a été testé. |
| **Impact** | Corruption mémoire ou déni de service selon le codec ; les avis libheif/librsvg décrivent une RCE conditionnelle sous Linux glibc. Le processus applicatif dispose de secrets serveur : priorité élevée. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible à moyen |

**Preuve / avant**

`package-lock.json:13761`

```json
    "node_modules/sharp": {
      "version": "0.34.5",
      "resolved": "https://registry.npmjs.org/sharp/-/sharp-0.34.5.tgz",
      "integrity": "sha512-Ou9I5Ft9WNcCbXrU9cMgPBcCK8LiwLqcbywW3t4oDV37n1pzpuNLsYiAV8eODnjbtQlSDwZ2cUEeQz4E54Hltg==",
```
`src/features/gift-lists/server/cover-image.ts:12`

```ts
  const bytes = Buffer.from(value.slice(value.indexOf(",") + 1), "base64");
  const image = sharp(bytes, { limitInputPixels: 36_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format ?? ""))
    throw new Error("invalid_image");
```

**Correctif / après proposé**

Mettre à jour **la dépendance directe** et le lockfile vers sharp **0.35.5 ou supérieur corrigé**, puis vérifier le binaire réellement installé. Next.js récent ne suffit pas à corriger la dépendance directe explicitement présente.

```json
// avant (package.json)
"sharp": "^0.34.5"
// après proposé
"sharp": "0.35.5"
```

Avant tout appel à sharp, réutiliser `imageSignature` (`src/features/cards/avatar/validate.ts`) sur les octets de couverture et exiger une signature PNG/JPEG/WebP ; bloquer en défense supplémentaire les loaders non nécessaires avec `sharp.block`. Préserver les limites pixels et la réencodage. Tester images valides, formats déguisés, limite de taille et parcours upload.

Sources : [libvips](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj), [libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), [librsvg](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).

### SEC-002 — Sessions individuelles du back-office accessibles à tout visiteur

| Champ | Contenu |
|---|---|
| **ID** | SEC-002 |
| **Titre** | Sessions individuelles du back-office accessibles à tout visiteur |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A01 — Broken Access Control / confidentialité |
| **Localisation** | src/lib/backoffice/server.ts:11 ; src/app/api/backoffice/sessions/route.ts:3 ; src/app/api/backoffice/sessions/[id]/route.ts:10 |
| **Description** | Le cookie analytics_consent=granted est le seul prérequis aux lectures globales. Ce cookie est une préférence choisie côté navigateur, pas une identité. Les réponses exposent les identifiants de sessions, pays, navigateur, horaires, chemins et détails de jeux. visitor_id est retiré, ce qui réduit mais ne supprime pas la granularité individuelle. docs/backoffice.md décrit explicitement un back-office public : il s’agit d’un risque de publication de données pseudonymes à arbitrer, pas d’une fuite de comptes Supabase. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un appelant place lui-même le cookie, parcourt GET /api/backoffice/sessions puis lit chaque session par son id. Vérification locale : guard sans cookie retourne 403 ; avec cookie fabriqué, la garde accepte. Aucune lecture de production effectuée. |
| **Impact** | Collecte et corrélation de comportements individuels ; automatisation de l’énumération. Pas de preuve de fuite de noms de comptes ou d’emails via ces routes. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/lib/backoffice/server.ts:11`

```ts
export function guard(r: Request) {
  if (
    !(r.headers.get("cookie") || "")
      .split(";")
      .some((c) => c.trim() === "analytics_consent=granted")
  )
    return Response.json({ error: "Consent required" }, { status: 403 });
}
```
`src/app/api/backoffice/sessions/route.ts:3`

```ts
export async function GET(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  const p = new URL(r.url).searchParams;
  const page = Math.max(1, Math.min(100000, Number(p.get("page")) || 1));
  let q = db()
    .from("sessions")
    .select(
      "id,visitor_id,short_label,started_at,last_seen_at,active_ms,mouse_px,scroll_px,clicks,key_presses,brush_strokes,colors_used,games_played,cta_clicks,theme_toggles,lang_changes,pages,games,country,device,browser",
      { count: "exact" },
    );
  for (const k of ["country", "device"]) if (p.get(k)) q = q.eq(k, p.get(k)!);
  for (const k of ["from", "to"])
    if (p.get(k)) {
      if (!Number.isFinite(Date.parse(p.get(k)!)))
```

**Correctif / après proposé**

Réserver les détails de sessions à un administrateur authentifié, au niveau de chaque handler. Si une démonstration publique est nécessaire, publier un DTO agrégé sans identifiants, heures individuelles ni parcours, avec seuil minimal de population.

```ts
// avant
const denied = guard(r);
// après proposé : dans stats, sessions et sessions/[id]
const denied = await requireDashboardSession(r);
if (denied) return denied;
```

`requireDashboardSession` doit vérifier une session serveur expirante (SEC-004). Ne pas réutiliser cette garde admin pour `/api/track`, qui reste une collecte publique. Tester 401 sans session, 403 sans rôle, 200 administrateur et l'absence de détails individuels sur la surface publique.

### SEC-003 — Login dashboard sans protection applicative contre le brute force

| Champ | Contenu |
|---|---|
| **ID** | SEC-003 |
| **Titre** | Login dashboard sans protection applicative contre le brute force |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A07 — Identification and Authentication Failures |
| **Localisation** | src/app/api/dashboard/login/route.ts:7 |
| **Description** | Chaque POST compare directement le SHA-256 du mot de passe, sans budget, temporisation, verrou temporaire ni MFA dans le dépôt. Le formulaire peut être appelé sans passer par son interface. Une règle WAF externe pourrait atténuer le risque, mais n’est pas vérifiable ici. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un script essaie un dictionnaire de mots de passe sur POST /api/dashboard/login et distingue 401 de 200. Aucun essai de mot de passe réel effectué. |
| **Impact** | Accès aux KPI PostHog si un mot de passe faible est deviné ; coût des requêtes et bruit de journalisation. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/app/api/dashboard/login/route.ts:19`

```ts
  let password = "";
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { password?: string };
    password = (body.password ?? "").trim();
  } else {
    const form = await request.formData();
    password = String(form.get("password") ?? "").trim();
  }

  const { hashToken } = await import("@/lib/dashboard-auth");
  const submitted = await hashToken(password);

  if (submitted !== expected) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
```

**Correctif / après proposé**

Appliquer un budget partagé avant parsing et hachage : par origine réseau fiable et par accès administrateur, avec 429 et Retry-After. Ne pas faire dépendre le budget uniquement d’une Map locale ou d’un header IP accepté hors proxy de confiance.

```ts
// ajout avant request.json()/formData()
const attempt = await loginBudget.consume(trustedClientKey(request));
if (!attempt.allowed) {
  return NextResponse.json({ error: "Réessaie plus tard." }, {
    status: 429, headers: { "Retry-After": "60" },
  });
}
```

Borner le corps par lecture en flux, valider le mot de passe comme chaîne bornée et gérer les JSON invalides par 400. Exiger une origine autorisée et envisager une authentification administrateur individuelle avec MFA. Le mot de passe `change-me` de `.env.example` est un exemple, pas une preuve du mot de passe de production.

### SEC-004 — Cookie administrateur déterministe sans expiration ni révocation serveur

| Champ | Contenu |
|---|---|
| **ID** | SEC-004 |
| **Titre** | Cookie administrateur déterministe sans expiration ni révocation serveur |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A07 — Session Management |
| **Localisation** | src/lib/dashboard-auth.ts:11 ; src/app/api/dashboard/login/route.ts:38 ; src/app/api/dashboard/logout/route.ts:5 |
| **Description** | La valeur du cookie est SHA256(DASHBOARD_PASSWORD) pour tous les navigateurs. isValidDashboardToken ne vérifie ni date ni session serveur. maxAge=30 jours ne contraint que le navigateur ; une copie du jeton reste valide après ce délai et après déconnexion tant que le mot de passe ne change pas. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Après obtention préalable d’un cookie (poste compromis, extension ou fuite externe), un attaquant le rejoue depuis un autre client après logout ou expiration navigateur. Il n’est pas nécessaire de retrouver le mot de passe pour ce rejeu. |
| **Impact** | Persistance de l’accès aux analytics administrateur. HttpOnly et Secure réduisent le risque de vol mais ne règlent pas la révocation. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/lib/dashboard-auth.ts:11`

```ts
export async function expectedDashboardToken(): Promise<string | null> {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) return null;
  return hashToken(password);
}

export async function isValidDashboardToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedDashboardToken();
  if (!expected) return false;
  return token === expected;
}
```
`src/app/api/dashboard/login/route.ts:37`

```ts
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DASHBOARD_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
```

**Correctif / après proposé**

Créer un identifiant aléatoire de session et ne conserver que son empreinte dans un stockage serveur, avec expiration et révocation.

```ts
// après login réussi
const token = randomBytes(32).toString("base64url");
await sessions.create({ tokenHash: sha256(token), expiresAt: Date.now() + 8 * 3600_000 });
response.cookies.set(DASHBOARD_COOKIE, token, {
  httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 8 * 3600,
});
// validation : empreinte présente, non révoquée, expiresAt > Date.now()
// logout : supprimer la session serveur avant d'effacer le cookie
```

Prévoir un mode développement HTTP distinct, comparaison sûre et révocation globale des anciennes sessions lors de la migration. Tester la copie du cookie après expiration/logout.

### SEC-005 — Collecte analytics contournable par rotation des UUID

| Champ | Contenu |
|---|---|
| **ID** | SEC-005 |
| **Titre** | Collecte analytics contournable par rotation des UUID |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A04 — Insecure Design / CWE-770 |
| **Localisation** | src/app/api/track/route.ts:4 ; src/lib/backoffice/payload.ts:19 ; supabase/migrations/20261030122415_backoffice.sql:18 |
| **Description** | Le budget de 8 requêtes/minute est une Map par instance indexée sur visitor_id fourni dans le JSON. Zod ne vérifie que sa syntaxe UUID. La fonction SQL crée visiteurs, sessions et batches pour ces identifiants. Un cookie de consentement et un Origin fabriqués par un client HTTP ne limitent pas ce client. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Générer un nouveau visitor_id/session_id/batch_id à chaque envoi permet de rester sous chaque compteur et de multiplier les écritures. La Map n’a pas de plafond de cardinalité pendant la minute courante. Scénario déduit du code, sans charge envoyée. |
| **Impact** | Pollution des KPI, croissance SQL, pression mémoire et facturation. La révocation ne concerne que chaque ancien UUID. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/app/api/track/route.ts:18`

```ts
  const now = Date.now();
  for (const [k, v] of limits) if (now - v.at > 60000) limits.delete(k);
  const limit = limits.get(input.visitor_id) || { at: now, n: 0 };
  if (limit.n >= 8) return new Response(null, { status: 429 });
  limit.n++;
  limits.set(input.visitor_id, limit);
  const { error } = await db().rpc("apply_session_delta", {
    p: input,
    country_code: r.headers.get("x-vercel-ip-country")?.slice(0, 2) || null,
  });
```
`src/lib/backoffice/payload.ts:19`

```ts
    session_id: z.uuid(),
    batch_id: z.uuid(),
    delta: z.partialRecord(
      z.enum(fields),
      z.number().int().min(0).max(10000000),
    ),
```

**Correctif / après proposé**

Ajouter un quota partagé indépendant des UUID client (clé réseau pseudonymisée issue du proxy de confiance + plafond global), un budget de création de visiteurs et une capacité de collecte émise par le serveur.

```ts
// avant
const limit = limits.get(input.visitor_id) || { at: now, n: 0 };
// après proposé, avant toute écriture
if (!(await trackingBudget.consume(trustedClientKey(r))).allowed) {
  return new Response(null, { status: 429, headers: { "Retry-After": "60" } });
}
```

Borner également la lecture du corps pendant le streaming (le contrôle actuel intervient après r.text()). Définir une rétention des identifiants de révocation cohérente : purge_backoffice ne supprime pas backoffice_revoked. Valider les limites avec des UUID tournants et plusieurs instances.

### SEC-006 — Budget cadeaux contrôlé après le traitement coûteux des couvertures

| Champ | Contenu |
|---|---|
| **ID** | SEC-006 |
| **Titre** | Budget cadeaux contrôlé après le traitement coûteux des couvertures |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A04 — Resource Consumption |
| **Localisation** | src/features/gift-lists/server/api.ts:312 |
| **Description** | creatorPost décode, inspecte, redimensionne et réencode l’image avant limit(owner,60). Même une requête qui sera refusée par le quota paie ce coût. Le budget extraction, correctement placé avant le réseau, reste local à chaque instance ; il ne fournit pas non plus de plafond distribué. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un compte authentifié soumet répétitivement une petite image compressée à dimensions élevées dans la limite de 36 mégapixels, y compris une fois son budget épuisé. La transformation est déclenchée avant le retour 429. Aucun test de charge exécuté. |
| **Impact** | Consommation CPU/mémoire et coûts serverless ; même sans vulnérabilité du codec. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible à moyen |

**Preuve / avant**

`src/features/gift-lists/server/api.ts:312`

```ts
    const input = creatorInput.parse(await body(request, 270000));
    if (input.action === "create_list" || input.action === "update_list") {
      try {
        input.data.cover_image = await normalizeListImage(
          input.data.cover_image,
        );
      } catch {
        throw new ApiError(
          "Choisis une image JPEG, PNG ou WebP valide, de moins de 5 Mo.",
        );
      }
    }
    limit(`owner:${auth.user.id}`, 60);
    const db = giftAdmin();
```

**Correctif / après proposé**

Déplacer la réservation du budget et du slot de concurrence avant normalizeListImage, idéalement avant la lecture complète. Mettre un quota partagé par compte et global ; appliquer un budget comparable à l'upload avatar.

```ts
const input = creatorInput.parse(await body(request, 270000));
limit(`owner:${auth.user.id}`, 60); // avant tout décodage
const release = await imageBudget.acquire(auth.user.id);
if (!release) return auth.apply(reply({ error: "Réessaie plus tard." }, 429));
try {
  if (input.action === "create_list" || input.action === "update_list") {
    input.data.cover_image = await normalizeListImage(input.data.cover_image);
  }
  // mutation après contrôle de propriété
} finally { release(); }
```

L'inversion du budget local corrige l’ordre ; seule une implémentation partagée couvre la distribution Vercel. Tester que le décodeur n'est jamais appelé après épuisement.

### SEC-007 — Identité du visiteur autodéclarée pour lire et supprimer les données

| Champ | Contenu |
|---|---|
| **ID** | SEC-007 |
| **Titre** | Identité du visiteur autodéclarée pour lire et supprimer les données |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | OWASP A01 — IDOR / BOLA |
| **Localisation** | src/app/api/backoffice/me/route.ts:8 ; src/app/api/backoffice/me/route.ts:38 ; src/lib/backoffice/request-origin.ts:9 |
| **Description** | Le header x-visitor-id sélectionne et supprime les données sans preuve d’appartenance. DELETE ne requiert pas même le cookie de consentement ; isSameOrigin accepte une origine absente. Un UUID aléatoire est difficile à deviner, mais est utilisé ici comme identifiant analytique (également envoyé à PostHog par tracking/client.ts), sans séparation d’un secret d’autorisation. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un tiers connaissant un visitor_id (par accès aux exports analytiques ou fuite locale) obtient les totaux via GET et le supprime/révoque via DELETE. Un attaquant anonyme ne peut pas déduire cet UUID du seul id de session public ; aucune énumération praticable n’est revendiquée. |
| **Impact** | Lecture de totaux et suppression ciblée de données d’un visiteur, retrait du suivi futur de cet identifiant. Prérequis : connaissance de l’UUID. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/app/api/backoffice/me/route.ts:5`

```ts
export async function GET(r: Request) {
  const denied = guard(r);
  if (denied) return denied;
  const id = z.uuid().safeParse(r.headers.get("x-visitor-id"));
  if (!id.success) return new Response(null, { status: 400 });
  const { data, error } = await db()
    .from("sessions")
    .select("*")
    .eq("visitor_id", id.data);
```
`src/app/api/backoffice/me/route.ts:38`

```ts
export async function DELETE(r: Request) {
  if (!isSameOrigin(r)) return new Response(null, { status: 403 });
  const id = z.uuid().safeParse(r.headers.get("x-visitor-id"));
  if (!id.success) return new Response(null, { status: 400 });
  const { error } = await db().rpc("delete_backoffice_visitor", { v: id.data });
  return new Response(null, { status: error ? 500 : 204 });
}
```

**Correctif / après proposé**

Séparer identifiant analytique et capacité privée ; émettre côté serveur un secret aléatoire en cookie HttpOnly et ne stocker que son hash. Ne jamais envoyer ce secret aux outils analytics. Déduire visitor_id de la capacité validée, pas du header.

```ts
// avant
const id = z.uuid().safeParse(r.headers.get("x-visitor-id"));
// après proposé
const visitor = await requireVisitorCapability(r);
if (!visitor) return new Response(null, { status: 401 });
await db().rpc("delete_backoffice_visitor", { v: visitor.id });
```

Préserver la possibilité de retirer le consentement sans compte connecté ; origine obligatoire pour DELETE comme défense CSRF complémentaire. Tester le refus d'un UUID tiers même accompagné d’un consentement valide.

### SEC-008 — Retrait du consentement non transmis à Clarity

| Champ | Contenu |
|---|---|
| **ID** | SEC-008 |
| **Titre** | Retrait du consentement non transmis à Clarity |
| **Sévérité** | 🟡 Moyenne |
| **Catégorie** | Confidentialité — retrait du consentement |
| **Localisation** | src/lib/analytics/clarity.tsx:48 |
| **Description** | Le changement vers granted injecte le SDK, mais denied et null ne déclenchent aucune commande d’arrêt ou de retrait. Une fois exécuté, le script reste actif dans le document. Le code prouve l’absence de propagation du retrait ; le volume de collecte qui persiste dépend des paramètres Clarity et doit être mesuré dans le navigateur. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Accepter les cookies, attendre le chargement du SDK puis retirer le consentement via les préférences. Le callback ne fait alors rien pour Clarity. Aucun compte Clarity ni enregistrement réel consulté. |
| **Impact** | Risque de collecte ou stockage persistant après retrait ; divergence entre le choix affiché et l’état du SDK. Qualification juridique hors de cet audit technique. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible à moyen |

**Preuve / avant**

`src/lib/analytics/clarity.tsx:43`

```tsx
export function ClarityScript() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID;
    if (!id) return;

    function apply(status: ConsentStatus) {
      if (status === "granted") {
        injectClarity(id!);
      }
    }

    apply(getConsent());
    return subscribeConsent(apply);
  }, []);
```

**Correctif / après proposé**

Propager les changements à l’API officielle de consentement et recharger un document sans SDK lors d’un retrait si l’objectif est l’arrêt total de la collecte. Retirer simplement la balise script n’arrête pas le code déjà exécuté.

```ts
function apply(status: ConsentStatus) {
  if (status === "granted") {
    injectClarity(id!);
    window.clarity?.("consentv2", {
      analytics_Storage: "granted", ad_Storage: "denied",
    });
  } else if (document.getElementById("ms-clarity")) {
    window.clarity?.("consentv2", {
      analytics_Storage: "denied", ad_Storage: "denied",
    });
    window.location.reload(); // le choix refusé est déjà persisté par setConsent
  }
}
```

Confirmer après recharge absence du SDK, des appels collect et des cookies selon le domaine réel. [API Microsoft](https://github.com/microsoft/clarity/blob/master/packages/clarity-js/types/index.d.ts).

### SEC-009 — Import historique de collection sans preuve de provenance

| Champ | Contenu |
|---|---|
| **ID** | SEC-009 |
| **Titre** | Import historique de collection sans preuve de provenance |
| **Sévérité** | 🔵 Faible |
| **Catégorie** | OWASP A04 — Business Logic Integrity |
| **Localisation** | src/app/api/tetris/cards/account/route.ts:79 ; src/features/cards/server/validation.ts:20 ; supabase/migrations/20261027175733_cards_single_save.sql:66 |
| **Description** | La route accepte legacySave du client, en vérifie la structure, puis l’importe avec la clé privilégiée pour l’utilisateur authentifié. La migration durcie réserve bien la RPC à service_role, mais la route autorisée reste un relais de données non signées. Les quantités et raretés n’ont pas de preuve d’acquisition. Usage unique par compte, et jeu sans enjeu monétaire : sévérité faible. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un compte sans import préalable fabrique une sauvegarde compatible et envoie action=state avec legacySave. Vérification locale : validateCloudSave accepte une collection de 1 000 000 de copies dont 1 000 000 shiny. Aucun import de production effectué. |
| **Impact** | Altération de sa propre collection/statistiques ; pas de crédit monétaire réel ni de modification de la collection d’un autre compte démontrés. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/features/cards/server/validation.ts:20`

```ts
  for (const [id, entry] of Object.entries(data.collection)) {
    if (
      !getCard(id) ||
      !entry ||
      !integer(entry.qty) ||
      !integer(entry.firstAcquiredAt) ||
      !integer(entry.lastAcquiredAt) ||
      (entry.shinyQty !== undefined &&
        (!integer(entry.shinyQty) || entry.shinyQty > entry.qty))
    )
      throw Error("Invalid progress");
```
`supabase/migrations/20261027175733_cards_single_save.sql:68`

```sql
 uid:=cards_private.ensure_player();select * into save from public.cards_saves where user_id=uid for update;
 if save.legacy_offered or exists(select 1 from cards_private.save_choices where user_id=uid) then return false;end if;
 if jsonb_typeof(candidate->'collection')<>'object' or octet_length(candidate::text)>200000 then raise exception 'INVALID_SAVE';end if;
 for entry in select key,value from jsonb_each(candidate->'collection') loop
  if not exists(select 1 from cards_private.card_catalog where id=entry.key) or (entry.value->>'qty')::bigint not between 0 and 2147483647 then raise exception 'INVALID_SAVE';end if;
 end loop;
 empty:=save.data->'collection'='{}'::jsonb and (select credits=0 and boosters_to_open=0 from public.profiles where user_id=uid) and not exists(select 1 from public.user_cosmetics where user_id=uid);
 update public.cards_saves set legacy_offered=true where user_id=uid;
 insert into cards_private.save_choices(user_id,local_data) values(uid,candidate);
 if empty then perform cards_private.resolve_choice('device',save.revision,0);return true;end if;
```

**Correctif / après proposé**

Clôturer l’import navigateur une fois la migration terminée, ou n’importer que des enregistrements déjà stockés serveur et associés au compte vérifié. Les anciennes sauvegardes locales non signées ne peuvent pas acquérir rétroactivement une provenance fiable par validation de schéma.

```ts
// avant : accepte body.legacySave puis admin.rpc(...)
// après proposé pour les nouveaux envois
if (body.legacySave !== undefined) {
  return reply({ error: "L’import des sauvegardes locales est fermé." }, 410);
}
```

Si la migration reste un choix produit, marquer les collections importées comme non vérifiées et exclure leurs résultats de toute récompense ou compétition. Le crédit gratuit grant_credits est documenté dans la boutique : il n’est pas présenté ici comme un paiement contourné.

### SEC-010 — En-têtes de protection limités à certains chemins

| Champ | Contenu |
|---|---|
| **ID** | SEC-010 |
| **Titre** | En-têtes de protection limités à certains chemins |
| **Sévérité** | 🔵 Faible |
| **Catégorie** | OWASP A05 — Security Misconfiguration |
| **Localisation** | next.config.ts:35 ; vercel.json:1 |
| **Description** | Les CSP et frame-ancestors du dépôt couvrent les pages cadeaux et SVG, pas globalement /dashboard, /backoffice et le reste du site. Aucun Permissions-Policy, X-Frame-Options global ou Referrer-Policy global n’est déclaré. HSTS peut être ajouté par Vercel : son absence effective n’est pas affirmée. La CSP cadeaux conserve unsafe-inline, donc ne constitue pas une barrière complète contre une injection de script. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Une page non protégée par un header de framing peut être intégrée dans une iframe tierce pour tromper un utilisateur. Aucune injection XSS ni opération administrateur ainsi déclenchée démontrée. |
| **Impact** | Défense contre le clickjacking et les fuites de référent inégale ; efficacité CSP limitée en cas d’injection. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`next.config.ts:35`

```ts
  async headers() {
    return [
      ...[
        "/l/:path*",
        "/listes/:path*",
        "/outils/listes-cadeaux/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/l/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/listes/:path*",
        "/:locale(fr|en|zh|ar|es|it|de)/outils/listes-cadeaux/:path*",
      ].map((source) => ({
        source,
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
```

**Correctif / après proposé**

Ajouter une base globale tout en préservant les règles plus strictes des cadeaux et SVG.

```ts
{
  source: "/:path*",
  headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ],
}
```

Déployer d'abord une CSP globale en Report-Only, inventorier les domaines réellement nécessaires (analytics, Google auth, assets), puis l'appliquer avec nonces/hashes pour les scripts inline. Vérifier HSTS sur le domaine final avant de définir includeSubDomains. Ne pas recopier aveuglément la CSP cadeaux : elle bloquerait des intégrations sur d’autres pages.

### SEC-011 — Erreurs techniques de services retournées au navigateur

| Champ | Contenu |
|---|---|
| **ID** | SEC-011 |
| **Titre** | Erreurs techniques de services retournées au navigateur |
| **Sévérité** | 🔵 Faible |
| **Catégorie** | OWASP A05 — Information Disclosure |
| **Localisation** | src/app/api/tetris/cards/avatar/route.ts:56 ; src/lib/analytics/posthog-server.ts:52 ; src/lib/analytics/posthog-server.ts:147 |
| **Description** | La route avatar retourne error.message pour toute Error, y compris sharp. Le helper PostHog incorpore jusqu’à 200 caractères de réponse du fournisseur dans une Error et renvoie ensuite ce message dans l’API analytics. Aucune fuite de secret effective n’a été observée ; le problème est le passage non filtré des erreurs techniques. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un utilisateur soumet une image tronquée pour obtenir une erreur du décodeur, ou un administrateur reçoit le texte brut d’une erreur PostHog. |
| **Impact** | Divulgation de détails d’implémentation et réponses instables ; accès PostHog actuellement derrière le proxy dashboard. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible |

**Preuve / avant**

`src/app/api/tetris/cards/avatar/route.ts:56`

```ts
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error
            ? error.message
            : "Impossible d’enregistrer l’avatar.",
      },
      400,
    );
```
`src/lib/analytics/posthog-server.ts:52`

```ts
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed (${res.status}): ${text.slice(0, 200)}`);
  }
```
`src/lib/analytics/posthog-server.ts:147`

```ts
  } catch (err) {
    return {
      ...base,
      error: err instanceof Error ? err.message : "Erreur PostHog inconnue",
    };
  }
```

**Correctif / après proposé**

Mapper uniquement des erreurs métier connues ; renvoyer un identifiant d’incident pour les erreurs internes et journaliser un code filtré, sans URL de connexion ni corps du fournisseur.

```ts
// avant
error: error instanceof Error ? error.message : "Impossible d’enregistrer l’avatar."
// après proposé
error: publicAvatarErrors.has(message)
  ? message
  : "Impossible d’enregistrer cette image. Réessaie."
```

Pour PostHog, remplacer le texte fournisseur par un message constant côté client. Le helper Tetris `failure` offre déjà un exemple d’allowlist d’erreurs publiques.

### SEC-012 — Autres dépendances signalées, surtout dans les outils

| Champ | Contenu |
|---|---|
| **ID** | SEC-012 |
| **Titre** | Autres dépendances signalées, surtout dans les outils |
| **Sévérité** | 🔵 Faible |
| **Catégorie** | OWASP A06 — Vulnerable Components / supply chain |
| **Localisation** | package-lock.json:6849 ; package-lock.json:7674 ; package-lock.json:11115 ; package.json:61 |
| **Description** | Outre sharp, npm signale body-parser 2.3.0 (élevé fournisseur), minimatch 3.1.5 et 10.2.6 (moyen), deepmerge 4.3.1 (faible). body-parser vient de shadcn → MCP SDK → express ; aucun serveur Express/MCP de ce paquet n’est démarré par les scripts applicatifs. minimatch est principalement utilisé par lint/CLI ; deepmerge par Primer et shadcn. Aucun chemin d’exploitation HTTP de ces trois paquets n’a été démontré : sévérité applicative abaissée, sans masquer la sévérité npm. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Un motif glob hostile peut épuiser un outil utilisant minimatch ; un registre/objet non fiable peut atteindre un outil de fusion ; body-parser ne devient une surface réseau que si le serveur Express concerné est effectivement lancé. |
| **Impact** | Risques sur les outils de développement ou futurs usages ; aucune RCE applicative ou DoS de route Next déduite du seul audit npm. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`package-lock.json:6849`

```json
    "node_modules/body-parser": {
      "version": "2.3.0",
      "resolved": "https://registry.npmjs.org/body-parser/-/body-parser-2.3.0.tgz",
      "integrity": "sha512-2cGmJupaNgg+QUwVLAucDuWuoMZ6EX9iHDRswZ5lsNYEmwPaRknMPCLZz07yTzVq/83p4o/wzbDZbBrTvGGTIw==",
```
`package-lock.json:7674`

```json
    "node_modules/deepmerge": {
      "version": "4.3.1",
      "resolved": "https://registry.npmjs.org/deepmerge/-/deepmerge-4.3.1.tgz",
      "integrity": "sha512-3sUqbMEc77XqpdNO7FRyRog+eW3ph+GYCbj+rK+uYyRMuwsVy0rMiVtPn+QJlKFvWP/1PYpapqYn0Me2knFn+A==",
```
`package-lock.json:11115`

```json
    "node_modules/minimatch": {
      "version": "3.1.5",
      "resolved": "https://registry.npmjs.org/minimatch/-/minimatch-3.1.5.tgz",
      "integrity": "sha512-VgjWUsnnT6n+NUk6eZq77zeFdpW2LWDzP6zFGrCbHXiYNul5Dzqk2HHQ5uFH2DNW5Xbp8+jVzaeNt94ssEEl4w==",
```

**Correctif / après proposé**

Actualiser les parents compatibles, déplacer shadcn en devDependencies si son CLI reste uniquement un outil, puis vérifier les imports du build. body-parser corrigé est >=2.4.0 ; l’avis minimatch indique >=11.0.1 mais un override majeur global peut casser ESLint. deepmerge n’a pas de correction proposée par npm dans cet audit : suivre l’amont ou remplacer l’usage exposé.

```json
// avant : shadcn dans dependencies
"shadcn": "^4.22.1"
// après proposé : même version dans devDependencies, puis mise à jour contrôlée
```

Ne pas exécuter `npm audit fix --force` : npm suggère ici des rétrogradations incompatibles d’ESLint et eslint-config-next. Refaire audit complet et audit production après changement. Voir le détail chiffré en annexe.

### SEC-013 — Modules privilégiés sans marqueur server-only

| Champ | Contenu |
|---|---|
| **ID** | SEC-013 |
| **Titre** | Modules privilégiés sans marqueur server-only |
| **Sévérité** | ⚪ Info |
| **Catégorie** | Défense en profondeur — frontière serveur/client |
| **Localisation** | src/features/gift-lists/server/api.ts:1 ; src/features/cards/server/save-choice.ts:1 ; src/features/tetris/server/supabase-store.ts:1 |
| **Description** | Ces modules utilisent ou transportent des identifiants privilégiés sans import server-only. Leur graphe d’import actuel est serveur ; aucune clé privilégiée NEXT_PUBLIC ni exposition client avérée n’a été trouvée. Le commentaire Server-only dans un adaptateur ne fournit pas de garde de compilation. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Pas d’exploitation actuelle démontrée. Un futur import depuis un Client Component ne serait pas explicitement bloqué par ce marqueur ; les variables privées Next ne sont pas pour autant automatiquement rendues publiques. |
| **Impact** | Risque de régression de frontière et de propagation d’une logique privilégiée. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible |

**Preuve / avant**

`src/features/cards/server/save-choice.ts:1`

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
type Pending = {
  sourceUser: string | null;
  sourceAvatar: string | null;
  revision: number;
  sourceRevision: number;
```

**Correctif / après proposé**

Ajouter le marqueur aux modules de données/auth strictement serveur, après séparation des types et validateurs partagés.

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
```

Utiliser `import type` pour les DTO depuis le client, comme le dashboard le fait déjà. Adapter les tests hors Next au marqueur. `src/lib/backoffice/server.ts:1` est déjà protégé.

### SEC-014 — API analytics protégée uniquement par le proxy

| Champ | Contenu |
|---|---|
| **ID** | SEC-014 |
| **Titre** | API analytics protégée uniquement par le proxy |
| **Sévérité** | ⚪ Info |
| **Catégorie** | Défense en profondeur — autorisation proche des données |
| **Localisation** | src/app/api/analytics/summary/route.ts:7 ; src/proxy.ts:13 ; src/proxy.ts:108 |
| **Description** | Le handler et fetchAnalyticsSummary ne revalident pas la session ; seule la sélection du proxy le fait. Le matcher ignore les chemins contenant un point. Aucun alias routé exploitable ni contournement actuel n’a été démontré. Next 16.4.2 n’est pas dans les plages affectées par CVE-2025-29927 : ne pas confondre faiblesse d’architecture et CVE présente. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Pas d’exploitation actuelle revendiquée ; une future réécriture, omission de matcher ou réutilisation du helper pourrait oublier le contrôle. |
| **Impact** | Une régression de routage pourrait exposer les KPI et provoquer des requêtes PostHog privilégiées. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Faible |

**Preuve / avant**

`src/app/api/analytics/summary/route.ts:7`

```ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("days");
  const periodDays: AnalyticsPeriod = raw === "30" ? 30 : 7;

  const summary = await fetchAnalyticsSummary(periodDays);
  return NextResponse.json(summary);
}
```

**Correctif / après proposé**

Vérifier explicitement la session à l’entrée du handler, puis garder le proxy pour l’expérience de navigation.

```ts
export async function GET(request: Request) {
  const denied = await requireDashboardSession(request);
  if (denied) return denied;
  // période bornée puis fetchAnalyticsSummary
}
```

Renvoyer `Cache-Control: private, no-store` sur les réponses analytics. Le cache de requêtes PostHog à 300 s porte sur des agrégats globaux d’un unique projet, pas sur des données personnelles variant par utilisateur ; pas de fuite interutilisateur démontrée.

### SEC-015 — Sanitizer SVG par regex laissant survivre des URI encodées

| Champ | Contenu |
|---|---|
| **ID** | SEC-015 |
| **Titre** | Sanitizer SVG par regex laissant survivre des URI encodées |
| **Sévérité** | ⚪ Info |
| **Catégorie** | Défense en profondeur — CWE-79 |
| **Localisation** | src/lib/sanitize-svg.ts:32 ; src/components/media/safe-svg.tsx:28 |
| **Description** | Le filtre cherche le texte javascript dans l’attribut sans parser les entités XML/HTML. L’URI java&#x73;cript:alert(1) reste dans la sortie. Le composant injecte cette sortie avec dangerouslySetInnerHTML. Actuellement ses usages identifiés sont des exemples statiques du playground et la route SVG ne lit que des fichiers du dépôt avec une CSP script-src none et sandbox : aucune XSS distante sur une entrée utilisateur démontrée. |
| **Preuve** | Extraits avant ci-dessous. |
| **Scénario d’exploitation** | Vérification locale : sanitizeSvg renvoie ok=true avec href="java&#x73;cript:alert(1)". Si du markup non fiable atteignait le composant inline, l’interprétation navigateur pourrait produire une URL active. Ce dernier chemin n’existe pas dans les usages examinés. |
| **Impact** | La promesse de sanitisation ne peut pas être utilisée comme garantie pour de futures entrées non fiables. |
| **Correctif recommandé** | Proposition après ci-dessous ; non appliquée. |
| **Effort** | Moyen |

**Preuve / avant**

`src/lib/sanitize-svg.ts:32`

```ts
const DANGEROUS_URI_ATTR =
  /\s+(?:xlink:)?(?:href|src|action|formaction|data|poster)\s*=\s*(?:"\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^"]*"|'\s*(?:javascript|vbscript|data\s*:\s*text\/html)[^']*'|(?:javascript|vbscript|data\s*:\s*text\/html)[^\s>]*)/gi;

/** Bloque les références externes (SSRF / XSS via <use> / <image>). */
const EXTERNAL_RESOURCE_ATTR =
  /\s+(?:xlink:)?(?:href|src)\s*=\s*(?:"\s*https?:\/\/[^"]*"|'\s*https?:\/\/[^']*'|https?:\/\/[^\s>]*)/gi;
```
`src/components/media/safe-svg.tsx:24`

```tsx
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("inline-flex [&_svg]:size-full", className)}
      dangerouslySetInnerHTML={{ __html: result.svg }}
    />
```

**Correctif / après proposé**

Pour un futur contenu non fiable, utiliser un parseur/sanitizer maintenu avec profil SVG, allowlist de balises et attributs et validation des URL après décodage ; supprimer les liens si inutiles. Garder la CSP de la route.

```tsx
// avant
const result = sanitizeSvg(markup);
// après proposé : garder les SVG inline dans des composants compilés de confiance
// Pour une entrée externe : ne pas passer markup à dangerouslySetInnerHTML.
<img src={trustedSvgAssetPath} alt={title ?? ""} />
```

Ne pas remplacer la regex par une autre regex censée couvrir tous les encodages. Tester le navigateur réel, les entités numériques et les namespaces avant d’accepter un SVG externe.

## 3. À vérifier manuellement

Ces éléments ne sont **pas** déclarés vulnérables sans observation de l'environnement déployé.

### Supabase

1. Comparer les migrations appliquées et les scripts `docs/sql` avec la base réelle ; détecter tables ajoutées via l'interface, anciennes policies ou fonctions résiduelles. Ne pas réexécuter les scripts de création sur une base existante. Utiliser Security Advisor et un export de schéma avec privilèges.
2. Pour **chaque table de chaque schéma exposé**, vérifier RLS, grants effectifs (y compris PUBLIC et rôles hérités), policies et tests sous `anon`, utilisateur A, utilisateur B, invité Supabase et service_role. Les tables privées Cartes ne doivent pas figurer dans les schémas exposés par la Data API.
3. Vérifier que les RPC `gift_*`, `tetris_*`, `cards_import_legacy_for` et back-office sont réellement réservées à service_role comme dans les scripts ; les RPC Cartes publiques autorisées doivent conserver leurs contrôles `auth.uid()`. Examiner toute fonction SECURITY DEFINER ajoutée hors dépôt, son propriétaire et son search_path.
4. Inventorier les vues : `security_invoker=true` ou révocation des rôles navigateur ; aucune vue créée trouvée dans les scripts examinés.
5. Bucket avatars : privé, 2 Mio maximum, MIME WebP, les quatre policies propriétaire ; aucun autre bucket public ou ancienne policy large. Vérifier les limites de transformation et URL signées éventuelles hors dépôt.
6. Auth : URL du site, liste exacte de redirections OAuth autorisées (sans wildcard en production), providers Google/Apple, PKCE, client Google configuré, interdiction des providers inutiles. Les routes de retour de ce dépôt sont limitées, mais la configuration Supabase est une surface distincte.
7. Auth invité : CAPTCHA/Turnstile, rate limits Supabase et plafond de création de comptes. La route Cartes crée un invité lorsque getUser ne retourne pas d'utilisateur ; sans garde plateforme, la rotation des cookies peut multiplier ces comptes.
8. Durée JWT, rotation des clés et sessions, MFA administrateur, confirmation email, protection mots de passe divulgués et règles d'énumération si les providers email/password sont activés ailleurs. Aucun flux signup/reset/email/magic link local trouvé.
9. Publications Realtime, canaux privés et autorisations ; aucune utilisation du client dans le dépôt ne prouve que le dashboard ne publie aucune table. Edge Functions et `verify_jwt`/CORS si des fonctions existent hors dépôt.
10. Rétention des données analytics et comptes invités ; suivi de croissance des `cards_private.operations`, `backoffice_revoked` et réservations annulées. Les scripts ne montrent pas de purge de tous ces journaux.

Requêtes de lecture proposées à exécuter dans un environnement autorisé (non exécutées pendant cet audit) :

```sql
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','p') and n.nspname in ('public','cards_private');
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies order by schemaname, tablename, policyname;
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
       p.prosecdef, p.proconfig, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','cards_private');
select schemaname, viewname from pg_views where schemaname='public';
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
```

### Vercel, DNS et exploitation

- Confirmer les versions réellement déployées et le graphe de dépendances natif (`sharp.versions` dans un environnement contrôlé) ; redéployer après mise à jour, distinguer previews et production.
- Inspecter WAF, Bot Protection, quotas distribués, budgets de dépenses et alertes pour login, collecte, invités Supabase, extraction, avatars et lectures back-office. Une Map locale ne protège pas toutes les instances.
- Vérifier Deployment Protection, previews privées, domaines personnalisés, permissions des membres, séparation des secrets production/preview et rotation. Aucune valeur de variable Vercel n'a été lue.
- Contrôler les headers HTTP réels : CSP, frame-ancestors, HSTS, nosniff, referrer, permissions et absence d'ACAO permissif ajouté par une couche externe. Tester les chemins localisés et les réponses d'erreur.
- Vérifier que les requêtes auth/compte ne sont pas mises en cache par un proxy externe, que les en-têtes SSR sont conservés et que les cookies ont HttpOnly/Secure/SameSite appropriés. Le rafraîchissement est réalisé dans les API via getUser et auth.apply, volontairement pas sur les pages publiques ; parcourir connexion, expiration puis rafraîchissement et déconnexion.
- Confirmer `CRON_SECRET`, exécution et alertes du cron, fuseau UTC de Vercel, traitement des échecs ; ne pas déduire son existence d'un placeholder dans `.env.example`.
- Tester la préférence cookies : premier refus, acceptation puis retrait, plusieurs onglets, navigation vers les cadeaux sans SDK déjà actif ; vérifier les cookies et appels réseaux Clarity/Vercel/PostHog. PostHog transmet actuellement les query strings des pages hors cadeaux (`provider.tsx:51,87`) : définir une allowlist de paramètres utiles pour minimiser les données.
- S'assurer que les URLs d'images cadeaux chargées directement par le navigateur correspondent au modèle de confidentialité attendu : `safeWebUrl` permet des domaines externes HTTP/HTTPS ; l'extracteur serveur n'est pas une autorisation de tous les chargements futurs côté navigateur.
- Web3Forms : restrictions de domaine, anti-spam et quotas côté fournisseur ; clé publique par conception, `botcheck:false` dans le client, aucun CAPTCHA/token serveur visible dans ce helper. L'efficacité anti-bot du service ne peut pas être conclue depuis ce dépôt.
- Surveillance GitHub / Dependabot et npm ; vérifier les paquets non maintenus comme heic2any selon l'usage réel, sans conclure à une faille sur la seule ancienneté. Les modules installés contiennent aussi des restes `extraneous` de Crawlee absents du lockfile courant (observés via `npm explain minimatch`) : comparer dans une installation propre après validation, sans nettoyage pendant cet audit.
- Le site Next annonce une mise à jour de sécurité pour le **3 novembre 2026** : les plages d'impact de ces avis ne sont pas encore publiées au 31 octobre. Prévoir une revue à publication, sans leur attribuer une vulnérabilité prouvée ici. [Annonce officielle](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026).

## 4. Bonnes pratiques déjà en place

### Secrets et isolation

- `.gitignore` exclut `.env*` avec seule exception `.env.example` ; seuls les exemples sont suivis et apparaissent dans les chemins historiques. Aucun fichier `.env.local` commité trouvé sur les références examinées.
- Pas de `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`, de secret Supabase privilégié codé en dur ni d'import privilégié client démontré. La clé admin est distincte de la clé publishable/anon. `backoffice/server.ts` est explicitement `server-only`.
- Variables publiques actuelles recensées, sans valeur :

| Variables | Classification |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé d'ingestion publique, pas la clé personnelle de lecture |
| `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_POSTHOG_APP_URL` | Hôte ingestion / lien console publics |
| `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_CLARITY_APP_URL` | Identifiant projet et lien console publics |
| `NEXT_PUBLIC_VERCEL_ANALYTICS_URL` | Lien console, pas un secret d'accès |
| `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` | Capacité d'envoi publique par conception ; restrictions fournisseur à contrôler |
| `NEXT_PUBLIC_ENABLE_TETRIS`, `NEXT_PUBLIC_ENABLE_TETRIS_SOUND`, `NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD` | Flags publics |
| `NEXT_PUBLIC_ENABLE_CARDS`, `NEXT_PUBLIC_ENABLE_ADOBE_DS` | Flags publics |
| `NEXT_PUBLIC_POSTHOG_TEST_CAPTURE` | Flag public test, ne doit pas être activé par inadvertance en production |

Ces noms n’exposent pas de clé privilégiée dans le code ; les valeurs réellement saisies dans Vercel restent à vérifier. Le fragment `NEXT_PUBLIC_EN` trouvé dans l’historique est une référence textuelle tronquée, pas une variable actuelle du code.

### RLS, fonctions et droits par ressource

Toutes les **17 tables public** définies dans les scripts examinés ont une activation explicite de la RLS. Les **5 tables cards_private** ont aussi la RLS. `tetris_profiles` est vidée, pas supprimée, par la migration du 31 octobre ; elle reste donc dans l’inventaire.

| Tables | Fichier de référence | Accès navigateur prévu |
|---|---|---|
| `tetris_sessions`, `tetris_scores` | `202610250001_tetris_leaderboard.sql:14` | Grants retirés, opérations via serveur |
| `tetris_profiles`, `tetris_local_scores` | `202610250003_tetris_local_profiles.sql:6` | Grants retirés, capacités gérées serveur |
| `tetris_score_receipts` | `202610250004_tetris_identity_receipts.sql:3` | Grants retirés, serveur seulement |
| `cards_progress` | `202610270001_cards_progress.sql:9` | Ancien stockage privé, endpoint retiré |
| `profiles`, `user_cosmetics`, `cards_saves` | `20261027174543_cards_shop_economy.sql:150` | SELECT propre utilisateur ; aucune écriture directe authenticated |
| `visitors`, `sessions`, `backoffice_batches`, `backoffice_revoked`, `backoffice_windows` | `20261030122415_backoffice.sql:11,61` | service_role seulement ; les API doivent appliquer la politique de publication |
| `gift_lists`, `gift_items`, `gift_reservations` | `docs/sql/gift-lists.sql:62` | Lists/items propriétaire ; réservations entièrement privées |
| `cards_private.operations`, `card_catalog`, `shop_catalog`, `login_tickets`, `save_choices` | migrations économie et single_save | Pas de tables accessibles directement au navigateur |

- Policies Cartes SELECT : `(select auth.uid())=user_id`. L’absence d’INSERT/UPDATE/DELETE policy est **intentionnelle** : mutations via RPC contrôlées, pas une omission.
- Policies cadeaux : SELECT/INSERT/UPDATE/DELETE propriétaire sur listes ; UPDATE possède USING et WITH CHECK ; items FOR ALL possède les deux prédicats de propriété. Grants de mise à jour limités aux colonnes autorisées ; prix/type des items protégés des mises à jour directes par authenticated.
- Aucun USING(true) ni policy anon large trouvé dans les scripts examinés. Les réservations n’ont volontairement pas de policy navigateur ; emails/messages ne figurent pas dans `gift_read_public`.
- SECURITY DEFINER Cartes : `search_path=''`, tables qualifiées ; contrôles `auth.uid()` directs ou via ensure_player, rôles d'exécution bornés. draw_pack n'a pas de contrôle de compte propre mais n'est pas accordée au navigateur ; import_legacy_for accepte un owner explicite mais est réservée à service_role. Pas de fonction privilégiée publiquement exécutable non authentifiée identifiée dans l’état final des scripts.
- Fonctions publiques Tetris/cadeaux/back-office SECURITY INVOKER ; grants exécutables retirés de PUBLIC/anon/authenticated selon l'usage. Le `search_path=public` du back-office n'est pas assimilé à une élévation SECURITY DEFINER ; contrôler quand même les droits CREATE du schéma réel.
- Verrous SQL, index de réservation unique, contrôle des montants et idempotence ; consommations Cartes recalculées depuis catalogue privé et soldes verrouillés. Les RPC ne font pas confiance au prix client.
- Comptes Google/Apple reconnus depuis app_metadata/identities, pas user_metadata pour les droits. user_metadata n’est utilisé que pour les informations d’affichage.

### Auth, injections, données et stockage

- `@supabase/ssr` utilisé, pas d’auth-helpers obsolète trouvé ; `getUser()` côté serveur, pas de `getSession()` utilisé comme preuve d’identité.
- Cookies auth HttpOnly, SameSite=Lax, Secure en HTTPS, portée `/api/tetris`. Application des cookies et des headers de rafraîchissement aux réponses, `private, no-store`.
- OAuth : retour interne allowlisté par `safeGamePath`, échange de code et contrôle provider ; nonce Google 32 octets et comparaison constant-time. Aucun open redirect prouvé.
- Validations Zod cadeaux et tracking ; filtres de propriété explicites malgré service_role ; pas de mass assignment arbitraire grâce aux schémas qui retirent les champs inconnus. Les requêtes SQLite/Turso de valeurs utilisateur sont paramétrées ; pas de SQL dynamique utilisateur trouvé dans les RPC.
- Extracteur produits : protocoles HTTP(S), pas de credentials/IP littérales/ports arbitraires, résolution DNS filtrée, **adresse épinglée à la socket**, contrôle à chaque redirection, plafond après décompression, timeout. Les tests ciblés passent.
- Aucune commande shell, eval ou new Function alimentée par l'utilisateur trouvée ; les `.exec` des adaptateurs sont des opérations SQL de schéma/transaction statiques, pas des commandes système.
- SVG publics confinés sous `public` par normalisation et préfixe de chemin, puis CSP sandbox et nosniff ; script initial thème statique, sans interpolation utilisateur. Limite du sanitizer inline : SEC-015.
- Pas de productionBrowserSourceMaps activé, pas de DTO contenant un secret privilégié transmis au client observé. Les `select('*')` trouvés sont majoritairement serveur ; `/backoffice/me` calcule des totaux et ne renvoie pas la ligne entière. Absence de taint n'est pas une faille en elle-même.
- Upload avatar : limite fichier, contrôle de signature MIME, limite pixels, réencodage WebP 512×512 sans métadonnées ; bucket privé et policies exactes `${auth.uid()}/avatar.webp` pour SELECT/INSERT/UPDATE/DELETE. Chemin prévisible acceptable derrière ces autorisations.
- Couvertures cadeaux réencodées et sans EXIF ; consentement et SDK analytics exclus des pages cadeaux ; secrets d'annulation 256 bits en fragment d'URL, hash stocké, POST pour mutation.
- Cron fail-closed avec CRON_SECRET. Aucun webhook paiement, seed/debug de base ou endpoint de paiement actif trouvé. Le playground est une démo UI, pas une API d'administration. Les vues de simulation Cartes sont conditionnées au développement.
- Aucun CORS wildcard avec credentials déclaré. Les mutations compte/cadeaux vérifient l'origine ; exceptions et limites décrites ci-dessus. Aucune Server Action ni configuration `serverActions.allowedOrigins` personnalisée trouvée.
- Cache partagé back-office de 30 s : données déjà publiques par conception ; les réponses ont private,no-store. Aucun cache partagé de données personnelles des comptes trouvé.

### Dépendances et CVE du framework

Les versions verrouillées et installées de Next, React et Supabase concordent. npm ne signale **aucun avis pour ces cinq paquets** dans cette exécution. Cela ne remplace pas les contrôles des avis amont ni la vérification du build déployé.

| Sujet | Conclusion sur ce dépôt | Source |
|---|---|---|
| CVE-2025-29927 middleware | 16.4.2 hors plages affectées de l'avis ; aucune reproduction de bypass revendiquée | [Avis Next officiel](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) |
| RCE RSC fin 2025, CVE-2025-55182 / 66478 | Version ultérieure aux correctifs ; aucun signal npm correspondant ; l'App Router appartient à la famille de surfaces concernées historiquement | [Avis Next](https://nextjs.org/blog/CVE-2025-66478) |
| DoS/exposition source RSC, CVE-2025-55183/55184/67779 | Correctifs antérieurs à la version actuelle ; aucun signal npm sur next/react | [Mise à jour Next](https://nextjs.org/blog/security-update-2025-12-11) |
| RCE Cache Components octobre 2026 | cacheComponents=true ; Next 16.4.2 dépasse le correctif 16.4.1 | [Bulletin octobre 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026) |
| RCE SVG/image octobre 2026 | Ne pas conclure « corrigé » au seul numéro Next : sharp direct 0.34.5 reste présent ; SEC-001. API images sans remotePatterns large et CSP SVG ne corrigent pas un décodeur natif | [Bulletin octobre 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026) |
| SSRF Server Actions CVE-2024-34351 | Affecte >=13.4 et <14.1.1 ; Next 16.4.2 hors plage ; aucune Server Action locale ni allowedOrigins élargi | [Avis officiel](https://github.com/vercel/next.js/security/advisories/GHSA-fr5h-rqp8-mj6g) |
| Cache poisoning CVE-2025-49005 | Affecte >=15.3.0 et <15.3.3 ; Next 16.4.2 hors plage | [Avis officiel](https://github.com/vercel/next.js/security/advisories/GHSA-r2fc-ccr8-96c4) |
| Autres avis cache / SSRF | Aucun avis npm visant Next 16.4.2 dans cette exécution ; cela ne prouve pas l'absence universelle de CVE. Revoir les futurs bulletins | [Avis de sécurité du dépôt officiel](https://github.com/vercel/next.js/security/advisories) |

Lockfile `package-lock.json` commité, sources téléchargées depuis registry.npmjs.org et intégrités présentes. Aucun postinstall applicatif. predev/prebuild copient uniquement browser-image-compression et sa licence vers public/vendor depuis node_modules ; pas de téléchargement/exécution distant dans ce script. Les paquets avec script d’installation déclaré sont @parcel/watcher, @swc/core, core-js, es5-ext, esbuild, fsevents, sharp et unrs-resolver. Leurs manifestes correspondent à des paquets usuels, sans indicateur de typosquatting détecté ; cela ne constitue pas une preuve cryptographique d’intégrité du code de chaque dépendance.

## 5. Plan d'action priorisé

### Immédiat (24–48 h)

Aucune faille critique démontrée. Traiter néanmoins **SEC-001** immédiatement : sharp corrigé, contrôle de signature avant parsing, vérification des binaires déployés et tests upload. Ne pas attendre la mise à jour Next annoncée pour novembre.

Décider de la publication des sessions individuelles (**SEC-002**) ; restreindre les détails avant toute diffusion du site si la publication de parcours pseudonymes n'est pas explicitement souhaitée. Si le back-office doit rester une démonstration publique, le convertir en agrégats ou données de démonstration.

### Court terme (1–2 semaines)

1. **SEC-003/004** : sessions admin aléatoires expirantes/révocables, budget login partagé, contrôles aux handlers.
2. **SEC-005/006/007** : capacités visiteur distinctes, quotas indépendants des identifiants client, traitement image après admission au budget ; plafonds compte/invité et dépenses côté plateforme.
3. **SEC-008** : propager le retrait à Clarity, vérifier le réseau après révocation sur le domaine publié.
4. **SEC-009/011/012** : clôturer ou qualifier l'import historique, filtrer erreurs techniques, mettre à jour les parents vulnérables sans rétrograder automatiquement les outils.
5. Réconcilier schéma SQL déployé et dépôt, exécuter les tests d'isolation sur une base de test, contrôler bucket et dashboard Auth.
6. Relire les avis Next publiés le **3 novembre 2026**, puis mettre à jour si applicable.

### Moyen terme

- **SEC-010/013/014/015** : CSP globale testée, marqueurs serveur, contrôles de session dans la DAL et handlers, retrait de la garantie de sanitizer regex pour du contenu externe.
- Ajouter à la CI une vérification de secrets, un audit de dépendances trié par accessibilité réelle et des tests négatifs de contrôle d'accès ; suivre la rotation et la rétention des secrets/journaux.
- Formaliser les choix de confidentialité : données détaillées publiques, paramètres d'URL envoyés aux analytics, images tierces, durée de rétention et retrait du consentement.
- Surveiller la croissance des comptes invités et journaux d'opérations ; vérifier restauration, alertes de coûts et accès de l'équipe.

**Validation requise avant toute correction :** ce rapport ne modifie ni configuration, ni dépendance, ni schéma, ni donnée de production. Les changements seront à appliquer un par un après validation, avec leurs tests et migrations revues.

## Annexe A — Résultat npm audit et portée

Commande : `npm audit --json --ignore-scripts`. Code de sortie **1**, attendu lorsque des vulnérabilités sont trouvées. Registre consulté le 31 octobre 2026. 1 020 dépendances comptabilisées par npm ; les catégories prod/dev/optional peuvent se recouper.

| Niveau npm | Paquets affectés |
|---|---|
| Critique (0) | — |
| Élevé (2) | sharp, body-parser |
| Moyen (19) | @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, @next/eslint-plugin-next, @ts-morph/common, @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint, eslint-config-next, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react, minimatch, shadcn, ts-morph, typescript-eslint |
| Faible (3) | @primer/react, @shadcn/registry, deepmerge |

| Avis racine | Version(s) verrouillée(s) / impact résumé | Correctif selon l'avis/audit |
|---|---|---|
| [GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) | sharp 0.34.5, libvips ; codecs natifs non fiables | >=0.35.0, mais insuffisant pour les deux avis suivants |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | sharp 0.34.5, libheif ; RCE conditionnelle | >=0.35.4 |
| [GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w) | sharp 0.34.5, librsvg ; corruption mémoire | >=0.35.5 |
| [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) | body-parser 2.3.0 ; DoS corps compressé avec octets finaux | >=2.4.0 |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | minimatch 3.1.5 et 10.2.6 ; amplification de motifs glob | >=11.0.1 ; compatibilité parents à vérifier |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | deepmerge 4.3.1 ; empoisonnement du prototype de l'objet retourné | Pas de solution compatible proposée par npm dans ce graphe |

Les « fixAvailable » npm qui proposent eslint 4.0.0, eslint-config-next 0.2.4 ou shadcn 1.0.0 ne doivent pas être appliqués aveuglément. La priorité est sharp dans le runtime puis les chaînes réellement utilisées. Aucun paquet n'a été déclaré malveillant à partir de son seul nom ou de l'audit npm.
