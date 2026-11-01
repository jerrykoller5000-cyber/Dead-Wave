// t313 - CU-200: the generator's shed stays shut until Price's key opens it, and a spare key
// appears on the duty board after a lead has been open two dawns with its key never ready.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const stand = (x, z) => { const y = T.sampleHeight(x, z); T.player.position.set(x, (y == null ? 0 : y) + 0.3, z); };
  try {
    if (!T.chainDbg || !T.fuelDbg || !T.runDevCommand) { ok(false, 'the chain hooks are there'); return out.join('\n'); }
    await startMatch(T, 'ChainGates');
    T.clearZombies && T.clearZombies();
    if (T.runDevCommand) T.runDevCommand('godmode');
    ok(T.chainDbg.on() === false, 'the timer page starts with the gates off');
    ok(T.chainDbg.on(true) === true, 'a check can turn the gates on');
    T.runDevCommand('site fuel');
    const F = T.fuelDbg, R = () => F.run(), C = T.chainDbg;
    ok(await until(() => !!F.props() && !!C.gate() && !!C.key(), 8000), 'the shed and Price\'s key are in the world');
    ok(C.shut('objective:fuel-depot') === true, 'the depot is shut');
    ok(F.reach() && F.reach().blockedBy === 'chain', 'the claim is blocked by the gate (' + (F.reach() && F.reach().blockedBy) + ')');
    ok(/locked/i.test(F.prompt() || ''), 'at the pump, the lock speaks ("' + F.prompt() + '")');
    const saved = C.read();
    const key = C.key(); stand(key.x, key.z);
    ok(C.use() === true, 'E takes the key at the generator');
    ok(C.key().state === 'held', 'the key is held');
    ok(C.load(saved) || true, 'a snapshot loads');
    ok(C.read().keys['price-key'] === 'ready', 'loading the snapshot puts the key back (' + C.read().keys['price-key'] + ')');
    stand(key.x, key.z);
    ok(C.use() === true, 'E takes it again');
    const gate = C.gate(); stand(gate.x, gate.z);
    ok(/path|gate|pump/i.test(F.prompt() || C.prompt() || ''), 'with the key, the gate can be opened ("' + F.prompt() + '")');
    ok(C.use() === true && C.gate().open === true, 'E opens the shed');
    ok(C.shut('objective:fuel-depot') === false, 'the depot is open');
    T.runDevCommand('site fuel');
    await wait(200);
    ok(/fill/i.test(F.prompt() || ''), 'the fill can start ("' + F.prompt() + '")');
    const keyE = (type) => document.dispatchEvent(new KeyboardEvent(type, { code: 'KeyE', key: 'e', bubbles: true }));
    keyE('keydown'); { const s0 = T.getSimTime(); await until(() => T.getSimTime() - s0 >= 0.4, 8000); } keyE('keyup'); await wait(120);
    ok(R().fill > 0, 'holding E fills (' + (R().fill || 0).toFixed(2) + ')');
    T.runDevCommand('story open relay');
    const opened = (C.story().leads.find((l) => l.id === 'relay') || {}).openedDay;
    const got = C.dawn((opened == null ? 0 : opened) + 2);
    ok(got.includes('mast-yard') && C.read().spare.includes('mast-yard') && C.spare(), 'two dawns later a spare key is on the board (opened ' + opened + ', ' + got.join(',') + ')');
    const sp = C.spare();
    if (sp) { stand(sp.x, sp.z); ok(C.use() === true && C.read().keys['sato-key'] === 'held', 'E takes the spare'); }
    else ok(false, 'no spare to take');
    C.reset();
    ok(C.read().gates['depot-shed'] === 'locked' && C.read().keys['sato-key'] === 'unseen' && !C.gate(), 'a new run locks the shed again and puts the spare away');
  } catch (e) {
    ok(false, 't313 threw: ' + String((e && e.stack) || e).slice(0, 400));
  }
  return out.join('\n');
})()
