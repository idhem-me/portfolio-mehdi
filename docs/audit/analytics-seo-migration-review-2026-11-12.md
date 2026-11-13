# Revue analytics, SEO/GEO et migration — 12 novembre 2026

Périmètre autorisé : `portfolio-mehdi`, `mtmd-list` et `mtmd-hub`. Aucun changement ne doit être fait dans les autres projets exclus par le propriétaire. Ce document consigne l'audit et l'exécution autorisée en phase 4 du [déroulé du chantier](../agents/workflow.md).

## Décisions proposées

1. Utiliser le projet PostHog `Default project` pour les domaines publics MTMD, avec `$host` comme dimension de site. Ne pas dupliquer les événements analytics dans Supabase : Supabase conserve les données métier, PostHog les parcours et agrégats.
2. Ajouter une propriété d’événement stable `site` et un marqueur `internal_visitor` activable depuis le navigateur propriétaire. Configurer le filtre PostHog correspondant avant de considérer les chiffres comme du trafic public. Conserver un consentement explicite et ne transmettre ni email, nom, texte de liste, cadeau, slug privé ou autre donnée de contenu.
3. Garder les vues et actions privées de listes hors analytics tant que le périmètre de consentement et les événements génériques ne sont pas validés. La collecte n’est pas une raison pour stocker ces événements dans Supabase.
4. Ne pas appliquer de migration avant d’avoir réconcilié l’historique distant, les SQL de chaque dépôt et l’état des tables.

## Cartographie relevée

| Dépôt / surface | État observé | Proposition de mapping |
| --- | --- | --- |
| `portfolio-mehdi` — `portfolio.mtmd.fr` | PostHog, Vercel Analytics et Clarity sont montés derrière le consentement. Le catalogue d’événements existe, mais `track()` n’accepte que `game_played`, `cta_clicked` et `brush_used`, alors que plusieurs événements utilisés par l’interface ont d’autres noms et sont rejetés. Le résumé serveur agrège tous les événements du projet et ne filtre ni domaine ni trafic interne. | Conserver `$pageview`; standardiser `navigation_clicked`, `contact_cta_clicked`, `home_cta_clicked`, `home_interaction`, `contact_email_copied`, `game_started`, `game_shared`, `game_feedback_submitted`. Propriétés autorisées : `site`, `locale`, `surface`, `action`, `game`, `method`, `destination_type`. Corriger la fonction centrale et filtrer le résumé par le site et le trafic interne. |
| `mtmd-list` — `list.mtmd.fr` | Supabase sert à l’authentification et aux listes. Aucun PostHog trouvé. Le robots/sitemap autorise et publie uniquement `/liste-de-cadeaux`; les routes de listes et d’administration restent hors suivi. Les règles `X-Robots-Tag` globales et spécifiques se contredisent potentiellement pour la page d’atterrissage. | Suivre seulement les vues de la page publique et le clic générique du CTA, sans identifiant, contenu ou slug. Vérifier les en-têtes HTTP effectifs avant certification SEO. |
| `mtmd-hub` — `mtmd.fr` | Site statique avec deux pages, canonicals, JSON-LD, `robots.txt`, sitemap et `llms.txt`; pas d’analytics observé. | `$pageview`, `navigation_clicked`, `project_link_clicked`, avec `site=hub`; distinguer les redirections vers Portfolio et Liste par `destination_type`. |
Les événements communs doivent porter `site` (`portfolio`, `list`, `hub`), `surface` et `locale` lorsqu’ils sont connus. Éviter l’autocapture des formulaires ou des contenus privés ; capturer les étapes produit explicitement, une seule fois, au succès de l’action.

## Résultats PostHog — projet `Default project`

- Le projet actif reçoit `$pageview` et des événements personnalisés; la liste d’événements indique toutefois des noms issus du catalogue historique.
- Sur les 30 derniers jours interrogés, les 1 952 pageviews reçues sont réparties entre `localhost:3000` (1 848), `127.0.0.1:3000` (99) et `192.168.1.171:3000` (5). Aucun domaine public MTMD n’apparaît. Le filtre test/interne activé dans cette requête retourne les mêmes volumes.
- Le filtre test/interne n’a pas exclu le trafic local dans la requête d’essai. Les rapports exécutés avec filtres négatifs explicites (hostname et `internal_visitor`) excluent ces vues; le tableau de bord Portfolio a été restreint à son domaine et aux visiteurs non internes.
- Conclusion : PostHog est consultable, mais il ne fournit actuellement pas de statistiques de fréquentation de production pour les sites MTMD. Les événements observés sont du développement local.

