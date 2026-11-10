import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
assert(process.env.DW_GAME_TEST_TOKEN);
for(const phase of ['before','after']){
  const run=spawnSync(process.execPath,['review/GT-20076/rail.mjs',phase],{stdio:'inherit'});
  if(run.error)throw run.error;
  if(run.status!==0)process.exit(run.status??1);
}
