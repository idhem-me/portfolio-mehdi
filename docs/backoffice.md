# Mise à jour sécurité (31 octobre 2026)

Les détails de sessions, statistiques globales et pages backoffice sont désormais réservés à une session administrateur. Le consentement analytics ne donne aucun droit administrateur. `/api/backoffice/me` reste un accès visiteur, lié à un secret HttpOnly émis par le serveur, jamais au header `x-visitor-id`.

Avant de déployer, appliquer `supabase/migrations/20261031155314_security_hardening.sql` après les migrations existantes, configurer `SECURITY_HASH_KEY` (secret aléatoire stable de 32 caractères minimum), un `DASHBOARD_PASSWORD` unique de 12 caractères minimum et `CRON_SECRET`. Voir `SECURITY_REMEDIATION.md` pour la validation et les choix de compatibilité. Les anciennes sessions administrateur sont invalidées ; l’historique visiteur antérieur reste soumis à la rétention de 90 jours, sans transfert de propriété fondé sur un UUID public.

---

## Archive — fonctionnement avant correction

# Backoffice administrateur

## Mise en service
1. Migration déjà appliquée au projet Supabase connecté (version 20261030122415). Pour un autre environnement, appliquer la migration `supabase/migrations/20261030122415_backoffice.sql` au projet Supabase utilisé par le site.
2. Configurer côté serveur `SUPABASE_URL` et `SUPABASE_SECRET_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`. Ne jamais préfixer les clés privilégiées par NEXT_PUBLIC.
3. Configurer `CRON_SECRET` dans Vercel. Le cron quotidien appelle /api/cron/purge avec Authorization: Bearer.
4. PostHog : NEXT_PUBLIC_POSTHOG_KEY et NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com.
5. Déployer puis vérifier le parcours consentement → actions → transmission → statistiques sur la base réelle.

Les GET vérifient le cookie analytics_consent avant toute lecture. Le cache global de 30 s est interne au serveur ; les réponses sont privées et non cachables par le CDN. La limitation mémoire est propre à chaque instance Vercel ; elle n'est pas une protection distribuée.

Les sessions sont conservées 90 jours. Le cron archive quotidiennement les métriques de fenêtres UTC de 1/7/30/90 jours sans identifiants, sur 180 jours. La comparaison 90 jours utilise des jours UTC complets ; elle est indisponible tant que l'archive nécessaire n'existe pas. La purge doit être exécutée quotidiennement pour construire cet historique.

La suppression efface le visiteur et ses sessions. Une empreinte de révocation empêche les transmissions déjà parties de recréer les données. Les agrégats archivés ne permettent pas de retrouver un visiteur. En cas de panne réseau, le navigateur garde une demande de suppression à réessayer au prochain chargement ou retour en ligne.

Les UUID anonymes sont des identifiants techniques pseudonymes. Ils ne sont jamais associés aux comptes de jeux. Aucun événement de touche, IP ou query string n'est enregistré par le tracker. Les réponses publiques excluent visitor_id. Les événements custom PostHog sont limités à game_played, cta_clicked et brush_used.

## Diagnostic de collecte

En développement, Next.js peut construire l’URL de requête à partir de son adresse interne. Le contrôle d’origine utilise le Host public tout en vérifiant le protocole et le port. La validation accepte des deltas partiels et rejette les compteurs inconnus ou hors limites.

Le parcours réel tracker → API → Supabase → ligne visible a été vérifié ; les données du visiteur de test ont ensuite été supprimées.

## Vérification
- `node --import tsx --test tests/backoffice.test.ts`
- Serveur local lancé : `npx playwright test tests/backoffice.spec.ts --project=chromium`
- `npm run build`, `npm run lint`, `npm run typecheck`

Les tests navigateur interceptent les statistiques après consentement ; le test SQL utilise PostgreSQL embarqué PGlite. Ils ne remplacent pas la vérification sur Supabase/Vercel après configuration.

## Fichiers créés

