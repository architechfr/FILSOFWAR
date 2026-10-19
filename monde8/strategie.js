/* FILS OF WAR - Huit royaumes: simulation locale alpha.
 * 1 joueur humain + 7 IA. Aucun multiplayer reel ici. Economie, marche,
 * capture de territoires, escarmouches, production et sauvegarde d'etat.
 */
(function(root,factory){
 var a=factory();
 if(typeof module==='object'&&module.exports)module.exports=a;
 root.FOW_GAME8=a;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var COST={worker:{food:55,wood:0,stone:0,gold:0},soldier:{food:95,wood:35,stone:0,gold:0},
 scout:{food:75,wood:15,stone:0,gold:0},outpost:{food:0,wood:125,stone:45,gold:0},
 farm:{food:0,wood:85,stone:0,gold:0},sawmill:{food:0,wood:95,stone:25,gold:0},
 quarry:{food:0,wood:110,stone:0,gold:0},barracks:{food:0,wood:140,stone:65,gold:0},
 townhall:{food:0,wood:190,stone:140,gold:55}};
var TYPES={worker:{speed:18,hp:55,atk:3,range:10,pop:1},
 scout:{speed:27,hp:62,atk:9,range:10,pop:1},
 soldier:{speed:20,hp:105,atk:20,range:12,pop:1}};
function copy(x){return JSON.parse(JSON.stringify(x))}
function md2(a,b){var x=a.x-b.x,z=a.z-b.z;return x*x+z*z}
function dist(a,b){return Math.sqrt(md2(a,b))}
function cap(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function create(world,nav,opts){
 opts=opts||{};if(!world||!nav)throw Error('World8 et navigation requis');
 var seed=world.seed,player=cap(opts.playerSeat|0,0,7),difficulty=opts.difficulty||'normal',dt=0;
 var people=[],towns=[],buildings=[],outposts=[],sectors=world.sectors.map(function(s){return {id:s.id,owner:-1,food:s.resources.food,wood:s.resources.wood,stone:s.resources.stone,gold:s.resources.gold};});
 var civs=world.capitals.map(function(c){
  return {seat:c.seat,name:c.name,resources:{food:160,wood:180,stone:75,gold:20},age:1,home:null,
   units:0,popMax:12,isHuman:c.seat===player,score:0,started:false,aiNext:30+c.seat*3,alive:true};
 });
 var U=0,B=0,events=[],selected=null,clock=0,aiEnabled=opts.ai!==false,seedRand=(seed^0x6e6d5317)>>>0;
 function rand(){seedRand=(Math.imul(seedRand,1664525)+1013904223)>>>0;return seedRand/4294967296;}
 function log(text,seat){events.unshift({t:Math.round(clock),text,seat:seat==null?-1:seat});events.length=Math.min(events.length,45);}
 function owned(seat){return people.filter(function(u){return u.owner===seat&&u.hp>0});}
 function nearestSector(x,z){var a=Math.floor(x/128),b=Math.floor(z/128);return cap(b,0,15)*16+cap(a,0,15);}
 function hasCost(r,c){for(var k in c)if((r[k]||0)<c[k])return false;return true;}
 function pay(r,c){if(!hasCost(r,c))return false;for(var k in c)r[k]-=c[k];return true;}
 function isLand(x,z){return world.canTraverse('infanterie',x,z);}
 function spawn(owner,type,x,z){
  if(!TYPES[type]||!isLand(x,z))return null;
  var def=TYPES[type],u={id:'u'+(++U),owner,type,x,z,hp:def.hp,maxHp:def.hp,
    dest:null,route:null,way:0,task:'idle',cargo:0,attackTick:0,gatherSector:-1,retreat:false};
  people.push(u);return u;
 }
 function initial(seat,isHuman){
  var c=world.capitals[seat],f=civs[seat];if(f.started)return {ok:false,error:'Deja fonde'};
  var sec=nearestSector(c.x,c.z);
  if(!pay(f.resources,{food:0,wood:55,stone:0,gold:0}))return {ok:false,error:'Bois insuffisant'};
  f.started=true;f.home={x:c.x,z:c.z,sector:sec,level:1};
  sectors[sec].owner=seat;
  buildings.push({id:'b'+(++B),owner:seat,type:'townhall',x:c.x,z:c.z,sector:sec});
  for(var i=0;i<2;i++)spawn(seat,'worker',c.x-9+i*8,c.z+13);
  spawn(seat,'scout',c.x+8,c.z-13);
  f.popMax=12;f.units=owned(seat).length;f.aiNext=clock+17+seat*3;
  log(f.name+' fonde sa capitale.',seat);
  return {ok:true,sector:sec};
 }
 function found(){return initial(player,true);}
 function nextUnit(seat,type){
  var f=civs[seat];if(!f.started)return {ok:false,error:'Fonde d’abord ta capitale'};
  if(owned(seat).length>=f.popMax)return {ok:false,error:'Population maximale'};
  if(!pay(f.resources,COST[type]||{}))return {ok:false,error:'Ressources insuffisantes'};
  var q=f.home,b=spawn(seat,type,q.x-15+rand()*30,q.z+12+rand()*15);
  if(!b){for(var k in COST[type])f.resources[k]+=COST[type][k];return {ok:false,error:'Aucune place libre'};}
  f.units=owned(seat).length;return {ok:true,id:b.id};
 }
 function build(seat,type,sectorID){
  var f=civs[seat],sec=sectors[sectorID];
  if(!sec||sec.owner!==seat)return {ok:false,error:'Ce secteur ne t’appartient pas'};
  if(!COST[type]||!['farm','sawmill','quarry','barracks','outpost','townhall'].includes(type))return {ok:false,error:'Batiment inconnu'};
  if(type==='townhall'&&f.home.level>=3)return {ok:false,error:'Niveau maximal'};
  if(buildings.some(function(b){return b.owner===seat&&b.sector===sectorID&&b.type===type&&type!=='townhall'}))return {ok:false,error:'Deja construit'};
  if(!pay(f.resources,COST[type]))return {ok:false,error:'Ressources insuffisantes'};
  var spot=world.sectors[sectorID];
  if(type==='townhall'){f.home.level++;f.popMax+=8;f.age=Math.min(4,f.age+1);}
  else if(type==='outpost'){f.popMax+=2;}
  else if(type==='barracks'){f.popMax+=6;}
  buildings.push({id:'b'+(++B),owner:seat,type,x:spot.x,z:spot.z,sector:sectorID});
  log(f.name+' construit '+type+'.',seat);
  return {ok:true};
 }
 function destination(unitID,x,z,task,allowEnemy){
  var u=people.find(function(v){return v.id===unitID&&v.hp>0});
  if(!u||u.owner!==player)return {ok:false,error:'Unite inconnue'};
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<0||z<0||x>=2048||z>=2048)return {ok:false,error:'Hors carte'};
  var kind=u.type==='scout'?'cavalerie':'infanterie';
  var route=nav.path(kind,u.x,u.z,x,z,{maxVisited:65536});
  if(!route)return {ok:false,error:'Aucun passage praticable'};
  u.route=route;u.way=0;u.dest={x,z};
  u.task=task||'move';u.gatherSector=u.task==='gather'?nearestSector(x,z):-1;
  return {ok:true,distance:Math.round(dist(u,{x,z})),steps:route.length};
 }
 function orderMany(ids,x,z,task){
  var ok=0,failed=[],result=[];
  (ids||[]).forEach(function(id){var r=destination(id,x,z,task);if(r.ok){ok++;result.push(r)}else failed.push(r.error);});
  return {ok:ok>0,accepted:ok,failed:failed.slice(0,3),results:result};
 }
 function attack(seat,attacker,target){
  if(clock-attacker.attackTick<2.2)return;
  attacker.attackTick=clock;
  var dmg=TYPES[attacker.type].atk,home=world.capitals[target.owner];
  var slopeHigh=world.heightAt(attacker.x,attacker.z)-world.heightAt(target.x,target.z);
  if(slopeHigh>10)dmg=Math.round(dmg*1.16);
  var defenderSector=sectors[nearestSector(target.x,target.z)];
  if(defenderSector.owner===target.owner&&buildings.some(function(b){return b.owner===target.owner&&b.sector===defenderSector.id&&b.type==='outpost'}))
    dmg=Math.round(dmg*.8);
  target.hp-=Math.max(1,dmg);
  if(target.hp<=0){
   log(civs[attacker.owner].name+' vainc une unite de '+civs[target.owner].name,attacker.owner);
   if(attacker.owner===player)log('+10 filsous : victoire au combat',player),civs[player].resources.gold+=10;
  }
 }
 function fight(){
  var alive=people.filter(function(u){return u.hp>0});
  for(var i=0;i<alive.length;i++){
   var u=alive[i],best=null,d=Infinity;
   for(var j=0;j<alive.length;j++){
    var v=alive[j];if(u.owner===v.owner)continue;
    var dd=md2(u,v);if(dd<d){d=dd;best=v;}
   }
   if(best&&d<12*12)attack(u.owner,u,best);
  }
  people=people.filter(function(u){return u.hp>0});
  civs.forEach(function(f){f.units=owned(f.seat).length});
 }
 function capture(unit){
  var sect=nearestSector(unit.x,unit.z),s=sectors[sect];
  if(s.owner===unit.owner)return;
  if(unit.type==='worker')return;
  var f=civs[unit.owner],near=sectors.some(function(t){
   return t.owner===unit.owner&&
     (Math.abs(t.id%16-sect%16)+Math.abs(Math.floor(t.id/16)-Math.floor(sect/16))<=1);
  });
  if(!near)return;
  var enemies=people.filter(function(u){return u.owner!==unit.owner&&u.hp>0&&nearestSector(u.x,u.z)===sect});
  if(enemies.length)return;
  var previous=s.owner;s.owner=unit.owner;
  log(f.name+' revendique le secteur '+world.sectors[sect].label+'.',unit.owner);
  if(previous===-1){f.resources.gold+=3;f.score+=10;}
  else {f.score+=25;civs[previous].score=Math.max(0,civs[previous].score-15);}
 }
 function stepUnits(delta){
  for(var i=0;i<people.length;i++){
   var u=people[i];if(u.hp<=0)continue;
   if(u.route&&u.way<u.route.length){
    var goal=u.route[u.way],d=dist(u,goal),spd=TYPES[u.type].speed*delta;
    if(d<spd+1){u.x=goal.x;u.z=goal.z;u.way++;}
    else{var a=spd/d;u.x+=(goal.x-u.x)*a;u.z+=(goal.z-u.z)*a;}
    if(u.way>=u.route.length){u.route=null;u.way=0;capture(u);if(u.task==='move')u.task='idle';}
   }
   if(u.task==='gather'&&u.type==='worker'&&u.gatherSector>=0&&!u.route){
    var s=sectors[u.gatherSector],f=civs[u.owner];
    if(s.owner===u.owner){
     var keys=s.wood>=10?['wood','food','stone']:['food','wood','stone'];
     var k=keys[(Math.floor(clock/12)+u.gatherSector)%keys.length];
     if(s[k]>=1){var amount=delta*(k==='food'?2.6:1.6);s[k]=Math.max(0,s[k]-amount);f.resources[k]+=amount;}
    }
   }
  }
 }
 function economy(delta){
  for(var i=0;i<sectors.length;i++){
   var s=sectors[i],base=world.sectors[i].resources;
   s.food=Math.min(base.food,s.food+delta*.018);
   s.wood=Math.min(base.wood,s.wood+delta*.011);
   s.stone=Math.min(base.stone,s.stone+delta*.006);
   if(s.owner<0)continue;
   var f=civs[s.owner];
   if(s.id%8===Math.floor(clock/6)%8){
    f.resources.food+=delta*.25;
    f.resources.wood+=delta*.16;
   }
  }
  for(var b=0;b<buildings.length;b++){
   var q=buildings[b],f=civs[q.owner],mult=delta;
   if(q.type==='farm')f.resources.food+=mult*2.5;
   if(q.type==='sawmill')f.resources.wood+=mult*2;
   if(q.type==='quarry')f.resources.stone+=mult*1.3;
   if(q.type==='townhall'){f.resources.food+=mult*.8;f.resources.wood+=mult*.55;}
  }
 }
 function aiOrder(u,x,z,task){
  var kind=u.type==='scout'?'cavalerie':'infanterie',route=nav.path(kind,u.x,u.z,x,z,{maxVisited:65536});
  if(route){u.route=route;u.way=0;u.dest={x,z};u.task=task||'move';return true;}
  return false;
 }
 function aiThink(seat){
  var f=civs[seat];if(!f.started)return;
  var units=owned(seat),soldiers=units.filter(function(u){return u.type!=='worker'});
  if(units.length<8){nextUnit(seat,f.resources.food>105?'soldier':'worker');}
  else if(soldiers.length<6)nextUnit(seat,'soldier');
  var owns=sectors.filter(function(s){return s.owner===seat});
  if(owns.length&&rand()<.28){
   var s=owns[Math.floor(rand()*owns.length)];
   if(!buildings.some(function(b){return b.owner===seat&&b.sector===s.id&&b.type==='farm'}))build(seat,'farm',s.id);
  }
  var choices=[];
  for(var i=0;i<owns.length;i++){
   var q=owns[i],x=q.id%16,z=Math.floor(q.id/16);
   for(var d=0;d<4;d++){
    var nx=x+[-1,1,0,0][d],nz=z+[0,0,-1,1][d];
    if(nx<0||nx>=16||nz<0||nz>=16)continue;
    var k=nz*16+nx,t=sectors[k];
    if(t.owner!==seat&&world.sectors[k].landRatio>.28)choices.push(k);
   }
  }
  if(choices.length){
   var target=choices[Math.floor(rand()*choices.length)],pt=world.sectors[target];
   soldiers.slice(0,Math.min(3,soldiers.length)).forEach(function(u){if(!u.route)aiOrder(u,pt.x,pt.z,'move');});
  }
 }
 function update(delta){
  delta=cap(delta||0,0,.5);dt+=delta;
  if(dt<.05)return;
  var n=0;
  while(dt>=.05&&n<12){
   dt-=.05;clock+=.05;n++;
   stepUnits(.05);
   if(Math.floor(clock*2)!==Math.floor((clock-.05)*2))fight();
   if(Math.floor(clock*4)!==Math.floor((clock-.05)*4))economy(.25);
   if(aiEnabled)for(var i=0;i<8;i++)if(i!==player&&civs[i].aiNext<=clock){
    aiThink(i);civs[i].aiNext=clock+16+rand()*8;
   }
  }
 }
 function select(id){selected=id;return people.find(function(u){return u.id===id})||null;}
 function state(){
  return {version:1,seed,player,clock,people:copy(people),sectors:copy(sectors),
   civs:copy(civs),buildings:copy(buildings),events:copy(events),selected};
 }
 function summary(){
  var f=civs[player];
  return {clock,player,home:f.home,resources:copy(f.resources),age:f.age,score:f.score,
    pop:owned(player).length,popMax:f.popMax,owned:sectors.filter(function(s){return s.owner===player}).length,
    army:owned(player).filter(function(u){return u.type!=='worker'}).length,
    selected};
 }
 function save(){return JSON.stringify(state());}
 function load(json){
  var s=typeof json==='string'?JSON.parse(json):json;
  if(!s||s.version!==1||s.seed!==seed||s.player!==player)throw Error('Sauvegarde incompatible');
  if(!Array.isArray(s.people)||s.people.length>3000||!Array.isArray(s.sectors)||s.sectors.length!==256||
    !Array.isArray(s.civs)||s.civs.length!==8||!Array.isArray(s.buildings))throw Error('Sauvegarde invalide');
  clock=s.clock;people=copy(s.people);sectors=copy(s.sectors);civs=copy(s.civs);buildings=copy(s.buildings);events=copy(s.events||[]);
  U=Math.max(0,...people.map(function(u){return Number(u.id.slice(1))||0;}));
  B=Math.max(0,...buildings.map(function(b){return Number(b.id.slice(1))||0;}));
  selected=null;return true;
 }
 // Sept IA s'installent dans leur région; l'humain choisit quand fonder.
 for(var i=0;i<8;i++)if(i!==player)initial(i,false);
 log('Choisis ta capitale, puis clique Fonder mon royaume.',player);
 return {world,nav,player,civs,people:function(){return people},sectors:function(){return sectors},
  buildings:function(){return buildings},events:function(){return events},
  found,spawn:nextUnit,build:function(t,s){return build(player,t,s)},
  orderMany,destination,select,update,summary,state,save,load};
}
return Object.freeze({VERSION:1,COST,TYPES,create});
});
