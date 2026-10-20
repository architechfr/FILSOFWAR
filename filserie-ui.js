/* FILS OF WAR - les coups de la Filserie (20/10/2026).
 * Florian : « de l'amusement, esprit Sales Fils, des super coups ».
 * La jauge se remplit toute seule (victoires, chantiers, pillages, culture) ; quand elle
 * ne suffit pas, on paie en filsous. Quatre coups : Tournée générale, Mouettes de Sète,
 * Appel du CIO, Grand barbecue. Ce fichier ne fait que l'interface : le moteur décide.
 */
(function(){
  'use strict';
  var ORDRE=['tournee','mouettes','cio','barbecue'];
  var boite=null,jauge=null,valeur=null,boutons={},vise=null,aide=null,annonce=null,vus={},timerAnnonce=0;

  function F(){return window.__FOW__;}
  function jeu(){var f=F();return f&&f.game;}
  function moi(){var f=F();return f&&typeof f.me==='number'?f.me:0;}
  function coups(){return window.FOW_COUPS_DEF||null;}

  function construire(){
    var st=document.createElement('style');
    st.textContent=
      '#fow-filserie{position:fixed;right:18px;bottom:calc(var(--tray-height,172px) + 12px);z-index:40;width:auto;font:600 11px system-ui,sans-serif;color:#efe4c4;'+
        'background:linear-gradient(160deg,#2a1f12f2,#17241ff2);border:1px solid #d9b25f88;border-radius:9px;padding:8px 9px 9px;box-shadow:0 8px 26px #0008}'+
      '#fow-filserie.fs-cache,#fow-fs-aide.fs-cache,#fow-fs-annonce.fs-cache{display:none}'+
      '#fow-filserie h4{margin:0 0 5px;display:flex;justify-content:space-between;align-items:baseline;font:800 10px system-ui;letter-spacing:1.4px;color:#f2cf7b}'+
      '#fow-filserie h4 b{font:700 11px system-ui;color:#fff1c9;letter-spacing:0}'+
      '#fow-filserie .fs-jauge{height:9px;background:#0007;border-radius:5px;overflow:hidden;border:1px solid #f2cf7b44}'+
      '#fow-filserie .fs-jauge i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c9762f,#f2b84b,#ffe28f);transition:width .4s}'+
      '#fow-filserie .fs-jauge.fs-plein i{animation:fsPulse 1s ease-in-out infinite alternate}'+
      '@keyframes fsPulse{from{filter:brightness(1)}to{filter:brightness(1.45)}}'+
      '#fow-filserie .fs-grille{display:grid;grid-template-columns:repeat(4,44px);gap:5px;margin-top:6px}#fow-filserie.fs-plie .fs-grille{display:none}#fow-filserie h4{cursor:pointer;gap:10px}#fow-filserie h4:after{content:"▾";color:#cdb47a;margin-left:2px}#fow-filserie.fs-plie h4:after{content:"▸"}#fow-filserie.fs-plie{padding:6px 9px}'+
      '#fow-filserie button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;width:44px;height:44px;background:#ffffff0d;border:1px solid #d9b25f40;border-radius:8px;padding:0;color:#efe4c4;cursor:pointer;font:600 10px system-ui}#fow-filserie button em{display:none}'+
      '#fow-filserie button span{font-size:19px;line-height:1}'+
      '#fow-filserie button small{font:600 8px system-ui;color:#b9b19a;white-space:nowrap}'+
      '#fow-filserie button.fs-pret{border-color:#f2cf7b;background:#f2b84b26;box-shadow:0 0 10px #f2b84b44 inset}'+
      '#fow-filserie button.fs-pret small{color:#ffe28f}'+
      '#fow-filserie button.fs-payant small{color:#e8d27c}'+
      '#fow-filserie button.fs-non,#fow-filserie button.fs-attente{opacity:.5}'+
      '#fow-filserie button.fs-vise{border-color:#ff7b4a;background:#ff7b4a33}'+
      '#fow-fs-aide{position:fixed;left:50%;top:calc(var(--hud-height,72px) + 64px);transform:translateX(-50%);z-index:45;background:#2a1f12f0;border:1px solid #f2cf7b;border-radius:8px;padding:8px 14px;font:700 12px system-ui;color:#ffe9b0;pointer-events:none;box-shadow:0 6px 20px #0008}'+
      'body.fs-visee #world{cursor:crosshair!important}'+
      '#fow-fs-annonce{position:fixed;left:50%;top:34%;transform:translate(-50%,-50%);z-index:46;text-align:center;pointer-events:none;opacity:1;transition:opacity .5s;animation:fsAnnonce .5s ease-out}'+
      '#fow-fs-annonce.fs-sort{opacity:0}'+
      '#fow-fs-annonce b{display:block;white-space:nowrap;font:900 46px Georgia,serif;letter-spacing:2px;color:#ffe28f;text-shadow:0 3px 0 #7a3d12,0 6px 22px #000c}'+
      '#fow-fs-annonce small{display:block;max-width:560px;margin-left:auto;margin-right:auto;margin-top:6px;font:700 14px system-ui;color:#fff3d1;text-shadow:0 2px 6px #000}'+
      '#fow-fs-annonce.fs-rival b{color:#ffb39a;text-shadow:0 3px 0 #6d1d12,0 6px 22px #000c}'+
      '@keyframes fsAnnonce{0%{transform:translate(-50%,-50%) scale(.6)}60%{transform:translate(-50%,-50%) scale(1.08)}100%{transform:translate(-50%,-50%) scale(1)}}'+
      '#fow-filserie .fs-jauge{width:191px}@media(max-width:900px),(max-height:560px){#fow-filserie{padding:5px 7px}#fow-filserie .fs-grille{grid-template-columns:repeat(4,36px);gap:4px}#fow-filserie button{width:36px;height:36px}#fow-filserie button span{font-size:15px}#fow-filserie .fs-jauge{width:156px}#fow-fs-annonce b{font-size:28px}}';
    document.head.appendChild(st);

    boite=document.createElement('div');boite.id='fow-filserie';boite.className='fs-cache';
    boite.innerHTML='<h4><span>🎉 FILSERIE</span><b>0</b></h4><div class="fs-jauge"><i></i></div><div class="fs-grille"></div>';
    valeur=boite.querySelector('h4 b');jauge=boite.querySelector('.fs-jauge');
    var plie=window.innerWidth<1100||window.innerHeight<600;try{var m=localStorage.getItem('fow.filserie.plie');if(m!=null)plie=m==='1';}catch(e){}
    boite.__plie=plie;boite.querySelector('h4').onclick=function(e){e.stopPropagation();boite.__plie=!boite.__plie;try{localStorage.setItem('fow.filserie.plie',boite.__plie?'1':'0');}catch(e2){}maj();};
    var grille=boite.querySelector('.fs-grille');
    ORDRE.forEach(function(k){
      var b=document.createElement('button');b.type='button';b.className='fs-non';
      b.innerHTML='<span></span><em style="font-style:normal"></em><small></small>';
      b.onclick=function(e){e.stopPropagation();cliquer(k);};
      grille.appendChild(b);boutons[k]=b;
    });
    document.body.appendChild(boite);

    aide=document.createElement('div');aide.id='fow-fs-aide';aide.className='fs-cache';document.body.appendChild(aide);
    annonce=document.createElement('div');annonce.id='fow-fs-annonce';annonce.className='fs-cache';document.body.appendChild(annonce);

    document.addEventListener('pointerdown',viser,true);
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&vise){arreterVisee();e.stopPropagation();}},true);
    document.addEventListener('contextmenu',function(e){if(vise){arreterVisee();e.preventDefault();e.stopPropagation();}},true);
  }

  function dire(t,type){var f=F();if(f&&f.toast)f.toast(t,type||'notice');}

  function cliquer(k){
    var g=jeu(),C=coups();if(!g||!C)return;
    var c=g.coutCoup(moi(),k);
    if(!c.ok){dire(c.reason,'error');return;}
    if(!c.jauge&&(g.players[moi()].resources.gold||0)<C[k].f){dire('Il faut la jauge de Filserie à '+C[k].j+' ou '+C[k].f+' filsous.','error');return;}
    if(!C[k].cible){var r=g.fowCoup(moi(),k);if(!r.ok)dire(r.reason,'error');return;}
    if(vise===k){arreterVisee();return;}
    vise=k;document.body.classList.add('fs-visee');
    aide.textContent=C[k].e+' '+C[k].n+' : clique sur la carte pour viser'+(c.jauge?'':' ('+C[k].f+' ₣)')+' · Échap pour annuler';
    aide.className='';maj();
  }
  function arreterVisee(){vise=null;document.body.classList.remove('fs-visee');aide.className='fs-cache';maj();}
  function viser(e){
    if(!vise)return;
    var f=F(),v=f&&f.view,cv=document.getElementById('world');
    if(e.target!==cv)return;
    if(e.button===2){arreterVisee();return;}
    e.preventDefault();e.stopPropagation();
    var p=v&&v.screenToWorld?v.screenToWorld(e.clientX,e.clientY):null,k=vise;
    arreterVisee();
    if(!p){dire('Vise un point sur la carte.','error');return;}
    var r=jeu().fowCoup(moi(),k,p.x,p.z);
    if(!r.ok)dire(r.reason,'error');
  }

  function annoncer(ev){
    var C=coups();if(!C||!C[ev.kind])return;
    var c=C[ev.kind],mien=ev.owner===moi();
    annonce.className='fs-cache';void annonce.offsetWidth;
    annonce.className=mien?'':'fs-rival';
    annonce.innerHTML='<b>'+c.e+' '+c.n.toUpperCase()+' !</b><small>'+(mien?c.d:'Le rival a frappé : '+c.d.charAt(0).toLowerCase()+c.d.slice(1))+'</small>';
    clearTimeout(timerAnnonce);timerAnnonce=setTimeout(function(){annonce.className+=' fs-sort';timerAnnonce=setTimeout(function(){annonce.className='fs-cache';},600);},2600);
  }

  function maj(){
    var g=jeu(),hud=document.getElementById('hud'),C=coups();
    if(!boite)return;
    if(!g||!g.players||!C||!g.coutCoup||(hud&&hud.hidden)||!document.getElementById('menu')||!document.getElementById('menu').hidden){boite.className='fs-cache';if(vise)arreterVisee();return;}
    var p=g.players[moi()];if(!p){boite.className='fs-cache';return;}
    boite.className=boite.__plie?'fs-plie':'';
    var J=Math.floor(p.filserie||0);
    valeur.textContent=J+' / 100';
    jauge.firstChild.style.width=Math.min(100,J)+'%';
    jauge.className=J>=100?'fs-jauge fs-plein':'fs-jauge';
    ORDRE.forEach(function(k){
      var b=boutons[k],c=C[k],r=g.coutCoup(moi(),k),cls,info;
      if(!r.ok){cls='fs-attente';info=/encore/.test(r.reason)?(r.reason.match(/encore (\d+) s/)||[])[1]+' s':'—';}
      else if(r.jauge){cls='fs-pret';info='prêt';}
      else if((p.resources.gold||0)>=c.f){cls='fs-payant';info=c.f+' ₣';}
      else{cls='fs-non';info='⚡'+c.j;}
      if(vise===k)cls+=' fs-vise';
      if(b.className!==cls)b.className=cls;
      b.firstChild.textContent=c.e;b.children[1].textContent=c.n;b.lastChild.textContent=info;
      b.title=c.n+' — '+c.d+' (jauge '+c.j+' ou '+c.f+' filsous)';
    });
    // annonces des coups (les miens et ceux du rival que je vois)
    var E=g.events||[];
    for(var i=0;i<E.length;i++){var ev=E[i];if(ev.type!=='fowCoup'||vus[ev.id])continue;vus[ev.id]=1;
      if(ev.owner===moi()||(g.isVisible&&g.isVisible(moi(),ev.x,ev.z)))annoncer(ev);}
  }

  function demarrer(){
    // Les coups sont déclarés dans le moteur (FOW_COUPS) ; on les recopie ici à la première partie.
    construire();
    setInterval(function(){
      if(!window.FOW_COUPS_DEF){var g=jeu();if(g&&g.constructor&&g.constructor.COUPS)window.FOW_COUPS_DEF=g.constructor.COUPS;}
      maj();
    },250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
