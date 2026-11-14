import {spawnSync} from 'node:child_process';
for(const env of ['outdoor','training'])for(const weapon of ['uzi','ak','minigun','pistol']){console.log('BEGIN',env,weapon);const r=spawnSync(process.execPath,['review/GP-20133/game-clock.mjs',weapon,env,'scene-compile-clock'],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
