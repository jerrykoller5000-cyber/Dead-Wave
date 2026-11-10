import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
assert(process.env.DW_GAME_TEST_TOKEN,'Run through the crew slot');
let failed=false;
for (const [label,args] of [
  ['catalog',['tools/camera.mjs','check','weapon.','--out','review/GT-20076/after']],
  ['contour',['review/GT-20076/handle.mjs','after']],
  ['inspector',['review/GT-20076/look.mjs','after']],
  ['armory',['review/GT-20076/optics.mjs','after']],
  ['geometry',['review/GT-20076/run.mjs','after']],
  ['performance',['tools/bench.mjs','--scenario','training','--gfx','high','--seconds','12']],
  ['related',['tools/realtest.mjs','t217','t333','tcl334b','tcl334c','tcl334d','--all']]
]) {
  if (process.argv.length>2 && !process.argv.slice(2).includes(label)) continue;
  const r=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true});
  const log=(r.stdout||'')+(r.stderr||'');
  writeFileSync(new URL('./after/'+label+'.txt',import.meta.url),log);
  console.log(label,log.trim().split('\n').slice(-1)[0]);
  if(r.error || r.status!==0 || /^\s*FAIL\b/m.test(log)) failed=true;
}
if (failed) process.exitCode=1;
