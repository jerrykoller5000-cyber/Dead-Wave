import fs from 'node:fs';import {spawnSync} from 'node:child_process';
const tests=['ui/training-facility-audio.test.mjs','ui/training-danger.test.mjs','game/training-infirmary-fence.test.mjs','game/training-infirmary.test.mjs','game/training-armory-collision.test.mjs','game/training-station-reach.test.mjs'];
const r=spawnSync(process.execPath,['--test',...tests],{encoding:'utf8'});fs.writeFileSync('review/training-recovery-audio-GP19896/unit-results.txt',r.stdout+r.stderr,'utf8');console.log(r.stdout.slice(-220));process.exitCode=r.status;
