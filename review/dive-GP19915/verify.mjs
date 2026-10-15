import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const dir='review/dive-GP19915';
for(const [name,args]of [
 ['unit',['--test','studio/marine-dive.test.mjs',`${dir}/policy.test.mjs`]],
 ['players',['tools/check-players.mjs']],
 ['syntax',[`${dir}/prepare.mjs`]],
 ['perf-before',[`${dir}/perf.mjs`,'--before']],
 ['perf-after',[`${dir}/perf.mjs`]],
 ['existing-native',[`${dir}/existing-native.mjs`]],
 ['npm-focused',['tools/tests/run-all.mjs','t253','--jobs','1','--no-retry']]
]){console.log('RUN',name);const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:300000});const log=(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error:'');fs.writeFileSync(`${dir}/${name}.log`,log);console.log(log);console.log('EXIT',name,r.status);if(r.status!==0&&name!=='npm-focused')process.exit(1);}
process.exit(0);
