# Fils of War — Huit Royaumes V2

Branche : `test/royaumes-v2`, issue de `test/royaumes-jouables`.
Date : 19 octobre 2026.

## Livré dans le laboratoire indépendant

- `monde8/strategie-v2.js` : simulation huit factions / un humain + sept IA.
- `monde8/jouer.html` : interface branchée sur V2, avec brouillard par secteur, production et chantiers.
- `monde8/tests-v2.mjs` : tests de progression, sauvegarde et conquête.
- Les fichiers de la version 3D historique, `jeu.js`, `carte.js`, `reseau.js`, `develop` et l'application principale SFT 2026 ne sont pas modifiés.

### Progression

- Une ville commence avec une capitale, deux ouvriers et un éclaireur.
- Recrutements en file temporelle : ouvriers, éclaireurs, soldats, archers, cavaliers.
- Caserne achevée obligatoire avant soldats/archers/cavaliers ; cavalerie à partir de l'âge II.
- Chantiers progressifs avec besoin d'ouvriers à proximité. Plusieurs ouvriers accélèrent la construction.
- Secteurs exploitables avec renouvellement de ressources et prélèvement des ouvriers.
- Expansion de territoire après occupation durable : 12 s pour une zone neutre, 25 s pour une zone ennemie et 48 s pour une capitale avec 3 unités minimum.
- Avant-postes : défense renforcée et rayon de vision plus important.
- Vision : par secteur, permanente pour la découverte, temporaire pour les unités ennemies.
- Combats : archers à distance avec contrôle rudimentaire des obstacles, avantage de hauteur, protection d'avant-poste.
- IA : travailleurs et recrutements, tentative de caserne et conquête.
- Sauvegarde V2 : horloge de simulation, générateur aléatoire, files, construction, progression de prise de secteur, brouillard. Reprise déterministe vérifiée.

### Contrôles effectués

- Trois graines (1, 42, 2026) et trois sièges humains (0, 3, 7) : neuf scénarios.
- Casernes complétées, recrutement interdit avant caserne et accepté après achèvement : 9/9.
- Reprise de sauvegarde et continuation identique sur 350 pas après chargement : 9/9.
- Conquête d'un secteur adjacent avec éclaireur : contrôlée.
- Syntaxe de la page jouable contrôlée.

## Limites connues

- Toujours **un humain + sept IA** dans le laboratoire ; le protocole multijoueur huit places existant n'est pas connecté à un serveur autoritaire.
- L'interface du laboratoire reste en **2D** ; le jeu historique est une autre scène 3D, non migrée.
- Les paramètres de balancing sont exploratoires, non validés par de longues parties humaines.
- Les combattants ne gèrent pas encore formations, sièges, corps d'armée ni ravitaillement, et les chantiers sont simplifiés.
- Les capitulations, alliances, diplomatie, commerces et victoire ne sont pas encore complets.
- Les tests automatisés ne remplacent pas un test de rendu navigateur et de performances téléphones.

## Prochain chantier technique prioritaire

1. **Unifier les modèles de données avec le rendu 3D**, sans réécrire une troisième fois les règles : utiliser une interface `state -> render` et un convertisseur de coordonnées 2048.
2. Réaliser une caméra 3D au-dessus du continent et un streaming de secteurs 64x64 autour du joueur.
3. Ajouter routes, cols et intégrité des ponts pour charrettes, cavalerie et blindés.
4. Implémenter des formations, des garnisons et des sièges.
5. Mettre en place serveur de partie huit sièges, authentification et reconnection.

Le mode laboratoire est accessible à `/monde8/jouer.html` sur l'aperçu Vercel de cette branche après déploiement. Aucune promotion en production.
