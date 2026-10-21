import fs from 'node:fs';
import crypto from 'node:crypto';
import {improveIndex,improveModel} from './changes.mjs';
const root='review/chainsaw-animation';
const files=['index.html','studio/weapon-heavy.js'];
const [index,model]=files.map(p=>fs.readFileSync(p,'utf8'));
fs.writeFileSync(root+'/sources.json',JSON.stringify(Object.fromEntries(files.map((p,i)=>[p,crypto.createHash('sha256').update([index,model][i]).digest('hex')])),null,2));
for(const tag of ['before','after']){
  const code=tag==='before'?index:improveIndex(index);
  fs.writeFileSync(root+'/'+tag+'.html',code.replace('<head>','<head><base href="../../">').replace("from './studio/weapon-heavy.js'",`from './review/chainsaw-animation/${tag}-heavy.js'`),'utf8');
  fs.writeFileSync(root+'/'+tag+'-heavy.js',tag==='before'?model:improveModel(model),'utf8');
}
if(process.argv.includes('--apply')){
  const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
  const source=JSON.parse(fs.readFileSync(root+'/sources.json'));
  for(const [p,data] of [[files[0],improveIndex(index)],[files[1],improveModel(model)]]){
    if(hash(p)!==source[p])throw Error('Concurrent edit: '+p);
    fs.writeFileSync(p,data,'utf8');
  }
  console.log('Applied focused chainsaw grip/start changes to freshly guarded source.');
}else console.log('Prepared isolated before/after game and chainsaw model.');
