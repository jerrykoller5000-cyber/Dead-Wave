import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';

const load = async (phase, name) => JSON.parse(await readFile(new URL('./'+phase+'/'+name+'.json',import.meta.url),'utf8'));
const [before,after,meshes] = await Promise.all([load('before','clearance'),load('after','clearance'),load('after','meshes')]);
const lines=[];
function verify(condition, message) {
  lines.push((condition?'PASS ':'FAIL ')+message);
  if(!condition) process.exitCode=1;
}
const minimum = data => Math.min(...data.minigun.slices.map(s=>s.gapMm??0));
verify(after.minigun.slices.length===12 && minimum(after)>=20,
  'Minigun minimum clearance across the 12 sampled grip-to-housing rays '+minimum(before).toFixed(2)+' -> '+minimum(after).toFixed(2)+' mm');
verify(after.launcher.slices.length===12 && after.launcher.slices.every(s=>s.gapMm===null || s.gapMm>=20),
  'Launcher grip-to-housing/stock rays with a full 20 mm pocket: '+after.launcher.slices.filter(s=>s.gapMm===null || s.gapMm>=20).length+'/12');
const oldLight=before.uzi.candidates[0],newLight=after.uzi.candidates[0];
assert(oldLight.dz===0 && newLight.dz===0);
verify(oldLight.penetrating && newLight.lowerMm>=2,
  'Bought Uzi module and support glove: intersection before, '+newLight.lowerMm.toFixed(2)+'–'+newLight.upperMm.toFixed(2)+' mm apart after');
verify(meshes.uzi.lightToForeEnd.upperMm<=.5,
  'Visible Uzi attachment reaches the fore-end: gap at most '+meshes.uzi.lightToForeEnd.upperMm.toFixed(2)+' mm');
const contactPieces=meshes.uzi.support;
verify(contactPieces.length>2 && contactPieces.every(([, , gap])=>!gap.penetrating),
  'No fitted Wasp component enters the visible fore-end');
verify(meshes.uzi.lightLensError<1e-6 && meshes.uzi.laserLensError<1e-6,
  'Uzi light and laser origins coincide with their drawn windows');
for(const [name,m] of Object.entries(meshes)) {
  verify(m.assembly.pieces>0 && m.assembly.loose.length===0,
    name+' assembly: '+m.assembly.pieces+' pieces, '+m.assembly.loose.length+' detached groups');
}
await writeFile(new URL('./after/model-checks.txt',import.meta.url),lines.join('\n')+'\n');
console.log(lines.join('\n'));
