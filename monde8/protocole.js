/* Fils of War - contrat et simulation de salon 8 joueurs.
 * Le module est independant du transport. Le serveur devra authentifier
 * chaque connexion, conserver l'etat et publier des snapshots autoritaires.
 */
(function(root,factory){
 var api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.FOW_NET8=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var MAX=8,TICK_MS=50,TURN_TICKS=5,DELAY_TURNS=3,MAX_COMMANDS=16,MAX_BYTES=8192,MAX_UNITS_PER_PLAYER=120;
var COMMANDS=['move','gather','hunt','build','train','attack','research','found','rally','trade','advanceAge','stop'];
function saneInt(v){return typeof v==='number'&&Number.isSafeInteger(v);}
function nonBlank(s,max){return typeof s==='string'&&s.trim().length>0&&s.length<=max;}
function point(x,z,size){
 return typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<size&&
        typeof z==='number'&&Number.isFinite(z)&&z>=0&&z<size;
}
function createLobby(opts){
 opts=opts||{};
 var seed=opts.seed>>>0||2026,size=opts.size||2048,worldHash=opts.worldHash||'pending';
 var seats=Array.from({length:MAX},function(_,i){return {seat:i,playerId:null,name:null,ready:false,connected:false,joinedAt:null,lastSeq:-1};});
 var status='waiting',epoch=1;
 var host=null,turn=0,orders=new Map(),reconnect=new Map();
 function snapshot(){
   return {v:1,seed,size,worldHash,epoch,status,host,turn,
     seats:seats.map(function(s){return {...s}})};
 }
 function add(playerId,name,token,now){
   if(status!=='waiting')return {ok:false,error:'PARTIE_DEMARREE'};
   if(!nonBlank(playerId,90)||!nonBlank(name,32)||!nonBlank(token,180))return {ok:false,error:'IDENTITE_INVALIDE'};
   for(var i=0;i<seats.length;i++)if(seats[i].playerId===playerId)return {ok:false,error:'DEJA_PRESENT'};
   var open=seats.find(function(s){return s.playerId===null});
   if(!open)return {ok:false,error:'COMPLET'};
   open.playerId=playerId;open.name=name.trim();open.ready=false;open.connected=true;open.joinedAt=now||0;
   reconnect.set(playerId,token);
   if(host===null)host=playerId;
   return {ok:true,seat:open.seat};
 }
 function ready(playerId,value){
   if(status!=='waiting')return {ok:false,error:'PARTIE_DEMARREE'};
   var s=seats.find(function(s){return s.playerId===playerId});
   if(!s)return {ok:false,error:'INCONNU'};
   s.ready=!!value;
   return {ok:true};
 }
 function leave(playerId){
   if(status!=='waiting')return {ok:false,error:'PARTIE_EN_COURS'};
   var s=seats.find(function(s){return s.playerId===playerId});
   if(!s)return {ok:false,error:'INCONNU'};
   s.playerId=null;s.name=null;s.ready=false;s.connected=false;s.joinedAt=null;s.lastSeq=-1;
   reconnect.delete(playerId);
   if(host===playerId){var next=seats.find(function(v){return v.playerId});host=next?next.playerId:null;}
   return {ok:true};
 }
 function start(playerId,minPlayers){
   if(playerId!==host)return {ok:false,error:'SEUL_HOTE'};
   if(status!=='waiting')return {ok:false,error:'DEJA_DEMARREE'};
   var active=seats.filter(function(s){return s.playerId!==null});
   if(active.length<(minPlayers||2)||active.some(function(s){return !s.ready}))
     return {ok:false,error:'JOUEURS_PAS_PRETS'};
   status='running';turn=0;epoch++;
   return {ok:true,players:active.map(function(s){return {seat:s.seat,id:s.playerId};})};
 }
 function disconnect(playerId){
   var s=seats.find(function(s){return s.playerId===playerId});
   if(!s)return {ok:false,error:'INCONNU'};
   s.connected=false;return {ok:true};
 }
 function resume(playerId,token){
   var s=seats.find(function(s){return s.playerId===playerId});
   if(!s||!nonBlank(token,180)||reconnect.get(playerId)!==token)return {ok:false,error:'NON_AUTORISE'};
   s.connected=true;
   return {ok:true,seat:s.seat,epoch:epoch,turn:turn,requireSnapshot:true};
 }
 function verify(command,seat){
   if(!command||typeof command!=='object'||Array.isArray(command))return false;
   if(COMMANDS.indexOf(command.type)<0)return false;
   if(command.units!=null&&(!Array.isArray(command.units)||command.units.length>MAX_UNITS_PER_PLAYER||
      command.units.some(function(x){return !nonBlank(x,64)})))return false;
   if(command.x!=null||command.z!=null)if(!point(command.x,command.z,size))return false;
   if(command.targetId!=null&&!nonBlank(command.targetId,64))return false;
   if(command.owner!=null&&command.owner!==seat)return false;
   return true;
 }
 function submit(playerId,packet){
   if(status!=='running')return {ok:false,error:'PARTIE_NON_DEMARREE'};
   var s=seats.find(function(s){return s.playerId===playerId});
   if(!s||!s.connected)return {ok:false,error:'NON_CONNECTE'};
   if(!packet||!saneInt(packet.seq)||packet.seq<=s.lastSeq)return {ok:false,error:'SEQUENCE_INVALIDE'};
   if(!saneInt(packet.turn)||packet.turn<turn+DELAY_TURNS||packet.turn>turn+DELAY_TURNS+3)
     return {ok:false,error:'TOUR_HORS_FENETRE'};
   if(!Array.isArray(packet.commands)||packet.commands.length>MAX_COMMANDS)
     return {ok:false,error:'TROP_DE_COMMANDES'};
   var data=JSON.stringify(packet);
   if(data.length>MAX_BYTES||packet.commands.some(function(cmd){return !verify(cmd,s.seat)}))
     return {ok:false,error:'COMMANDE_INVALIDE'};
   var k=packet.turn,slot=orders.get(k)||new Map();
   slot.set(s.seat,{seq:packet.seq,commands:JSON.parse(JSON.stringify(packet.commands))});
   orders.set(k,slot);s.lastSeq=packet.seq;
   return {ok:true,turn:k,seat:s.seat};
 }
 function flush(){
   if(status!=='running')return {ok:false,error:'PARTIE_NON_DEMARREE'};
   var active=seats.filter(function(s){return s.playerId!==null});
   var p=orders.get(turn);
   if(!p||active.some(function(s){return !p.has(s.seat)}))
     return {ok:false,error:'ATTENTE_ORDRES',missing:active.filter(function(s){return !p||!p.has(s.seat)}).map(function(s){return s.seat})};
   var commands=active.slice().sort(function(a,b){return a.seat-b.seat}).map(function(s){
     return {seat:s.seat,commands:p.get(s.seat).commands};
   });
   orders.delete(turn);var committed=turn;turn++;
   return {ok:true,turn:committed,commands,hashRequired:(turn%40===0)};
 }
 return {config:{maxPlayers:MAX,tickMs:TICK_MS,turnTicks:TURN_TICKS,inputDelayTurns:DELAY_TURNS,
     commandsPerTurn:MAX_COMMANDS,maxUnitsPerPlayer:MAX_UNITS_PER_PLAYER},
   snapshot,add,ready,leave,start,disconnect,resume,submit,flush};
}
return Object.freeze({VERSION:1,MAX_PLAYERS:MAX,TICK_MS,TURN_TICKS,DELAY_TURNS,createLobby});
});
