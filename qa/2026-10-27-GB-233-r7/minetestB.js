window.__k='brute';
const C = T.gridCentre; T.trainingDbg.clear && T.trainingDbg.clear(); T.clearZombies && T.clearZombies();
const b = T.placeBuildAt('mine', -18, -312, 0); if (!b) return 'refused ' + T.placeRefusalFor('mine', -18, -312);
await new Promise(r => setTimeout(r, 300));
const ticking = T.builds.includes(b);
const z = T.spawnZombie(b.x + 0.2, b.z, window.__k||'shambler', true, true); const hp0 = z.hp; const log = [];
for (let i = 0; i < 15; i++) { await new Promise(r => setTimeout(r, 100)); log.push([i, b.tripT == null ? '-' : +b.tripT.toFixed(2), T.builds.includes(b) ? 1 : 0, Math.round(z.hp), z.alive ? 1 : 0, z.mesh ? 1 : 0]); }
return { mine: [b.x, b.z, b.radius, b.tier], ticking, hp0, log };

