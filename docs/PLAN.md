# Plan de nettoyage et de structuration

## Ticket complémentaire proposé · index du Playground fixe

**Phase 4 · Validé, placement et largeur précisés par le propriétaire.** Sur `/playground`, garder l’index des composants fixé au bord extérieur de la fenêtre pendant le défilement et l’élargir à 16 rem. À partir du breakpoint actuel de 64 rem, limiter sa hauteur au viewport et permettre son propre défilement. Le masquer sous ce breakpoint, préserver les ancres et le comportement RTL, et ne pas changer les URL ni le texte visible.

Fichiers prévus : `src/app/[locale]/(site)/playground/catalog.tsx`, `tests/playground-responsive.spec.ts`, `docs/design-system/CHANGELOG.md`. Aucun déplacement ni suppression. Recette prévue : vérifier qu’après défilement l’index reste dans le viewport, que sa liste peut défiler indépendamment, que les liens d’ancre fonctionnent en LTR et RTL, et qu’il reste masqué sur mobile; puis lint, typecheck, build et suites de tests conformément aux règles du dépôt.

**Phase 4 · En attente de validation explicite.** Ce plan couvre les opérations listées. Toute suppression supplémentaire, modification du masquage ou idée produit demande sa propre décision. Voir [backlog](product/backlog.md), [architecture](architecture.md) et [inventaire des URL](audit/inventory.md).

## Arborescence cible

Arborescence des dossiers de travail. Les sous-dossiers internes existants, les archives et les fichiers sont conservés sauf mouvement explicite ci-dessous. `node_modules`, `.next` et les sorties locales restent générés.

```text
.
├── content/{ar,de,en,es,fr,it,zh}/case-studies/
├── docs/
│   ├── agents/
│   ├── audit/
│   ├── cards/
│   ├── clicker-burger/
│   ├── design-system/
│   ├── product/
│   ├── sql/
│   └── tetris/{identity,references,responsive,unified-identity,v2,v3,v4,v5}/
├── messages/
├── public/{assets,audio,cosmetics,img,vendor}/
├── scripts/{cards,clicker-burger,tetris}/
├── src/
│   ├── app/
│   │   ├── (dashboard)/dashboard/login/
│   │   ├── (playground)/playground/{design-systems,github-vs-adobe}/
│   │   ├── [locale]/
│   │   │   ├── (game)/{boutique,cards,jeux/{cards,clicker-burger,tetris}}/
│   │   │   ├── (gifts)/{l/[slug],listes/{[slug],annuler}}/
│   │   │   └── (site)/
│   │   │       ├── {a-propos,contact,jeux}/
│   │   │       ├── backoffice/sessions/
│   │   │       ├── outils/{color-generator,compression-image,conversion-image,fusion-pdf,listes-cadeaux/[id],qrcode}/
│   │   │       ├── product-designer/onewallet/
│   │   │       └── realisations/{onewallet,tetris,trusted-interactions}/
│   │   ├── api/
│   │   │   ├── analytics/summary/
│   │   │   ├── assets/svg/[...path]/
│   │   │   ├── backoffice/{me,sessions/[id],stats}/
│   │   │   ├── {contact,cron/purge,dashboard/{login,logout},gifts/{[slug],cancel},track}/
│   │   │   └── tetris/{auth/{callback,credential,google},cards/{account,avatar},gifts/extract,leaderboard,local-scores,profile,sessions}/
│   │   └── fonts/
│   ├── components/{analytics,creative,design-system,games,layout,media,ui}/
│   ├── data/
│   ├── features/{account,backoffice,cards,case-study,clicker-burger,color-generator,cv,gift-lists,image-compression,image-conversion,pdf,qr-code,tetris}/
│   ├── hooks/
│   ├── i18n/
│   └── lib/{analytics,backoffice,games,security,supabase,tracking}/
├── supabase/migrations/
├── tests/{account,cards,clicker-burger,helpers,tetris}/
├── vendor/{deepmerge,minimatch-compat}/
├── AGENTS.md
└── README.md
```

`src/proxy.ts` et les configurations racine restent à leur place. La structure détaillée des routes et des méthodes est dans l’inventaire. Les docs historiques par jeu restent à leur emplacement car les scripts, fixtures et captures y écrivent ou y lisent. `docs/sql` devient une archive explicitement marquée après validation du bootstrap. `lib/supabase` est prévu au lot 5 pour les fabriques communes.

