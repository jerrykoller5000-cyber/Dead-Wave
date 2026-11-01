(async () => {
  const T = window.TT, C = T.chainDbg, out = [];
  const ok = (v, label) => out.push((v ? 'PASS ' : 'FAIL ') + label);
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stand = (x, z) => T.player.position.set(x, T.sampleHeight(x, z) + 0.3, z);
  try {
    C.on(true);
    const gate = C.at('trail-chain'), key = C.keyAt('chain-key'), camp = T.POI.campsites[1];
    ok(!!gate && gate.fenced, 'trail chain and side rails stand in the hikers path');
    ok(!!gate && Math.hypot(gate.x - camp.x, gate.z - camp.z) > 6 && Math.hypot(gate.x - camp.x, gate.z - camp.z) < 12, 'closure is at the camp approach');
    ok(!!key && key.state === 'unseen' && !key.visible, 'ambulance key is hidden before the lead event');
    ok(C.shut('objective:hikers-cache'), 'hikers mission is shut by the chain');
    stand(gate.x, gate.z); ok(C.use() === false, 'E at the chain without the key does not open it');
    const wreck = T.POI.wrecks[0]; stand(wreck.x, wreck.z); await pause(300);
    ok(C.read().events.includes('ambulance-reached'), 'reaching the ambulance fires the key event');
    ok(C.keyAt('chain-key')?.visible && C.keyAt('chain-key')?.state === 'ready', 'key appears beside the radio log');
    stand(key.x, key.z); ok(C.use() && C.keyAt('chain-key')?.state === 'held', 'E takes the key where it lies');
    stand(gate.x, gate.z); ok(C.use() && C.read().gates['trail-chain'] === 'open', 'E opens the trail chain with the held key');
    ok(!C.shut('objective:hikers-cache'), 'hikers mission gate is now open');
    T.runDevCommand('story open missing');
    ok(!T.storyDbg.closedSite('objective:hikers-cache') && !!T.hikersDbg()?.kit, 'the missing lead and hikers kit remain playable');
  } catch (error) { ok(false, String(error?.stack || error).slice(0, 300)); }
  return out.join('\n');
})()
