import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
const dir = 'qa/2026-11-05-GB-278';
const reds = fs.readFileSync(dir + '/reds.txt','utf8').trim().split(/\s+/);
const un = fs.readFileSync(dir + '/unreached.txt','utf8').trim().split(/\s+/);
const batches = [];
for (let i = 0; i < reds.length; i += 5) batches.push(['reds', reds.slice(i, i+5)]);
for (let i = 0; i < un.length; i += 10) batches.push(['rest', un.slice(i, i+10)]);
let n = 0;
for (const [kind, list] of batches) {
  n++;
  const log = `${dir}/batch-${String(n).padStart(2,'0')}-${kind}.log`;
  const out = fs.openSync(log, 'w');
  fs.writeSync(out, `BATCH ${n} ${kind}: ${list.join(' ')}\n`);
  spawnSync(process.execPath, ['crew/crew.mjs','slot','run','grokbot','GB-278','--checks',`triage batch ${n} (${kind}): ${list.join(' ')}`,'--minutes','60','--','node','tools/tests/run-all.mjs','--agent','grokbot','--task','GB-278','--jobs','1','--all-fails',...list], { cwd: process.cwd(), stdio: ['ignore', out, out] });
  fs.writeSync(out, `\nBATCH DONE\n`);
  fs.writeFileSync(dir + '/batch-progress.txt', `${n}/${batches.length} done at ${new Date().toISOString()}\n`);
}
fs.writeFileSync(dir + '/batch-progress.txt', `ALL ${batches.length} DONE at ${new Date().toISOString()}\n`);
