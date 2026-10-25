# Identité unifiée et publication — 25 octobre 2026

## Analyse et architecture retenue

Avant cette refonte, `ui/player-identity.tsx` possédait un contexte Google avec un mode `guest/google`, tandis que `profile/client-store.ts` gérait séparément un profil serveur. Le panneau du profil, le Game Over et le classement possédaient leurs propres choix et formulaires. Un pseudo saisi en fin de partie créait un profil local et les comptes Google pouvaient recevoir un nom et une photo personnalisés distincts du compte.

`profile/client-store.ts` est désormais la source de vérité unique. Son snapshot, observé avec `useSyncExternalStore`, expose exactement trois états actifs : `anonymous`, `local`, `google`. Les chargements, erreurs et opérations en cours sont des métadonnées de cet état, pas des identités supplémentaires. Le provider se limite à amorcer le store et à écouter les événements de réseau, de focus et de stockage. Il ne conserve plus de mode concurrent.

Le store centralise le chargement, la création/modification locale, la connexion/déconnexion Google, les scores sur cet appareil et les envois différés. `ui/identity-selector.tsx` présente cet état et le même formulaire dans Jeux, l'entrée du jeu, le Game Over et le panneau ouvert par l'avatar. Le bouton Google et le bouton d'avatar ne contiennent pas leur propre logique d'authentification.

| État | Présentation et actions |
| --- | --- |
| Google | Avatar/initiales, nom issu des métadonnées vérifiées et déconnexion. Aucun formulaire de pseudo/photo local. |
| Local | Pseudo/photo du navigateur, Modifier et connexion Google. |
| Anonyme | Google, création locale, continuation sans enregistrement. Au Game Over, possibilité explicite d'enregistrer avec un pseudo anonyme, sans créer de profil. |

Google passe par la connexion OAuth Supabase existante dans une popup, avec PKCE et cookies HttpOnly. Le callback communique uniquement le résultat booléen à son opener, de même origine. Le store contrôle l'origine **et** la fenêtre source, puis recharge le profil vérifié côté serveur. Fermeture, blocage et réseau indisponible produisent un message français près de l'action. Aucun jeton d'authentification n'est placé dans le navigateur par le store.

Côté serveur, `server/player.ts` prend toujours le nom et l'avatar Google dans le compte vérifié, sans appliquer l'ancien profil personnalisé. L'API refuse la modification locale d'un profil Google. La logique du moteur, du score et de vérification des replays reste inchangée.

## Persistance et migration

- `tetris.local-profile.v2` : profil local et photo préparée à 256 px maximum ; WebP si le navigateur le permet, sinon format d'image pris en charge. Limite finale de 180 Ko, contrôle du format, taille d'entrée limitée à 5 Mo.
- `tetris.local-scores.v2` : historique local, y compris les parties lancées sans session réseau. Les scores de ce stockage ne sont jamais acceptés comme preuve d'un score au classement public.
- Les anciens profils locaux retournés par l'API sont importés au premier chargement. Une copie locale déjà présente reste prioritaire. La copie serveur est conservée pour la compatibilité des anciens scores et reçus.
- La clé locale reste stable lorsqu'un profil créé hors ligne obtient ensuite une copie serveur ; `serverKey` permet de respecter les contrôles du destinataire sur l'API.
- `lava-best`, `lava-settings`, le brouillon `lava-pending-score-v1` et la file `tetris.local-score-queue.v1` sont conservés. Les anciennes entrées locales sans destinataire ne sont rattachées qu'au profil local, jamais à un autre compte Google.
- Aucun profil, score ou reçu existant n'est supprimé dans les bases serveur. Le classement général existant est conservé ; les historiques locaux du navigateur sont affichés dans une section distincte « Sur cet appareil ».
- Un brouillon n'est supprimé qu'après confirmation de sauvegarde ou abandon explicite. Le destinataire d'un score déjà lié est conservé : un autre compte ne peut pas le récupérer. Un brouillon anonyme peut être rattaché au profil créé ou connecté au Game Over.
- Les parties guidées et les parties sans session réseau restent enregistrables sur l'appareil mais ne sont pas présentées comme des scores publics vérifiés.

