/* FILS OF WAR - WIDE WORLD LAB - v0.2 (19/10/2026)
 * Carte rectangulaire 2560 x 1536, relief mieux dose, 31 lieux repartis.
 * Le Salagou est une piece du puzzle, pas le centre du monde.
 * Laboratoire cartographique uniquement : aucun gameplay historique n'est remplace.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FOW_WORLD8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

var WIDTH=2560,HEIGHT=1536,STEP=4,COLS=WIDTH/STEP,ROWS=HEIGHT/STEP,
    HEIGHT_COLS=COLS+1,HEIGHT_ROWS=ROWS+1,SECTOR=128,SECTOR_COLS=20,SECTOR_ROWS=12,PLAYERS=8;

var CAPITALS=[
  [300,270],[1000,220],[1850,230],[2290,590],
  [2160,1260],[1450,1310],[720,1270],[250,870]
];

var NAMES=[
  'Campawood de l’Ouest','Plateaux du Nord','Gorges Orientales','Terres du Pic',
  'Plaines du Levant','Vignobles du Midi','Vallee de Campagnan','Ruffes du Salagou'
];

var BIOMES={
  foret:{label:'Foret et sous-bois',color:[63,101,61]},
  prairie:{label:'Prairies et plaines',color:[123,154,84]},
  vignes:{label:'Vignobles',color:[143,157,74]},
  ruffes:{label:'Ruffes rouges',color:[155,76,55]},
  causse:{label:'Causses rocheux',color:[133,131,112]},
  ripisylve:{label:'Rives de l’Herault',color:[76,133,103]},
  garrigue:{label:'Garrigue',color:[112,126,78]}
};

var LANDMARKS=[
  {name:'Campawood',type:'foret',x:210,z:290},
  {name:'Bois des Chenes',type:'foret',x:430,z:190},
  {name:'Plateau des Sources',type:'source',x:760,z:170},
  {name:'Lodeve',type:'bourg',x:1020,z:210},
  {name:'Cirque de Navacelles',type:'cirque',x:1420,z:160},
  {name:'Saint-Guilhem-le-Desert',type:'bourg',x:1690,z:250},
  {name:'Gorges de l’Herault',type:'gorges',x:1820,z:370},
  {name:'Pic Saint-Loup',type:'sommet',x:2240,z:270},
  {name:'Causse d’Aumelas',type:'causse',x:1980,z:520},
  {name:'Aniane',type:'bourg',x:1640,z:560},
  {name:'Gignac',type:'bourg',x:1510,z:640},
  {name:'Barrage du Salagou',type:'barrage',x:1035,z:690},
  {name:'Lac du Salagou',type:'lac',x:850,z:630},
  {name:'Celles',type:'bourg',x:760,z:560},
  {name:'Octon',type:'bourg',x:650,z:660},
  {name:'Moureze',type:'bourg',x:930,z:520},
  {name:'Villeneuvette',type:'bourg',x:1100,z:500},
  {name:'Clermont-l’Herault',type:'bourg',x:1160,z:650},
  {name:'Belarga',type:'bourg',x:1330,z:880},
  {name:'Campagnan',type:'bourg',x:1120,z:1010},
  {name:'Paulhan',type:'bourg',x:980,z:930},
  {name:'Aspiran',type:'bourg',x:1260,z:970},
  {name:'Canet',type:'bourg',x:1450,z:800},
  {name:'Tressan',type:'bourg',x:1510,z:930},
  {name:'Fontes',type:'bourg',x:780,z:1030},
  {name:'Neffies',type:'bourg',x:650,z:1120},
  {name:'Roujan',type:'bourg',x:520,z:1250},
  {name:'Pezenas',type:'bourg',x:960,z:1270},
  {name:'Montagnac',type:'bourg',x:1260,z:1290},
  {name:'Meze',type:'bourg',x:1570,z:1370},
  {name:'Belvedere des Barons',type:'belvedere',x:2050,z:960}
];

var BRIDGES=[720,880,1040,1210,1360];
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
function peak(x,z,cx,cz,h,rx,rz,p){
  var a=(x-cx)/rx,b=(z-cz)/rz,d=a*a+b*b;
  if(d>=1)return 0;
  return h*Math.pow(1-d,p||1.55);
}
function valley(x,z,cx,cz,depth,rx,rz){
  return -peak(x,z,cx,cz,depth,rx,rz,1.8);
}
function lakeParams(seed){
  return {x:850+(hash(seed,11,2)%37)-18,z:630+(hash(seed,13,3)%31)-15,shape:(hash(seed,17,5)%628)/100};
}
function lakeAt(x,z,seed,lc){
  var a=(x-lc.x)/245,b=(z-lc.z)/150,dist=a*a+b*b;
  var waves=.11*Math.sin(a*5.1+b*2.8+lc.shape)+.08*Math.sin(a*8.4-b*3.8+lc.shape*.7);
  var west=Math.pow((x-(lc.x-155))/115,2)+Math.pow((z-(lc.z+30))/82,2);
  var east=Math.pow((x-(lc.x+150))/120,2)+Math.pow((z-(lc.z-38))/88,2);
  return dist<1+waves||west<1||east<1;
}
function riverX(z,lc,seed){
  var base=lc.x+205+(z-lc.z)*.44;
  return base+Math.sin(z*.008+seed*.00001)*55+Math.sin(z*.019+lc.shape)*16;
}
function terrainKind(x,z,seed,lc){
  if(x<0||z<0||x>=WIDTH||z>=HEIGHT)return 1;
  if(lakeAt(x,z,seed,lc))return 1;
  if(z>lc.z+90){
    var rx=riverX(z,lc,seed);
    if(Math.abs(x-rx)<8){
      for(var i=0;i<BRIDGES.length;i++)if(Math.abs(z-BRIDGES[i])<11)return 3;
      return 2;
    }
  }
  return 0;
}
function heightRaw(x,z,seed,lc){
  // Base volontairement douce : grandes plaines avant les massifs.
  var h=8+(noise(x,z,360,seed+31)-.5)*15+(noise(x,z,140,seed+47)-.5)*7+(noise(x,z,52,seed+61)-.5)*2.2;

  // Reliefs localises.
  h+=peak(x,z,2240,270,185,230,190,1.7);  // Pic Saint-Loup
  h+=peak(x,z,1840,360,86,260,180,1.7);   // Gorges
  h+=peak(x,z,1450,150,78,260,170,1.7);   // Navacelles / causses
  h+=peak(x,z,1030,190,58,220,170,1.7);   // Lodevois
  h+=peak(x,z,450,220,44,250,180,1.8);    // bois ouest
  h+=peak(x,z,2020,520,62,300,200,1.8);   // Aumelas
  h+=peak(x,z,2050,960,50,260,220,1.8);   // belvedere
  h+=peak(x,z,620,1280,36,280,180,1.8);   // coteaux sud-ouest

  // Ruffes : collines basses autour du lac, pas une couronne montagneuse.
  h+=peak(x,z,690,570,24,300,200,1.9);
  h+=peak(x,z,1030,620,19,280,190,1.9);

  // Grandes zones respirantes / plaines.
  h+=valley(x,z,1180,970,9,660,360);
  h+=valley(x,z,1500,1180,7,720,330);
  h+=valley(x,z,470,900,5,500,330);

  // Couloir de l'Herault.
  if(z>lc.z+80){
    var rx=riverX(z,lc,seed),dr=Math.abs(x-rx);
    if(dr<95)h-=Math.pow((95-dr)/95,2)*13;
  }
  return h;
}
function heightBase(x,z,seed,lc){
  var h=heightRaw(x,z,seed,lc);
  for(var i=0;i<CAPITALS.length;i++){
    var p=CAPITALS[i],dist=Math.hypot(x-p[0],z-p[1]);
    if(dist>=150)continue;
    var t=dist<=78?0:smooth((dist-78)/72);
    var niveau=9+(hash(seed,i,200)%30)/10;
    h=niveau*(1-t)+h*t;
  }
  var kind=terrainKind(x,z,seed,lc);
  if(kind===1)return -3;
  if(kind===2)return -1;
  return clamp(h,-2,230);
}
function secteurBiome(x,z,seed,lc){
  var distL=Math.hypot((x-lc.x)/390,(z-lc.z)/300);
  var rr=noise(x,z,330,seed+701);
  if(distL<1.04)return 'ruffes';
  if(z>lc.z+70&&Math.abs(x-riverX(z,lc,seed))<115)return 'ripisylve';
  if(x<560&&z<700)return 'foret';
  if(x>1700&&z<650)return 'causse';
  if(x>1950&&z<1100)return 'garrigue';
  if(z>880&&x>700&&x<1700)return rr>.38?'vignes':'prairie';
  if(z>1180&&x<850)return rr>.55?'garrigue':'vignes';
  if(x<750)return rr>.5?'foret':'prairie';
  return rr>.67?'causse':rr>.38?'prairie':'vignes';
}

function generate(value){
  var seed=seedOf(value),lc=lakeParams(seed);
  var HH=new Int16Array(HEIGHT_COLS*HEIGHT_ROWS);
  var water=new Uint8Array(COLS*ROWS),slope=new Uint8Array(COLS*ROWS);

  for(var gz=0;gz<HEIGHT_ROWS;gz++)for(var gx=0;gx<HEIGHT_COLS;gx++)
    HH[gz*HEIGHT_COLS+gx]=Math.round(heightBase(gx*STEP,gz*STEP,seed,lc)*10);

  function at(x,z){
    var ax=clamp(x/STEP,0,COLS-0.000001),az=clamp(z/STEP,0,ROWS-0.000001);
    var ix=Math.floor(ax),iz=Math.floor(az),fx=ax-ix,fz=az-iz,k=iz*HEIGHT_COLS+ix;
    return (HH[k]*(1-fx)*(1-fz)+HH[k+1]*fx*(1-fz)+
            HH[k+HEIGHT_COLS]*(1-fx)*fz+HH[k+HEIGHT_COLS+1]*fx*fz)/10;
  }

  var peakHeight=-999,flood=0,flat=0;
  for(var iz=0;iz<ROWS;iz++)for(var ix=0;ix<COLS;ix++){
    var k=iz*COLS+ix,x=ix*STEP+STEP/2,z=iz*STEP+STEP/2;
    water[k]=terrainKind(x,z,seed,lc);
    if(water[k]===1||water[k]===2)flood++;
    var dhdx=(HH[iz*HEIGHT_COLS+ix+1]-HH[iz*HEIGHT_COLS+ix])/40;
    var dhdz=(HH[(iz+1)*HEIGHT_COLS+ix]-HH[iz*HEIGHT_COLS+ix])/40;
    slope[k]=Math.min(89,Math.round(Math.atan(Math.hypot(dhdx,dhdz))*180/Math.PI));
    if(slope[k]<=8&&water[k]===0)flat++;
    if(HH[iz*HEIGHT_COLS+ix]>peakHeight)peakHeight=HH[iz*HEIGHT_COLS+ix];
  }

  var sectors=[];
  for(var row=0;row<SECTOR_ROWS;row++)for(var col=0;col<SECTOR_COLS;col++){
    var cx=col*SECTOR+64,cz=row*SECTOR+64;
    var secIndex=row*SECTOR_COLS+col,biome=secteurBiome(cx,cz,seed,lc),land=0,total=0;
    for(var dz=-48;dz<=48;dz+=16)for(var dx=-48;dx<=48;dx+=16){
      var px=clamp(cx+dx,0,WIDTH-1),pz=clamp(cz+dz,0,HEIGHT-1);
      var wi=Math.floor(pz/STEP)*COLS+Math.floor(px/STEP);total++;
      if(water[wi]===0||water[wi]===3)land++;
    }
    sectors.push({id:secIndex,label:String.fromCharCode(65+col)+(row+1),col,row,x:cx,z:cz,biome,
      elevation:at(cx,cz),landRatio:land/total,
      resources:{food:110+hash(seed,secIndex,11)%85,wood:100+hash(seed,secIndex,12)%90,
                 stone:55+hash(seed,secIndex,13)%90,gold:15+hash(seed,secIndex,14)%35}});
  }

  var capitals=CAPITALS.map(function(p,seat){
    var col=Math.min(SECTOR_COLS-1,Math.floor(p[0]/SECTOR)),row=Math.min(SECTOR_ROWS-1,Math.floor(p[1]/SECTOR));
    var s=sectors[row*SECTOR_COLS+col];s.capital=seat;s.resources={food:220,wood:220,stone:135,gold:45};
    return {seat,name:NAMES[seat],x:p[0],z:p[1],sector:s.id,height:at(p[0],p[1]),biome:s.biome};
  });

  function cellAt(x,z){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>=WIDTH||z>=HEIGHT)
      return {outside:true,kind:1,slope:89,height:-3,biome:'causse'};
    var i=Math.floor(z/STEP)*COLS+Math.floor(x/STEP);
    return {outside:false,kind:water[i],slope:slope[i],height:at(x,z),biome:secteurBiome(x,z,seed,lc)};
  }
  function canTraverse(kind,x,z){
    var c=cellAt(x,z);
    return !c.outside&&(c.kind===0||c.kind===3)&&c.slope<=LIMITS[kind||'infanterie'];
  }
  function reachable(kind){
    var visited=new Uint8Array(COLS*ROWS),queue=new Int32Array(COLS*ROWS),head=0,tail=0;
    var start=capitals[0],startId=Math.floor(start.z/STEP)*COLS+Math.floor(start.x/STEP);
    visited[startId]=1;queue[tail++]=startId;
    var maxSlope=LIMITS[kind||'infanterie'];
    while(head<tail){
      var id=queue[head++],x=id%COLS,z=(id-x)/COLS;
      var n=[x>0?id-1:-1,x<COLS-1?id+1:-1,z>0?id-COLS:-1,z<ROWS-1?id+COLS:-1];
      for(var q=0;q<4;q++){
        var j=n[q];if(j<0||visited[j]||(water[j]!==0&&water[j]!==3)||slope[j]>maxSlope)continue;
        visited[j]=1;queue[tail++]=j;
      }
    }
    return {units:tail,accessible:capitals.map(function(c){
      var i=Math.floor(c.z/STEP)*COLS+Math.floor(c.x/STEP);return !!visited[i];
    })};
  }

  var checksum=2166136261;
  for(var i=0;i<HH.length;i+=29)checksum=Math.imul(checksum^HH[i],16777619);
  for(var j=0;j<water.length;j+=19)checksum=Math.imul(checksum^water[j],16777619);

  return {seed,width:WIDTH,height:HEIGHT,size:WIDTH,step:STEP,cols:COLS,rows:ROWS,sectorCols:SECTOR_COLS,sectorRows:SECTOR_ROWS,
    sectors,capitals,landmarks:LANDMARKS.slice(),biomeColors:BIOMES,heightMap:HH,water,slope,
    riverX:function(z){return riverX(z,lc,seed)},cellAt,heightAt:at,canTraverse,reachable,
    peak:peakHeight/10,waterCells:flood,flatRatio:flat/(COLS*ROWS),checksum:(checksum>>>0).toString(16)};
}

return Object.freeze({
  VERSION:'0.2-wide',WIDTH,HEIGHT,STEP,SECTOR,PLAYERS,BIOMES,
  SLOPE_LIMITS:Object.freeze(LIMITS),CAPITALS:CAPITALS.map(function(p){return p.slice()}),
  BRIDGES:BRIDGES.slice(),LANDMARKS:LANDMARKS.slice(),generate,seedOf
});
});