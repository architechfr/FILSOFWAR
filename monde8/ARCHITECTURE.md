# FILS OF WAR — Architecture monde 8 joueurs

## Décision du 19 octobre 2026
**Objectif produit : 8 humains simultanément sur un continent commun.**
**État de livraison : laboratoire cartographique et contrat réseau, PAS une partie multi à 8 opérationnelle.**

- Branche isolée `test/monde-huit-joueurs`, issue de `test/salagou-v2`.
- Le jeu legacy `/` garde 768×768, 24 secteurs, 2 joueurs / IA, modules Salagou et ressources, sauvegarde solo.
- Le nouvel atlas `/monde8/` n'écrit ni sauvegarde ni configuration du jeu legacy.
- Pas de migrations Supabase, pas de promotion en production, pas de modifications `develop`.

## Dimensionnement cible

| Élément | Cible de laboratoire | Commentaires |
|---|---:|---|
| Continent | 2 048 × 2 048 unités | 7,11 × la surface historique de 768 × 768 |
| Joueurs | 8 | 8 capitales équilibrées, une par royaume |
| Secteurs économiques | 256 de 128 × 128 | 16 × 16 |
| Tuiles de streaming | 1 024 de 64 × 64 | 32 × 32; activer le streaming dans une étape ultérieure |
| Grille du terrain | 513 × 513 altitudes, pas de 4 | 263 169 valeurs Int16, résolution décimétrique |
| Collision/pentes | 512 × 512 cellules | codes eau/terre/pont + angle 0–89° |
| Altitude | bruit multi-échelle, pics, vallée de rivière, replats de capitales | unités de jeu, NON cotes NGF réelles |
| Budget initial de simulation | 120 unités par joueur, soit 960 max | plafond envisagé, soumis à tests de charge |
| Rafraîchissement des règles | 20 ticks/s | 50 ms le tick, 5 ticks par tour |
| Tour réseau | 250 ms | ordonnanceur déterministe avec 3 tours d'anticipation |
| Ordres autorisés par tour et joueur | 16 | validation côté serveur impérative |

Les 8 capitales sont disposées autour du continent, avec une zone d'implantation plane de rayon 83 et une transition adoucie jusqu'à 160 unités. La carte du laboratoire n'est pas une reproduction SIG fidèle de l'Hérault : les noms sont des références paysagères.

### Altitudes et règles de navigation
- Altitude canonique : entier en décimètres `Int16` sur grille. L'interpolation n'influence pas le résultat réseau si les mêmes opérations sont utilisées.
- Pente : angle calculé à partir des dérivées de la grille.
- Seuils conservateurs de laboratoire : fantassin 34°, cavalier 22°, charrette 14°, blindé 12°.
- Traversée : eau interdite, ponts autorisés ; les reliefs deviennent de vrais obstacles, contrairement au moteur historique majoritairement visuel.
- Les huit capitales sont accessibles **à pied et à cheval** pour les premières graines vérifiées. Les cols routiers pour charrettes et blindés doivent encore être planifiés.
- Pour les chars modernes : différencier route et hors-route, adhérence, boue, forêt, pont porteur, largeur, tunnels et virages. Réserver ce système dans le schéma de navigation ; ne pas coder des chars dans l'ère primitive.

### Génération reproductible
- La `seed` détermine la géographie ; aucune recherche réseau ou hasard système pendant la génération.
- Le monde complet dispose d'une empreinte `checksum`; la même graine et la même version doivent produire la même empreinte sur tous les clients.
- L'identité de version `worldVersion` et le `checksum` sont obligatoires à l'entrée d'un salon huit joueurs.
- L'assignation des capitales se fait après validation des huit places.

## Multijoueur — découplage du réseau historique

### Aujourd'hui
`reseau.js` synchronise strictement deux joueurs par lockstep client-à-client et contrôle périodique d'empreinte. `jeu.js` initialise explicitement `players=[0,1]`. Un simple bouton « 8 joueurs » serait trompeur et casserait le moteur.

