/* FILS OF WAR - la fiche d'un bâtiment (20/10/2026).
 * Florian : « quand je clique sur un bâtiment, je veux les infos du bâtiment ».
 * Le bouton « Infos » du panneau (ou la touche i) ouvre une fiche : à quoi il sert,
 * ses PV, ce qu'il recrute, sa culture, sa population, le plafond par ville.
 */
(function(){
  'use strict';
  var boite=null,courant=null,defs=null;
  var CULTURE={eglise:2,theatre:1.5,temple:1,tavern:.3,merveille:3,observatoire:.5};
  var DEPOT={townhall:'tout',depot:'tout',bastide:'tout',pecherie:'les vivres'};
  function F(){return window.__FOW__;}
  function moi(){var f=F();return f&&typeof f.me==='number'?f.me:0;}
  function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function ligne(e,t){return '<li><span>'+e+'</span>'+t+'</li>';}
  function construire(){
    var st=document.createElement('style');
    st.textContent='#fow-fiche{position:fixed;z-index:45;right:18px;bottom:calc(var(--tray-height,172px) + 58px);width:330px;max-width:calc(100vw - 36px);max-height:calc(100vh - var(--tray-height,172px) - 150px);overflow:auto;'+
      'background:#17241ff4;border:1px solid #b8a06b88;border-radius:8px;padding:12px 14px;color:#efe4c4;font:500 12px system-ui,sans-serif;box-shadow:0 10px 30px #0008}'+
      '#fow-fiche.ff-cache{display:none}#fow-fiche small{display:block;font:700 9px system-ui;letter-spacing:1.2px;color:#cdb47a}'+
      '#fow-fiche h4{margin:2px 0 6px;font:700 18px Georgia,serif;color:#ffe9b0}#fow-fiche p{margin:0 0 8px;line-height:1.45;color:#d9cfb2}'+
      '#fow-fiche ul{list-style:none;margin:0;padding:0}#fow-fiche li{display:flex;gap:8px;padding:5px 0;border-top:1px solid #b8a06b22;line-height:1.35}#fow-fiche li span{width:18px;flex:none;text-align:center}'+
      '#fow-fiche button{position:absolute;top:6px;right:8px;background:none;border:0;color:#cdb47a;font:700 16px system-ui;cursor:pointer}'+
      '@media(max-width:900px),(max-height:560px){#fow-fiche{bottom:calc(var(--tray-height,123px) + 40px);font-size:11px;width:290px}}';
    document.head.appendChild(st);
    boite=document.createElement('div');boite.id='fow-fiche';boite.className='ff-cache';document.body.appendChild(boite);
    boite.addEventListener('click',function(e){if(e.target.closest('button'))fermer();e.stopPropagation();});
    document.addEventListener('keydown',function(e){var t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA')return;
      if(e.key==='Escape'&&courant){fermer();return;}
      if((e.key==='i'||e.key==='I')&&!e.ctrlKey&&!e.metaKey){var f=F(),s=f&&f.selection;if(s&&s.length===1&&defs){var b=f.game.getEntity(s[0]);if(b&&defs.B[b.type]){courant===b.id?fermer():montrer(b.id);}}}});
  }
  function fermer(){courant=null;if(boite)boite.className='ff-cache';}
  function rendre(){
    var f=F(),g=f&&f.game;if(!g||!courant||!defs)return;
    var b=g.getEntity(courant);
    if(!b||!(b.hp>0)||!f.selection||f.selection.indexOf(courant)<0){fermer();return;}
    var D=defs.B[b.type]||{},o=moi(),a=b.owner===o,p=g.players[o],h='';
    h+='<button type="button" title="Fermer">✕</button><small>'+(a?'TON BÂTIMENT':'BÂTIMENT ADVERSE')+'</small><h4>'+esc(D.name||b.type)+'</h4><p>'+esc(D.description||'')+'</p><ul>';
    h+=ligne('❤️',Math.ceil(b.hp)+' / '+Math.round(b.maxHp)+' PV'+(b.complete?'':' · chantier '+Math.round((b.progress||0)*100)+' %'));
    if(b.type==='townhall'&&a)h+=ligne('👥','Population : '+p.pop+' / '+p.cap+' places au total');
    else if(D.pop)h+=ligne('🏠','+'+D.pop+' places de population');
    if(DEPOT[b.type])h+=ligne('📦','Les ouvriers y déposent '+DEPOT[b.type]+' ce qu’ils récoltent');
    var T=(D.trains||[]).map(function(u){return (defs.N&&defs.N[u])||(defs.U[u]&&defs.U[u].name)||u;});
    if(T.length)h+=ligne('⚔️','Recrute : '+T.join(', '));
    if(CULTURE[b.type])h+=ligne('🎭','+'+CULTURE[b.type]+' culture / s une fois terminé'+(b.type==='theatre'?' (×2 avec Molière)':''));
    if(b.type==='tower'){var TT=window.FOW_TOURS_DEF&&window.FOW_TOURS_DEF[b.niveau||1];if(TT)h+=ligne('🏹',TT.n+' : '+TT.deg+' dégâts, portée '+TT.por+(TT.fleches?', 2 cibles':'')+(TT.boulet?', dégâts en zone':''));}
    if(b.type==='porte')h+=ligne('🚪','Grille '+({auto:'automatique',ferme:'toujours fermée',ouvert:'toujours ouverte'}[b.mode||'auto'])+' · '+(b.ferme?'baissée':'levée'));
    if(b.type==='wall'||b.type==='porte')h+=ligne('🛡️','Encaisse 60 % de moins contre les soldats ; seuls béliers et catapultes l’abattent vite');
    if(b.type==='farm'&&b.resourceRemaining!=null)h+=ligne('🌾',Math.round(b.resourceRemaining)+' vivres restants');
    if(b.queue&&b.queue.length)h+=ligne('⏳','En file : '+b.queue.length+' recrue'+(b.queue.length>1?'s':''));
    if(a&&g.fowPlafond){var K=g.fowPlafond(o,b.type);if(K)h+=ligne('📏','Plafond : '+K.n+' / '+K.max+(K.K==='cult'?' (un par ville)':K.K==='mil'?' (1 par ville, 2 dès l’âge III)':' (selon l’âge et les villes)'));}
    if(a&&b.type!=='townhall')h+=ligne('🔨','Démolir rend '+(b.complete?'la moitié des':'tous les')+' matériaux'+(b.type==='porte'?' et referme la palissade':''));
    h+='</ul>';
    if(boite.__h!==h){boite.__h=h;boite.innerHTML=h;}
  }
  function montrer(id){courant=id;boite.className='';rendre();}
  window.FOW_FICHE=function(id,d){if(d)defs=d;if(!boite)construire();if(courant===id){fermer();return;}montrer(id);};
  setInterval(function(){if(courant)rendre();},500);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',construire);else construire();
})();
