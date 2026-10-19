/* node monde8/tests-v3.mjs — Tests autonomes du laboratoire huit royaumes */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const World=require('./monde.js'),Nav=require('./navigation.js'),Game=require('./strategie-v2.js'),Civ=require('./civilisation.js');
function make(seed,seat,ai=false){
 const w=World.generate(seed),base=Game.create(w,Nav.create(w),{playerSeat:seat,ai});
 const g=Civ.enhance(base,{ai});
 assert.equal(g.found().ok,true);
 return {w,g};
}
for(const seed of [42,2026])for(const seat of [0,3]){
 const {w,g}=make(seed,seat,false),capital=w.capitals[seat].sector;
 assert.equal(g.buildCivic('market',capital).ok,true);
 assert.equal(g.buildCivic('library',capital).ok,true);
 assert.equal(g.startResearch().ok,false,'Recherche exige bibliothèque construite');
 assert.equal(g.openTrade((seat+1)%8).ok,false,'Marché non achevé');
 for(let t=0;t<1100;t++)g.update(.1);
 assert.equal(g.civilization().projects.filter(p=>p.owner===seat&&p.complete).length,2);
 assert.equal(g.startResearch().ok,true);
 assert.equal(g.chooseFocus('science').ok,true);
 const saved=g.save(),copy=make(seed,seat,false).g;
 assert.equal(copy.load(saved),true);
 assert.equal(copy.summary().focus,'science');
 for(let t=0;t<420;t++){g.update(.1);copy.update(.1);}
 assert.equal(g.save(),copy.save(),'Rattrapage deterministe identique');
 assert.ok(g.summary().tech.includes('irrigation'));
}
{
 const {w,g}=make(2026,3,true);
 // Neutralise les autres voies pour isoler une victoire culturelle pure.
 for(const seat of [0,1,3,4,5,6])g.civs[seat].alive=false;
 for(let t=0;t<24000&&!g.victory();t++)g.update(.1);
 assert.equal(g.victory()?.mode,'culture');
 assert.ok(g.details(g.victory().seat).monuments>=1);
 assert.ok(g.details(g.victory().seat).theaters>=2);
}
{
 const {g}=make(2026,0,true);
 for(let t=0;t<18000&&!g.victory();t++)g.update(.1);
 assert.ok(['commerce','science','culture','diplomatie','conquete'].includes(g.victory()?.mode));
}
console.log('WORLD8 CIV3 OK: économie, science, sauvegarde déterministe et victoire culturelle');
