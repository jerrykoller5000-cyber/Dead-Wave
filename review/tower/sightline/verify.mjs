import fs from 'node:fs';import assert from 'node:assert/strict';
const base=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,base)));
const before=read('before-visibility.json'),after=read('after-visibility.json');
const {tower:oldTower,...oldPoi}=before.poi,{tower:newTower,...newPoi}=after.poi;
assert.deepEqual(oldPoi,newPoi);assert.deepEqual(before.pit,after.pit);
assert.equal(before.rays.filter(r=>r.clear).length,0);assert.equal(after.rays.filter(r=>r.clear).length,40);
assert(after.ladderGroundDelta<.6);assert.equal(after.pathDistance,0);
const original=fs.readFileSync(new URL('index-before.html',base),'utf8'),current=fs.readFileSync('index.html','utf8');
for(const [start,end]of[['    function buildWatchtower(','    function buildGraveyard('],['    function updateTowerClimb(','    function updateTowerSiege('],['    function planCaves(','    function caveHillHeight(']]){const extract=s=>{const i=s.indexOf(start),j=s.indexOf(end,i);assert(i>=0&&j>i);return s.slice(i,j);};assert.equal(extract(original),extract(current));}
const oldSites=new Set(before.trees.map(t=>`${t.x},${t.z}`)),same=after.trees.filter(t=>oldSites.has(`${t.x},${t.z}`)).length;
console.log(`PASS 40/40 sightlines (baseline 0/40); all other POIs/caves and Pit unchanged; tower model/climb/cave planner unchanged; ladder/path reachable; ${same}/${before.trees.length} tree sites retained.`);
