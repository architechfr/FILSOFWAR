/* FILS OF WAR / World8 navigation v1 — strategic A*.
 * Dedicated to 2048 world, faithful to canonical water + slope cells.
 * The historic two-player engine is never touched.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FOW_NAV8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var N=256,STEP=8,TOTAL=N*N;
var LIMITS={infanterie:34,cavalerie:22,charrette:14,blindes:12};
var MOVES=[
 [-1,0,1],[1,0,1],[0,-1,1],[0,1,1],
 [-1,-1,Math.SQRT2],[1,-1,Math.SQRT2],[-1,1,Math.SQRT2],[1,1,Math.SQRT2]
];
function create(world){
 if(!world||world.size!==2048||typeof world.canTraverse!=='function')throw Error('World8 requis');
 var masks={},created=0;
 function maskFor(kind){
  kind=kind||'infanterie';
  if(!Object.prototype.hasOwnProperty.call(LIMITS,kind))throw Error('Type deplacement inconnu');
  if(masks[kind])return masks[kind];
  var arr=new Uint8Array(TOTAL),count=0;
  for(var z=0;z<N;z++)for(var x=0;x<N;x++){
   var cx=x*STEP+4,cz=z*STEP+4;
   var ok=world.canTraverse(kind,cx,cz);
   arr[z*N+x]=ok?1:0; if(ok)count++;
  }
  masks[kind]=arr;created++;
  return arr;
 }
 function indexAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>=2048||z>=2048)return -1;
  return Math.floor(z/STEP)*N+Math.floor(x/STEP);
 }
 function nearest(mask,x,z,maxRadius){
  var ci=Math.floor(x/STEP),cj=Math.floor(z/STEP);
  if(ci<0||cj<0||ci>=N||cj>=N)return -1;
  var orig=cj*N+ci;
  if(mask[orig])return orig;
  for(var r=1;r<=(maxRadius||10);r++){
   var bx=-1,score=Infinity;
   for(var dz=-r;dz<=r;dz++)for(var dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
    var ix=ci+dx,iz=cj+dz;
    if(ix<0||iz<0||ix>=N||iz>=N)continue;
    var k=iz*N+ix;
    if(mask[k]){
     var sc=dx*dx+dz*dz;
     if(sc<score){score=sc;bx=k;}
    }
   }
   if(bx>=0)return bx;
  }
  return -1;
 }
 function path(kind,sx,sz,tx,tz,opts){
  opts=opts||{};
  var walk=maskFor(kind),start=nearest(walk,sx,sz,opts.searchRadius||12),goal=nearest(walk,tx,tz,opts.searchRadius||12);
  if(start<0||goal<0)return null;
  if(start===goal)return [{x:goal%N*STEP+4,z:Math.floor(goal/N)*STEP+4}];
  var score=new Float32Array(TOTAL),prev=new Int32Array(TOTAL),closed=new Uint8Array(TOTAL);
  score.fill(Infinity);prev.fill(-1);score[start]=0;
  var heap=[],order=0;
  function push(k,g,h){
   var n={k,g,f:g+h,order:order++},i=heap.length;heap.push(n);
   while(i>0){var p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}
   heap[i]=n;
  }
  function pop(){
   var out=heap[0],last=heap.pop();if(!heap.length)return out;
   var i=0;while(1){
    var c=i*2+1;if(c>=heap.length)break;
    if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;
    if(heap[c].f>=last.f)break;
    heap[i]=heap[c];i=c;
   }heap[i]=last;return out;
  }
  function heur(k){var x=k%N,z=(k-x)/N,dx=(goal%N)-x,dz=Math.floor(goal/N)-z;return Math.hypot(dx,dz);}
  push(start,0,heur(start));
  var found=false,exp=0,budget=opts.maxVisited||TOTAL;
  while(heap.length&&exp<budget){
   var p=pop(),idx=p.k;if(closed[idx]||p.g>score[idx]+0.0001)continue;
   closed[idx]=1;exp++;
   if(idx===goal){found=true;break;}
   var x=idx%N,z=(idx-x)/N;
   for(var m=0;m<MOVES.length;m++){
    var dx=MOVES[m][0],dz=MOVES[m][1],xx=x+dx,zz=z+dz;
    if(xx<0||xx>=N||zz<0||zz>=N)continue;
    var next=zz*N+xx;if(!walk[next]||closed[next])continue;
    if(dx&&dz&&(!walk[z*N+xx]||!walk[zz*N+x]))continue; // pas de coupe a travers les rives.
    var h1=world.heightAt(x*STEP+4,z*STEP+4),h2=world.heightAt(xx*STEP+4,zz*STEP+4);
    var incline=Math.max(0,h2-h1);
    var cost=MOVES[m][2]*(1+Math.min(1.4,incline/15));
    var nextG=score[idx]+cost;
    if(nextG<score[next]){
     score[next]=nextG;prev[next]=idx;push(next,nextG,heur(next));
    }
   }
  }
  if(!found)return null;
  var ids=[],k=goal;
  while(k>=0){ids.push(k);k=prev[k];if(ids.length>TOTAL)return null;}
  ids.reverse();
  // Simplification sûre: ne supprimer que les points de la meme droite,
  // pour ne pas tracer de raccourcis sur l'eau ou les montagnes.
  var pts=[],lastDir=null;
  for(var i=0;i<ids.length;i++){
   var p=ids[i],x=p%N,z=Math.floor(p/N);
   var next=ids[i+1],direction=next==null?null:[next%N-x,Math.floor(next/N)-z];
   if(i===0||i===ids.length-1||!lastDir||!direction||direction[0]!==lastDir[0]||direction[1]!==lastDir[1])
    pts.push({x:x*STEP+4,z:z*STEP+4});
   lastDir=direction;
  }
  return pts;
 }
 function canReach(kind,x,z){return nearest(maskFor(kind),x,z,10)>=0;}
 return {path,canReach,indexAt,maskFor,stats:function(){return {masksBuilt:created,cells:TOTAL,step:STEP}}};
}
return Object.freeze({VERSION:1,STEP,N,create});
});