## UI, accessibilité et animation

L'avatar est dans le même groupe que Réglages, immédiatement à sa gauche. Rejouer utilise toujours le variant `accent` existant. Les actions d'identité occupent toute la largeur sur mobile et mesurent au moins 44 px. Les erreurs utilisent les couleurs foreground/muted du design system, un rôle alert, aria-live et une action de nouvelle tentative pertinente. Le contraste de ce bloc a été contrôlé à au moins 4,5:1.

Les blocs de la card utilisent désormais une largeur de 10–24 rem et ne subissent plus la limite de 4 rem des miniatures du jeu. Les couleurs saturées dominent la card. Le fond d'entrée contient exactement 14 pièces (7 auparavant), de 12 rem au lieu de 8. Ce pool est fixe ; seules les transformations sont animées. Les animations sont suspendues quand l'onglet est masqué et désactivées avec prefers-reduced-motion.

Mesure locale Chromium sur 120 intervalles requestAnimationFrame : environ 60 fps à 375 px et à 1280 px ; 95e percentile respectivement 16,8 ms et 16,7 ms. Il s'agit d'une mesure sur cette machine, pas d'une garantie pour tous les matériels.

Le proxy évite aussi de réappliquer la canonicalisation de langue à une réécriture interne `/fr/...`, ce qui supprime une boucle détectée lors de la compilation propre. Les URL publiques et les contrôles d'accès conservent leur comportement.

## Vérifications

44 tests d'identité/responsive passent sur Chromium et WebKit iPhone, dont la matrice des 3 états × les 3 écrans sur les deux navigateurs, à environ 375 px pour les captures iPhone et en desktop :

- profil Google : affichage exclusif, nom, avatar de secours et sauvegarde automatique ;
- profil local : édition, persistance entre pages et après rechargement, position de l'avatar dans la barre ;
- anonyme : trois choix, pseudo anonyme sans profil permanent ;
- création locale avec photo au Game Over, conservation du score en cours et compression/redimensionnement ;
- Google : succès, annulation, fermeture, popup bloquée et nouvelle tentative, avec conservation du brouillon ;
- réseau indisponible, profil local et score disponibles hors connexion, y compris sans session réseau ;
- pseudo vide/invalide/déjà utilisé, photo au format invalide ou trop lourde ;
- échec d'envoi Google, reprise, destinataire différent refusé ;
- déconnexion Google vers le profil local précédemment enregistré ;
- contraste AA, cibles tactiles, absence de débordement horizontal, pool fixe et réduction du mouvement.

Les tests du protocole Google utilisent une frontière OAuth contrôlée ; ils ne saisissent pas les identifiants d'un véritable compte Google. Les mécanismes serveur PKCE/cookies/nonce continuent d'être couverts par les tests existants. La vérification d'une connexion personnelle réelle reste une action de recette avec son propre compte.

Les 5 tests audio passent, ainsi que les contrôles des routes, de la redirection historique et du rendu SVG sans WebGL. Le lint ne signale aucune erreur ; il conserve un avertissement préexistant dans gaze-avatar.tsx.

## Fichiers principaux

- Store/validation/photo : `profile/client-store.ts`, `profile/fields.ts`, `profile/photo.ts`.
- Sélecteur/avatars/erreurs : `ui/identity-selector.tsx`, `ui/player-profile.tsx`, `ui/player-profile.css`, `ui/player-identity.tsx`, `ui/google-sign-in.tsx`.
- Intégrations : page Jeux, `ui/tetris.tsx`, `ui/game-over.tsx`, `ui/leaderboard.tsx`.
- OAuth et profil vérifié : routes auth Google/callback/déconnexion/profil, `auth/identity.ts`, `auth/draft.ts`, `server/player.ts`, `server/oauth-popup.ts`.
- Visuels : `ui/tetris-cover.tsx`, `ui/gameplay-background.tsx`, `ui/game.css` ; compatibilité des réécritures dans `src/proxy.ts`.
- Tests : `identity-profile.spec.ts`, `profile.spec.ts`, `helpers/identity.ts`, adaptations des anciens parcours et `engine/identity.test.ts`.

