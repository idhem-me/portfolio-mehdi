# Audit de migration MTMD

11 novembre 2026. Dépôt local `portfolio-mehdi`, branche `main`, commit `17e8353`. La copie de travail était propre au début de l’audit. Le remote `origin` pointe vers [idhem-me/portfolio-mehdi](https://github.com/idhem-me/portfolio-mehdi). L’audit porte sur le code local, les domaines du projet Vercel et des comptages en lecture seule dans Supabase.

## 1. Architecture et arborescence

Le dépôt contient une application Next.js **16.4.3** App Router, React **19.3.0**, TypeScript **5.9.3**, Tailwind CSS **4** et `next-intl`. npm est le gestionnaire du projet et `package-lock.json` verrouille les dépendances. Vercel indique Next.js et Node **24.x**. Le poste d’audit utilise Node 26.3.0 et npm 11.16.0. La recette de référence devra reproduire Node 24 et l’installation du lockfile.

```text
portfolio-mehdi/
├── content/ et messages/                         Contenu et dictionnaires des sept langues
├── src/app/layout.tsx                             Polices, thème, compte, analytics
├── src/app/[locale]/(site)/                       Portfolio, Outils et écrans créateur
│   └── outils/listes-cadeaux/{page.tsx,[id]/page.tsx}
├── src/app/[locale]/(gifts)/                      Écrans invité, alias et annulation
│   ├── l/[slug]/page.tsx
│   └── listes/{[slug],annuler}/page.tsx
├── src/app/api/{gifts,tetris/gifts,tetris/auth}/    API invité, API créateur et compte
├── src/features/gift-lists/{types.ts,ui/,server/}  Interface, modèle et métier Liste
├── src/features/{account,tetris,cards}/            Compte commun, OAuth et intégrations jeux
├── src/components/{ui,design-system,layout}/      Primitives, thème et mise en page
├── src/{i18n/,proxy.ts}                           Routage, langues et gardes
├── scripts/sync-gift-heic.mjs                     Génération du worker photo HEIC
├── docs/sql/ et supabase/migrations/              Installation et évolutions SQL
├── tests/gift-*                                   Tests métier et navigateur
└── package*.json, next.config.ts, vercel.json     Dépendances, build, en-têtes et cron
```

Les routes publiques principales du portfolio sont `/`, `/a-propos`, `/realisations`, `/realisations/onewallet`, `/realisations/trusted-interactions`, `/product-designer`, `/product-designer/onewallet`, `/contact`, `/outils`, les cinq autres outils sous `/outils`, le catalogue `/jeux` et les pages publiques du Playground. Le français est sans préfixe, avec variantes `en`, `ar`, `de`, `es`, `it`, `zh`. Les espaces d’administration et les jeux masqués gardent leur traitement spécifique. Le [registre des routes](inventory.md#registre-des-routes) recense aussi les API. `/projets` n’est pas le chemin actuel des réalisations.

`next.config.ts` active Cache Components et Turbopack, configure `next-intl`, les redirections, la CSP et la réécriture de sanitisation SVG. `predev` et `prebuild` génèrent les assets image. `vercel.json` programme `/api/cron/purge` à 03 h UTC pour le backoffice et la sécurité. Ce cron relève du Portfolio. Les autres fonctions du portfolio utilisent aussi Supabase, et des composants historiques référencent libSQL/Turso et SQLite. Le chemin Liste utilise les API Supabase côté serveur.

## 2. Liste et dépendances à extraire

| Surface | Chemin actuel | Traitement proposé |
| --- | --- | --- |
| Créateur | `/outils/listes-cadeaux` et `/outils/listes-cadeaux/[id]` | Dashboard à `/` sur `list.mtmd.fr`, détail conservé au même chemin pour limiter les adaptations |
| Invité | `/l/[slug]` | Même chemin et même slug |
| Alias invité | `/listes/[slug]` | Conserver l’alias et rediriger les anciens liens directement vers `/l/[slug]` à la bascule |
| Annulation | `/listes/annuler?retour=…#<secret>` | Même chemin, query conservée, fragment conservé côté navigateur |
| Créateur et extraction | `/api/tetris/gifts` et `/api/tetris/gifts/extract` | Conserver les chemins dans le premier build pour garder le périmètre du cookie |
| Lecture et réservation invité | `GET` et `POST /api/gifts/[slug]` | Conserver le contrat HTTP |
| Annulation invité | `POST /api/gifts/cancel` | Conserver le contrat HTTP et la confirmation explicite |

Le dossier `src/features/gift-lists` contient `creator.tsx`, `public.tsx`, les formulaires et vues grille/tableau, les types, les handlers, le traitement de photo et l’extraction produit. L’UI utilise React, SWR, `next-intl`, Tailwind, les primitives locales et Radix, Lucide et `qrcode.react`. La chaîne serveur utilise `@supabase/supabase-js`, `@supabase/ssr`, Zod, Sharp et les modules réseau Node. Le chargement de photos réutilise la détection HEIC et la validation de signature de deux autres fonctionnalités, ainsi que le worker `public/vendor/gift-heic-worker.js` généré via `heic2any`. Reprendre ces utilitaires et la CSP du worker avec les styles et polices nécessaires. Vérifier sur iPhone les photos, l’affichage tableau, les dialogues et les parcours de partage.

L’authentification est la principale dépendance au portfolio. Le provider et le bouton Google viennent de `src/features/account`. Le client SSR, l’identité et les routes OAuth se trouvent en partie dans `src/features/tetris`. Le démarrage et le callback exécutent aussi des opérations de transfert de sauvegarde Cards. Reprendre le contrat Google/PKCE, le traitement de la popup et les contrôles de session et d’origine, puis retirer les appels Cards et les branches de jeu de la copie destinée à Liste. Reprendre les libellés utilisés et le routage des sept langues. Les écrans Liste eux-mêmes contiennent encore du texte français dans leur implémentation actuelle.

Les appels navigateur restent sur la même origine. L’extraction produit effectue des requêtes serveur vers des boutiques et applique des protections contre les requêtes vers des réseaux privés, des limites et un repli vers la saisie manuelle. Reprendre aussi les gardes `src/lib/security` et `src/lib/backoffice/request-origin.ts` effectivement importées. Vérifier la CSP sur la nouvelle racine et conserver `noindex`, `no-referrer`, les réponses privées sans cache et l’absence d’analytics sur les écrans de listes.

## 3. Données à conserver

| Stockage | État constaté et conséquence |
| --- | --- |
| Supabase PostgreSQL | **2 listes, 16 cadeaux et 0 réservation** au moment de l’audit. Les 3 tables `gift_lists`, `gift_items` et `gift_reservations` ont RLS activé. Les comptages ont porté sur le projet Supabase connecté, dont le lien exact avec les variables Production Vercel reste à confirmer avant bascule. |
| Images et commentaires | 2 couvertures intégrées aux lignes, 2 cadeaux avec commentaire, 16 images de cadeaux référencées par des URL externes. Le code stocke également les photos importées sous forme de WebP encodé dans les lignes. Aucun bucket de photos Liste n’est utilisé par ce chemin. La disponibilité des images externes dépend de leurs hébergeurs. |
| Auth Supabase | Les listes sont rattachées au compte propriétaire. Réutiliser le même projet Auth et le même compte Google pour conserver le même identifiant propriétaire. Les cookies sont liés à l’hôte et au chemin `/api/tetris`. Une nouvelle connexion sera nécessaire sur les nouveaux hôtes. |
| `localStorage` | Préférences grille/tableau et reçus `gifts.receipts.<slug>`, avec secrets d’annulation. Les reçus sont spécifiques à chaque origine. Seule l’empreinte du secret d’annulation est conservée côté serveur. |
| `sessionStorage` | Tentatives de réservation en cours, liées à l’origine et à l’onglet. Une nouvelle tentative doit réutiliser les mêmes données et le même jeton pour éviter un doublon après perte de réponse. |

Recommandation de bascule. **Connecter Liste au même projet Supabase sans déplacer les lignes ni changer le schéma.** Les identifiants de propriétaires, UUID, slugs, couvertures, textes, liens marchands et commentaires restent en place. Les éventuelles réservations et empreintes d’annulation créées d’ici la bascule restent également dans les mêmes tables. Les RPC `gift_read_public`, `gift_read_owner_reservations`, `gift_reserve` et `gift_cancel` conservent leurs droits et leur contrat. Les SQL de référence sont dans `docs/sql/gift-*.sql`, `supabase/migrations/20261031094755_gift_item_uploaded_photos.sql` et `supabase/migrations/202611110001_gift_item_comment.sql`.

Avant d’ouvrir le nouveau site aux écritures de production, faire un export logique protégé et vérifier sa restauration hors production. Comparer les identifiants, comptages et champs critiques sur les deux surfaces avec le compte propriétaire et un lien invité existant, sans publier leurs valeurs dans le rapport. Établir un nouveau relevé juste avant la bascule. Une sauvegarde SQL conserve les chaînes d’URL des photos externes. Elle ne conserve pas les fichiers servis par les marchands. [Sauvegardes Supabase](https://supabase.com/docs/guides/platform/backups)

Avant de rediriger les anciennes pages, conserver une période où elles permettent de terminer une réservation en attente et de récupérer les reçus sur l’origine qui les a enregistrés. Tester un transfert local des reçus si nécessaire, avec import et déduplication côté navigateur et sans envoi des secrets à un serveur. Tester un ancien lien d’annulation avec sa query et son fragment de bout en bout. Les reçus absents d’un navigateur restent accessibles uniquement si l’invité dispose du lien d’annulation ou peut retourner à son stockage local d’origine. Le comptage SQL à zéro ne renseigne pas le stockage des navigateurs.

## 4. Déploiement, secrets et compatibilité des domaines

| Hôte | État observé le 11 novembre |
| --- | --- |
| `mtmd.fr` | Vérifié sur `portfolio-mehdi`. HTTPS **308** vers `www.mtmd.fr`. |
| `www.mtmd.fr` | Vérifié sur `portfolio-mehdi`. HTTPS **200** à la racine. |
| `portfolio-mehdi-nu.vercel.app` | Vérifié sur `portfolio-mehdi`. HTTPS **200** à la racine. |
| `portfolio.mtmd.fr` et `list.mtmd.fr` | Aucune résolution lors du contrôle public, domaines absents des associations du projet Portfolio. |

Les NS publics de `mtmd.fr` sont `cosmos.dns-parking.com` et `nova.dns-parking.com`. L’association d’un nom au projet Vercel, le DNS et l’émission HTTPS se vérifient séparément. Après autorisation d’ajouter un domaine à son projet, relever la valeur exacte de Vercel et la soumettre pour validation avant édition dans hPanel. Préserver MX et TXT existants. Les trois projets entrent dans les limites de nombre de projets et de domaines du plan Hobby pour un usage personnel. Relever la consommation effective lors de la recette. [Configuration de domaine Vercel](https://vercel.com/docs/domains/set-up-custom-domain) · [Vercel Hobby](https://vercel.com/docs/plans/hobby)

| Application | Variables à prévoir à partir du code |
| --- | --- |
| Liste | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` ou `SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`. `GOOGLE_CLIENT_ID` si la voie de connexion par jeton Google est reprise. La clé privilégiée reste dans les handlers serveur. Configurer une clé serveur dédiée au projet Liste si le projet Supabase le permet. Sur une base partagée, cette clé a encore des privilèges à l’échelle de la base. |
| Portfolio | Inventorier les noms déjà configurés sur Vercel par environnement. Conserver les variables Auth et Supabase utilisées par les autres fonctionnalités, les flags de jeu, les variables de sécurité, d’administration, de contact et d’analytics, et celles des éventuels chemins libSQL. Aucun retrait de variable sur la seule base de l’extraction. |
| Hub | Aucun secret attendu pour un site statique. |

Préférer des données de test locales ou dédiées en Preview, et réserver la configuration Production aux déploiements autorisés. Pour OAuth, ajouter les callbacks applicatifs exacts des deux nouveaux hôtes dans les URL de redirection Supabase, en gardant l’alias historique et `www` pendant la transition. Le callback de Google Cloud est celui du projet Supabase. Si le flux Google par jeton est conservé, vérifier aussi les origines JavaScript autorisées. L’URL Vercel historique est référencée dans `docs/tetris/GOOGLE_AUTH_SETUP.md`. Les liens de partage actuels sont construits à partir de l’origine de la page. [URL de redirection Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

## 5. Fichiers et ordre d’exécution

Trois dépôts sont adaptés. Le partage de primitives est limité à un sous-ensemble extractible. Un monorepo simplifierait la synchronisation de ces primitives, mais demanderait un remaniement des chemins, du build et du dépôt de production. Le Hub n’a pas de dépendance au runtime des autres sites. Garder l’historique du Portfolio dans son dépôt. Pour Liste, évaluer l’extraction d’un historique filtré dans une copie jetable, sur les fichiers effectivement repris et après revue des commits exportés. Documenter le commit source si un historique filtré s’avère disproportionné.

1. **Sauvegarde et référence.** Faire une sauvegarde Git du Portfolio et identifier le déploiement Vercel à restaurer en cas de besoin. Confirmer la base Production et préparer la sauvegarde vérifiée de Liste. Sur une branche dédiée, faire une installation propre et rejouer build, lint, typecheck et tests sous Node 24, puis relever les pages, assets et comportements publics. Le correctif Next.js vient d’être intégré localement. Le statut Vercel `READY` ne prouve pas que le déploiement observé utilise le même commit.
2. **Portfolio.** Après accord, associer `portfolio.mtmd.fr` au projet existant, relever le CNAME et faire valider sa pose. Vérifier HTTPS, navigation, assets, auth, langues, routes masquées et redirections existantes. Ajouter ensuite les canoniques, `hreflang`, Open Graph, `src/app/robots.ts` et `src/app/sitemap.ts` pour les pages publiques pertinentes. Garder les alias actuels pendant la recette.
3. **Liste.** Créer `mtmd-list` localement avec `src/app`, le module Liste, les morceaux nécessaires de compte, de design system et de sécurité, les messages, le worker et ses scripts, les tests et références SQL. Ajouter `package.json`, le lockfile, `next.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example` et `README.md`. Adapter `src/app/layout.tsx`, `src/proxy.ts`, la navigation, les URLs de partage et la CSP au périmètre autonome. Construire et tester en local. Après accord, publier le dépôt, créer le projet Vercel, configurer les variables et OAuth, puis vérifier l’URL de test et enfin `list.mtmd.fr` après validation DNS.
4. **Recette Liste puis nettoyage.** Avec le compte Google d’origine, confirmer l’accès aux listes existantes et leur rendu invité. Sur des données de test, vérifier création, édition, photos HEIC/WebP, extraction, QR, confidentialité, mode Surprise, réservation, participation, réponse perdue, annulation et affichage mobile. Vérifier les anciens liens et les reçus locaux avant de fermer la transition. Après validation explicite, modifier le catalogue `src/app/[locale]/(site)/outils/page.tsx` et les redirections de `next.config.ts`, retirer les routes et modules Liste devenus inutiles, et revoir imports d’analytics, en-têtes, démos, tests et dépendances. Préserver les utilitaires encore utilisés par les autres outils. Les redirections de pages restent temporaires pendant la recette. Traiter séparément les anciens endpoints de mutation et les callbacks pour éviter de transmettre des POST ou des secrets entre domaines.
5. **Hub.** Créer `mtmd-hub` après la validation et le nettoyage de Liste. Générer `/about`, `/projects`, `robots.txt`, `sitemap.xml` et éventuellement `llms.txt`, en réutilisant les informations vérifiables de `content/` et `src/data/profile-meta.ts`. Prévoir des liens HTML, des canoniques, Open Graph et des données Schema.org alignées sur le contenu. Configurer dans `vercel.json` le 307 de la racine seule vers le Portfolio. Vérifier l’URL Vercel de test avant de transférer les associations `mtmd.fr` et `www.mtmd.fr`. La racine en 307 est exclue du sitemap et les liens privés Liste restent hors des sitemaps.

### Correspondances de bascule

| Anciennes pages sur l’apex, `www`, l’alias historique ou le Portfolio | Destination |
| --- | --- |
| `/outils/listes-cadeaux` | `https://list.mtmd.fr/` ou variante localisée |
| `/outils/listes-cadeaux/[id]` | Même chemin sur `list.mtmd.fr` |
| `/l/[slug]`, `/listes/[slug]` | `/l/[slug]` sur `list.mtmd.fr` |
| `/listes/annuler` | Même chemin sur `list.mtmd.fr` avec query et fragment préservés |
| Anciennes routes publiques du Portfolio, hors Liste | Même chemin et même langue sur `portfolio.mtmd.fr` |
| `mtmd.fr/` | 307 vers `https://portfolio.mtmd.fr/` |
| `www.mtmd.fr` | Redirection vers l’apex pour les routes Hub. Règles ciblées prioritaires pour les anciennes pages Portfolio et Liste afin d’atteindre leur destination en un saut. |

Les redirections de compatibilité de l’apex et de `www` devront être prises en charge par le Hub une fois les deux domaines transférés. Vérifier avant d’inverser le sens de redirection que le **308 historique apex → www** mis en cache ne boucle pas avec **www → apex**. Prévoir une transition avec destination directe vers le Portfolio depuis `www` pour les chemins concernés, y compris la racine si nécessaire, et valider le passage au comportement final sur navigateurs avec et sans cache. Garder le déploiement précédent disponible pour retour arrière. Vérifier ensuite HTTPS, codes, variantes de langue, absence de boucles et propriétés Search Console après autorisation.

## 6. Validation et approbations

- 17 tests locaux ciblés réussis, avec le helper `server-only` du dépôt. Un scénario HTTP/Supabase réel est resté désactivé, car il crée puis supprime des données de test. Aucun build propre ni parcours OAuth réel lancé dans cet audit. Le déploiement Vercel observé était `READY` et les deux hôtes servant le Portfolio ont répondu en HTTPS.
- Premier accord distant à demander après préparation de la sauvegarde et de la recette de référence. Ajouter `portfolio.mtmd.fr` au projet Vercel existant. Faire valider ensuite la valeur DNS exacte avant toute intervention Hostinger et les changements de callbacks ou d’origines Google/Supabase nécessaires.
- Accords suivants. Création et publication des dépôts GitHub et projets Vercel, configuration distante des secrets, éventuels tests distants qui écrivent, DNS de Liste, suppression de l’ancienne implémentation, bascule de l’apex et de `www`, activation des redirections permanentes et changements Search Console.

## 7. Sauvegarde et recette de référence du Portfolio

- Sauvegarde Git locale `mtmd-backup-2026-11-11.FsfDcj/portfolio-mehdi.bundle`, conservée à côté du dépôt dans le workspace. Le bundle contient l’historique et les références Git. `git bundle verify`, la vérification SHA-256 et un clone de restauration sur `main` ont réussi. Le rapport d’audit a été copié séparément. Les données Supabase et les fichiers d’environnement sont hors de cette sauvegarde Git.
- Point de restauration Vercel identifié à partir de l’alias public. Déploiement `dpl_8qXR4WiUzCWdeezZTFmzActA248q`, état `READY`, cible Production, branche `main`, SHA `17e83538afc5300c523652bcac525279f49a6e7e`. Il correspond au commit restauré depuis le bundle.
- Installation reproductible et build Turbopack réussis dans une copie du commit sous Node 24.22.2, avec 295 pages générées. L’accès réseau à Google Fonts était nécessaire. Le build signale un avertissement de métriques de police de repli pour Google Sans. Le lint de `src`, `tests`, `scripts` et `next.config.ts` ainsi que 253 tests locaux passent. Le test distant Liste qui écrit reste désactivé.
- Typecheck réussi. Sur `www.mtmd.fr`, 23 navigations Chromium, dont le catalogue Outils dans les sept langues et le parcours historique `/product-designer` vers `/a-propos`, et 4 navigations WebKit avec profil iPhone 13 ont réussi. La recette vérifie les titres, les erreurs JavaScript et les erreurs HTTP des assets Next.js, ainsi que `noindex` et `no-referrer` sur l’entrée Liste. Les appels de mutation et les services tiers sont bloqués dans ces sessions de vérification. La connexion Google réelle reste à vérifier.
- La clé publiable Supabase configurée sur Vercel pour Production correspond à celle du projet inspecté. La comparaison a été faite sans afficher les valeurs. L’export logique restaurable de Liste est à effectuer avant l’ouverture de la nouvelle application aux écritures de production. Utiliser le processus de sauvegarde Supabase depuis un accès PostgreSQL approuvé et vérifier les tables `gift_*`, les couvertures, les UUID, les slugs et les références des propriétaires sur une instance isolée. [Procédure de sauvegarde et restauration](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
- La consultation en lecture seule de la configuration Vercel pour `portfolio.mtmd.fr` recommande actuellement un CNAME `portfolio` vers `a5814db3c09cfb62.vercel-dns-017.com.`. Recontrôler la valeur après l’association du domaine et la faire valider séparément avant la pose dans hPanel. L’ajout peut être effectué depuis **Vercel → portfolio-mehdi → Domains**. Le domaine racine et `www` restent sur leur configuration actuelle pendant cette étape.

## 8. Association de `portfolio.mtmd.fr`

- Avec l’accord du propriétaire, Vercel a ajouté `portfolio.mtmd.fr` au projet de production `portfolio-mehdi`. La configuration relue après l’ajout confirme le CNAME `portfolio` → `a5814db3c09cfb62.vercel-dns-017.com.`. La résolution publique et le certificat HTTPS restent à vérifier après la pose DNS. Les domaines précédents servent toujours les mêmes destinations.
- Dans hPanel, ouvrir **Domaines → Portefeuille de domaines → mtmd.fr → DNS / Serveurs de noms → Enregistrements DNS**. Ajouter un enregistrement de type `CNAME`, nom `portfolio`, cible `a5814db3c09cfb62.vercel-dns-017.com.`, TTL par défaut. Après validation de la modification, vérifier la résolution, l’état Vercel et la recette HTTPS. [Gestion des enregistrements DNS Hostinger](https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records-at-hostinger)
- Les 27 fichiers Google Sans référencés dans le build local sont présents. Sur `www.mtmd.fr`, Chromium et WebKit ont chargé Google Sans et l’ont sélectionnée comme police du document. L’avertissement de build concerne les métriques automatiques de la police de repli. Aucun changement de police nécessaire.

## 9. Publication DNS du Portfolio

- Hostinger a confirmé l’ajout du CNAME `portfolio` avec le TTL par défaut de `14400` secondes. Les deux entrées préexistantes, `A @` et `CNAME www`, sont restées en place. Le dernier instantané DNS avant l’ajout est le `196032532` dans l’historique hPanel.
- Vercel détecte le CNAME attendu et ne signale aucun conflit. Le résolveur public Cloudflare renvoie le bon CNAME. Le résolveur local avait encore une réponse négative au moment du contrôle. Chromium a vérifié le certificat de `portfolio.mtmd.fr` et répondu en TLS 1.3 en utilisant l’adresse fournie par le résolveur public.
- Les 23 navigations Chromium ont réussi sur le nouvel hôte, dont les sept langues d’Outils, les réalisations et l’entrée Liste. Les en-têtes privés de l’entrée Liste sont présents et Google Sans se charge. Les hôtes `www.mtmd.fr` et `portfolio-mehdi-nu.vercel.app` répondent toujours en HTTPS.
- L’accueil ne déclare pas encore d’URL canonique. Il reste à préparer les métadonnées, le sitemap et les réglages OAuth du nouveau domaine, puis à vérifier le parcours Google avec un compte existant. La mise à jour DNS n’a modifié ni la base Supabase ni le déploiement du portfolio.

## 10. Préparation SEO et contrôle OAuth

- Le lot SEO local cible `https://portfolio.mtmd.fr`. Les pages publiques principales déclarent une canonique, sept variantes `hreflang`, `x-default` et des métadonnées Open Graph. Les fiches individuelles du Pokédex déclarent aussi leur canonique. Le sitemap recense les pages principales et le catalogue Pokédex. Les fiches individuelles, les anciennes URL de redirection, les pages Liste privées, les espaces d’administration et les jeux masqués sont hors du sitemap.
- Build Node 24, lint ciblé, typecheck et 253 tests locaux réussis. Sur le serveur du build local, les 119 URL du sitemap ont répondu 200 avec les canoniques, variantes et URL Open Graph attendues. Les vérifications ont aussi porté sur `robots.txt`, la canonique d’une fiche Pokédex avec paramètre, l’image Open Graph, les en-têtes des listes et le statut 404 des jeux masqués. Le test distant Liste avec écritures reste désactivé.
- Dans Supabase **Authentication → URL Configuration**, la Site URL est l’alias Vercel historique. Les deux callbacks listés sont celui de l’alias et celui de `localhost:3000`. `https://portfolio.mtmd.fr/api/tetris/auth/callback` est absent. Proposer l’ajout de ce callback exact en conservant les entrées existantes, puis tester la connexion avec le compte Google d’origine. [Configuration Supabase](https://supabase.com/docs/guides/auth/redirect-urls)
- Le lot SEO reste local et le réglage Supabase a été consulté en lecture seule. Autorisations à obtenir pour publier le lot sur GitHub et pour modifier la liste des callbacks Supabase.

## 11. Callback Google et publication du lot SEO pour revue

- Avec l’accord du propriétaire, `https://portfolio.mtmd.fr/api/tetris/auth/callback` a été ajouté dans les URL de redirection Supabase. Les deux URL précédentes sont toujours dans la liste. Le test anonyme a confirmé que le Portfolio transmet ce callback à Supabase et que Supabase redirige vers Google. Il reste à terminer la connexion avec le compte d’origine et à retrouver les listes existantes dans l’espace créateur.
- Le commit `6661742` est publié sur `feat/portfolio-seo`. La [pull request GitHub nº 7](https://github.com/idhem-me/portfolio-mehdi/pull/7) est ouverte vers `main` pour revue. Le rapport d’audit reste local. Le lot SEO n’a pas été fusionné ni déployé en production.
- La prévisualisation Vercel du commit `6661742` est `READY`. Son `/sitemap.xml` répond 200 et contient 119 URL. `portfolio.mtmd.fr` sert toujours le commit de production `17e8353`.

## 12. Mise en production du référencement et contrôle des listes

- La [PR nº 7](https://github.com/idhem-me/portfolio-mehdi/pull/7) a été fusionnée après succès des contrôles Vercel. Le déploiement `dpl_8wu9uMsEpgi1CJUuzWepQ1CLjx89`, commit `1ba11a6`, est `READY` et sert `portfolio.mtmd.fr`. Les 119 URL ont répondu 200 avec leurs canoniques, variantes de langue et URL Open Graph. `robots.txt`, les anciennes adresses et les protections de Liste ont aussi été vérifiés.
- La connexion Google a abouti sur `portfolio.mtmd.fr`. Le compte connecté voit une liste. Un comptage Supabase en lecture seule a confirmé que les deux listes appartiennent à deux comptes distincts, avec respectivement 5 et 11 cadeaux. Le chemin de lecture invité en base renvoie ces mêmes comptages. La connexion avec le second compte n’a pas été testée.
- Pour l’extraction, conserver les deux associations `user_id` d’origine. Réaliser et vérifier la sauvegarde logique avant les écritures sur la future application Liste, puis tester les deux comptes séparément.

## 13. Sauvegarde et extraction locale de Liste

- L’instantané logique des trois tables `gift_*` est conservé hors Git dans le dossier local `mtmd-backup-2026-11-11.FsfDcj/listes-supabase-2026-11-11`. L’empreinte SHA-256 du JSON a été vérifiée. La restauration PostgreSQL locale a reproduit toutes les lignes et les comptes de lecture invité (5 et 11 cadeaux), et confirmé l’isolation des deux propriétaires. Les comptes locaux de vérification contiennent uniquement les UUID propriétaires. Les identités et sessions restent dans Supabase Auth.
- Le dépôt autonome local `mtmd-list` est au commit `505901d`. Il reprend l’interface, les sept variantes de langue, les routes de détail, d’invitation et d’annulation, les formulaires et photos. Le tableau de bord est disponible à la racine et l’ancienne entrée reste servie. La connexion Google conserve Supabase comme source d’identité et n’importe plus le code des jeux. Le contrôle en lecture seule a confirmé les droits d’exécution des six fonctions de base requises par l’application.
- Build sous Node 24, lint, typecheck, 17 tests unitaires et 8 parcours navigateur Chromium et WebKit iPhone réussis. Le build conserve l’avertissement Google Sans sur les métriques de repli. Les tests navigateur simulent les comptes et les réponses métier. La connexion réelle des deux propriétaires sur le domaine Liste reste à vérifier après déploiement et configuration OAuth.
- Le dépôt local est prêt pour revue avant sa publication sur GitHub et la création de son projet Vercel. Le Portfolio en production sert encore Liste sur les routes existantes.

## 14. Premier aperçu Vercel de Liste

- Le dépôt GitHub privé [idhem-me/mtmd-list](https://github.com/idhem-me/mtmd-list) contient le commit `505901d`. Le projet Vercel indépendant `mtmd-list` est lié à ce dépôt et utilise Node 24.
- Vercel a classé le premier build Git de `main` en Production sur le domaine technique `mtmd-list.vercel.app`. La branche `preview` porte le même commit et son [déploiement Preview](https://mtmd-list-34hr6bq8p-idhem-env.vercel.app) est `READY`. Le projet n’a aucune variable configurée et son seul domaine associé est l’alias technique.
- Contrôles HTTPS sur sept routes du build de `main`, en-têtes `noindex`, `no-referrer` et CSP, alias invité, worker HEIC, refus de l’accès créateur anonyme et indisponibilité explicite de l’API de données sans configuration. L’accueil, la variante anglaise, un lien invité fictif et l’état de connexion ont aussi été contrôlés sur Preview.
- Après validation, configurer les variables Vercel Production et une clé serveur Supabase dédiée, associer `list.mtmd.fr`, ajouter son callback OAuth exact dans Supabase puis relever le CNAME pour l’autorisation DNS séparée. Préserver le projet Supabase et les deux propriétaires pendant cette étape.
