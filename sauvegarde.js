// FILS OF WAR · la sauvegarde (18/10). Florian : « il faut pouvoir
// sauvegarder, ne pas être obligé de recommencer systématiquement si on
// quitte l'application ».
//
// Le moteur est deterministe (graine, pas fixe de 0,05 s, maths FOWM) : c'est
// ce qui fait marcher le reseau. On s'en sert ici aussi. Plutot que de figer
// tout l'etat du royaume (cartes de chemin, brouillard, caches...), on garde
// le JOURNAL des ordres du joueur : « au pas n, tel ordre ». Reprendre, c'est
// refaire la meme partie en accelere : meme graine, memes ordres aux memes
// pas, et l'IA des Barons rejoue exactement ses coups.
//
// Solo seulement (le reseau ne se reprend pas seul). Une seule partie gardee,
// sur ce telephone (localStorage). Elle s'efface quand la partie est finie.
// Une nouvelle partie ne remplace l'ancienne qu'a son premier ordre : un
// toucher par megarde sur « Fonder mon royaume » ne perd rien.
//
// Branchement : jeu.js cree la partie par FOW_NOUVELLE, qui demande
// FOW_NET.config() puis appelle FOW_NET.brancher(game). On s'intercale :
// pour une reprise, config() rend les options de la partie gardee. Et
// window.__FOW__ (que jeu.js pose a chaque nouvelle partie) nous la signale.
(function(){
  var P=new URLSearchParams(location.search);
  if(P.get('mode')==='reseau')return;
  var CLE='fow.sauvegarde',TICK=0.05;
  var METHODES=['order','train','placeBuilding','foundSettlement','upgradeSettlement','advanceAge','research','trade','rallyVillage'];
  var NIVEAUX=['Nomade','Campement','Maison principale','Hôtel de ville'];
  var suivi=null;       // la partie en cours d'enregistrement
  var reprise=null;     // la sauvegarde qu'on est en train de rejouer
  var fowCourant=null;
  var derniere=null;    // le controle de la derniere reprise (banc d'essai)

  function lire(){try{var s=JSON.parse(localStorage.getItem(CLE)||'null');return s&&s.v===1&&Array.isArray(s.log)?s:null;}catch(e){return null;}}
  function ecrire(s){try{localStorage.setItem(CLE,JSON.stringify(s));return true;}catch(e){return false;}}
  function effacer(){try{localStorage.removeItem(CLE);}catch(e){}majBouton();}

  // L'empreinte des regles : si le moteur change (nouvelle carte, nouvel age),
  // une vieille partie ne se rejouerait plus pareil. On la refuse proprement.
  var reglesCache=null;
  function regles(G){
    if(reglesCache)return reglesCache;
    // La carte vivante (carte.js) fait partie des regles : sa version compte aussi.
    var h=0,noms=Object.getOwnPropertyNames(G.prototype).sort().concat(['carte:'+(window.FOW_CARTE?window.FOW_CARTE.version:'0')]);
    for(var i=0;i<noms.length;i++){
      var f=G.prototype[noms[i]],t=noms[i]+(f&&typeof f==='function'?String(f):'');
      for(var j=0;j<t.length;j++)h=(Math.imul(h,31)+t.charCodeAt(j))|0;
    }
    reglesCache=(h>>>0).toString(36);return reglesCache;
  }
  // Meme empreinte que le reseau : sert a verifier qu'une reprise retombe juste.
  function empreinte(g){
    var h=(g.units.length*7919+g.buildings.length)|0,i,k;
    function mix(v){h=(Math.imul(h,31)+(Math.round((+v||0)*64)|0))|0;}
    for(i=0;i<g.units.length;i++){mix(g.units[i].x);mix(g.units[i].z);mix(g.units[i].hp);}
    for(i=0;i<g.buildings.length;i++){mix(g.buildings[i].hp);mix(g.buildings[i].progress);}
    for(i=0;i<g.players.length;i++){var r=g.players[i].resources;for(k in r)mix(r[k]);}
    return h>>>0;
  }
  function resume(g){
    var p=g.players[0]||{};
    return {niveau:p.homeLevel|0,age:p.age|0,pop:(g.units||[]).filter(function(u){return u.owner===0&&u.hp>0;}).length,temps:Math.round(g.time||0)};
  }

  /* ---- enregistrer ------------------------------------------------------ */
  function enregistrer(g,depart){
    var G=g.constructor,proto=G.prototype;
    var s={g:g,tick:depart?depart.ticks:0,log:depart?depart.log.slice():[],enTick:false,prof:0,
           sale:false,garde:!!depart,options:{difficulty:g.difficulty,seed:g.seed,startRegion:g.startRegion}};
    g._tick=function(dt){
      s.enTick=true;
      try{proto._tick.call(this,dt);}finally{s.enTick=false;}
      s.tick++;
      if(this.result&&suivi===s){suivi=null;effacer();}
    };
    METHODES.forEach(function(m){
      var orig=proto[m];
      g[m]=function(){
        // L'IA des Barons passe aussi par ces portes, mais pendant un pas : elle se rejoue toute seule.
        if(s.enTick||s.prof>0)return orig.apply(this,arguments);
        var args=Array.prototype.slice.call(arguments),r;
        s.prof++;
        try{r=orig.apply(this,args);}finally{s.prof--;}
        if(!(r&&r.ok===false)){
          try{s.log.push([s.tick,m,JSON.parse(JSON.stringify(args))]);}catch(e){}
          s.sale=true;s.garde=true;
        }
        return r;
      };
    });
    suivi=s;
    return s;
  }
  function sauver(){
    var s=suivi;if(!s||!s.garde||s.g.result)return;
    var G=s.g.constructor;
    if(!ecrire({v:1,regles:regles(G),options:s.options,ticks:s.tick,log:s.log,le:Date.now(),
                empreinte:empreinte(s.g),resume:resume(s.g)})){
      s.sale=true;return;
    }
    s.sale=false;
  }
  setInterval(function(){if(suivi&&suivi.sale)sauver();},5000);
  document.addEventListener('visibilitychange',function(){if(document.hidden)sauver();});
  window.addEventListener('pagehide',sauver);

  /* ---- rejouer ---------------------------------------------------------- */
  function voile(texte){
    var v=document.getElementById('fow-reprise');
    if(!v){
      v=document.createElement('div');v.id='fow-reprise';
      v.innerHTML='<div class="fr-boite"><b>Le royaume reprend sa place</b><span class="fr-texte"></span><span class="fr-barre"><i></i></span></div>';
      document.body.appendChild(v);
    }
    v.className=texte==null?'fow-cache':'';
    if(texte!=null)v.querySelector('.fr-texte').textContent=texte;
    return v;
  }
  function rejouer(g,sv){
    var proto=g.constructor.prototype,i=0,t=0,total=sv.ticks,log=sv.log;
    g.paused=true;
    voile('On refait tes '+Math.round(total*TICK/60)+' minutes de règne en accéléré…');
    function tranche(){
      if(window.__FOW__&&window.__FOW__.game!==g)return;   // le joueur est reparti ailleurs
      var fin=performance.now()+120;
      // Les ordres et les pas ne passent que partie en marche ; entre deux tranches, la boucle du jeu
      // trouve la partie en pause et n'avance rien de son cote.
      g.paused=false;
      while(t<total&&performance.now()<fin){
        for(var n=0;n<200&&t<total;n++){
          while(i<log.length&&log[i][0]<=t){
            var e=log[i++];
            try{proto[e[1]].apply(g,e[2]);}catch(err){}
          }
          proto._tick.call(g,TICK);t++;
          if(g.result)break;
        }
        if(g.result)break;
      }
      g.paused=true;
      var b=document.querySelector('#fow-reprise .fr-barre i');
      if(b)b.style.width=Math.round(100*t/Math.max(1,total))+'%';
      if(t<total&&!g.result){setTimeout(tranche,0);return;}
      g.paused=false;
      while(i<log.length){var e2=log[i++];try{proto[e2[1]].apply(g,e2[2]);}catch(err){}}
      terminer(g,sv);
    }
    setTimeout(tranche,30);
  }
  function terminer(g,sv){
    voile(null);reprise=null;
    // Les nouvelles du passe (construit, attaque...) ne doivent pas tomber toutes d'un coup.
    g.events.length=0;
    var juste=empreinte(g)===sv.empreinte;
    derniere={juste:juste,ticks:sv.ticks,ordres:sv.log.length};
    if(!juste)console.warn('FILS OF WAR : la reprise ne retombe pas exactement sur la partie gardée.');
    if(g.result){effacer();return;}
    enregistrer(g,sv);
    g.paused=false;
    var f=window.__FOW__;
    try{f&&f.home&&f.home();}catch(e){}
    try{f&&f.toast&&f.toast('⚔️ Te revoilà. Ton royaume t’attendait, les Barons aussi.','notice',6000);}catch(e){}
  }

  /* ---- le branchement --------------------------------------------------- */
  var net=window.FOW_NET;
  if(net){
    var origConfig=net.config,origBrancher=net.brancher;
    net.config=function(){
      var c=origConfig&&origConfig();
      if(c)return c;
      return reprise?{siege:0,options:reprise.options}:null;
    };
    net.brancher=function(g){
      if(reprise){var sv=reprise;rejouer(g,sv);return;}
      return origBrancher&&origBrancher(g);
    };
  }
  // jeu.js pose window.__FOW__ a la fin de chaque nouvelle partie (et au menu).
  Object.defineProperty(window,'__FOW__',{configurable:true,enumerable:true,
    get:function(){return fowCourant;},
    set:function(v){
      fowCourant=v;
      try{
        if(v&&v.game&&v.mode==='playing'&&!(suivi&&suivi.g===v.game)&&!reprise){
          // Une partie neuve. Si on etait en train de rejouer celle-ci, terminer() la branchera.
          enregistrer(v.game,null);
        }
      }catch(e){}
      majBouton();
    }});

  /* ---- le bouton du menu ------------------------------------------------ */
  function duree(sec){var m=Math.round(sec/60);return m<1?'moins d’une minute':m<60?m+' min':Math.floor(m/60)+' h '+(m%60<10?'0':'')+(m%60);}
  function bouton(){
    var b=document.getElementById('fow-reprendre');
    if(b)return b;
    var start=document.getElementById('start');if(!start||!start.parentNode)return null;
    b=document.createElement('button');b.id='fow-reprendre';b.type='button';
    b.className='primary start-button fow-cache';
    b.innerHTML='<span class="fr-titre">REPRENDRE MA PARTIE</span><small class="fr-detail"></small><span class="arrow">→</span>';
    start.parentNode.insertBefore(b,start);
    b.addEventListener('click',reprendre);
    return b;
  }
  function majBouton(){
    var b=bouton();if(!b)return;
    var sv=lire(),f=window.__FOW__;
    var ok=!!(sv&&f&&f.game&&sv.regles===regles(f.game.constructor));
    if(sv&&f&&f.game&&!ok){effacerVieille();return;}
    b.className='primary start-button'+(ok&&!reprise?'':' fow-cache');
    if(ok){
      var r=sv.resume||{};
      b.querySelector('.fr-detail').textContent=(NIVEAUX[r.niveau]||'Nomade')+(r.age>1?' · Âge '+(r.age===2?'II':'III'):'')+' · '+(r.pop|0)+' habitants · '+duree(r.temps|0)+' de jeu';
    }
  }
  var vieilleDite=false;
  function effacerVieille(){
    try{localStorage.removeItem(CLE);}catch(e){}
    if(!vieilleDite){vieilleDite=true;try{window.__FOW__.toast('Ta partie gardée date d’une ancienne version du royaume : elle ne peut plus reprendre.','notice',7000);}catch(e){}}
    majBouton();
  }
  function reprendre(){
    var sv=lire(),f=window.__FOW__;
    if(!sv||!f||!f.startGame||reprise)return;
    // Ce qu'on joue en ce moment (revenu au menu sans finir) est deja dans la sauvegarde.
    sauver();sv=lire()||sv;
    suivi=null;reprise=sv;
    majBouton();
    try{f.startGame();}catch(e){reprise=null;voile(null);majBouton();}
  }
  setInterval(function(){if(!reprise)majBouton();},2000);
  window.FOW_SAUVEGARDE={lire:lire,sauver:sauver,effacer:effacer,empreinte:empreinte,get suivi(){return suivi;},get reprise(){return reprise;},get derniere(){return derniere;}};
})();
