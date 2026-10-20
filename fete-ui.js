/* FILS OF WAR - finir une partie en beauté (20/10/2026).
 * Trois choses, choisies par Florian :
 *  - les titres et succès gagnés en cours de partie (« Roi de la Buvette », « Pape de Campagnan »…) ;
 *  - l'album photo de la partie : le jeu prend des clichés des grands moments ;
 *  - l'écran de victoire festif : feu d'artifice, titre d'honneur, album et titres.
 * Ce fichier ne fait que regarder la partie : il ne change rien au moteur.
 */
(function(){
  'use strict';
  var MAX_PHOTOS=12;
  var etat=null; // {jeu, album:[], titres:[], vus:{}, ...} : remis à zéro à chaque nouvelle partie

  function F(){return window.__FOW__;}
  function moi(){var f=F();return f&&typeof f.me==='number'?f.me:0;}
  function vivant(e){return e&&e.hp>0;}
  function compte(g,o,t){var n=0,B=g.buildings||[];for(var i=0;i<B.length;i++){var b=B[i];if(b.owner===o&&b.type===t&&b.complete&&vivant(b))n++;}return n;}
  function nbBat(g,o){var n=0,B=g.buildings||[];for(var i=0;i<B.length;i++){var b=B[i];if(b.owner===o&&b.complete&&vivant(b)&&b.type!=='wall')n++;}return n;}
  function nbIllustres(g,o){var n=0,U=g.units||[];for(var i=0;i<U.length;i++){var u=U[i];if(u.owner===o&&u.type==='illustre'&&vivant(u))n++;}return n;}
  function coup(p,k){return (p.fowCoupsUtil&&p.fowCoupsUtil[k])||0;}

  /* ---- les titres -------------------------------------------------------- */
  var TITRES=[
    {k:'premier',e:'🥊',n:'Premier coup de poing',d:'Premier adversaire envoyé au tapis.',t:function(g,o){return (g.stats[o].unitsKilled||0)>=1;}},
    {k:'buvette',e:'🍺',n:'Roi de la Buvette',d:'Une buvette debout et une tournée générale payée.',t:function(g,o,p){return compte(g,o,'tavern')>=1&&coup(p,'tournee')>=1;}},
    {k:'pape',e:'⛪',n:'Pape de Campagnan',d:'Une église et un temple : le clan prie deux fois.',t:function(g,o){return compte(g,o,'eglise')>=1&&compte(g,o,'temple')>=1;}},
    {k:'moliere',e:'🎭',n:'Molière du Salagou',d:'Deux théâtres font salle comble.',t:function(g,o){return compte(g,o,'theatre')>=2;}},
    {k:'goelands',e:'🐦',n:'Ami des goélands',d:'Les mouettes de Sète ont volé pour toi.',t:function(g,o,p){return coup(p,'mouettes')>=1;}},
    {k:'barbecue',e:'🔥',n:'Maître du barbecue',d:'Le grand barbecue a fait griller le rival.',t:function(g,o,p){return coup(p,'barbecue')>=1;}},
    {k:'cio',e:'📣',n:'Le CIO a toujours raison',d:'L’escouade du CIO a débarqué.',t:function(g,o,p){return coup(p,'cio')>=1;}},
    {k:'filserie',e:'🎉',n:'Filserie totale',d:'Les quatre coups de la Filserie dans la même partie.',t:function(g,o,p){return coup(p,'tournee')&&coup(p,'mouettes')&&coup(p,'cio')&&coup(p,'barbecue');}},
    {k:'pilleur',e:'🏴',n:'Pilleur de hameaux',d:'Trois hameaux pillés. Ça va jaser au village.',t:function(g,o,p){return (p.fowPilles||0)>=3;}},
    {k:'boucher',e:'⚔️',n:'Boucher du Pont du Diable',d:'Vingt-cinq adversaires au tapis.',t:function(g,o){return (g.stats[o].unitsKilled||0)>=25;}},
    {k:'banquier',e:'💰',n:'Banquier des Filsous',d:'Cinq mille filsous dans le coffre.',t:function(g,o,p){return (p.resources.gold||0)>=5000;}},
    {k:'illustres',e:'🌟',n:'Collectionneur d’illustres',d:'Deux personnages illustres à ta table.',t:function(g,o){return nbIllustres(g,o)>=2;}},
    {k:'batisseur',e:'🏗️',n:'Bâtisseur de l’Hérault',d:'Vingt bâtiments debout.',t:function(g,o){return nbBat(g,o)>=20;}},
    {k:'merveille',e:'🏛️',n:'Grand Maître des Buffets',d:'Les Grands Buffets sont debout.',t:function(g,o){return compte(g,o,'merveille')>=1;}},
    {k:'futur',e:'🚀',n:'Sales Fils du futur',d:'Le clan est entré dans l’âge V.',t:function(g,o,p){return (p.age||0)>=5;}}
  ];
  var HONNEUR={
    conquete:{e:'⚔️',t:'Grand Castagneur des Sales Fils',p:'Le cœur du camp rival est tombé. On en parlera encore à la buvette dans vingt ans.'},
    culture:{e:'🎭',t:'Troubadour en chef du Salagou',p:'Le pays tout entier chante tes louanges, du Pic Saint-Loup jusqu’à Sète.'},
    merveille:{e:'🏛️',t:'Grand Maître des Buffets',p:'Les Grands Buffets tiennent debout : l’Hérault vient manger chez toi.'},
    science:{e:'🚀',t:'Cosmonaute de Campagnan',p:'La fusée a décollé du Cap d’Agde. Les Sales Fils sont dans les étoiles.'},
    tresor:{e:'💰',t:'Trésorier perpétuel du CIO',p:'Le coffre déborde de filsous. Le CIO te confie les clés de la Banque.'}
  };

  function nouvelEtat(g){return {jeu:g,album:[],titres:[],vus:{},ev:{},ill:{},merv:false,kills:0,fini:false,fete:false};}

  /* ---- l'album ----------------------------------------------------------- */
  function surEcran(v,x,z){
    if(!v||typeof x!=='number'||!v.worldToScreen)return true;
    var p=v.worldToScreen(x,z,0),w=window.innerWidth,h=window.innerHeight;
    return p&&p.x>40&&p.x<w-40&&p.y>80&&p.y<h-120;
  }
  function photo(legende,x,z,delai,faible){
    var s=etat;
    setTimeout(function(){
      if(!s||s!==etat)return;
      var f=F(),v=f&&f.view;if(!v||!v.renderer||!v.scene||!v.camera)return;
      if(!surEcran(v,x,z))return;
      if(faible){var der=s.album[s.album.length-1];if(der&&(s.jeu.time||0)-der.t<4)return;}
      try{
        v.renderer.render(v.scene,v.camera);
        var src=v.renderer.domElement,c=document.createElement('canvas'),w=360,h=Math.round(w*src.height/Math.max(1,src.width));
        c.width=w;c.height=h;c.getContext('2d').drawImage(src,0,0,w,h);
        s.album.push({url:c.toDataURL('image/jpeg',.74),legende:legende,t:s.jeu.time||0});
        if(s.album.length>MAX_PHOTOS)s.album.splice(1,1); // on garde toujours la première photo
      }catch(e){}
    },delai||0);
  }
  function fmt(t){t=Math.max(0,Math.floor(t||0));return Math.floor(t/60)+':'+('0'+t%60).slice(-2);}

  /* ---- les médailles en cours de partie --------------------------------- */
  var pile=[],boiteMed=null,timerMed=0;
  function medaille(T){
    pile.push(T);if(pile.length===1)suivante();
  }
  function suivante(){
    if(!pile.length){boiteMed.className='fe-cache';return;}
    var T=pile[0];
    boiteMed.innerHTML='<span>'+T.e+'</span><div><small>TITRE OBTENU</small><b>'+T.n+'</b><em>'+T.d+'</em></div>';
    boiteMed.className='fe-cache';void boiteMed.offsetWidth;boiteMed.className='';
    clearTimeout(timerMed);timerMed=setTimeout(function(){pile.shift();suivante();},4200);
  }

  /* ---- surveiller la partie --------------------------------------------- */
  function veille(){
    var f=F(),g=f&&f.game;
    if(!g||!g.players||!g.stats){return;}
    if(!etat||etat.jeu!==g)etat=nouvelEtat(g);
    var s=etat,o=moi(),p=g.players[o];if(!p)return;
    if(g.result){if(!s.fini){s.fini=true;s.finiA=Date.now();var gagne=g.result.winner===o;photo(gagne?'🏆 La victoire !':'💀 La chute du clan',null,null,0);}return;}
    if(g.paused)return;
    // titres
    for(var i=0;i<TITRES.length;i++){var T=TITRES[i];if(s.vus[T.k])continue;var ok=false;try{ok=!!T.t(g,o,p);}catch(e){}
      if(ok){s.vus[T.k]=1;s.titres.push({k:T.k,e:T.e,n:T.n,d:T.d,t:g.time});medaille(T);photo(T.e+' '+T.n,null,null,1800,true);}}
    // grands moments
    var E=g.events||[];
    for(var j=0;j<E.length;j++){var ev=E[j];if(s.ev[ev.id])continue;s.ev[ev.id]=1;
      if(ev.type==='fowCoup'&&ev.owner===o){var C=window.FOW_COUPS_DEF&&window.FOW_COUPS_DEF[ev.kind];photo((C?C.e+' '+C.n:'Coup de la Filserie'),ev.x,ev.z,ev.kind==='mouettes'?1300:ev.kind==='cio'?500:700);}
      else if(ev.type==='fowCoup'&&g.isVisible&&g.isVisible(o,ev.x,ev.z)){var C2=window.FOW_COUPS_DEF&&window.FOW_COUPS_DEF[ev.kind];photo('😱 Le rival lance '+(C2?C2.n.toLowerCase():'un coup'),ev.x,ev.z,900);}
      else if(ev.type==='age'&&ev.owner===o){photo('👑 Âge '+(['','I','II','III','IV','V'][p.age]||'nouveau')+' : la fête au village',ev.x,ev.z,300);}
    }
    var U=g.units||[];
    for(var k=0;k<U.length;k++){var u=U[k];if(u.type!=='illustre'||u.owner!==o||s.ill[u.id])continue;s.ill[u.id]=1;photo('🌟 '+(u.nomIllustre||'Un illustre')+' rejoint le clan',u.x,u.z,400);}
    if(!s.merv&&compte(g,o,'merveille')){s.merv=true;photo('🏛️ Les Grands Buffets sont debout',null,null,300);}
    var kills=g.stats[o].unitsKilled||0;
    if(s.kills<10&&kills>=10){photo('⚔️ La grande castagne',null,null,0);}
    s.kills=kills;
    if(!s.album.length&&p.homeLevel>=1&&g.time>5){var h=g._home&&g._home(o);if(h&&h.complete)photo('🏕️ Le premier campement',h.x,h.z,0);}
  }

  /* ---- l'écran de fin ---------------------------------------------------- */
  var feu=null;
  function fete(){
    var dlg=document.getElementById('result-dialog'),f=F(),g=f&&f.game;
    if(!dlg||!dlg.open||!g||!g.result||!etat||etat.fete||etat.jeu!==g||!etat.fini||Date.now()-etat.finiA<500)return;
    etat.fete=true;
    var o=moi(),gagne=g.result.winner===o,k=g.result.victoire||'conquete',H=HONNEUR[k]||HONNEUR.conquete;
    var vieux=document.getElementById('fe-fin');if(vieux)vieux.parentNode.removeChild(vieux);
    var div=document.createElement('div');div.id='fe-fin';
    var html='';
    if(gagne)html+='<div class="fe-honneur"><span>'+H.e+'</span><small>TITRE D’HONNEUR DES SALES FILS</small><b>'+H.t+'</b><em>'+H.p+'</em></div>';
    else html+='<div class="fe-honneur fe-perdu"><span>🍻</span><small>LA REVANCHE SE PRÉPARE</small><b>Sales Fils déchu… pour cette fois</b><em>On se retrouve à la buvette : la prochaine tournée est pour toi.</em></div>';
    var T=etat.titres;
    html+='<h4>🏅 TITRES DE LA PARTIE <i>'+T.length+' / '+TITRES.length+'</i></h4><div class="fe-titres">';
    if(!T.length)html+='<p class="fe-vide">Aucun titre cette fois. Les Sales Fils ont la mémoire courte : retente ta chance.</p>';
    for(var i=0;i<T.length;i++)html+='<span title="'+T[i].d+' ('+fmt(T[i].t)+')">'+T[i].e+' '+T[i].n+'</span>';
    html+='</div>';
    var A=etat.album;
    html+='<h4>📸 L’ALBUM DE LA PARTIE <i>'+A.length+' photo'+(A.length>1?'s':'')+'</i></h4><div class="fe-album">';
    if(!A.length)html+='<p class="fe-vide">Pas de photo : la partie est allée trop vite pour le photographe.</p>';
    for(var j=0;j<A.length;j++)html+='<figure><img alt="" src="'+A[j].url+'"><figcaption><b>'+fmt(A[j].t)+'</b> '+A[j].legende+'</figcaption></figure>';
    html+='</div>';
    div.innerHTML=html;
    var stats=document.getElementById('result-stats');
    if(stats&&stats.nextSibling)dlg.insertBefore(div,stats.nextSibling);else dlg.appendChild(div);
    dlg.classList.add('fe-large');
    var figs=div.querySelectorAll('.fe-album figure');
    for(var q=0;q<figs.length;q++)(function(fig){fig.onclick=function(){fig.classList.toggle('fe-zoom');};})(figs[q]);
    if(gagne)feuDArtifice(dlg);
  }
  function feuDArtifice(dlg){
    var c=document.createElement('canvas');c.id='fe-feu';dlg.insertBefore(c,dlg.firstChild);
    var x=c.getContext('2d'),parts=[],t0=performance.now(),dernier=0;
    function taille(){c.width=dlg.clientWidth;c.height=dlg.scrollHeight;}
    taille();
    var couleurs=['#ffe28f','#f2b84b','#ff7b4a','#9fe0ff','#ffffff','#c7f08a','#ff9ad5'];
    function bouquet(){
      var cx=40+Math.random()*(c.width-80),cy=40+Math.random()*Math.min(260,c.height*.4),col=couleurs[Math.floor(Math.random()*couleurs.length)],n=38;
      for(var i=0;i<n;i++){var a=i/n*Math.PI*2,v=1.4+Math.random()*2.2;parts.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:1,c:col});}
    }
    function confetti(){parts.push({x:Math.random()*c.width,y:-8,vx:(Math.random()-.5)*.8,vy:1+Math.random()*1.5,l:2.2,c:couleurs[Math.floor(Math.random()*couleurs.length)],conf:1,r:Math.random()*6});}
    function boucle(now){
      if(!dlg.open||!c.parentNode){feu=null;return;}
      if(c.width!==dlg.clientWidth)taille();
      var age=(now-t0)/1000;
      if(now-dernier>(age<6?420:1400)){dernier=now;bouquet();}
      if(age<10)for(var k=0;k<2;k++)confetti();
      x.clearRect(0,0,c.width,c.height);
      for(var i=parts.length-1;i>=0;i--){var p=parts[i];p.x+=p.vx;p.y+=p.vy;
        if(p.conf){p.r+=.1;p.l-=.004;x.globalAlpha=Math.max(0,Math.min(1,p.l));x.fillStyle=p.c;x.save();x.translate(p.x,p.y);x.rotate(p.r);x.fillRect(-3,-1.5,6,3);x.restore();}
        else{p.vy+=.035;p.vx*=.985;p.l-=.013;x.globalAlpha=Math.max(0,p.l);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,1.8,0,6.283);x.fill();}
        if(p.l<=0||p.y>c.height+10)parts.splice(i,1);}
      x.globalAlpha=1;
      feu=requestAnimationFrame(boucle);
    }
    feu=requestAnimationFrame(boucle);
  }

  function construire(){
    var st=document.createElement('style');
    st.textContent=
      '#fe-medaille{position:fixed;left:50%;top:calc(var(--hud-height,72px) + 14px);transform:translateX(-50%);z-index:47;display:flex;gap:12px;align-items:center;'+
        'background:linear-gradient(135deg,#3a2a12f5,#1b2622f5);border:1px solid #f2cf7b;border-radius:10px;padding:9px 16px 9px 12px;box-shadow:0 8px 30px #000a;pointer-events:none;animation:feArrive .5s ease-out;max-width:min(520px,90vw)}'+
      '#fe-medaille.fe-cache,.fe-cache{display:none!important}'+
      '#fe-medaille>span{font-size:34px;filter:drop-shadow(0 2px 3px #000a)}'+
      '#fe-medaille small{display:block;font:800 9px system-ui;letter-spacing:2px;color:#f2cf7b}'+
      '#fe-medaille b{display:block;font:700 19px Georgia,serif;color:#fff1c9}'+
      '#fe-medaille em{display:block;font:500 11px system-ui;font-style:normal;color:#d8cfb4}'+
      '@keyframes feArrive{0%{opacity:0;transform:translate(-50%,-14px) scale(.85)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}'+
      '#result-dialog.fe-large{max-width:780px}'+
      '#result-dialog>*{position:relative;z-index:1}'+
      '#fe-feu{position:absolute!important;left:0;top:0;z-index:0!important;pointer-events:none}'+
      '#fe-fin{text-align:left;margin-top:18px}'+
      '#fe-fin .fe-honneur{text-align:center;padding:14px 10px 12px;border:1px solid #f2cf7b77;border-radius:10px;background:radial-gradient(ellipse at 50% 0,#f2b84b33,#0000 70%)}'+
      '#fe-fin .fe-honneur span{font-size:40px;display:block}'+
      '#fe-fin .fe-honneur small{display:block;font:800 9px system-ui;letter-spacing:2.4px;color:#f2cf7b;margin-top:4px}'+
      '#fe-fin .fe-honneur b{display:block;font:700 24px Georgia,serif;color:#ffe9b0;margin:4px 0}'+
      '#fe-fin .fe-honneur em{display:block;font:500 12px system-ui;font-style:normal;color:#cfc7ad}'+
      '#fe-fin .fe-perdu{border-color:#c9785b77;background:radial-gradient(ellipse at 50% 0,#c9785b2a,#0000 70%)}'+
      '#fe-fin h4{margin:18px 0 8px;font:800 10px system-ui;letter-spacing:1.6px;color:#d9c08a;display:flex;justify-content:space-between}'+
      '#fe-fin h4 i{font-style:normal;color:#9c957f}'+
      '#fe-fin .fe-titres{display:flex;flex-wrap:wrap;gap:6px}'+
      '#fe-fin .fe-titres span{font:600 11px system-ui;padding:5px 9px;border-radius:14px;background:#f2b84b1f;border:1px solid #f2cf7b55;color:#f5e6c0}'+
      '#fe-fin .fe-album{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}'+
      '#fe-fin figure{margin:0;background:#0004;border:1px solid #d9c08a33;border-radius:6px;overflow:hidden;cursor:zoom-in;transform:rotate(-.6deg)}'+
      '#fe-fin figure:nth-child(2n){transform:rotate(.7deg)}'+
      '#fe-fin figure.fe-zoom{grid-column:1/-1;transform:none;cursor:zoom-out}'+
      '#fe-fin figure img{display:block;width:100%;height:auto}'+
      '#fe-fin figcaption{font:500 10px system-ui;color:#d8cfb4;padding:5px 7px}'+
      '#fe-fin figcaption b{color:#f2cf7b;margin-right:4px}'+
      '#fe-fin .fe-vide{font-size:11px;color:#9c957f;margin:0}';
    document.head.appendChild(st);
    boiteMed=document.createElement('div');boiteMed.id='fe-medaille';boiteMed.className='fe-cache';document.body.appendChild(boiteMed);
  }
  function demarrer(){
    construire();
    setInterval(function(){try{veille();}catch(e){}try{fete();}catch(e){}},400);
  }
  window.FOW_FETE={etat:function(){return etat;},titres:TITRES};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
