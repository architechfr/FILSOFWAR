/* Run: node monde8/tests-v2.mjs */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const World=require('./monde.js'),Nav=require('./navigation.js'),Game=require('./strategie-v2.js');
for(const seed of [1,42,2026]){
  const world=World.generate(seed),nav=Nav.create(world);
  assert.equal(world.sectors.length,256);
  assert.equal(world.capitals.length,8);
  assert.equal(world.checksum,World.generate(seed).checksum);
  for(const seat of [0,3,7]){
    const g=Game.create(world,nav,{playerSeat:seat,ai:false});
    assert.equal(g.civs.filter(f=>f.started).length,7);
    assert.equal(g.found().ok,true);
    assert.equal(g.civs.filter(f=>f.started).length,8);
    assert.equal(g.build('barracks',g.summary().home.sector).ok,true);
    assert.equal(g.spawn('soldier').ok,false,'No soldiers before barracks');
    assert.equal(g.spawn('worker').ok,true);
    for(let i=0;i<1520;i++)g.update(.1);
    const barracks=g.buildings().find(b=>b.owner===seat&&b.type==='barracks');
    assert.equal(barracks.complete,true);
    assert.equal(g.spawn('soldier').ok,true);
    const before=g.save(),restored=Game.create(world,nav,{playerSeat:seat,ai:false});
    assert.equal(restored.load(before),true);
    assert.equal(restored.summary().pop,g.summary().pop);
    assert.equal(restored.civs[seat].resources.wood,g.civs[seat].resources.wood);
    assert.deepEqual(restored.recruitment(),g.recruitment());
    assert.deepEqual(Array.from(restored.fog(seat).discovered),Array.from(g.fog(seat).discovered));
    for(let i=0;i<350;i++){g.update(.1);restored.update(.1);}
    assert.equal(restored.save(),g.save(),'Same saved state should continue identically');
  }
}
{
  const w=World.generate(2026),n=Nav.create(w),game=Game.create(w,n,{playerSeat:0,ai:false});
  assert.equal(game.found().ok,true);
  const scout=game.people().find(u=>u.owner===0&&u.type==='scout');
  const sector=w.sectors[w.capitals[0].sector+1];
  assert.equal(game.destination(scout.id,sector.x,sector.z,'move').ok,true);
  for(let i=0;i<500;i++)game.update(.1);
  assert.equal(game.sectors()[sector.id].owner,0,'Adjacent sector captured after occupation');
}
console.log('WORLD8 V2 OK: 3 seeds, 9 construction/recruitment/save cycles, conquest confirmed');
