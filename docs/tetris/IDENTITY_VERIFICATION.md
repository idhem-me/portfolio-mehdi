# Identité et Game over — vérification locale du 25 octobre 2026

## Résultats

- `npm test` : **108/108** passent. Le moteur existant reste inchangé par cette correction. Tests réels SQLite, libSQL et PostgreSQL/PGlite : profils, conservation des records, isolation privée, propriété des sessions et confirmations idempotentes. Test de la route Google avec client Supabase SSR réel et fournisseur simulé : contrôle de l’origine et du nonce, échange d’ID token, cookies HttpOnly, absence de jetons de session dans la réponse publique.
- **41/41 parcours Playwright** passent sur Chromium desktop, Chrome Android émulé Pixel 7 et WebKit iPhone 13. Commande : `TETRIS_TEST_BASE_URL=http://localhost:3001 npx playwright test tests/identity-profile.spec.ts tests/profile.spec.ts tests/responsive-player-v2.spec.ts tests/v2.spec.ts tests/tetris.spec.ts --project=chromium --project=webkit-iphone --project=android-chrome`.
- `npm run lint` : zéro erreur, avertissement préexistant `commitSrc` dans gaze-avatar.
- `npm run typecheck` : succès.
- `npm run build` : succès, avertissement préexistant des métriques de fallback Google Sans.
- `git diff --check` : succès.

## Parcours couverts

Création locale depuis Jeux, persistance après rechargement et synchronisation avec Tetris ; photo envoyée, compressée et réutilisée ; connexion Google simulée depuis la sidebar ; nom et avatar Google, personnalisations applicatives ; Enregistrer réellement `primary`, photo secondaire compacte et libellés contextuels ; absence de formulaire de création pour les joueurs identifiés.

Game over anonyme avec pseudo et Google ; création locale puis sauvegarde automatique ; deuxième partie sans nouvelle identification ; fermeture Google sans callback, échec de l’échange et nouvelle tentative ; conservation du score ; échec de sauvegarde, nouvelle tentative et absence de doublons ; score en attente refusé pour une autre identité après rechargement, puis sauvegardé avec l’identité d’origine. Tests unitaires supplémentaires : destinataire du brouillon immuable et confirmation tardive ne supprimant pas une nouvelle partie.

Régression : son opt-in, classement existant, noindex et ancienne redirection, onboarding réel, gameplay et récompenses, pause/reprise, fallback SVG, effets réduits, géométries 320×568 et 844×390. Les sélecteurs historiques Lava ont été adaptés au renommage Tetris déjà présent et à l’avatar existant.

Captures revues dans `docs/tetris/identity/`. Les boutons conservent les cibles tactiles mobiles du design system. Le premier clic Profil attend l’hydratation React pour éviter un tap perdu sur Android.

## Conditions de validation distante

Cette session ne dispose pas de `GOOGLE_CLIENT_ID` ni des variables Supabase dans `.env.local`. Les parcours Google navigateur simulent explicitement le SDK et le fournisseur ; ils ne certifient pas une connexion auprès de Google ni les paramètres du projet distant. Le bouton de production est rendu par `google.accounts.id.renderButton`, sans imitation visuelle.

Avant activation distante : appliquer 001–004 dans l’ordre, renseigner le Client ID Web Google **existant** et les variables Supabase, autoriser les origines JavaScript exactes, puis vérifier une connexion réelle desktop/mobile. La migration 004 est additive ; aucune migration distante, aucun push et aucun déploiement n’ont été effectués. Les essais sur appareils physiques restent à réaliser.

La validité du score en attente reste limitée aux 24 h de la session serveur. Les parties guidées restent exclues du classement Google et peuvent être conservées dans l’historique local privé. Aucun compte n’est fusionné sur la base du pseudo.

Des doublons dans les fichiers générés `.next/types` et le cache Turbopack ont perturbé certaines vérifications intermédiaires. Ils ont été déplacés dans des dossiers temporaires conservés, puis les vérifications finales sont passées avec un cache neuf ; aucun changement de configuration du framework n’a été nécessaire.
