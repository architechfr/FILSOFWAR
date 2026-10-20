// Tests des règles du mode Clash : node tests/clash.test.js
var C = require('../clash.js'), assert = require('assert');
var T0 = Date.UTC(2026, 9, 21, 8, 0, 0), M = 60000, H = 3600000;
var ok = 0; function test(nom, f) { f(); ok++; console.log('ok -', nom); }

test('départ', function () {
  var e = C.nouvelEtat(T0);
  assert(C.valide(e)); assert.equal(e.recolteurs.length, 2); assert.equal(C.batisseurs(e), 2);
  assert(!C.construire(e, 'depot', 0, 0, T0).ok, 'rien sans tente');
  assert(C.poserTente(e, 100, 100, T0).ok); assert(!C.poserTente(e, 1, 1, T0).ok, 'la tente ne bouge plus');
});

test('chantier en temps réel et bâtisseurs', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var r = C.construire(e, 'depot', 110, 100, T0); assert(r.ok);
  assert.equal(e.res.wood, 300 - 120); assert.equal(C.batisseursLibres(e), 1);
  C.construire(e, 'ferme', 90, 100, T0);
  assert.equal(C.batisseursLibres(e), 0);
  assert(!C.construire(e, 'maison', 80, 100, T0).ok, 'plus de bâtisseur libre');
  C.avancer(e, T0 + 16000); assert.equal(C.batParId(e, e.bats[2].id).niveau, 1, 'ferme finie à 15 s');
  assert.equal(C.batParId(e, r.id).niveau, 0); C.avancer(e, T0 + 20000); assert.equal(C.batParId(e, r.id).niveau, 1);
  assert.equal(C.batisseursLibres(e), 2);
  assert.equal(C.capacites(e).wood, 600 + 800);
});

test('production hors ligne plafonnée au stock', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var n = { type: 'stone', source: 'stone', max: 750, x: 120, z: 100 };
  assert(C.affecter(e, 'n1', n, T0).ok); assert(C.affecter(e, 'n1', n, T0).ok);
  assert(!C.affecter(e, 'n1', n, T0).ok, 'aucun récolteur libre');
  var b = C.avancer(e, T0 + H / 2);
  assert(Math.abs(e.res.stone - (150 + 200)) < 1e-6, 'deux récolteurs, 30 min : +200 pierre, ' + e.res.stone);
  C.avancer(e, T0 + 24 * H); assert.equal(e.res.stone, 600, 'plafonné par la tente');
});

test('les arbres s’épuisent puis repoussent', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  C.affecter(e, 'n9', { type: 'wood', source: 'tree', max: 200, x: 0, z: 0 }, T0);
  C.avancer(e, T0 + H);
  assert(e.noeuds.n9.stock < 1, 'arbre épuisé');
  var w = e.res.wood; C.avancer(e, T0 + 2 * H);
  assert(e.res.wood - w <= C.REPOUSSE + 1e-6, 'ensuite seulement ce qui repousse');
  C.retirer(e, 'n9', T0 + 2 * H); C.avancer(e, T0 + 4 * H);
  assert(e.noeuds.n9.stock > 70, 'repousse sans récolteur');
});

test('stock agrandi en cours de route (dépôt fini pendant l’absence)', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  e.res.wood = 590; C.construire(e, 'depot', 110, 100, T0); // 470 bois
  C.affecter(e, 'n2', { type: 'wood', source: 'tree', max: 5000, x: 0, z: 0 }, T0);
  C.avancer(e, T0 + 3 * H);
  assert(e.res.wood > 1300, 'le dépôt a relevé le plafond pendant l’absence : ' + e.res.wood);
});

test('HDV : montée, zone, blocage étape 5', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var t = e.bats[0];
  assert(!C.ameliorer(e, t.id, T0).ok, 'pas assez');
  e.res = { food: 600, wood: 600, stone: 600, gold: 600 };
  assert(C.ameliorer(e, t.id, T0).ok);
  C.avancer(e, T0 + 4 * M); assert.equal(e.hdv, 1);
  C.avancer(e, T0 + 5 * M); assert.equal(e.hdv, 2); assert.equal(C.zone(e), 55);
  assert.equal(C.maxBat('tir', 2), 1);
  e.hdv = 3; t.niveau = 3; e.res = { food: 9e3, wood: 9e3, stone: 9e3, gold: 9e3 };
  var r = C.ameliorer(e, t.id, T0 + 6 * M); assert(!r.ok && /étape 5/.test(r.raison));
});

