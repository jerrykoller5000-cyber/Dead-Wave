// t315 - CU-202: the mast yard, the ranger camp and the mine mouth stay shut until their keys.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const stand = (x, z) => { const y = T.sampleHeight(x, z); T.player.position.set(x, (Number.isFinite(y) ? y : 0) + 0.3, z); };
  try {
    if (!T.chainDbg) { ok(false, 'the chain hooks are there'); return out.join('\n'); }
    await startMatch(T, 'ThreeGates');
    T.clearZombies && T.clearZombies();
    if (T.runDevCommand) T.runDevCommand('godmode');
    const C = T.chainDbg;
    ok(C.on(true) === true, 'the gates are on');
    ok(await until(() => C.at('mast-yard') && C.at('ranger-gate') && C.at('mine-iron-gate'), 8000), 'the three gates are standing');
    ok(C.at('mast-yard').fenced && C.at('ranger-gate').fenced && !C.at('mine-iron-gate').fenced, 'the yard and the camp have a short fence; the mine mouth uses the rock');
    ok(C.shut('objective:radio-repair') && C.shut('objective:ranger-cache'), 'the relay and the ranger camp are shut');
    ok(C.mineShut() === true, 'the iron mine is shut');
    ok(C.keyAt('sato-key') && C.keyAt('sato-key').state === 'unseen', 'Sato\'s key waits on the HQ having power');
    C.event('hq-power');
    ok(await until(() => C.keyAt('sato-key').visible, 2000), 'the power coming on puts Sato\'s key in the radio drawer');
    const sato = C.keyAt('sato-key'); stand(sato.x, sato.z);
    ok(C.use() === true && C.keyAt('sato-key').state === 'held', 'E takes Sato\'s key');
    const yard = C.at('mast-yard'); stand(yard.x, yard.z);
    ok(C.use() === true && C.at('mast-yard').open, 'E opens the mast yard');
    ok(C.shut('objective:radio-repair') === false, 'the relay cabinet can be worked');
    ok(C.keyAt('ranger-gate-key').state === 'unseen', 'the ranger key waits in Clarke\'s toolbox');
    C.event('toolbox-open');
    ok(await until(() => C.keyAt('ranger-gate-key').visible, 2000), 'cutting the toolbox chain readies the camp key');
    const rk = C.keyAt('ranger-gate-key'); stand(rk.x, rk.z);
    ok(C.use() === true && C.read().keys['ranger-gate-key'] === 'held', 'E takes the ranger key at the truck');
    const rg = C.at('ranger-gate'); stand(rg.x, rg.z);
    ok(C.use() === true && C.at('ranger-gate').open, 'E opens the ranger gate');
    ok(C.shut('objective:ranger-cache') === false, 'the ranger cache can be worked');
    C.event('cellar-open');
    ok(await until(() => C.keyAt('trapper-keyring') && C.keyAt('trapper-keyring').visible, 2000), 'the cellar opening puts the key ring out');
    const ring = C.keyAt('trapper-keyring'); stand(ring.x, ring.z);
    ok(C.use() === true && C.read().keys['trapper-keyring'] === 'held', 'E takes the key ring');
    const mine = C.at('mine-iron-gate'); stand(mine.x, mine.z);
    ok(C.use() === false && C.mineShut(), 'the key ring alone does not open the mine');
    C.event('hush-wired');
    ok(C.use() === true && C.at('mine-iron-gate').open && C.mineShut() === false, 'with the Hush wired, E opens the iron gate');
  } catch (e) {
    ok(false, 't315 threw: ' + String((e && e.stack) || e).slice(0, 450));
  }
  return out.join('\n');
})()
