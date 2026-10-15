import fs from 'node:fs';
import assert from 'node:assert/strict';
import {text} from '../../ui/strings.js';
import {hitPopText} from '../../ui/training-hit-pops.js';
const dir='review/range-accuracy-GP19910';
const p=JSON.parse(fs.readFileSync(dir+'/staged-native.json','utf8'));
let impacts=0,shots=0;
assert.equal(p.weapons.length,9);
for(const w of p.weapons){
 assert.equal(w.samples.length,5);
 for(const s of w.samples){shots+=s.shots;for(const h of s.hits){
  impacts++;assert(h.opticalScore,'actual hit must land on drawn silhouette');
  assert.equal(h.zone.zone,h.opticalScore.zone,w.weapon+' '+s.name);
  assert.equal(h.zone.points,h.opticalScore.points);
  assert.equal(h.ok,true);
  assert.equal(h.awarded,h.zone.total);
 }}
}
assert(impacts>0);assert.deepEqual(p.errors,[]);
for(const [zone,label]of Object.entries({head:'Head',bull:'Bullseye',ring:'Ring',plate:'Plate'}))
 assert.equal(hitPopText({zone,total:20,mult:2},z=>text('training.zone.'+z)).sub,label+' ×2');
const special=JSON.parse(fs.readFileSync(dir+'/after-edge-proof.json','utf8'));
assert.equal(special.edge.base,20);assert.equal(special.special.length,3);
assert(special.special.every(w=>w.started.ok&&w.s.base>0));assert.deepEqual(special.errors,[]);
console.log(`PASS ${shots} real shots, ${impacts} actual impacts, 45 aim cases, 9 bullet weapons: zero scoring-zone disagreements.`);
console.log('PASS launcher/flame/saw scoring, controlled head-edge 20 points and all four localized hit labels.');
