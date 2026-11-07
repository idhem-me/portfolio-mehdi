# Backlog d’exécution

Priorités P0 (à traiter avant réorganisation), P1 (important), P2 (après stabilisation). Efforts relatifs S, M, L. Les tickets d’un même lot peuvent avancer séparément si leurs fichiers et contrats ne se recouvrent pas.

| ID / lot | Titre et périmètre | Responsable | Priorité / effort | Critères d’acceptation |
| --- | --- | --- | --- | --- |
| SEC-01 / 1 | Reconstituer et vérifier le schéma cadeaux et les grants | Back-end + sécurité | P0 / L | Installation à blanc et chemin déjà provisionné passent. Anonyme et compte tiers sont refusés sur les opérations privées, partage et annulation compatibles. Migrations seules. |
| SEC-03 / 1 | Caractériser et, après décision explicite, corriger la visibilité cachée | Sécurité | P0 / M | Matrice de 7 locales, 2 jeux, flags, alias et boutique. Aucun lien, référencement ou entrée sitemap. Tout changement du mécanisme a son feu vert distinct. |
| QA-01 / prérequis du lot 1 | Rétablir une base reproductible | Architecte | P0 / M | Lint passe, unitaires séparés de Playwright, découverte navigateur sans CSS/serveur importés hors contexte, noms de scripts documentés. Build local reproductible et suites vérifiées. |
| CLEAN-01 / 2 | Relancer Knip et npm audit, vérifier les candidats | Architecte + sécurité | P1 / S | Rapport par candidat et preuve imports/config/assets. Aucun retrait sans liste validée. Les alertes hautes découvertes retournent au lot 1. |
| ARCH-01 / 3 | Rapprocher l’UI métier de ses features | Architecte | P1 / M | Mouvements listés dans le plan, imports et graphes vérifiés, routes et rendus inchangés. |
| ARCH-02 / 3 | Séparer montage analytics, transport et collecte | Architecte | P1 / M | Composants React dans components/analytics, événements et protocoles stables, traceurs conditionnés au consentement. |
| ARCH-03 / 3 | Rassembler scripts et deux suites Tetris | Jeu | P1 / S | Déplacement exact du script et des specs, références mises à jour, inventaire Playwright identique pour ces scénarios. |
| DS-01 / 4 | Documenter et compléter les états des primitives | Designer | P1 / M | Focus, erreur, chargement et cibles vérifiés sur vitrine, contrastes mesurés, régression visuelle par thème. |
| DS-02 / 4 | Migrer progressivement le chrome local | Designer + jeu | P1 / L | Actions/dialogues/champs de même contrat utilisent le DS. RTL, zh, mobile, mouvement réduit et clavier testés. Tout retrait de fichier a sa validation. |
| SEC-02 / 5 | Contrôler chaque page privée côté serveur | Sécurité | P1 / M | Accès direct et navigation sans session redirigent ou refusent. Login, accès authentifié et API continuent à fonctionner. Politique des démos approuvée. |
| SEC-04/05/06 / 5 | Vérifier CSP, consentement et entrées hostiles | Sécurité | P1 / M | Recette avant accord, après retrait, sur cadeaux. Tests négatifs SSRF, budgets, SVG et replay. OAuth et rendu passent. |
| BE-02/03 / 5 | Unifier les fabriques et mesurer les appels | Back-end | P1 / L | Client et types par niveau d’accès, droits et erreurs inchangés. Mesures avant/après, aucune donnée privée en cache public. |
| BE-04/05/06 / 5 | Mesurer fonctions, assets et reprise Free | Back-end | P2 / M | Rapport volumes/durée et reprise simulée. Optimisations bornées, aucun nouveau service. |
| GAME-01 / 5 | Valider entrées, reprises et cycle audio | Jeu | P2 / M | Rendu et sauvegardes comparés sur mobile/clavier, aucun changement de visibilité. Mutualisation seulement si deux jeux ont le même contrat. |
| PM-01 / 5 | Vérifier l’accès aux preuves et améliorer les cas existants | PM | P2 / M | Scénarios recruteur et client validés. Textes en sept langues et aucune nouvelle URL requise. |
| EXP-01 / 6 | Prototyper les idées retenues | PM + designer | P2 / S à L | Décision explicite, métrique et arrêt définis, DS existant et hébergement gratuit. |

Proposition pour validation : traiter QA-01 comme prérequis technique avant de clôturer le lot 1, afin que le lint et la découverte des tests passent dès le premier lot. Les corrections de sécurité restent les premières évolutions fonctionnelles. Chaque lot doit réussir les contrôles exécutables.
