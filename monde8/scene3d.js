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
 ruffes:'#ae6249',causse:'#aba494',garrigue:'#879b69',riverside:'#83ab7e',
 prairie:'#94ad6c',vignes:'#9cac69',coast:'#d1c49b',sea:'#499bb1'
};
const featureFlags={labels:true,trees:true,roads:true};
function peak(x,z,cx,cz,h,rx,rz){
 const dx=(x-cx)/rx,dz=(z-cz)/rz,k=dx*dx+dz*dz;
 return k<1?h*Math.pow(1-k,1.7):0;
}
function isLake(x,z){
 const lx=geo.lake.x,lz=geo.lake.z,a=(x-lx)/190,b=(z-lz)/146;
 const dist=a*a+b*b,wiggle=.12*Math.sin(a*5.2+b*3)+.08*Math.sin(a*8-b*4);
 const east=Math.pow((x-lx-129)/87,2)+Math.pow((z-lz+43)/82,2);
 const west=Math.pow((x-lx+116)/91,2)+Math.pow((z-lz-21)/75,2);
 return dist<1+wiggle||east<1.02||west<1.01;
}
function nearLake(x,z){
 const dx=(x-geo.lake.x)/202,dz=(z-geo.lake.z)/154;
 return Math.hypot(dx,dz);
}
function streamDist(x,z){
 const lx=geo.lake.x,lz=geo.lake.z;
 const from={x:lx+51,z:lz+165},to=geo.xy(43.607,3.495);
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
   peak(x,z,sl.x,sl.z,215,230,215)+
   peak(x,z,gorges.x-40,gorges.z-100,95,160,190)+
   peak(x,z,lodeve.x-40,lodeve.z-65,115,230,250)+
   peak(x,z,500,250,138,350,290)+
   peak(x,z,360,750,76,245,200)+
   peak(x,z,1250,470,54,220,180)+
   peak(x,z,730,1020,39,160,140);
 const coastalDist=sea-z;
 if(coastalDist<185)h*=smooth(clamp(coastalDist/185,0,1))*.67+ .05;
 if(isLake(x,z))return -12;
 if(nearLake(x,z)<1.8){
   const valley=smooth(clamp((nearLake(x,z)-.95)/.85,0,1));
   h=mix(3.5,h,valley);
 }
 const rd=geo.riverDistance(x,z);
 if(rd<48){
   const t=smooth(clamp(rd/48,0,1));
   h=mix(-10,h,t);
 }
 const sd=streamDist(x,z);
 if(sd<22&&x>geo.lake.x){
   h=mix(-8,h,smooth(clamp(sd/22,0,1)));
 }
 if(geo.isSea(x,z))return -11;
 return h;
}
function safeH(x,z){return elevation(clamp(x,0,2048),clamp(z,0,2048));}
function landmarkY(p){return safeH(p.x,p.z)+5;}
const vtmp=new THREE.Vector3();
function createTerrain(){
 const N=192,positions=new Float32Array((N+1)*(N+1)*3);
 const c=new Float32Array((N+1)*(N+1)*3),index=[];
 const color=new THREE.Color(),palette={};
 Object.entries(colors).forEach(([k,v])=>palette[k]=new THREE.Color(v));
 const white=new THREE.Color('#f0e3bd');
 for(let z=0;z<=N;z++)for(let x=0;x<=N;x++){
  let xx=x*2048/N,zz=z*2048/N,i=(z*(N+1)+x)*3,h=elevation(xx,zz);
  positions[i]=xx;positions[i+1]=h;positions[i+2]=zz;
  let b=geo.region(xx,zz);
  color.copy(palette[b]||palette.prairie);
  const n=noise(xx,zz,93,42),t=(n-.5)*.19,rock=clamp((h-68)/140,0,.50);
  if(b==='ruffes')color.lerp(palette.causse,clamp((h-45)/150,0,.40));
  color.lerp(white,rock*.65);
  color.multiplyScalar(clamp(1+t,.75,1.22));
  if(geo.isSea(xx,zz)||isLake(xx,zz)||geo.riverDistance(xx,zz)<11)color.set('#586961');
  c.set([color.r,color.g,color.b],i);
 }
 for(let z=0;z<N;z++)for(let x=0;x<N;x++){
  const a=z*(N+1)+x,b=a+1,d=(z+1)*(N+1)+x,e=d+1;
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
 const step=8,loX=Math.max(0,cx-335),hiX=Math.min(2048,cx+335),loZ=Math.max(0,cz-250),hiZ=Math.min(2048,cz+250);
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
 const lakeMaterial=new THREE.MeshPhysicalMaterial({color:0x4b9b9c,roughness:.24,metalness:.04,transparent:true,opacity:.88,side:THREE.DoubleSide});
 const lakeMesh=new THREE.Mesh(lakeShape(),lakeMaterial);scene.add(lakeMesh);
 const seaShape=new THREE.Shape();
 seaShape.moveTo(0,2048);seaShape.lineTo(2048,2048);
 for(let i=geo.coast.length-1;i>=0;i--)seaShape.lineTo(geo.coast[i].x,geo.coast[i].z);
 seaShape.closePath();
 const seaGeo=new THREE.ShapeGeometry(seaShape,12);
 seaGeo.rotateX(Math.PI/2); // x-axis maps to x, 2D y becomes z
 // Due rotateX, yShape -> zShape, positive rotation produces positive z.
 const sea=new THREE.Mesh(seaGeo,new THREE.MeshPhysicalMaterial({color:0x2c91ad,roughness:.35,metalness:0,transparent:true,opacity:.88,side:THREE.DoubleSide}));
 sea.position.y=-3;scene.add(sea);
 ribbon(geo.river,8.5,'#5ca8b8',-2.15);
 const origin={x:geo.lake.x+50,z:geo.lake.z+170},out=geo.xy(43.607,3.495);
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
   const x=clamp(p.x,0,2048),z=clamp(p.z,0,2048);
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
   if(xx<0||xx>2048||zz<0||zz>2048||geo.isSea(xx,zz)||isLake(xx,zz)||geo.riverDistance(xx,zz)<12)continue;
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
  new THREE.MeshLambertMaterial({color:'#3d643d',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#527444',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#668352',flatShading:true}),
  new THREE.MeshLambertMaterial({color:'#426b59',flatShading:true})
 ];
 const max=6500,trees=[];
 let attempt=0;
 while(trees.length<max&&attempt<max*3){
  let x=random(attempt,707,81)*2048,z=random(attempt,811,41)*2048;
  attempt++;
  if(geo.isSea(x,z)||isLake(x,z)||geo.riverDistance(x,z)<20||streamDist(x,z)<15)continue;
  if(geo.sites.some(p=>Math.abs(p.x-x)<20&&Math.abs(p.z-z)<20))continue;
  const region=geo.region(x,z),chance=region==='garrigue'?.42:region==='causse'?.34:
   region==='ruffes'?.26:region==='vignes'?.28:region==='riverside'?.76:region==='coast'?.19:.65;
  if(random(x|0,z|0,103)>chance)continue;
  let h=safeH(x,z);if(h<-1||h>195)continue;
  let scale=.60+random(x|0,z|0,45)*1.35,variant=Math.min(leaves.length-1,Math.floor(random(x|0,z|0,76)*leaves.length));
  trees.push({x,z,h,scale,variant});
 }
 const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,trees.length);
 const groups=leaves.map((mat)=>new THREE.InstancedMesh(leafGeo,mat,Math.max(1,trees.filter(t=>t.variant===leaves.indexOf(mat)).length)));
 const counts=[0,0,0,0],dummy=new THREE.Object3D();
 trees.forEach((t,i)=>{
  if(!Number.isInteger(t.variant)||t.variant<0||t.variant>=groups.length)throw new Error('Indice de végétation invalide: '+t.variant);
  dummy.position.set(t.x,t.h+4*t.scale,t.z);dummy.rotation.y=random(t.x|0,t.z|0,98)*6.28;dummy.scale.set(t.scale,t.scale,t.scale);dummy.updateMatrix();
  trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.y=t.h+12.5*t.scale;dummy.scale.set(t.scale,t.scale*.75,t.scale);dummy.updateMatrix();
  groups[t.variant].setMatrixAt(counts[t.variant]++,dummy.matrix);
 });
 trunks.instanceMatrix.needsUpdate=true;scene.add(trunks);
 for(let i=0;i<4;i++){groups[i].count=counts[i];groups[i].instanceMatrix.needsUpdate=true;scene.add(groups[i]);}
 natureObjects=[trunks,...groups];return trees.length;
}
function createVineyards(){
 const mat=new THREE.MeshStandardMaterial({color:'#52794b',roughness:1});
 const geoBox=new THREE.BoxGeometry(2,2.4,5);
 const dummy=new THREE.Object3D();const positions=[];
 for(let x=490;x<1510;x+=36)for(let z=1040;z<1450;z+=29){
  const region=geo.region(x,z);if(region!=='vignes')continue;
  for(let row=0;row<3;row++)for(let c=0;c<4;c++){
   const xx=x+c*6,zz=z+row*7;
   if(isLake(xx,zz)||geo.isSea(xx,zz)||geo.riverDistance(xx,zz)<17)continue;
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
function createDam(){
 const cx=geo.lake.x,cz=geo.lake.z;
 const x=cx+49,z=cz+161,y=Math.max(2,safeH(x,z));
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
 for(const id of ['pont-diable','pont-canet']){
  const p=geo.landmark(id);if(!p)continue;
  const y=safeH(p.x,p.z);
  const group=new THREE.Group();
  const deck=new THREE.Mesh(new THREE.BoxGeometry(54,4,9),new THREE.MeshStandardMaterial({color:'#d6c9ae',roughness:1}));
  deck.position.y=10;group.add(deck);
  for(const dx of [-22,-10,10,22]){
   const support=new THREE.Mesh(new THREE.CylinderGeometry(3.5,4.3,22,6),new THREE.MeshStandardMaterial({color:'#afa78f'}));
   support.position.set(dx,-1.5,0);group.add(support);
  }
  group.position.set(p.x,y,p.z);
  group.rotation.y=.25;
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
 const cv=$('mini'),g=cv.getContext('2d'),N=cv.width;
 const data=g.createImageData(N,N);
 const palette={
 ruffes:[161,89,65],causse:[151,149,124],garrigue:[104,139,94],
 riverside:[90,157,135],prairie:[134,160,99],vignes:[144,153,91],
 coast:[209,192,147],sea:[67,145,169]
 };
 for(let z=0;z<N;z++)for(let x=0;x<N;x++){
  const xx=x*2048/N,zz=z*2048/N;
  const rgb=isLake(xx,zz)?[67,147,153]:palette[geo.region(xx,zz)];
  const i=(z*N+x)*4;data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=255;
 }
 g.putImageData(data,0,0);
 for(const p of geo.important){
  g.beginPath();g.fillStyle='#f5db9e';g.strokeStyle='#15241d';g.lineWidth=1.5;
  g.arc(p.x/2048*N,p.z/2048*N,2.7,0,Math.PI*2);g.fill();g.stroke();
 }
}
function updateMini(){
 const cv=$('mini'),g=cv.getContext('2d'),N=cv.width;
 if(!updateMini.background){updateMini.background=g.getImageData(0,0,N,N);}
 g.putImageData(updateMini.background,0,0);
 g.beginPath();g.strokeStyle='#fff7dc';g.lineWidth=2;
 g.arc(target.x/2048*N,target.z/2048*N,4.2,0,Math.PI*2);g.stroke();
 const ax=target.x/2048*N,az=target.z/2048*N;
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
   if(lastTouch!=null)desiredDistance=clamp(desiredDistance*lastTouch/Math.max(1,d),100,2050);
   lastTouch=d;
   desiredYaw-=dx*.002;
  }
  cameraTouched=true;
 });
 const stop=e=>{touches.delete(e.pointerId);if(touches.size<2)lastTouch=null;};
 c.addEventListener('pointerup',stop);c.addEventListener('pointercancel',stop);
 c.addEventListener('wheel',e=>{e.preventDefault();desiredDistance=clamp(desiredDistance*(e.deltaY>0?1.105:.91),95,2050);cameraTouched=true;},{passive:false});
 const keys=new Set();
 window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;keys.add(e.key.toLowerCase());});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 function frameKeys(dt){
  const delta=dt*desiredDistance*.75;
  const forward=(keys.has('w')||keys.has('z')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  const side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('q')||keys.has('arrowleft')?1:0);
  desiredTarget.x+=(-forward*Math.sin(desiredYaw)+side*Math.cos(desiredYaw))*delta;
  desiredTarget.z+=(-forward*Math.cos(desiredYaw)-side*Math.sin(desiredYaw))*delta;
  if(keys.has('r'))desiredDistance=clamp(desiredDistance-dt*desiredDistance,95,2050);
  if(keys.has('f'))desiredDistance=clamp(desiredDistance+dt*desiredDistance,95,2050);
 }
 $('zoomIn').addEventListener('click',()=>{desiredDistance=clamp(desiredDistance*.75,95,2050)});
 $('zoomOut').addEventListener('click',()=>{desiredDistance=clamp(desiredDistance*1.3,95,2050)});
 $('reset').addEventListener('click',()=>{desiredTarget.set(1060,0,1010);desiredDistance=1310;desiredPitch=1.04;desiredYaw=-.52});
 [['bLake','lake'],['bDam','dam'],['bPeak','peak'],['bGorges','gorges']].forEach(([btn,id])=>$(btn)?.addEventListener('click',()=>flyTo(id)));
 document.querySelectorAll('[data-fly]').forEach(el=>el.addEventListener('click',()=>flyTo(el.dataset.fly)));
 $('minimap').addEventListener('click',e=>{const r=$('minimap').getBoundingClientRect();
  desiredTarget.x=clamp((e.clientX-r.left)/r.width*2048,0,2048);
  desiredTarget.z=clamp((e.clientY-r.top)/r.height*2048,0,2048);desiredDistance=650;
 });
 return frameKeys;
}
function updateCamera(dt){
 const t=1-Math.exp(-dt*5.5);
 target.lerp(desiredTarget,t);yaw=lerp(yaw,desiredYaw,t);pitch=lerp(pitch,desiredPitch,t);distance=lerp(distance,desiredDistance,t);
 target.x=clamp(target.x,18,2030);target.z=clamp(target.z,18,2030);
 desiredTarget.x=clamp(desiredTarget.x,18,2030);desiredTarget.z=clamp(desiredTarget.z,18,2030);
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
 scene=new THREE.Scene();scene.background=new THREE.Color('#b4cad0');scene.fog=new THREE.FogExp2('#bfd1ca',.00056);
 camera=new THREE.PerspectiveCamera(50,1,1,7500);
 scene.add(new THREE.HemisphereLight(0xe0efff,0x5e7356,2.0));
 const sun=new THREE.DirectionalLight(0xfff0c9,2.5);sun.position.set(-550,1100,-420);scene.add(sun);
 createTerrain();
 setProgress('Ajout du lac, du barrage, du fleuve et des ponts…',50);
 createWater();createBridges();createDam();createRoads();
 setProgress('Peuplement des villages, vignobles et forêts…',74);
 createSettlements();const countTrees=createForest();createVineyards();
 setProgress('Placement des 31 lieux géographiques…',92);
 createLandmarkPins();drawMini();
 const frameKeys=controller();
 function resize(){const width=innerWidth,height=innerHeight;
  renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 addEventListener('resize',resize);resize();
 $('info').textContent='31 sites géographiques, '+countTrees.toLocaleString('fr-FR')+
  ' arbres 3D et 7 itinéraires. Les lieux proviennent de la carte v0.8.';
 setProgress('Bienvenue dans les Terres des Sales Fils.',100);
 setTimeout(()=>{loading.style.display='none'},330);
 flyTo('campagnan');
 desiredDistance=1020;desiredTarget.set(1150,0,1040);
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
