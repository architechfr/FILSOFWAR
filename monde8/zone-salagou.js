/* Fils of War — Zone 1 Grand Salagou: lieux, ressources et corridors.
 * Surcharge additive du generateur du monde 8, sans toucher au jeu historique.
 */
(function(root,factory){
 const plugin=factory();
 if(typeof module==='object'&&module.exports)module.exports=plugin;
 if(root.FOW_WORLD8)root.FOW_WORLD8=plugin.install(root.FOW_WORLD8);
 root.FOW_ZONE1=plugin;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TYPES=['belvedere','source','ruines','menhir','grotte','verger','mine','foret','vignes','marche','sanctuaire','campement'];
const NAMES={
 belvedere:['Belvédère des Ruffes','Crête des Aigles','Vue sur les Orgues'],
 source:['Source du Moulin','Fontaine du Berger','Résurgence de l’Hérault'],
 ruines:['Ruines des Hautes Terres','Ancienne Tour de Guet','Remparts oubliés'],
 menhir:['Menhirs des Causses','Pierres Levées','Cercle des Anciens'],
 grotte:['Grotte des Vents','Aven des Roches Rouges','Caverne des Sables'],
 verger:['Terrasses aux Oliviers','Vergers du Midi','Jardins de la Vallée'],
 mine:['Filon de Fer','Carrière de Basalte','Mine des Trois Roches'],
 foret:['Bois des Sangliers','Chênaie de l’Est','Forêt des Collines'],
 vignes:['Vignes des Terrasses','Ceps de Campagnan','Domaine des Pentes'],
 marche:['Halte des Caravanes','Place des Marchands','Relais des Bergers'],
 sanctuaire:['Chapelle des Collines','Autel des Sources','Cercle du Salagou'],
 campement:['Halte des Voyageurs','Camp de la Berbère','Camp des Éclaireurs']
};
function hash(x,z,seed){
 let h=Math.imul((x|0)^seed,0x45d9f3b)^Math.imul((z|0)+seed,0x119de1f3);
 h=Math.imul(h^(h>>>16),0x45d9f3b);return (h^(h>>>16))>>>0;
}
function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function chooseWorldSpot(world,x,z,minRadius){
 for(let r=0;r<=56;r+=8){
  for(let k=0;k<16;k++){
   let ang=k*Math.PI/8,xx=x+Math.cos(ang)*r,zz=z+Math.sin(ang)*r;
   if(xx<50||zz<50||xx>1998||zz>1998)continue;
   if(!world.canTraverse('infanterie',xx,zz)||world.cellAt(xx,zz).slope>26)continue;
   if(world.capitals.some(c=>Math.hypot(c.x-xx,c.z-zz)<minRadius))continue;
   return {x:Math.round(xx),z:Math.round(zz)};
  }
 }
 return null;
}
function enrich(world){
 if(world.zoneSalagou)return world;
 const lc=world.lake;
 if(!lc)return world;
 const landmarks=world.landmarks;
 const points=[],anchors=[];
 // Douze couronnes de lieux, mais aucun site dans le lac ou une capitale.
 for(let i=0;i<48;i++){
  const az=i*.61803398875*Math.PI*2,ring=300+(i%4)*67;
  const radius=ring+(hash(i,world.seed,1)%80)-40;
  const x=lc.x+Math.cos(az)*radius,z=lc.z+Math.sin(az)*radius*.86;
  const pt=chooseWorldSpot(world,x,z,75);
  if(!pt||points.some(o=>dist(pt,o)<80)||landmarks.some(o=>dist(pt,o)<65))continue;
  const type=TYPES[i%TYPES.length],name=NAMES[type][Math.floor(i/TYPES.length)%NAMES[type].length];
  const sector=Math.floor(pt.z/128)*16+Math.floor(pt.x/128);
  const biome=world.sectors[sector].biome;
  const resource=type==='mine'?'stone':type==='foret'?'wood':type==='vignes'||type==='verger'?'food':
    type==='marche'?'gold':null;
  const discovered={name,type,x:pt.x,z:pt.z,sector,biome,resource,
    bonus:resource==='stone'?75:resource==='gold'?30:resource?65:0,
    altitude:Math.round(world.heightAt(pt.x,pt.z)),unique:true};
  points.push(discovered);
  landmarks.push({name,type,x:pt.x,z:pt.z});
  if(resource){
   world.sectors[sector].resources[resource]+=discovered.bonus;
   if(resource==='wood')world.sectors[sector].resources.food+=20;
  }
 }
 // Points de vues au contact des reliefs : récompenses culturelles et accès piéton.
 for(const point of [{x:lc.x-285,z:lc.z-125,name:'Corniche des Ruffes'},
                     {x:lc.x+292,z:lc.z-140,name:'Belvédère des Massifs'},
                     {x:lc.x-205,z:lc.z+270,name:'Balcon du Barrage'}]){
  const pt=chooseWorldSpot(world,point.x,point.z,75);
  if(!pt||landmarks.some(o=>dist(pt,o)<65))continue;
  let sector=Math.floor(pt.z/128)*16+Math.floor(pt.x/128);
  points.push({name:point.name,type:'belvedere',x:pt.x,z:pt.z,sector,biome:world.sectors[sector].biome,resource:null,bonus:0,
    altitude:Math.round(world.heightAt(pt.x,pt.z)),unique:true});
  landmarks.push({name:point.name,type:'belvedere',x:pt.x,z:pt.z});
 }
 world.zoneSalagou={
  name:'Grand Salagou',count:points.length,points,dam:{x:lc.damX,z:lc.damZ},
  region:{x:lc.x,z:lc.z,radius:580},version:'1.0',
  landscape:{water:'grand lac, barrage, ruisseau et trois ponts',
    vegetation:'chenaies, vignobles, oliviers et rivieres',
    geology:'ruffes rouges, belvederes, falaises et causses'}
 };
 return world;
}
function install(generator){
 if(!generator||generator.__zone1Installed)return generator;
 // FOW_WORLD8 est un Object.freeze : ne jamais tenter de le muter.
 const facade=Object.assign({},generator);
 facade.generate=function(seed){return enrich(generator.generate(seed));};
 facade.__zone1Installed=true;
 return facade;
}
return Object.freeze({VERSION:'1.0',install,enrich,TYPES});
});
