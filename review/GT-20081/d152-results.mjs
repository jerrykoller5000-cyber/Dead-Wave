import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL(name,import.meta.url),'utf8');
const baseline=JSON.parse(await read('./d152-native/draws.json'));
const suite=await read('./d152-final-t38.txt');
const samples={};
for(const batch of ['minigun-m4-ak-aa12','pistol-uzi-shotgun-revolver','sniper-launcher-flamer-chainsaw']){
  const run=JSON.parse(await read('./d152-time-'+batch+'.json'));
  assert.match(run.adapter,/RTX 5080/);
  assert.equal(run.preset,'high');
  Object.assign(samples,run.guns);
}
const suiteGuns=new Map(Array.from(suite.matchAll(/INFO (\w+) cold meshes (\d+), equipped draws (\d+)/g),m=>[m[1],[Number(m[2]),Number(m[3])]]));
assert.equal(suiteGuns.size,12);assert.equal(Object.keys(samples).length,12);
let meshes=0, calls=0;
for(const [key,gpu] of Object.entries(baseline.result)){
  const s=samples[key];
  assert.deepEqual([gpu.cold,gpu.draws],suiteGuns.get(key));
  assert(gpu.triangles>0 && gpu.draws>0 && gpu.draws<=35 && s.times.length && s.meanMs>0 && s.p95Ms>0);
  meshes+=gpu.cold;calls+=gpu.draws;
  console.log(key, gpu.cold,'meshes,',gpu.draws,'draws,',s.meanMs.toFixed(2),'ms mean,',s.p95Ms.toFixed(2),'ms p95,',s.fps.toFixed(1),'fps');
}
assert(meshes<=300 && calls<260);
assert.match(suite,/t38\s+26 pass\s+0 fail/);
console.log('PASS twelve native and suite counts match;',meshes,'cold meshes,',calls,'equipped draws; all twelve High frame samples present');
