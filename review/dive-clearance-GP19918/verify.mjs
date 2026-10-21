import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const dir='review/dive-clearance-GP19918';fs.writeFileSync(dir+'/perf.mjs',fs.readFileSync('review/dive-GP19915/perf.mjs','utf8').replaceAll('review/dive-GP19915',dir));
for(const [name,args]of [
 ['unit',['--test','studio/marine-dive.test.mjs','review/dive-GP19915/policy.test.mjs','review/jump-dive-GP19916/policy.test.mjs','review/dive-aim-GP19917/policy.test.mjs',`${dir}/policy.test.mjs`]],
 ['players',['tools/check-players.mjs']],['syntax',[`${dir}/prepare.mjs`]],['native-final',[`${dir}/native.mjs`]],
 ['native-extra',[`${dir}/extra.mjs`]],
 ['perf-before',[`${dir}/perf.mjs`,'--before']],['perf-after',[`${dir}/perf.mjs`]],
 ['npm-focused',['tools/tests/run-all.mjs','t253','--jobs','1','--no-retry','--all-fails']]
]){console.log('RUN',name);const r=spawnSync(process.execPath,args,{encoding:'utf8',timeout:300000}),log=(r.stdout||'')+(r.stderr||'')+(r.error?'\n'+r.error:'');fs.writeFileSync(`${dir}/${name}.log`,log);console.log(log);console.log('EXIT',name,r.status);if(r.status!==0||name==='npm-focused'&&/\bFAIL\s+t253|\bERROR\s+t253/.test(log))process.exit(1);}process.exit(0);
