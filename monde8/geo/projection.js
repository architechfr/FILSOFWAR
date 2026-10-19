/* FILS OF WAR - geographical layout from the approved v0.8 geographic plan.
   Coordinates are schematic WGS84 references and are NOT survey-grade positions.
   Does not alter the strategic eight-player engine or its authoritative collisions.
*/
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.FOW_GEO8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const SIZE=2048;
function clamp(n,a,b){return Math.min(b,Math.max(a,n));}
function create(spec){
 const b=spec.world.bounds;
 const lonScale=SIZE/(b.east-b.west),latScale=SIZE/(b.north-b.south);
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
 // The coastline is an artistic interpolation from the v0.8 coastal sites.
 // It is not a replacement for verified GIS shoreline data.
 const coast=[
  {x:0,z:2040},{x:230,z:2016},{x:410,z:1940},{x:525,z:1884},
  {x:667,z:1810},{x:784,z:1770},{x:911,z:1739},{x:1050,z:1703},
  {x:1210,z:1555},{x:1340,z:1432},{x:1520,z:1365},
  {x:1750,z:1226},{x:1910,z:1150},{x:2048,z:1080}
 ];
 function coastZ(x){
  x=clamp(x,0,2048);
  for(let i=1;i<coast.length;i++){
   if(x<=coast[i].x){
    const a=coast[i-1],c=coast[i],t=(x-a.x)/(c.x-a.x);
    return a.z+(c.z-a.z)*t;
   }
  }return coast[coast.length-1].z;
 }
 function isSea(x,z){return z>coastZ(x);}
 // Hérault river only: larger geo spread and real axis, no center-of-map radial layout.
 function riverDistance(x,z){
  let best=Infinity;
  for(let i=1;i<river.length;i++){
   const a=river[i-1],b=river[i],vx=b.x-a.x,vz=b.z-a.z;
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
  if(coastZ(x)-z<65)return 'coast';
  const sal=lake&&Math.hypot(x-lake.x,z-lake.z);
  if(sal<260)return 'ruffes';
  if(x>1320&&z<1300)return 'garrigue';
  if(z<640)return 'causse';
  if(z>1020&&x>650&&x<1490)return 'vignes';
  if(riverDistance(x,z)<90)return 'riverside';
  if(x<620&&z>1120)return 'causse';
  return 'prairie';
 }
 return {spec,sites,byId,river,roads,coast,xy,geo,coastZ,isSea,riverDistance,region,lake,important,towns,
         bounds:b,worldSize:SIZE,landmark};
}
return Object.freeze({VERSION:'v0.8-geographic',create});
});