## Migration Supabase — projet `idhem`

Un seul projet actif est connecté (`eu-west-1`). L’historique distant expose 13 versions, jusqu’à `20261031155314_security_hardening`. Le dépôt Portfolio contient 19 fichiers SQL et `mtmd-list` en contient 3. L’historique local et distant ne correspondent donc pas.

Versions locales absentes de l’historique distant : `202610250001` à `202610250004` (Tetris), `202610270001` (cards progress), `202610310001` (suppression profils locaux Tetris), `20261031094755` (photos cadeaux), `202611110001` (commentaires cadeaux) et `20261112000100` (occasion Housewarming, mtmd-list). À l’inverse, le distant contient `20261031080005_gift_custom_occasion_label` et `20261031080639_gift_optional_list_image`, absentes des deux dépôts examinés.

La comparaison ciblée du schéma actuel confirme que `gift_lists.occasion_type` accepte déjà `housewarming`, que `gift_lists` comprend `occasion_label` et `cover_image`, et que `gift_items` comprend `comment`. Ces éléments ne figurent pas tous dans l’historique distant sous les versions locales correspondantes. Le schéma semble donc comporter les fonctionnalités cadeaux examinées, mais la provenance et l’idempotence des migrations restent à réconcilier. Le conseiller sécurité Supabase remonte par ailleurs des tables RLS sans policy, des policies autorisant les rôles anonymes et la protection contre les mots de passe compromis désactivée; ces observations doivent être triées selon les frontières de schéma et les accès attendus avant tout changement.

**Statut : migration non certifiée.** Prochaine étape proposée : comparer les colonnes/fonctions/policies réelles et l’historique `schema_migrations` avec les deux dépôts, établir un dépôt source de vérité, puis rédiger une migration de réconciliation. Ne pas relancer les SQL locaux à l’aveugle.

## SEO / GEO

- **Portfolio :** canonical, hreflang des sept langues, Open Graph, sitemap localisé et robots sont en place. Le sitemap exclut les surfaces privées et cachées. Aucun `llms.txt` ou JSON-LD n’a été relevé dans l’audit de code; certaines fiches Pokédex dynamiques ont des métadonnées mais restent hors sitemap.
- **Liste :** sitemap mono-URL cohérent avec l’objectif, mais vérifier l’effet réel des headers `noindex` globaux et `index` spécifiques. Pas de JSON-LD ou `llms.txt` repéré.
- **Hub :** bon socle GEO avec JSON-LD et `llms.txt`; sitemap limité aux deux pages publiques. La racine redirige et reste correctement hors sitemap.
Le testeur web externe n’a pas pu ouvrir les domaines MTMD pendant cette revue. Les constats ci-dessus portent donc sur les sources locales et l’état PostHog/Supabase connecté, sans certification HTTP de production ni de positionnement SEO/GEO.

## Critères d’acceptation pour le lot d’exécution

- Un événement est émis au succès de l’action et accepte ses noms déclarés; les noms et propriétés sont documentés et stables.
- Chaque site est séparé par hostname/`site`; les pages privées ne capturent ni contenu ni identifiant de liste.
- Le consentement contrôle la collecte conformément à la politique existante; un visiteur propriétaire peut marquer son navigateur comme trafic interne et les vues ordinaires l’excluent.
- Les événements de production sont visibles dans PostHog avec des domaines publics; les visites `localhost` et propriétaire sont séparables.
- Robots, sitemap, canonical/hreflang, JSON-LD/`llms.txt` et headers des pages d’atterrissage sont vérifiés en HTTP.
- L’historique et le schéma Supabase réels sont alignés avec une source de migrations identifiée.

## État après exécution

L’implémentation est préparée sur les branches `feat/analytics-event-map` des trois dépôts autorisés. Les variables Vercel PostHog sont configurées pour Production et Preview; aucun déploiement n’a été lancé. L’exclusion automatique via le réglage global PostHog n’est pas encore vérifiée en interface; utiliser les filtres explicites décrits ci-dessus. La certification HTTP et l’alignement final de l’historique Supabase restent ouverts.
