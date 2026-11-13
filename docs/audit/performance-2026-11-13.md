# Audit performance du portfolio — 13 novembre 2026

Périmètre : [production](https://portfolio.mtmd.fr/), en français, sans connexion ni choix de consentement préalable. Audit par trois agents (architecture, design et mesures terrain), complété par des mesures Chromium/Playwright en production. Le code local a été lu séparément ; les changements en cours n’ont pas été déployés ni assimilés à la production.

## Mesures

Chromium avec un contexte neuf par passage et cache navigateur désactivé. Mobile : 390 × 844 CSS, DPR 2, latence configurée à 150 ms, réception 1,6 Mbit/s et CPU ralenti ×4. Ordinateur : 1440 × 900, sans ralentissement. Les octets sont les transferts remontés par Chrome jusqu’à la fin de l’observation (événement load + environ 3 s) ; certains préchargements de navigation peuvent donc compter. LCP : rendu du plus grand élément visible. Les valeurs sont des mesures de laboratoire. [Repère LCP de 2,5 s](https://web.dev/articles/lcp).

| Page / profil | Premier affichage | LCP | Transfert | Détail |
| --- | ---: | ---: | ---: | --- |
| Accueil, ordinateur | 0,48 s | 0,48 s | 2,06 Mo | 3 passages ; LCP 0,43–0,80 s |
| Accueil, mobile | 2,55 s | 3,29 s | 1,68 Mo | 3 passages ; LCP 2,55–3,78 s ; avatar principal |
| Outils, mobile | 2,52 s | 5,96 s | 1,49 Mo | 3 passages ; LCP 5,94–5,98 s ; bloc de texte |
| Playground, mobile | 3,02 s | 8,15 s | 3,15 Mo | 3 passages ; LCP 8,14–8,64 s |
| Réalisations, mobile | 2,58 s | 22,02 s | 5,36 Mo | 3 passages ; LCP 15,14–22,22 s ; couverture de projet |

Les GET HTTP indépendants ont donné une médiane TTFB de 118 ms sur l’accueil (112–120 ms, trois HIT Vercel à Paris). Autres routes : Outils 198 ms, Playground 135 ms, Compression image 193 ms, Contact 132 ms. Certaines premières réponses étaient PRERENDER ; cet échantillon ne décrit ni tous les cache miss ni d’autres régions. Les temps de réponse sont faibles par rapport au LCP dans le profil mobile.

PageSpeed Insights n’a produit aucune mesure : API 429 et interface incapable de résoudre la cible lors de l’essai. [CrUX Vis](https://cruxvis.withgoogle.com/#/?view=cwvsummary&url=https%3A%2F%2Fportfolio.mtmd.fr%2F&identifier=origin&device=ALL&periodStart=0&periodEnd=-1&display=p75s) n’a renvoyé aucune mesure publique exploitable. Pas de score Lighthouse ni d’INP terrain attribués.

## Causes et expériences

- **Réalisations :** Chrome a téléchargé les quatre couvertures PNG, y compris les deux masquées par le thème actif, pour 3,98 Mo transférés. La page rend les quatre images dès le chargement, sans tailles responsives ([source](../../src/app/%5Blocale%5D/(site)/realisations/page.tsx)). Un essai Sharp en mémoire à 768 px et qualité WebP 80 donne 39 ko pour chacune des couvertures claires ; prévoir aussi des variantes haute densité et une recette visuelle.
- **Polices :** environ 900 ko transférés sur l’accueil et Outils ; le TTF arabe seul en représente 464 ko sur une page française. Trois mesures de l’accueil avec ce seul TTF bloqué dans Chrome : 1,21 Mo transféré, LCP médian 2,48 s (2,42–2,76 s). C’est une comparaison exploratoire, avec variabilité réseau ; le gain en octets est reproductible et ne suppose aucune suppression de la police pour la locale arabe. Le build local précharge encore 11 fichiers depuis le [layout racine](../../src/app/layout.tsx).
- **Avatar :** [14 poses demandées à l’hydratation](../../src/components/creative/gaze-avatar.tsx#L229). En conservant la pose initiale et en bloquant les autres, Chrome a transféré environ 265 ko de moins sur les deux passages réussis ; le troisième a expiré. Cette comparaison est trop petite pour attribuer un gain LCP précis.
- **JavaScript :** l’accueil mobile a transféré environ 408 ko de scripts. L’artefact local associe au fournisseur PostHog un fichier d’environ 120 ko gzip et au composant de gravité un fichier d’environ 26 ko gzip contenant Matter.js. Tester les imports à la demande (consentement ou action explicite), puis mesurer la frontière Suspense autour des analytics et les deux requêtes de compte globales. Ces attributions viennent du build local, pas d’une analyse de la couverture des scripts de production.
- **Fluidité après chargement :** le geste synthétique sur l’accueil n’a pas déplacé la page ; ce test ne tranche pas sur le scroll. Le suivi de l’avatar lit la position de son élément à chaque événement dans son chemin de repli. Frutiger Aero ajoute un fond PNG de ~1,45 Mo par variante et plusieurs flous ; ces pistes restent à profiler avec une trace de défilement sur une page longue. La gravité ne lance ses boucles qu’après activation.

## Ordre proposé

1. Réalisations : servir les images dans le thème courant, redimensionnées et compressées, et différer celles hors écran. Vérifier qu’un chargement initial ne demande aucune couverture du thème opposé.
2. Toutes les pages : précharger uniquement les polices utiles à la langue et au premier rendu. Tester la typographie dans les sept langues, avec WOFF2 arabe et contrôle des glyphes et des bascules de thème. Coordonner avec le travail local sur les polices.
3. Accueil : conserver la pose visible et demander les autres selon le besoin ; tester le chargement du moteur de gravité au déclenchement. Vérifier le suivi, le clin d’œil et la réduction des animations. Mesurer aussi les scripts analytics avant et après consentement.
4. Rejouer le même scénario mobile et ordinateur en preview et comparer trois passages par page. Cible initiale pour l’accueil : LCP de laboratoire ≤ 2,5 s ; si Outils reste lent, tracer le bloc de texte qui devient LCP tardivement. Profiler le scroll sur une page longue, en Sobre et Aero, sur un appareil mobile réel si disponible.

Audit documentaire uniquement. Aucun build applicatif relancé ni test de régression exécuté, puisqu’aucun code applicatif n’a changé. Le démarrage du serveur local dans le bac à sable a été refusé au bind (EPERM) ; les mesures ciblent directement la production depuis Chromium et curl.

## Vérification du lot de chargement à la demande

Sur un build Webpack de production exécuté sur localhost, trois passages Chromium avec le même profil mobile donnent un LCP médian de 0,81 s et 486 ko transférés sur l’accueil, puis 3,34 s et 500 ko sur Réalisations. Le test attend le décodage de la première couverture. L’audit initial ciblait la production Vercel, donc ces LCP ne mesurent pas un gain de déploiement à conditions réseau identiques. Les volumes donnent un ordre de grandeur de la baisse pour ce parcours.

La capture réseau confirme une seule police sur l’accueil français. L’ouverture du menu des langues ne demande aucune autre route localisée. La sélection de l’arabe demande sa police et passe le document en RTL. Les feuilles CSS de Fun et Aero arrivent séparément après sélection. Seules les images correspondant au mode actif sont téléchargées, y compris lors d’une ouverture directe en sombre. Les préférences sont restaurées après rechargement. Le moteur de gravité est demandé au premier clic sur son bouton.
