# Fils of War — Royaumes v3 : plusieurs façons de gagner

Branche `test/royaumes-v3-civilisations`, basée sur `test/royaumes-v2`.
Aucune modification de `develop`, de `main`, de SFT 2026, ni du moteur 3D historique.

## Ce qui est réalisé

La couche `monde8/civilisation.js` étend **la simulation existante** `strategie-v2.js` sans remplacer ses unités, sa navigation, ses chantiers, sa conquête ou ses sauvegardes.

Cinq voies de victoire :
- **Prospérité** : 2 marchés achevés, volume d'échanges 330, 3 partenaires commerciaux, 160 filsous en réserve.
- **Savoir** : 2 bibliothèques, 1 observatoire, 4 technologies achevées et 680 connaissances accumulées.
- **Rayonnement** : 2 salles des fêtes, 1 monument, 450 prestige, 3 festivals et 2 lieux emblématiques découverts.
- **Concorde** : 1 ambassade, le soutien de 4 autres royaumes (confiance élevée), 320 influence et 180 secondes de paix.
- **Domination** : 64 secteurs et 2 capitales adverses sous contrôle.

Dans tous les cas, la victoire n'est comptée qu'après 300 secondes de partie. Les objectifs exigent leur **réalisation simultanée** ; une seule ressource ne suffit pas.

Bâtiments et actions réels : marché, bibliothèque, salle des fêtes, ambassade, observatoire, monument et village pacifique avec coût, travaux progressifs et besoin d'ouvriers locaux. Les marchés transforment une faible consommation de vivres en revenus ; les routes commerciales avec deux marchés développent confiance et échanges. La recherche consomme du savoir et des matériaux. Festivals et émissaires coûtent des ressources et respectent une période d'attente.

Les sept IA possèdent des orientations distinctes, économisent pour changer d'époque, bâtissent des villages, envoient des éclaireurs découvrir des lieux et peuvent gagner sans combat. Les IA spécialisées autre chose que la conquête ne cherchent pas activement à conquérir des secteurs par la guerre (des combats défensifs restent possibles).

L'interface `monde8/jouer.html` affiche les cinq objectifs, leurs barres d'avancement, le savoir, prestige, influence et commerce, et les actions civiles. Les parties v2 peuvent être chargées ; la sauvegarde v3 enregistre technologies, chantiers civils, relations, commerce et victoire.

## Contrôles effectifs avant livraison

- Quatre scénarios fondation / construction / recherche / chargement (graines 42 et 2026, sièges 0 et 3).
- Reprise déterministe après chargement sur plusieurs centaines de pas.
- Victoire diplomatique atteinte par une IA, victoire commerciale atteinte par une IA, victoire scientifique atteinte par une IA et victoire culturelle atteinte par une IA dans des simulations automatisées.
- Pour isoler certains tests, les autres modes de victoire ont été désactivés pour les IA concernées.
- Le nouveau fichier `tests-v3.mjs` contient des scénarios reproductibles.

## Limites connues

- Toujours **un joueur local + sept IA**, et **interface stratégique 2D**. Pas de véritable partie à huit humains, pas encore de monde 3D 2048.
- Le contrôle des relations commerciales et de diplomatie est un moteur de simulation, pas un protocole serveur sécurisé.
- Les IA ont des heuristiques simples et l'équilibrage n'est pas final.
- Les villages pacifiques exigent l'arrivée réelle d'ouvriers ; pas de téléportation.
- Diplomatie : échanges et confiance, mais pas encore un système complet de traités, votes et alliances militaires.
- Pas encore de carte géographique interactive 3D autour des villes, ni de sièges élaborés.
- La domination est définie mais la victoire militaire complète sur une carte durable ne fait pas encore l'objet d'une démonstration de bout en bout.

## Prochain chantier

1. Boucle d'extension économique et diplomatique plus riche : réseaux de routes, commerce entre villes, caravanes, neutralité et alliances contractuelles.
2. Couche 3D au-dessus de **cette simulation unique**, sans réinventer les règles dans un autre jeu.
3. Migration vers un serveur autoritaire permettant huit humains. Assigner les règles de simulation par joueur côté serveur, pas dans le navigateur.
