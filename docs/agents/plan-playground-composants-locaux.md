# Plan de la page Composants locaux

## État au moment du plan

La page sert de liste de contrôle pour le design system. Elle affiche huit tickets avec leur statut et, quand elle existe, un lien vers leur démo. Deux sont marqués corrigés (LOCAL-01 et LOCAL-09) et six restent à traiter. Le [relevé interne](../design-system/playground-local-components.md) couvre également les cas hors page. L’entrée figure actuellement dans la navigation publique du Playground et l’accès direct est testé dans les sept langues.

## Lot 1 · Réserver la page au développement local

Priorité haute, effort faible. Responsable proposé : développement front-end.

- Garder la page à son adresse actuelle sur le serveur de développement local, y compris pour les aperçus sur le réseau local. Faire décider le serveur de la présence de l’onglet et du rendu de la page. Appliquer la même condition aux deux, en excluant les exécutions Vercel.
- Dans `next.config.ts`, rediriger temporairement les anciennes adresses hors développement local vers le catalogue du Playground dans la même langue. Couvrir le français sans préfixe et avec `/fr`, ainsi que les six autres préfixes. Vérifier également les accès directs et les navigations côté client.
- Garder la page hors de toute indexation. Conserver le catalogue et la comparaison dans la navigation du Playground.
- Mettre à jour `tests/playground-responsive.spec.ts`, la documentation et le relevé de couverture. Après validation, préciser dans `AGENTS.md` le rôle de cette page dans le suivi interne du DS.

Périmètre d’exécution : la route `playground/local-components/page.tsx`, le layout et la navigation du Playground, `next.config.ts`, les tests et la documentation associés. Aucun fichier à supprimer et aucun nouveau libellé prévu.

## Lot 2 · Fermer les écarts restants

Priorité moyenne. Le lot peut être livré ticket par ticket après le lot 1. Les preuves et modules de départ sont dans le [relevé des composants](../design-system/playground-local-components.md).

| Ticket | Responsable proposé | Effort | Critère de clôture |
| --- | --- | --- | --- |
| LOCAL-02 · Champs des listes de cadeaux | Front-end | Moyen | Aligner la zone de texte sur les contrôles du DS. Vérifier les deux champs spécialisés, notamment leur comportement natif. Démontrer label, aide, erreur et valeur longue. |
| LOCAL-03 · Actions des listes de cadeaux | Front-end | Faible | Aligner le bouton avatar et le lien de création sur les variantes et tokens existants en préservant leurs destinations et le retour du focus du menu. |
| LOCAL-04 · Sessions du backoffice | Front-end backoffice | Moyen | Traiter la ligne mobile cliquable et montrer son ouverture au clavier avec des données fictives. Vérifier le tri et la présentation sur ordinateur. Coordonner ce ticket avec le lot sur le débordement du tableau. |
| LOCAL-05 · Cartes du nuancier | Front-end | Moyen | Ajouter une démo des cartes avec leurs couleurs et états réels. Vérifier le focus sur plusieurs couleurs, la copie et son retour visuel, ainsi que les cibles sur mobile. |
| LOCAL-06 · Études de cas | Front-end accessibilité | Moyen | Vérifier les termes d’aide, le carrousel et la visionneuse au clavier. Assurer une alternative aux gestes et le retour du focus à la fermeture. Documenter les exceptions éditoriales. |
| LOCAL-07 · Contrôles de réglages | Front-end jeux | Moyen | Vérifier les boutons et interrupteurs spécialisés dans un panneau générique fictif, avec états actif, inactif et indisponible. Réutiliser le DS quand le comportement et le rendu restent adaptés. |

Pour chaque ticket, vérifier Desktop et Mobile, la cible de 44 × 44 px CSS pour les contrôles autonomes concernés et le focus clavier. Consigner les exceptions et mettre à jour la démo, son ancre, la couverture et le statut en même temps. Synchroniser tout nouveau texte visible dans les sept langues. Les jeux masqués et leurs contrôles propres restent dans le suivi interne du dépôt.

## Vérification et décision

En développement local, vérifier l’onglet et l’accès direct dans les sept langues, la mise en page mobile et l’arabe RTL. Sur une compilation de production, vérifier la disparition de l’onglet et la redirection des anciennes adresses vers le bon catalogue. Après chaque lot, lancer lint, typecheck, build et les tests concernés, puis consigner les blocages éventuels.

Une fois les six tickets clos, le relevé Markdown et les démos peuvent servir de référence durable. Réévaluer alors le maintien de la page de suivi locale.

Plan validé. L’implémentation est sur `codex/playground-composants-locaux`. Le [relevé des composants](../design-system/playground-local-components.md) consigne le statut après correction.
