const D = T.trainingDbg, tg = D.tg(), B = tg.build, C = T.gridCentre;
T.unlockAllBuilds && T.unlockAllBuilds(); T.addCash && T.addCash(100000); T.runDevCommand('godmode');
const zr = tg.zombieRoom, zc = { x: (zr.minX + zr.maxX) / 2, z: (zr.minZ + zr.maxZ) / 2 };
const midGX = Math.round((B.minGX + B.maxGX) / 2), midGZ = Math.round((B.minGZ + B.maxGZ) / 2);
// Which way are the zombies: toward zc from the build area's middle.
const dirZ = Math.sign(zc.z - C(midGZ)) || 1;
const row = (k) => midGZ + dirZ * k;
const tries = [];
const put = (kind, gx, gz) => { const b = T.placeBuildAt(kind, gx, gz, 0); tries.push(kind + '@' + gx + ',' + gz + (b ? ' ok' : ' ' + T.placeRefusalFor(kind, gx, gz))); return !!b; };
put('light', midGX + 1, row(-2));
for (const i of [-2, 0, 2]) put('wire', midGX + i, row(1));
for (const i of [-1, 0, 1]) put('spikes', midGX + i, row(3));
put('mine', midGX + 1, row(4));
const p = T.player.position; p.set(C(midGX), tg.floorY, C(row(-4)));
return { B, zc, gate: tg.gate, mid: [C(midGX), C(midGZ)], dirZ, tries, player: [p.x, p.y, p.z] };
