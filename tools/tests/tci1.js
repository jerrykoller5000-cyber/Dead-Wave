// tci1 - CI-1 (J151, D-179): Jerry's playtest notes on the heavy guns.
//  56 the launcher's crane: no part of the hinge passes through the drum, at any point of its swing.
//  55 the launcher's 40 mm flies faster (48 -> 60 m/s) and reaches as far as before.
//  38 the chainsaw's engine sound and chain wait until the start cord is fully pulled.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno + ' ' + String(e.error && e.error.stack || '').split('\n').slice(1, 3).join(' ')));
  try {
    const THREE = T.THREE;
    // ---- 56: the crane ----------------------------------------------------------------------------------------------
    {
      const gun = T.weaponMeshes && T.weaponMeshes.launcher, ud = gun && gun.userData;
      ok(!!(ud && ud.drumHinge && ud.drum), 'launcher has its drum hinge and drum');
      const DRUM_R = 0.112, DRUM_HALF = 0.0665, EPS = 0.001;   // the six-chamber drum and its face rings (studio/weapon-heavy.js)
      const inv = new THREE.Matrix4(), m = new THREE.Matrix4(), p = new THREE.Vector3();
      // Points of a mesh to test: every vertex, every edge midpoint and every face centre.
      const pointsOf = (mesh) => {
        const g = mesh.geometry, pos = g.attributes.position, idx = g.index, pts = [];
        const tri = (a, b, c) => {
          const A = new THREE.Vector3().fromBufferAttribute(pos, a), B = new THREE.Vector3().fromBufferAttribute(pos, b), C = new THREE.Vector3().fromBufferAttribute(pos, c);
          pts.push(A, B, C, A.clone().add(B).multiplyScalar(.5), B.clone().add(C).multiplyScalar(.5), C.clone().add(A).multiplyScalar(.5), A.clone().add(B).add(C).multiplyScalar(1 / 3));
        };
        if (idx) for (let i = 0; i < idx.count; i += 3) tri(idx.getX(i), idx.getX(i + 1), idx.getX(i + 2));
        else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
        return pts;
      };
      // How many points of `mesh` (its matrix relative to `frame`) lie inside the drum (in `frame`, drum matrix drumM).
      const inside = (mesh, toDrum) => {
        let n = 0;
        for (const q of pointsOf(mesh)) {
          p.copy(q).applyMatrix4(toDrum);
          if (Math.abs(p.z) < DRUM_HALF - EPS && Math.hypot(p.x, p.y) < DRUM_R - EPS) n++;
        }
        return n;
      };
      const isUnder = (o, root) => { for (let a = o; a; a = a.parent) if (a === root) return true; return false; };
      if (ud && ud.drumHinge && ud.drum) {
        const hinge = ud.drumHinge, drum = ud.drum, rz = hinge.rotation.z;
        // (a) the swinging parts (in drumHinge, not in the drum): they move with the drum, so one pose says it all.
        const moving = [];
        hinge.traverse((o) => { if (o.isMesh && !isUnder(o, drum)) moving.push(o); });
        hinge.updateMatrixWorld(true);
        const hingeToDrum = inv.copy(drum.matrix).invert();   // drum.matrix: drum in hinge space
        let worstMoving = 0;
        for (const o of moving) {
          m.copy(hingeToDrum);
          const chain = []; for (let a = o; a && a !== hinge; a = a.parent) chain.unshift(a);
          for (const a of chain) m.multiply(a.matrix);
          worstMoving = Math.max(worstMoving, inside(o, m));
        }
        ok(moving.length > 0 && worstMoving === 0, 'note 56: the crane\'s ' + moving.length + ' swinging parts stay out of the drum (worst part: ' + worstMoving + ' points inside)');
        // (b) the fixed parts (lugs, knuckles, pin) against the drum at every point of the swing.
        const fixed = ud.hingeFixed || [];
        ok(fixed.length >= 4, 'note 56: the hinge names its fixed lugs, knuckles and pin (' + fixed.length + ')');
        let worstFixed = 0, at = -1;
        for (const s of [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]) {
          hinge.rotation.z = -Math.PI * s; hinge.updateMatrix();
          const gunToDrum = new THREE.Matrix4().multiplyMatrices(hinge.matrix, drum.matrix).invert();
          for (const o of fixed) {
            const n = inside(o, new THREE.Matrix4().multiplyMatrices(gunToDrum, o.matrix));
            if (n > worstFixed) { worstFixed = n; at = s; }
          }
        }
        hinge.rotation.z = rz; hinge.updateMatrix();
        ok(fixed.length > 0 && worstFixed === 0, 'note 56: no fixed hinge part inside the drum anywhere in the swing (worst ' + worstFixed + (at >= 0 ? ' at open ' + at : '') + ')');
        // (c) the swing itself is the same: one pivot, the drum's centre 140 mm from the pin, turned by rotation.z.
        ok(Math.abs(hinge.position.x + 0.14) < 1e-6 && Math.abs(hinge.position.y + 0.02) < 1e-6 && Math.abs(hinge.position.z - 0.12) < 1e-6 && Math.abs(drum.position.x - 0.14) < 1e-6,
          'note 56: the reload\'s pivot and drum offset unchanged (hinge ' + hinge.position.toArray().map((v) => v.toFixed(3)) + ', drum x ' + drum.position.x.toFixed(3) + ')');
      }
    }
    // ---- 55: the 40 mm's speed --------------------------------------------------------------------------------------
    {
      const st = T.WEAPON_STATS && T.WEAPON_STATS.launcher;
      ok(!!st && st.speed >= 58 && st.speed <= 64, 'note 55: the 40 mm flies at ' + (st && st.speed) + ' m/s (was 48)');
      const life = st && (st.fuse > 0 ? st.fuse : Math.min(2.5, Math.max(0.15, st.range / st.speed)));
      ok(!!st && st.range === 62 && Math.abs(st.speed * life - 62) < 0.01, 'note 55: its reach is the same 62 m (' + (st && (st.speed * life).toFixed(2)) + ' m)');
    }
    // ---- 38: the engine and the chain wait for the full pull ---------------------------------------------------------
    {
      await startMatch(T, 'Saw start');
      T.clearZombies && T.clearZombies();
      T.skipGrace && T.skipGrace();
      T.setHp && T.setHp(1e6);
      const A = T.AudioSys, orig = A.chainsawEngine;
      let firstOn = null, calls = 0;
      A.chainsawEngine = function (on) { calls++; if (on && !firstOn && T.sawStartDbg) firstOn = T.sawStartDbg(); return orig.apply(this, arguments); };
      try {
        T.grantWeaponDbg ? T.grantWeaponDbg('chainsaw') : (T.getWeaponOwned().chainsaw = true);
        const WO = T.WEAPON_ORDER || [];
        T.setWeapon(WO.indexOf('chainsaw'));
        const gun = T.weaponMeshes.chainsaw;
        const PULL = 0.48;   // game/chainsaw-animation.js SAW_START.pull: the cord at full length
        let movedEarly = 0, samples = 0, sawStarting = false, ph0 = null, earlyFumes = 0;
        const seen = new Set(T.smokePuffs || []);
        const nearPale = () => { let k = 0; const p = T.player.position; for (const f of T.smokePuffs || []) { if (seen.has(f)) continue; seen.add(f); if (f.tone === 'grey' && Math.hypot(f.x - p.x, f.z - p.z) < 3) k++; } return k; };
        const w0 = Date.now();
        while (Date.now() - w0 < 60000) {
          const s = T.sawStartDbg();
          if (s.phase === 'starting') {
            sawStarting = true;
            if (ph0 === null) ph0 = gun.userData.chainPhase || 0;
            if (s.t < PULL - 0.02) { samples++; earlyFumes += nearPale(); if (Math.abs((gun.userData.chainPhase || 0) - ph0) > 1e-9) movedEarly++; }
          }
          if (s.phase === 'ready') break;
          await wait(8);
        }
        ok(sawStarting && T.sawStartDbg().phase === 'ready', 'note 38: the saw went through its pull to ready (' + T.sawStartDbg().phase + ')');
        ok(samples > 0 && movedEarly === 0, 'note 38: the chain stays still while the cord is still being pulled (' + movedEarly + ' of ' + samples + ' frames moved)');
        ok(!!firstOn && (firstOn.phase === 'ready' || firstOn.t >= PULL - 1e-6), 'note 38: the engine sound starts at the full pull, not before (first on at ' + (firstOn ? firstOn.phase + ' t ' + firstOn.t.toFixed(3) : 'never') + ', pull ' + PULL + ')');
        await wait(300);
        ok(!!firstOn && calls > 0, 'note 38: and it runs once started (' + calls + ' engine calls)');
        // ---- 35: the exhaust fumes while it runs ------------------------------------------------------------------------
        ok(earlyFumes === 0, 'note 35: no fumes before the engine catches (' + earlyFumes + ')');
        nearPale();
        let idleFumes = 0; const gt0 = T.getSimTime(); while (T.getSimTime() - gt0 < 1.5) { await wait(30); idleFumes += nearPale(); }
        ok(idleFumes >= 4, 'note 35: fumes from the muffler while it idles (' + idleFumes + ' puffs in 1.5 s of game time)');
        T.setMouseFireDbg(true);
        let revFumes = 0; const gt1 = T.getSimTime(); while (T.getSimTime() - gt1 < 1.5) { await wait(30); revFumes += nearPale(); }
        T.setMouseFireDbg(false);
        ok(revFumes > idleFumes, 'note 35: more on the throttle (' + revFumes + ' puffs in 1.5 s)');
        await wait(400);
        // ---- 36: the running chain's look: a steady forward step the eye can follow, under the blur band ----------------
        const n = gun.userData.chainTeeth.length, blur = gun.userData.chainBlur;
        ok(!!blur && !blur.visible, 'note 36: the blur band is off while the saw idles (' + (blur ? blur.visible : 'none') + ')');
        T.setMouseFireDbg(true);
        await wait(250);
        const steps = [], vis = [];
        let last = gun.userData.chainPhase;
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          const ph = gun.userData.chainPhase;
          if (ph !== last) { const d = (((ph - last) * n) % 1 + 1) % 1; steps.push(d); vis.push(blur && blur.visible); last = ph; }
        }
        T.setMouseFireDbg(false);
        // The shown step no longer depends on the frame rate (it was the fraction of dt * 28 rad/s in links, 0.12 at 60 Hz).
        const bad = steps.filter((d) => Math.abs(d - 0.4) > 0.02).length;
        ok(steps.length >= 5 && bad === 0, 'note 36: each frame the running chain shows the same forward step of 0.4 link, whatever the frame rate (' + steps.length + ' frames, ' + bad + ' outside; e.g. ' + steps.slice(0, 4).map((d) => d.toFixed(2)).join(', ') + ')');
        ok(vis.length > 0 && vis.every(Boolean), 'note 36: the blur band shows while it runs (' + vis.filter(Boolean).length + '/' + vis.length + ')');
        // ---- 33: the throttle with nothing in the chain: Jerry's full-throttle take, not the idle sped up ----------------
        {
          const beds = () => (T.AudioSys.takeBedsDbg ? T.AudioSys.takeBedsDbg() : []);
          // The suite's page never unlocks the audio, so Jerry's takes are not listed until asked: list and load the saw's.
          try { if (T.AudioSys.takesInit) await T.AudioSys.takesInit(); } catch (_) {}
          if (T.AudioSys.takesPreload) T.AudioSys.takesPreload(['weapon-foley/chainsaw-idle', 'weapon-foley/chainsaw-rev']);
          await wait(2500);
          const audio = T.AudioSys.takesState ? T.AudioSys.takesState() : null;
          T.clearZombies && T.clearZombies();
          T.setMouseFireDbg(true);
          let rev = null; const r0 = Date.now();
          while (Date.now() - r0 < 4000) { await wait(60); rev = beds().find((b) => b.key === 'sawRev'); if (rev && rev.level > 0.2) break; }
          const idle = beds().find((b) => b.key === 'saw');
          T.setMouseFireDbg(false);
          const ts = audio ? JSON.stringify(audio).slice(0, 400) : 'none';
          if (audio && audio.listed && !audio.listed.takes) out.push('INFO note 33: Jerry\'s takes are not listed on this page (' + ts.slice(0, 80) + '): the beds cannot start here; see the handoff for the proof on the game page');
          else ok(!!rev && rev.id === 'weapon-foley/chainsaw-rev' && rev.level > 0.2, 'note 33: on the throttle with no contact the full-throttle take plays (' + JSON.stringify(rev) + '; idle ' + JSON.stringify(idle) + '; muted ' + (T.AudioSys.isMuted && T.AudioSys.isMuted()) + '; beds ' + JSON.stringify(beds()) + '; takes ' + ts + ')');
          let after = null; const r1 = Date.now();
          while (Date.now() - r1 < 3000) { await wait(60); after = beds().find((b) => b.key === 'sawRev'); if (!after || after.level < 0.05) break; }
          if (audio && audio.listed && audio.listed.takes) ok(!after || after.level < 0.05, 'note 33: and fades when the trigger is let go (' + JSON.stringify(after) + ')');
        }
        await wait(400);
        ok(!!blur && !blur.visible, 'note 36: and goes when the trigger is let go (' + (blur ? blur.visible : 'none') + ')');
      } finally { A.chainsawEngine = orig; }
    }
    // ---- 50 / 52: the flamer's gauge reads the tank; tritium strokes; the tank takes the coat ---------------------------
    {
      const gun = T.weaponMeshes.flamer, ud = gun && gun.userData;
      ok(!!(ud && ud.setFuelGauge && ud.fuelNeedle), 'note 50: the flamer has a working fuel gauge (setFuelGauge, fuelNeedle)');
      if (ud && ud.setFuelGauge) {
        T.grantWeaponDbg ? T.grantWeaponDbg('flamer') : (T.getWeaponOwned().flamer = true);
        T.setWeapon((T.WEAPON_ORDER || []).indexOf('flamer'));
        await wait(600);
        const A = T.getAmmo(), full = A.flamer;
        const readAt = async (n) => { A.flamer = n; const g0 = T.getSimTime(); while (T.getSimTime() - g0 < 1.2) await wait(30); return ud.fuelNeedle.rotation.z; };
        const rFull = await readAt(full), rHalf = await readAt(Math.round(full / 2)), rEmpty = await readAt(0);
        A.flamer = full;
        ok(Math.abs(rFull - ud.gaugeFull) < 0.05 && Math.abs(rHalf - (ud.gaugeFull + ud.gaugeEmpty) / 2) < 0.08 && Math.abs(rEmpty - ud.gaugeEmpty) < 0.05,
          'note 50: the needle reads full / half / empty (' + [rFull, rHalf, rEmpty].map((v) => v.toFixed(2)).join(' / ') + ' rad; full ' + ud.gaugeFull.toFixed(2) + ', empty ' + ud.gaugeEmpty.toFixed(2) + ')');
      }
      // ---- 51: the flame stream: no two tongues one stamp, the fire flickers, black soot rolls off it ----------------
      {
        const D = T.flameDbg, seenSoot = new Set(T.smokePuffs || []);
        T.clearZombies && T.clearZombies();
        T.setMouseFireDbg(true);
        const flips = new Set(), aspects = [], tints = new Set(); let soot = 0;
        const g0 = T.getSimTime();
        while (T.getSimTime() - g0 < 2.0) {
          await wait(40);
          for (const p of D.particles()) { if (p.flip) flips.add(p.flip); if (p.aspect) aspects.push(p.aspect); }
          for (const st of D.stages) tints.add(st[1].color.r.toFixed(3));
          for (const f of T.smokePuffs || []) { if (seenSoot.has(f)) continue; seenSoot.add(f); if (f.tone === 'dark') soot++; }
        }
        T.setMouseFireDbg(false);
        const spread = aspects.length ? Math.max(...aspects) - Math.min(...aspects) : 0;
        ok(flips.size === 2 && spread > 0.2, 'note 51: the tongues are mirrored and squashed blob to blob (flips ' + [...flips].join(',') + ', aspect spread ' + spread.toFixed(2) + ' over ' + aspects.length + ')');
        ok(tints.size >= 4, 'note 51: the flame stages flicker (' + tints.size + ' brightness levels seen)');
        ok(soot >= 2, 'note 51: black soot rolls up off the burning stream (' + soot + ' puffs in 2 s)');
        await wait(1500);
      }
      let tritium = 0, tankRole = 0, redLeft = 0;
      gun.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (m && m.emissive && m.emissive.getHex() && /tritium/.test(m.name || '')) tritium++;
        if (m && m.userData && m.userData.weaponFinishRole === 'tank') tankRole++;
        if (m && /flamer red enamel/.test(m.name || '') && !(m.userData && m.userData.weaponFinishRole)) redLeft++;
      });
      ok(tritium >= 1, 'note 50: the dial strokes and needle are tritium (' + tritium + ' self-lit meshes)');
      ok(tankRole >= 1 && redLeft === 0, 'note 52: the tank shells take the coat (' + tankRole + ' meshes with the tank role, ' + redLeft + ' unpaintable red left)');
    }
    // ---- 60: the Watchman's sight line for first person -------------------------------------------------------------
    {
      const bd = T.spawnBuild && T.spawnBuild('m240', T.player.position.x + 6, T.player.position.z + 6);
      let eye = null, front = null, post = null;
      if (bd && bd.mesh) bd.mesh.traverse((o) => { if (o.userData && o.userData.sightEye) { eye = o.userData.sightEye; front = o.userData.sightFront; } if (o.name === 'm240-front-sight') post = o; });
      ok(!!(eye && front && post), 'note 60: the Watchman has a front sight and its sight line (eye ' + !!eye + ', front ' + !!front + ', post ' + !!post + ')');
      if (eye && front) {
        ok(Math.abs(eye.position.y - front.position.y) < 1e-6 && Math.abs(eye.position.x - front.position.x) < 1e-6 && front.position.z - eye.position.z > 0.6,
          'note 60: the sight line runs parallel to the bore, ' + (front.position.z - eye.position.z).toFixed(3) + ' m eye to post');
        let postTop = -Infinity;
        post.updateWorldMatrix(true, true);
        const inv = new T.THREE.Matrix4().copy(eye.parent.matrixWorld).invert(), v = new T.THREE.Vector3();
        post.traverse((o) => { if (!o.isMesh) return; const pos = o.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv); if (Math.abs(v.x) < 0.003) postTop = Math.max(postTop, v.y); } });
        ok(Math.abs(postTop - front.position.y) < 0.004, 'note 60: the front post\'s top is on the sight line (' + postTop.toFixed(4) + ' vs ' + front.position.y.toFixed(4) + ')');
      }
    }
    // ---- 60: manning the Watchman in first person: the eye at the sights, the gun swings onto the view ----------------
    {
      T.setWeapon((T.WEAPON_ORDER || []).indexOf('pistol'));
      await wait(300);
      const P = T.player.position;
      const mg = T.spawnBuild('m240', P.x, P.z + 1.2), mo = T.spawnBuild('mortar', P.x + 1.6, P.z - 0.4);
      if (mg && mg.mesh) mg.mesh.rotation.y = 0;
      T.setViewFirstDbg(true);
      await wait(800);
      const mounted = T.mountMortar(mg);
      let on = false; const w0 = Date.now();
      while (Date.now() - w0 < 6000) { await wait(60); const o = T.otsDbg(); if (o.on && o.w > 0.98) { on = true; break; } }
      ok(mounted && on, 'note 60: manning the Watchman stays in first person (mounted ' + mounted + ', ots ' + JSON.stringify(T.otsDbg()) + ')');
      let eye = null, front = null, gunner = null;
      mg.mesh.traverse((o) => { if (o.userData && o.userData.sightEye) { eye = o.userData.sightEye; front = o.userData.sightFront; gunner = o.userData.gunnerEye; } });
      const V = T.THREE.Vector3, ew = new V(), fw = new V(), gw = new V();
      // Look 25 degrees left of the gun and a little up; the gun follows and its front post comes to the view's centre.
      T.setOtsAimDbg(0.44, -0.08);
      const s0 = T.getSimTime(); while (T.getSimTime() - s0 < 2.5) await wait(40);
      eye.getWorldPosition(ew); front.getWorldPosition(fw); gunner.getWorldPosition(gw);
      const camDist = T.camera.position.distanceTo(gw);
      ok(camDist < 0.03, 'note 60: the camera is at the gunner\'s eye over the ACOG (' + (camDist * 100).toFixed(1) + ' cm off)');
      ok(mg._fade == null || mg._fade > 0.99, 'note 60: the manned gun is drawn solid in first person, not faded as if it hid him (fade ' + mg._fade + ')');
      const sightDir = fw.clone().sub(ew).normalize(), o = T.otsDbg();
      const viewDir = new V(Math.sin(o.yaw) * Math.cos(o.pitch), Math.sin(o.pitch), Math.cos(o.yaw) * Math.cos(o.pitch));
      const off = Math.acos(Math.max(-1, Math.min(1, sightDir.dot(viewDir)))) * 180 / Math.PI;
      ok(off < 4, 'note 60: the gun swung onto the view, its sight line within ' + off.toFixed(1) + ' degrees of where he looks (view yaw ' + o.yaw.toFixed(2) + ', gun yaw ' + (mg.watchman && mg.watchman.yaw.toFixed(2)) + '; the rest is the aim point\'s parallax)');
      T.dismountMortar ? T.dismountMortar() : (T.keyPressDbg && T.keyPressDbg('KeyE'));
      await wait(600);
      const mortarMounted = T.mountMortar(mo);
      let offMortar = true; const w1 = Date.now();
      while (Date.now() - w1 < 2500) { await wait(60); if (T.otsDbg().on) offMortar = false; }
      ok(mortarMounted && offMortar, 'note 60: the mortar keeps its third-person view (mounted ' + mortarMounted + ', ots on ' + !offMortar + ')');
      T.dismountMortar && T.dismountMortar();
      T.setViewFirstDbg(false);
      await wait(400);
    }
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 1).join('').slice(0, 300) + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
