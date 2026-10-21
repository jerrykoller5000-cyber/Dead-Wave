import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {improveIndex,improveWorld,improveProps} from './changes.mjs';
if(!process.argv.includes('--approved'))throw Error('Jerry or owner approval required before live integration.');
const dir='review/training-fixes-GP191',sha=s=>createHash('sha256').update(s).digest('hex');
const paths=['index.html','world/training.js','world/training-props.js'];
const resume=process.argv.includes('--resume');
const current=paths.map(p=>fs.readFileSync(p,'utf8'));
const old=paths.map((p,i)=>{const backup=`${dir}/live-backup-${p.replaceAll('/','-')}`;return resume&&fs.existsSync(backup)?fs.readFileSync(backup,'utf8'):current[i];});
const updated=[improveIndex(old[0]),improveWorld(old[1]),improveProps(old[2])]
 .map((s,i)=>old[i].includes('\r\n')?s.replace(/\r?\n/g,'\r\n'):s);
for(const [i,s]of updated.entries()){
 const scripts=i===0?[...s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!m[1].includes('importmap')&&!m[1].includes('application/')).map(m=>m[2]):[s];
 for(const script of scripts){const r=spawnSync(process.execPath,['--check','--input-type=module'],{input:script,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}
}
for(let i=0;i<paths.length;i++)if(current[i]!==old[i]&&current[i]!==updated[i])throw Error('Concurrent change: '+paths[i]);
for(let i=0;i<paths.length;i++){
 if(current[i]===updated[i])continue;
 const backup=`${dir}/live-backup-${paths[i].replaceAll('/','-')}`;
 if(!fs.existsSync(backup))fs.writeFileSync(backup,old[i],'utf8');
 if(fs.readFileSync(paths[i],'utf8')!==old[i])throw Error('Concurrent change before write: '+paths[i]);
 for(let attempt=0;;attempt++){
  if(fs.readFileSync(paths[i],'utf8')!==old[i])throw Error('Concurrent change before retry: '+paths[i]);
  try{fs.writeFileSync(paths[i],updated[i],'utf8');break;}
  catch(e){if(attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,200));}
 }
}
fs.writeFileSync(`${dir}/applied.json`,JSON.stringify({at:new Date().toISOString(),approval:'Jerry: Apply these four fixes',files:paths.map((p,i)=>({path:p,before:sha(old[i]),after:sha(updated[i])}))},null,2)+'\n');
console.log('Applied three focused live files after fresh reads and syntax checks; original line endings preserved.');
