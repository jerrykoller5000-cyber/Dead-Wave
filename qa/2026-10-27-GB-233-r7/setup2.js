const D = T.trainingDbg, tg = D.tg(), C = T.gridCentre;
try { D.clear && D.clear(); } catch (e) {} T.clearZombies && T.clearZombies();
try { D.clearLayout && D.clearLayout(); } catch (e) {}
for (const b of (T.getBuilds ? T.getBuilds() : [])) {}
const tries = [];
const put = (kind, gx, gz) => { const b = T.placeBuildAt(kind, gx, gz, Math.PI); tries.push(kind + '@' + gx + ',' + gz + (b ? ' ok' : ' ' + T.placeRefusalFor(kind, gx, gz))); return !!b; };
const mx = -13;
put('light', mx + 1, -317);
for (const i of [-2, 0, 2]) put('wire', mx + i, -314);
for (const i of [-1, 0, 1]) put('spikes', mx + i, -313);
put('mine', mx - 1, -312);
const p = T.player.position; p.set(C(mx), tg.floorY, C(-319));
return { tries, player: [p.x, p.y, p.z], gate: tg.gate };
