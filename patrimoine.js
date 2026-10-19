/* FOW - inventaire des ressources et potentiel de civilisation.
 * Les ressources de base restent compatibles avec le moteur existant.
 * Les minerais secondaires sont identifies pour les futures chaines de production.
 */
(function(){
'use strict';
var carte=window.FOW_CARTE;if(!carte||carte.patrimoine)return;
var orig=carte.peupler;
var MINERAIS=['fer','cuivre','zinc'];
function hash(x,z,seed){var a=Math.imul((x*13)|0,73856093)^Math.imul((z*11)|0,19349663)^Math.imul(seed|0,83492791);a=Math.imul(a^(a>>>16),2246822519);return(a^(a>>>13))>>>0;}
carte.peupler=function(game,api){
  orig.call(this,game,api);
  var catalogue={arbres:{},minerais:{},eau:0};
  for(var i=0;i<game.nodes.length;i++){
    var n=game.nodes[i];
    if(n.type==='wood'){
      // Reconnaissance des essences effectivement rendues en 3D.
      n.fowEssence=carte.essence(n);
      catalogue.arbres[n.fowEssence]=(catalogue.arbres[n.fowEssence]||0)+1;
    }
    if(n.type==='stone'||n.type==='gold'){
      var h=hash(n.x,n.z,game.seed),terroir=game.terroirs[n.sectorId]||'vallee';
      n.fowMinerai=n.type==='gold'?'or':MINERAIS[(h+(terroir==='causses'?0:terroir==='ruffes'?1:2))%3];
      catalogue.minerais[n.fowMinerai]=(catalogue.minerais[n.fowMinerai]||0)+1;
    }
  }
  game.fowCatalogue=catalogue;
};
// Fonction pure : doit etre identique sur les deux clients pour un meme terrain.
carte.eauProche=function(game,x,z,rayon){
  rayon=rayon||45;
  var r2=rayon*rayon,step=4;
  if(typeof carte.h!=='function')return false;
  var lac=game.heraultLac;
  if(lac&&Math.pow(lac.x-x,2)+Math.pow(lac.z-z,2)<Math.pow(lac.rayon+rayon,2))return true;
  // L'Herault traverse la carte d'ouest en est dans le moteur existant.
  var zR=game.fowRiverZ?game.fowRiverZ(x):384;
  return Math.abs(z-zR)<=rayon+8;
};
carte.patrimoine=true;
window.FOW_PATRIMOINE={minerais:MINERAIS,essences:['chene','pin','olivier','saule','bouleau'],usage:{
fer:'outillage, armes, acier, blindages',
cuivre:'bronze, cables, electricite',
zinc:'alliages, galvanisation, industrie',
or:'monnaie, echanges, equipements avances',
chene:'charpentes et fortifications',
pin:'construction rapide et combustible',
olivier:'artisanat et richesse agricole',
saule:'berges et amenagements hydrauliques',
bouleau:'artisanat et structures legeres'}};
})();