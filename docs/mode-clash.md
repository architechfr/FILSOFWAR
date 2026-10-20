# FILS OF WAR — le mode Clash

Second mode de Fils of War, à côté du mode solo « Civilisation », qui reste tel quel.
La proposition complète (validée le 21/10/2026) est dans le projet Claude : `fils-of-war-mode-clash.md`.

## Les étapes (une validée avant la suivante)
1. **Le village en local** : tente, bâtisseurs et récolteurs, temps réel, production hors ligne, capsules de test, HDV 1 à 3. ← **livrée, à valider**
2. L'attaque contre les villages des Barons : 3 minutes, étoiles, sorts.
3. Supabase : publier son village, voir ceux des copains, les attaquer en amical, revoir les replays.
4. Les capsules branchées aux Filsous du SFT2026.
5. HDV 4 à 8, les héros et les nouvelles défenses.

## Étape 1 : comment c'est fait
- **Les fichiers.** `clash.js` contient les règles, sans affichage, testées par `node tests/clash.test.js`. `clash-ui.js` contient l'écran : bouton du menu, carte 3D, panneaux.
- **Une seule retouche de `jeu.js`.** On y ajoute `window.FOW_MOTEUR`, qui donne accès au relief, à l'eau et aux bâtiments du moteur. Les règles de la partie classique ne changent pas, donc ses sauvegardes restent valables.
- **La carte.** C'est la vraie carte de la partie classique, avec la même graine pour tout le monde. Le moteur ne tourne pas : il sert de décor. Les bâtiments et les ouvriers du village y sont posés, et la 3D de `jeu.js` les dessine.
- **Le temps.** On utilise l'heure réelle. En rouvrant le jeu, `avancer()` rejoue l'absence en quelques millisecondes : chantiers finis, récoltes, stocks plafonnés. Un écran résume ensuite l'absence.
- **La sauvegarde.** Elle est sur ce téléphone, dans `localStorage`, sous la clé `fow.clash.v1`. Elle ne touche pas à la sauvegarde de la partie classique.
- **Le mode développement.** Avec `?devmap=1`, tout se termine tout de suite. Le bouton « +1000 de tout » remplit le village Clash (et ajoute 100 capsules).

## Étape 1 : les règles (chiffres de départ, à ajuster)
- **Le départ.** 300 vivres, 300 bois, 150 pierre, 100 or ; 2 récolteurs, 2 bâtisseurs et 500 capsules de test.
- **La zone.** C'est le rayon autour de la tente : 45 pas à l'HDV 1, puis 55, 65 et 75. Hors de la zone, la carte reste visible mais assombrie.
- **Les récolteurs.** Ils sont affectés à un arbre, des baies, de la vigne, un filon ou une ferme, et y restent.
  - Production par heure : bois 300, vivres 300, pierre 200, or 120, et 360 vivres à la ferme.
  - Au plus 2 récolteurs par ressource (3 sur un grand filon).
  - Les arbres et les baies s'épuisent, puis repoussent de 40 par heure. Les filons sont inépuisables.
  - On les recrute à la tente : 50 vivres et 20 s chacun, dans la limite du logement.
- **Les stocks.** La tente garde 600 de chaque ressource à l'HDV 1. Le dépôt garde le bois et la pierre, la ferme les vivres.
- **Les bâtiments de l'étape 1.**
  - HDV 1 : dépôt, ferme, maison, caserne, tour de guet.
  - HDV 2 : terrain de tir.
  - HDV 3 : tour de garde, écurie, atelier, buvette.
  - Le niveau d'un bâtiment est plafonné par l'HDV.
- **Les montées d'HDV.** HDV 1 → 2 en 5 min, HDV 2 → 3 en 30 min. L'HDV 4 est bloqué jusqu'à l'étape 5.
- **Les capsules.** Finir un chantier coûte (minutes restantes)^0,8 capsules, avec un minimum de 1. Un 3e bâtisseur coûte 250 capsules, puis 500 et 1000, jusqu'à 5 bâtisseurs.

## Pas encore dans l'étape 1
- **Repoussé.**
  - Les palissades et la porte : il faut adapter le tracé de murs du moteur.
  - La formation des troupes et le campement militaire : étape 2.
- **Écarté pour l'instant.**
  - La pêche : elle viendra avec la cabane de pêcheur.
  - Le gibier : il ne bouge pas quand le moteur est à l'arrêt, donc on l'a retiré du décor Clash.
