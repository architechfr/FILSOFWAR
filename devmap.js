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
})();