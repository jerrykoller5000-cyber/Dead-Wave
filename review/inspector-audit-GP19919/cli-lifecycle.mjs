import fs from 'node:fs';
import path from 'node:path';
import { ensureInspectorServer } from '../../tools/inspector-launch.mjs';
const root=path.resolve('.'), dir=path.resolve('review/inspector-audit-GP19919/automation');
const first=await ensureInspectorServer();
const second=await ensureInspectorServer();
if(first.pid!==second.pid||!second.reused)throw Error('Launcher did not reuse the current owned server');
const health=await (await fetch(first.origin+'/__inspect/health')).json();
if(health.root!==root||!health.fingerprint)throw Error('Missing checkout identity or code fingerprint');
fs.writeFileSync(path.join(dir,'launcher-live.json'),JSON.stringify({first,second,health},null,2)+'\n');
const file=path.resolve('review/camera/jobs/_camera.json');
const old=JSON.parse(fs.readFileSync(file,'utf8'));
// This is the single camera started by this audit before the session-file migration.
if(old.up&&old.pid===36240&&old.started==='2026-10-14T15:14:58.398Z'&&old.root===root){
  const post=async(body)=>(await fetch('http://127.0.0.1:'+old.port+'/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)})).json();
  const state=await post({cmd:'status'});
  if(!state.ok||state.root!==root||state.mode!=='inspect')throw Error('Camera ownership could not be verified');
  const stopped=await post({cmd:'stop'});if(!stopped.stopped)throw Error('Owned old camera did not stop');
  console.log('Stopped only the verified pre-migration audit camera');
}
console.log(JSON.stringify({ok:true,url:first.origin+'/index.html?inspect',reused:second.reused,pid:first.pid,fingerprint:health.fingerprint}));
