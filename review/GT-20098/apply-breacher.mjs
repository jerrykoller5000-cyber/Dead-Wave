import fs from 'node:fs';
import crypto from 'node:crypto';
const file='studio/weapon-longarms.js',src=fs.readFileSync(file,'utf8');
const start=src.indexOf('export function makeAa12Model'),end=src.indexOf('const shotgunFinishes',start);
if(start<0||end<0||!src.includes("import { weaponDetail } from './weapon-detail.js';"))throw Error('Missing current block/import');
let part=src.slice(start,end);
const replace=(a,b)=>{if(part.split(a).length!==2)throw Error('Ambiguous Breacher edit '+a.slice(0,80));part=part.replace(a,b);};
replace('  const D = gunDetail(ctx);','  const D = gunDetail(ctx);\n  const W = weaponDetail(ctx);');
replace('K.box(0.022, 0.022, 0.035, gunDark, 0, 0, 0, 0, 0, 0, work, 0.004);',
'W.chamferBox(work, .022, .022, .035, .0025, gunDark, 0, 0, 0);');
replace("D.ribs(work, { x: -0.011, y: 0, z: 0, axis: 'x', side: -1, along: 'z', count: 4, pitch: 0.006, w: 0.016, h: 0.001, t: 0.0018, mat: gunMid });",
"W.serrations(work, gunMid, { x: -.011, y: 0, z: 0, axis: 'x', side: -1, along: 'z', count: 4, pitch: .00495, w: .016, depth: .0007, profile: 'square' });");
const triggerEnd='0.011, gunAccent, { bevel: 0.002 });   // GB-174/180: the trigger';
replace(triggerEnd,triggerEnd+`
  // GT-20098: the magazine-catch paddle hangs below the guard's lower bar.
  // Its axle sits in that bar; the blade, cavity and the grip's contacts stay fixed.
  const magRelease = K.group(0, -.1455, -.062);
  W.chamferBox(magRelease, .008, .008, .004, .0006, gunDark, 0, .002, 0);
  W.plate(magRelease, [[-.0105,0],[.0105,0],[.0105,-.010],[.0085,-.014],[-.0085,-.014],[-.0105,-.010]],
    .004, .0007, gunDark, {axis:'z'});
  W.serrations(magRelease, gunDark, {z:.002,y:-.007,axis:'z',side:1,along:'y',count:4,pitch:.0025,w:.016,depth:.0005,profile:'square'});
  W.pins(magRelease, gunDark, [{axis:'x',span:.03,r:.0018}]);
`);
const oldLatch=`  for (const sx of [-1, 1]) {
    K.box(0.009, 0.047, 0.027, gunDark, sx * 0.145, -0.012, -0.03, 0, 0, 0, drumBody, 0.003);     // the latch
    K.box(0.006, 0.028, 0.019, gunMid, sx * 0.149, -0.012, -0.032, 0, 0, 0, drumBody, 0.002);
    for (let i = 0; i < 4; i++) K.box(0.006, 0.002, 0.015, gunDark, sx * 0.152, -0.022 + i * 0.007, -0.032, 0, 0, 0, drumBody, 0);
  }`;
replace(oldLatch,`  const drumLatches = [];
  for (const sx of [-1, 1]) {
    K.box(0.009, 0.047, 0.027, gunDark, sx * 0.145, -0.012, -0.03, 0, 0, 0, drumBody, 0.003);     // fixed latch housing
    const parts = [K.box(0.006, 0.028, 0.019, gunMid, sx * 0.149, -0.012, -0.032, 0, 0, 0, drumBody, 0.002)];
    for (let i = 0; i < 4; i++) parts.push(K.box(0.006, 0.002, 0.015, gunDark, sx * 0.152, -0.022 + i * 0.007, -0.032, 0, 0, 0, drumBody, 0));
    const latch = pivotArtwork(THREE, [sx * .149, .002, -.032], ...parts);
    drumLatches.push([sx < 0 ? 'drumLatchLeft' : 'drumLatchRight', latch]);
  }`);
replace("  bindModelArtwork(gun, 'controls', 'selector', selector);",`  bindModelArtwork(gun, 'controls', 'selector', selector);
  bindModelArtwork(gun, 'controls', 'magRelease', magRelease);
  for (const [name, latch] of drumLatches) bindModelArtwork(gun, 'controls', name, latch);`);
const output=src.slice(0,start)+part+src.slice(end);
const temp=file+'.gt20098-'+crypto.randomUUID()+'.tmp';
fs.writeFileSync(temp,output,{flag:'wx'});
if(fs.readFileSync(file,'utf8')!==src)throw Error('Concurrent longarms save, refusing overwrite');
fs.renameSync(temp,file);
console.log('Saved only makeAa12Model, preserving all fresh adjacent blocks and imports');
