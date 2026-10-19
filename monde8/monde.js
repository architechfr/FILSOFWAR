/* FILS OF WAR - WORLD8 - v0.1, laboratoire independant.
 * Carte deterministe 2048 x 2048, 8 capitales, 256 secteurs.
 * L'ancien jeu 768 x 768 / 2 joueurs n'est ni modifie ni remplace.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FOW_WORLD8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var SIZE=2048,STEP=4,CELLS=512,HEIGHT_SIZE=513,CHUNK=64,SECTOR=128,PLAYERS=8;
var CAPITALS=[
  [960,320],[1472,576],[1728,960],[1472,1472],
  [960,1728],[576,1472],[320,960],[576,576]
];
var NAMES=['Campawood du Nord','Gorges Orientales','Hautes Terres','Causses du Sud',
           'Prairies du Midi','Coteaux de Belarga','Bois de l’Ouest','Ruffes du Salagou'];
var BIOMES={
  ruffes:{label:'Ruffes rouges',color:[161,85,58]},
  foret:{label:'Forêt de chênes',color:[70,112,69]},
  vignes:{label:'Vignobles',color:[143,167,83]},
  prairie:{label:'Prairies',color:[125,165,100]},
  causse:{label:'Causses rocheux',color:[147,145,120]},
  ripisylve:{label:'Rives et zones humides',color:[80,141,113]}
};
var LANDMARKS=[
  {name:'Lac du Salagou',type:'lac',x:832,z:832},
  {name:'Barrage du Salagou',type:'barrage',x:878,z:1000},
  {name:'Pic Saint-Loup',type:'sommet',x:1710,z:405},
  {name:'Gorges de l’Hérault',type:'gorges',x:1450,z:790},
  {name:'Campagnan',type:'bourg',x:920,z:1330},
  {name:'Bélarga',type:'bourg',x:1220,z:1500},
  {name:'Forêt de Campawood',type:'foret',x:350,z:345}
];
var BRIDGES=[1184,1504,1856];
var LIMITS={infanterie:34,cavalerie:22,charrette:14,blindes:12};
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function smooth(t){return t*t*(3-2*t);}
function hash(a,b,c){
  var h=(Math.imul(a|0,0x7feb352d)^Math.imul(b|0,0x846ca68b)^Math.imul(c|0,0x27d4eb2f))|0;
  h=Math.imul(h^(h>>>16),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return (h^(h>>>16))>>>0;
}
function seedOf(v){
  if(typeof v==='number'&&Number.isFinite(v))return (v>>>0)||2026;
  var s=String(v==null?'2026':v),h=2166136261;
  for(var i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);
  return (h>>>0)||2026;
}
function noise(x,z,size,seed){
  var fx=x/size,fz=z/size,ix=Math.floor(fx),iz=Math.floor(fz);
  fx=smooth(fx-ix);fz=smooth(fz-iz);
  var a=hash(ix,iz,seed)/4294967295,b=hash(ix+1,iz,seed)/4294967295;
  var c=hash(ix,iz+1,seed)/4294967295,d=hash(ix+1,iz+1,seed)/4294967295;
  return (a+(b-a)*fx)*(1-fz)+(c+(d-c)*fx)*fz;
}
function lakeParams(seed){
  return {x:832+(hash(seed,11,2)%45)-22,z:832+(hash(seed,13,3)%41)-20,
          shape:(hash(seed,17,5)%628)/100};
}
// Relief jouable : la nappe d'eau et ses collisions restent synchronisées.
function lakeAt(x,z,seed,lc){
  var a=(x-lc.x)/231,b=(z-lc.z)/164,dist=a*a+b*b;
  var waves=.155*Math.sin(a*5.6+b*3.2+lc.shape)
           +.09*Math.sin(a*9.4-b*4.4+lc.shape*.7);
  var east=Math.pow((x-(lc.x+165))/121,2)+Math.pow((z-(lc.z-35))/106,2);
  var west=Math.pow((x-(lc.x-150))/123,2)+Math.pow((z-(lc.z+52))/108,2);
  var north=Math.pow((x-(lc.x+32))/87,2)+Math.pow((z-(lc.z-138))/80,2);
  // Petite presqu'île pour rompre l'effet circulaire du plan d'eau.
  var peninsula=Math.pow((x-(lc.x-175))/62,2)+Math.pow((z-(lc.z+135))/64,2);
  var body=(dist<1+waves||east<1.045||west<1.04||north<.95)&&peninsula>=.60;
  // Queue hydraulique au sud, connectée à la rivière jusqu'au barrage.
  var neck=Math.pow((x-(lc.x+42))/29,2)+Math.pow((z-(lc.z+172))/60,2)<1;
  return body||neck;
}
function riverX(z,lc,seed){
  var dz=z-(lc.z+224);
  return lc.x+42+Math.sin(dz*.0074)*59+Math.sin(dz*.0178)*16;
}
function damZ(lc){return lc.z+244;}
function terrainKind(x,z,seed,lc){
  if(x<0||z<0||x>=SIZE||z>=SIZE)return 1;
  if(lakeAt(x,z,seed,lc))return 1;
  if(z>lc.z+156&&Math.abs(x-riverX(z,lc,seed))<11){
    if(Math.abs(z-damZ(lc))<6)return 3;
    for(var i=0;i<BRIDGES.length;i++)if(Math.abs(z-BRIDGES[i])<10)return 3;
    return 2;
  }
  return 0;
}
function peak(x,z,cx,cz,h,rx,rz){
  var a=(x-cx)/rx,b=(z-cz)/rz,d=a*a+b*b;
  if(d>=1)return 0;
  return h*Math.pow(1-d,1.45);
}
function heightRaw(x,z,seed,lc){
  var h=5+noise(x,z,230,seed+33)*20+noise(x,z,83,seed+47)*11+
           noise(x,z,27,seed+61)*3-18;
  h+=peak(x,z,1710,405,175,260,215);
  h+=peak(x,z,1490,675,86,185,215);
  h+=peak(x,z,425,285,98,215,185);
  h+=peak(x,z,490,1200,74,245,170);
  h+=peak(x,z,1590,1200,95,230,205);
  h+=peak(x,z,790,450,63,200,185);
  h+=peak(x,z,1050,1800,50,245,160);
  // Crêtes et belvédères des ruffes, jouables avec leurs propres pentes.
  h+=peak(x,z,545,735,82,135,175);
  h+=peak(x,z,1115,650,106,176,200);
  h+=peak(x,z,1210,900,84,151,156);
  h+=peak(x,z,645,1103,75,165,119);
  h+=peak(x,z,1046,1114,64,128,127);
  var towardLake=Math.hypot((x-lc.x)/250,(z-lc.z)/220);
  if(towardLake<1.5)h-=Math.max(0,1.5-towardLake)*7;
  if(z>lc.z+130){
    var rx=riverX(z,lc,seed),dr=Math.abs(x-rx);
    if(dr<70)h-=Math.pow((70-dr)/70,2)*16;
  }
  return h;
}
function heightBase(x,z,seed,lc){
  var h=heightRaw(x,z,seed,lc);
  // Plateaux des 8 capitales: constructibles, mais raccordes sans terrasse brute.
  for(var i=0;i<CAPITALS.length;i++){
    var p=CAPITALS[i],dist=Math.hypot(x-p[0],z-p[1]);
    if(dist>=160)continue;
    var t=dist<=83?0:smooth((dist-83)/77);
    var niveau=8+(hash(seed,i,200)%45)/10;
    h=niveau*(1-t)+h*t;
  }
  var kind=terrainKind(x,z,seed,lc);
  if(kind===1)return -3;
  if(kind===2)return -1;
  if(kind===3)return 2;
  // Raccordement lissé des ponts/barrage aux berges.
  if(z>lc.z+158){
    var delta=Math.abs(x-riverX(z,lc,seed));
    if(delta<42){
      var blend=smooth(clamp((delta-11)/31,0,1));
      h=2*(1-blend)+h*blend;
    }
  }
  return clamp(h,-2,230);
}
function secteurBiome(x,z,seed,lc){
  var distL=Math.hypot((x-lc.x)/330,(z-lc.z)/280);
  var rr=noise(x,z,310,seed+701);
  if(distL<1.05)return 'ruffes';
  if(Math.abs(x-riverX(z,lc,seed))<100&&z>lc.z+100)return 'ripisylve';
  if(x<640&&z<780)return 'foret';
  if(x>1370&&z<1330)return 'causse';
  if(z>1190&&x>620&&x<1480)return rr>.34?'vignes':'prairie';
  if(x<640)return rr>.53?'foret':'prairie';
  return rr>.58?'causse':rr>.32?'prairie':'vignes';
}
function generate(value){
  var seed=seedOf(value),lc=lakeParams(seed),HH=new Int16Array(HEIGHT_SIZE*HEIGHT_SIZE);
  var water=new Uint8Array(CELLS*CELLS),slope=new Uint8Array(CELLS*CELLS);
  for(var z=0;z<HEIGHT_SIZE;z++)for(var x=0;x<HEIGHT_SIZE;x++){
    // Decimetres entiers : altitude canonique pour les controles de pente.
    HH[z*HEIGHT_SIZE+x]=Math.round(heightBase(x*STEP,z*STEP,seed,lc)*10);
  }
  function at(x,z){
    var ax=clamp(x/STEP,0,CELLS-0.000001),az=clamp(z/STEP,0,CELLS-0.000001);
    var ix=Math.floor(ax),iz=Math.floor(az),fx=ax-ix,fz=az-iz,k=iz*HEIGHT_SIZE+ix;
    return (HH[k]*(1-fx)*(1-fz)+HH[k+1]*fx*(1-fz)+
            HH[k+HEIGHT_SIZE]*(1-fx)*fz+HH[k+HEIGHT_SIZE+1]*fx*fz)/10;
  }
  var peakHeight=-999,flood=0;
  for(var iz=0;iz<CELLS;iz++)for(var ix=0;ix<CELLS;ix++){
    var k=iz*CELLS+ix,x=ix*STEP+STEP/2,z=iz*STEP+STEP/2;
    water[k]=terrainKind(x,z,seed,lc);
    if(water[k]===1||water[k]===2)flood++;
    var dhdx=(HH[iz*HEIGHT_SIZE+ix+1]-HH[iz*HEIGHT_SIZE+ix])/40;
    var dhdz=(HH[(iz+1)*HEIGHT_SIZE+ix]-HH[iz*HEIGHT_SIZE+ix])/40;
    slope[k]=Math.min(89,Math.round(Math.atan(Math.hypot(dhdx,dhdz))*180/Math.PI));
    if(HH[iz*HEIGHT_SIZE+ix]>peakHeight)peakHeight=HH[iz*HEIGHT_SIZE+ix];
  }
  var sectors=[];
  for(var row=0;row<16;row++)for(var col=0;col<16;col++){
    var cx=col*SECTOR+64,cz=row*SECTOR+64;
    var ix=Math.floor(cx/STEP),iz=Math.floor(cz/STEP),elev=HH[iz*HEIGHT_SIZE+ix]/10;
    var biome=secteurBiome(cx,cz,seed,lc);
    var index=row*16+col,land=0;
    for(var dz=-56;dz<=56;dz+=16)for(var dx=-56;dx<=56;dx+=16){
      var i2=Math.floor((cz+dz)/STEP)*CELLS+Math.floor((cx+dx)/STEP);
      if(water[i2]===0||water[i2]===3)land++;
    }
    sectors.push({id:index,label:String.fromCharCode(65+col)+(row+1),col,row,
      x:cx,z:cz,biome,elevation:elev,landRatio:land/64,
      resources:{food:110+hash(seed,index,11)%85,wood:100+hash(seed,index,12)%90,
                 stone:55+hash(seed,index,13)%90,gold:15+hash(seed,index,14)%35}});
  }

  var landmarks=LANDMARKS.map(function(p){return {name:p.name,type:p.type,x:p.x,z:p.z};});
  for(var li=0;li<landmarks.length;li++){
    if(landmarks[li].type==='lac'){landmarks[li].x=lc.x;landmarks[li].z=lc.z;}
    if(landmarks[li].type==='barrage'){
      landmarks[li].z=damZ(lc);landmarks[li].x=riverX(damZ(lc),lc,seed);
    }
  }
  var capitals=CAPITALS.map(function(p,seat){
    var col=Math.floor(p[0]/SECTOR),row=Math.floor(p[1]/SECTOR);
    var ix=Math.floor(p[0]/STEP),iz=Math.floor(p[1]/STEP),s=sectors[row*16+col];
    s.capital=seat;
    s.resources={food:220,wood:220,stone:135,gold:45};
    return {seat,name:NAMES[seat],x:p[0],z:p[1],sector:s.id,
      height:HH[iz*HEIGHT_SIZE+ix]/10,biome:s.biome};
  });
  function cellAt(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>=SIZE||z>=SIZE)
      return {outside:true,kind:1,slope:89,height:-3,biome:'causse'};
    var i=Math.floor(z/STEP)*CELLS+Math.floor(x/STEP);
    return {outside:false,kind:water[i],slope:slope[i],height:at(x,z),
            biome:secteurBiome(x,z,seed,lc)};
  }
  function canTraverse(kind,x,z){
    var c=cellAt(x,z);
    return !c.outside&&(c.kind===0||c.kind===3)&&c.slope<=LIMITS[kind||'infanterie'];
  }
  function reachable(kind){
    var visited=new Uint8Array(CELLS*CELLS),queue=new Int32Array(CELLS*CELLS),head=0,tail=0;
    var start=capitals[0],startId=Math.floor(start.z/STEP)*CELLS+Math.floor(start.x/STEP);
    visited[startId]=1;queue[tail++]=startId;
    var maxSlope=LIMITS[kind||'infanterie'];
    while(head<tail){
      var id=queue[head++],x=id%CELLS,z=(id-x)/CELLS;
      var n=[x>0?id-1:-1,x<CELLS-1?id+1:-1,z>0?id-CELLS:-1,z<CELLS-1?id+CELLS:-1];
      for(var k=0;k<4;k++){
        var j=n[k];if(j<0||visited[j]||(water[j]!==0&&water[j]!==3)||slope[j]>maxSlope)continue;
        visited[j]=1;queue[tail++]=j;
      }
    }
    return {units:tail,accessible:capitals.map(function(c){
      var i=Math.floor(c.z/STEP)*CELLS+Math.floor(c.x/STEP);return !!visited[i];
    })};
  }
  var checksum=2166136261;
  for(var i=0;i<HH.length;i+=23)checksum=Math.imul(checksum^HH[i],16777619);
  for(var i=0;i<water.length;i+=17)checksum=Math.imul(checksum^water[i],16777619);
  return {seed,size:SIZE,step:STEP,chunk:CHUNK,sectors,capitals,landmarks,
    biomeColors:BIOMES,heightMap:HH,water,slope,
    lake:{x:lc.x,z:lc.z,shape:lc.shape,damX:riverX(damZ(lc),lc,seed),damZ:damZ(lc)},
    riverX:function(z){return riverX(z,lc,seed)},cellAt,heightAt:at,canTraverse,reachable,
    peak:peakHeight/10,waterCells:flood,checksum:(checksum>>>0).toString(16)};
}
return Object.freeze({VERSION:'0.1',SIZE,STEP,CHUNK,SECTOR,PLAYERS,BIOMES,
  SLOPE_LIMITS:Object.freeze(LIMITS),CAPITALS:CAPITALS.map(function(p){return p.slice()}),
  BRIDGES:BRIDGES.slice(),LANDMARKS:LANDMARKS.slice(),generate,seedOf});
});
