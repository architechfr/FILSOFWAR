/* FILS OF WAR - la diplomatie avec les Barons et le suivi du commerce (20/10/2026).
 * Un bouton « 🤝 Diplomatie » ouvre un panneau : état (guerre, trêve, pacte, paix),
 * humeur des Barons, cadeau, trêve, pacte commercial, déclaration de guerre, et les
 * propositions des Barons à accepter ou refuser. Le moteur décide, ce fichier affiche.
 */
(function(){
  'use strict';
  var boite=null,corps=null,ouvert=false,bouton=null;
  function F(){return window.__FOW__;}
  function moi(){var f=F();return f&&typeof f.me==='number'?f.me:0;}
  function fmt(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
  function dire(t,type){var f=F();if(f&&f.toast)f.toast(t,type||'notice');}
  function agir(a){var g=F()&&F().game;if(!g||!g.fowDiplo)return;var r=g.fowDiplo(moi(),a);if(!r.ok)dire(r.reason,'error');maj();}
  function humeur(r){return r>=60?['😄','Copains de comptoir']:r>=30?['🙂','Cordiaux']:r>=0?['😐','Méfiants']:r>=-40?['😠','Rancuniers']:['🤬','Furieux'];}
  function construire(){
    var st=document.createElement('style');
    st.textContent='#fow-diplo{position:fixed;top:82px;right:180px;z-index:40;font:600 11px system-ui,sans-serif;color:#efe4c4}'+
      '#fow-diplo.dp-cache,#fow-diplo .dp-cache{display:none}'+
      '#fow-diplo>button{background:#17241fe8;border:1px solid #b8a06b88;color:#f2e2b0;border-radius:6px;padding:7px 10px;font:700 11px system-ui;cursor:pointer;letter-spacing:.4px}'+
      '#fow-diplo>button.dp-alerte{border-color:#f2cf7b;box-shadow:0 0 12px #f2b84b88;animation:dpP 1s ease-in-out infinite alternate}@keyframes dpP{to{box-shadow:0 0 2px #f2b84b33}}'+
      '#fow-diplo .dp-corps{margin-top:6px;width:280px;background:#17241ff0;border:1px solid #b8a06b66;border-radius:8px;padding:10px;box-shadow:0 8px 24px #0007}'+
      '#fow-diplo h4{margin:0 0 6px;font:700 10px system-ui;letter-spacing:1px;color:#cdb47a}'+
      '#fow-diplo .dp-etat{font:700 15px Georgia,serif;color:#ffe9b0;margin-bottom:4px}'+
      '#fow-diplo .dp-rel{display:block;height:6px;background:linear-gradient(90deg,#c0503a,#c9a45a 50%,#6fbf8a);border-radius:3px;position:relative;margin:6px 0 2px}'+
      '#fow-diplo .dp-rel b{position:absolute;top:-4px;width:4px;height:14px;background:#fff;border-radius:2px;box-shadow:0 0 4px #000}'+
      '#fow-diplo small{display:block;color:#b9b19a;font-weight:500;line-height:1.45}'+
      '#fow-diplo .dp-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:9px}'+
      '#fow-diplo .dp-actions button,#fow-diplo .dp-offre button{background:#ffffff10;border:1px solid #d9b25f55;border-radius:6px;color:#efe4c4;padding:6px 5px;font:600 10px system-ui;cursor:pointer;text-align:left}'+
      '#fow-diplo .dp-actions button em{display:block;font-style:normal;font-weight:500;color:#b9b19a;font-size:9px}'+
      '#fow-diplo .dp-actions button.dp-non{opacity:.45}'+
      '#fow-diplo .dp-guerre{border-color:#c9785b!important;color:#ffc9b5!important}'+
      '#fow-diplo .dp-offre{margin-top:9px;padding:8px;border-radius:6px;background:#f2b84b1f;border:1px solid #f2cf7b88}'+
      '#fow-diplo .dp-offre div{display:flex;gap:6px;margin-top:6px}'+
      '#fow-diplo .dp-com{margin-top:9px;padding-top:8px;border-top:1px solid #b8a06b33}';
    document.head.appendChild(st);
    boite=document.createElement('div');boite.id='fow-diplo';boite.className='dp-cache';
    bouton=document.createElement('button');bouton.type='button';bouton.textContent='🤝 Diplomatie';
    bouton.onclick=function(e){e.stopPropagation();ouvert=!ouvert;corps.className=ouvert?'dp-corps':'dp-corps dp-cache';maj();};
    corps=document.createElement('div');corps.className='dp-corps dp-cache';
    corps.addEventListener('click',function(e){var b=e.target.closest('button[data-a]');if(b){e.stopPropagation();agir(b.getAttribute('data-a'));}});
    boite.appendChild(bouton);boite.appendChild(corps);document.body.appendChild(boite);
  }
  function maj(){
    var f=F(),g=f&&f.game,hud=document.getElementById('hud'),menu=document.getElementById('menu');
    if(!boite)return;
    if(!g||!g.players||!g.fowDiplo||(hud&&hud.hidden)||(menu&&!menu.hidden)){boite.className='dp-cache';return;}
    boite.className='';
    var D=g._fowD?g._fowD():g.fowDiplo,o=moi(),p=g.players[o],offre=D.offre&&D.offre.pour===o?D.offre:null;
    bouton.className=offre?'dp-alerte':'';
    if(!ouvert)return;
    var E={guerre:['⚔️ En guerre','Les Barons peuvent attaquer à tout moment.'],treve:['🕊️ Trêve','Encore '+fmt(D.fin-g.time)+' sans combat.'],pacte:['🤝 Pacte commercial','Vos marchands commercent entre vos villes. Personne n’attaque.'],paix:['🌿 Paix','Mode exploration : la paix tient tant que tu n’attaques pas.']}[D.etat]||['?',''];
    var H=humeur(D.relation),pos=Math.max(0,Math.min(100,(D.relation+100)/2));
    var c=g.coutTreve?g.coutTreve(o):0,or=p.resources.gold||0;
    function bt(a,t,em,ok,cls){return '<button type="button" data-a="'+a+'" class="'+(ok?'':'dp-non ')+(cls||'')+'">'+t+'<em>'+em+'</em></button>';}
    var html='<h4>LES BARONS DE LA BUVETTE</h4><div class="dp-etat">'+E[0]+'</div><small>'+E[1]+'</small>'+
      '<span class="dp-rel"><b style="left:calc('+pos+'% - 2px)"></b></span><small>'+H[0]+' '+H[1]+' · relation '+Math.round(D.relation)+'</small>';
    if(offre)html+='<div class="dp-offre"><small>'+(offre.type==='treve'?'🏳️ Les Barons proposent une trêve de 5 min et '+(offre.or||0)+' filsous.':'🤝 Les Barons proposent un pacte commercial.')+'</small><div><button type="button" data-a="accepter">✅ Accepter</button><button type="button" data-a="refuser">❌ Refuser</button></div></div>';
    html+='<div class="dp-actions">'+
      bt('cadeau','🎁 Cadeau','200 ₣ · relation +15',or>=200)+
      (D.etat==='guerre'?bt('treve','🕊️ Trêve 5 min',c+' ₣ exigés',or>=c&&D.relation>-50):bt('treve','🕊️ Trêve','déjà en paix',false))+
      bt('pacte','🤝 Pacte commercial','300 ₣ · relation ≥ 30',D.etat!=='guerre'&&D.etat!=='pacte'&&D.relation>=30&&or>=300)+
      bt('guerre','⚔️ Déclarer la guerre','rompt trêve et pacte',D.etat!=='guerre','dp-guerre')+'</div>';
    var M=g.units.filter(function(u){return u.owner===o&&u.type==='marchand'&&u.hp>0;}),routes=M.filter(function(u){return u.action==='commerce';}).length;
    html+='<div class="dp-com"><h4>ROUTES COMMERCIALES</h4><small>🐴 '+M.length+' marchand'+(M.length>1?'s':'')+' · '+routes+' sur la route · '+Math.round(p.fowCommerce||0)+' filsous gagnés</small><small>Forme-les à la Banque. Ils relient tes villes, tes hameaux alliés'+(D.etat==='pacte'?' et les villes des Barons (×1,6)':' et, avec un pacte, les villes des Barons')+'.</small></div>';
    if(corps.__h!==html){corps.__h=html;corps.innerHTML=html;}
  }
  function demarrer(){construire();setInterval(maj,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
