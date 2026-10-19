/* Fils of War 3D: regression test for signed random indices.
 * Run with: node monde8/tests-scene3d.cjs
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync(__dirname+'/scene3d.js','utf8');
const formula='((a ^ (a >>> 16)) >>> 0)/4294967296';
assert.ok(src.includes(formula),'PRNG must unsigned-convert AFTER final XOR');
assert.ok(src.includes('Math.min(leaves.length-1,Math.floor('),'Tree variant range guard must be present');
assert.ok(src.includes("Indice de végétation invalide"),'Explicit validation of tree variant must remain');
function random(x,z,s=0){
 const SEED=2026;
 let a=Math.imul((x|0)^SEED,0x45d9f3b)^Math.imul((z|0)+s,0x119de1f3);
 a=Math.imul(a^(a>>>16),0x45d9f3b);
 return ((a ^ (a >>> 16)) >>> 0)/4294967296;
}
let min=1,max=0;
for(let i=0;i<100000;i++){
 const n=random(i*13,811+i*5,76);
 assert.ok(n>=0&&n<1,'Random values must be in [0,1)');
 const variant=Math.min(3,Math.floor(n*4));
 assert.ok(variant>=0&&variant<4,'Tree variants must always be valid');
 min=Math.min(min,n);max=Math.max(max,n);
}
console.log('PASS 3D forest: 100000 safe PRNG samples; range '+min.toFixed(6)+'-'+max.toFixed(6));
