// Capture once, before editing. Never restore these files over the live crew checkout.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.resolve('review/zombie-sweep-GP19922/baseline');fs.mkdirSync(dir,{recursive:true});
const files=['studio/zombie-concepts.js','studio/zombie-guardian-detail.js','combat/demon-visual.js','game/screamer-appearance.js'];
const manifest={at:new Date().toISOString(),files:{}};
for(const file of files){const bytes=fs.readFileSync(file),name=path.basename(file);fs.writeFileSync(path.join(dir,name),bytes,{flag:'wx'});manifest.files[file]={file:name,sha256:createHash('sha256').update(bytes).digest('hex')};}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});console.log('Captured '+files.length+' immutable comparison modules');
