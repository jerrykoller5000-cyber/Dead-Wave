window.__r7layout='C';
const tg = T.trainingDbg.tg(), C = T.gridCentre, mx = -13, out = [];
T.unlockAllBuilds && T.unlockAllBuilds(); T.addCash && T.addCash(100000); T.runDevCommand('godmode');
const put = (kind, gx, gz, yaw = Math.PI) => { const b = T.placeBuildAt(kind, gx, gz, yaw); out.push(kind + '@' + gx + ',' + gz + (b ? ' ok' : ' ' + T.placeRefusalFor(kind, gx, gz))); };
const L = window.__r7layout || 'A';
if (L === 'A') { for (const i of [-2, 0, 2]) put('wire', mx + i, -314); for (const i of [-1, 0, 1]) put('spikes', mx + i, -313); put('mine', mx, -312); }
if (L === 'D') { for (const i of [-3, -2, -1, 0, 1, 2, 3]) put('wire', mx + i, -314, 0); for (const i of [-1, 0, 1]) put('spikes', mx + i, -316); }
if (L === 'B') put('light', mx, -316);
if (L === 'C') { for (const i of [-1, 0, 1]) put('mine', mx + i, -312); }
const p = T.player.position; p.set(C(mx), tg.floorY, C(-319));
return { L, out };


