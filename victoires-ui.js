/* FILS OF WAR - le tableau des victoires (20/10/2026).
 * Florian : « on n'est pas obligé d'écraser l'autre ». Quatre chemins de plus que la
 * conquête : la culture, la merveille (Les Grands Buffets), la science (l'Observatoire
 * du Pic Saint-Loup) et le trésor. Ce panneau ne fait que lire la partie.
 */
(function(){
  'use strict';
  var CULTURE=12000,TRESOR=15000,TENIR=180,OBSERVER=150;
  var ouvert=false,boite=null,corps=null;
  function fmt(s){s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
  function nb(n){return Math.floor(n).toLocaleString('fr-FR');}
  function barre(r){r=Math.max(0,Math.min(1,r||0));return '<i class="fv-barre"><b style="width:'+(r*100).toFixed(1)+'%"></b></i>';}
  function etat(g,o){
    var p=g.players[o],V=p.fowV||{culture:0,cps:0,tresor:0,merv:0,obs:0},B=g.buildings;
    function trouve(t){for(var i=0;i<B.length;i++){var b=B[i];if(b.owner===o&&b.type===t&&b.hp>0)return b;}return null;}
    var mv=trouve('merveille'),ob=trouve('observatoire'),techs=0,total=0;
    for(var k in (p.tech||{}))if(p.tech[k])techs++;
    total=9;
    var merv=!mv?{t:p.age>=3?'à bâtir':'Âge III',r:0}:!mv.complete?{t:'chantier '+Math.round(mv.progress*100)+' %',r:mv.progress*.5}:{t:'debout '+fmt(V.merv)+' / 3:00',r:.5+V.merv/TENIR*.5};
    var cs=trouve('centrespatial'),fus=cs&&cs.research&&cs.research.kind==='labo:fusee'?cs.research:null;
    var sci=fus?{t:'🚀 compte à rebours '+Math.round(fus.progress*100)+' %',r:.8+fus.progress*.2}:cs?{t:cs.complete?'centre spatial prêt':'centre spatial '+Math.round(cs.progress*100)+' %',r:.6+(cs.complete?.2:cs.progress*.2)}:{t:(['','Âge I','Âge II','Âge III','Âge IV','Âge V'][p.age]||'')+(ob&&ob.complete?' · observatoire':''),r:Math.min(.6,(p.age-1)*.12+(ob&&ob.complete?.1:0))};
    var tre=V.tresor>0?{t:'tenu '+fmt(V.tresor)+' / 3:00',r:.5+V.tresor/TENIR*.5}:{t:nb(p.resources.gold)+' / 15 000 ₣',r:Math.min(1,p.resources.gold/TRESOR)*.5};
    return {culture:{t:nb(V.culture)+' / 12 000 · +'+(V.cps||0).toFixed(1)+'/s · '+(V.nbIllustres||0)+' 🌟',r:V.culture/CULTURE},merveille:merv,science:sci,tresor:tre,nom:p.name};
  }
  function construire(){
    var st=document.createElement('style');
    st.textContent='#fow-victoires{position:fixed;top:82px;right:64px;z-index:40;font:600 11px system-ui,sans-serif;color:#efe4c4}'+
      '#fow-victoires>button{background:#17241fe8;border:1px solid #b8a06b88;color:#f2e2b0;border-radius:6px;padding:7px 10px;font:700 11px system-ui;cursor:pointer;letter-spacing:.4px}'+
      '#fow-victoires .fv-corps{margin-top:6px;width:250px;background:#17241ff0;border:1px solid #b8a06b66;border-radius:8px;padding:9px 10px;box-shadow:0 8px 24px #0007}'+
      '#fow-victoires .fv-cache{display:none}#fow-victoires .fv-l{display:grid;grid-template-columns:20px 1fr;gap:2px 6px;margin:5px 0}'+
      '#fow-victoires .fv-l small{grid-column:2;color:#b9b19a;font-weight:500}#fow-victoires .fv-barre{grid-column:2;display:block;height:5px;background:#ffffff1a;border-radius:3px;overflow:hidden}'+
      '#fow-victoires .fv-barre b{display:block;height:100%;background:linear-gradient(90deg,#c9a45a,#f1d48b)}#fow-victoires .fv-riv b{background:#d9714f}'+
      '#fow-victoires h4{margin:0 0 4px;font:700 10px system-ui;letter-spacing:1px;color:#cdb47a}';
    document.head.appendChild(st);
    boite=document.createElement('div');boite.id='fow-victoires';boite.className='fv-cache';
    var bt=document.createElement('button');bt.type='button';bt.textContent='🏆 Victoires';
    bt.onclick=function(e){e.stopPropagation();ouvert=!ouvert;corps.className=ouvert?'fv-corps':'fv-corps fv-cache';maj();};
    corps=document.createElement('div');corps.className='fv-corps fv-cache';
    boite.appendChild(bt);boite.appendChild(corps);document.body.appendChild(boite);
  }
  function ligne(ic,nom,a,b){
    return '<div class="fv-l"><span>'+ic+'</span><span>'+nom+' · '+a.t+'</span>'+barre(a.r)+'<small>Rival : '+b.t+'</small><span class="fv-riv" style="grid-column:2">'+barre(b.r)+'</span></div>';
  }
  function maj(){
    var F=window.__FOW__,g=F&&F.game,hud=document.getElementById('hud');
    if(!boite)return;
    if(!g||!g.players||(hud&&hud.hidden)){boite.className='fv-cache';return;}
    boite.className='';
    if(!ouvert)return;
    var moi=typeof F.me==='number'?F.me:0,lui=1-moi,a=etat(g,moi),b=etat(g,lui);
    corps.innerHTML='<h4>LES CHEMINS DE LA VICTOIRE</h4>'+
      ligne('🎭','Culture',a.culture,b.culture)+ligne('🏛️','Merveille',a.merveille,b.merveille)+
      ligne('🚀','Technologie',a.science,b.science)+ligne('💰','Trésor',a.tresor,b.tresor)+
      '<small style="color:#9c957f">Et toujours la conquête : abattre le cœur du camp rival.</small>';
  }
  function demarrer(){construire();setInterval(maj,500);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
