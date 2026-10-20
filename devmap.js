/* FILS OF WAR - diagnostic de carte, uniquement sur ?devmap=1 en solo.
 * N'affecte ni le moteur, ni les parties classiques, ni le multijoueur.
 * Le joueur voit les paysages et les emplacements, mais aucune unite ne gagne
 * de capacite speciale en dehors de cette session de developpement.
 */
(function(){
'use strict';
var params=new URLSearchParams(location.search);
if(params.get('devmap')!=='1'||params.get('mode')==='reseau')return;
var overlay=document.createElement('div');
overlay.textContent='DEV · CARTE DÉVOILÉE';
overlay.style.cssText='position:fixed;right:12px;bottom:12px;z-index:99999;background:#213a2ecc;color:#f7e7b8;padding:4px 7px;border:1px solid #b8a06b88;border-radius:5px;font:600 9px system-ui;letter-spacing:.4px;pointer-events:none;text-align:center;box-shadow:0 2px 8px #0005;opacity:.72';
document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(overlay)});
function expose(game){
 if(!game||!Array.isArray(game.fog)||game.__fowDevRevealed)return;
 game.__fowDevRevealed=true;
 var last=game._updateFog;
 // Diagnostic local : seule la connaissance du joueur 0 change.
 game._updateFog=function(){
   var result=last.apply(this,arguments);
   var idx=this.fog&&this.fog[0];
   if(idx){idx.fill(2);if(this._visibleCells&&this._visibleCells[0])this._visibleCells[0]=[];this.fogRevision++;}
   return result;
 };
 if(game.fog[0]){game.fog[0].fill(2);game.fogRevision++;}
}
var desc=Object.getOwnPropertyDescriptor(window,'__FOW__');
if(desc&&desc.configurable===false)return;
var oldGet=desc&&desc.get,oldSet=desc&&desc.set,stored;
Object.defineProperty(window,'__FOW__',{configurable:true,enumerable:true,
 get:function(){return oldGet?oldGet.call(window):stored},
 set:function(v){
   if(oldSet)oldSet.call(window,v);else stored=v;
   if(v&&v.game)expose(v.game);
 }
});
window.FOW_DEV_MAP=true;

/* 20/10 (Florian) : en mode developpement, tout se termine instantanement
 * (constructions, recrutements, ameliorations, maison principale, ages)
 * et un bouton remplit les reserves. Joueur 0 seulement, en solo. */
var instant=true;
function finir(){
 var F=window.__FOW__,g=F&&F.game;if(!g||!g.players||!g.players[0]||g.result)return;
 var p=g.players[0],change=false;
 for(var i=0;i<g.buildings.length;i++){
   var b=g.buildings[i];if(b.owner!==0||!(b.hp>0))continue;
   if(!b.complete){
     b.progress=1;b.complete=true;b.hp=b.maxHp;change=true;
     if(b.type==='townhall'&&p.homeLevel===0){p.homeLevel=1;p.foundedAt=g.time;var f=g.getEntity&&g.getEntity(p.founderId);if(f)f.isFounder=false;}
     try{g._event('build',{owner:0,x:b.x,z:b.z,buildingType:b.type,complete:true,text:'Construction terminée (mode dev).'});}catch(e){}
   }
   if(b.research)b.research.progress=1;
   for(var q=0;q<b.queue.length;q++)b.queue[q].progress=1;
 }
 if(p.settlementUpgrade)p.settlementUpgrade.progress=1;
 if(p.research)p.research.progress=1;
 if(change){try{g._updatePopulation();g._updateFog();}catch(e){}}
}
function remplir(){
 // 21/10 : dans le mode Clash, le bouton remplit le village Clash
 if(window.FOW_CLASH_UI&&window.FOW_CLASH_UI.actif){window.FOW_CLASH_UI.dev('remplir');return;}
 var F=window.__FOW__,g=F&&F.game;if(!g||!g.players||!g.players[0])return;
 var r=g.players[0].resources;for(var k in r)if(Object.prototype.hasOwnProperty.call(r,k))r[k]+=1000;
 try{F.toast('Mode dev : +1000 de chaque ressource.','notice',2500);}catch(e){}
}
setInterval(function(){if(instant)finir();},200);
window.FOW_DEV={finir:finir,remplir:remplir};
var panneau=document.createElement('div');
panneau.style.cssText='position:fixed;right:12px;bottom:36px;z-index:99999;display:flex;gap:6px;font:600 10px system-ui';
function bouton(txt,fn){var b=document.createElement('button');b.type='button';b.textContent=txt;
 b.style.cssText='background:#213a2eee;color:#f7e7b8;border:1px solid #b8a06b;border-radius:5px;padding:6px 9px;cursor:pointer;font:inherit';
 b.onclick=function(e){e.stopPropagation();fn(b);};panneau.appendChild(b);return b;}
function libelle(b){b.textContent=instant?'⚡ Instantané : OUI':'⚡ Instantané : NON';b.style.opacity=instant?'1':'.65';}
var bInst=bouton('',function(b){instant=!instant;libelle(b);if(window.FOW_CLASH)window.FOW_CLASH.reglages.instant=instant;if(instant)finir();});libelle(bInst);
bouton('💰 +1000 de tout',remplir);
document.addEventListener('DOMContentLoaded',function(){document.body.appendChild(panneau)});
})();