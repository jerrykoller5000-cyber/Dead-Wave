import { spawn } from 'node:child_process';
import fs from 'node:fs';
const tests = fs.readFileSync('qa/2026-11-05-GB-278/suite-without-tcl275.txt','utf8').trim().split(/\r?\n/);
const args = ['crew/crew.mjs','slot','run','grokbot','GB-278','--checks','integration without tcl275* (CDP wedge workaround)','--minutes','240','--','node','tools/tests/run-all.mjs','--agent','grokbot','--task','GB-278','--jobs','1','--all-fails',...tests];
const out = fs.openSync('qa/2026-11-05-GB-278/npm-test-no275.log','w');
const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['ignore', out, out] });
fs.writeFileSync('qa/2026-11-05-GB-278/npm-test-no275.pid', String(child.pid));
child.on('exit', (c) => { fs.writeSync(out, `\nEXIT ${c}\n`); process.exit(c ?? 1); });
