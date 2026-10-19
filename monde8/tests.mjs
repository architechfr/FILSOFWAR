/* Run with node monde8/tests.mjs from repository root.
 * Smoke tests: generation, 8 factions, travel, recruitment, save/load.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const World=require('./monde.js'),Nav=require('./navigation.js'),Game=require('./strategie.js'),Net=require('./protocole.js');
for(const seed of [1,42,2026]){
 const a=World.generate(seed),b=World.generate(seed);
 assert.equal(a.checksum,b.checksum);
 assert.equal(a.sectors.length,256);
 assert.equal(a.capitals.length,8);
 assert.ok(a.reachable('infanterie').accessible.every(Boolean));
 const n=Nav.create(a);
 assert.ok(n.path('infanterie',a.capitals[0].x,a.capitals[0].z,a.capitals[7].x,a.capitals[7].z));
 for(const seat of [0,3,7]){
  const game=Game.create(a,n,{playerSeat:seat,ai:false});
  assert.equal(game.civs.filter(c=>c.started).length,7);
  assert.equal(game.found().ok,true);
  assert.equal(game.civs.filter(c=>c.started).length,8);
  assert.equal(game.spawn('worker').ok,true);
  const hero=game.people().find(u=>u.owner===seat&&u.type==='scout');
  assert.equal(game.destination(hero.id,a.capitals[(seat+1)%8].x,a.capitals[(seat+1)%8].z,'move').ok,true);
  game.update(.1);game.update(.1);
  const saved=game.save(),reload=Game.create(a,n,{playerSeat:seat,ai:false});
  assert.equal(reload.load(saved),true);
  assert.equal(reload.summary().home.sector,a.capitals[seat].sector);
  assert.equal(reload.civs[seat].resources.food,game.civs[seat].resources.food);
 }
}
const lobby=Net.createLobby({seed:2026});
for(let i=0;i<8;i++){assert.equal(lobby.add('id'+i,'Test '+i,'token'+i).ok,true);assert.equal(lobby.ready('id'+i,true).ok,true);}
assert.equal(lobby.add('id9','Neuf','ninth').ok,false);
assert.equal(lobby.start('id0',8).ok,true);
for(let t=0;t<3;t++)assert.equal(lobby.flush().ok,true);
assert.equal(lobby.disconnect('id2').ok,true);
assert.equal(lobby.resume('id2','wrong').ok,false);
assert.equal(lobby.resume('id2','token2').ok,true);
console.log('WORLD8 OK: 3 seeds, 9 player/route/save cases, 8-seat network contract');
