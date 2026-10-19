/* FILS OF WAR — geographic world 3D preview. Does not alter legacy Game.
 * Three.js render is visual; authoritative strategic map remains a separate
 * migration milestone (terrain collision and 8-human server not yet wired).
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const $=id=>document.getElementById(id);
const canvas=$('canvas3d'),loading=$('loading'),message=$('loadmsg'),progress=$('loadfill');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);
const lerp=(a,b,t)=>a+(b-a)*t;
const SEED=2026;
const BASE=2048;
const worldW=()=>geo?.worldWidth||5120;
const worldH=()=>geo?.worldHeight||3584;
const sx=v=>v*worldW()/BASE;
const sz=v=>v*worldH()/BASE;
const sxLen=v=>v*worldW()/BASE;
const szLen=v=>v*worldH()/BASE;
const random=(x,z,s=0)=>{
 let a=Math.imul((x|0)^SEED,0x45d9f3b)^Math.imul((z|0)+s,0x119de1f3);
 a=Math.imul(a^(a>>>16),0x45d9f3b);
 // >>> is evaluated before XOR: force unsigned conversion AFTER the XOR.
 return ((a ^ (a >>> 16)) >>> 0)/4294967296;
};
const noise=(x,z,scale=1,s=0)=>{
 const xx=x/scale,zz=z/scale,ix=Math.floor(xx),iz=Math.floor(zz);
 const fx=smooth(xx-ix),fz=smooth(zz-iz);
 return mix(mix(random(ix,iz,s),random(ix+1,iz,s),fx),mix(random(ix,iz+1,s),random(ix+1,iz+1,s),fx),fz);
};
const setProgress=(text,pct)=>{message.textContent=text;progress.style.width=pct+'%'};
let geo,world,renderer,scene,camera,controls,terrain,trees=[],labels=[],natureObjects=[];
let target=new THREE.Vector3(995,0,875),yaw=-.55,pitch=.96,distance=720;
let desiredTarget=target.clone(),desiredYaw=yaw,desiredPitch=pitch,desiredDistance=distance;
let cameraTouched=false,moving=false;
const lookups=new Map(),colors={
 foret:'#476b45',ruffes:'#a85742',causse:'#9a9787',garrigue:'#78895d',riverside:'#6f9870',
 prairie:'#8fa75f',vignes:'#879a55',coast:'#c7ba8f',sea:'#3f8fa8'
};
const featureFlags={labels:true,trees:true,roads:true,resources:true};
const RESOURCE_ZONES=[
 {name:'Forêt de Campawood',kind:'wood',x:365,z:420,rx:260,rz:210},
 {name:'Bois du Nord',kind:'wood',x:760,z:330,rx:220,rz:170},
 {name:'Carrières des Causses',kind:'stone',x:1420,z:430,rx:250,rz:190},
 {name:'Filons des Ruffes',kind:'gold',x:850,z:760,rx:190,rz:150},
 {name:'Garrigues sauvages',kind:'hunt',x:1630,z:850,rx:280,rz:220},
 {name:'Vallée agricole',kind:'food',x:1120,z:1260,rx:390,rz:220}
].map(z=>({...z,x:sx(z.x),z:sz(z.z),rx:sxLen(z.rx),rz:szLen(z.rz)}));
function peak(x,z,cx,cz,h,rx,rz){
 const dx=(x-cx)/rx,dz=(z-cz)/rz,k=dx*dx+dz*dz;
 return k<1?h*Math.pow(1-k,1.7):0;
}
function isLake(x,z){
 const lx=geo.lake.x,lz=geo.lake.z,a=(x-lx)/sxLen(190),b=(z-lz)/szLen(146);
 const dist=a*a+b*b,wiggle=.12*Math.sin(a*5.2+b*3)+.08*Math.sin(a*8-b*4);
 const east=Math.pow((x-lx-sxLen(129))/sxLen(87),2)+Math.pow((z-lz+szLen(43))/szLen(82),2);
 const west=Math.pow((x-lx+sxLen(116))/sxLen(91),2)+Math.pow((z-lz-szLen(21))/szLen(75),2);
 return dist<1+wiggle||east<1.02||west<1.01;
}
function nearLake(x,z){
 const dx=(x-geo.lake.x)/sxLen(202),dz=(z-geo.lake.z)/szLen(154);
 return Math.hypot(dx,dz);
}
function streamDist(x,z){
 const lx=geo.lake.x,lz=geo.lake.z;
 const from={x:lx+sxLen(51),z:lz+szLen(165)},to=geo.xy(43.607,3.495);
 const dx=to.x-from.x,dz=to.z-from.z;
 const t=clamp(((x-from.x)*dx+(z-from.z)*dz)/(dx*dx+dz*dz),0,1);
 return Math.hypot(x-from.x-dx*t,z-from.z-dz*t);
}
const peakSL={lat:43.7789,lon:3.8117};
function elevation(x,z){
 const sea=geo.coastZ(x);
 const region=geo.region(x,z);
 const r=18+14*(noise(x,z,265,33)-.5)+8*(noise(x,z,74,78)-.5)+4*(noise(x,z,22,111)-.5);
 const sl=geo.xy(peakSL.lat,peakSL.lon);
 const gorges=geo.landmark('gorges');
 const lodeve=geo.landmark('lodeve');
 let h=r+
   // Reliefs localisés : le reste du continent garde de larges respirations.
   peak(x,z,sl.x,sl.z,215,sxLen(230),szLen(215))+
   peak(x,z,gorges.x-sxLen(40),gorges.z-szLen(100),95,sxLen(160),szLen(190))+
   peak(x,z,lodeve.x-sxLen(40),lodeve.z-szLen(65),115,sxLen(230),szLen(250))+
   peak(x,z,sx(500),sz(250),138,sxLen(350),szLen(290))+
   peak(x,z,sx(360),sz(750),76,sxLen(245),szLen(200))+
   peak(x,z,sx(1250),sz(470),54,sxLen(220),szLen(180))+
   peak(x,z,sx(730),sz(1020),39,sxLen(160),szLen(140));
 // Grandes plaines jouables : on rabaisse volontairement le bruit de fond.
 const plainA=Math.hypot((x-sx(950))/sxLen(720),(z-sz(1180))/szLen(390));
 const plainB=Math.hypot((x-sx(1370))/sxLen(760),(z-sz(940))/szLen(420));
 const flatten=Math.max(0,1-Math.min(plainA,plainB));
 h=mix(h,8+6*(noise(x,z,sxLen(240),905)-.5),flatten*.66);
 const coastalDist=sea-z;
 if(coastalDist<sxLen(185))h*=smooth(clamp(coastalDist/sxLen(185),0,1))*.67+.05;
 if(isLake(x,z))return -12;
 if(nearLake(x,z)<1.8){
   const valley=smooth(clamp((nearLake(x,z)-.95)/.85,0,1));
   h=mix(3.5,h,valley);
 }
 const rd=geo.riverDistance(x,z);
 if(rd<sxLen(48)){
   const t=smooth(clamp(rd/sxLen(48),0,1));
   h=mix(-10,h,t);
 }
 const sd=streamDist(x,z);
 if(sd<sxLen(22)&&x>geo.lake.x){
   h=mix(-8,h,smooth(clamp(sd/sxLen(22),0,1)));
 }
 if(geo.isSea(x,z))return -11;
 return h;
}
function safeH(x,z){return elevation(clamp(x,0,worldW()),clamp(z,0,worldH()));}
function landmarkY(p){return safeH(p.x,p.z)+5;}
const vtmp=new THREE.Vector3();
function createTerrain(){
 const NX=256,NZ=180,positions=new Float32Array((NX+1)*(NZ+1)*3);
 const c=new Float32Array((NX+1)*(NZ+1)*3),index=[];
 const color=new THREE.Color(),palette={};
 Object.entries(colors).forEach(([k,v])=>palette[k]=new THREE.Color(v));
 const white=new THREE.Color('#f0e3bd');
 for(let z=0;z<=NZ;z++)for(let x=0;x<=NX;x++){
  let xx=x*worldW()/NX,zz=z*worldH()/NZ,i=(z*(NX+1)+x)*3,h=elevation(xx,zz);
  positions[i]=xx;positions[i+1]=h;positions[i+2]=zz;
  let b=geo.region(xx,zz);
  color.copy(palette[b]||palette.prairie);
  const n=noise(xx,zz,sxLen(93),42),t=(n-.5)*.19,rock=clamp((h-68)/140,0,.50);
  if(b==='ruffes')color.lerp(palette.causse,clamp((h-45)/150,0,.40));
  color.lerp(white,rock*.65);
  color.multiplyScalar(clamp(1+t,.75,1.22));
  if(geo.isSea(xx,zz)||isLake(xx,zz)||geo.riverDistance(xx,zz)<sxLen(14))color.set('#586961');
  c.set([color.r,color.g,color.b],i);
 }
 for(let z=0;z<NZ;z++)for(let x=0;x<NX;x++){
  const a=z*(NX+1)+x,b=a+1,d=(z+1)*(NX+1)+x,e=d+1;
  index.push(a,d,b,b,d,e);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.BufferAttribute(positions,3));
 g.setAttribute('color',new THREE.BufferAttribute(c,3));
 g.setIndex(index);g.computeVertexNormals();
 terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}));
 terrain.receiveShadow=true;scene.add(terrain);
}
function lakeShape(){
 const shore=[];
 const cx=geo.lake.x,cz=geo.lake.z;
 // Build mesh from sampled lake mask rather than a fake blue circle.
 // All visible surfaces share the same isLake predicate.
 const step=12,loX=Math.max(0,cx-sxLen(335)),hiX=Math.min(worldW(),cx+sxLen(335)),loZ=Math.max(0,cz-szLen(250)),hiZ=Math.min(worldH(),cz+szLen(250));
 const vertices=[],indices=[];
 for(let z=loZ;z<hiZ;z+=step)for(let x=loX;x<hiX;x+=step){
  const corners=[[x,z],[x+step,z],[x,z+step],[x+step,z+step]];
  if(!corners.some(p=>isLake(p[0],p[1])))continue;
  let k=vertices.length/3;
  for(const p of corners)vertices.push(p[0],-2.2,p[1]);
  indices.push(k,k+2,k+1,k+1,k+2,k+3);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);
 g.computeVertexNormals();return g;
}
function createWater(){
 const lakeMaterial=new THREE.MeshPhysicalMaterial({
  color:0x3f8799,roughness:.18,metalness:.02,transparent:true,opacity:.92,side:THREE.DoubleSide,
  clearcoat:.25,clearcoatRoughness:.32
 });
 const lakeMesh=new THREE.Mesh(lakeShape(),lakeMaterial);scene.add(lakeMesh);
 const seaShape=new THREE.Shape();
 seaShape.moveTo(0,worldH());seaShape.lineTo(worldW(),worldH());
 for(let i=geo.coast.length-1;i>=0;i--)seaShape.lineTo(geo.coast[i].x,geo.coast[i].z);
 seaShape.closePath();
 const seaGeo=new THREE.ShapeGeometry(seaShape,12);
 seaGeo.rotateX(Math.PI/2); // x-axis maps to x, 2D y becomes z
 // Due rotateX, yShape -> zShape, positive rotation produces positive z.
 const sea=new THREE.Mesh(seaGeo,new THREE.MeshPhysicalMaterial({
  color:0x327f98,roughness:.28,metalness:0,transparent:true,opacity:.9,side:THREE.DoubleSide,
  clearcoat:.18
 }));
 sea.position.y=-3;scene.add(sea);
 // L'Hérault doit être un repère géographique majeur, pas un filet décoratif.
 ribbon(geo.river,14,'#4f9eb4',-1.7);
 // Deux bandes de berge renforcent visuellement la vallée sans créer d'obstacle.
 ribbon(geo.river,19,'#6f9870',-2.35);
 const origin={x:geo.lake.x+sxLen(50),z:geo.lake.z+szLen(170)},out=geo.xy(43.607,3.495);
 ribbon([origin,{x:origin.x+48,z:origin.z+65},{x:out.x-19,z:out.z-25},out],6.5,'#72b7ba',-1.95);
}
function ribbon(points,width,hex,fixedY=null){
 if(points.length<2)return;
 const v=[],colors=[],indices=[];const color=new THREE.Color(hex);
 for(let i=0;i<points.length;i++){
  const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
  let dx=next.x-prev.x,dz=next.z-prev.z,length=Math.hypot(dx,dz)||1;
  const px=-dz/length,pz=dx/length;
  for(const side of [-1,1]){
   const xx=p.x+px*width*side,zz=p.z+pz*width*side;
   v.push(xx,fixedY==null?safeH(xx,zz)+1.25:fixedY,zz);
   colors.push(color.r,color.g,color.b);
  }
  if(i){const n=i*2;indices.push(n-2,n-1,n,n-1,n+1,n);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);
 g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:hex,roughness:.87,side:THREE.DoubleSide,transparent:fixedY!=null,opacity:fixedY!=null?.87:1}));
 scene.add(mesh);return mesh;
}
function createRoads(){
 for(const road of geo.roads){
  if(road.points.length<2)continue;
  // Roads are marked as a network, following v0.8 waypoints (not cadastral).
  const col=road.type==='port'?'#d5c199':road.type==='montagne'?'#d5c7a9':'#d3bd85';
  const curve=new THREE.CatmullRomCurve3(road.points.map(p=>new THREE.Vector3(p.x,0,p.z)),false,'centripetal',.26);
  const sampled=[];
  for(let i=0;i<=Math.max(20,road.points.length*10);i++){
   const p=curve.getPoint(i/Math.max(20,road.points.length*10));
   const x=clamp(p.x,0,worldW()),z=clamp(p.z,0,worldH());
   if(!geo.isSea(x,z)&&!isLake(x,z))sampled.push({x,z});
  }
  if(sampled.length>1)ribbon(sampled,road.type==='port'?2.1:2.6,col);
 }
}
function groundObject(x,z,{size=1,color='#c4b59b',height=7,roof=false}={}){
 const parts=new THREE.Group();
 const base=new THREE.Mesh(new THREE.BoxGeometry(size*10,height,size*8),new THREE.MeshStandardMaterial({color,roughness:.97}));
 base.position.y=height/2;parts.add(base);
 if(roof){
  const cap=new THREE.Mesh(new THREE.ConeGeometry(size*7,height*.55,4),new THREE.MeshStandardMaterial({color:'#896c52',roughness:1}));
  cap.rotation.y=Math.PI/4;cap.position.y=height+height*.23;parts.add(cap);
 }
 parts.position.set(x,safeH(x,z)+1,z);scene.add(parts);return parts;
}
function createSettlements(){
 const stone=new THREE.MeshStandardMaterial({color:'#cabb9d',roughness:1});
 const roof=new THREE.MeshStandardMaterial({color:'#947053',roughness:1});
 const stoneShape=new THREE.BoxGeometry(8,9,8),roofShape=new THREE.ConeGeometry(6.5,5.2,4);
 for(const p of geo.sites){
  if(['pont','lac','nature'].includes(p.kind))continue;
  const big=p.kind==='ville',small=p.position_quality==='schematic_local';
  const n=big?23:small?3:10;
  for(let i=0;i<n;i++){
   const angle=(i*2.39996),radius=(i?6+Math.sqrt(i)*9:0),xx=p.x+Math.cos(angle)*radius,zz=p.z+Math.sin(angle)*radius;
   if(xx<0||xx>worldW()||zz<0||zz>worldH()||geo.isSea(xx,zz)||isLake(xx,zz)||geo.riverDistance(xx,zz)<12)continue;
   const scale=(big?1.3:1)*(.63+random(i,p.x|0,319)*.6);
   const building=new THREE.Mesh(stoneShape,stone);building.position.set(xx,safeH(xx,zz)+5*scale,zz);
   building.scale.set(scale,scale,scale);building.rotation.y=random(i,p.z|0,100)*6.28;
   scene.add(building);
   const top=new THREE.Mesh(roofShape,roof);
   top.scale.set(scale,scale,scale);top.rotation.y=building.rotation.y+Math.PI/4;
   top.position.set(xx,safeH(xx,zz)+11.3*scale,zz);scene.add(top);
  }
 }
}
function createForest(){
 const trunkGeo=new THREE.CylinderGeometry(.9,1.3,9,5);
 const leafGeo=new THREE.IcosahedronGeometry(7,0);
 const trunkMat=new THREE.MeshLambertMaterial({color:'#6b5a3d'});
 const leaves=[
  new THREE.MeshLambertMaterial({color:'#355c37',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#456a3d',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#5b7548',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#3f6752',flatShading:true})
 ];
 // Plus de semis uniforme : les arbres se regroupent en massifs lisibles,
 // avec quelques lisières et bosquets secondaires.
 const clusters=[
  {x:sx(350),z:sz(360),rx:sxLen(290),rz:szLen(250),density:1.00},
  {x:sx(760),z:sz(330),rx:sxLen(235),rz:szLen(185),density:.80},
  {x:sx(520),z:sz(980),rx:sxLen(180),rz:szLen(240),density:.54},
  {x:sx(1500),z:sz(700),rx:sxLen(180),rz:szLen(155),density:.34},
  {x:sx(1710),z:sz(980),rx:sxLen(220),rz:szLen(170),density:.38}
 ];
 const max=2850,trees=[];
 let attempt=0;
 while(trees.length<max&&attempt<max*7){
  const ci=Math.floor(random(attempt,907,12)*clusters.length),C=clusters[ci];
  const a=random(attempt,401,71)*Math.PI*2,r=Math.sqrt(random(attempt,503,93));
  let x=C.x+Math.cos(a)*C.rx*r,z=C.z+Math.sin(a)*C.rz*r;attempt++;
  // Irrégularité des lisières.
  x+=(noise(x,z,sxLen(70),812)-.5)*sxLen(55);z+=(noise(x,z,szLen(65),813)-.5)*szLen(45);
  if(x<20||x>worldW()-20||z<20||z>worldH()-20||geo.isSea(x,z)||isLake(x,z)||geo.riverDistance(x,z)<sxLen(28)||streamDist(x,z)<sxLen(18))continue;
  if(geo.sites.some(p=>Math.abs(p.x-x)<24&&Math.abs(p.z-z)<24))continue;
  const region=geo.region(x,z);
  const allowed=region==='causse'?.28:region==='ruffes'?.18:region==='vignes'?.16:region==='riverside'?.48:.82;
  if(random(x|0,z|0,103)>allowed*C.density)continue;
  let h=safeH(x,z);if(h<-1||h>195)continue;
  let scale=.64+random(x|0,z|0,45)*1.18,variant=Math.min(leaves.length-1,Math.floor(random(x|0,z|0,76)*leaves.length));
  trees.push({x,z,h,scale,variant});
 }
 const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,trees.length);
 const groups=leaves.map((mat,idx)=>new THREE.InstancedMesh(leafGeo,mat,Math.max(1,trees.filter(t=>t.variant===idx).length)));
 const counts=[0,0,0,0],dummy=new THREE.Object3D();
 trees.forEach((t,i)=>{
  dummy.position.set(t.x,t.h+4*t.scale,t.z);dummy.rotation.y=random(t.x|0,t.z|0,98)*6.28;dummy.scale.set(t.scale,t.scale,t.scale);dummy.updateMatrix();
  trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.y=t.h+12.5*t.scale;dummy.scale.set(t.scale,t.scale*.75,t.scale);dummy.updateMatrix();
  groups[t.variant].setMatrixAt(counts[t.variant]++,dummy.matrix);
 });
 trunks.instanceMatrix.needsUpdate=true;scene.add(trunks);
 for(let i=0;i<4;i++){groups[i].count=counts[i];groups[i].instanceMatrix.needsUpdate=true;scene.add(groups[i]);}
 natureObjects=[trunks,...groups];return trees.length;
}
function createResourceZones(){
 const dummy=new THREE.Object3D();
 const defs={
  stone:{geo:new THREE.DodecahedronGeometry(5,0),mat:new THREE.MeshStandardMaterial({color:'#8f8d84',roughness:1}),count:95},
  gold:{geo:new THREE.DodecahedronGeometry(4.2,0),mat:new THREE.MeshStandardMaterial({color:'#a78242',roughness:.85,metalness:.18}),count:54},
  food:{geo:new THREE.SphereGeometry(3.1,5,4),mat:new THREE.MeshStandardMaterial({color:'#9b8e4e',roughness:1}),count:80},
  hunt:{geo:new THREE.ConeGeometry(2.2,7,5),mat:new THREE.MeshStandardMaterial({color:'#8b7654',roughness:1}),count:52}
 };
 for(const zone of RESOURCE_ZONES){
  if(zone.kind==='wood')continue;
  const d=defs[zone.kind];if(!d)continue;
  const pts=[];
  for(let i=0;i<d.count*4&&pts.length<d.count;i++){
   const a=random(i,zone.x|0,771)*Math.PI*2,r=Math.sqrt(random(i,zone.z|0,772));
   const x=zone.x+Math.cos(a)*zone.rx*r,z=zone.z+Math.sin(a)*zone.rz*r;
   if(x<20||x>worldW()-20||z<20||z>worldH()-20||geo.isSea(x,z)||isLake(x,z)||geo.riverDistance(x,z)<sxLen(22))continue;
   pts.push({x,z});
  }
  const mesh=new THREE.InstancedMesh(d.geo,d.mat,pts.length);
  pts.forEach((p,i)=>{const y=safeH(p.x,p.z);dummy.position.set(p.x,y+2.2,p.z);dummy.rotation.set(random(i,1,1)*.4,random(i,2,2)*6.28,random(i,3,3)*.4);const sc=.7+random(i,4,4)*1.2;dummy.scale.set(sc,sc,sc);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);natureObjects.push(mesh);
 }
}
function createVineyards(){
 const mat=new THREE.MeshStandardMaterial({color:'#52794b',roughness:1});
 const geoBox=new THREE.BoxGeometry(2,2.4,5);
 const dummy=new THREE.Object3D();const positions=[];
 for(let x=sx(490);x<sx(1510);x+=sxLen(36))for(let z=sz(1040);z<sz(1450);z+=szLen(29)){
  const region=geo.region(x,z);if(region!=='vignes')continue;
  for(let row=0;row<3;row++)for(let c=0;c<4;c++){
   const xx=x+c*sxLen(6),zz=z+row*szLen(7);
   if(isLake(xx,zz)||geo.isSea(xx,zz)||geo.riverDistance(xx,zz)<sxLen(17))continue;
   positions.push({x:xx,z:zz});
  }
 }
 const mesh=new THREE.InstancedMesh(geoBox,mat,positions.length);
 for(let i=0;i<positions.length;i++){
  const p=positions[i];dummy.position.set(p.x,safeH(p.x,p.z)+1.1,p.z);
  dummy.scale.setScalar(.7+random(p.x|0,p.z|0,2)*.45);dummy.rotation.y=.25;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);natureObjects.push(mesh);
}

function createLandscapeDetails(){
 const rockGeo=new THREE.DodecahedronGeometry(5,0);
 const rockMat=new THREE.MeshStandardMaterial({color:'#8f8a7c',roughness:1});
 const scrubGeo=new THREE.IcosahedronGeometry(3.6,0);
 const scrubMat=new THREE.MeshLambertMaterial({color:'#65784c',flatShading:true});
 const grassMat=new THREE.MeshLambertMaterial({color:'#7d9654'});
 const grassGeo=new THREE.ConeGeometry(.7,4.5,4);
 const dummy=new THREE.Object3D();
 const rocks=[],scrubs=[],grass=[];
 let attempt=0;
 while(attempt<4300){
  const x=random(attempt,1501,17)*worldW(),z=random(attempt,1503,23)*worldH(),region=geo.region(x,z);attempt++;
  if(geo.isSea(x,z)||isLake(x,z)||geo.riverDistance(x,z)<sxLen(18))continue;
  if(region==='causse'||region==='ruffes'||region==='garrigue'){
   const chance=region==='causse'?.58:region==='ruffes'?.34:.22;
   if(random(x|0,z|0,1504)<chance&&rocks.length<650)rocks.push({x,z});
  }else if(region==='prairie'||region==='vignes'){
   if(random(x|0,z|0,1505)<.16&&grass.length<900)grass.push({x,z});
  }
  if((region==='garrigue'||region==='riverside')&&random(x|0,z|0,1506)<.24&&scrubs.length<500) scrubs.push({x,z});
 }
 function inst(list,geoObj,mat,y,scaleMin,scaleMax){
  const mesh=new THREE.InstancedMesh(geoObj,mat,list.length);
  list.forEach((p,i)=>{const sc=scaleMin+random(i,p.x|0,1701)*(scaleMax-scaleMin);
   dummy.position.set(p.x,safeH(p.x,p.z)+y*sc,p.z);dummy.rotation.y=random(i,p.z|0,1702)*6.28;
   dummy.scale.set(sc,sc,sc);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
  mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);natureObjects.push(mesh);
 }
 inst(rocks,rockGeo,rockMat,2.7,.6,1.6);
 inst(scrubs,scrubGeo,scrubMat,2.5,.7,1.35);
 inst(grass,grassGeo,grassMat,1.5,.7,1.3);
}
function createClearings(){
 const mat=new THREE.MeshBasicMaterial({color:'#92a968',transparent:true,opacity:.16,depthWrite:false});
 const zones=[
  {x:sx(980),z:sz(1180),rx:sxLen(310),rz:szLen(170)},
  {x:sx(1370),z:sz(950),rx:sxLen(260),rz:szLen(155)}
 ];
 for(const q of zones){
  const g=new THREE.CircleGeometry(1,64);g.rotateX(-Math.PI/2);
  const m=new THREE.Mesh(g,mat);m.scale.set(q.rx,1,q.rz);m.position.set(q.x,safeH(q.x,q.z)+.35,q.z);scene.add(m);
 }
}
function createDam(){
 const cx=geo.lake.x,cz=geo.lake.z;
 const x=cx+sxLen(49),z=cz+szLen(161),y=Math.max(2,safeH(x,z));
 const structure=new THREE.Group();
 const deck=new THREE.Mesh(new THREE.BoxGeometry(65,7,14),new THREE.MeshStandardMaterial({color:'#b5ae9c',roughness:.86}));
 deck.position.y=9;structure.add(deck);
 for(const dx of [-29,29]){
  const tower=new THREE.Mesh(new THREE.BoxGeometry(10,20,19),new THREE.MeshStandardMaterial({color:'#ddd3bd'}));
  tower.position.set(dx,8,0);structure.add(tower);
 }
 structure.position.set(x,y,z);structure.rotation.y=.24;scene.add(structure);
}
function createBridges(){
 const candidates=geo.sites.filter(p=>p.kind==='pont');
 // Les ponts existants du plan v0.8 + passages lisibles sur l'axe de l'Hérault.
 const list=candidates.length?candidates:[
  geo.landmark('pont-diable'),geo.landmark('pont-canet')
 ].filter(Boolean);
 for(const p of list){
  const y=Math.max(-1,safeH(p.x,p.z));
  const group=new THREE.Group();
  const deck=new THREE.Mesh(new THREE.BoxGeometry(62,4.8,11),new THREE.MeshStandardMaterial({color:'#d9ccb0',roughness:1}));
  deck.position.y=9;group.add(deck);
  const archMat=new THREE.MeshStandardMaterial({color:'#b4aa91',roughness:1});
  for(const dx of [-24,-8,8,24]){
   const support=new THREE.Mesh(new THREE.CylinderGeometry(3.8,4.8,21,7),archMat);
   support.position.set(dx,-1,0);group.add(support);
  }
  // tablier clair + piles hautes : visible même à moyenne distance.
  group.position.set(p.x,y,p.z);
  // orientation approximative perpendiculaire au fleuve local
  const eps=12,a=geo.riverDistance(p.x-eps,p.z),b=geo.riverDistance(p.x+eps,p.z),
        c=geo.riverDistance(p.x,p.z-eps),d=geo.riverDistance(p.x,p.z+eps);
  group.rotation.y=Math.abs(a-b)>Math.abs(c-d)?0:Math.PI/2;
  scene.add(group);
 }
}
function createLandmarkPins(){
 // At large scale only iconic sites are labeled, never all 31 simultaneously.
 const all=geo.sites.concat([{id:'pic-saint-loup',name:'Pic Saint-Loup',tier:'majeur',
   ...geo.xy(peakSL.lat,peakSL.lon),position_quality:'reference_approximate'}]);
 const labelsHost=document.body;
 for(const p of all){
  const label=document.createElement('div');
  label.className='poi';label.textContent=p.name;label.style.display='none';
  labelsHost.appendChild(label);labels.push({p,el:label});
 }
}
function drawMini(){
 const cv=$('mini'),g=cv.getContext('2d'),MW=cv.width,MH=cv.height;
 const data=g.createImageData(MW,MH);
 const palette={
  ruffes:[161,89,65],causse:[151,149,124],garrigue:[104,139,94],
  riverside:[90,157,135],prairie:[134,160,99],vignes:[144,153,91],
  coast:[209,192,147],sea:[67,145,169]
 };
 for(let py=0;py<MH;py++)for(let px=0;px<MW;px++){
  const xx=px*worldW()/MW,zz=py*worldH()/MH;
  const rgb=isLake(xx,zz)?[67,147,153]:palette[geo.region(xx,zz)];
  const i=(py*MW+px)*4;data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=255;
 }
 g.putImageData(data,0,0);
 for(const p of geo.important){
  g.beginPath();g.fillStyle='#f5db9e';g.strokeStyle='#15241d';g.lineWidth=1.5;
  g.arc(p.x/worldW()*MW,p.z/worldH()*MH,2.7,0,Math.PI*2);g.fill();g.stroke();
 }
}
function updateMini(){
 const cv=$('mini'),g=cv.getContext('2d'),MW=cv.width,MH=cv.height;
 if(!updateMini.background){updateMini.background=g.getImageData(0,0,MW,MH);}
 g.putImageData(updateMini.background,0,0);
 g.beginPath();g.strokeStyle='#fff7dc';g.lineWidth=2;
 g.arc(target.x/worldW()*MW,target.z/worldH()*MH,4.2,0,Math.PI*2);g.stroke();
 const ax=target.x/worldW()*MW,az=target.z/worldH()*MH;
 g.beginPath();g.moveTo(ax,az);
 g.lineTo(ax+Math.cos(yaw)*11,az+Math.sin(yaw)*11);g.stroke();
}
function updateLabels(){
 if(!camera||!renderer)return;
 let shown=0;
 const width=innerWidth,height=innerHeight;
 const labelsNear=labels.map(item=>({item,d:Math.hypot(item.p.x-target.x,item.p.z-target.z)}))
  .sort((a,b)=>a.d-b.d);
 for(const {item,d} of labelsNear){
  const p=item.p;
  const isMajor=p.tier==='majeur'||p.id==='pic-saint-loup';
  if((d>distance*(isMajor?1.0:.54))||(shown>=(distance>1000?7:distance>550?11:15))){
   item.el.style.display='none';continue;
  }
  const screen=new THREE.Vector3(p.x,safeH(p.x,p.z)+
    (p.id==='pic-saint-loup'?155:22),p.z).project(camera);
  const x=(screen.x*.5+.5)*width,y=(-screen.y*.5+.5)*height;
  if(screen.z>1||screen.z<0||x<18||x>width-18||y<75||y>height-18||
     (x<335&&y<720&&width>900)){
   item.el.style.display='none';continue;
  }
  item.el.style.display='block';item.el.style.left=x+'px';item.el.style.top=y+'px';
  shown++;
 }
}
function flyTo(id){
 const p=id==='lake'?geo.landmark('salagou'):
   id==='dam'?{x:geo.lake.x+50,z:geo.lake.z+161,name:'Barrage du Salagou'}:
   id==='peak'?{...geo.xy(peakSL.lat,peakSL.lon),name:'Pic Saint-Loup'}:
   id==='gorges'?geo.landmark('gorges'):
   id==='campagnan'?geo.landmark('campagnan'):
   id==='forest'?geo.landmark('viols-fort'):
   geo.landmark(id);
 if(!p)return;
 desiredTarget.set(p.x,safeH(p.x,p.z),p.z);
 desiredDistance=id==='peak'?390:id==='lake'?490:id==='dam'?235:id==='campagnan'?245:330;
 desiredPitch=id==='peak'?.83:id==='dam'?.92:.93;
 cameraTouched=true;
 $('info').textContent='✦ '+p.name+' — déplacement vers cette région du continent.';
}
function controller(){
 const touches=new Map();let lastTouch=null,dragged=0,button=0,lastX=0,lastY=0;
 const c=canvas;
 c.addEventListener('contextmenu',e=>e.preventDefault());
 c.addEventListener('pointerdown',e=>{
  c.setPointerCapture(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  button=e.button;lastX=e.clientX;lastY=e.clientY;dragged=0;lastTouch=null;
 });
 c.addEventListener('pointermove',e=>{
  if(!touches.has(e.pointerId))return;
  const old=touches.get(e.pointerId);touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const dx=e.clientX-old.x,dy=e.clientY-old.y;
  dragged+=Math.abs(dx)+Math.abs(dy);
  if(touches.size===1){
   if(button===2||e.shiftKey){
    desiredYaw-=dx*.006;desiredPitch=clamp(desiredPitch+dy*.004,.35,1.48);
   }else{
    const scale=desiredDistance/Math.max(330,Math.min(innerWidth,innerHeight))*.95;
    desiredTarget.x+=(-dx*Math.cos(desiredYaw)+dy*Math.sin(desiredYaw))*scale;
    desiredTarget.z+=(dx*Math.sin(desiredYaw)+dy*Math.cos(desiredYaw))*scale;
   }
  }else if(touches.size===2){
   const p=[...touches.values()];
   const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
   if(lastTouch!=null)desiredDistance=clamp(desiredDistance*lastTouch/Math.max(1,d),100,5200);
   lastTouch=d;
   desiredYaw-=dx*.002;
  }
  cameraTouched=true;
 });
 const stop=e=>{touches.delete(e.pointerId);if(touches.size<2)lastTouch=null;};
 c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);
 c.addEventListener('wheel',e=>{e.preventDefault();desiredDistance=clamp(desiredDistance*(e.deltaY>0?1.105:.91),95,5200);cameraTouched=true;},{passive:false});
 const keys=new Set();
 window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;keys.add(e.key.toLowerCase());});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 function frameKeys(dt){
  const delta=dt*desiredDistance*.75;
  const forward=(keys.has('w')||keys.has('z')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('q')||keys.has('arrowleft')?1:0);
  desiredTarget.x+=(-forward*Math.sin(desiredYaw)+side*Math.cos(desiredYaw))*delta;
  desiredTarget.z+=(-forward*Math.cos(desiredYaw)-side*Math.sin(desiredYaw))*delta;
  if(keys.has('r'))desiredDistance=clamp(desiredDistance-dt*desiredDistance,95,5200);
  if(keys.has('f'))desiredDistance=clamp(desiredDistance+dt*desiredDistance,95,5200);
 }
 $('zoomIn').addEventListener('click',()=>{desiredDistance=clamp(desiredDistance*.75,95,5200)});
 $('zoomOut').addEventListener('click',()=>{desiredDistance=clamp(desiredDistance*1.3,95,5200)});
 $('reset').addEventListener('click',()=>{desiredTarget.set(sx(1060),0,sz(1010));desiredDistance=3100;desiredPitch=1.04;desiredYaw=-.52});
 [['bLake','lake'],['bDam','dam'],['bPeak','peak'],['bGorges','gorges']].forEach(([btn,id])=>$(btn)?.addEventListener('click',()=>flyTo(id)));
 document.querySelectorAll('[data-fly]').forEach(el=>el.addEventListener('click',()=>flyTo(el.dataset.fly)));
 $('minimap').addEventListener('click',e=>{const r=$('minimap').getBoundingClientRect();
  desiredTarget.x=clamp((e.clientX-r.left)/r.width*worldW(),0,worldW());
  desiredTarget.z=clamp((e.clientY-r.top)/r.height*worldH(),0,worldH());desiredDistance=1500;
 });
 return frameKeys;
}
function updateCamera(dt){
 const t=1-Math.exp(-dt*5.5);
 target.lerp(desiredTarget,t);yaw=lerp(yaw,desiredYaw,t);pitch=lerp(pitch,desiredPitch,t);distance=lerp(distance,desiredDistance,t);
 target.x=clamp(target.x,18,worldW()-18);target.z=clamp(target.z,18,worldH()-18);
 desiredTarget.x=clamp(desiredTarget.x,18,worldW()-18);desiredTarget.z=clamp(desiredTarget.z,18,worldH()-18);
 const base=safeH(target.x,target.z);
 const h=Math.max(base,target.y);
 camera.position.set(target.x+distance*Math.sin(pitch)*Math.sin(yaw),
  h+distance*Math.cos(pitch)+30,
  target.z+distance*Math.sin(pitch)*Math.cos(yaw));
 camera.lookAt(target.x,h,target.z);
 const b=geo.region(target.x,target.z);
 $('biome').textContent=({
 ruffes:'Ruffes du Salagou',causse:'Causses et hauts plateaux',garrigue:'Garrigue méditerranéenne',
 riverside:'Vallée de l’Hérault',prairie:'Plaines agricoles',vignes:'Terres viticoles',
 sea:'Mer Méditerranée',coast:'Littoral et lagunes'})[b]||'Occitanie';
 $('height').textContent='Altitude jeu : '+Math.round(safeH(target.x,target.z))+' u';
}
async function main(){
 setProgress('Chargement du plan géographique v0.8…',13);
 const rsp=await fetch('geo/reference-v08.json');
 if(!rsp.ok)throw Error('Le plan directeur n’a pas pu être chargé (HTTP '+rsp.status+').');
 const spec=await rsp.json();
 if(spec.places.length!==31||spec.river.length!==34)throw Error('Référence géographique incomplète.');
 geo=window.FOW_GEO8.create(spec);
 if(!geo.lake)throw Error('Site du Salagou absent de la carte géographique.');
 $('places').textContent=spec.places.length;
 setProgress('Construction des montagnes, vallées et reliefs 3D…',30);
 renderer=new THREE.WebGLRenderer({canvas,antialias:devicePixelRatio<2,powerPreference:'high-performance',alpha:false});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<800?1.25:1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 renderer.setClearColor(new THREE.Color('#b4cad0'));
 scene=new THREE.Scene();scene.background=new THREE.Color('#b6c5c2');
 scene.fog=new THREE.FogExp2('#c4cec8',.00031);
 camera=new THREE.PerspectiveCamera(50,1,1,12000);
 scene.add(new THREE.HemisphereLight(0xe5edf0,0x66704e,1.75));
 const sun=new THREE.DirectionalLight(0xffe8bd,2.15);sun.position.set(-850,1350,-520);scene.add(sun);
 createTerrain();
 setProgress('Ajout du lac, du barrage, du fleuve et des ponts…',50);
 createWater();createBridges();createDam();createRoads();
 setProgress('Peuplement des villages, vignobles et forêts…',74);
 const countTrees=createForest();createVineyards();createResourceZones();createLandscapeDetails();createClearings();
 setProgress('Placement des 31 lieux géographiques…',92);
 createLandmarkPins();drawMini();
 const frameKeys=controller();
 function resize(){const width=innerWidth,height=innerHeight;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 addEventListener('resize',resize);resize();
 $('info').textContent='31 sites géographiques, '+countTrees.toLocaleString('fr-FR')+
  ' arbres 3D regroupés en massifs, Hérault, ponts, clairières, causses, garrigues et zones naturelles. Continent vierge : aucun village préconstruit. Les 31 lieux servent de repères géographiques.';
 setProgress('Bienvenue dans les Terres des Sales Fils.',100);
 setTimeout(()=>{loading.style.display='none'},330);
 flyTo('campagnan');
 desiredDistance=2500;desiredTarget.set(sx(1150),0,sz(1040));
 let last=performance.now(),counter=0;
 function tick(now){
  requestAnimationFrame(tick);
  const dt=clamp((now-last)/1000,0,.065);last=now;
  frameKeys(dt);updateCamera(dt);
  renderer.render(scene,camera);
  counter++;if(counter%6===0)updateLabels();if(counter%15===0)updateMini();
 }
 requestAnimationFrame(tick);
}
main().catch(e=>{
 console.error('FILS OF WAR 3D',e);
 $('loadmsg').textContent='La scène 3D n’a pas pu démarrer.';
 $('loaderror').style.display='block';
 $('loaderror').textContent=String(e.stack||e);
});
