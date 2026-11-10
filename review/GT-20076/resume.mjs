import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
assert(process.env.DW_GAME_TEST_TOKEN);
const out=new URL('./resumed/',import.meta.url);
mkdirSync(out,{recursive:true});
const checks=[['surfaces','after'],['original-detail','test'],['pistol','after'],['sling','after'],['rail','after'],['run','resumed']];
const requested=process.argv.slice(2);
if(requested.includes('detail-baseline'))checks.unshift(['detail','before']);
if(requested.includes('rows-after'))checks.unshift(['detail','after','rows']);
if(requested.includes('detail-after'))checks.unshift(['detail','after']);
for(const [name,phase,group] of checks){
  if(requested.includes('--only') && !requested.includes(name) && !(group==='rows' && requested.includes('rows-after')) && !(name==='detail' && requested.includes(phase==='before'?'detail-baseline':'detail-after')))continue;
  const args=name==='surfaces'?['review/GT-20076/look.mjs',phase,'m4','ak','aa12','shotgun','sniper']:name==='original-detail'?['--import','./studio/node-three.mjs','--test','studio/gun-detail.test.mjs']:['review/GT-20076/'+name+'.mjs',phase,...(group?[group]:[])];
  const r=spawnSync(process.execPath,args,{encoding:'utf8'});
  const output=(r.stdout||'')+(r.stderr||'');
  writeFileSync(new URL((group || name)+'.txt',out),output);
  console.log(name,r.status,output.trim().split('\n').at(-1));
  if(r.error)throw r.error;
  if(r.status!==0)process.exitCode=1;
}
