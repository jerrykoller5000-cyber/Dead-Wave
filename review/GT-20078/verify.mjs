import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

assert(process.env.DW_GAME_TEST_TOKEN, 'Use the crew test slot.');
for (const script of ['fit.mjs','models.mjs','results.mjs']) {
  const run=spawnSync(process.execPath,[fileURLToPath(new URL(script,import.meta.url)),'after'],{stdio:'inherit'});
  if(run.error) throw run.error;
  if(run.status!==0) process.exit(run.status??1);
}
