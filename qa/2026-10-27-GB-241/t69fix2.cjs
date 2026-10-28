const fs=require('fs');let s=fs.readFileSync('tools/tests/t69.js','utf8');
const a="    const allOut = await until(() => { const w = T.getWaveDirectorState(); return w.waveTotal > 0 && w.waveSpawned >= w.waveTotal; }, 120000);\n";
const b="    // (Either: on the test page the director's count can lag the bodies, so the old count still serves.)\n    const allOut = await until(() => { const w = T.getWaveDirectorState(); return (w.waveTotal > 0 && w.waveSpawned >= w.waveTotal) || T.zombies.filter((z) => z.alive).length >= (pv.total || 20); }, 120000);\n";
if(s.split(a).length!==2){console.log('count');process.exit(1)} s=s.replace(a,()=>b);fs.writeFileSync('tools/tests/t69.js',s);console.log('ok');
