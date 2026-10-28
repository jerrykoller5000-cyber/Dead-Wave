const fs=require('fs');let s=fs.readFileSync('tools/tests/t69.js','utf8');
const a="    const allOut = await until(() => T.zombies.filter((z) => z.alive).length >= (pv.total || 20), 30000);\n";
const b="    // GB-241 (rule 13, Claude 2026-10-27): was alive >= pv.total within 30 s of wall clock, which the real renderer's slower\n    // spawn ran out of. Now the wave's own state: every body of the wave spawned (waveSpawned >= waveTotal), up to 120 s.\n    const allOut = await until(() => { const w = T.getWaveDirectorState(); return w.waveTotal > 0 && w.waveSpawned >= w.waveTotal; }, 120000);\n";
const crlf=s.includes('\r\n'); if(crlf){s=s.replace(/\r\n/g,'\n');}
if(s.split(a).length!==2){console.log('count');process.exit(1)} s=s.replace(a,()=>b); if(crlf)s=s.replace(/\n/g,'\r\n');
fs.writeFileSync('tools/tests/t69.js',s);console.log('ok crlf',crlf);
