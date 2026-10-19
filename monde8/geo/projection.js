/* FILS OF WAR - geographical layout from approved v0.8 plan.
   LARGE CONTINENT v1: 5120 x 3584 units.
   Geographic references are schematic WGS84 anchors, not survey-grade positions.
   The strategic playable map will reuse the same normalized geography.
*/
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.FOW_GEO8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const WIDTH=5120,HEIGHT=3584;
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function create(spec){
 const b=spec.world.bounds;
 const lonScale=WIDTH/(b.east-b.west),latScale=HEIGHT/(b.north-b.south);
 function xy(lat,lon){return {x:(lon-b.west)*lonScale,z:(b.north-lat)*latScale};}
 function geo(x,z){return {lat:b.north-z/latScale,lon:b.west+x/lonScale};}

 const sites=spec.places.map(p=>{
  const point=xy(p.lat,p.lon);
  return {...p,x:point.x,z:point.z,importance:p.tier==='majeur'?2:1};
 });
 const byId=new Map(sites.map(p=>[p.id,p]));
 const river=spec.river.map(p=>xy(p[1],p[0]));
 const roads=spec.roads.map(r=>({
  name:r.name,type:r.type,
  points:r.ids.map(id=>byId.get(id)).filter(Boolean).map(p=>({x:p.x,z:p.z,id:p.id}))
 }));

 // Littoral repris depuis l'ancienne carte mais remis a l'echelle du grand continent.
 const coastNorm=[
  [0,.996],[.112,.984],[.200,.947],[.256,.920],[.326,.884],[.383,.864],[.445,.849],
  [.513,.832],[.591,.759],[.654,.699],[.742,.666],[.854,.599],[.933,.562],[1,.527]
 ];
 const coast=coastNorm.map(p=>({x:p[0]*WIDTH,z:p[1]*HEIGHT}));
 function coastZ(x){
  x=clamp(x,0,WIDTH);
  for(let i=1;i<coast.length;i++){
   if(x<=coast[i].x){
    const a=coast[i-1],c=coast[i],t=(x-a.x)/(c.x-a.x||1);
    return a.z+(c.z-a.z)*t;
   }
  }return coast[coast.length-1].z;
 }
 function isSea(x,z){return z>coastZ(x);}

 function riverDistance(x,z){
  let best=Infinity;
  for(let i=1;i<river.length;i++){
   const a=river[i-1],c=river[i],vx=c.x-a.x,vz=c.z-a.z;
   const t=clamp(((x-a.x)*vx+(z-a.z)*vz)/(vx*vx+vz*vz||1),0,1);
   const dx=x-a.x-vx*t,dz=z-a.z-vz*t;
   best=Math.min(best,Math.hypot(dx,dz));
  }
  return best;
 }
 const landmark=id=>byId.get(id);
 const lake=landmark('salagou');
 const important=sites.filter(s=>s.tier==='majeur');
 const towns=sites.filter(s=>['ville','village','bourg','chateau','abbaye'].includes(s.kind));

 function region(x,z){
  if(isSea(x,z))return 'sea';
  if(coastZ(x)-z<115)return 'coast';
  const sal=lake&&Math.hypot((x-lake.x)/2.5,(z-lake.z)/1.75);
  if(sal<285)return 'ruffes';
  // Les seuils sont proportionnels a l'ancienne carte, pas des nouveaux centres artificiels.
  if(x>3300&&z<2275)return 'garrigue';
  if(z<1120)return 'causse';
  if(z>1785&&x>1625&&x<3725)return 'vignes';
  if(riverDistance(x,z)<150)return 'riverside';
  if(x<1550&&z>1960)return 'causse';
  return 'prairie';
 }
 return {
   spec,sites,byId,river,roads,coast,xy,geo,coastZ,isSea,riverDistance,region,lake,important,towns,
   bounds:b,worldWidth:WIDTH,worldHeight:HEIGHT,worldSize:WIDTH,landmark
 };
}
return Object.freeze({VERSION:'v0.9-large-continent',WIDTH,HEIGHT,create});
});