/* FILS OF WAR - Salagou v2 (19/10/2026).
 * Extension du monde existant: plan d'eau agrandi, ruisseau aval,
 * barrage aligne sur l'exutoire. Simulation entierement deterministe.
 */
(function(){
'use strict';
var carte=window.FOW_CARTE;
if(!carte||carte.salagouV2)return;
var original=carte.peupler,version=String(carte.version)+'-v2',N=384,TOTAL=N*N;
function d2(x,z,p){var a=x-p.x,b=z-p.z;return a*a+b*b;}
function empreinte(x,z,r){
 var a=Math.max(0,Math.floor((x-r)/2)),b=Math.min(N-1,Math.ceil((x+r)/2)),c=Math.max(0,Math.floor((z-r)/2)),d=Math.min(N-1,Math.ceil((z+r)/2)),rr=r*r,out=[];
 for(var j=c;j<=d;j++)for(var i=a;i<=b;i++){
  var dx=i*2+1-x,dz=j*2+1-z;if(dx*dx+dz*dz<=rr)out.push(j*N+i);
 }
 return out;
}
function union(cercles){
 var mask=new Uint8Array(TOTAL);
 for(var i=0;i<cercles.length;i++){var a=cercles[i],ids=empreinte(a[0],a[1],a[2]);for(var j=0;j<ids.length;j++)mask[ids[j]]=1;}
 return mask;
}
function surface(mask){var s=0;for(var i=0;i<mask.length;i++)s+=mask[i]!==0;return s;}
function protegements(game,api){
 var groups=[[game.nodes,4],[game.sites,10],[game.villages,11],[game.herds,11]],ret=[];
 for(var g=0;g<groups.length;g++){var els=groups[g][0],m=groups[g][1];
  for(var i=0;i<(els||[]).length;i++){var q=els[i];if(Number.isFinite(q.x)&&Number.isFinite(q.z))ret.push({x:q.x,z:q.z,r:(q.radius||2)+m});}
 }
 for(var k=0;k<api.SECTORS.length;k++){var s=api.SECTORS[k];ret.push({x:s.x,z:s.z,r:26});}
 return ret;
}
function acces(G,api){
 var sectors=api.SECTORS,first=sectors[0],root=Math.floor(first.z/2)*N+Math.floor(first.x/2),seen=new Uint8Array(TOTAL),queue=new Int32Array(TOTAL),h=0,t=0;
 if(G[root])return false;seen[root]=1;queue[t++]=root;
 while(h<t){
  var k=queue[h++],x=k%N,z=(k-x)/N;
  var n=[x?k-1:-1,x<N-1?k+1:-1,z?k-N:-1,z<N-1?k+N:-1];
  for(var a=0;a<4;a++){var j=n[a];if(j<0||seen[j]||G[j])continue;
   var xx=(j%N)*2+1,zz=Math.floor(j/N)*2+1;
   if(api.terrainAt(xx,zz)==='water')continue;
   seen[j]=1;queue[t++]=j;
  }
 }
 for(var i=0;i<sectors.length;i++){var p=sectors[i],id=Math.floor(p.z/2)*N+Math.floor(p.x/2);if(!seen[id])return false;}
 return true;
}
function elargir(game,api,lake,G,mask,protect){
 var old=surface(mask),count=old,accepted=0,newShapes=[];
 var bases=lake.c.slice(),candidates=[];
 for(var b=0;b<bases.length;b++){
  var B=bases[b];
  for(var t=0;t<16;t++){
   var angle=t*Math.PI/8,dist=B[2]*(.78+.06*(t%4));
   candidates.push([B[0]+Math.cos(angle)*dist,B[1]+Math.sin(angle)*dist,19+(t%4)*1.5]);
  }
 }
 candidates.sort(function(a,b){return b[2]-a[2]||a[1]-b[1]||a[0]-b[0];});
 for(var i=0;i<candidates.length&&count<old*1.55&&accepted<60;i++){
  var p=candidates[i],x=p[0],z=p[1];
  for(var r=p[2];r>=8;r-=2.5){
   if(x-r<11||z-r<11||x+r>756||z+r>756)continue;
   var GPr=window.FOW_GEO_PLAYABLE;if(GPr&&GPr.riverDist&&GPr.riverDist(x,z)<r+50)continue;
   var collision=false;
   for(var q=0;q<protect.length;q++){var u=protect[q],d=r+u.r;if(d2(x,z,u)<d*d){collision=true;break;}}
   if(collision)continue;
   var ids=empreinte(x,z,r),newIds=[],touch=false;
   for(var j=0;j<ids.length;j++){
    var id=ids[j];if(mask[id]){touch=true;continue;}
    if(G[id]){collision=true;break;}
    var xx=(id%N)*2+1,zz=Math.floor(id/N)*2+1;
    if(api.terrainAt(xx,zz)!=='land'){collision=true;break;}
    newIds.push(id);
   }
   if(collision||!touch||newIds.length<7)continue;
   for(var a=0;a<newIds.length;a++)G[newIds[a]]=1;
   if(!acces(G,api)){for(var a=0;a<newIds.length;a++)G[newIds[a]]=0;continue;}
   for(var a=0;a<ids.length;a++)mask[ids[a]]=1;
   lake.c.push([x,z,r]);newShapes.push([x,z,r]);count+=newIds.length;accepted++;break;
  }
 }
 return {before:old,after:count,lobes:accepted};
}
// 19/10 soir : sur la carte nord-sud, le fleuve est a l'est du lac (avant = cote lac).
function avant(x,z,m){var GP=window.FOW_GEO_PLAYABLE;if(GP&&GP.nordSud)return x<GP.riverX(z)-m;return z<api0.riverZ(x)-m;}
function arrive(x,z,m){var GP=window.FOW_GEO_PLAYABLE;if(GP&&GP.nordSud)return GP.riverDist(x,z)<m;return z>=api0.riverZ(x)-m;}
var api0=null;
function ruisseau(game,api,G,mask,protect){
 api0=api;
 var center=game.heraultLac,blocked=new Uint8Array(TOTAL);
 for(var i=0;i<TOTAL;i++)if(G[i])blocked[i]=1;
 // Empreinte de protection autour de toutes les entites / secteurs.
 for(var p=0;p<protect.length;p++){
  var o=protect[p],ids=empreinte(o.x,o.z,o.r+3.5);
  for(var j=0;j<ids.length;j++)blocked[ids[j]]=1;
 }
 function libre(k){
  if(k<0||k>=TOTAL||blocked[k])return false;
  var ix=k%N,iz=(k-ix)/N,x=ix*2+1,z=iz*2+1;
  if(x<16||x>752||z<16||!avant(x,z,4))return false;
  return api.terrainAt(x,z)!=='water';
 }
 // Recherche multisource: toutes les ouvertures libres de la rive sud.
 var Q=new Int32Array(TOTAL),prev=new Int32Array(TOTAL),vu=new Uint8Array(TOTAL),orig=new Int32Array(TOTAL),head=0,tail=0;
 prev.fill(-1);orig.fill(-1);
 var minX=center.x-124,maxX=center.x+124,minZ=center.z+12,maxZ=window.FOW_GEO_PLAYABLE&&window.FOW_GEO_PLAYABLE.nordSud?center.z+140:Math.min(346,center.z+140);
 for(var z=Math.max(16,Math.floor(minZ/2));z<Math.min(N-5,Math.floor(maxZ/2));z++){
  for(var x=Math.max(12,Math.floor(minX/2));x<Math.min(N-12,Math.floor(maxX/2));x++){
   var lakeID=z*N+x,first=(z+1)*N+x;
   if(!mask[lakeID]||mask[first]||!libre(first)||vu[first])continue;
   vu[first]=1;prev[first]=-2;orig[first]=lakeID;Q[tail++]=first;
  }
 }
 if(!tail)return null;
 var goal=-1;
 while(head<tail){
  var k=Q[head++],x=k%N,z=(k-x)/N,wx=x*2+1,wz=z*2+1;
  if(arrive(wx,wz,9)){goal=k;break;}
  var cand=[z<N-2?k+N:-1,x<N-2?k+1:-1,x>1?k-1:-1,z>1?k-N:-1];
  for(var m=0;m<4;m++){var j=cand[m];if(j<0||vu[j]||!libre(j))continue;
   var iy=Math.floor(j/N);if(iy<Math.floor((center.z+5)/2))continue;
   if(Math.abs((j%N)*2+1-center.x)>155)continue;
   vu[j]=1;prev[j]=k;orig[j]=orig[k];Q[tail++]=j;
  }
 }
 if(goal<0)return null;
 var path=[],current=goal;
 while(current>=0){
  var ix=current%N,iz=(current-ix)/N;
  path.push([ix*2+1,iz*2+1]);
  if(prev[current]===-2)break;
  current=prev[current];
 }
 path.reverse();
 // 20/10 : on lisse le trace (la recherche en grille faisait un angle droit).
 var lisse=[];
 for(var a=0;a<path.length;a++){
  if(a<2||a>path.length-3){lisse.push(path[a]);continue;}
  var sx2=0,sz2=0,nn=0;
  for(var b2=Math.max(0,a-9);b2<=Math.min(path.length-1,a+9);b2++){sx2+=path[b2][0];sz2+=path[b2][1];nn++;}
  var px=sx2/nn,pz=sz2/nn,kk=Math.floor(pz/2)*N+Math.floor(px/2);
  lisse.push(libre(kk)||mask[kk]?[px,pz]:path[a]);
 }
 path=lisse;
 var source=orig[goal],sx=(source%N)*2+1,sz=Math.floor(source/N)*2+1;
 var circles=[[sx,sz,4.1]];
 for(var u=0;u<path.length;u++)circles.push([path[u][0],path[u][1],3.4+0.5*Math.sin(u*0.37)]);
 var last=path[path.length-1];
 circles.push([last[0],last[1]+2.5,4.1]);
 var added=[],stamp=new Uint8Array(TOTAL),ok=true;
 for(var c=0;c<circles.length;c++){
  var ids=empreinte(circles[c][0],circles[c][1],circles[c][2]);
  for(var j=0;j<ids.length;j++){
   var k=ids[j],x=(k%N)*2+1,z=Math.floor(k/N)*2+1;
   if(stamp[k]||G[k])continue;
   if(blocked[k]&&avant(x,z,6))continue;
   // L'embouchure se raccorde a la riviere existante.
   if(api.terrainAt(x,z)==='water'&&avant(x,z,6))continue;
   stamp[k]=1;added.push(k);
  }
  if(!ok)break;
 }
 if(!ok||added.length<25)return null;
 for(var h=0;h<added.length;h++)G[added[h]]=1;
 if(!acces(G,api)){
  for(var h=0;h<added.length;h++)G[added[h]]=0;
  return null;
 }
 game.reliefs.push({t:'lac',c:circles,sec:-1,nom:'Ruisseau aval du Salagou'});
 var dam=path[Math.min(4,path.length-1)];
 return {barrage:{x:dam[0],z:dam[1],length:18,orientation:'est-ouest'},depart:[sx,sz],
  embouchure:last,nbPoints:path.length,cercles:circles.length};
}
function generer(game,api){
 if(!game||!game.fowSalagou||!game.heraultLac||!game.obstacles)return;
 var lake=game.reliefs.find(function(f){return f.nom==='Lac du Salagou';});
 if(!lake)return;
 var G=game.obstacles,mask=union(lake.c),protect=protegements(game,api);
 var agr=elargir(game,api,lake,G,mask,protect);
 var out=ruisseau(game,api,G,mask,protect);
 game.fowSalagou.barrage=out?out.barrage:null;
 game.fowSalagou.river=out&&{depart:out.depart,embouchure:out.embouchure,longueur:out.nbPoints*2};
 game.fowSalagou.surfaceAvantV2=agr.before;
 game.fowSalagou.surfaceApresV2=agr.after;
 game.fowSalagou.rayon=Math.ceil(Math.sqrt(agr.after*4/Math.PI));
 game.heraultLac.rayon=game.fowSalagou.rayon;
 game.fowSalagouV2={avant:agr.before,apres:agr.after,lobes:agr.lobes,
  ruisseau:!!out,chemin:out?out.nbPoints:0,barrage:out&&out.barrage};
}
carte.peupler=function(game,api){
 original.call(this,game,api);
 generer(game,api);
 game.carteVersion=version;
};
carte.version=version;
carte.salagouV2=true;
window.FOW_SALAGOU_V2={version:version};
})();