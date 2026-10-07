// t208 - CL-126 (Jerry's playthrough 1, 2026-10-06): the walk and the run, and his breath after a run.
//  - "He kinda bobs back and forth in a funny way": over a run stride his head now stays level and on the aim. Its side
//    to side tilt and its yaw swing are about half what CL-84's clips gave, the body's lift and drop is smaller,
//    and the legs turn at most 49 degrees off the aim.
//  - "Needs heavy breathing after running on idle": a run winds him, and standing winded he breathes fast and you
//    hear it; rested, he does not.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const key = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, key: code, bubbles: true }));
  try {
    await startMatch(T, 'Gait');
    T.clearZombies(); T.setHp(100000);
    const THREE = T.THREE, G = T.gaitDbg, ud = T.marine.userData;
    ok(!!G.GAIT_FEEL && G.GAIT_FEEL.legYaw < 1.05 && G.GAIT_FEEL.head < 0.5, 'the steadier feel is set (legs at most ' + (G.GAIT_FEEL.legYaw * 57.3).toFixed(0) + ' deg off the aim)');
    // Sweep a run stride, held beat by beat, and read the head's tilt and turn in the body's frame.
    const sweep = async (feel) => {
      G.GAIT.feel = feel; G.GAIT.holdRun = true;
      const tilt = [], yaw = [], ys = [];
      for (let i = 0; i < 8; i++) {
        G.GAIT.holdU = i / 8;
        await wait(350);
        T.marine.updateMatrixWorld(true);
        const qm = T.marine.getWorldQuaternion(new THREE.Quaternion()).invert();
        const qh = ud.headG.getWorldQuaternion(new THREE.Quaternion()).premultiply(qm);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(qh), fw = new THREE.Vector3(0, 0, 1).applyQuaternion(qh);
        tilt.push(Math.atan2(up.x, up.y)); yaw.push(Math.atan2(fw.x, fw.z));
        ys.push(ud.headG.getWorldPosition(new THREE.Vector3()).y);
      }
      G.GAIT.holdU = null; G.GAIT.holdRun = false;
      const span = (a) => Math.max(...a) - Math.min(...a);
      return { tilt: span(tilt), yaw: span(yaw), bob: span(ys) };
    };
    const before = await sweep(false), after = await sweep(true);
    G.GAIT.feel = true;
    const deg = (r) => (r * 57.3).toFixed(1);
    ok(before.tilt > 0 && after.tilt < before.tilt * 0.6, 'the head\'s side to side tilt over a run stride: ' + deg(before.tilt) + ' deg before, ' + deg(after.tilt) + ' now');
    ok(after.yaw < before.yaw * 0.75, 'its swing off the aim: ' + deg(before.yaw) + ' deg before, ' + deg(after.yaw) + ' now');
    ok(after.bob <= before.bob * 0.85, 'the head\'s lift and drop: ' + (before.bob * 100).toFixed(1) + ' cm before, ' + (after.bob * 100).toFixed(1) + ' now');
    // Rested: no breath to hear.
    G.setWinded(0); const b0 = G.breaths(); await wait(2500);
    ok(G.breaths() === b0, 'rested and standing: no heavy breathing (' + (G.breaths() - b0) + ' breaths heard)');
    // A run winds him.
    // (Game time: the test page runs slower than the clock, so the waits are counted in the game's own seconds.)
    const simWait = async (s) => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < s && Date.now() - w0 < 30000) await wait(50); return T.getSimTime() - t0; };
    G.setWinded(0);
    key('KeyW', true); key('ShiftLeft', true);
    const ran = await simWait(3);
    const w = G.winded();
    key('KeyW', false); key('ShiftLeft', false);
    ok(w > 0.35, ran.toFixed(1) + ' s of running winds him (' + w.toFixed(2) + ')');
    // Standing winded: fast, heard breaths, and the chest heaves.
    await simWait(0.4); G.setWinded(1);
    const b1 = G.breaths(); const p0 = G.pose().breathP || 0;
    const stood = await simWait(3);
    const heard = G.breaths() - b1, rate = ((G.pose().breathP || 0) - p0) / stood;
    ok(heard >= 3, 'standing winded he breathes hard, and you hear it (' + heard + ' breaths in ' + stood.toFixed(1) + ' s)');
    ok(rate > 2.4, 'faster than at rest (' + rate.toFixed(2) + ' rad/s; rested 1.7)');
    ok(G.winded() < 1 && G.winded() > 0.4, 'and it eases off as he stands (' + G.winded().toFixed(2) + ')');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