## Déploiement

La reprise initiale a confirmé le commit `c27552c` en état READY via l'intégration GitHub de Vercel ; jeu et sons répondaient en HTTP 200. Une tentative CLI séparée était bloquée par la politique d'auteur du projet et n'avait pas remplacé la production. La voie de publication reste donc le push autorisé sur main puis le déploiement automatique GitHub/Vercel. Le contrôle final porte sur le SHA exact de la refonte, l'état READY et les routes publiques.

## Ajustement du parcours : Pseudo / Se connecter

Le sélecteur présente désormais seulement deux méthodes avant identification : **Pseudo** et **Se connecter**. Chaque méthode ouvre la même bottom sheet réutilisable, y compris depuis le bouton d'avatar. Modifier un pseudo réutilise cette feuille sans ouvrir de dialogue imbriqué. Le parcours Pseudo comprend le pseudo et la photo optionnelle et conserve les scores sur l'appareil ; il remplace les anciens choix distincts local/anonyme. Les anciens profils, scores anonymes publics et files d'attente restent conservés pour compatibilité. Le store garde un état sans identité pour permettre de jouer sans choisir de pseudo ou de compte.

Le bouton Google emploie le variant Secondary, comme le choix Se connecter. La suppression de photo est un bouton icon-only fixe de 44 × 44 px, sans étirement. La bottom sheet a une hauteur de contenu plafonnée à 90 dvh, un scroll interne et les zones sûres mobiles.

## Navigation par avatar et hiérarchie de fin de partie

Sur Jeux, l’avatar partage la ligne du titre. Dans le lobby Tetris, il termine la ligne Retour aux jeux. Le même DropdownMenu propose Ajouter/Modifier mon pseudo et Google/Déconnexion, puis ouvre la bottom sheet correspondante. Le pseudo Google reste géré par Google. Le lobby présente Jouer, séparateur, Classement, Règles, Réglages.

Le Game Over affiche Score, conservation locale pour les visiteurs sans Google, avatar/pseudo ou saisie rapide avec Valider (Primary), puis Record. Rejouer (Accent), Classement et Menu précèdent la connexion (Secondary), désactivée si indisponible ou hors ligne. Le store sauvegarde aussi les parties sans pseudo sur l’appareil ; la saisie d’un pseudo ou la connexion conserve le même identifiant de partie et remplace son attribution sans doublon. Les protections contre le transfert d’une partie déjà liée à un autre compte restent appliquées.

Validation de cette itération : build de production et typecheck réussis, 111 tests unitaires et 52 tests navigateur réussis (Chromium et WebKit, dont les formats 375 et 1280 px). Les contrôles couvrent les trois identités sur les trois écrans, les popups Google, la validation pseudo/photo, la conservation du score, les échecs réseau/envoi, le contraste des erreurs, l’alignement des avatars et le nouvel ordre des menus. Vérification visuelle des menus et du Game Over aux deux largeurs. Le lint ne signale aucune erreur ; un avertissement préexistant subsiste dans gaze-avatar.tsx.

## Ajustement du classement, du pseudo et des polices

Le classement général ne contient plus de sélecteur d’identité. Sur Game Over, un profil existant affiche son pseudo en texte et propose Modifier le pseudo en pied de carte, via la bottom sheet commune. Sans pseudo, Valider et le champ ont la même hauteur (au moins 44 px). Google Sans s’applique aux scores, raccourcis clavier, récompenses et fenêtres Tetris, y compris les contenus rendus dans des portails. Les scores gardent des chiffres tabulaires sans police monospace.
