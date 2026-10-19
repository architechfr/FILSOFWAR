/* FILS OF WAR - geographie jouable synchronisee avec le plan v0.8.
 * La carte jouable reste 768x768 mais le plan est tourne de 90 degres :
 * nord-sud -> axe X, ouest-est -> axe Z. Cela permet a l'Herault de rester
 * compatible avec le moteur historique riverZ(x), sans perdre les localisations.
 */
(function(root){
'use strict';
var SIZE=768,BOUNDS={west:2.91,east:4.08,north:43.97,south:43.12};
function xy(lat,lon){
  return {
    x:(BOUNDS.north-lat)/(BOUNDS.north-BOUNDS.south)*SIZE,
    z:(lon-BOUNDS.west)/(BOUNDS.east-BOUNDS.west)*SIZE
  };
}
var RAW=[
 ['salagou','Lac du Salagou','lac',43.6558,3.3653,1],
 ['gorges',"Gorges de l'Hérault",'nature',43.779,3.56,1],
 ['saint-guilhem','Saint-Guilhem-le-Désert','village',43.7347,3.5506,1],
 ['pont-diable','Pont du Diable','pont',43.70768,3.55704,1],
 ['viols-fort','Viols-le-Fort','village',43.7433,3.705,1],
 ['viols-laval','Viols-en-Laval','village',43.7516,3.72534,0],
 ['montpellier','Montpellier','ville',43.6108,3.8767,1],
 ['pont-canet','Pont de Canet','pont',43.59786,3.4928,1],
 ['belarga','Bélarga','village',43.5503,3.4893,1],
 ['campagnan','Campagnan','village',43.538,3.4982,1],
 ['saint-pons','Saint-Pons-de-Mauchiens','village',43.51392,3.51279,1],
 ['lavagnac','Château de Lavagnac','chateau',43.5091,3.47485,1],
 ['pezenas','Pézenas','ville',43.4606,3.4236,1],
 ['cap-agde',"Cap d'Agde",'port',43.278,3.513,1],
 ['clermont',"Clermont-l'Hérault",'ville',43.627,3.433,1],
 ['vias','Vias','port',43.312,3.418,1],
 ['sete','Sète','port',43.406,3.699,1],
 ['palavas','Palavas-les-Flots','port',43.529,3.929,1],
 ['narbonne','Narbonne','ville',43.184,3.003,1],
 ['grands-buffets','Les Grands Buffets','merveille',43.176,3.013,1],
 ['beziers','Béziers','ville',43.344,3.216,1],
 ['lodeve','Lodève','ville',43.732,3.321,1],
 ['couvertoirade','La Couvertoirade','chateau',43.911,3.318,1],
 ['valmagne','Abbaye de Valmagne','abbaye',43.487282,3.562223,1],
 ['dolmen-pouget','Dolmen du Pouget','dolmen',43.586541,3.509816,0],
 ['campawood','Campawood','colline',43.546,3.498,1],
 ['vierge-hauteurs','La Vierge des hauteurs','belvedere',43.551,3.488,0],
 ['pensiere','La Pensière','nature',43.559,3.484,0],
 ['moulin-belarga','Moulin de Bélarga','moulin',43.551,3.486,0],
 ['petit-lac-belarga','Petit lac de Bélarga','lac',43.561,3.482,0],
 ['ancien-barrage-belarga','Ancien barrage de Bélarga','passage',43.558,3.479,0]
];
var SITES=RAW.map(function(r){var p=xy(r[3],r[4]);return{id:r[0],name:r[1],kind:r[2],major:!!r[5],lat:r[3],lon:r[4],x:p.x,z:p.z};});
var BY={};for(var i=0;i<SITES.length;i++)BY[SITES[i].id]=SITES[i];
var RIVER_RAW=[
 [3.572,43.841],[3.558,43.826],[3.57,43.818],[3.554,43.806],[3.579,43.792],[3.557,43.779],
 [3.544,43.767],[3.573,43.759],[3.547,43.749],[3.556,43.741],[3.532,43.731],[3.559,43.724],
 [3.536,43.717],[3.55704,43.70768],[3.546,43.692],[3.535,43.679],[3.539,43.664],[3.529,43.65],
 [3.532,43.635],[3.509,43.624],[3.517,43.61],[3.4928,43.59786],[3.494,43.582],[3.481,43.566],
 [3.482,43.55],[3.472,43.527],[3.456,43.508],[3.435,43.482],[3.429,43.455],[3.441,43.423],
 [3.468,43.385],[3.465,43.347],[3.474,43.308],[3.473,43.277]
];
var RIVER=RIVER_RAW.map(function(p){return xy(p[1],p[0]);}).sort(function(a,b){return a.x-b.x;});
function riverZ(x){
  x=Math.max(0,Math.min(SIZE,x));
  if(x<=RIVER[0].x)return RIVER[0].z;
  for(var i=1;i<RIVER.length;i++){
    if(x<=RIVER[i].x){
      var a=RIVER[i-1],b=RIVER[i],t=(x-a.x)/(b.x-a.x||1);
      return a.z+(b.z-a.z)*t;
    }
  }
  return RIVER[RIVER.length-1].z;
}
function coastX(z){
  // Bande littorale volontairement courte pour garder le continent jouable :
  // plage de 12-18 m puis mer sur l'extreme sud (x eleve apres rotation).
  return 738+Math.sin(z*.018)*7+Math.sin(z*.006+1.3)*4;
}
function isSea(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&x>coastX(z);}
function isBeach(x,z){var c=coastX(z);return x>c-16&&x<=c;}
var BRIDGES=['pont-diable','pont-canet','ancien-barrage-belarga'].map(function(id){return Math.round(BY[id].x);});
// Deux franchissements de gameplay supplementaires, places sur les axes commerciaux,
// mais le plan distingue clairement les trois passages geographiques nommes.
BRIDGES.push(Math.round(BY.clermont.x),Math.round(BY.pezenas.x));
BRIDGES=BRIDGES.filter(function(v,i,a){return a.indexOf(v)===i;}).sort(function(a,b){return a-b;});
function nearest(x,z,ids){
  var list=ids?ids.map(function(id){return BY[id];}).filter(Boolean):SITES,b=null,d=Infinity;
  for(var i=0;i<list.length;i++){var p=list[i],dx=x-p.x,dz=z-p.z,q=dx*dx+dz*dz;if(q<d){d=q;b=p;}}
  return b;
}
root.FOW_GEO_PLAYABLE=Object.freeze({SIZE:SIZE,bounds:BOUNDS,sites:SITES,byId:BY,river:RIVER,riverZ:riverZ,bridges:BRIDGES,coastX:coastX,isSea:isSea,isBeach:isBeach,xy:xy,nearest:nearest});
})(window);