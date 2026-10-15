import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const base='review/inspector-audit-GP19919', logs=[], results=[];
const commands=[
 ['--test','--test-reporter=tap',base+'/async.test.mjs',base+'/cdp.test.mjs',base+'/automation/automation.test.mjs',base+'/automation/input.test.mjs',base+'/automation/instance-bounds.test.mjs',base+'/usability/marine-controls.test.mjs',base+'/usability/ui-controls.test.mjs',base+'/usability/startup-cleanup.test.mjs'],
 [base+'/runtime/runtime.test.mjs'],[base+'/runtime/api.test.mjs'],[base+'/runtime/presentation.test.mjs']
];
for(const args of commands){
 for(const file of args.filter(a=>!a.startsWith('--')))if(!fs.existsSync(file))throw Error('Missing focused test: '+file);
 const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000,windowsHide:true});
 logs.push('$ node '+args.join(' ')+'\n'+r.stdout+r.stderr);
 results.push({command:'node '+args.join(' '),exit:r.status,error:r.error?.message,
   proof:(r.stdout.match(/# (?:tests|pass|fail|cancelled|skipped) \d+|RESULT \d+ (?:runtime|API|held presentation) checks passed/g)||[])});
}
const sources=['tools/inspector-launch.mjs','tools/serve.mjs','tools/camera.mjs','tools/camera-rig.js','tools/cdp.mjs','studio/notes-endpoint.mjs',...fs.readdirSync('studio/inspector').filter(f=>f.endsWith('.js')).map(f=>'studio/inspector/'+f)];
for(const source of sources){const r=spawnSync(process.execPath,['--check',source],{encoding:'utf8',windowsHide:true});results.push({command:'node --check '+source,exit:r.status});if(r.status)logs.push(r.stderr);}
fs.writeFileSync(path.join(base,'focused.log'),logs.join('\n'),'utf8');
fs.writeFileSync(path.join(base,'focused.json'),JSON.stringify({at:new Date().toISOString(),results},null,2)+'\n','utf8');
for(const r of results)console.log((r.exit===0?'PASS ':'FAIL ')+r.command+(r.proof?' → '+r.proof.join('; '):''));
if(results.some(r=>r.exit!==0))process.exitCode=1;
