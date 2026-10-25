# Lava — V2 : son et classement général

Périmètre confirmé : son optionnel et classement du marathon classique. Aucun défi quotidien, duel, multijoueur ou matchmaking.

## Son

Off par défaut, un seul toggle Son On / Off dans les réglages, choix mémorisé. Synthèse Web Audio originale, sans musique ni fichier externe. Ouverture du contexte sur un geste utilisateur ; arrêt des voix à la pause, perte de focus et sortie, fermeture au démontage. Paramètres dans `src/features/tetris/feel/audio.ts`.

## Classement

Top 20 des records des 90 derniers jours, un record par navigateur, pseudonyme de 2 à 20 caractères et envoi volontaire après une partie terminée. Partie guidée exclue. Le serveur fournit une graine puis rejoue chaque action pour recalculer le score. Les pauses sont autorisées. Hors ligne, le solo et son record local restent disponibles.

SQLite persistant sur serveur Node avec disque durable, localement dans `.local/tetris/leaderboard.sqlite`. Le classement est désactivé sur Vercel tant qu’un stockage distant durable n’est pas configuré ; le jeu et le son fonctionnent indépendamment. Aucun stockage éphémère présenté comme persistant.

## Publication

Conserver `main` intacte et pousser `feature/tetris-v2`. Activer `NEXT_PUBLIC_ENABLE_TETRIS=true` et `NEXT_PUBLIC_ENABLE_TETRIS_SOUND=true` au build et à l’exécution Vercel. Garder `NEXT_PUBLIC_ENABLE_TETRIS_LEADERBOARD=false`. Le son utilisateur reste Off par défaut même avec son flag actif. Le noindex est conservé tant que la publication SEO n’est pas explicitement décidée.
