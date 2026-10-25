# Retours V4 — vérification locale

## Priorités réalisées
1. Safari iPhone : panne reproduite sur l’IPv4 LAN (taps sans démarrage et WebSocket HMR rejeté), correction allowedDevOrigins limitée aux adresses de la machine, test tactile WebKit LAN passé après correction.
2. Panneaux : correction du token de padding non hérité dans les portails Radix, 24 px de marge, réglages de 64 px et interlignes plus aérés. Mesure dans une même frame après transition, pour ne pas confondre marge et translation du panneau.
3. Bandeau Pause/Réglages/Quitter, libellé Tetris et vraies icônes de retour.
4. Une seule matière irisée pour les cellules verrouillées, sans frontières de couleur ; moteur et vrais trous inchangés.

## Vérifications
- 83 tests unitaires passent.
- 10 parcours navigateur passent : les parcours précédents, padding des panneaux, ordre du bandeau, libellé Tetris, fallback unifié et un parcours Safari/WebKit sur l’adresse LAN réelle utilisant uniquement des taps pour démarrer, déplacer, poser et reprendre.
- 38 captures : quatre profils (Chromium desktop / WebKit iPhone, clair/sombre), avec panneaux règles/réglages en plus, et deux géométries complémentaires.
- Aucun push ni déploiement ; branche feature/tetris, main intacte.

Les tests WebKit s’exécutent sur le Mac. Ils ne certifient pas les vibrations ni les temps GPU d’un iPhone physique. Le test LAN couvre toutefois le mode d’accès qui échouait et qui n’était pas couvert auparavant par localhost.

Flag false : build de production et deux parcours dédiés passent ; huit parcours de gameplay sont volontairement ignorés. Jeux absent, anciennes et nouvelles routes en 404, menu et Touche-moi fonctionnels. Lint zéro erreur (warning gaze-avatar préexistant), type-check réussi. La preview est rétablie à true uniquement dans .env.local ; valeur versionnée false.

Builds finaux false puis true : succès. Un warning préexistant concerne les métriques de fallback Google Sans. Les essais tactiles LAN ont été effectués sur http://192.168.1.12:3000/jeux/tetris ; cette adresse est celle du Mac durant la vérification.
