// t297 - CL-261 (Jerry's N20: "Ladder climbing still does not land accurately with hands and feet on actual rungs").
// Up the radio mast's ladder 13 cm at a time: at every height he stays on the ladder's line (a tree's canopy by the
// mast used to push him 27 cm off it every frame), each foot that is standing (not mid-step) has its sole on the top of
// its rung (not hanging over it, not through it), and each gripping hand's target is round its rung and within his
// arm's reach. The fist itself is reported, not checked: headless, tools/tests/fakethree.mjs's Matrix4.transpose() is
// a no-op, so the arm's IK lands short the higher the hand reaches (on real three the fists sit within 2 cm of their
// rungs; CL-261's probe, handoffs/2026-10-25-claude-CL-261-part1.md).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const L = T.lightningDbg, THREE = T.THREE;
    if (!L || !L.ladderNow || !L.limbs) { ok(false, 'the ladder hooks are there'); return out.join('\n'); }
    await startMatch(T, 'Ladder');
    T.clearZombies && T.clearZombies(); T.runDevCommand('godmode');
    const ud = T.getMarine().userData, P = T.player.position, REACH = 0.28 + T.handsDbg.HAND_L.length() - 0.005;
    let worstFoot = 0, worstHand = 0, worstReach = 0, worstFist = 0, worstLine = 0, feetN = 0, handsN = 0, where = '', whereH = '', whereR = '', whereL = '';
    for (let h = 1.0; h <= 6.0; h += 0.13) {
      L.climbMast(h);
      const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 0.5) await wait(40);
      const Lr = L.ladderNow(), st = L.limbs(), lad = L.mast().ladder; if (!Lr || !st || !lad) continue;
      const at = 'at ' + (P.y - Lr.foot).toFixed(2) + ' m';
      const off = Math.hypot(P.x - lad.x, P.z - lad.z);
      if (off > worstLine) { worstLine = off; whereL = at; }
      const rungY = (i) => (i < 0 ? Lr.foot : Lr.r0 + i * Lr.step);
      for (let s = 0; s < 2; s++) {
        const F = st.foot[s], an = s ? ud.ankleRG : ud.ankleLG;
        if (F.u < 1 || !an) continue;
        const d = new THREE.Box3().setFromObject(an).min.y - rungY(F.r);
        feetN++; if (Math.abs(d) > Math.abs(worstFoot)) { worstFoot = d; where = at + ', rung ' + F.r; }
      }
      T.getMarine().updateMatrixWorld(true);
      for (const [s, side] of [[0, 'L'], [1, 'R']]) {
        const H = st.hand[s]; if (H.u < 1 || !L.handTargets) continue;
        const tg = L.handTargets()[s], arm = s ? ud.armRG : ud.armLG;
        const d = tg.y - rungY(H.r), reach = tg.distanceTo(arm.getWorldPosition(new THREE.Vector3()));
        const fist = T.handsDbg.gripPoint(side, new THREE.Vector3()).y - rungY(H.r);
        handsN++;
        if (Math.abs(d) > Math.abs(worstHand)) { worstHand = d; whereH = at + ', rung ' + H.r; }
        if (reach > worstReach) { worstReach = reach; whereR = at + ', rung ' + H.r + ' (' + ((rungY(H.r) - P.y) * 100).toFixed(0) + ' cm over his feet)'; }
        if (Math.abs(fist) > Math.abs(worstFist)) worstFist = fist;
      }
    }
    out.push('INFO off the ladder\'s line at most ' + (worstLine * 100).toFixed(1) + ' cm ' + whereL + '; feet ' + feetN + ', worst sole ' + (worstFoot * 100).toFixed(1) + ' cm off its rung ' + where +
      '; hands ' + handsN + ', worst target ' + (worstHand * 100).toFixed(1) + ' cm ' + whereH + ', farthest reach ' + (worstReach * 100).toFixed(1) + ' cm of ' + (REACH * 100).toFixed(1) + ' ' + whereR +
      '; headless fist (fakethree) worst ' + (worstFist * 100).toFixed(1) + ' cm');
    ok(worstLine < 0.01, 'he stays on the ladder\'s line (worst ' + (worstLine * 100).toFixed(1) + ' cm off it)');
    ok(feetN > 20 && worstFoot > -0.03 && worstFoot < 0.04, 'every standing boot on its rung\'s top (worst ' + (worstFoot * 100).toFixed(1) + ' cm)');
    ok(handsN > 20 && Math.abs(worstHand) < 0.01 && worstReach <= REACH, 'every gripping hand goes round its rung, in his reach (worst ' + (worstHand * 100).toFixed(1) + ' cm, reach ' + (worstReach * 100).toFixed(1) + ' cm)');
    L.leaveMast();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
