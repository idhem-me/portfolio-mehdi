# Décisions

- Référence retenue : https://github.com/sen-ltd/tetris, MIT, Copyright (c) 2026 SEN LLC. Étudiée dans /tmp/lava-tetris-mit. Tables de formes/SRS, collisions et Fisher–Yates adaptés en TypeScript ; aucune UI reprise. Licence conservée dans engine/LICENSE.source. La première référence examinée (aidlc-academy/Tetris) ne comportait pas de fichier de licence : aucun code repris.
- Version française utilisée comme fallback éditorial pour Lava dans les autres langues, suivant readMarkdown. Pas de traduction automatique des textes de design.
- Flag strict égal à la chaîne true, absent = false. Seul .env.local active le jeu. Indexation désactivée indépendamment du flag, publication manuelle documentée.
- Pas de sitemap préexistant : Lava reste hors sitemap tant que noindex, quel que soit le flag.
- Le fallback haptique switch iOS est non officiel, opt-in et réservé aux actions fortes ; aucune garantie de vibration Safari.
- Objectif 60 fps : qualité shader adaptative, ne constitue pas une mesure sur téléphone physique.

- Lint initial : 12 erreurs préexistantes (hydratation setState et refs impératives). Synchronisations bannière/lightbox/media query différées sur une frame avec cleanup ; annotations ciblées sur les autres ponts navigateur existants, sans désactiver globalement les règles. Le jeu utilise explicitement un moteur impératif et un HUD rafraîchi à 25 Hz ; exemption refs locale documentée.

- Mobile : la partie passe dans un espace fixe 100dvh, avec bouton quitter ; les contrôles et le plateau restent dégagés de la navigation et de la bannière de consentement. Pause et fin conservent cet espace jusqu’à fermeture.
- Next.js/next-intl : binding --hostname 127.0.0.1 provoque une boucle 307 locale déjà connue (https://github.com/vectorize-io/hindsight/pull/1934). Le serveur est lancé avec --hostname 0.0.0.0, consulté via localhost ; aucune modification du routage global.