test('niveau des bâtiments plafonné par l’HDV', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var id = C.construire(e, 'maison', 110, 100, T0).id; C.avancer(e, T0 + M);
  e.res = { food: 9e3, wood: 9e3, stone: 9e3, gold: 9e3 };
  var r = C.ameliorer(e, id, T0 + M); assert(!r.ok && /HDV/.test(r.raison));
  e.hdv = 2; assert(C.ameliorer(e, id, T0 + M).ok);
});

test('capsules : finir un chantier, acheter un bâtisseur', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  e.res = { food: 600, wood: 600, stone: 600, gold: 600 };
  C.ameliorer(e, e.bats[0].id, T0);
  assert.equal(C.prixCapsules(300), 4);
  var r = C.accelerer(e, e.bats[0].id, T0); assert(r.ok); assert.equal(e.hdv, 2); assert.equal(e.capsules, 500 - 4);
  assert(C.acheterBatisseur(e, T0).ok); assert.equal(C.batisseurs(e), 3); assert.equal(e.capsules, 496 - 250);
  assert(!C.acheterBatisseur(e, T0).ok, 'pas assez de capsules pour le suivant (500)');
  assert.equal(C.prixCapsules(24 * 3600), 337);
});

test('recrutement : logement et file', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  assert(C.recruter(e, T0).ok); assert(!C.recruter(e, T0).ok, 'logement 3 : 2 + 1 en formation');
  C.avancer(e, T0 + 21000); assert.equal(e.recolteurs.length, 3);
  C.construire(e, 'maison', 110, 100, T0 + 21000); C.avancer(e, T0 + 40000);
  assert.equal(C.logement(e), 6);
  assert(C.recruter(e, T0 + 40000).ok); assert(C.recruter(e, T0 + 40000).ok);
  C.avancer(e, T0 + 40000 + 39000); assert.equal(e.recolteurs.length, 4, 'la 2e attend la 1re');
  C.avancer(e, T0 + 40000 + 41000); assert.equal(e.recolteurs.length, 5);
});

test('ferme : places selon le niveau, arrêt pendant le chantier', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var f = C.construire(e, 'ferme', 110, 100, T0).id;
  assert(!C.affecter(e, f, null, T0).ok, 'pas encore construite');
  C.avancer(e, T0 + M); e.res.food = 0;
  assert(C.affecter(e, f, null, T0 + M).ok); C.avancer(e, T0 + M + H); assert(Math.abs(e.res.food - 360) < 1e-6);
  e.hdv = 2; e.res.wood = 999; C.ameliorer(e, f, T0 + M + H);
  var avant = e.res.food; C.avancer(e, T0 + M + H + 2 * M); assert.equal(e.res.food, avant, 'ferme en chantier : rien');
});

test('mode développement : instantané', function () {
  C.reglages.instant = true;
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  var id = C.construire(e, 'depot', 110, 100, T0).id; assert.equal(C.batParId(e, id).niveau, 1);
  C.recruter(e, T0); assert.equal(e.recolteurs.length, 3);
  C.reglages.instant = false;
});

test('sauvegarde JSON aller-retour', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0); C.construire(e, 'depot', 110, 100, T0);
  var f = JSON.parse(JSON.stringify(e)); assert(C.valide(f)); C.avancer(f, T0 + H); assert.equal(f.bats[1].niveau, 1);
});

test('24 h hors ligne restent rapides', function () {
  var e = C.nouvelEtat(T0); C.poserTente(e, 100, 100, T0);
  C.affecter(e, 'n1', { type: 'wood', source: 'tree', max: 500 }, T0);
  var t = Date.now(); C.avancer(e, T0 + 24 * H); assert(Date.now() - t < 200, (Date.now() - t) + ' ms');
});
console.log(ok + ' tests passés');