## Déplacements et suppressions

| Départ | Arrivée | Justification |
| --- | --- | --- |
| `src/components/{backoffice,case-study,color-generator,cv}/*` | `src/features/<même-nom>/ui/*` | UI métier et styles associés. Conserver noms, chemins relatifs internes et exports sauf ajustements d’import. |
| `src/components/ImageCompressor.tsx` | `src/features/image-compression/ui/image-compressor.tsx` | Point d’entrée de l’outil. |
| `src/hooks/useImageCompression.ts` | `src/features/image-compression/ui/use-image-compression.ts` | Hook du même parcours. |
| `src/components/ImageConverter.tsx` | `src/features/image-conversion/ui/image-converter.tsx` | Point d’entrée de l’outil. |
| `src/components/QRCodeGenerator.tsx` | `src/features/qr-code/ui/qr-code-generator.tsx` | Point d’entrée de l’outil. |
| `src/lib/{color-generator.ts,color-generator.test.ts}` | `src/features/color-generator/engine/` | Calcul et test associés. |
| `src/lib/image-converter.ts` | `src/features/image-conversion/engine/image-converter.ts` | Traitement métier de conversion. |
| `src/lib/analytics/{analytics-root,clarity,provider,vercel}.tsx` | `src/components/analytics/{analytics-root,clarity,posthog-provider,vercel}.tsx` | Montages React regroupés et fournisseur nommé. |
| `src/lib/tracking/provider.tsx` | `src/components/analytics/tracking-provider.tsx` | Montage React, protocole et limites dans tracking. |
| `tools/tetris/capture-covers.mjs` | `scripts/tetris/capture-covers.mjs` | Convention commune aux scripts. Le dossier tools se vide. |
| `tests/{tetris,tetris-audio}.spec.ts` | `tests/tetris/` avec les mêmes noms | Découverte par feature, imports helpers et moteur mis à jour. |

**Retrait des règles Cursor demandé séparément.** Supprimer `.cursor/rules/i18n-content.mdc` et `.cursorrules` après transfert des consignes i18n, UI et design system dans `AGENTS.md`. Cursor n’est plus utilisé et les règles du dépôt ont ainsi une source unique.

Les déplacements conservent le contenu et les références. Toute autre suppression doit être justifiée et validée. Aucun changement d’URL prévu, donc aucune redirection nouvelle. Si une URL doit changer, arrêter le ticket et soumettre le mapping complet et les redirections `next.config.ts`.

## Ordre des lots

1. **Sécurité haute et critique.** Rétablir d’abord les contrôles de recette nécessaires (QA-01), afin de livrer un premier lot vérifiable. Vérifier la matrice de visibilité puis traiter SEC-03 uniquement après autorisation du mécanisme. Résoudre l’écart migrations/SQL et prouver les droits du périmètre cadeaux. Aucune criticité démontrée à ce stade.
2. **Nettoyage sans risque.** Relancer Knip et npm audit. Garder les adaptations vendor. Vérifier les candidats et soumettre un delta de plan si un retrait est justifié.
3. **Réorganisation.** Déplacer par feature, puis analytics et scripts/tests. Chaque ticket est mécanique, avec contrôle des imports et comparaison des URL des sept locales.
4. **Design.** Documenter et améliorer les états compatibles, migrer ensuite outils et chrome des jeux. Toute suppression éventuelle suit dépréciation, migration des usages, puis validation de la liste de fichiers.
5. **Back-end, jeux et produit.** Gardes pages, validation CSP/consentement, fabriques et types après migration, mesures et reprise, game feel et parcours de découverte. Séparer les changements selon leurs dépendances.
6. **Disruption.** Développer uniquement les idées retenues explicitement et avec leur critère de succès. Voir [les cinq propositions](audit/disruption.md).

La phase 6 de pérennisation suit ces six lots de la phase 5. Relier le README à AGENTS.md, finaliser changelog, architecture et fiches, puis faire un passage de relais avec commandes, état et priorités.

## Risques et recette

