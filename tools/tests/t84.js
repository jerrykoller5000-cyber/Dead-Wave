// t84 - CL-64 (D-41): the cave drag is a studio scene (studio/scenes/guardian-grab-drag.json) played
// on the game's own guardian and marine. It loads, it plays from the catch, the guardian's hand stays
// on his ankle while it hauls him, the haul ends at the cave, and when the kill cuts to the aftermath
// both bodies are handed back exactly as the scene found them.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Scene');
    T.clearZombies && T.clearZombies();
    T.skipGrace && T.skipGrace();
    ok(await until(() => T.caveGrabReady(), 15000), 'the grab scene loaded (studio/scenes/guardian-grab-drag.json and its clips)');
    const c0 = T.POI.caves[0];
    const onAxis = (c, d) => ({ x: c.x + Math.sin(c.yaw) * d, z: c.z + Math.cos(c.yaw) * d });
    const placeFront = (c, d) => { const p = onAxis(c, d); T.player.position.set(p.x, T.sampleHeight(p.x, p.z), p.z); };
    placeFront(c0, 12);
    await wait(100);
    T.noteCaveMouthHit(0);
    await until(() => { const w = T.getCavePokeState().warning; return !!w && w.age > 3.2; }, 8000);
    placeFront(c0, 12);
    T.noteCaveMouthHit(0);
    ok(await until(() => !!T.getScriptedKill(), 20000), 'the chase catches him');
    const sk = T.getScriptedKill();
    ok(!!sk && sk.drag && !!sk.scene, 'the scene plays the drag');
    if (sk && sk.scene) {
      const rigRoot = sk.guardian.userData.rigRoot, M = T.marine;
      // The hand on the ankle while hauling (the scene's own gap check), and how far the pair travels.
      const W = (o) => { o.updateWorldMatrix(true, false); return new T.THREE.Vector3().setFromMatrixPosition(o.matrixWorld); };
      let worstGap = 0, samples = 0, start = null, farthest = 0;
      await new Promise((res) => {
        const step = () => {
          const s = T.getScriptedKill();
          if (!s || s.dragDone || !s.scene) return res();
          if (s.dragT > 2.6) {
            const hand = W(s.guardian.userData.rig.wristR), ankle = W(M.userData.ankleLG);
            worstGap = Math.max(worstGap, hand.distanceTo(ankle)); samples++;
            const g = W(rigRoot);
            if (!start) start = g; else farthest = Math.max(farthest, Math.hypot(g.x - start.x, g.z - start.z));
          }
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      ok(samples > 5 && worstGap < 0.25, `hauling, the hand holds the ankle (worst ${worstGap.toFixed(2)} m over ${samples} frames)`);
      ok(farthest > 1, `it hauls him away (${farthest.toFixed(1)} m)`);
      ok(await until(() => { const s = T.getScriptedKill(); return !s || s.dragDone; }, 20000), 'the haul ends at the cave (the kill takes over)');
      ok(await until(() => { const s = T.getScriptedKill(); return !s || !s.scene; }, 15000), 'the scene lets go at the cut');
      // makeCaveGuardian hangs the rig 1.15 m back inside its outer group, at 1.3 scale.
      ok(Math.abs(rigRoot.position.x) < 1e-6 && Math.abs(rigRoot.position.y) < 1e-6 && Math.abs(rigRoot.position.z + 1.15) < 1e-6 && Math.abs(rigRoot.scale.x - 1.3) < 1e-6,
        'the guardian rig is back on its own hanger (' + [rigRoot.position.x, rigRoot.position.y, rigRoot.position.z, rigRoot.scale.x].map((v) => v.toFixed(2)).join(', ') + ')');
      const ud = M.userData;
      ok(Math.abs(ud.torsoG.position.y - ud.torsoPivotY) < 0.02 && Math.hypot(ud.lowerBody.position.x, ud.lowerBody.position.y, ud.lowerBody.position.z) < 0.02,
        'the marine\'s torso and hips are back where they were (within the run\'s bob; torso ' + ud.torsoG.position.y.toFixed(3) + ', hips ' + ud.lowerBody.position.y.toFixed(3) + ')');
    }
    T.abortScriptedKill();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