### Cible
**Serveur arbitre autoritaire et simulation déterministe**, messages client transportés par canal authentifié (WebSocket dédié ou Realtime broadcast orchestré). Ne jamais traiter les identités envoyées par les clients comme une preuve d'autorisation.

1. Lobby du serveur : jusqu'à huit places, identités vérifiées, prêt/pas prêt, fermeture, hôte, droits d'invitation.
2. Le serveur fixe `seed`, `worldVersion`, `checksum`, huit capitales et les places. Un joueur ne contrôle que son `seat`.
3. Chaque commande est numérotée, associée à un tour futur et validée : propriétaire, coordonnées, ressources, visibilité, technologie, cadence et action autorisée.
4. Le serveur ordonne les commandes par `turn` puis `seat`, simule chaque tick, publie les accusés de réception et états confirmés.
5. L'horloge de simulation est pilotée par le serveur, pas par les fréquences d'affichage des téléphones.
6. Reconnexion : jeton de session à usage contrôlé, accusé de dernier tour, snapshot canonique, rattrapage par journal des commandes.
7. Persistance durable de la partie et historique des ordres ; prise en charge d'une déconnexion temporaire par pause, IA provisoire ou ordre de garde (règle à décider avant bêta).
8. Observabilité : latence p50/p95, nombre d'unités, temps de tick, trafic, désynchronisations, charge mobile et mémoire.

Le fichier `monde8/protocole.js` fournit **une maquette exécutable** de lobby et de validation de paquets. Ce n'est **ni un serveur authentifié, ni un moteur de combat à huit joueurs**, et ses jetons locaux ne doivent pas être utilisés comme mécanisme de sécurité réel.

## Chargement et performances

- Générer les hauteurs/biomes en données compactes ; les modèles 3D se chargent par tuiles de 64 unités autour des caméras et lieux observés.
- L'atlas peut utiliser une image raster basse résolution ; les détails 3D se chargent à mesure.
- Utiliser instances géométriques pour herbes, rochers, arbres et gisements. Limiter les lumières, ombres et effets mobiles selon puissance du téléphone.
- Séparer rendu et état canonique des ressources et des armées. Une tuile distante peut être non rendue mais rester simulée par le serveur.
- Budgets mobiles et de bande passante à mesurer sur Android milieu de gamme **avant** ouverture à huit joueurs.

## Jalons non négociables

1. **Laboratoire (livré)** : carte déterministe, 256 secteurs, 8 capitales, inspecteur d'altitude, pentes et eau, maquette du protocole réseau.
2. **Navigation** : calcul de chemins hiérarchique sur secteurs et tuiles, réseaux routiers et cols garantissant des liaisons pour chars modernes, audit des capitales sur >=100 graines.
3. **Moteur 8 joueurs** : `players`, unités, bâtiments, économie, IA et victoire généralisés à huit propriétaires, avec tests hors interface.
4. **Serveur d'autorité** : vraie gestion des salles, authentification, autorité des commandes, snapshot, reconnexion, sauvegardes.
5. **Rendu mobile** : streaming 3D, brouillard par joueur, minimap 2048, contrôle des unités sur téléphone.
6. **Bêta** : d'abord 2 humains, puis 4 et enfin 8 en conditions réelles. Aucune promotion automatique en production.

## Critères d'acceptation avant activation multi 8

- Pour chaque graine, 8 capitales situées sur terre, constructibles et accessibles.
- Côté serveur : aucune commande d'un joueur ne peut modifier les unités / ressources d'un autre.
- D'une graine et version identiques, empreintes identiques sur tous les clients.
- Une reconnexion n'accorde pas une neuvième place et ne fait pas repartir l'horloge.
- La partie reste utilisable sur téléphone avec 8×120 unités, sans fuite mémoire de tuiles.
- Brouillard de guerre, commerce, alliances, classement, sauvegarde et conditions de victoire opérationnels pour N=8, sans tableau codé en dur à [0,1].
