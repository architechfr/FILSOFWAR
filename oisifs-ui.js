/* FILS OF WAR - les ouvriers oisifs (20/10/2026).
 * Un bouton n'apparaît que si des ouvriers ne font rien : un clic (ou la touche « . »)
 * sélectionne le suivant et centre la caméra dessus. Interface seule.
 */
(function(){
  'use strict';
  var bt=null,rang=0;
  function F(){return window.__FOW__;}
  function oisifs(){
    var f=F(),g=f&&f.game;if(!g||!g.units)return [];
    var me=typeof f.me==='number'?f.me:0,L=[];
    for(var i=0;i<g.units.length;i++){var u=g.units[i];if(u.owner===me&&u.type==='worker'&&u.hp>0&&u.action==='idle'&&!u.isFounder)L.push(u);}
    return L;
  }
  function suivant(){
    var L=oisifs(),f=F();if(!L.length||!f)return;
    rang=(rang+1)%L.length;var u=L[rang];
    if(f.selectIds)f.selectIds([u.id]);
    if(f.view&&f.view.focus)f.view.focus(u.x,u.z);
  }
  function maj(){
    if(!bt)return;
    var hud=document.getElementById('hud'),menu=document.getElementById('menu');
    var L=(hud&&hud.hidden)||(menu&&!menu.hidden)?[]:oisifs();
    var dans=bt.parentNode&&bt.parentNode.classList&&bt.parentNode.classList.contains('selection-shortcuts')?' oi-dans':'';bt.className=(L.length?'':'oi-cache')+dans;
    // la barre de sélection et les raccourcis commencent toujours après la minicarte, quelle que soit la taille du texte
    var mm=document.querySelector('.minimap-panel');if(mm){var rr=mm.getBoundingClientRect().right;if(rr>0&&Math.abs(rr-(maj.r||0))>1){maj.r=rr;document.documentElement.style.setProperty('--fow-map-right',Math.round(rr)+'px');}}
    var t='😴 '+L.length+' oisif'+(L.length>1?'s':'');
    if(bt.firstChild.textContent!==t)bt.firstChild.textContent=t;
  }
  function demarrer(){
    var st=document.createElement('style');
    st.textContent='#fow-oisifs{position:fixed;z-index:39;left:calc(var(--map-size,202px) + 46px);bottom:calc(var(--tray-height,172px) + 58px);display:flex;gap:8px;align-items:center;'+
      'padding:7px 11px;border:1px solid #d9b25f88;background:#2a1f12f0;color:#ffe9b0;font:700 11px system-ui,sans-serif;cursor:pointer;box-shadow:0 3px 12px #0006;animation:oiPouls 1.6s ease-in-out infinite alternate}'+
      '#fow-oisifs.oi-dans{position:static;animation:oiPouls 1.6s ease-in-out infinite alternate}#fow-oisifs kbd{font:600 9px system-ui;border:1px solid #d9b25f55;padding:1px 4px;color:#d9c08a}'+
      '#fow-oisifs.oi-cache{display:none}@keyframes oiPouls{from{box-shadow:0 3px 12px #0006}to{box-shadow:0 0 14px #f2b84b66}}'+
      '@media(max-width:900px){#fow-oisifs{bottom:calc(var(--tray-height,123px) + 40px);font-size:9px;padding:5px 8px}}';
    document.head.appendChild(st);
    bt=document.createElement('button');bt.type='button';bt.id='fow-oisifs';bt.className='oi-cache';
    bt.title='Ouvriers sans travail : clique pour aller au suivant';
    bt.innerHTML='<span></span><kbd>.</kbd>';
    bt.onclick=function(e){e.stopPropagation();suivant();};
    var row=document.querySelector('.selection-shortcuts');if(row){row.appendChild(bt);bt.classList.add('oi-dans');}else document.body.appendChild(bt);
    document.addEventListener('keydown',function(e){
      var t=e.target&&e.target.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
      if(e.key==='.'&&oisifs().length){e.preventDefault();suivant();}
    });
    setInterval(maj,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer);else demarrer();
})();