- [docs/backoffice.md](/Users/mehdi/code/portfolio-mehdi/docs/backoffice.md)
- [src/app/[locale]/(site)/backoffice/layout.tsx](/Users/mehdi/code/portfolio-mehdi/src/app/[locale]/(site)/backoffice/layout.tsx)
- [src/app/[locale]/(site)/backoffice/page.tsx](/Users/mehdi/code/portfolio-mehdi/src/app/[locale]/(site)/backoffice/page.tsx)
- [src/app/[locale]/(site)/backoffice/sessions/page.tsx](/Users/mehdi/code/portfolio-mehdi/src/app/[locale]/(site)/backoffice/sessions/page.tsx)
- [src/app/api/backoffice/me/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/backoffice/me/route.ts)
- [src/app/api/backoffice/sessions/[id]/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/backoffice/sessions/[id]/route.ts)
- [src/app/api/backoffice/sessions/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/backoffice/sessions/route.ts)
- [src/app/api/backoffice/stats/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/backoffice/stats/route.ts)
- [src/app/api/cron/purge/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/cron/purge/route.ts)
- [src/app/api/track/route.ts](/Users/mehdi/code/portfolio-mehdi/src/app/api/track/route.ts)
- [src/components/backoffice/dashboard.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/backoffice/dashboard.tsx)
- [src/components/backoffice/data.ts](/Users/mehdi/code/portfolio-mehdi/src/components/backoffice/data.ts)
- [src/components/backoffice/sessions.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/backoffice/sessions.tsx)
- [src/components/backoffice/shell.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/backoffice/shell.tsx)
- [src/lib/analytics/use-analytics-consent.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/analytics/use-analytics-consent.ts)
- [src/lib/backoffice/server.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/backoffice/server.ts)
- [src/lib/tracking/client.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/tracking/client.ts)
- [src/lib/tracking/limits.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/tracking/limits.ts)
- [src/lib/tracking/provider.tsx](/Users/mehdi/code/portfolio-mehdi/src/lib/tracking/provider.tsx)
- [supabase/migrations/20261030122415_backoffice.sql](/Users/mehdi/code/portfolio-mehdi/supabase/migrations/20261030122415_backoffice.sql)
- [tests/backoffice.spec.ts](/Users/mehdi/code/portfolio-mehdi/tests/backoffice.spec.ts)
- [tests/backoffice.test.ts](/Users/mehdi/code/portfolio-mehdi/tests/backoffice.test.ts)
- [vercel.json](/Users/mehdi/code/portfolio-mehdi/vercel.json)

## Fichiers modifiés

- [.env.example](/Users/mehdi/code/portfolio-mehdi/.env.example)
- [messages/ar.json](/Users/mehdi/code/portfolio-mehdi/messages/ar.json)
- [messages/de.json](/Users/mehdi/code/portfolio-mehdi/messages/de.json)
- [messages/en.json](/Users/mehdi/code/portfolio-mehdi/messages/en.json)
- [messages/es.json](/Users/mehdi/code/portfolio-mehdi/messages/es.json)
- [messages/fr.json](/Users/mehdi/code/portfolio-mehdi/messages/fr.json)
- [messages/it.json](/Users/mehdi/code/portfolio-mehdi/messages/it.json)
- [messages/zh.json](/Users/mehdi/code/portfolio-mehdi/messages/zh.json)
- [package-lock.json](/Users/mehdi/code/portfolio-mehdi/package-lock.json)
- [package.json](/Users/mehdi/code/portfolio-mehdi/package.json)
- [src/components/analytics/consent-banner.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/analytics/consent-banner.tsx)
- [src/components/creative/paint-tool.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/creative/paint-tool.tsx)
- [src/components/layout/app-sidebar.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/layout/app-sidebar.tsx)
- [src/components/layout/language-switcher.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/layout/language-switcher.tsx)
- [src/components/layout/theme-toggle.tsx](/Users/mehdi/code/portfolio-mehdi/src/components/layout/theme-toggle.tsx)
- [src/features/cards/ui/opening/opening-scene.tsx](/Users/mehdi/code/portfolio-mehdi/src/features/cards/ui/opening/opening-scene.tsx)
- [src/features/clicker-burger/App.tsx](/Users/mehdi/code/portfolio-mehdi/src/features/clicker-burger/App.tsx)
- [src/features/tetris/ui/tetris.tsx](/Users/mehdi/code/portfolio-mehdi/src/features/tetris/ui/tetris.tsx)
- [src/lib/analytics/analytics-root.tsx](/Users/mehdi/code/portfolio-mehdi/src/lib/analytics/analytics-root.tsx)
- [src/lib/analytics/consent.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/analytics/consent.ts)
- [src/lib/analytics/events.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/analytics/events.ts)
- [src/lib/analytics/provider.tsx](/Users/mehdi/code/portfolio-mehdi/src/lib/analytics/provider.tsx)

## Fichiers ajoutés lors du diagnostic

- [src/lib/backoffice/request-origin.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/backoffice/request-origin.ts)
- [src/lib/backoffice/payload.ts](/Users/mehdi/code/portfolio-mehdi/src/lib/backoffice/payload.ts)
