// Reuse recorded on-screen priority under D-162. Current coordinates come from the latest native strict audit.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const phase=process.argv[2];assert(/^catalog-fix-[a-z0-9-]+$/.test(phase));
const evidence='visibility-fix-launcher-rear',reference='catalog-fix-launcher-rear';
const read=async f=>JSON.parse(await readFile(new URL('./'+f,import.meta.url),'utf8'));
const [recorded,old,now]=await Promise.all([read(evidence+'/ranked.json'),read(reference+'/audit.json'),read(phase+'/audit.json')]);
const nineWaspStripes=process.argv.includes('--wasp-nine-stripes');
function originalLabel(model,name){
  if(model==='uzi' && nineWaspStripes){
    return name.replace(/^(root\/[^/\[]+)\[(\d+)\]/,(all,prefix,n)=>Number(n)>=56?prefix+'['+(Number(n)+3)+']':all);
  }
  // Both closed ends of the launcher graphic inherit its original identity. The
  // partner, position and penetration depth still have to match the old picture.
  if(model==='launcher')return name
    .replace(/^(root\/heatParts-barrel\[\d+\]\/BufferGeometry\[0\])~[01]$/,'$1')
    .replace(/^root\/BufferGeometry\[(39|40|42)\]$/,'root/CylinderGeometry[$1]');
  if(model!=='pistol')return name;
  // Removing the duplicate first child shifted the other children down by one.
  return name.replace(/^(root\/group\[30\]\/[^/\[]+)\[(\d+)\]/,(all,prefix,n)=>prefix+'['+(Number(n)+1)+']');
}
function witness(row,convert=x=>x){
  return JSON.stringify([[convert(row.a),convert(row.b)].sort(),convert(row.host||''),row.at,row.witnessDepthMm]);
}
const latest=new Map();
for(const key of Object.keys(recorded.sources))latest.set(key,new Map(now[key].rawOverlaps.map((r,i)=>[witness(r,x=>originalLabel(key,x)),i])));
const remaining=[];
for(const r of recorded.candidates){
  const before=old[r.model].rawOverlaps[r.pair];
  assert(before && before.a===r.a && before.b===r.b);
  const i=latest.get(r.model).get(witness(before));
  if(i!==undefined)remaining.push({model:r.model,currentPair:i,recordedPair:r.pair,view:r.view,recordedPixels:r.pixels,
    cameraSource:recorded.sources[r.model],a:now[r.model].rawOverlaps[i].a,b:now[r.model].rawOverlaps[i].b});
}
const output={basis:'Earlier photographed pixel counts; both part identities, host, witness point and penetration depth match the new strict audit. No new fleet capture.',reference,current:phase,top:remaining.slice(0,12),remainingWitnesses:remaining.length};
await writeFile(new URL('./'+phase+'/remaining-visible.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
for(const [i,r] of output.top.entries())console.log(i+1,r.model,r.currentPair,r.recordedPixels,r.view);
