/* FILS OF WAR - commander ses troupes, au doigt comme à la souris (20/10/2026).
 * Florian : « sur téléphone je n'arrive pas à sélectionner plusieurs troupes » et « des
 * formations militaires connues : les tireurs derrière, les fantassins devant ».
 *  - bouton ⬚ : le prochain glisser du doigt trace un cadre et sélectionne les troupes dedans ;
 *  - quand plusieurs soldats sont choisis : tri par catégorie et choix de la formation
 *    (ligne de bataille, colonne de marche, carré, coin). La formation s'applique à chaque
 *    ordre de marche et la troupe se range tout de suite sur place.
 */
(function(){
  'use strict';
  var FORMES=[['ligne','▤','Ligne de bataille','Fantassins devant, tireurs derrière, cavaliers sur les ailes, siège et curés à l’arrière.'],
              ['colonne','⇣','Colonne de marche','Étroite et rapide pour passer un pont ou une porte : cavaliers en tête.'],
              ['carre','▣','Carré','Fantassins et cavaliers tout autour, tireurs et curés protégés au centre.'],
              ['coin','▲','Coin','Pointe de cavaliers et de fantassins pour percer une ligne, tireurs derrière.']];
  var CAT=[['tout','⚔️','Toute l’armée',null],['infantry','🛡️','Fantassins',['infantry']],['slinger','🏹','Tireurs',['slinger']],['cavalry','🐎','Cavaliers',['cavalry']],['siege','🪨','Siège et curés',['ram','catapult','priest']]];
  var MIL=['infantry','slinger','cavalry','ram','catapult','priest'];
  var barre=null,lasso=null,actif=false,depart=null,boite=null;
  window.FOW_FORMATION=window.FOW_FORMATION||'ligne';
  try{var f0=localStorage.getItem('fow.formation');if(f0)window.FOW_FORMATION=f0;}catch(e){}
  function F(){return window.__FOW__;}
  function moi(){var f=F();return f&&typeof f.me==='number'?f.me:0;}
  function dire(t,k){var f=F();if(f&&f.toast)f.toast(t,k||'notice');}
  function selection(){var f=F(),g=f&&f.game;if(!g||!f.selection)return [];return f.selection.map(function(id){return g.getEntity(id);}).filter(function(e){return e&&e.owner===moi()&&e.hp>0&&MIL.indexOf(e.type)>=0;});}
  function armee(){var g=F()&&F().game;return g?g.units.filter(function(u){return u.owner===moi()&&u.hp>0&&MIL.indexOf(u.type)>=0;}):[];}

  function construire(){
    var st=document.createElement('style');
    st.textContent='#fow-troupes{position:fixed;z-index:39;left:calc(var(--fow-map-right,220px) + 10px);bottom:calc(var(--tray-height,172px) + 52px);display:flex;gap:4px;flex-wrap:wrap;align-items:center;max-width:calc(100vw - var(--fow-map-right,220px) - 30px)}'+
      '#fow-troupes.tr-cache{display:none}#fow-troupes b{font:700 9px system-ui;letter-spacing:1px;color:#cdb47a;margin:0 2px 0 6px}'+
      '#fow-troupes button,#fow-lasso{background:#14201eef;border:1px solid #ccbb8b42;color:#efe4c4;font:600 11px system-ui,sans-serif;padding:6px 8px;cursor:pointer;display:flex;gap:4px;align-items:center;box-shadow:0 2px 9px #0003}'+
      '#fow-troupes button.tr-on{border-color:#d5ba7f;background:#6c5c30;color:#fff1c9}'+
      '#fow-troupes button i{font-style:normal;font-size:9px;color:#b9b19a}'+
      '#fow-lasso.tr-on{border-color:#f2cf7b;background:#6c5c30;box-shadow:0 0 12px #f2b84b66}'+
      '#fow-lasso-cadre{position:fixed;border:2px dashed #f2cf7b;background:#f2cf7b22;pointer-events:none;z-index:60;display:none}'+
      '@media(max-width:900px),(max-height:560px){#fow-troupes{bottom:calc(var(--tray-height,123px) + 38px)}#fow-troupes button,#fow-lasso{padding:4px 6px;font-size:9px}#fow-troupes .tr-long{display:none}}';
    document.head.appendChild(st);
    barre=document.createElement('div');barre.id='fow-troupes';barre.className='tr-cache';document.body.appendChild(barre);
    barre.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;e.stopPropagation();
      if(b.dataset.forme)choisirForme(b.dataset.forme);else if(b.dataset.cat)filtrer(b.dataset.cat);});
    lasso=document.createElement('button');lasso.type='button';lasso.id='fow-lasso';lasso.title='Sélection multiple : glisse le doigt pour encadrer tes troupes';
    lasso.innerHTML='⬚<span class="tr-long"> Cadre</span>';
    lasso.onclick=function(e){e.stopPropagation();actif=!actif;lasso.className=actif?'tr-on':'';if(actif)dire('Sélection multiple : glisse le doigt sur la carte pour encadrer tes troupes.');};
    var row=document.querySelector('.selection-shortcuts');if(row)row.insertBefore(lasso,row.firstChild);else document.body.appendChild(lasso);
    boite=document.createElement('div');boite.id='fow-lasso-cadre';document.body.appendChild(boite);
    var cv=document.getElementById('world');
    cv.addEventListener('pointerdown',function(e){if(!actif)return;e.preventDefault();e.stopPropagation();depart={x:e.clientX,y:e.clientY,id:e.pointerId};try{cv.setPointerCapture(e.pointerId);}catch(x){}cadre(e);},true);
    cv.addEventListener('pointermove',function(e){if(!actif||!depart||e.pointerId!==depart.id)return;e.preventDefault();e.stopPropagation();cadre(e);},true);
    cv.addEventListener('pointerup',function(e){if(!actif||!depart||e.pointerId!==depart.id)return;e.preventDefault();e.stopPropagation();finir(e);},true);
    cv.addEventListener('pointercancel',function(){depart=null;boite.style.display='none';},true);
  }
  function cadre(e){var x1=Math.min(depart.x,e.clientX),y1=Math.min(depart.y,e.clientY),x2=Math.max(depart.x,e.clientX),y2=Math.max(depart.y,e.clientY);
    boite.style.display='block';boite.style.left=x1+'px';boite.style.top=y1+'px';boite.style.width=(x2-x1)+'px';boite.style.height=(y2-y1)+'px';}
  function finir(e){
    var f=F(),g=f&&f.game,v=f&&f.view;boite.style.display='none';
    var x1=Math.min(depart.x,e.clientX),y1=Math.min(depart.y,e.clientY),x2=Math.max(depart.x,e.clientX),y2=Math.max(depart.y,e.clientY);depart=null;
    if(!g||!v)return;
    if(x2-x1<12&&y2-y1<12){x1-=30;x2+=30;y1-=30;y2+=30;}
    var dedans=g.units.filter(function(u){if(u.owner!==moi()||!(u.hp>0))return false;var p=v.worldToScreen(u.x,u.z,.6);return p&&p.x>=x1&&p.x<=x2&&p.y>=y1&&p.y<=y2;});
    var mil=dedans.filter(function(u){return MIL.indexOf(u.type)>=0;}),choix=mil.length?mil:dedans;
    actif=false;lasso.className='';
    if(!choix.length){dire('Aucune de tes unités dans le cadre.','error');return;}
    f.selectIds(choix.map(function(u){return u.id;}));
    dire(choix.length+(mil.length?' soldat':' unité')+(choix.length>1?'s':'')+' sélectionné'+(choix.length>1?'s':'')+'. Touche le sol pour les envoyer'+(mil.length>1?' en formation.':'.'));
  }
  function choisirForme(k){
    window.FOW_FORMATION=k;try{localStorage.setItem('fow.formation',k);}catch(e){}
    var S=selection(),f=F(),g=f&&f.game;
    if(S.length>1&&g){
      // la troupe se range tout de suite, sur place, face à sa direction de marche
      var cx=0,cz=0;S.forEach(function(u){cx+=u.x;cz+=u.z;});cx/=S.length;cz/=S.length;
      var r=g.order(S.map(function(u){return u.id;}),{type:'move',x:cx,z:cz,formation:k});
      var F2=FORMES.filter(function(x){return x[0]===k;})[0];
      dire((r&&r.ok?'Formation : ':'')+F2[2]+'. '+F2[3],r&&r.ok?'notice':'error');
    }
    maj();
  }
  function filtrer(c){
    var f=F();if(!f)return;var C=CAT.filter(function(x){return x[0]===c;})[0],base=armee();
    var L=C[3]?base.filter(function(u){return C[3].indexOf(u.type)>=0;}):base;
    if(!L.length){dire('Aucun '+C[2].toLowerCase()+' dans ton armée.','error');return;}
    f.selectIds(L.map(function(u){return u.id;}));
  }
  function maj(){
    if(!barre)return;
    var hud=document.getElementById('hud'),menu=document.getElementById('menu'),S=(hud&&hud.hidden)||(menu&&!menu.hidden)?[]:selection(),A=S.length?armee():[];
    if(lasso)lasso.style.display=(hud&&hud.hidden)?'none':'';
    if(S.length<2){barre.className='tr-cache';return;}
    barre.className='';
    var compte={};A.forEach(function(u){compte[u.type]=(compte[u.type]||0)+1;});
    var h='<b>FORMATION</b>';
    FORMES.forEach(function(x){h+='<button type="button" data-forme="'+x[0]+'" class="'+(window.FOW_FORMATION===x[0]?'tr-on':'')+'" title="'+x[2]+' : '+x[3]+'">'+x[1]+'<span class="tr-long"> '+x[2].split(' ')[0]+'</span></button>';});
    h+='<b>CHOISIR</b>';
    CAT.forEach(function(x){var n=x[3]?x[3].reduce(function(a,t){return a+(compte[t]||0);},0):A.length;if(!n)return;h+='<button type="button" data-cat="'+x[0]+'" title="'+x[2]+'">'+x[1]+'<i>'+n+'</i></button>';});
    if(barre.__h!==h){barre.__h=h;barre.innerHTML=h;}
  }
  function demarrer(){construire();setInterval(maj,400);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
