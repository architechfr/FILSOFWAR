# Zone 1 — Grand Salagou : terrain enrichi

Branche de test : `test/zone1-grand-salagou` sur `architechfr/FILSOFWAR`.
Source de départ : `test/royaumes-v3-civilisations`.

## Changements réels

1. Lac du Salagou fortement agrandi et rendu moins rond par trois anses, une presqu'île et des rives ondulées. La surface est déterminée par la graine.
2. Barrage situé sur l'exutoire du lac ; le chenal descend vers la rivière et trois franchissements la traversent. Les mêmes géométries servent au sol, aux pentes et aux collisions, contrairement à une simple surcouche graphique.
3. Nouvelles crêtes autour des ruffes : belvédères, points hauts et passages encaissés. Pic Saint-Loup conservé.
4. Extension additive `zone-salagou.js` : environ 29 à 36 lieux découverts par graine (ruines, pierres levées, grottes, mines, vignes, bois, oliveraies, sanctuaires, sources et relais), sans implantations sur l'eau ni sur des pentes dangereuses.
5. Bonus de ressources intégrés aux secteurs de production. Les lieux s'ajoutent aux références culturelles : les éclaireurs peuvent les découvrir et obtenir du prestige dans la couche civilisation.
6. Atlas `/monde8/` et jeu stratégique `/monde8/jouer.html` montrent les découvertes et le barrage. L'inspecteur décrit le point d'intérêt le plus proche.

## Préservation

- Aucun changement au jeu historique 3D de 768 × 768 (`jeu.js`, `carte.js`, `reseau.js`).
- Aucun changement aux branches `main` ou `develop`, ni à SFT2026.
- Aucun faux réseau huit joueurs : le laboratoire reste 1 humain + 7 IA. Les voies commerciales, scientifiques, culturelles, diplomatiques et militaires restent présentes.
- Les nouveaux modules sont chargés **avant** le démarrage du jeu stratégique. La fonction gelée `FOW_WORLD8` est enveloppée par une façade, non modifiée directement.

## Vérifications

- 9 graines vérifiées : 8 capitales accessibles à pied/à cheval, barrage sur case de franchissement, rivière aval, pas de sites sur l'eau, génération déterministe.
- Vérification de la construction d'un projet commercial et du chargement d'une sauvegarde avec le générateur enrichi.
- Syntaxe des deux écrans JavaScript contrôlée.

## Limites et prochain travail

- Le laboratoire monde8 est un atlas/jeu **2D** avec relief calculé et ombré, pas encore la vue de terrain 3D détaillée de l'image de référence. L'image est une cible artistique, non une capture en jeu.
- Les villages et ponts actuels sont des structures géométriques/logiques ; le vrai mobilier 3D (végétation, constructions, bateaux, ponts détaillés) reste à développer.
- Certains trajets de charrettes et de blindés requièrent encore des cols ou des routes plus accessibles.
- Les noms du paysage s'inspirent de l'Hérault mais ne correspondent pas à un modèle topographique SIG géoréférencé.
- Prochain lot : couche de rendu 3D par tuiles, végétation et constructions instanciées, LOD mobile, sans reconstruire les règles de simulation.
