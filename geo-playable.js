/* FILS OF WAR - geographie jouable synchronisee avec le plan v0.8.
 * 19/10 soir (Florian) : la carte se lit enfin comme une carte. Le nord est en
 * haut, l'est a droite : x = ouest -> est, z = nord -> sud. L'Herault coule du
 * nord au sud et se jette dans la mer, au sud. Deux ponts seulement : le Pont du
 * Diable et le Pont de Canet ; les autres se construiront en jouant.
 * La riviere horizontale du moteur historique (riverZ) est neutralisee : le
 * fleuve est decrit ici (riverX, riverDist, terrainRiviere) et lu par le moteur.
 */
(function(root){
'use strict';
// Le sud est cale pour que le Cap d'Agde touche la cote (z ~ 700).
var SIZE=768,BOUNDS={west:2.91,east:4.08,north:43.97,south:43.21};
function xy(lat,lon){
  return {
    x:(lon-BOUNDS.west)/(BOUNDS.east-BOUNDS.west)*SIZE,
    z:(BOUNDS.north-lat)/(BOUNDS.north-BOUNDS.south)*SIZE
  };
}
// Les reperes poses en dur par les anciennes couches (nord-sud sur x, est sur z).
function depuisAncien(x,z){return {x:z,z:x*(.85/(BOUNDS.north-BOUNDS.south))};}
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
// La cote : une ligne de plage presque droite au sud, avec de longues ondulations.
function coastZ(x){return 712+Math.sin(x*.017)*6+Math.sin(x*.0061+1.3)*4;}
// Sete (20/10, Florian) : le Mont Saint-Clair, une colline posee dans la mer,
// reliee a la cote par un lido de sable.
var SETE={x:518,z:736,r:17,lidoDemi:4};
function seteD(x,z){var dx=(x-SETE.x)/1.25,dz=z-SETE.z;return Math.sqrt(dx*dx+dz*dz);}
function surLido(x,z){return Math.abs(x-SETE.x)<SETE.lidoDemi&&z>coastZ(x)-2&&z<SETE.z;}
function surSete(x,z){return seteD(x,z)<SETE.r||surLido(x,z);}
// 20/10 soir (Florian) : les etangs du littoral, minces et longs, derriere un lido de sable.
var ETANGS=[{n:'Étang de Vendres',x:150,a:26,w:5},{n:'Étang du Bagnas',x:400,a:14,w:4},{n:'Étang de Thau',x:462,a:44,w:7},{n:'Étang de Vic',x:640,a:30,w:5},{n:'Étang de Pierre-Blanche',x:712,a:22,w:4}];
function etangBord(E,x){var dx=(x-E.x)/E.a;if(dx<=-1||dx>=1)return null;var hw=E.w*Math.sqrt(1-dx*dx),zs=coastZ(x)-5;return {zn:zs-2*hw,zs:zs};}
function etang(x,z){if(!Number.isFinite(x)||!Number.isFinite(z))return null;for(var i=0;i<ETANGS.length;i++){var b=etangBord(ETANGS[i],x);if(b&&z>b.zn&&z<b.zs)return ETANGS[i];}return null;}
function isSea(x,z){return Number.isFinite(x)&&Number.isFinite(z)&&(z>coastZ(x)&&!surSete(x,z)||!!etang(x,z));}
function isBeach(x,z){var c=coastZ(x);if(z>c-16&&z<=c)return true;if(surLido(x,z))return true;var d=seteD(x,z);return d>=SETE.r-4&&d<SETE.r;}
// La hauteur du Mont Saint-Clair (0 hors de la colline).
function hauteurSete(x,z){var d=seteD(x,z);if(d>=SETE.r-3)return 0;var k=1-d/(SETE.r-3);return 15*k*k*(3-2*k);}
var SITES=RAW.map(function(r){
  var p=xy(r[3],r[4]),c=coastZ(p.x);
  // Les ports sont au bord de l'eau ; ce qui tomberait en mer revient sur la plage.
  if(r[2]==='port')p.z=c-14;else if(p.z>c-14)p.z=c-14;
  return{id:r[0],name:r[1],kind:r[2],major:!!r[5],lat:r[3],lon:r[4],x:p.x,z:p.z};
});
var BY={};for(var i=0;i<SITES.length;i++)BY[SITES[i].id]=SITES[i];
// 20/10 (Florian) : le Salagou n'est pas colle a l'Herault, il est en haut a gauche,
// entre quatre secteurs pour que son eau ne noie aucun coeur de secteur.
BY.salagou.x=256;BY.salagou.z=184;
BY.sete.x=SETE.x;BY.sete.z=SETE.z;
// Le Pic Saint-Loup : le plus haut sommet de la carte, en haut a droite.
var PIC=(function(){var q=xy(43.8,3.81);return {x:q.x,z:q.z,h:52,rx:46,rz:36,nom:'Pic Saint-Loup'};})();
// L'Herault, de la Montagne jusqu'a la mer (lon, lat), du nord au sud.
var RIVER_RAW=[
 [3.584,43.975],[3.566,43.93],[3.578,43.885],[3.562,43.858],
 [3.572,43.841],[3.558,43.826],[3.57,43.818],[3.554,43.806],[3.579,43.792],[3.557,43.779],
 [3.544,43.767],[3.573,43.759],[3.547,43.749],[3.556,43.741],[3.532,43.731],[3.559,43.724],
 [3.536,43.717],[3.55704,43.70768],[3.546,43.692],[3.535,43.679],[3.539,43.664],[3.529,43.65],
 [3.532,43.635],[3.509,43.624],[3.517,43.61],[3.4928,43.59786],[3.494,43.582],[3.481,43.566],
 [3.482,43.55],[3.472,43.527],[3.456,43.508],[3.435,43.482],[3.429,43.455],[3.441,43.423],
 [3.468,43.385],[3.465,43.347],[3.474,43.308],[3.473,43.277],[3.47,43.24],[3.468,43.205]
];
var RIVER=RIVER_RAW.map(function(p){return xy(p[1],p[0]);}).sort(function(a,b){return a.z-b.z;});
var RW=5.5;
// Table au demi-metre : position du fleuve et pente, pour un calcul rapide et identique partout.
var TN=SIZE*2+1,TX=new Float64Array(TN),TS=new Float64Array(TN);
(function(){
  for(var k=0;k<TN;k++){
    var z=k/2,x=RIVER[0].x,s=0;
    if(z>=RIVER[RIVER.length-1].z){x=RIVER[RIVER.length-1].x;}
    else if(z>RIVER[0].z){
      for(var i=1;i<RIVER.length;i++)if(z<=RIVER[i].z){
        var a=RIVER[i-1],b=RIVER[i],t=(z-a.z)/(b.z-a.z||1);
        // Un lissage doux (Catmull-Rom) pour des meandres sans angles.
        var a0=RIVER[Math.max(0,i-2)],b1=RIVER[Math.min(RIVER.length-1,i+1)],t2=t*t,t3=t2*t;
        x=.5*((2*a.x)+(-a0.x+b.x)*t+(2*a0.x-5*a.x+4*b.x-b1.x)*t2+(-a0.x+3*a.x-3*b.x+b1.x)*t3);
        break;
      }
    }
    TX[k]=x;
  }
  // Le coeur des 24 secteurs du moteur reste au sec : le fleuve s'en ecarte doucement.
  var ROWS=[96,272,496,672];
  for(var r=0;r<ROWS.length;r++)for(var c=0;c<6;c++){
    var sx=64+128*c,sz=ROWS[r],d=TX[sz*2]-sx,ad=Math.abs(d);
    if(ad>=24)continue;
    var push=(d<0?-1:1)*(24-ad);
    for(var q=0;q<TN;q++){var dz=(q/2-sz)/44;if(dz>-3&&dz<3)TX[q]+=push*Math.exp(-dz*dz);}
  }
  // Un lissage de 12 m : les meandres restent, les zigzags du releve disparaissent.
  var SM=new Float64Array(TN);
  for(var u=0;u<TN;u++){var acc=0,n=0;for(var v=-12;v<=12;v++){var w=u+v;if(w<0||w>=TN)continue;var wt=13-Math.abs(v);acc+=TX[w]*wt;n+=wt;}SM[u]=acc/n;}
  for(var u2=0;u2<TN;u2++)TX[u2]=SM[u2];
  for(var j=0;j<TN;j++){var j0=Math.max(0,j-4),j1=Math.min(TN-1,j+4);TS[j]=(TX[j1]-TX[j0])/((j1-j0)/2);}
})();
function idx(z){var k=Math.round(z*2);return k<0?0:k>=TN?TN-1:k;}
function riverX(z){if(!Number.isFinite(z))return RIVER[0].x;var g=z*2;if(g<=0)return TX[0];if(g>=TN-1)return TX[TN-1];var k=Math.floor(g),f=g-k;return TX[k]*(1-f)+TX[k+1]*f;}
function riverSlope(z){return TS[idx(z)];}
// Distance vraie au fleuve (en metres) : une grille de 2 m calculee une fois,
// pour des berges regulieres meme dans les meandres des gorges.
var DN=385,DF=new Float32Array(DN*DN);
(function(){
  for(var iz=0;iz<DN;iz++){
    var z=iz*2;
    for(var ix=0;ix<DN;ix++){
      var x=ix*2,best=1e9,approx=Math.abs(x-TX[Math.min(TN-1,iz*4)]),win=Math.min(TN,Math.ceil((approx+4)*2)+2),k0=Math.max(0,iz*4-win),k1=Math.min(TN-1,iz*4+win);
      for(var k=k0;k<=k1;k++){var dx=x-TX[k],dz=z-k/2,d=dx*dx+dz*dz;if(d<best)best=d;}
      DF[iz*DN+ix]=Math.sqrt(best);
    }
  }
})();
function riverDist(x,z){
  var gx=x/2,gz=z/2;if(!(gx>=0))gx=0;if(!(gz>=0))gz=0;if(gx>DN-1.001)gx=DN-1.001;if(gz>DN-1.001)gz=DN-1.001;
  var ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,i=iz*DN+ix;
  return DF[i]*(1-fx)*(1-fz)+DF[i+1]*fx*(1-fz)+DF[i+DN]*(1-fx)*fz+DF[i+DN+1]*fx*fz;
}
// Le moteur demande sa riviere historique : on la renvoie tres loin, elle disparait.
function riverZ(){return -1e6;}
var PONTS=['pont-diable','pont-canet'].map(function(id){
  var S=BY[id],z=S.z,x=riverX(z),s=riverSlope(z),l=Math.sqrt(1+s*s);
  S.x=x;
  return {id:id,name:S.name,x:x,z:z,dx:s/l,dz:1/l};
});
var PONT_DEMI=3;
function terrainRiviere(x,z){
  if(isSea(x,z))return 'water';
  var d=riverDist(x,z);if(d>=RW)return 'land';
  // Le tablier s'evase en arrivant sur les berges : pas de recoin d'eau ou une unite resterait coincee.
  var demi=PONT_DEMI+2.6*Math.max(0,Math.min(1,(d-(RW-2.6))/2.6));
  for(var i=0;i<PONTS.length;i++){var P=PONTS[i];if(Math.abs(x-P.x)>14||Math.abs(z-P.z)>14)continue;var le=(x-P.x)*P.dx+(z-P.z)*P.dz;if(le>-demi&&le<demi)return 'bridge';}
  return 'water';
}
var BRIDGES=[];
function nearest(x,z,ids){
  var list=ids?ids.map(function(id){return BY[id];}).filter(Boolean):SITES,b=null,d=Infinity;
  for(var i=0;i<list.length;i++){var p=list[i],dx=x-p.x,dz=z-p.z,q=dx*dx+dz*dz;if(q<d){d=q;b=p;}}
  return b;
}
root.FOW_GEO_PLAYABLE=Object.freeze({SIZE:SIZE,bounds:BOUNDS,sites:SITES,byId:BY,river:RIVER,riverZ:riverZ,bridges:BRIDGES,
  nordSud:true,riverX:riverX,riverSlope:riverSlope,riverDist:riverDist,riverHalfWidth:RW,ponts:PONTS,pontDemi:PONT_DEMI,terrainRiviere:terrainRiviere,
  pic:PIC,sete:SETE,surSete:surSete,hauteurSete:hauteurSete,coastZ:coastZ,seaZmin:714,etang:etang,etangs:ETANGS,etangBord:etangBord,isSea:isSea,isBeach:isBeach,xy:xy,depuisAncien:depuisAncien,nearest:nearest});
})(window);