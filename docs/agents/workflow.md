# Déroulé du chantier

| Phase | Responsable | Sortie |
| --- | --- | --- |
| 0. Mise en place | Orchestrateur | Lire les règles et le README, ouvrir une branche dédiée, créer les fiches et compléter AGENTS.md. |
| 1. Inventaire | Orchestrateur | Relever arborescence, routes, outils, jeux, SQL, noms de variables, DS, i18n et dépendances. |
| 2. Audits | Architecte, back-end, sécurité, designer, jeu, PM | Chaque rôle documente ses preuves, limites et propositions dans son livrable. |
| 3. Disruption | Disruptif et rôles concernés | Cinq idées classées par effort et réponse argumentée à chaque challenge. |
| 4. Plan | PO et architecte | Backlog et plan avec périmètre, mouvements, suppressions, risques et décisions. **Attendre la validation explicite du propriétaire.** |
| 5. Exécution | Orchestrateur et responsables de tickets | Enchaîner les lots validés, résumer chacun et relever les résultats lint, typecheck, build et tests. Pause si une décision hors plan est nécessaire ou si un échec de build/tests n’a pas de correction évidente. |
| 6. Pérennisation | Orchestrateur | Finaliser AGENTS.md, README, architecture, fiches et changelog DS. Synchroniser Cursor en conservant les règles existantes. |

Avant la validation, seuls AGENTS.md et docs/ peuvent être modifiés. Un agent reprend un ticket avec sa fiche, sa branche, son périmètre de fichiers et ses critères. Pour des lots parallèles, isoler les branches et séquencer les changements qui partagent routes, messages, migrations, DS ou lockfile. Au passage de relais, indiquer les fichiers touchés, commandes et résultats, limites et prochaine action. L’orchestrateur arbitre les désaccords et vérifie le diff consolidé.
