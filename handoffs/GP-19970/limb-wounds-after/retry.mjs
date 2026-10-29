import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const out='handoffs/GP-19970/limb-wounds-after';
const job=JSON.parse(fs.readFileSync(`${out}/job.json`,'utf8'));
const shots=job.shots.filter(s=>fs.statSync(s.out).size<10000).map(s=>({...s,wait:1200}));
if(!shots.length)process.exit(0);
fs.writeFileSync(`${out}/retry-job.json`,JSON.stringify({shots,out,cols:shots.length},null,2)+'\n','utf8');
const args=['tools/camera.mjs','job',`${out}/retry-job.json`,'--inspect','--agent','chatgpt','--task','GP-19970'];
const result=spawnSync(process.execPath,args,{stdio:'inherit'});
if(result.error)throw result.error;
if(result.status!==0)process.exit(result.status??1);