- **Schéma déjà appliqué.** Identifier l’historique réel avant de choisir la stratégie de bootstrap. Tester à blanc et en mise à niveau avec fixtures représentatives et contrôle des grants. Aucune migration directe sur la base distante.
- **Masquage et URL.** Vérifier les flags sans toucher aux fichiers d’environnement, réponses 404/noindex, accès direct et navigation des sept locales, alias et sitemap. Tester le préfixe français historique, slugs et liens cadeaux privés.
- **Régressions d’interface.** Tester clavier, mobile, dark, mouvement réduit, arabe et chinois. Protéger le comportement de sauvegarde, les réglages et le traitement local.
- **Base de vérification déjà rouge.** Lint, typecheck, build, tests unitaires et Playwright à chaque lot. Distinguer échec reproductible, écart préexistant et commande bloquée. Voir [état initial](audit/inventory.md#état-initial-des-vérifications).
- **Modifications locales existantes.** `src/features/gift-lists/ui/forms.tsx` avait déjà un diff au démarrage. Garder ce travail hors des commits du chantier sauf instruction contraire. Un commit conventionnel par ticket si possible.

## Décisions du propriétaire

1. Valider le plan et ses mouvements pour lancer la phase 5.
2. Autoriser séparément la correction des deux écarts de masquage, si souhaité. Proposition à examiner : séparer accès de test et publication Tetris dans le catalogue, et appliquer à la boutique Cards la garde de sa page canonique. Vérifier les sept variantes et les alias.
3. Confirmer si le quatrième jeu est le terrain de jeu de l’accueil. Indiquer la surface exacte si c’est une autre expérience.
4. Préciser le statut des démos backoffice et l’objectif des jeux cachés. Le maintien du masquage est le défaut du plan.
5. Choisir les idées du lot 6 et décider si les deux outils image partagent une entrée éditoriale. L’option initiale est de tester la preuve en dix secondes.

<details>
<summary>Arborescence complète des dossiers cibles</summary>

```text
.
├── content/
│   ├── ar/
│   │   └── case-studies/
│   ├── de/
│   │   └── case-studies/
│   ├── en/
│   │   └── case-studies/
│   ├── es/
│   │   └── case-studies/
│   ├── fr/
│   │   └── case-studies/
│   ├── it/
│   │   └── case-studies/
│   └── zh/
│       └── case-studies/
├── docs/
│   ├── agents/
│   ├── audit/
│   ├── cards/
│   ├── clicker-burger/
│   ├── design-system/
│   ├── product/
│   ├── sql/
│   └── tetris/
│       ├── identity/
│       ├── references/
│       ├── responsive/
│       ├── unified-identity/
│       ├── v2/
│       ├── v3/
│       ├── v4/
│       └── v5/
├── messages/
├── public/
│   ├── assets/
│   │   └── burger/
│   ├── audio/
│   │   └── tetris/
│   ├── cosmetics/
│   │   └── frames/
│   ├── img/
│   │   ├── avatar/
│   │   ├── cards/
│   │   │   └── navigation/
│   │   ├── clicker-burger/
│   │   ├── logos/
│   │   ├── photos/
│   │   │   ├── moi/
│   │   │   ├── onewallet/
│   │   │   └── trusted-interactions/
│   │   └── tetris/
│   └── vendor/
├── scripts/
│   ├── cards/
│   ├── clicker-burger/
│   └── tetris/
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   └── dashboard/
│   │   │       └── login/
│   │   ├── (playground)/
│   │   │   └── playground/
│   │   │       ├── design-systems/
│   │   │       └── github-vs-adobe/
│   │   ├── [locale]/
│   │   │   ├── (game)/
│   │   │   │   ├── boutique/
│   │   │   │   ├── cards/
│   │   │   │   └── jeux/
│   │   │   │       ├── cards/
│   │   │   │       ├── clicker-burger/
│   │   │   │       └── tetris/
│   │   │   ├── (gifts)/
│   │   │   │   ├── l/
│   │   │   │   │   └── [slug]/
│   │   │   │   └── listes/
│   │   │   │       ├── [slug]/
│   │   │   │       └── annuler/
│   │   │   └── (site)/
│   │   │       ├── a-propos/
│   │   │       ├── backoffice/
│   │   │       │   └── sessions/
│   │   │       ├── contact/
│   │   │       ├── jeux/
│   │   │       ├── outils/
│   │   │       │   ├── color-generator/
│   │   │       │   ├── compression-image/
│   │   │       │   ├── conversion-image/
│   │   │       │   ├── fusion-pdf/
│   │   │       │   ├── listes-cadeaux/
│   │   │       │   │   └── [id]/
│   │   │       │   └── qrcode/
│   │   │       ├── product-designer/
│   │   │       │   └── onewallet/
│   │   │       └── realisations/
│   │   │           ├── onewallet/
│   │   │           ├── tetris/
│   │   │           └── trusted-interactions/
│   │   ├── api/
│   │   │   ├── analytics/
│   │   │   │   └── summary/
│   │   │   ├── assets/
│   │   │   │   └── svg/
│   │   │   │       └── [...path]/
│   │   │   ├── backoffice/
│   │   │   │   ├── me/
│   │   │   │   ├── sessions/
│   │   │   │   │   └── [id]/
│   │   │   │   └── stats/
│   │   │   ├── contact/
│   │   │   ├── cron/
│   │   │   │   └── purge/
│   │   │   ├── dashboard/
│   │   │   │   ├── login/
│   │   │   │   └── logout/
│   │   │   ├── gifts/
│   │   │   │   ├── [slug]/
│   │   │   │   └── cancel/
│   │   │   ├── tetris/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── callback/
│   │   │   │   │   ├── credential/
│   │   │   │   │   └── google/
│   │   │   │   ├── cards/
│   │   │   │   │   ├── account/
│   │   │   │   │   └── avatar/
│   │   │   │   ├── gifts/
│   │   │   │   │   └── extract/
│   │   │   │   ├── leaderboard/
│   │   │   │   ├── local-scores/
│   │   │   │   ├── profile/
│   │   │   │   └── sessions/
│   │   │   └── track/
│   │   └── fonts/
│   ├── components/
│   │   ├── analytics/
│   │   ├── creative/
│   │   ├── design-system/
│   │   ├── games/
│   │   │   └── game-settings/
│   │   │       ├── primitives/
│   │   │       └── sections/
│   │   ├── layout/
│   │   ├── media/
│   │   └── ui/
│   ├── data/
│   ├── features/
│   │   ├── account/
│   │   │   ├── profile/
│   │   │   ├── server/
│   │   │   └── ui/
│   │   ├── backoffice/
│   │   │   └── ui/
│   │   ├── cards/
│   │   │   ├── account/
│   │   │   ├── avatar/
│   │   │   ├── catalog/
│   │   │   ├── engine/
│   │   │   ├── feel/
│   │   │   ├── persistence/
│   │   │   ├── server/
│   │   │   ├── shop/
│   │   │   └── ui/
│   │   │       └── opening/
│   │   ├── case-study/
│   │   │   └── ui/
│   │   ├── clicker-burger/
│   │   │   ├── assets/
│   │   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── data/
│   │   │   ├── engine/
│   │   │   ├── feel/
│   │   │   ├── state/
│   │   │   └── systems/
│   │   ├── color-generator/
│   │   │   ├── engine/
│   │   │   └── ui/
│   │   ├── cv/
│   │   │   └── ui/
│   │   ├── gift-lists/
│   │   │   ├── server/
│   │   │   └── ui/
│   │   ├── image-compression/
│   │   │   └── ui/
│   │   ├── image-conversion/
│   │   │   ├── engine/
│   │   │   └── ui/
│   │   ├── pdf/
│   │   ├── qr-code/
│   │   │   └── ui/
│   │   └── tetris/
│   │       ├── auth/
│   │       ├── controls/
│   │       ├── engine/
│   │       ├── feel/
│   │       ├── profile/
│   │       ├── render/
│   │       ├── server/
│   │       └── ui/
│   ├── hooks/
│   ├── i18n/
│   └── lib/
│       ├── analytics/
│       ├── backoffice/
│       ├── games/
│       ├── security/
│       ├── supabase/
│       └── tracking/
├── supabase/
│   └── migrations/
├── tests/
│   ├── account/
│   ├── cards/
│   ├── clicker-burger/
│   ├── helpers/
│   └── tetris/
└── vendor/
    ├── deepmerge/
    └── minimatch-compat/
```

</details>
