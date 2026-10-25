# Tetris Lava — plan et analyse

## Existant
Next.js 16.4.2 App Router, React 19, TypeScript strict, next-intl (7 langues, français sans préfixe). Tailwind 4 et globals.css. Les guides locaux Next page/not-found/sitemap ont été consultés.
Réalisations : content/{locale}/realisations.md, frontmatter JSON lu par gray-matter dans src/lib/content.ts. CaseStudyCard : title/status/slug/cover light+dark. Liste : app/[locale]/(site)/realisations/page.tsx. Étude : content/{locale}/case-studies/{slug}.md, getCaseStudy et CaseStudyStory ; métadonnées Next par page. Lava réutilise ces formats, le shell et les composants de récit ; insertion du jeu avant le process.
UI obligatoire : composants locaux shadcn/Radix Button, Badge, Card, Sheet. Typographie héritée Google Sans, mono Geist. Aucun moteur d’animation : CSS existant, easing cubic-bezier(.22,1,.36,1), reveal 450ms, shine 750ms. Ajout de motion pour les springs caméra.
Tokens : globals.css :root/.dark, couleurs sémantiques neutres, radius .625rem décliné, spacing Tailwind, contrôles 32px desktop/44px mobile (<768px). Pas de tokens de motion nommés : extension additive pour Lava. Palette et intensités centralisées ; aucun changement de DA globale.

## Exécution
1. Branche feature/tetris, npm ci, référence MIT temporaire et attribution.
2. Engine TypeScript isolé : SRS, collisions, 7-bag, lock delay capé, score/combo/B2B, hold et événements ; tests déterministes.
3. Rendu WebGL à voisinage borné, metaballs par couleur, reflets et bulles ; fallback SVG. Résolution adaptative, suspension hors focus.
4. Contrôles clavier DAS/ARR et tactiles/gestes, safe areas et dvh. UI existante, réglages persistés, reduced motion, haptiques isolées.
5. Entrée Markdown, page et process ; flag commun liste/page/proxy, noindex, exclusion sitemap.
6. Tests engine, lint, types, build ; serveur local et captures Playwright light/dark mobile/desktop ; vérification des deux flags.
7. Documentation de lancement, limites observées et commits locaux atomiques. Aucun push/déploiement.

## Réalisation et vérification
Les étapes 1 à 7 sont exécutées. Moteur (78 tests), shader WebGL 1 et fallback, springs/haptiques, contrôles tactiles/clavier, settings persistés, récit Markdown/covers et feature gate livrés. Sept tests navigateur passent, dont paysage et fallback. Flag désactivé vérifié sur un build de production local : carte absente et 404 HTTP dans quatre variantes de langue, absence du sitemap. Détails et limites matérielles : docs/tetris/VERIFICATION.md et TETRIS_README.md.

## Corrections V3
P0 puis sections 1–6 exécutées dans des commits distincts : isolation iPhone, section Jeux, menu minimal, plein écran/HUD/pause, silhouettes lumineuses, récompenses et caméra par ligne, ouverture première partie. Vérification finale : 83 tests unitaires et 9 parcours activés ; 2 parcours flag off en production locale. Rapport et 30 captures : docs/tetris/v3. Aucune feature V2.

## Retours suivants
Priorités traitées : Safari via LAN (reproduit/corrigé), aération des portails, boutons et retours, puis matière posée unique irisée. 83 tests unitaires, 10 parcours activés et 2 parcours flag off passent ; builds/lint/types validés. Captures et diagnostic : docs/tetris/v4.

## Roadmap V2
La planification des fonctionnalités futures est détaillée dans [V2_PLAN.md](V2_PLAN.md). Elle ne démarre aucun développement : priorité à la fiabilité matérielle puis au son, suivis du défi quotidien, du classement et du duel privé.
