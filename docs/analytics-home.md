# Statistiques de l’accueil dans PostHog

Les interactions passent par l’intégration PostHog et la clé publique existantes.
Elles sont envoyées uniquement après acceptation des cookies analytiques.

Dans Product analytics, sélectionner l’événement `home_interaction`, puis une
répartition par `action`. Utiliser « utilisateurs uniques » pour mesurer les
visiteurs et « nombre total » pour compter les interactions. Pour la production,
utiliser le filtre interne PostHog et `internal_visitor = false`. Le lien
`?mtmd_internal=1` marque ce navigateur comme visiteur interne; `?mtmd_internal=0`
retire la marque. Le marqueur reste mémorisé dans ce navigateur.

| Action | Mesure |
| --- | --- |
| `home_cta_clicked` | Liens Réalisations, Jouer, Malt et Fiverr ; `value` et `destination` identifient le lien |
| `navigation_clicked` | Navigation du menu et logo ; destination disponible |
| `gravity_play`, `gravity_reset`, `gravity_config` | Jeu et ouverture/fermeture des réglages |
| `gravity_tune` | Réglage confirmé ; `control` identifie le curseur et `value` sa valeur numérique |
| `paint_grab`, `paint_exit` | Activation et sortie du mode pinceau |
| `paint_color` | Choix de couleur, identifié par `value` |
| `paint_stroke` | Trait terminé : couleur, nombre de points et état du jeu ; aucun tracé ni coordonnées envoyés |
| `paint_undo`, `paint_clear` | Annulation et effacement |
| `physics_grab` | Prise d’un objet ou d’un dessin |
| `theme_toggle`, `language_open`, `language_select` | Préférences ; `value` indique le choix |
| `menu_open`, `menu_close`, `sidebar-trigger`, `sidebar-rail` | Contrôles de navigation |
| `contact_email_copied` | Clic sur le contrôle de copie |
| `analytics_consent_updated` | Acceptation du consentement ; aucun événement envoyé en cas de refus |

Chaque événement possède `page = home`, `pathname`, `locale` et `viewport`.
Les liens n’envoient pas leurs paramètres de recherche ou fragments. Aucun texte
saisi ni contenu de dessin n’est collecté par cette instrumentation explicite.
Le gestionnaire délégué couvre également les contrôles ajoutés ultérieurement ;
ajouter `data-analytics-action` pour leur donner un nom stable.

Les clics et formulaires génériques ne sont pas autocapturés. `home_cta_clicked`
et `home_interaction` décrivent des niveaux différents d’une action; ne pas les
additionner. Pour un total homogène des interactions de l’accueil, utiliser
seulement `home_interaction`. Les mouvements du pointeur et collisions ne
génèrent pas un événement par image.

## Vérification locale

Le SDK filtre normalement les navigateurs automatisés. Pour le test navigateur
uniquement, lancer le serveur avec `NEXT_PUBLIC_POSTHOG_TEST_CAPTURE=true`, puis
`npx playwright test tests/home-analytics.spec.ts --project=chromium`. Le test
intercepte les requêtes PostHog pour ne pas polluer les statistiques réelles.
Redémarrer ensuite le serveur sans cette option. Ne pas activer cette variable
en production.

Références : [capture des événements](https://posthog.com/docs/product-analytics/capture-events)
et [filtrage des robots](https://posthog.com/docs/web-analytics/troubleshooting#do-stats-include-bots-and-crawlers).
