import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const catalog=async phase=>JSON.parse(await readFile(new URL('../GT-20076/'+phase+'/audit.json',import.meta.url),'utf8'));
const before=await catalog('catalog-fix-handle-optic-seated'),after=await catalog('catalog-fix-revolver-dot-seated');
const result={};
for(const key of Object.keys(before).filter(k=>k==='revolver'||k.startsWith('revolver-'))){
  const a=before[key],b=after[key];
  // The new marker is the final base child. Optional optics subsequently
  // appended by the game shift one sibling index; submeshes keep their indices.
  const priorLabel=label=>label.replace(/^(root\/fitted-optic-[^/\[]+)\[97\]/,'$1[96]');
  const witness=(row,toPrior)=>[row.a,row.b,row.host].map(toPrior).concat([row.at,row.witnessDepthMm]);
  assert.deepEqual(b.rawOverlaps.map(r=>witness(r,priorLabel)),a.rawOverlaps.map(r=>witness(r,s=>s)));
  assert.equal(b.parts,a.parts+1);
  assert.equal(b.openSurfaces,a.openSurfaces);
  assert.deepEqual(b.loose,a.loose);assert.deepEqual(b.unseated,a.unseated);
  result[key]={original:a.artworkFingerprint,final:b.artworkFingerprint,parts:b.parts,
    overlapCount:b.rawOverlaps.length,openSurfaces:b.openSurfaces};
}
await writeFile(new URL('fit-proof.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log('PASS identical pre-existing intersection witnesses and support across '+Object.keys(result).join(', '));
