// t286 - CL-257 (Jerry's N26, his second playthrough): "after rebooting the relay the door to the storage facility was
// already open without using the keypad. After using the keypad and typing in the correct code the elevator did not come
// up." The vault is built once a page and was never shut again for the next run. Now each run starts with it locked:
// the door down and solid, the lift down, nothing on it; and the code then brings the lift up as the first time.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'VaultOne');
    T.clearZombies(); T.runDevCommand('godmode');
    const D = T.relayDbg, R = () => T.radioCuesDbg();
    await until(() => !!R().locker, 6000);
    const L = R().locker;
    ok(!!L && L.phase === 'locked', 'run one: the vault starts locked (' + (L && L.phase) + ')');
    D.puzzle.unlock();   // the relay done and the code in, as a player would
    ok(await until(() => L.phase === 'open', 120000), 'run one: the code brings the lift up and the door rolls up (' + L.phase + ')');
    ok(!T.worldSolids.includes(L.doorSolid), 'run one: the doorway is clear');
    T.runDevCommand('godmode off');
    document.getElementById('quitMenuBtn').click();
    document.getElementById('quitConfirmBtn').click();
    ok(await until(() => T.getPhase() === 'idle', 10000), 'quit to the menu');
    await startMatch(T, 'VaultTwo');
    T.clearZombies();
    await until(() => D.state().stage === 'breakers', 6000);
    const L2 = R().locker;
    ok(L2 === L, 'run two: the same vault, built once');
    ok(L2.phase === 'locked' && L2.liftT === 0 && L2.doorT === 0 && !L2.reward, 'run two: it starts locked again, the lift down (' + L2.phase + ', lift ' + L2.liftT + ', door ' + L2.doorT + ')');
    ok(L2.vault.door.visible && T.worldSolids.includes(L2.doorSolid), 'run two: the door is down and solid');
    const Rw = L2.vault.rewards;
    ok(!Rw.crate.visible && !Rw.case.visible && !Rw.rack.visible && !Rw.katanaStand.visible, 'run two: nothing on the lift yet');
    ok(D.relay.lever && D.relay.lever.arm.rotation.x > 0.5 && !D.relay.broadcast, 'run two: the lever is up and the mast is quiet');
    T.runDevCommand('godmode');
    D.puzzle.unlock();
    ok(await until(() => L2.phase === 'lift' || L2.phase === 'door' || L2.phase === 'open', 20000), 'run two: the code brings the lift up again (' + L2.phase + ')');
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
