/* node monde8/tests-zone1.mjs — Grand Salagou et compatibilite 8 royaumes */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const World=require('./monde.js'),Zone=require('./zone-salagou.js'),Nav=require('./navigation.js');
const Game=require('./strategie-v2.js'),Civ=require('./civilisation.js');
const map=Zone.install(World);
for(const seed of [1,2,3,4,5,42,99,2026,9876543]){
 const w=map.generate(seed),same=map.generate(seed),s=w.zoneSalagou;
 assert.ok(s.count>=25,'Discoveries are present');
 assert.deepEqual(s.points,same.zoneSalagou.points,'Deterministic discoveries');
 assert.ok(w.reachable('infanterie').accessible.every(Boolean),'Eight capitals reachable');
 assert.ok(w.reachable('cavalerie').accessible.every(Boolean),'Eight capitals reachable on horseback');
 assert.equal(w.cellAt(w.lake.damX,w.lake.damZ).kind,3,'A traversable dam');
 assert.equal(w.cellAt(w.lake.damX,w.lake.damZ+13).kind,2,'Downstream river exists');
 assert.ok(s.points.every(p=>w.canTraverse('infanterie',p.x,p.z)),'Points of interest are accessible');
 assert.ok(w.sectors.length===256&&w.capitals.length===8);
 const g=Civ.enhance(Game.create(w,Nav.create(w),{playerSeat:0,ai:false}),{ai:false});
 assert.ok(g.found().ok,'One civilization can found');
 assert.ok(g.buildCivic('market',w.capitals[0].sector).ok,'Civil projects still operate');
 const save=g.save(),again=Civ.enhance(Game.create(w,Nav.create(w),{playerSeat:0,ai:false}),{ai:false});
 assert.ok(again.load(save),'Saves are loadable');
}
console.log('ZONE1 OK: nine seeds, geography, exploration, eight capitals, economy and saves');
