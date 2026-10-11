// t218 - GB-145 (Jerry, 2026-10-08: "work on all the reload animations. Especially in akimbo. There are a lot of
// floating magazines and weird hand placements"). Held at sampled beats of the reload (TT.reloadClipDbg.hold), for
// every magazine gun single, the pistol / Uzi / revolver in akimbo, and the shotgun and the launcher:
//  - every visible magazine is seated in its gun's well or has its foot in the support palm; hidden only while the
//    hand is at the pouch (single) - never anywhere else (no magazine in midair);
//  - the shotgun's loading shell is hidden, in the palm, or at the loading port with the hand on it;
//  - akimbo: both magazines stay seated, the guns go in one at a time (right, then left) and each gun's well comes
//    onto its own side's pouch (the carrier's, or the belt's) while the other gun stays up;
//  - the hands: the support hand on the well when the magazine goes home and at the pouch when it is stowed, on the
//    slide / bolt / cylinder / drum / port when it works them; in akimbo each hand stays on its own gun's grip.
//    These need the arm IK: SKIP on the test page (Matrix4.transpose stub), measured on the real renderer
//    (handoffs/2026-10-08-grokbot-GB-145/reload-real.mjs t218).
// The GW-4 / KR-7 / Breacher-12 run CL-84's clip when it is loaded (t194 covers that); here only that no magazine of
// theirs is in midair outside its clip's 'drop' (the empty falling).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE, V = () => new THREE.Vector3();
  const f3 = (n) => (+n).toFixed(3);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const ikOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page arm IK inert) ' + m);
  const TOL = 0.02;                // the magazine's foot to the well or the palm (m)
  // The plans' beats (index.html RELOAD_PLAN): reach, pouch, seat.
  const PLAN = { pistol: [0.10, 0.32, 0.60], uzi: [0.10, 0.32, 0.58], sniper: [0.10, 0.30, 0.54], m4: [0.12, 0.34, 0.62], ak: [0.12, 0.34, 0.62], aa12: [0.12, 0.34, 0.62] };
  let aimer = null;
  const ONLY = window.__t218only || null, want = (w) => !ONLY || ONLY.includes(w);
  try {
    const R = T.reloadClipDbg;
    ok(!!R && typeof R.hold === 'function', 'TT.reloadClipDbg.hold is exported');
    if (typeof startMatch === 'function' && !(T.getPhase && T.getPhase() === 'prep' && T.weaponMeshes)) await startMatch(T, 'Reload anim');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));   // busy: no idle
    const m = T.marine || window.worldMarine, ud = m.userData;
    const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
    aimer = setInterval(pin, 5); pin();
    // CU-100: where each hand closes now, as the game has it (the middle of the fist on a grip; the hand point through
    // a magazine change); before, the hand point.
    const gp = T.handsDbg && T.handsDbg.gripPoint;
    const palmL = () => gp ? gp('L', V()) : ud.elbowLG.localToWorld(V().set(0.02, -0.27, 0.13));
    const palmR = () => gp ? gp('R', V()) : ud.elbowRG.localToWorld(V().set(-0.01, -0.26, 0.12));
    const shown = (o) => { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === T.scene) break; } return true; };
    const holds = T.getShoulderDbg().holds;
    const pouchOf = (sx) => {
      const vest = ud.gearParts && ud.gearParts.vest && ud.gearParts.vest.some((o) => o.visible), piv = ud.torsoPivotY || 0.7;
      return ud.torsoG.localToWorld(vest ? V().set(0.12 * sx, 0.965 - piv, 0.25) : V().set(0.115 * sx, 0.68 - piv, 0.19));
    };
    // The seated foot, measured before the reload: gun space and magazine space.
    const seatOf = (gun) => {
      const mag = gun.userData.mag; if (!mag) return null;
      gun.updateMatrixWorld(true);
      const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], inv = new THREE.Matrix4().copy(mag.matrixWorld).invert(), v = V();
      mag.traverse((o) => {
        const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return;
        const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
        for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], [v.x, v.y, v.z][k]); hi[k] = Math.max(hi[k], [v.x, v.y, v.z][k]); } }
      });
      const inMag = V().set((lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2);
      return { inMag, inGun: gun.worldToLocal(mag.localToWorld(inMag.clone())) };
    };
    const take = async (w, aki) => {
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await wait(300);
      await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0 && !(T.drawDbg && T.drawDbg().active)) || Date.now() - t0 > 6000 ? r() : setTimeout(f, 50); f(); });
      await wait(1800);
      const on = !!T.offhandMeshes[w] && T.offhandMeshes[w].visible;
      if (aki !== on) { T.toggleDualWieldDbg(); await wait(1200); }
      return T.getCurrentWeapon() === w && (!!T.offhandMeshes[w] && T.offhandMeshes[w].visible) === aki;
    };
    const begin = async (w) => {
      T.setAmmoDbg(w, 1);
      if (T.setMagazinesDbg && T.magazinesDbg && T.magazinesDbg(w)) T.setMagazinesDbg(w, 1, [99, 99, 99], 1);
      T.startReload(); await wait(80);
      return !!T.getReloadDbg().weapon;
    };
    const at = async (u) => { R.hold(u); await wait(200); m.updateMatrixWorld(true); };
    const BEATS = Array.from({ length: 25 }, (_, k) => +(k * 0.04).toFixed(2));   // 0 .. 0.96
    const end = async () => { R.hold(null); for (let i = 0; i < 100 && T.getReloadDbg().weapon; i++) await wait(100); await wait(300); };

    // --- single, magazine guns -------------------------------------------------------------------------------
    for (const w of ['pistol', 'uzi', 'sniper', 'm4', 'ak', 'aa12'].filter(want)) {
      if (!(await take(w, false))) { ok(false, w + ': could not take it single'); continue; }
      const gun = T.weaponMeshes[w], mag = gun.userData.mag, seat = seatOf(gun);
      if (!mag || !seat) { ok(false, w + ': no magazine on the gun'); continue; }
      if (!(await begin(w))) { ok(false, w + ': the reload did not start'); continue; }
      const clip = ['m4', 'ak', 'aa12'].includes(w) && R.clip && R.clip();
      const [reach, pouch, seatU] = PLAN[w];
      let floating = [], hidden = [], inHand = 0, worstSeatHand = 0, worstPouchHand = 0;
      for (const u of BEATS) {
        await at(u);
        gun.updateMatrixWorld(true);
        const foot = mag.localToWorld(seat.inMag.clone()), well = gun.localToWorld(seat.inGun.clone()), hl = palmL();
        const dW = foot.distanceTo(well), dH = foot.distanceTo(hl);
        if (shown(mag)) {
          const clipState = clip && R.mag() ? R.mag().state : null;
          if (dH < TOL) inHand++;
          else if (dW >= TOL && clipState !== 'drop') floating.push(u.toFixed(2) + ' (well ' + f3(dW) + ', palm ' + f3(dH) + ')');
        } else if (!clip && !(u >= pouch - 0.02 && u < pouch + 0.06)) hidden.push(u.toFixed(2));
      }
      if (!clip) {
        await at(seatU); worstSeatHand = palmL().distanceTo(gun.localToWorld(seat.inGun.clone()));
        await at(pouch + 0.02); worstPouchHand = palmL().distanceTo(pouchOf(-1));
      }
      ok(!floating.length, w + ': every visible magazine is seated or in the palm' + (clip ? ' (or the clip\'s falling empty)' : '') + (floating.length ? ': in midair at u ' + floating.slice(0, 4).join(', ') : ''));
      if (!clip) {
        ok(!hidden.length, w + ': hidden only while the hand is at the pouch' + (hidden.length ? ' (also at u ' + hidden.slice(0, 5).join(', ') + ')' : ''));
        ok(inHand >= 6, w + ': the magazine rides in the palm between the well and the pouch (' + inHand + ' beats)');
        ikOk(worstSeatHand < 0.05, w + ': the support hand is on the well as the magazine goes home (' + f3(worstSeatHand) + ' m)');
        ikOk(worstPouchHand < 0.09, w + ': and at the pouch when it stows the empty (' + f3(worstPouchHand) + ' m)');
        if (w === 'pistol' || w === 'sniper') {
          await at(w === 'pistol' ? 0.80 : 0.78);
          const part = w === 'pistol' ? gun.userData.slide : gun.userData.bolt;
          const grab = part && part.userData.gb145Grab;
          ok(!!grab, w + ': the ' + (w === 'pistol' ? 'slide' : 'bolt') + ' has a grab point');
          const tgt = part ? part.localToWorld(grab ? grab.clone() : V()) : V();
          const d = part ? palmL().distanceTo(tgt) : 9, sh = ud.armLG.getWorldPosition(V()).distanceTo(tgt);
          ikOk(d < 0.05, w + ': the hand on the ' + (w === 'pistol' ? 'slide as it racks' : 'bolt as it cycles') + ' (' + f3(d) + ' m; ' + f3(sh) + ' m from that shoulder)');
        }
      }
      const gripD = palmR().distanceTo(gun.localToWorld(V().fromArray(holds[w].grip)));
      ikOk(gripD < 0.03, w + ': the firing hand stays on the grip (' + f3(gripD) + ' m)');
      await end();
      ok(mag.visible && mag.position.distanceTo(gun.userData.baseMagPos) < 0.002, w + ': seated after the reload');
    }

    // --- akimbo ------------------------------------------------------------------------------------------------
    for (const w of ['pistol', 'uzi', 'revolver'].filter((w) => want(w + '-akimbo'))) {
      if (!(await take(w, true))) { ok(false, w + ': could not take the pair'); continue; }
      const guns = [T.weaponMeshes[w], T.offhandMeshes[w]], seats = guns.map(seatOf);
      if (!(await begin(w))) { ok(false, w + ' akimbo: the reload did not start'); continue; }
      const sx = [Math.sign(ud.armRG.position.x) || 1, Math.sign(ud.armLG.position.x) || -1];
      let floating = [], gone = [], worstGrip = 0;
      const nearest = [9, 9], moved = [[], []], base = [];
      for (const u of BEATS) {
        await at(u);
        guns.forEach((g, i) => {
          g.updateMatrixWorld(true);
          const mag = g.userData.mag, s = seats[i];
          // The revolver's cylinder swings out on its crane: on the gun, so not checked as a loose magazine.
          if (mag && s && w !== 'revolver') {
            const foot = mag.localToWorld(s.inMag.clone()), well = g.localToWorld(s.inGun.clone());
            if (!shown(mag)) gone.push(i + '@' + u.toFixed(2));
            else if (foot.distanceTo(well) >= TOL) floating.push(i + '@' + u.toFixed(2) + ' (' + f3(foot.distanceTo(well)) + ')');
          }
          // its well (the revolver: under the cylinder) to its own side's pouch, in his torso's space
          const wl = mag && s ? (w === 'revolver' ? g.localToWorld(g.worldToLocal(mag.getWorldPosition(V())).add(V().set(0, -0.035, 0))) : mag.localToWorld(s.inMag.clone())) : g.getWorldPosition(V());
          nearest[i] = Math.min(nearest[i], wl.distanceTo(pouchOf(sx[i])));
          const grip = g.localToWorld(V().fromArray(holds[w].grip)), gt = ud.torsoG.worldToLocal(grip.clone());
          if (!base[i]) base[i] = gt.clone();
          moved[i].push(gt.distanceTo(base[i]));
          worstGrip = Math.max(worstGrip, (i ? palmL() : palmR()).distanceTo(grip));
        });
      }
      ok(w === 'revolver' || !floating.length, w + ' akimbo: both magazines stay seated' + (floating.length ? ': off the well at ' + floating.slice(0, 4).join(', ') : ''));
      ok(!gone.length, w + ' akimbo: and visible (no magazine vanishing mid-air)' + (gone.length ? ': hidden at ' + gone.slice(0, 4).join(', ') : ''));
      // One at a time: the right gun furthest from its hold in the first half, the left in the second; the other stays put.
      const n = moved[0].length, mid = Math.floor(n / 2);
      const maxAt = (a) => { let k = 0; for (let i = 0; i < a.length; i++) if (a[i] > a[k]) k = i; return k; };
      const r0 = maxAt(moved[0]), l0 = maxAt(moved[1]);
      ok(r0 < mid && l0 >= mid - 1, w + ' akimbo: the right gun goes to its pouch first (beat ' + r0 + '), then the left (beat ' + l0 + ' of ' + n + ')');
      ok(moved[0][r0] > 0.1 && moved[1][l0] > 0.1, w + ' akimbo: each gun comes in to the pouch (' + f3(moved[0][r0]) + ' / ' + f3(moved[1][l0]) + ' m from its hold)');
      ok(moved[1][r0] < 0.05 && moved[0][l0] < 0.05, w + ' akimbo: the other gun stays up meanwhile (' + f3(moved[1][r0]) + ' / ' + f3(moved[0][l0]) + ' m)');
      ok(nearest[0] < 0.04 && nearest[1] < 0.04, w + ' akimbo: each gun\'s well comes onto its own side\'s pouch (' + f3(nearest[0]) + ' / ' + f3(nearest[1]) + ' m)');
      ikOk(worstGrip < 0.03, w + ' akimbo: each hand stays on its own gun\'s grip (worst ' + f3(worstGrip) + ' m)');
      await end();
      if (T.offhandMeshes[w].visible) { T.toggleDualWieldDbg(); await wait(600); }
    }

    // --- the revolver, the shotgun and the launcher, single ------------------------------------------------------
    for (const [w, part, from, to] of [['revolver', 'cylinder', 0.48, 0.78], ['launcher', 'drum', 0.56, 0.74]].filter((r) => want(r[0]))) {
      if (!(await take(w, false))) { ok(false, w + ': could not take it'); continue; }
      const gun = T.weaponMeshes[w];
      if (!(await begin(w))) { ok(false, w + ': the reload did not start'); continue; }
      let worst = 0, worstPouch = 9;
      for (const u of BEATS) {
        await at(u);
        if (u >= from && u <= to) { const p = gun.userData[part]; worst = Math.max(worst, p ? palmL().distanceTo(p.getWorldPosition(V())) : 9); }
        worstPouch = Math.min(worstPouch, palmL().distanceTo(pouchOf(-1)));
      }
      ok(!!gun.userData[part] && shown(gun.userData[part]), w + ': the ' + part + ' stays on the gun');
      ikOk(worst < 0.12, w + ': the support hand is at the ' + part + ' while it loads (' + f3(worst) + ' m)');
      ikOk(worstPouch < 0.09, w + ': it fetches from the pouch (' + f3(worstPouch) + ' m)');
      await end();
    }
    if (!want('shotgun')) { /* filtered */ } else if (await take('shotgun', false)) {
      const gun = T.weaponMeshes.shotgun, rs = gun.userData.reloadShell, bp = gun.userData.baseReloadShellPos;
      ok(!!rs && !!bp, 'shotgun: has its loading shell');
      if (rs && bp && await begin('shotgun')) {
        let floating = [], inHand = 0, worstPort = 0;
        for (const u of BEATS) {
          await at(u);
          const p = rs.getWorldPosition(V()), port = rs.parent.localToWorld(bp.clone()), hl = palmL();
          if (shown(rs)) {
            if (p.distanceTo(hl) < TOL) inHand++;
            else if (p.distanceTo(port) > 0.045) floating.push(u.toFixed(2) + ' (' + f3(p.distanceTo(port)) + ')');
            else worstPort = Math.max(worstPort, hl.distanceTo(port));
          }
        }
        ok(!floating.length, 'shotgun: the shell is in the palm or at the port, never in midair' + (floating.length ? ': at ' + floating.slice(0, 4).join(', ') : ''));
        ok(inHand >= 4, 'shotgun: the shell rides in the palm from the pouch (' + inHand + ' beats)');
        ikOk(worstPort < 0.07, 'shotgun: the hand is on the port while the shell goes in (' + f3(worstPort) + ' m)');
        await end();
      } else ok(false, 'shotgun: the reload did not start');
    } else ok(false, 'shotgun: could not take it');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  if (aimer) clearInterval(aimer);
  try { T.reloadClipDbg.hold(null); } catch { /* */ }
  return out.join('\n');
})();
