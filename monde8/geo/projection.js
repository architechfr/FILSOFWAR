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
const ZONES=[
 {id:'forest-nw',type:'foret',x:.12,z:.20,rx:.22,rz:.22},
 {id:'forest-sw',type:'foret',x:.12,z:.74,rx:.20,rz:.24},
 {id:'salagou-w',type:'ruffes',x:.23,z:.25,rx:.18,rz:.17},
 {id:'salagou-e',type:'ruffes',x:.36,z:.26,rx:.18,rz:.17},
 {id:'campagnan-n',type:'prairie',x:.46,z:.36,rx:.23,rz:.20},
 {id:'campagnan-s',type:'vignes',x:.45,z:.76,rx:.27,rz:.20},
 {id:'herault-mid',type:'riverside',x:.59,z:.56,rx:.18,rz:.26},
 {id:'herault-n',type:'riverside',x:.67,z:.46,rx:.18,rz:.23},
 {id:'causses-ne',type:'causse',x:.80,z:.18,rx:.22,rz:.22},
 {id:'causses-se',type:'causse',x:.79,z:.76,rx:.24,rz:.24}
].map(z=>({...z,x:z.x*WIDTH,z:z.z*HEIGHT,rx:z.rx*WIDTH,rz:z.rz*HEIGHT}));
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
  if(riverDistance(x,z)<155)return 'riverside';
  const sal=lake&&Math.hypot((x-lake.x)/(WIDTH/8.2),(z-lake.z)/(HEIGHT/8.4));
  if(sal<1.0)return 'ruffes';
  let best='prairie',score=Infinity;
  for(const q of ZONES){
    const dx=(x-q.x)/q.rx,dz=(z-q.z)/q.rz,d=dx*dx+dz*dz;
    if(d<score){score=d;best=q.type;}
  }
  if(best==='foret')return 'foret';
  if(best==='causse'&&score>1.65)return 'garrigue';
  if(best==='riverside'&&score>1.45)return 'prairie';
  return best;
 }
 return {
   spec,sites,byId,river,roads,coast,xy,geo,coastZ,isSea,riverDistance,region,lake,important,towns,
   bounds:b,worldWidth:WIDTH,worldHeight:HEIGHT,worldSize:WIDTH,zones:ZONES.map(z=>({...z})),landmark
 };
}
return Object.freeze({VERSION:'v0.9-large-continent',WIDTH,HEIGHT,create});
});