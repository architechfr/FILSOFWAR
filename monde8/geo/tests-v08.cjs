/* Run from repo root: node monde8/geo/tests-v08.cjs
 * Source is the recovered interactive FILS OF WAR v0.8 plan director.
 */
'use strict';
const assert=require('node:assert/strict');
const spec=require('./reference-v08.json');
const geo=require('./projection.js').create(spec);
assert.equal(spec.version,'0.8-map-freeze');
assert.equal(geo.sites.length,31);
assert.equal(geo.river.length,34);
assert.equal(geo.roads.length,7);
assert.deepEqual(geo.sites.map(p=>p.id),[...new Set(geo.sites.map(p=>p.id))]);
for(const p of geo.sites){
 assert.ok(p.x>0&&p.x<2048&&p.z>0&&p.z<2048,p.name);
 const back=geo.geo(p.x,p.z);
 assert.ok(Math.abs(back.lat-p.lat)<1e-8&&Math.abs(back.lon-p.lon)<1e-8,p.name);
}
const loc=id=>geo.landmark(id);
assert.ok(loc('gorges').z<loc('salagou').z,'Gorges are north of the lake');
assert.ok(loc('salagou').x<loc('montpellier').x,'Lake is west of Montpellier');
assert.ok(loc('sete').z>loc('campagnan').z,'Sete is south of Campagnan');
assert.ok(loc('narbonne').z>loc('campagnan').z,'Narbonne is south of Campagnan');
assert.ok(Math.hypot(loc('campagnan').x-loc('belarga').x,loc('campagnan').z-loc('belarga').z)<60,'Campagnan-Belarga local cluster');
for(const road of geo.roads){
 assert.ok(road.points.length>=2,road.name);
 for(const p of road.points)assert.ok(geo.byId.has(p.id),road.name);
}
assert.equal(geo.isSea(loc('lodeve').x,loc('lodeve').z),false);
console.log('PASS geography v0.8: 31 sites, 34 river points, 7 routes, correct orientation and projection.');
