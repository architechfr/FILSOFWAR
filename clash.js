/* FILS OF WAR - le mode Clash, étape 1 : le village en local (21/10/2026).
 *
 * Florian : « en Clash tous ont la même carte, seule la zone du village est
 * dévoilée ; on pose sa tente où on veut et elle ne bouge plus ».
 *
 * Ce fichier ne contient QUE les règles : pas de DOM, pas de 3D. Tout se calcule
 * à partir de l'heure réelle (Date.now(), en millisecondes) : c'est ce qui permet
 * la production hors ligne. On rouvre le jeu après 6 heures, avancer() rejoue ces
 * 6 heures en quelques millisecondes (chantiers finis, stocks pleins).
 *
 * L'affichage (clash-ui.js) lit l'état et appelle les actions ci-dessous.
 * Testable en Node : node tests/clash.test.js
 */
(function (racine) {
  'use strict';

  var RES = ['food', 'wood', 'stone', 'gold'];
  var NOMS_RES = { food: 'Vivres', wood: 'Bois', stone: 'Pierre', gold: 'Or' };
  var HEURE = 3600;

  /* ---- l'hôtel de ville (HDV) ------------------------------------------- */
  // zone = rayon en pas autour de la tente ; stock = ce que l'HDV garde de chaque ressource
  var HDV = {
    1: { nom: 'La Tente', zone: 45, batisseurs: 2, logement: 3, stock: 600 },
    2: { nom: 'La Cabane', zone: 55, batisseurs: 2, logement: 5, stock: 1500 },
    3: { nom: 'La Maison principale', zone: 65, batisseurs: 2, logement: 7, stock: 3500 },
    4: { nom: 'L’Hôtel de ville', zone: 75, batisseurs: 3, logement: 9, stock: 7000 }
  };
  var HDV_MAX = 3; // étape 1 : HDV 1 à 3
  var MONTEE_HDV = {
    2: { cout: { wood: 500, stone: 200, food: 200, gold: 100 }, duree: 5 * 60 },
    3: { cout: { wood: 1800, stone: 900, food: 800, gold: 400 }, duree: 30 * 60 },
    4: { cout: { wood: 5000, stone: 3000, food: 2500, gold: 1500 }, duree: 2 * HEURE }
  };

  /* ---- les bâtiments ---------------------------------------------------- */
  // moteur = le modèle 3D de jeu.js ; hdv = HDV qui le débloque ; max = nombre par HDV (index 0 inutilisé)
  // niveaux[i] = coût et durée (secondes) pour passer au niveau i+1
  var BATS = {
    depot: {
      nom: 'Dépôt', moteur: 'depot', hdv: 1, max: [0, 1, 2, 2],
      desc: 'Garde le bois et la pierre.',
      stock: { wood: [800, 2000, 5000], stone: [800, 2000, 5000] },
      niveaux: [
        { cout: { wood: 120 }, duree: 20 },
        { cout: { wood: 400, stone: 100 }, duree: 4 * 60 },
        { cout: { wood: 1200, stone: 500 }, duree: 25 * 60 }
      ]
    },
    ferme: {
      nom: 'Ferme', moteur: 'farm', hdv: 1, max: [0, 1, 2, 3],
      desc: 'Des récolteurs y produisent des vivres sans jamais l’épuiser. Elle garde aussi les vivres.',
      stock: { food: [600, 1500, 4000] }, places: [2, 3, 4],
      niveaux: [
        { cout: { wood: 100 }, duree: 15 },
        { cout: { wood: 350 }, duree: 3 * 60 },
        { cout: { wood: 1000, stone: 300 }, duree: 20 * 60 }
      ]
    },
    maison: {
      nom: 'Maison', moteur: 'house', hdv: 1, max: [0, 2, 4, 6],
      desc: 'Loge des récolteurs en plus.',
      logement: [3, 5, 7],
      niveaux: [
        { cout: { wood: 80 }, duree: 10 },
        { cout: { wood: 300, stone: 60 }, duree: 2 * 60 },
        { cout: { wood: 900, stone: 300 }, duree: 15 * 60 }
      ]
    },
    caserne: {
      nom: 'Caserne', moteur: 'barracks', hdv: 1, max: [0, 1, 1, 1],
      desc: 'Forme les Costauds de la Buvette (formation à l’étape 2).',
      niveaux: [
        { cout: { wood: 150, food: 50 }, duree: 30 },
        { cout: { wood: 500, stone: 150 }, duree: 5 * 60 },
        { cout: { wood: 1500, stone: 600 }, duree: 30 * 60 }
      ]
    },
    tour: {
      nom: 'Tour de guet', moteur: 'tower', hdv: 1, max: [0, 1, 2, 2],
      desc: 'Tir simple, alerte la garnison (les combats arrivent à l’étape 2).',
      niveaux: [
        { cout: { wood: 120, stone: 60 }, duree: 30 },
        { cout: { wood: 400, stone: 250 }, duree: 5 * 60 },
        { cout: { wood: 1200, stone: 800 }, duree: 30 * 60 }
      ]
    },
    tir: {
      nom: 'Terrain de tir', moteur: 'range', hdv: 2, max: [0, 0, 1, 1],
      desc: 'Forme les Frondeurs (étape 2).',
      niveaux: [
        { cout: { wood: 400, stone: 100 }, duree: 3 * 60 },
        { cout: { wood: 1000, stone: 400 }, duree: 15 * 60 }
      ]
    },
    garde: {
      nom: 'Tour de garde', moteur: 'tower', hdv: 3, max: [0, 0, 0, 1],
      desc: 'Une tour plus solide (étape 2).',
      niveaux: [{ cout: { wood: 1000, stone: 1000 }, duree: 20 * 60 }]
    },
    ecurie: {
      nom: 'Écurie', moteur: 'ecurie', hdv: 3, max: [0, 0, 0, 1],
      desc: 'Forme les Cavaliers du Causse (étape 2).',
      niveaux: [{ cout: { wood: 1200, stone: 500, gold: 200 }, duree: 20 * 60 }]
    },
    atelier: {
      nom: 'Atelier des bricoleurs', moteur: 'workshop', hdv: 3, max: [0, 0, 0, 1],
      desc: 'Construit les Béliers (étape 2).',
      niveaux: [{ cout: { wood: 1500, stone: 800, gold: 300 }, duree: 25 * 60 }]
    },
    buvette: {
      nom: 'Buvette', moteur: 'tavern', hdv: 3, max: [0, 0, 0, 1],
      desc: 'Prépare les coups de la Filserie : la Tournée (étape 2).',
      niveaux: [{ cout: { wood: 1000, stone: 400, food: 500, gold: 400 }, duree: 30 * 60 }]
    }
  };
  var ORDRE_BATS = ['depot', 'ferme', 'maison', 'caserne', 'tour', 'tir', 'garde', 'ecurie', 'atelier', 'buvette'];

  /* ---- les récolteurs --------------------------------------------------- */
  var RECOLTE = { wood: 300, food: 300, stone: 200, gold: 120 }; // par récolteur et par heure
  var RECOLTE_FERME = 360;
  var REPOUSSE = 40;            // bois et vivres sauvages : ce qui repousse par heure
  var PLACES_NOEUD = 2, PLACES_GROS = 3;
  var RECRUE = { cout: { food: 50 }, duree: 20, file: 5 };
  var DEPART = { res: { food: 300, wood: 300, stone: 150, gold: 100 }, recolteurs: 2, capsules: 500 };
  var BATISSEURS_MAX = 5, PRIX_BATISSEUR = [250, 500, 1000];

  var reglages = { instant: false };

  /* ---- outils ----------------------------------------------------------- */
  function copie(o) { var r = {}, k; for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function dureeMs(sec) { return reglages.instant ? 0 : Math.round(sec * 1000); }
  function batParId(e, id) { for (var i = 0; i < e.bats.length; i++) if (e.bats[i].id === id) return e.bats[i]; return null; }
  function tente(e) { for (var i = 0; i < e.bats.length; i++) if (e.bats[i].type === 'tente') return e.bats[i]; return null; }
  function compte(e, type) { var n = 0; for (var i = 0; i < e.bats.length; i++) if (e.bats[i].type === type) n++; return n; }
  function nouvelId(e, p) { e.suivant = (e.suivant || 1) + 1; return p + e.suivant; }
  function noter(e, t, txt) { e.journal = e.journal || []; e.journal.push({ t: t, txt: txt }); if (e.journal.length > 30) e.journal.splice(0, e.journal.length - 30); }

  function nomBat(b) { return b.type === 'tente' ? HDV[b.niveau || 1].nom : (BATS[b.type] ? BATS[b.type].nom : b.type); }

  function coutTexte(c) {
    var p = [];
    for (var i = 0; i < RES.length; i++) if (c[RES[i]]) p.push(c[RES[i]] + ' ' + NOMS_RES[RES[i]].toLowerCase());
    return p.join(', ');
  }
  function peutPayer(e, c) { for (var k in c) if ((e.res[k] || 0) + 1e-6 < c[k]) return false; return true; }
  function manque(e, c) {
    var p = [];
    for (var i = 0; i < RES.length; i++) { var k = RES[i]; if (c[k] && (e.res[k] || 0) + 1e-6 < c[k]) p.push(Math.ceil(c[k] - e.res[k]) + ' ' + NOMS_RES[k].toLowerCase()); }
    return 'Il manque ' + p.join(', ') + '.';
  }
  function payer(e, c) { for (var k in c) e.res[k] = Math.max(0, (e.res[k] || 0) - c[k]); }
  function rembourser(e, c) { var cap = capacites(e); for (var k in c) e.res[k] = Math.min(cap[k], (e.res[k] || 0) + c[k]); }

  /* ---- ce qu'on calcule à partir de l'état -------------------------------- */
  function capacites(e) {
    var base = HDV[e.hdv || 1].stock, cap = { food: base, wood: base, stone: base, gold: base };
    for (var i = 0; i < e.bats.length; i++) {
      var b = e.bats[i], d = BATS[b.type];
      if (!d || !d.stock || !b.niveau) continue;
      for (var k in d.stock) cap[k] += d.stock[k][b.niveau - 1] || 0;
    }
    return cap;
  }
  function logement(e) {
    var n = HDV[e.hdv || 1].logement;
    for (var i = 0; i < e.bats.length; i++) { var b = e.bats[i]; if (b.type === 'maison' && b.niveau) n += BATS.maison.logement[b.niveau - 1]; }
    return n;
  }
  function batisseurs(e) { return Math.min(BATISSEURS_MAX, HDV[e.hdv || 1].batisseurs + (e.achetes || 0)); }
  function chantiers(e) { var n = 0; for (var i = 0; i < e.bats.length; i++) if (e.bats[i].chantier) n++; return n; }
  function batisseursLibres(e) { return Math.max(0, batisseurs(e) - chantiers(e)); }
  function zone(e) { return HDV[e.hdv || 1].zone; }
  function niveauMax(type, hdv) {
    var d = BATS[type]; if (!d) return 0;
    return Math.max(0, Math.min(d.niveaux.length, hdv - d.hdv + 1));
  }
  function maxBat(type, hdv) { var d = BATS[type]; return d ? (d.max[Math.min(hdv, d.max.length - 1)] || 0) : 0; }
  function prixCapsules(restantSec) { return restantSec <= 0 ? 0 : Math.max(1, Math.ceil(Math.pow(restantSec / 60, 0.8))); }
  function prixBatisseur(e) { return PRIX_BATISSEUR[e.achetes || 0] || null; }

  // la « source » d'un récolteur : un nœud de la carte ou une ferme
  function source(e, cible) {
    if (!cible) return null;
    var b = batParId(e, cible);
    if (b) return b.type === 'ferme' && b.niveau >= 1 && !b.chantier ? { type: 'food', taux: RECOLTE_FERME, places: BATS.ferme.places[b.niveau - 1], ferme: true } : null;
    var n = e.noeuds && e.noeuds[cible];
    if (!n) return null;
    return { type: n.type, taux: RECOLTE[n.type] || 0, places: n.gros ? PLACES_GROS : PLACES_NOEUD, renouvelable: n.type === 'wood' || n.type === 'food', noeud: n };
  }
  function places(e, cible) { var s = source(e, cible); return s ? s.places : 0; }
  function affectes(e, cible) { var n = 0; for (var i = 0; i < e.recolteurs.length; i++) if (e.recolteurs[i].cible === cible) n++; return n; }
  function libres(e) { var n = 0; for (var i = 0; i < e.recolteurs.length; i++) if (!e.recolteurs[i].cible) n++; return n; }

  // production horaire actuelle (pour l'affichage)
  function debits(e) {
    var d = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (var i = 0; i < e.recolteurs.length; i++) {
      var s = source(e, e.recolteurs[i].cible);
      if (!s) continue;
      if (s.renouvelable && s.noeud.stock <= 0) { d[s.type] += REPOUSSE / Math.max(1, affectes(e, e.recolteurs[i].cible)); continue; }
      d[s.type] += s.taux;
    }
    return d;
  }

  /* ---- le temps qui passe ------------------------------------------------ */
  function produire(e, dt, bilan) {
    if (dt <= 0) return;
    var parCible = {}, i, k;
    for (i = 0; i < e.recolteurs.length; i++) { var c = e.recolteurs[i].cible; if (c) parCible[c] = (parCible[c] || 0) + 1; }
    var pot = { food: 0, wood: 0, stone: 0, gold: 0 }, demandes = [];
    for (k in parCible) {
      var s = source(e, k);
      if (!s) continue;
      var q = parCible[k] * s.taux * dt / HEURE;
      if (s.renouvelable) q = Math.min(q, Math.max(0, s.noeud.stock) + REPOUSSE * dt / HEURE);
      pot[s.type] += q;
      demandes.push({ s: s, q: q });
    }
    var cap = capacites(e), part = {};
    for (i = 0; i < RES.length; i++) {
      k = RES[i];
      var place = Math.max(0, cap[k] - (e.res[k] || 0)), pris = Math.min(pot[k], place);
      part[k] = pot[k] > 0 ? pris / pot[k] : 0;
      if (pris > 0) { e.res[k] = (e.res[k] || 0) + pris; bilan.res[k] = (bilan.res[k] || 0) + pris; }
    }
    for (i = 0; i < demandes.length; i++) if (demandes[i].s.renouvelable) demandes[i].s.noeud.stock -= demandes[i].q * part[demandes[i].s.type];
    // tout ce qui est sauvage repousse lentement, récolté ou non
    for (k in e.noeuds) {
      var n = e.noeuds[k];
      if (n.type === 'wood' || n.type === 'food') n.stock = Math.max(0, Math.min(n.max, n.stock + REPOUSSE * dt / HEURE));
    }
  }

  function prochainEvenement(e, apres) {
    var t = Infinity, i;
    for (i = 0; i < e.bats.length; i++) { var ch = e.bats[i].chantier; if (ch && ch.fin > apres && ch.fin < t) t = ch.fin; }
    if (e.formation.length && e.formation[0].fin > apres && e.formation[0].fin < t) t = e.formation[0].fin;
    return t;
  }

  function finirEvenements(e, t, bilan) {
    var i, b;
    for (i = 0; i < e.bats.length; i++) {
      b = e.bats[i];
      if (!b.chantier || b.chantier.fin > t) continue;
      var vers = b.chantier.vers, quand = b.chantier.fin;
      b.niveau = vers; b.chantier = null;
      var txt;
      if (b.type === 'tente') { e.hdv = vers; txt = 'Ton HDV passe au niveau ' + vers + ' : ' + HDV[vers].nom + '. La zone du village s’agrandit.'; }
      else txt = vers === 1 ? nomBat(b) + ' terminé.' : nomBat(b) + ' passe au niveau ' + vers + '.';
      bilan.fini.push(txt); noter(e, quand, txt);
    }
    while (e.formation.length && e.formation[0].fin <= t) {
      var f = e.formation.shift();
      e.recolteurs.push({ id: nouvelId(e, 'r'), cible: null });
      bilan.recrues++;
      if (e.formation.length) e.formation[0].fin = f.fin + dureeMs(RECRUE.duree);
    }
  }

  // Avance le village jusqu'à l'instant t (ms). Rend le bilan de ce qui s'est passé.
  function avancer(e, t) {
    var bilan = { res: {}, fini: [], recrues: 0, ms: 0 };
    if (!e || !isFinite(t)) return bilan;
    if (!e.maj || t <= e.maj) { if (!e.maj) e.maj = t; finirEvenements(e, Math.max(t, e.maj), bilan); return bilan; }
    var cur = e.maj;
    bilan.ms = t - cur;
    finirEvenements(e, cur, bilan);
    var garde = 0;
    while (cur < t && garde++ < 200000) {
      var fin = Math.min(t, prochainEvenement(e, cur), cur + 30000);
      produire(e, (fin - cur) / 1000, bilan);
      cur = fin;
      finirEvenements(e, cur, bilan);
    }
    e.maj = t;
    return bilan;
  }

  /* ---- l'état de départ ------------------------------------------------- */
  function nouvelEtat(t) {
    var e = {
      v: 1, cree: t, maj: t, hdv: 1, res: copie(DEPART.res), capsules: DEPART.capsules, achetes: 0,
      bats: [], recolteurs: [], formation: [], noeuds: {}, journal: [], suivant: 1
    };
    for (var i = 0; i < DEPART.recolteurs; i++) e.recolteurs.push({ id: nouvelId(e, 'r'), cible: null });
    return e;
  }
  function valide(e) {
    return !!(e && e.v === 1 && e.res && Array.isArray(e.bats) && Array.isArray(e.recolteurs) && Array.isArray(e.formation) && e.noeuds && HDV[e.hdv]);
  }

  /* ---- les actions du joueur ------------------------------------------- */
  function non(r) { return { ok: false, raison: r }; }

  function poserTente(e, x, z, t) {
    avancer(e, t);
    if (tente(e)) return non('Ta tente est déjà posée : elle ne bouge plus.');
    e.bats.push({ id: nouvelId(e, 'c'), type: 'tente', x: x, z: z, niveau: 1, chantier: null, cree: t });
    e.hdv = 1;
    noter(e, t, 'Tu as posé ta tente.');
    return { ok: true };
  }

  function peutConstruire(e, type) {
    var d = BATS[type];
    if (!d) return non('Bâtiment inconnu.');
    if (!tente(e)) return non('Pose d’abord ta tente.');
    if (e.hdv < d.hdv) return non('Se débloque avec ' + HDV[d.hdv].nom.toLowerCase() + ' (HDV ' + d.hdv + ').');
    var max = maxBat(type, e.hdv), n = compte(e, type);
    if (n >= max) return non('Tu as déjà ' + n + ' ' + d.nom.toLowerCase() + (n > 1 ? 's' : '') + ' : c’est le maximum pour ton HDV.');
    if (!batisseursLibres(e)) return non('Tes bâtisseurs sont tous sur un chantier. Attends, accélère avec des capsules ou achète un bâtisseur.');
    if (!peutPayer(e, d.niveaux[0].cout)) return non(manque(e, d.niveaux[0].cout));
    return { ok: true };
  }

  function construire(e, type, x, z, t) {
    avancer(e, t);
    var p = peutConstruire(e, type);
    if (!p.ok) return p;
    var d = BATS[type];
    payer(e, d.niveaux[0].cout);
    var b = { id: nouvelId(e, 'c'), type: type, x: x, z: z, niveau: 0, chantier: { debut: t, fin: t + dureeMs(d.niveaux[0].duree), vers: 1 }, cree: t };
    e.bats.push(b);
    avancer(e, t);
    return { ok: true, id: b.id };
  }

  // ce que coûte la prochaine amélioration d'un bâtiment (ou de l'HDV)
  function prochainNiveau(e, b) {
    if (b.type === 'tente') {
      var v = (e.hdv || 1) + 1, m = MONTEE_HDV[v];
      if (!m) return null;
      return { vers: v, cout: m.cout, duree: m.duree, bloque: v > HDV_MAX ? 'L’HDV ' + v + ' (' + HDV[v].nom + ') arrive à l’étape 5 du mode Clash.' : null };
    }
    var d = BATS[b.type];
    if (!d || b.niveau >= d.niveaux.length) return null;
    var n = d.niveaux[b.niveau], cap = niveauMax(b.type, e.hdv);
    return { vers: b.niveau + 1, cout: n.cout, duree: n.duree, bloque: b.niveau >= cap ? 'Monte ton HDV pour améliorer ce bâtiment.' : null };
  }

  function ameliorer(e, id, t) {
    avancer(e, t);
    var b = batParId(e, id);
    if (!b) return non('Bâtiment introuvable.');
    if (b.chantier) return non('Un chantier est déjà en cours ici.');
    var p = prochainNiveau(e, b);
    if (!p) return non('Niveau maximum atteint.');
    if (p.bloque) return non(p.bloque);
    if (!batisseursLibres(e)) return non('Tes bâtisseurs sont tous sur un chantier.');
    if (!peutPayer(e, p.cout)) return non(manque(e, p.cout));
    payer(e, p.cout);
    b.chantier = { debut: t, fin: t + dureeMs(p.duree), vers: p.vers };
    avancer(e, t);
    return { ok: true };
  }

  function restant(e, b, t) { return b && b.chantier ? Math.max(0, (b.chantier.fin - t) / 1000) : 0; }

  function accelerer(e, id, t) {
    avancer(e, t);
    var b = batParId(e, id);
    if (!b || !b.chantier) return non('Aucun chantier à finir ici.');
    var prix = prixCapsules(restant(e, b, t));
    if (e.capsules < prix) return non('Il te faut ' + prix + ' capsules, tu en as ' + e.capsules + '.');
    e.capsules -= prix; b.chantier.fin = t;
    var bilan = avancer(e, t);
    return { ok: true, prix: prix, bilan: bilan };
  }

  function recruter(e, t) {
    avancer(e, t);
    if (!tente(e)) return non('Pose d’abord ta tente.');
    if (e.formation.length >= RECRUE.file) return non('La file de recrutement est pleine (' + RECRUE.file + ').');
    var log = logement(e);
    if (e.recolteurs.length + e.formation.length >= log) return non('Plus de place : ' + log + ' logements. Construis ou améliore une maison.');
    if (!peutPayer(e, RECRUE.cout)) return non(manque(e, RECRUE.cout));
    payer(e, RECRUE.cout);
    e.formation.push({ fin: e.formation.length ? null : t + dureeMs(RECRUE.duree) });
    avancer(e, t);
    return { ok: true };
  }

  function accelererFormation(e, t) {
    avancer(e, t);
    if (!e.formation.length) return non('Personne en formation.');
    var sec = Math.max(0, (e.formation[0].fin - t) / 1000) + (e.formation.length - 1) * (reglages.instant ? 0 : RECRUE.duree);
    var prix = prixCapsules(sec);
    if (e.capsules < prix) return non('Il te faut ' + prix + ' capsules, tu en as ' + e.capsules + '.');
    e.capsules -= prix;
    var n = e.formation.length;
    e.formation = [];
    for (var i = 0; i < n; i++) e.recolteurs.push({ id: nouvelId(e, 'r'), cible: null });
    return { ok: true, prix: prix, n: n };
  }

  // noeud = { id, type, source, max, x, z } fourni par la carte quand la cible est un nœud
  function affecter(e, cible, noeud, t) {
    avancer(e, t);
    if (noeud) {
      if (!RECOLTE[noeud.type]) return non('Rien à récolter ici.');
      if (!e.noeuds[cible]) e.noeuds[cible] = { type: noeud.type, source: noeud.source, stock: Math.max(0, noeud.stock != null ? noeud.stock : noeud.max), max: noeud.max, x: noeud.x, z: noeud.z, gros: /^big/.test(noeud.source || '') };
    }
    var s = source(e, cible);
    if (!s) { var b = batParId(e, cible); return non(b && b.chantier ? 'La ferme est en chantier : elle reprend à la fin des travaux.' : 'Rien à récolter ici.'); }
    if (affectes(e, cible) >= s.places) return non('Complet : ' + s.places + ' récolteurs au plus ici.');
    for (var i = 0; i < e.recolteurs.length; i++) {
      if (!e.recolteurs[i].cible) { e.recolteurs[i].cible = cible; return { ok: true }; }
    }
    return non(e.formation.length ? 'Aucun récolteur libre : le prochain sort de la tente bientôt.' : 'Aucun récolteur libre. Recrutes-en un à la tente.');
  }

  function retirer(e, cible, t) {
    avancer(e, t);
    for (var i = e.recolteurs.length - 1; i >= 0; i--) {
      if (e.recolteurs[i].cible === cible) { e.recolteurs[i].cible = null; return { ok: true }; }
    }
    return non('Personne ne travaille ici.');
  }

  function acheterBatisseur(e, t) {
    avancer(e, t);
    var prix = prixBatisseur(e);
    if (!prix || batisseurs(e) >= BATISSEURS_MAX) return non('Tu as déjà le maximum de bâtisseurs.');
    if (e.capsules < prix) return non('Un bâtisseur coûte ' + prix + ' capsules, tu en as ' + e.capsules + '.');
    e.capsules -= prix; e.achetes = (e.achetes || 0) + 1;
    noter(e, t, 'Un bâtisseur de plus rejoint le village.');
    return { ok: true, prix: prix };
  }

  var Clash = {
    RES: RES, NOMS_RES: NOMS_RES, HDV: HDV, HDV_MAX: HDV_MAX, MONTEE_HDV: MONTEE_HDV, BATS: BATS, ORDRE_BATS: ORDRE_BATS,
    RECOLTE: RECOLTE, RECOLTE_FERME: RECOLTE_FERME, REPOUSSE: REPOUSSE, RECRUE: RECRUE, DEPART: DEPART,
    reglages: reglages,
    nouvelEtat: nouvelEtat, valide: valide, avancer: avancer,
    capacites: capacites, logement: logement, batisseurs: batisseurs, batisseursLibres: batisseursLibres, chantiers: chantiers,
    zone: zone, niveauMax: niveauMax, maxBat: maxBat, compte: compte, tente: tente, batParId: batParId, nomBat: nomBat,
    prixCapsules: prixCapsules, prixBatisseur: prixBatisseur, prochainNiveau: prochainNiveau, restant: restant,
    source: source, places: places, affectes: affectes, libres: libres, debits: debits,
    coutTexte: coutTexte, peutPayer: peutPayer, peutConstruire: peutConstruire,
    poserTente: poserTente, construire: construire, ameliorer: ameliorer, accelerer: accelerer,
    recruter: recruter, accelererFormation: accelererFormation, affecter: affecter, retirer: retirer, acheterBatisseur: acheterBatisseur
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Clash;
  else racine.FOW_CLASH = Clash;
})(this);
