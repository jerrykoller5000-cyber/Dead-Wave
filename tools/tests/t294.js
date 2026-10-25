// t294 - CL-264 (Jerry's N16: "Collecting the boots off the skeleton is one of the funniest things ever. The player should
// have to yank the boots by pressing E; the skeleton jerks every time he presses E as he yanks; when they finally come
// off, the skeleton falls off the tower and faceplants."):
//  - up the mast within reach: the prompt "Yank the boots"; E pulls; each pull jerks the dead soldier (and the boots);
//  - the 5th to 7th pull takes them off; he wears them;
//  - the skeleton tips off the platform, falls and lands face down at the mast's foot, on the ground, and stays;
//  - a new run puts him back on his perch with the boots on.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const key = (type, code = 'KeyE', k = 'e') => document.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true }));
  const tap = async () => { key('keydown'); await wait(40); key('keyup'); await wait(40); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Boots');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const L = T.lightningDbg, boots = L.state().boots || (L.update(0.016), L.state().boots), sk = L.skeleton(), mast = T.POI.mast;
    ok(!!boots && !!sk && sk.name === 'mast-skeleton', 'the dead soldier is his own piece on the perch, the boots on his feet');
    const home = sk.position.clone(), b0 = boots.position.clone();
    // Up the ladder to its top: his hands by the platform, the dead soldier's feet beside him.
    ok(L.climbMast(99), 'up the mast\'s ladder');
    await wait(300);
    ok(L.yankState().inReach, 'within reach of the boots, from the ladder\'s top');
    const prompt = document.getElementById('kioskPrompt');
    ok(await until(() => prompt.classList.contains('on') && /yank/i.test(prompt.textContent), 3000), 'the prompt: "' + prompt.textContent + '"');
    const need = L.yankState().need;
    ok(need >= 5 && need <= 7, 'it takes ' + need + ' pulls this run (5-7)');
    // One pull: he jerks, the boots with him, and back.
    await tap();
    let moved = 0, bootsMoved = 0;
    for (let i = 0; i < 60; i++) { moved = Math.max(moved, sk.position.distanceTo(home) + Math.abs(sk.rotation.x)); bootsMoved = Math.max(bootsMoved, boots.position.distanceTo(b0)); await wait(25); }
    ok(L.yankState().pulls === 1 && !L.worn(), 'one pull: not off yet');
    ok(moved > 0.02, 'he jerks with the pull (' + moved.toFixed(3) + ')');
    ok(bootsMoved > 0.005, 'and the boots with his feet (' + bootsMoved.toFixed(3) + ' m)');
    ok(await until(() => sk.position.distanceTo(home) < 0.002 && Math.abs(sk.rotation.x) < 0.01, 10000), 'and settles back');
    // The rest of the pulls.
    for (let i = 1; i < need; i++) { await tap(); await until(() => L.yankState().pulls > i || L.worn(), 4000); await wait(60); }
    ok(L.worn() && !boots.visible, 'the last pull: off they come, and he wears them');
    ok(['tip', 'fall', 'down'].includes(L.yankState().phase), 'the dead soldier goes over (' + L.yankState().phase + ')');
    // He falls and faceplants at the foot of the mast.
    ok(await until(() => L.yankState().phase === 'down', 90000), 'he lands');
    const gy = T.sampleHeight(sk.position.x, sk.position.z);
    sk.updateMatrixWorld(true);
    const box = new T.THREE.Box3().setFromObject(sk);
    ok(Math.abs(box.min.y - gy) < 0.15, 'on the ground, not in it or above it (' + (box.min.y - gy).toFixed(2) + ' m)');
    ok(Math.hypot(sk.position.x - mast.x, sk.position.z - mast.z) < 5, 'at the mast\'s foot (' + Math.hypot(sk.position.x - mast.x, sk.position.z - mast.z).toFixed(1) + ' m out)');
    ok(sk.rotation.x < -1.5, 'face down (' + sk.rotation.x.toFixed(2) + ' rad)');
    await wait(1500);
    ok(L.yankState().phase === 'down' && sk.position.distanceTo(L.yankState().landed) < 0.01, 'and he stays there');
    L.leaveMast();
    // A new run: back on his perch, the boots on his feet.
    T.runDevCommand('godmode off');
    document.getElementById('quitMenuBtn').click();
    document.getElementById('quitConfirmBtn').click();
    ok(await until(() => T.getPhase() === 'idle', 10000), 'quit to the menu');
    await startMatch(T, 'Boots2');
    ok(L.yankState().phase === 'on' && L.yankState().pulls === 0 && sk.position.distanceTo(home) < 0.01 && boots.visible && !L.worn(), 'a new run: back on his perch, the boots on');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
