/* FILS OF WAR - le mode Clash, l'écran (21/10/2026). Étape 1 : le village en local.
 *
 * Les règles sont dans clash.js. Ici : le bouton du menu, la vraie carte 3D de
 * jeu.js (même graine pour tout le monde), la tente qu'on pose, les chantiers,
 * les récolteurs, les capsules et la sauvegarde sur ce téléphone.
 *
 * On ne fait PAS tourner le moteur de jeu.js : il sert de décor. On lui crée une
 * partie à part (sans colon ni Barons), on y pose nos bâtiments et nos ouvriers,
 * et la vue 3D les dessine. Le temps du village, lui, est l'heure réelle.
 * La partie classique et sa sauvegarde ne sont jamais touchées.
 */
(function () {
  'use strict';
  var C = window.FOW_CLASH;
  if (!C) return;
  var P = new URLSearchParams(location.search);
  if (P.get('mode') === 'reseau') return;
  if (P.get('devmap') === '1') C.reglages.instant = true;

  var CLE = 'fow.clash.v1';
  var ICONES = { food: '🍖', wood: '🪵', stone: '🪨', gold: '🪙' };
  var ICONE_BAT = { tente: '⛺', depot: '📦', ferme: '🌾', maison: '🏠', caserne: '⚔️', tour: '🗼', tir: '🎯', garde: '🏰', ecurie: '🐎', atelier: '🔧', buvette: '🍺' };
  var NOM_SOURCE = { tree: 'Arbres', berry: 'Baies sauvages', vine: 'Vigne sauvage', stone: 'Filon de pierre', bigstone: 'Grand filon de pierre', gold: 'Filon d’or', biggold: 'Grand filon d’or', fish: 'Banc de poissons' };
  var REPERES = [['salagou', 'Salagou'], ['campagnan', 'Campagnan'], ['pezenas', 'Pézenas'], ['clermont', 'Clermont'], ['lodeve', 'Lodève'], ['montpellier', 'Montpellier'], ['sete', 'Sète']];

  var etat = null;       // l'état du village (clash.js)
  var actif = false;     // l'écran Clash est affiché
  var g = null;          // la partie-décor de jeu.js
  var vue = null, renduOrig = null;
  var lien = {};         // id clash -> bâtiment du moteur
  var ouvriers = {};     // clé -> unité du moteur
  var selection = null;  // { kind:'bat'|'noeud', id }
  var pose = null;       // { type, x, z, ok, raison }
  var zoneVue = null;    // pour ne recalculer le brouillard qu'au besoin
  var dernierT = 0, dernierSauve = 0, dernierHud = 0, focusAFaire = 0;
  var el = {};

  function $(id) { return document.getElementById(id); }
  function maintenant() { return Date.now(); }
  function F() { return window.__FOW__; }
  function M() { return window.FOW_MOTEUR ? window.FOW_MOTEUR() : null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bascule(n, cls, on) { if (!n) return; var c = ' ' + n.className + ' ', a = c.indexOf(' ' + cls + ' ') >= 0; if (on && !a) n.className = (n.className + ' ' + cls).trim(); if (!on && a) n.className = c.replace(' ' + cls + ' ', ' ').trim(); }
  function nombre(n) { n = Math.floor(n); return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.', ',') + ' k' : String(n); }
  function duree(sec) {
    sec = Math.max(0, Math.ceil(sec));
    if (sec < 60) return sec + ' s';
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + ' min' + (s && m < 10 ? ' ' + (s < 10 ? '0' : '') + s : '');
    var h = Math.floor(m / 60); m = m % 60;
    if (h < 24) return h + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m : '');
    return Math.floor(h / 24) + ' j ' + (h % 24) + ' h';
  }
  function coutHTML(c) {
    var p = [];
    for (var i = 0; i < C.RES.length; i++) {
      var k = C.RES[i]; if (!c[k]) continue;
      p.push('<span class="' + ((etat.res[k] || 0) + 1e-6 >= c[k] ? '' : 'cl-manque') + '">' + ICONES[k] + ' ' + nombre(c[k]) + '</span>');
    }
    return p.join(' ');
  }

  /* ---- la sauvegarde ------------------------------------------------------ */
  function lire() { try { var e = JSON.parse(localStorage.getItem(CLE) || 'null'); return C.valide(e) ? e : null; } catch (x) { return null; } }
  function sauver() { if (!etat) return; try { localStorage.setItem(CLE, JSON.stringify(etat)); dernierSauve = maintenant(); } catch (x) { } }

  /* ---- le style ------------------------------------------------------------- */
  function style() {
    if ($('clash-style')) return;
    var s = document.createElement('style'); s.id = 'clash-style';
    s.textContent = [
      '.cl-cache{display:none!important}',
      '#clash-entree{display:flex;align-items:center;gap:12px;width:100%;margin-top:10px;padding:11px 14px;border-radius:10px;border:1px solid rgba(242,207,123,.45);background:linear-gradient(135deg,rgba(120,70,40,.55),rgba(60,40,30,.55));color:#f6e6bd;text-align:left;cursor:pointer}',
      '#clash-entree:hover{border-color:#f2cf7b;transform:translateY(-1px)}',
      '#clash-entree b{display:block;font:700 13px var(--sans);letter-spacing:1.2px}#clash-entree small{display:block;font-size:11px;color:#d9c9a3;margin-top:2px;line-height:1.35}#clash-entree .cl-em{font-size:24px}',
      '#clash{position:fixed;inset:0;pointer-events:none;z-index:40;font-family:var(--sans);color:#f1e6c9}',
      '#clash button{pointer-events:auto;font:inherit;color:inherit;cursor:pointer}',
      '.cl-haut{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;gap:8px;padding:8px max(10px,env(safe-area-inset-right)) 8px max(10px,env(safe-area-inset-left));background:linear-gradient(180deg,rgba(12,17,16,.92),rgba(12,17,16,.55) 75%,transparent);flex-wrap:wrap;pointer-events:auto}',
      '.cl-btn{background:rgba(30,40,36,.92);border:1px solid rgba(214,188,120,.35);border-radius:8px;padding:7px 11px;font-size:12px}',
      '.cl-btn:hover{border-color:#e8c97c}.cl-or{background:linear-gradient(135deg,#c9963c,#8a5f24);border-color:#f2cf7b;color:#fff8e4;font-weight:700}',
      '.cl-hdv{font:700 12px var(--sans);letter-spacing:.6px;color:#f2da9f;padding:6px 10px;border-radius:8px;background:rgba(80,55,25,.6);border:1px solid rgba(242,207,123,.4)}',
      '.cl-res{display:flex;gap:6px;flex-wrap:wrap;flex:1;min-width:0}',
      '.cl-chip{display:flex;align-items:center;gap:5px;background:rgba(18,25,25,.85);border:1px solid rgba(214,188,120,.22);border-radius:999px;padding:4px 10px 4px 7px;font-size:12px;white-space:nowrap}',
      '.cl-chip b{font-weight:700;color:#fff3d2}.cl-chip small{color:#a9b39d;font-size:10px}.cl-chip.cl-plein b{color:#ffb36b}',
      '.cl-cap{display:inline-block;width:13px;height:13px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ffe9a8,#c9963c 60%,#7a5420);box-shadow:0 0 0 2px #e9c77a55}',
      '.cl-bas{position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:8px}',
      '.cl-bas .cl-btn{font-size:14px;padding:11px 16px;font-weight:600}',
      '.cl-panneau{position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 20px));max-height:min(62vh,520px);overflow:auto;background:linear-gradient(160deg,rgba(26,34,30,.97),rgba(14,20,19,.97));border:1px solid rgba(214,188,120,.35);border-radius:14px;padding:14px 16px;pointer-events:auto;box-shadow:0 18px 50px rgba(0,0,0,.5)}',
      '.cl-panneau h3{margin:0 30px 4px 0;font:600 20px var(--serif);color:#f2da9f}.cl-panneau p{margin:4px 0 8px;font-size:12px;line-height:1.5;color:#d4cbb3}',
      '.cl-fermer{position:absolute;top:8px;right:10px;background:none;border:0;font-size:22px;color:#cdbf9c}',
      '.cl-sous{font-size:11px;color:#a9b39d;letter-spacing:.4px;text-transform:uppercase}',
      '.cl-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.cl-actions .cl-btn{font-size:13px;padding:9px 12px}',
      '.cl-ligne{display:flex;justify-content:space-between;gap:10px;font-size:12px;padding:5px 0;border-top:1px solid rgba(214,188,120,.14)}',
      '.cl-manque{color:#ff9c7a}',
      '.cl-barre{height:6px;border-radius:3px;background:rgba(255,255,255,.12);overflow:hidden;margin:6px 0}.cl-barre i{display:block;height:100%;background:linear-gradient(90deg,#e8b75a,#f6dc95)}',
      '.cl-cartes{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:8px}',
      '.cl-carte{text-align:left;background:rgba(30,40,36,.9);border:1px solid rgba(214,188,120,.25);border-radius:10px;padding:9px 10px;font-size:12px}',
      '.cl-carte b{display:block;font-size:13px;margin-bottom:3px}.cl-carte small{display:block;color:#b4bca6;margin-top:3px}.cl-carte.cl-bloque{opacity:.55}',
      '.cl-pose{position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(560px,calc(100vw - 20px));background:rgba(16,22,21,.95);border:1px solid rgba(214,188,120,.4);border-radius:12px;padding:10px 12px;pointer-events:auto}',
      '.cl-pose p{margin:0 0 8px;font-size:13px;line-height:1.45}.cl-pose .cl-ko{color:#ffb08f}.cl-pose .cl-okv{color:#bfe3b0}',
      '.cl-reperes{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0 8px}.cl-reperes button{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(40,52,46,.9);border:1px solid rgba(214,188,120,.25)}',
      '.cl-etiq{position:absolute;transform:translate(-50%,-100%);background:rgba(14,20,19,.88);border:1px solid rgba(242,207,123,.45);border-radius:7px;padding:3px 7px;font-size:11px;white-space:nowrap;pointer-events:none;text-align:center}',
      '.cl-etiq .cl-barre{height:4px;margin:3px 0 0;min-width:60px}.cl-etiq.cl-pt{border-color:rgba(160,210,150,.5);padding:2px 6px;font-size:10px}',
      '#clash-toast{position:absolute;top:64px;left:50%;transform:translateX(-50%);background:rgba(20,28,26,.95);border:1px solid rgba(242,207,123,.5);border-radius:9px;padding:9px 14px;font-size:13px;max-width:min(520px,92vw);text-align:center;pointer-events:none;box-shadow:0 8px 24px #0006}',
      '#clash-toast.cl-err{border-color:#d9775b}',
      '.cl-modal{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(6,9,9,.55);pointer-events:auto;padding:16px}',
      '.cl-modal>div{width:min(520px,100%);max-height:90vh;overflow:auto;background:linear-gradient(160deg,#1c2d25,#111e1a);border:1px solid rgba(214,188,120,.4);border-radius:14px;padding:20px 22px;box-shadow:0 24px 70px #0008}',
      '.cl-modal h2{margin:4px 0 10px;font:600 26px var(--serif);color:#f2da9f}.cl-modal p,.cl-modal li{font-size:13px;line-height:1.6;color:#d6cdb4}.cl-modal ul{padding-left:18px;margin:8px 0 14px}',
      '@media(max-width:700px),(max-height:500px){.cl-chip{font-size:11px;padding:3px 8px 3px 6px}.cl-chip small{display:none}.cl-hdv{font-size:11px;padding:5px 8px}.cl-panneau{max-height:56vh;padding:12px}.cl-panneau h3{font-size:17px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---- le bouton du menu --------------------------------------------------- */
  function boutonMenu() {
    if ($('clash-entree')) return;
    var start = $('start'); if (!start || !start.parentNode) return;
    var b = document.createElement('button'); b.id = 'clash-entree'; b.type = 'button';
    b.innerHTML = '<span class="cl-em">⛺</span><span><b>MODE CLASH · BÊTA</b><small>Ton village sur la carte de l’Hérault, en temps réel. Il travaille même quand tu n’es pas là.</small></span>';
    var apres = start.nextSibling; start.parentNode.insertBefore(b, apres);
    b.addEventListener('click', entrer);
  }

  /* ---- l'interface ---------------------------------------------------------- */
  function construireDOM() {
    if ($('clash')) return;
    var d = document.createElement('div'); d.id = 'clash'; d.className = 'cl-cache';
    d.innerHTML =
      '<div id="clash-etiquettes"></div>' +
      '<div class="cl-haut"><button class="cl-btn" id="clash-quitter">← Menu</button><span class="cl-hdv" id="clash-hdv"></span><div class="cl-res" id="clash-res"></div></div>' +
      '<div class="cl-bas" id="clash-bas"><button class="cl-btn cl-or" id="clash-construire">🏗️ Construire</button><button class="cl-btn" id="clash-recolte">👷 Récolteurs</button><button class="cl-btn" id="clash-village">⛺ Ma tente</button></div>' +
      '<div class="cl-panneau cl-cache" id="clash-panneau"><button class="cl-fermer" id="clash-fermer" aria-label="Fermer">×</button><div id="clash-contenu"></div></div>' +
      '<div class="cl-pose cl-cache" id="clash-pose"></div>' +
      '<div class="cl-modal cl-cache" id="clash-modal"><div id="clash-modal-contenu"></div></div>' +
      '<div id="clash-toast" class="cl-cache"></div>';
    document.body.appendChild(d);
    el.racine = d; el.res = $('clash-res'); el.hdv = $('clash-hdv'); el.bas = $('clash-bas');
    el.panneau = $('clash-panneau'); el.contenu = $('clash-contenu'); el.pose = $('clash-pose');
    el.modal = $('clash-modal'); el.modalC = $('clash-modal-contenu'); el.toast = $('clash-toast'); el.etiq = $('clash-etiquettes');
    $('clash-quitter').onclick = quitter;
    $('clash-fermer').onclick = function () { fermerPanneau(); };
    $('clash-construire').onclick = function () { if (!C.tente(etat)) return choisirTerrain(); ouvrir({ kind: 'catalogue' }); };
    $('clash-recolte').onclick = function () { if (!C.tente(etat)) return choisirTerrain(); ouvrir({ kind: 'recolte' }); };
    $('clash-village').onclick = function () { var t = C.tente(etat); if (!t) return choisirTerrain(); vue.focus(t.x, t.z); ouvrir({ kind: 'bat', id: t.id }); };
    el.contenu.addEventListener('click', clicPanneau);
    el.pose.addEventListener('click', clicPose);
    el.modalC.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (b && b.getAttribute('data-a') === 'modal-ok') fermerModal(); if (b && b.getAttribute('data-a') === 'choisir') { fermerModal(); choisirTerrain(); } });
  }

  var toastTimer = null;
  function toast(txt, err) {
    el.toast.textContent = txt; el.toast.className = err ? 'cl-err' : '';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.toast.className = 'cl-cache'; }, err ? 4200 : 3000);
  }
  function modal(html) { el.modalC.innerHTML = html; bascule(el.modal, 'cl-cache', false); }
  function fermerModal() { bascule(el.modal, 'cl-cache', true); }

  /* ---- la partie-décor de jeu.js -------------------------------------------- */
  function preparerDecor() {
    var f = F(); if (!f || !f.game || !f.view || !M()) return false;
    vue = f.view;
    if (!g) {
      var G = f.game.constructor;
      // même graine que la partie classique : la même carte de l'Hérault pour tous les Sales Fils
      g = new G({ difficulty: 'discovery', seed: f.game.seed, startRegion: 18 });
      g.noAI = true; g.paused = true; g.__clash = true;
      g.units.slice().forEach(function (u) { g._entities.delete(u.id); });
      g.units.length = 0;
      g.animals = []; g.herds = []; g.villages = [];
      g.players[0].homeLevel = 3; g.players[0].age = 1;
      lien = {}; ouvriers = {}; zoneVue = null;
    }
    if (!renduOrig) {
      renduOrig = vue.render;
      vue.render = function (dt, sel, pl) {
        if (actif && this.game === g) return renduOrig.call(this, dt, selectionMoteur(), placementMoteur());
        return renduOrig.call(this, dt, sel, pl);
      };
    }
    return true;
  }
  function selectionMoteur() {
    if (!selection) return [];
    if (selection.kind === 'bat' && lien[selection.id]) return [lien[selection.id].id];
    if (selection.kind === 'noeud') return [selection.id];
    return [];
  }
  function placementMoteur() {
    if (!pose || !isFinite(pose.x)) return null;
    return { type: pose.type === 'tente' ? 'townhall' : C.BATS[pose.type].moteur, x: pose.x, z: pose.z, valid: !!pose.ok };
  }
  function rayonMoteur(type) {
    var m = M(), t = type === 'tente' ? 'townhall' : (C.BATS[type] && C.BATS[type].moteur);
    return (m && m.BUILDINGS[t] && m.BUILDINGS[t].radius) || 3;
  }

  // le brouillard : la zone du village dévoilée, le reste de la carte reste connu mais sombre
  function brouillard(cx, cz, r) {
    var cle = cx + ':' + cz + ':' + r;
    if (zoneVue === cle) return;
    zoneVue = cle;
    var fog = g.fog[0]; fog.fill(1);
    if (isFinite(cx) && r > 0) {
      var x0 = Math.max(0, Math.floor((cx - r) / 2)), x1 = Math.min(383, Math.floor((cx + r) / 2));
      var z0 = Math.max(0, Math.floor((cz - r) / 2)), z1 = Math.min(383, Math.floor((cz + r) / 2));
      for (var iz = z0; iz <= z1; iz++) for (var ix = x0; ix <= x1; ix++) {
        var dx = ix * 2 + 1 - cx, dz = iz * 2 + 1 - cz;
        if (dx * dx + dz * dz <= r * r) fog[iz * 384 + ix] = 2;
      }
    }
    g.fogRevision++;
  }
  function majBrouillard() {
    var t = C.tente(etat);
    if (t) brouillard(t.x, t.z, C.zone(etat));
    else if (pose && pose.type === 'tente' && isFinite(pose.x)) brouillard(Math.round(pose.x), Math.round(pose.z), C.HDV[1].zone);
    else brouillard(NaN, NaN, 0);
  }

  function dansZone(x, z, r) {
    var t = C.tente(etat); if (!t) return false;
    return Math.hypot(x - t.x, z - t.z) + (r || 0) <= C.zone(etat);
  }

  // peut-on poser ce bâtiment ici ? (même relief, eau et pente que la partie classique)
  function verifierPose(type, x, z) {
    var m = M(), r = rayonMoteur(type), i;
    if (!isFinite(x) || !isFinite(z)) return { ok: false, raison: 'Touche la carte pour choisir l’emplacement.' };
    if (x - r < 2 || z - r < 2 || x + r > 766 || z + r > 766) return { ok: false, raison: 'Trop près du bord de la carte.' };
    if (type !== 'tente' && !dansZone(x, z, r)) return { ok: false, raison: 'Hors de la zone du village. Monte ton HDV pour l’agrandir.' };
    var carte = window.FOW_CARTE;
    if (carte && carte.penteBat && carte.penteBat(x, z, r) > 3.2) return { ok: false, raison: 'Terrain trop pentu : cherche un replat.' };
    if (m.terrainAt(x, z) !== 'land') return { ok: false, raison: 'Impossible de bâtir sur l’eau ou sur un pont.' };
    for (i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      if (m.terrainAt(x + Math.cos(a) * (r + .4), z + Math.sin(a) * (r + .4)) !== 'land') return { ok: false, raison: 'Trop près de l’eau.' };
    }
    for (i = 0; i < etat.bats.length; i++) {
      var b = etat.bats[i];
      if (Math.hypot(x - b.x, z - b.z) < r + rayonMoteur(b.type) + .7) return { ok: false, raison: 'Un bâtiment occupe déjà cet emplacement.' };
    }
    for (i = 0; i < g.nodes.length; i++) {
      var n = g.nodes[i];
      if (Math.hypot(x - n.x, z - n.z) < r + n.radius + .45) return { ok: false, raison: 'Une ressource occupe cet emplacement.' };
    }
    for (i = 0; i < (g.sites || []).length; i++) {
      var s = g.sites[i];
      if (Math.hypot(x - s.x, z - s.z) < r + 6) return { ok: false, raison: 'Un lieu remarquable occupe cet emplacement.' };
    }
    return { ok: true };
  }

  // ce qu'on trouve dans une zone (pour bien choisir où poser sa tente)
  function inventaire(cx, cz, r) {
    var c = { food: 0, wood: 0, stone: 0, gold: 0 };
    for (var i = 0; i < g.nodes.length; i++) {
      var n = g.nodes[i];
      if (n.source === 'fish' || n.source === 'carcass' || !C.RECOLTE[n.type]) continue;
      if (Math.hypot(n.x - cx, n.z - cz) <= r) c[n.type]++;
    }
    return c;
  }

  /* ---- synchroniser la 3D avec le village ------------------------------------- */
  function niveauVisuel(hdv) { return hdv >= 4 ? 3 : hdv >= 2 ? 2 : 1; }

  function placerOuvrier(cle, x, z, angle, action) {
    var u = ouvriers[cle];
    if (!u) { u = g._addUnit(0, 'worker', x, z); ouvriers[cle] = u; }
    u.x = x; u.z = z; u.angle = angle; u.action = action; u.hp = u.maxHp; u.__vu = true;
  }

  function synchroniser() {
    var t = maintenant(), i;
    var vus = {};
    for (i = 0; i < etat.bats.length; i++) {
      var b = etat.bats[i], mt = b.type === 'tente' ? 'townhall' : C.BATS[b.type].moteur;
      var eb = lien[b.id];
      if (!eb) { eb = g._addBuilding(0, mt, b.x, b.z, true); lien[b.id] = eb; eb.__clash = b.id; }
      vus[eb.id] = true;
      eb.hp = eb.maxHp;
      if (b.niveau >= 1) { eb.complete = true; eb.progress = 1; }
      else { eb.complete = false; eb.progress = b.chantier ? Math.min(1, Math.max(.02, (t - b.chantier.debut) / Math.max(1, b.chantier.fin - b.chantier.debut))) : .02; }
      if (b.type === 'tente') eb.level = niveauVisuel(etat.hdv);
    }
    // personne ne détruit rien à l'étape 1, mais on reste propre
    for (i = g.buildings.length - 1; i >= 0; i--) if (!vus[g.buildings[i].id]) { g._entities.delete(g.buildings[i].id); g.buildings.splice(i, 1); }
    var te = C.tente(etat);
    g.players[0].settlementUpgrade = te && te.chantier ? { progress: .5, duration: 1 } : null;
    g.players[0].age = etat.hdv >= 3 ? 2 : 1;

    // les ressources de la carte suivent le stock du village
    for (var id in etat.noeuds) { var en = g.getEntity(id), cn = etat.noeuds[id]; if (en) en.amount = Math.max(0, Math.round(cn.stock)); }

    // les ouvriers : bâtisseurs sur les chantiers, récolteurs à leur poste, les autres devant la tente
    for (var k in ouvriers) ouvriers[k].__vu = false;
    if (te) {
      var nb = C.batisseurs(etat), occ = 0, j = 0, chs = etat.bats.filter(function (x) { return !!x.chantier; });
      for (i = 0; i < chs.length; i++) {
        var ch = chs[i], rr = rayonMoteur(ch.type) + 1, a = 0.7 + i * 1.3;
        var x = ch.x + Math.cos(a) * rr, z = ch.z + Math.sin(a) * rr;
        placerOuvrier('B' + i, x, z, Math.atan2(ch.x - x, ch.z - z), 'build'); occ++;
      }
      for (j = occ; j < nb; j++) {
        var aa = 2.4 + j * .55, rt = rayonMoteur('tente') + 1.3;
        var bx = te.x + Math.cos(aa) * rt, bz = te.z + Math.sin(aa) * rt;
        placerOuvrier('B' + j, bx, bz, Math.atan2(te.x - bx, te.z - bz), 'idle');
      }
      var parCible = {}, nLibre = 0;
      for (i = 0; i < etat.recolteurs.length; i++) {
        var r = etat.recolteurs[i], cible = r.cible, pos = null;
        if (cible) {
          var cb = C.batParId(etat, cible), cn2 = etat.noeuds[cible];
          var o = cb || cn2; if (!o) continue;
          var rang = parCible[cible] = (parCible[cible] || 0) + 1;
          var ray = cb ? rayonMoteur(cb.type) - .6 : ((g.getEntity(cible) || {}).radius || 1.8) + .7;
          var ang = Math.atan2(te.z - o.z, te.x - o.x) + (rang - 1.5) * .9;
          var px = o.x + Math.cos(ang) * ray, pz = o.z + Math.sin(ang) * ray;
          placerOuvrier('R' + r.id, px, pz, Math.atan2(o.x - px, o.z - pz), C.source(etat, cible) ? 'gather' : 'idle');
        } else {
          var al = -0.6 - nLibre * .45, rl = rayonMoteur('tente') + 2.4; nLibre++;
          var lx = te.x + Math.cos(al) * rl, lz = te.z + Math.sin(al) * rl;
          placerOuvrier('R' + r.id, lx, lz, Math.atan2(te.x - lx, te.z - lz), 'idle');
        }
      }
    }
    for (k in ouvriers) if (!ouvriers[k].__vu) { var u = ouvriers[k]; g._entities.delete(u.id); var p = g.units.indexOf(u); if (p >= 0) g.units.splice(p, 1); delete ouvriers[k]; }
    majBrouillard();
  }

  /* ---- les étiquettes au-dessus des chantiers ------------------------------------ */
  var etiquettes = {};
  function majEtiquettes() {
    var t = maintenant(), vus = {}, i, cle, n;
    function poser(cle, x, z, h, html, cls) {
      vus[cle] = true;
      n = etiquettes[cle];
      if (!n) { n = document.createElement('div'); n.className = 'cl-etiq ' + (cls || ''); el.etiq.appendChild(n); etiquettes[cle] = n; }
      if (n.__h !== html) { n.innerHTML = html; n.__h = html; }
      var p = vue.worldToScreen(x, z, h);
      n.style.left = Math.round(p.x) + 'px'; n.style.top = Math.round(p.y) + 'px';
    }
    for (i = 0; i < etat.bats.length; i++) {
      var b = etat.bats[i];
      if (!b.chantier) continue;
      var tot = Math.max(1, b.chantier.fin - b.chantier.debut), fait = Math.min(1, (t - b.chantier.debut) / tot);
      poser('b' + b.id, b.x, b.z, b.type === 'tente' ? 7 : 5.5, '🔨 ' + duree((b.chantier.fin - t) / 1000) + '<div class="cl-barre"><i style="width:' + Math.round(fait * 100) + '%"></i></div>');
    }
    var parCible = {};
    for (i = 0; i < etat.recolteurs.length; i++) { var c = etat.recolteurs[i].cible; if (c) parCible[c] = (parCible[c] || 0) + 1; }
    for (cle in parCible) {
      var o = C.batParId(etat, cle) || etat.noeuds[cle]; if (!o) continue;
      var s = C.source(etat, cle);
      poser('r' + cle, o.x, o.z, 3.2, '👷 ' + parCible[cle] + (s ? ' · ' + ICONES[s.type] : ' · en pause'), 'cl-pt');
    }
    if (etat.formation.length) {
      var te = C.tente(etat);
      if (te && etat.formation[0].fin) poser('formation', te.x + 4, te.z + 4, 4, '👷 +' + etat.formation.length + ' · ' + duree((etat.formation[0].fin - t) / 1000), 'cl-pt');
    }
    for (cle in etiquettes) if (!vus[cle]) { etiquettes[cle].parentNode.removeChild(etiquettes[cle]); delete etiquettes[cle]; }
  }
  function viderEtiquettes() { for (var k in etiquettes) etiquettes[k].parentNode.removeChild(etiquettes[k]); etiquettes = {}; }

  /* ---- le haut de l'écran --------------------------------------------------------- */
  function majHaut() {
    var cap = C.capacites(etat), deb = C.debits(etat), h = [], i;
    el.hdv.textContent = 'HDV ' + etat.hdv + ' · ' + C.HDV[etat.hdv].nom;
    for (i = 0; i < C.RES.length; i++) {
      var k = C.RES[i], plein = etat.res[k] >= cap[k] - .5;
      h.push('<span class="cl-chip' + (plein ? ' cl-plein' : '') + '" title="' + C.NOMS_RES[k] + ' : ' + Math.floor(etat.res[k]) + ' / ' + cap[k] + (plein ? ' (stock plein)' : '') + '">' + ICONES[k] + ' <b>' + nombre(etat.res[k]) + '</b><small>/' + nombre(cap[k]) + (deb[k] ? ' · +' + Math.round(deb[k]) + '/h' : '') + '</small></span>');
    }
    h.push('<span class="cl-chip" title="Capsules de test (bientôt achetées avec les Filsous du SFT2026)"><i class="cl-cap"></i> <b>' + etat.capsules + '</b><small>test</small></span>');
    h.push('<span class="cl-chip" title="Bâtisseurs libres / total">🔨 <b>' + C.batisseursLibres(etat) + '/' + C.batisseurs(etat) + '</b></span>');
    h.push('<span class="cl-chip" title="Récolteurs libres / total · logement">👷 <b>' + C.libres(etat) + '/' + etat.recolteurs.length + '</b><small>🏠 ' + (etat.recolteurs.length + etat.formation.length) + '/' + C.logement(etat) + '</small></span>');
    var html = h.join('');
    if (el.res.__h !== html) { el.res.innerHTML = html; el.res.__h = html; }
  }

  /* ---- les panneaux --------------------------------------------------------------- */
  function ouvrir(sel) { selection = sel; annulerPose(true); rendrePanneau(); bascule(el.panneau, 'cl-cache', false); bascule(el.bas, 'cl-cache', true); }
  function fermerPanneau() { selection = null; bascule(el.panneau, 'cl-cache', true); bascule(el.bas, 'cl-cache', !!pose || !actif); }

  function blocChantier(b) {
    var t = maintenant(), tot = Math.max(1, b.chantier.fin - b.chantier.debut), rest = (b.chantier.fin - t) / 1000;
    var prix = C.prixCapsules(rest);
    return '<div class="cl-ligne"><span>🔨 ' + (b.chantier.vers === 1 ? 'Construction' : 'Vers le niveau ' + b.chantier.vers) + '</span><b>' + duree(rest) + '</b></div>' +
      '<div class="cl-barre"><i style="width:' + Math.round(Math.min(1, (t - b.chantier.debut) / tot) * 100) + '%"></i></div>' +
      '<div class="cl-actions"><button class="cl-btn cl-or" data-a="finir" data-id="' + b.id + '"><i class="cl-cap"></i> Finir maintenant · ' + prix + ' capsule' + (prix > 1 ? 's' : '') + '</button></div>';
  }
  function blocAmelioration(b) {
    var p = C.prochainNiveau(etat, b);
    if (!p) return '<p class="cl-sous">Niveau maximum.</p>';
    if (p.bloque) return '<div class="cl-ligne"><span>Niveau ' + p.vers + '</span><span class="cl-manque">' + esc(p.bloque) + '</span></div>';
    return '<div class="cl-ligne"><span>Niveau ' + p.vers + ' · ' + duree(p.duree) + '</span><span>' + coutHTML(p.cout) + '</span></div>' +
      '<div class="cl-actions"><button class="cl-btn cl-or" data-a="ameliorer" data-id="' + b.id + '">⬆️ Améliorer</button></div>';
  }
  function blocRecolte(cible) {
    var s = C.source(etat, cible), n = C.affectes(etat, cible), pl = C.places(etat, cible);
    return '<div class="cl-ligne"><span>👷 Récolteurs ici</span><b>' + n + ' / ' + (pl || '–') + '</b></div>' +
      (s ? '<div class="cl-ligne"><span>Production</span><span>' + ICONES[s.type] + ' ' + (n * s.taux) + ' / h' + (n ? '' : ' (personne)') + '</span></div>' : '') +
      '<div class="cl-actions"><button class="cl-btn cl-or" data-a="affecter" data-id="' + cible + '">＋ Affecter un récolteur</button>' + (n ? '<button class="cl-btn" data-a="retirer" data-id="' + cible + '">－ Retirer</button>' : '') + '</div>' +
      '<p class="cl-sous">' + C.libres(etat) + ' récolteur' + (C.libres(etat) > 1 ? 's' : '') + ' libre' + (C.libres(etat) > 1 ? 's' : '') + '</p>';
  }

  function rendrePanneau() {
    if (!selection) return;
    var h = '', b, i;
    if (selection.kind === 'bat') {
      b = C.batParId(etat, selection.id); if (!b) return fermerPanneau();
      if (b.type === 'tente') {
        var hd = C.HDV[etat.hdv];
        h += '<span class="cl-sous">Hôtel de ville · niveau ' + etat.hdv + '</span><h3>' + ICONE_BAT.tente + ' ' + esc(hd.nom) + '</h3>';
        h += '<p>Le cœur du village. Elle ne bouge plus. Elle garde ' + hd.stock + ' de chaque ressource et loge ' + hd.logement + ' récolteurs. Zone du village : ' + hd.zone + ' pas autour d’elle.</p>';
        h += b.chantier ? blocChantier(b) : blocAmelioration(b);
        var rec = C.RECRUE;
        h += '<div class="cl-ligne"><span>👷 Recruter un récolteur · ' + duree(rec.duree) + '</span><span>' + coutHTML(rec.cout) + '</span></div>';
        h += '<div class="cl-actions"><button class="cl-btn" data-a="recruter">＋ Recruter</button>';
        if (etat.formation.length) h += '<button class="cl-btn" data-a="finir-recrues"><i class="cl-cap"></i> ' + etat.formation.length + ' en formation · finir</button>';
        var pb = C.prixBatisseur(etat);
        if (pb && C.batisseurs(etat) < 5) h += '<button class="cl-btn" data-a="batisseur"><i class="cl-cap"></i> Bâtisseur de plus · ' + pb + '</button>';
        h += '</div>';
      } else {
        var d = C.BATS[b.type];
        h += '<span class="cl-sous">' + (b.niveau ? 'Niveau ' + b.niveau : 'En construction') + '</span><h3>' + ICONE_BAT[b.type] + ' ' + esc(d.nom) + '</h3><p>' + esc(d.desc) + '</p>';
        if (d.stock && b.niveau) for (var k in d.stock) h += '<div class="cl-ligne"><span>Stock de ' + C.NOMS_RES[k].toLowerCase() + '</span><b>+' + d.stock[k][b.niveau - 1] + '</b></div>';
        if (d.logement && b.niveau) h += '<div class="cl-ligne"><span>Logement</span><b>+' + d.logement[b.niveau - 1] + '</b></div>';
        h += b.chantier ? blocChantier(b) : blocAmelioration(b);
        if (b.type === 'ferme') h += b.niveau && !b.chantier ? blocRecolte(b.id) : (C.affectes(etat, b.id) ? blocRecolte(b.id) : '');
      }
    } else if (selection.kind === 'noeud') {
      var en = g.getEntity(selection.id), cn = etat.noeuds[selection.id];
      if (!en) return fermerPanneau();
      var renouv = en.type === 'wood' || en.type === 'food';
      h += '<span class="cl-sous">Ressource de la carte</span><h3>' + ICONES[en.type] + ' ' + esc(NOM_SOURCE[en.source] || C.NOMS_RES[en.type]) + '</h3>';
      if (renouv) {
        var st = cn ? cn.stock : en.amount;
        h += '<p>' + (Math.floor(st) + ' / ' + en.maxAmount) + ' ' + C.NOMS_RES[en.type].toLowerCase() + '. S’épuise, puis repousse lentement (' + C.REPOUSSE + ' par heure), même sans personne.</p>';
      } else h += '<p>Inépuisable, mais pas plus de ' + (/^big/.test(en.source) ? 3 : 2) + ' récolteurs à la fois.</p>';
      h += blocRecolte(selection.id);
    } else if (selection.kind === 'catalogue') {
      h += '<span class="cl-sous">' + C.batisseursLibres(etat) + ' bâtisseur' + (C.batisseursLibres(etat) > 1 ? 's' : '') + ' libre' + (C.batisseursLibres(etat) > 1 ? 's' : '') + '</span><h3>🏗️ Construire</h3><div class="cl-cartes">';
      for (i = 0; i < C.ORDRE_BATS.length; i++) {
        var ty = C.ORDRE_BATS[i], db = C.BATS[ty], max = C.maxBat(ty, etat.hdv), nn = C.compte(etat, ty);
        var verrou = etat.hdv < db.hdv;
        h += '<button class="cl-carte' + (verrou || nn >= max ? ' cl-bloque' : '') + '" data-a="poser" data-type="' + ty + '"><b>' + ICONE_BAT[ty] + ' ' + esc(db.nom) + '</b>' +
          (verrou ? '<small>🔒 HDV ' + db.hdv + '</small>' : '<span>' + coutHTML(db.niveaux[0].cout) + '</span><small>' + duree(db.niveaux[0].duree) + ' · ' + nn + '/' + max + '</small>') + '</button>';
      }
      h += '</div>';
    } else if (selection.kind === 'recolte') {
      h += '<span class="cl-sous">' + C.libres(etat) + ' libre' + (C.libres(etat) > 1 ? 's' : '') + ' sur ' + etat.recolteurs.length + '</span><h3>👷 Les récolteurs</h3><p>Chaque récolteur reste à son poste et produit même quand tu n’es pas là, jusqu’à ce que le stock soit plein.</p>';
      var deb = C.debits(etat);
      for (i = 0; i < C.RES.length; i++) {
        var r = C.RES[i];
        h += '<div class="cl-ligne"><span>' + ICONES[r] + ' ' + C.NOMS_RES[r] + ' · ' + Math.round(deb[r]) + ' / h</span><button class="cl-btn" data-a="auto" data-type="' + r + '">＋ Au plus proche</button></div>';
      }
      h += '<p class="cl-sous">Ou touche un arbre, un buisson, un filon ou ta ferme.</p>';
    }
    remplir(el.contenu, h);
  }

  // Remplace le contenu sans recréer les boutons quand seuls les textes changent
  // (minuteurs, prix) : un bouton recréé entre l'appui et le relâché perd le clic.
  function squelette(html) { return html.replace(/>[^<]*</g, '><').replace(/ style="[^"]*"/g, ''); }
  function copierTextes(a, b) {
    if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    if (a.nodeType === 1 && b.getAttribute('style') !== a.getAttribute('style')) a.setAttribute('style', b.getAttribute('style') || '');
    for (var i = 0; i < a.childNodes.length && i < b.childNodes.length; i++) copierTextes(a.childNodes[i], b.childNodes[i]);
  }
  function remplir(n, html) {
    if (n.__h === html) return;
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    if (n.__h != null && squelette(n.__h) === squelette(html) && n.childNodes.length === tmp.childNodes.length) {
      for (var i = 0; i < n.childNodes.length; i++) copierTextes(n.childNodes[i], tmp.childNodes[i]);
    } else n.innerHTML = html;
    n.__h = html;
  }

  /* ---- les actions ------------------------------------------------------------------ */
  function apres(r, ok) {
    if (!r.ok) { toast(r.raison, true); return false; }
    if (ok) toast(ok);
    sauver(); synchroniser(); majHaut(); rendrePanneau();
    return true;
  }
  function descripteurNoeud(id) {
    var n = g.getEntity(id); if (!n) return null;
    return { type: n.type, source: n.source, max: n.maxAmount, stock: n.amount, x: n.x, z: n.z };
  }
  function affecterA(cible) {
    var t = maintenant(), estNoeud = !C.batParId(etat, cible);
    if (estNoeud) {
      var n = g.getEntity(cible);
      if (!n) return;
      if (n.source === 'fish') return toast('La pêche viendra avec la cabane de pêcheur.', true);
      if (!dansZone(n.x, n.z, 0)) return toast('Hors de la zone du village. Monte ton HDV pour l’agrandir.', true);
    }
    return apres(C.affecter(etat, cible, estNoeud ? descripteurNoeud(cible) : null, t), 'Un récolteur part au travail.');
  }
  function autoAffecter(type) {
    var t = C.tente(etat), best = null, bd = Infinity, i;
    for (i = 0; i < etat.bats.length; i++) {
      var b = etat.bats[i];
      if (type === 'food' && b.type === 'ferme' && C.source(etat, b.id) && C.affectes(etat, b.id) < C.places(etat, b.id)) { var dd = Math.hypot(b.x - t.x, b.z - t.z) - 30; if (dd < bd) { bd = dd; best = b.id; } }
    }
    for (i = 0; i < g.nodes.length; i++) {
      var n = g.nodes[i];
      if (n.type !== type || n.source === 'fish' || n.source === 'carcass' || !dansZone(n.x, n.z, 0)) continue;
      var cn = etat.noeuds[n.id];
      if (cn && (n.type === 'wood' || n.type === 'food') && cn.stock < 20) continue;
      var pl = /^big/.test(n.source) ? 3 : 2;
      if (C.affectes(etat, n.id) >= pl) continue;
      var d = Math.hypot(n.x - t.x, n.z - t.z);
      if (d < bd) { bd = d; best = n.id; }
    }
    if (!best) return toast('Plus rien de libre de ce côté dans ta zone. Monte ton HDV pour l’agrandir' + (type === 'food' ? ' ou construis une ferme.' : '.'), true);
    affecterA(best);
  }

  function clicPanneau(e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var a = b.getAttribute('data-a'), id = b.getAttribute('data-id'), t = maintenant(), r;
    if (a === 'finir') { r = C.accelerer(etat, id, t); if (apres(r, r.ok ? 'Terminé ! (' + r.prix + ' capsule' + (r.prix > 1 ? 's' : '') + ')' : '')) annoncer(r.bilan); }
    else if (a === 'ameliorer') apres(C.ameliorer(etat, id, t), 'Chantier lancé.');
    else if (a === 'recruter') apres(C.recruter(etat, t), 'Un récolteur se prépare à la tente.');
    else if (a === 'finir-recrues') { r = C.accelererFormation(etat, t); apres(r, r.ok ? r.n + ' récolteur' + (r.n > 1 ? 's' : '') + ' prêt' + (r.n > 1 ? 's' : '') + ' !' : ''); }
    else if (a === 'batisseur') apres(C.acheterBatisseur(etat, t), 'Un bâtisseur de plus rejoint le village.');
    else if (a === 'affecter') affecterA(id);
    else if (a === 'retirer') apres(C.retirer(etat, id, t), 'Le récolteur rentre à la tente.');
    else if (a === 'auto') autoAffecter(b.getAttribute('data-type'));
    else if (a === 'poser') {
      var ty = b.getAttribute('data-type'), p = C.peutConstruire(etat, ty);
      if (!p.ok) return toast(p.raison, true);
      commencerPose(ty);
    }
  }

  function annoncer(bilan) {
    if (!bilan) return;
    for (var i = 0; i < bilan.fini.length; i++) toast(bilan.fini[i]);
    if (bilan.recrues) toast(bilan.recrues > 1 ? bilan.recrues + ' nouveaux récolteurs sont prêts.' : 'Un nouveau récolteur est prêt.');
  }

  /* ---- poser un bâtiment ou la tente --------------------------------------------------- */
  function commencerPose(type) {
    selection = null; bascule(el.panneau, 'cl-cache', true); bascule(el.bas, 'cl-cache', true);
    var c = centreEcran();
    pose = { type: type, x: NaN, z: NaN, ok: false, raison: '' };
    if (c && type !== 'tente') majPose(c.x, c.z);
    rendrePose();
  }
  function centreEcran() { var r = vue.canvas.getBoundingClientRect(); return vue.screenToWorld(r.left + r.width / 2, r.top + r.height * .45); }
  function majPose(x, z) {
    if (!pose) return;
    pose.x = Math.round(x * 2) / 2; pose.z = Math.round(z * 2) / 2;
    var v = verifierPose(pose.type, pose.x, pose.z);
    pose.ok = v.ok; pose.raison = v.raison || '';
    if (pose.type === 'tente') majBrouillard();
    rendrePose();
  }
  function rendrePose() {
    if (!pose) { bascule(el.pose, 'cl-cache', true); return; }
    var h = '', nom = pose.type === 'tente' ? 'ta tente' : 'le ' + C.BATS[pose.type].nom.toLowerCase();
    if (pose.type === 'tente') {
      h += '<p><b>Où poser ta tente ?</b> Touche la carte : la zone de ton village (' + C.HDV[1].zone + ' pas autour) s’éclaire. Une fois posée, elle ne bouge plus.</p>';
      h += '<div class="cl-reperes">';
      var GP = window.FOW_GEO_PLAYABLE, B = GP && GP.byId;
      for (var i = 0; i < REPERES.length; i++) if (B && B[REPERES[i][0]]) h += '<button data-a="aller" data-id="' + REPERES[i][0] + '">📍 ' + REPERES[i][1] + '</button>';
      h += '</div>';
      if (isFinite(pose.x)) {
        var inv = inventaire(pose.x, pose.z, C.HDV[1].zone);
        h += '<p>Dans cette zone : ' + C.RES.map(function (k) { return ICONES[k] + ' ' + inv[k]; }).join(' · ') + (inv.stone && inv.gold && inv.wood ? '' : ' <span class="cl-ko">— il manque des ressources ici, la zone grandira avec l’HDV.</span>') + '</p>';
      }
    } else {
      var d = C.BATS[pose.type];
      h += '<p><b>' + ICONE_BAT[pose.type] + ' ' + esc(d.nom) + '</b> · ' + coutHTML(d.niveaux[0].cout) + ' · ' + duree(d.niveaux[0].duree) + '<br>Touche la carte dans ta zone pour placer ' + nom + '.</p>';
    }
    if (isFinite(pose.x)) h += '<p class="' + (pose.ok ? 'cl-okv' : 'cl-ko') + '">' + (pose.ok ? '✓ Emplacement possible.' : '✗ ' + esc(pose.raison)) + '</p>';
    h += '<div class="cl-actions"><button class="cl-btn cl-or" data-a="valider">' + (pose.type === 'tente' ? '⛺ Poser ma tente ici' : '✓ Construire ici') + '</button><button class="cl-btn" data-a="annuler">Annuler</button></div>';
    remplir(el.pose, h);
    bascule(el.pose, 'cl-cache', false);
  }
  function clicPose(e) {
    var b = e.target.closest('[data-a]'); if (!b || !pose) return;
    var a = b.getAttribute('data-a');
    if (a === 'annuler') return annulerPose();
    if (a === 'aller') { var o = window.FOW_GEO_PLAYABLE.byId[b.getAttribute('data-id')]; if (o) { vue.focus(o.x, o.z); majPose(o.x, o.z); } return; }
    if (a === 'valider') {
      if (!isFinite(pose.x)) return toast('Touche d’abord la carte pour choisir l’emplacement.', true);
      var v = verifierPose(pose.type, pose.x, pose.z);
      if (!v.ok) return toast(v.raison, true);
      var t = maintenant(), r;
      if (pose.type === 'tente') {
        r = C.poserTente(etat, pose.x, pose.z, t);
        if (!r.ok) return toast(r.raison, true);
        pose = null; rendrePose(); bascule(el.bas, 'cl-cache', false);
        sauver(); synchroniser(); majHaut();
        modal('<span class="cl-sous">HDV 1 · La Tente</span><h2>Bienvenue chez toi.</h2><ul>' +
          '<li>Tes 2 récolteurs attendent devant la tente : envoie-les sur un arbre, des baies ou un filon (👷 Récolteurs ou touche la ressource).</li>' +
          '<li>Tes 2 bâtisseurs font un chantier chacun. Commence par un dépôt et une ferme (🏗️ Construire).</li>' +
          '<li>Tout avance en temps réel, même l’application fermée, jusqu’à ce que le stock soit plein.</li>' +
          '<li>Les capsules finissent un chantier tout de suite. Ce sont des capsules de test : elles se brancheront plus tard sur les Filsous du SFT2026.</li></ul>' +
          '<div class="cl-actions"><button class="cl-btn cl-or" data-a="modal-ok">C’est parti</button></div>');
        return;
      }
      r = C.construire(etat, pose.type, pose.x, pose.z, t);
      if (!r.ok) return toast(r.raison, true);
      var nomb = C.BATS[pose.type].nom;
      pose = null; rendrePose(); bascule(el.bas, 'cl-cache', false);
      apres(r, nomb + ' : chantier lancé.');
    }
  }
  function annulerPose(silencieux) {
    if (!pose) return;
    var etaitTente = pose.type === 'tente';
    pose = null; rendrePose();
    if (etaitTente) majBrouillard();
    if (!silencieux) bascule(el.bas, 'cl-cache', false);
  }
  function choisirTerrain() { commencerPose('tente'); }

  /* ---- toucher la carte ---------------------------------------------------------------- */
  var pointeurs = {}, geste = null, pince = null;
  function nbPointeurs() { var n = 0; for (var k in pointeurs) n++; return n; }
  function surDown(e) {
    if (!actif) return;
    e.preventDefault();
    try { vue.canvas.setPointerCapture(e.pointerId); } catch (x) { }
    pointeurs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (nbPointeurs() >= 2) {
      var a = []; for (var k in pointeurs) a.push(pointeurs[k]);
      pince = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }; geste = null; return;
    }
    geste = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, bouge: false };
  }
  function surMove(e) {
    if (!actif) return;
    if (pointeurs[e.pointerId]) pointeurs[e.pointerId] = { x: e.clientX, y: e.clientY };
    if (pince && nbPointeurs() >= 2) {
      var a = []; for (var k in pointeurs) a.push(pointeurs[k]);
      var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if (d > 5) { vue.zoom(pince.d / d); pince.d = d; }
      return;
    }
    if (geste && geste.id === e.pointerId) {
      if (Math.hypot(e.clientX - geste.x, e.clientY - geste.y) > 7) geste.bouge = true;
      if (geste.bouge) { vue.panPixels(e.clientX - geste.lx, e.clientY - geste.ly); geste.lx = e.clientX; geste.ly = e.clientY; }
      return;
    }
    // à la souris, le fantôme du bâtiment suit le pointeur
    if (pose && e.pointerType === 'mouse' && !nbPointeurs()) { var w = vue.screenToWorld(e.clientX, e.clientY); if (w) majPose(w.x, w.z); }
  }
  function surUp(e) {
    if (!actif) return;
    delete pointeurs[e.pointerId];
    try { vue.canvas.releasePointerCapture(e.pointerId); } catch (x) { }
    if (pince) { if (nbPointeurs() < 2) pince = null; geste = null; return; }
    if (!geste || geste.id !== e.pointerId) return;
    var tap = !geste.bouge; geste = null;
    if (tap) toucher(e.clientX, e.clientY);
  }
  function surWheel(e) { if (!actif) return; e.preventDefault(); vue.zoom(Math.exp(e.deltaY * .001)); }

  function toucher(cx, cy) {
    if (pose) { var w = vue.screenToWorld(cx, cy); if (w) majPose(w.x, w.z); return; }
    if (!C.tente(etat)) return choisirTerrain();
    var id = vue.pick(cx, cy);
    if (id) {
      var eb = g.getEntity(id);
      if (eb && eb.__clash) return ouvrir({ kind: 'bat', id: eb.__clash });
      if (eb && id.charAt(0) === 'n' && g.nodes.indexOf(eb) >= 0) {
        if (eb.source === 'fish') return toast('La pêche viendra avec la cabane de pêcheur.');
        if (!dansZone(eb.x, eb.z, 0)) return toast('Hors de la zone du village. Monte ton HDV pour l’agrandir.');
        return ouvrir({ kind: 'noeud', id: id });
      }
      if (eb && eb.type === 'worker') { for (var k in ouvriers) if (ouvriers[k] === eb && k.charAt(0) === 'R') { var r = etat.recolteurs.filter(function (x) { return 'R' + x.id === k; })[0]; if (r && r.cible) return ouvrir(C.batParId(etat, r.cible) ? { kind: 'bat', id: r.cible } : { kind: 'noeud', id: r.cible }); return ouvrir({ kind: 'recolte' }); } }
    }
    if (selection) fermerPanneau();
  }

  /* ---- la boucle ---------------------------------------------------------------------- */
  function boucle(now) {
    requestAnimationFrame(boucle);
    if (!actif || !g || document.hidden) { dernierT = now; return; }
    var dt = Math.min(.1, Math.max(0, (now - (dernierT || now)) / 1000)); dernierT = now;
    g.time += dt; // pour l'animation des ouvriers : le moteur ne calcule rien d'autre
    if (C.reglages.instant) devFinir();
    if (focusAFaire > 0) { focusAFaire--; if (!focusAFaire) cadrer(); }
    if (now - dernierHud > 250) {
      dernierHud = now;
      var bilan = C.avancer(etat, maintenant());
      annoncer(bilan);
      synchroniser(); majHaut();
      if (selection && (bilan.fini.length || bilan.recrues || selection.kind !== 'catalogue')) rendrePanneau();
      if (maintenant() - dernierSauve > 10000) sauver();
    }
    majEtiquettes();
  }
  function cadrer() {
    var t = C.tente(etat);
    if (t) { vue.focus(t.x, t.z); vue.zoom(Math.max(30, C.zone(etat) * .7) / Math.max(1, vue.getCameraState().size)); return; }
    var B = window.FOW_GEO_PLAYABLE && window.FOW_GEO_PLAYABLE.byId, o = B && B.campagnan;
    vue.focus(o ? o.x : 384, o ? o.z : 430); vue.zoom(90 / Math.max(1, vue.getCameraState().size));
  }

  // mode développement (?devmap=1) : tout se termine tout de suite, et le bouton +1000 remplit le village
  function devFinir() {
    var t = maintenant(), i, n = 0;
    for (i = 0; i < etat.bats.length; i++) if (etat.bats[i].chantier && etat.bats[i].chantier.fin > t) { etat.bats[i].chantier.fin = t; n++; }
    if (etat.formation.length && etat.formation[0].fin > t) { etat.formation[0].fin = t; n++; }
    if (n) dernierHud = 0;
  }
  function dev(quoi) {
    if (!etat || P.get('devmap') !== '1') return;
    if (quoi === 'remplir') {
      for (var i = 0; i < C.RES.length; i++) etat.res[C.RES[i]] += 1000;
      etat.capsules += 100;
      toast('Mode dev : +1000 de chaque ressource, +100 capsules.');
      sauver(); majHaut(); rendrePanneau();
    }
  }

  /* ---- entrer et sortir ---------------------------------------------------------------- */
  function entrer() {
    if (!preparerDecor()) { var eb = $('clash-entree'); if (eb) eb.querySelector('small').textContent = 'Le royaume se prépare encore : réessaie dans un instant.'; return; }
    var t = maintenant(), neuf = false;
    etat = lire();
    if (!etat) { etat = C.nouvelEtat(t); neuf = true; }
    var absent = t - (etat.maj || t);
    var bilan = C.avancer(etat, t);
    actif = true;
    vue.setGame(g);
    var menu = $('menu'); if (menu) menu.hidden = true;
    bascule(el.racine, 'cl-cache', false);
    bascule(el.bas, 'cl-cache', false);
    zoneVue = null; synchroniser(); majHaut(); sauver();
    focusAFaire = 3; // après le survol du menu, qui recadre une fois en se retirant
    if (neuf || !C.tente(etat)) {
      modal('<span class="cl-sous">Mode Clash · étape 1</span><h2>Ton village, en temps réel.</h2>' +
        '<p>Tout le monde joue sur la même carte de l’Hérault. Tu poses ta tente où tu veux : elle ne bougera plus. Ensuite :</p><ul>' +
        '<li><b>Les bâtisseurs</b> construisent et améliorent, un chantier chacun.</li>' +
        '<li><b>Les récolteurs</b> restent affectés à une ressource et produisent même hors ligne, jusqu’à ce que le stock soit plein.</li>' +
        '<li><b>L’HDV</b> agrandit la zone et débloque les bâtiments (HDV 1 à 3 pour cette étape).</li>' +
        '<li><b>Les capsules</b> finissent un chantier tout de suite (capsules de test pour l’instant).</li></ul>' +
        '<p class="cl-sous">Les attaques arrivent à l’étape 2.</p>' +
        '<div class="cl-actions"><button class="cl-btn cl-or" data-a="choisir">Choisir où poser ma tente →</button></div>');
    } else if (absent > 60000) resumeAbsence(absent, bilan);
  }
  function resumeAbsence(ms, bilan) {
    var lignes = [], i;
    for (i = 0; i < C.RES.length; i++) { var k = C.RES[i], v = Math.floor(bilan.res[k] || 0); if (v > 0) lignes.push(ICONES[k] + ' +' + nombre(v) + ' ' + C.NOMS_RES[k].toLowerCase()); }
    var html = '<span class="cl-sous">Pendant ton absence · ' + duree(ms / 1000) + '</span><h2>Le village a travaillé.</h2>';
    html += lignes.length ? '<p>' + lignes.join('<br>') + '</p>' : '<p>Rien n’a été récolté : personne au travail, ou les stocks étaient pleins.</p>';
    for (i = 0; i < bilan.fini.length; i++) html += '<p>🔨 ' + esc(bilan.fini[i]) + '</p>';
    if (bilan.recrues) html += '<p>👷 ' + bilan.recrues + ' récolteur' + (bilan.recrues > 1 ? 's' : '') + ' prêt' + (bilan.recrues > 1 ? 's' : '') + '.</p>';
    var cap = C.capacites(etat), pleins = C.RES.filter(function (k) { return etat.res[k] >= cap[k] - .5; });
    if (pleins.length) html += '<p class="cl-manque">Stock plein : ' + pleins.map(function (k) { return C.NOMS_RES[k].toLowerCase(); }).join(', ') + '. Dépense ou agrandis tes réserves.</p>';
    html += '<div class="cl-actions"><button class="cl-btn cl-or" data-a="modal-ok">Au travail</button></div>';
    modal(html);
  }
  function quitter() {
    sauver();
    actif = false; selection = null; pose = null; pointeurs = {}; geste = null; pince = null;
    viderEtiquettes(); fermerModal();
    bascule(el.panneau, 'cl-cache', true); bascule(el.pose, 'cl-cache', true);
    bascule(el.racine, 'cl-cache', true);
    var f = F(); if (f && f.view && f.game) f.view.setGame(f.game);
    var menu = $('menu'); if (menu) menu.hidden = false;
  }

  function demarrer() {
    style(); construireDOM(); boutonMenu();
    var cv = $('world');
    cv.addEventListener('pointerdown', surDown);
    cv.addEventListener('pointermove', surMove);
    cv.addEventListener('pointerup', surUp);
    cv.addEventListener('pointercancel', surUp);
    cv.addEventListener('wheel', surWheel, { passive: false });
    window.addEventListener('keydown', function (e) { if (actif && e.key === 'Escape') { if (pose) annulerPose(); else if (selection) fermerPanneau(); } });
    document.addEventListener('visibilitychange', function () {
      if (!actif || !etat) return;
      if (document.hidden) { sauver(); return; }
      var avant = etat.maj, b = C.avancer(etat, maintenant());
      if (maintenant() - avant > 5 * 60000) resumeAbsence(maintenant() - avant, b); else annoncer(b);
      sauver();
    });
    window.addEventListener('pagehide', sauver);
    requestAnimationFrame(boucle);
    // pour les tests et le diagnostic
    window.FOW_CLASH_UI = { dev: dev, get etat() { return etat; }, get decor() { return g; }, entrer: entrer, quitter: quitter, sauver: sauver, verifierPose: verifierPose, toucher: toucher, get actif() { return actif; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
})();
