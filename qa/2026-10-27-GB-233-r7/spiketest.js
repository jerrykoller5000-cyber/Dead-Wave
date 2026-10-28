T.clearZombies&&T.clearZombies();T.placeBuildAt('spikes',-17,-316,0);await new Promise(r=>setTimeout(r,300));
const sp = T.builds.filter(b => b.type === 'spikes'); if (!sp.length) return 'no spikes';
const b = sp[0]; const z = T.spawnZombie(b.x, b.z + 1.5, 'shambler', true, true); const hp0 = z.hp; const log = [];
for (let i = 0; i < 20; i++) { z.mesh.position.x = b.x; z.mesh.position.z = b.z; await new Promise(r => setTimeout(r, 100)); log.push([+(z.hp || 0).toFixed(1), z.alive ? 1 : 0, b.cd != null ? +(+b.cd).toFixed(2) : (b.springT != null ? +(+b.springT).toFixed(2) : '-')]); }
return { spikes: sp.map(s => [s.x, s.z, s.hp, Object.keys(s).filter(k => /spring|cd|arm|cool|t$/i.test(k)).join(',')]), hp0, log };

