// Apply only after Jerry or the world/combat owners authorize this review.
import fs from 'node:fs';
import crypto from 'node:crypto';
if(!process.argv.includes('--approved'))throw Error('Explicit approval is required.');
const dir='review/training-visibility-GP197',plans=[];
function plan(path,fn){const original=fs.existsSync(path)?fs.readFileSync(path,'utf8'):null;plans.push({path,original,next:fn(original)});}
function replace(s,a,b){if(!s.includes(a))throw Error('Fresh source no longer matches: '+a);return s.replace(a,b);}
plan('index.html',s=>{const eol=s.includes('\r\n')?'\r\n':'\n';s=replace(s,'from.distanceTo(to)','Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z)');return replace(s,'      tg.update(dt);','      tg.update(dt);'+eol+'      tg.cutaway?.update(camera.position, localPlayer.position, dt);');});
plan('world/training.js',s=>{const eol=s.includes('\r\n')?'\r\n':'\n';s=replace(s,"import { dressTrainingProps }","import { partitionTrainingShell } from './training-cutaway.js';"+eol+"import { dressTrainingProps }");s=replace(s,'  const baked = bakeStatic(T, g,','  const cutaway = partitionTrainingShell(T, g, new T.Vector3(O.x, O.y, O.z));'+eol+'  const baked = bakeStatic(T, g,');s=replace(s,'group: g, origin: O,','group: g, origin: O, cutaway,');return replace(s,'    dispose() {','    dispose() {'+eol+'      cutaway.dispose();');});
plan('world/training-ballistics.js',s=>{const eol=s.includes('\r\n')?'\r\n':'\n';return replace(s,'  for(const solid of tg.solids) {','  for(const solid of tg.solids) {'+eol+'    if(glass && tg.cutaway?.ignoreSolid(solid))continue;');});
plan('world/training-cutaway.js',s=>{if(s!==null)throw Error('New helper already exists; inspect instead of overwriting.');return fs.readFileSync(dir+'/cutaway-preview.js','utf8').replace("from '/world/bake.js'","from './bake.js'").replace('// Review prototype:', '// GP-197:');});
for(const p of plans)if((fs.existsSync(p.path)?fs.readFileSync(p.path,'utf8'):null)!==p.original)throw Error('Concurrent edit: '+p.path);
fs.writeFileSync(dir+'/applied-backup.json',JSON.stringify(plans.map(p=>({path:p.path,original:p.original})),null,2));
for(const p of plans)fs.writeFileSync(p.path,p.next,'utf8');
fs.writeFileSync(dir+'/applied-hashes.json',JSON.stringify(plans.map(p=>({path:p.path,sha256:crypto.createHash('sha256').update(p.next).digest('hex')})),null,2));
console.log('Applied focused, approved spider LOS and Training cutaway changes onto freshest source.');
