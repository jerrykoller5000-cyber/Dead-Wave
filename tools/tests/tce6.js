// tce6 - CE-6 (J136, Jerry 11 Nov: "I'm not sure if the cylinder is rotating on every trigger pull with the revolver. If not
// could you please ensure that it is." ... "Same cylinder check with the grenade launcher as well."). Claude 5. Stepped at 60
// frames a second (T.stepFrame), read off the guns' own parts, not a counter:
// - the revolver, third person and first person, one gun and the pair: on every pull the chamber that comes up under the
//   hammer (the top of the cylinder, the bore's line) is a live one by the break, its round is the one that goes, and after
//   the shot that fired chamber stays under the hammer; each pull turns the cylinder one chamber (60 degrees), the same way
//   every time; the hammer rises with the pull (J118); the view's cylinder is the world gun's;
// - a dry pull (no rounds) turns nothing and fires nothing;
// - a reload starts and ends without a jump of the cylinder;
// - the launcher: after every shot the drum's spring turns it one chamber the same way, so the next live round is behind the
//   barrel (the top chamber), the fired cases staying in their chambers until the reload; the reload starts and ends without
//   a jump, and the next live round is behind the barrel after it.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const dt = 1 / 60;
  const THREE = T.THREE || window.THREE;
  const deg = (r) => (r * 180 / Math.PI).toFixed(0);
  try {
    if (!T.revolverPullDbg || !T.stepFrame || !T.weaponMeshes || !T.setMouseFireDbg) { ok(false, 'the hooks are there (revolverPullDbg, stepFrame, weaponMeshes, setMouseFireDbg)'); return out.join('\n'); }
    await startMatch(T, 'CE6');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(400); return T.getCurrentWeapon() === w; };
    const steps = (n) => { for (let i = 0; i < n; i++) T.stepFrame(dt); };
    // the chamber at the top of a cylinder or drum (in the gun's own space, on its axis' up side): the one on the bore
    const _p = new THREE.Vector3(), _c = new THREE.Vector3();
    // (the revolver's round groups sit at their chambers; the launcher's are instanced art on groups at the drum's centre, so
    // its chambers are read off the drum's layout: chamber i at (sin, cos)(60i deg) x 0.065 m in the drum's own space)
    const topOf = (gun, part, rounds, drumR) => {
      gun.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert();
      part.getWorldPosition(_c).applyMatrix4(inv);
      let best = -1, by = -1e9;
      rounds.forEach((r, i) => {
        if (drumR) { const a = i * Math.PI / 3; _p.set(Math.sin(a) * drumR, Math.cos(a) * drumR, 0).applyMatrix4(part.matrixWorld).applyMatrix4(inv); }
        else r.getWorldPosition(_p).applyMatrix4(inv);
        const y = _p.y - _c.y; if (y > by) { by = y; best = i; }
      });
      return best;
    };
    // the part's turn about its own axis from its base, in chamber steps (0..6)
    const turnOf = (part, base) => { const q0 = new THREE.Quaternion().setFromEuler(base), q = q0.invert().multiply(part.quaternion.clone()); let a = 2 * Math.atan2(q.z, q.w); a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); return a / (Math.PI / 3); };
    const wrap = (x) => x - 6 * Math.round(x / 6);
    const liveOf = (ud) => ud.chamberNoses.filter((n) => n.visible).length;

    // ---- the revolver: n pulls on the gun that fires next, frame by frame
    const pulls = (label, n, vmCheck) => {
      const R = T.weaponMeshes.revolver, O = T.offhandMeshes && T.offhandMeshes.revolver;
      const res = { ok: 0, turns: [], tops: [], hammer: [], fails: [], vm: [] };
      for (let k = 0; k < n; k++) {
        const guns = [R, O].filter((g) => g && g.visible !== false && g.userData.chamberNoses);
        const before = guns.map((g) => ({ g, L: liveOf(g.userData), t: turnOf(g.userData.cylinder, g.userData.baseCylinderRot) }));
        T.setMouseFireDbg(true);
        let shotGun = null, preTop = -1, preLive = false, hamMin = 0, f = 0;
        for (f = 0; f < 30 && !shotGun; f++) {
          // the frame before the break: what is under the hammer, and is it live?
          for (const b of before) { const ud = b.g.userData; const top = topOf(b.g, ud.cylinder, ud.chamberRounds); b.top = top; b.topLive = ud.chamberNoses[top].visible; if (ud.hammer) b.ham = Math.min(b.ham == null ? 0 : b.ham, ud.hammer.rotation.x); }
          if (vmCheck) res.vm.push(vmCheck());
          T.stepFrame(dt);
          for (const b of before) if (liveOf(b.g.userData) < b.L) shotGun = b;
        }
        T.setMouseFireDbg(false);
        steps(2);
        if (!shotGun) { res.fails.push(label + ' pull ' + (k + 1) + ': no shot in 30 frames'); steps(40); continue; }
        const ud = shotGun.g.userData, firedIdx = shotGun.L - 1;
        const topAfter = topOf(shotGun.g, ud.cylinder, ud.chamberRounds);
        const turn = wrap(turnOf(ud.cylinder, ud.baseCylinderRot) - shotGun.t);
        res.turns.push(turn); res.tops.push(shotGun.top + '>' + topAfter); res.hammer.push(shotGun.ham);
        const good = shotGun.topLive && shotGun.top === firedIdx && topAfter === firedIdx && !ud.chamberNoses[firedIdx].visible && Math.abs(turn - 1) < 0.02 && shotGun.ham < -0.3;
        if (good) res.ok++; else res.fails.push(label + ' pull ' + (k + 1) + ': top before the break ' + shotGun.top + (shotGun.topLive ? ' (live)' : ' (not live)') + ', fired ' + firedIdx + ', top after ' + topAfter + ', turn ' + turn.toFixed(2) + ' chambers, hammer ' + (shotGun.ham != null ? shotGun.ham.toFixed(2) : '-'));
        steps(28);   // the gun ready again (0.45 s interval)
      }
      return res;
    };

    ok(await take('revolver'), 'the revolver in hand');
    // third person, one gun, six shots
    T.setViewFirstDbg && T.setViewFirstDbg(false); steps(10);
    T.setAmmoDbg('revolver', 6); T.setRevolverSpentDbg && T.setRevolverSpentDbg(0); steps(30);
    let r = pulls('third person', 6);
    ok(r.ok === 6, 'third person, six pulls: each brings a live chamber under the hammer by the break, fires it and leaves it there, one chamber (60 deg) a pull, the hammer up (' + r.ok + '/6; turns ' + r.turns.map((t) => t.toFixed(2)).join(' ') + '; top ' + r.tops.join(' ') + ')' + (r.fails.length ? ' ' + r.fails.join('; ') : ''));
    ok(r.turns.length === 6 && r.turns.every((t) => t > 0), 'the same way every time (' + r.turns.map((t) => (t > 0 ? '+' : '') + t.toFixed(2)).join(' ') + ')');
    // a dry pull: nothing turns, nothing fires
    {
      const ud = T.weaponMeshes.revolver.userData, t0 = turnOf(ud.cylinder, ud.baseCylinderRot), a0 = T.getAmmo().revolver;
      // (an empty gun starts its reload on the pull: the cylinder may swing out then, so read it up to that frame)
      let t1 = t0, fr = 0;
      T.setMouseFireDbg(true); for (; fr < 12 && !(T.isReloading && T.isReloading()); fr++) { T.stepFrame(dt); if (!(T.isReloading && T.isReloading())) t1 = turnOf(ud.cylinder, ud.baseCylinderRot); } T.setMouseFireDbg(false); steps(2);
      ok(a0 === 0 && T.getAmmo().revolver === 0 && Math.abs(wrap(t1 - t0)) < 0.02, 'a dry pull with no rounds: no shot and no turn (' + wrap(t1 - t0).toFixed(2) + ' chambers in ' + fr + ' frames' + (T.isReloading && T.isReloading() ? ', then the reload' : '') + ')');
      if (T.isReloading && T.isReloading()) { for (let i = 0; i < 600 && T.isReloading(); i++) T.stepFrame(dt); }
    }
    // a reload: no jump of the cylinder as it starts and as it ends
    {
      T.setAmmoDbg('revolver', 2); T.setRevolverSpentDbg && T.setRevolverSpentDbg(4); steps(20);
      const ud = T.weaponMeshes.revolver.userData;
      let prev = turnOf(ud.cylinder, ud.baseCylinderRot), worst = 0, worstAt = '', n = 0, seen = false;
      T.startReload();
      for (let i = 0; i < 600; i++) {
        T.stepFrame(dt); n++;
        const rel = T.isReloading ? T.isReloading() : true; if (rel) seen = true;
        const t = turnOf(ud.cylinder, ud.baseCylinderRot), d = Math.abs(wrap(t - prev)); prev = t;
        const R = T.getReloadDbg ? T.getReloadDbg() : null, u = R && R.anim ? 1 - R.timer / R.anim : null;
        // the swing's own load steps (0.28..0.78) turn a chamber in a few frames; a snap is a big turn in one frame
        if (d > worst) { worst = d; worstAt = 'frame ' + n + (u != null ? ' u ' + u.toFixed(2) : ''); }
        if (seen && !rel) { steps(10); const t2 = turnOf(ud.cylinder, ud.baseCylinderRot); const d2 = Math.abs(wrap(t2 - prev)); if (d2 > worst) { worst = d2; worstAt = 'after the reload'; } break; }
      }
      ok(seen && worst < 0.5, 'a revolver reload turns no more than half a chamber in a frame (worst ' + worst.toFixed(2) + ' at ' + worstAt + ')');
      const L = liveOf(ud), top = topOf(T.weaponMeshes.revolver, ud.cylinder, ud.chamberRounds);
      ok(L > 0 && top === L % 6, 'after it the chamber under the hammer is the one past the live ones (so the next pull brings live round ' + (L - 1) + ' up): top ' + top + ', live ' + L);
    }
    // first person: the view's cylinder is the world gun's, and the same six pulls
    if (T.setViewFirstDbg && T.viewmodelDbg) {
      T.setViewFirstDbg(true);
      await until(() => T.viewmodelDbg() && T.viewmodelDbg().info.active && T.viewmodelDbg().info.raise > 0.99, 8000);
      T.setAmmoDbg('revolver', 6); T.setRevolverSpentDbg && T.setRevolverSpentDbg(0); steps(30);
      const vmCheck = () => { const V = T.viewmodelDbg(), g = V && V.gun, w = T.weaponMeshes.revolver.userData.cylinder; if (!g || !g.cylinder) return null; return g.cylinder.quaternion.angleTo(w.quaternion); };
      r = pulls('first person', 6, vmCheck);
      const vmWorst = Math.max(0, ...r.vm.filter((x) => x != null));
      ok(r.ok === 6, 'first person, six pulls: the same (' + r.ok + '/6; turns ' + r.turns.map((t) => t.toFixed(2)).join(' ') + ')' + (r.fails.length ? ' ' + r.fails.join('; ') : ''));
      ok(r.vm.filter((x) => x != null).length > 20 && vmWorst < 0.02, 'the view\'s cylinder is the world gun\'s through every pull (worst ' + deg(vmWorst) + ' deg apart, ' + r.vm.length + ' frames)');
      T.setViewFirstDbg(false); steps(10);
    } else ok(false, 'the view hooks are there (setViewFirstDbg, viewmodelDbg)');
    // the pair: each gun turns on its own pull
    if (T.setDualOwnedDbg && T.toggleDualWieldDbg) {
      for (let i = 0; i < 900 && T.isReloading && T.isReloading(); i++) T.stepFrame(dt);
      T.setAmmoDbg('revolver', 6); T.setDualOwnedDbg('revolver', true); steps(5);
      const fitted = T.armoryDbg && T.armoryDbg.fit ? T.armoryDbg.fit('revolver', 'pair', true) : null; steps(5);
      const arm = T.armoryDbg && T.armoryDbg.ui ? T.armoryDbg.ui().armory : null, lo = arm ? arm.loadout() : null;
      if (arm && lo && !lo.secondary.includes('revolver')) {   // the pair is carried with the revolver itself in a secondary slot
        const st = arm.read(), free = st.slots.secondary.findIndex((g) => !g);
        if (!arm.has('revolver')) arm.buy({ id: 'revolver', kind: 'revolver', loaded: null }, { store: true });
        if (free >= 0) arm.take('revolver', 'secondary', free);
      }
      const lo2 = arm ? JSON.stringify(arm.loadout()) : '-';
      await take('revolver');
      for (let i = 0; i < 3 && !(T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible); i++) { T.toggleDualWieldDbg(); steps(30); await wait(100); }
      const O = T.offhandMeshes.revolver;
      if (O && O.visible) {
        T.setAmmoDbg('revolver', 12); T.setRevolverSpentDbg && T.setRevolverSpentDbg(0); steps(30);
        r = pulls('the pair', 6);
        ok(r.ok === 6, 'the pair, six pulls (three each): each gun indexes on its own pull (' + r.ok + '/6; top ' + r.tops.join(' ') + ')' + (r.fails.length ? ' ' + r.fails.join('; ') : ''));
        T.toggleDualWieldDbg(); steps(30);
      } else ok(false, 'the pair came up (offhand revolver ' + (O ? 'there, hidden' : 'missing') + '; reloading ' + (T.isReloading && T.isReloading()) + '; pair fitted ' + fitted + '; loadout ' + lo2 + ')');
    }

    // ---- the launcher
    ok(await take('launcher'), 'the launcher in hand');
    {
      const G = T.weaponMeshes.launcher, ud = G.userData;
      T.setAmmoDbg('launcher', 6); steps(30);
      const res = [], fails = [];
      for (let k = 0; k < 6; k++) {
        const L0 = T.getAmmo().launcher, t0 = turnOf(ud.drum, ud.baseDrumRot);
        const top0 = topOf(G, ud.drum, ud.drumRounds, 0.065);
        T.setMouseFireDbg(true); let f = 0; for (; f < 20 && T.getAmmo().launcher === L0; f++) T.stepFrame(dt); T.setMouseFireDbg(false);
        steps(30);   // the spring's turn, and the gun ready
        const L1 = T.getAmmo().launcher, top1 = topOf(G, ud.drum, ud.drumRounds, 0.065), turn = wrap(turnOf(ud.drum, ud.baseDrumRot) - t0);
        res.push(turn);
        const good = L1 === L0 - 1 && top0 === L0 - 1 && (L1 === 0 ? true : top1 === L1 - 1) && Math.abs(Math.abs(turn) - 1) < 0.02 && ud.drumRounds[L0 - 1].visible && !(ud.drumNoses && ud.drumNoses[L0 - 1] && ud.drumNoses[L0 - 1].visible) && !(ud.drumNoses && L1 > 0 && !ud.drumNoses[L1 - 1].visible);
        if (!good) fails.push('shot ' + (k + 1) + ': live ' + L0 + '>' + L1 + ', top ' + top0 + '>' + top1 + ', turn ' + turn.toFixed(2) + ', fired case shown ' + ud.drumRounds[L0 - 1].visible + (ud.drumNoses ? ', its round shown ' + ud.drumNoses[L0 - 1].visible : ''));
        steps(60);
      }
      ok(!fails.length, 'the launcher, six shots: the round behind the barrel fires and the spring turns the next live one up, one chamber a shot, the fired case left in its chamber (turns ' + res.map((t) => t.toFixed(2)).join(' ') + ')' + (fails.length ? ' ' + fails.join('; ') : ''));
      ok(res.length === 6 && res.every((t) => Math.sign(t) === Math.sign(res[0])), 'the drum turns the same way every time');
      // the reload: no jump as it starts or ends; the next live round behind the barrel after it
      T.setAmmoDbg('launcher', 2); steps(20);
      let prev = turnOf(ud.drum, ud.baseDrumRot), worst = 0, worstAt = '', seen = false;
      T.startReload();
      for (let i = 0; i < 900; i++) {
        T.stepFrame(dt);
        const rel = T.isReloading ? T.isReloading() : true; if (rel) seen = true;
        const t = turnOf(ud.drum, ud.baseDrumRot), d = Math.abs(wrap(t - prev)); prev = t;
        if (d > worst) { worst = d; worstAt = 'frame ' + i; }
        if (seen && !rel) { steps(10); const d2 = Math.abs(wrap(turnOf(ud.drum, ud.baseDrumRot) - prev)); if (d2 > worst) { worst = d2; worstAt = 'after the reload'; } break; }
      }
      const L = T.getAmmo().launcher, top = topOf(G, ud.drum, ud.drumRounds, 0.065);
      ok(seen && worst < 0.5, 'a launcher reload turns no more than half a chamber in a frame (worst ' + worst.toFixed(2) + ' at ' + worstAt + ')');
      ok(L > 0 && top === L - 1, 'after it the next live round is behind the barrel: top ' + top + ', live ' + L);
    }
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  finally { try { T.setMouseFireDbg(false); } catch (_) {} }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
