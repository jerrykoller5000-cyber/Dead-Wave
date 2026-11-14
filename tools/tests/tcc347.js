// tcc347 - CC-347 (J151 note 8, Jerry 13 Nov; J142's picture 12 Nov): no carry gear on him without its gun. A fresh entry
//  into the Training Ground runs the blackout warm-up, which dresses the carry rig in a stand-in plan (shotgun and launcher
//  slung, both bands, every holster, the akimbo pair and the right-hip pair shell) and then puts his own loadout back. Its
//  visibility restore used to run AFTER that, so the stand-in's straps, bands and empty shells came back on him with no guns
//  in them (the "cage of straps with wheels hanging off his side"). Checks, third person, without re-applying the plan first:
//  (1) after the warm-up every shown sling strap has its gun, and no band, holster, pair, hip pair or harness shows that the
//  plan doesn't call for; (2) the same through loadout x gun-in-hand x vest overrides; (3) when something flips a rig part's
//  visibility behind the plan's back, the next carry refresh (0.2 s) puts it right.
//  Part 2 (the real gear seated, J151 note 8: "holsters and gear hang, floaty and not properly secured"), loadout x plate
//  carrier on/off, measured to his posed triangles: (4) every handgun holster's shell that reaches below the pack (y .93) rests
//  against him: its nearest point within 2.5 cm and its lowest third within 4 cm of his body or kit (the low pack holster hung
//  12+ cm behind his seat; the upper row on the pack's face is CL-160's, unchanged);
//  (5) every slung gun's strap lies on him along its path over his body (from under the arm round the chest to the shoulder's
//  top): within 4 cm (it stood 6-12 cm off his side, looped round the front of the arm and went through the deltoid); (6) walking, running, crouching, aiming and jumping, no leg (trouser leg, seat,
//  boot, pad) inside a holster shell that rides his hips.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await wait(100); } return false; };
  const sim = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < 60000) await wait(40); };
  try {
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'CC-347';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active && T.getPhase() === 'prep', 120000), 'the Training Ground starts');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 120000), 'its blackout (the warm-up) lifts');
    await sim(0.6);
    T.setViewFirstDbg(false);
    const M = T.getMarine(), rig = M.userData.carry;
    ok(!!rig, 'the carry rig is built');
    const vis = (o) => { for (let q = o; q && q !== M; q = q.parent) if (!q.visible) return false; return !!o; };
    const strays = (plan) => {
      const s = [];
      rig.slings.forEach((x, i) => { if (vis(x.sling) && !x.gun) s.push('sling strap ' + i + ' without its gun'); if (x.gun && !plan.primary[i]) s.push('sling ' + i + ' holds a ' + x.kind + ' the plan does not'); });
      if (vis(rig.bandolier) && !plan.bandolier) s.push('shell bandolier'); if (vis(rig.belt40) && !plan.belt40) s.push('40 mm belt');
      rig.holsters.forEach((h, i) => { if (vis(h.g) && !plan.holsterOn[i]) s.push('holster ' + i); });
      rig.pairs.forEach((h, i) => { if (vis(h.g) && !plan.pairOn[i]) s.push('pair holster ' + i); });
      if (vis(rig.hipPair.g) && !plan.hipPairOn) s.push('right-hip pair shell');
      if (vis(rig.harness) && !plan.holsterOn.some(Boolean)) s.push('holster harness');
      for (const [k, m] of [['mags', rig.mags], ['grenades', rig.grenades], ['shells', rig.shells], ['rounds40', rig.rounds40], ['boxes', rig.boxes], ['tanks', rig.tanks]])
        if (vis(m) && !(plan[k] > 0)) s.push(k + ' row');
      return s;
    };
    // (1) the fresh entry, as the game left it
    const plan0 = JSON.parse(rig.sig);
    const s0 = strays(plan0);
    ok(s0.length === 0, 'after the warm-up nothing shows on him that his loadout does not carry' + (s0.length ? ': ' + s0.join(', ') : ''));
    // (2) loadouts, gun in hand, vest
    const CONFIGS = [
      { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: 'pistol', akimbo: false, vest: true, grenades: 3 },
      { loadout: { primary: ['minigun', 'flamer'], secondary: ['pistol', 'revolver'] }, inHand: 'm4', akimbo: false, vest: false, grenades: 0 },
      { loadout: { primary: ['sniper', 'launcher'], secondary: ['uzi', null] }, inHand: 'sniper', akimbo: false, vest: false, grenades: 2 },
      { loadout: { primary: ['aa12', 'chainsaw'], secondary: ['pistol', 'uzi'] }, inHand: 'pistol', akimbo: true, vest: true, grenades: 3, dualOwned: { pistol: true, uzi: true } },
      { loadout: { primary: [null, null], secondary: [null, null] }, inHand: null, akimbo: false, vest: false, grenades: 0 },
    ];
    for (const C of CONFIGS) {
      const d = T.carryDbg(C), s = strays(d.plan);
      ok(s.length === 0, 'loadout ' + C.loadout.primary.join('/') + ' + ' + C.loadout.secondary.join('/') + ', ' + (C.inHand || 'unarmed') + (C.vest ? ', vest' : '') + ': every strap with its gun, nothing extra' + (s.length ? ': ' + s.join(', ') : ''));
    }
    // (3) a warm-up (or anything) flipping the rig behind the plan's back is put right at the next refresh
    T.carryDbg(CONFIGS[4]); await sim(0.5);   // the game's own plan back
    const plan1 = JSON.parse(rig.sig);
    rig.bandolier.visible = true; rig.hipPair.g.visible = true; rig.slings[0].sling.visible = true;
    await sim(0.6);
    const s1 = strays(plan1);
    ok(s1.length === 0, 'flipped on behind the plan (bandolier, hip pair shell, a strap), the next refresh hides them again' + (s1.length ? ': ' + s1.join(', ') : ''));
    // (4)-(6) the gear seated on him
    const THREE = T.THREE, V3 = () => new THREE.Vector3();
    const step = (n) => { for (let i = 0; i < n; i++) T.stepFrame(1 / 30); };
    const ALL = { revolver: true, uzi: true, pistol: true };
    const SEAT = [
      { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, dualOwned: ALL },
      { loadout: { primary: ['minigun', 'flamer'], secondary: ['pistol', 'revolver'] }, dualOwned: {} },
      { loadout: { primary: ['sniper', 'launcher'], secondary: ['revolver', null] }, dualOwned: {} },
      { loadout: { primary: ['ak', 'aa12'], secondary: ['pistol', null] }, dualOwned: { pistol: true } },
      { loadout: { primary: ['chainsaw', 'flamer'], secondary: ['uzi', 'revolver'] }, dualOwned: ALL },
      { loadout: { primary: ['m4', 'ak'], secondary: ['pistol', 'pistol'] }, dualOwned: {} },
    ];
    const gear = T.getGearOwned ? T.getGearOwned() : null, vest0 = gear ? !!gear.vest : false;
    const setVest = (on) => { if (gear && !!gear.vest !== on) { gear.vest = on; T.applyGearVisibility && T.applyGearVisibility(); } };
    // his body and kit (no carry mount, not the gun in his hands) as posed triangles on a 3 cm grid, in his own frame
    const bodyGrid = () => {
      M.updateMatrixWorld(true);
      const skip = new Set(), inv = M.matrixWorld.clone().invert(), v = new THREE.Vector3(), H = new Map(), C = 0.03, TR = [];
      for (const r of [...rig.slings.map((x) => x.g), ...rig.holsters.map((x) => x.g), ...rig.pairs.map((x) => x.g), rig.hip.g, rig.hipPair.g, rig.harness, rig.bandolier, rig.belt40]) if (r) r.traverse((o) => skip.add(o));
      if (M.userData.weaponMount) M.userData.weaponMount.traverse((o) => skip.add(o));
      M.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || skip.has(o) || !vis(o) || o.name === 'marine-shadow') return; const mt = Array.isArray(o.material) ? o.material[0] : o.material; if (mt && (mt.visible === false || (mt.transparent && mt.opacity < 0.05))) return;
        const g = o.geometry, pa = g && g.attributes.position; if (!pa) return; const W = new Float32Array(pa.count * 3);
        for (let i = 0; i < pa.count; i++) { if (o.isSkinnedMesh && o.getVertexPosition) o.getVertexPosition(i, v); else v.fromBufferAttribute(pa, i); v.applyMatrix4(o.matrixWorld).applyMatrix4(inv); W[i * 3] = v.x; W[i * 3 + 1] = v.y; W[i * 3 + 2] = v.z; }
        const idx = g.index ? g.index.array : null, n = idx ? idx.length : pa.count;
        for (let i = 0; i + 2 < n; i += 3) { const a = idx ? idx[i] : i, b = idx ? idx[i + 1] : i + 1, c = idx ? idx[i + 2] : i + 2, t = TR.length / 9;
          TR.push(W[a * 3], W[a * 3 + 1], W[a * 3 + 2], W[b * 3], W[b * 3 + 1], W[b * 3 + 2], W[c * 3], W[c * 3 + 1], W[c * 3 + 2]);
          const k = t * 9, lo = [0, 1, 2].map((d) => Math.floor(Math.min(TR[k + d], TR[k + 3 + d], TR[k + 6 + d]) / C)), hi = [0, 1, 2].map((d) => Math.floor(Math.max(TR[k + d], TR[k + 3 + d], TR[k + 6 + d]) / C));
          if ((hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1) > 400) continue;
          for (let x = lo[0]; x <= hi[0]; x++) for (let y = lo[1]; y <= hi[1]; y++) for (let z = lo[2]; z <= hi[2]; z++) { const key = x + ',' + y + ',' + z; let l = H.get(key); if (!l) H.set(key, l = []); l.push(t); } } });
      const dTri = (k, px, py, pz) => {   // point to triangle (Ericson)
        const ax = TR[k], ay = TR[k + 1], az = TR[k + 2], abx = TR[k + 3] - ax, aby = TR[k + 4] - ay, abz = TR[k + 5] - az, acx = TR[k + 6] - ax, acy = TR[k + 7] - ay, acz = TR[k + 8] - az, apx = px - ax, apy = py - ay, apz = pz - az;
        const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz; if (d1 <= 0 && d2 <= 0) return Math.hypot(apx, apy, apz);
        const bpx = px - TR[k + 3], bpy = py - TR[k + 4], bpz = pz - TR[k + 5], d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz; if (d3 >= 0 && d4 <= d3) return Math.hypot(bpx, bpy, bpz);
        const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return Math.hypot(apx - t * abx, apy - t * aby, apz - t * abz); }
        const cpx = px - TR[k + 6], cpy = py - TR[k + 7], cpz = pz - TR[k + 8], d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz; if (d6 >= 0 && d5 <= d6) return Math.hypot(cpx, cpy, cpz);
        const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return Math.hypot(apx - t * acx, apy - t * acy, apz - t * acz); }
        const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return Math.hypot(bpx - t * (TR[k + 6] - TR[k + 3]), bpy - t * (TR[k + 7] - TR[k + 4]), bpz - t * (TR[k + 8] - TR[k + 5])); }
        const den = 1 / (va + vb + vc), s = vb * den, w = vc * den; return Math.hypot(apx - abx * s - acx * w, apy - aby * s - acy * w, apz - abz * s - acz * w); };
      const stamp = new Uint32Array(TR.length / 9); let gen = 0;
      return { inv, tris: TR.length / 9, near: (p, R = 0.1) => { let best = R; gen++; const n = Math.ceil(R / C), cx = Math.floor(p.x / C), cy = Math.floor(p.y / C), cz = Math.floor(p.z / C);
        for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) for (let dz = -n; dz <= n; dz++) { const l = H.get((cx + dx) + ',' + (cy + dy) + ',' + (cz + dz)); if (!l) continue;
          for (const t of l) { if (stamp[t] === gen) continue; stamp[t] = gen; const d = dTri(t * 9, p.x, p.y, p.z); if (d < best) best = d; } }
        return best; } };
    };
    const ptsOf = (root, inv, max = 400) => { const out = [], v = V3(); root.updateMatrixWorld(true); root.traverse((o) => { if (!o.isMesh || !vis(o)) return; const pa = o.geometry && o.geometry.attributes.position; if (!pa) return; const st = Math.max(1, Math.floor(pa.count / max)); for (let i = 0; i < pa.count; i += st) out.push(v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld).applyMatrix4(inv).clone()); }); return out; };
    const tag = (C, vest) => C.loadout.primary.join('/') + ' + ' + C.loadout.secondary.map((k) => k || '-').join('/') + (vest ? ', plate carrier' : ', shirt');
    for (const vest of [false, true]) {
      setVest(vest); step(2);
      for (const C of SEAT) {
        T.carryDbg({ ...C, inHand: null, akimbo: false, vest, grenades: 4 }); rig.t = 1e6;
        const B = bodyGrid();
        // (4) handgun shells: the lowest third of each against him
        const loose = [];
        for (const [k, sp] of [['hip', rig.hip], ['hip pair', rig.hipPair], ...rig.holsters.map((x, i) => ['holster ' + i, x]), ...rig.pairs.map((x, i) => ['pair ' + i, x])]) {   // CC-350: + the base pistol and its pair
          if (!vis(sp.g) || !sp.shell || !vis(sp.shell) || (sp.kind || sp.fitKind) === 'uzi') continue;
          const P = ptsOf(sp.shell, B.inv, 300).sort((a, b) => a.y - b.y), low = P.slice(0, Math.max(1, Math.floor(P.length / 3)));
          if (!P.length || P[0].y >= 0.93) continue;   // on the pack's face (it ends at y .93): the upper row, as accepted (CL-160)
          let d = 1, dn = 1; for (const p of low) d = Math.min(d, B.near(p, 0.12)); for (const p of P) dn = Math.min(dn, B.near(p, 0.12));
          if (dn > 0.025 || d > 0.04) loose.push(k + ' (' + (sp.kind || sp.fitKind) + ') nearest ' + (dn >= 0.12 ? '12+' : (dn * 100).toFixed(1)) + ' cm, lowest third ' + (d >= 0.12 ? '12+' : (d * 100).toFixed(1)) + ' cm');
        }
        ok(loose.length === 0, 'holsters seated, ' + tag(C, vest) + ': every handgun shell that reaches below his pack against him (nearest point <= 2.5 cm, its lowest third <= 4 cm: the seat and the pack round away under them)' + (loose.length ? ': ' + loose.join(', ') : ''));
        // (5) straps on him: the strap's own path over his body (fitWeaponSling's fit.body, from his side under the arm round the
        // chest to the top of the shoulder), every strap vertex within 4 cm of that path measured to his body, kit or arm
        const off = [];
        const segD = (p, a, b) => { const ab = b.clone().sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / Math.max(1e-9, ab.lengthSq()))); return p.distanceTo(a.clone().addScaledVector(ab, t)); };
        rig.slings.forEach((s, i) => {
          if (!s.gun || !vis(s.sling)) return;
          const path = s.sling.userData.fit && s.sling.userData.fit.body;
          if (!path || path.length < 3) { off.push('strap ' + i + ' (' + s.kind + ') has no path over his body recorded'); return; }
          s.sling.updateMatrixWorld(true);
          const L = path.slice(1).map((q) => new THREE.Vector3(...q).applyMatrix4(s.sling.matrixWorld).applyMatrix4(B.inv));
          let worst = 0, n = 0; const pa = s.sling.geometry.attributes.position, v = V3();
          for (let j = 0; j < pa.count; j++) { const p = v.fromBufferAttribute(pa, j).applyMatrix4(s.sling.matrixWorld).applyMatrix4(B.inv).clone(); let dl = 1; for (let k = 0; k + 1 < L.length; k++) dl = Math.min(dl, segD(p, L[k], L[k + 1])); if (dl > 0.04) continue; n++; worst = Math.max(worst, B.near(p, 0.12)); }
          if (n < 20 || worst > 0.04) off.push('strap ' + i + ' (' + s.kind + ') ' + (worst >= 0.12 ? '12+' : (worst * 100).toFixed(1)) + ' cm off (' + n + ' points)');
        });
        ok(off.length === 0, 'straps on him, ' + tag(C, vest) + ': from under his arm round the chest to the shoulder\'s top within 4 cm of his body, kit or arm (the ribbon is 3.6 cm wide over cloth folds and the carrier\'s edges)' + (off.length ? ': ' + off.join(', ') : ''));
      }
    }
    // (6) the legs against the holsters that ride his hips, through the moves
    {
      setVest(true); T.carryDbg({ ...SEAT[0], inHand: null, akimbo: false, vest: true, grenades: 4 }); rig.t = 1e6;
      const press = (k, z) => T.flightInput && T.flightInput({ keys: k, zoom: !!z });
      const legs = []; M.traverse((o) => { if (o.isMesh && /live-trouser-leg|live-seat|boot|pad/.test(o.name || '')) legs.push(o); });
      // CC-350: the base pistol rides the belt too now (4 o'clock), so its shell and its pair's count with the secondaries'
      const spots = [rig.hip, rig.hipPair, ...rig.holsters, ...rig.pairs].filter((x) => x && x.onHips && vis(x.g) && x.shell && x.shell.userData.fitKey);
      const home = T.player.position.clone(), v = V3(), q = V3(); let worst = -1, where = '';
      T.flightHold && T.flightHold(true);
      const MOVES = [['stand', () => { press([]); step(20); }], ['walk', () => { press(['KeyW']); step(14); }], ['run', () => { press(['KeyW', 'ShiftLeft']); step(18); }], ['crouch', () => { press(['KeyC']); step(24); }], ['crouch-walk', () => { press(['KeyC', 'KeyW']); step(14); }], ['aim', () => { press([], true); step(24); }], ['jump', () => { press(['Space']); step(2); press([]); step(8); }]];
      for (const [name, set] of MOVES) { T.player.position.copy(home); set(); for (let f = 0; f < 4; f++) { if (f) step(3); M.updateMatrixWorld(true);
        for (const sp of spots) { const [, cx, cy, rx, ry, mouth, end] = String(sp.shell.userData.fitKey).split(':').map(Number), inv = sp.g.matrixWorld.clone().invert(), sc = sp.g.getWorldScale(V3()).x;
          for (const o of legs) { if (!vis(o)) continue; const pa = o.geometry.attributes.position; for (let i = 0; i < pa.count; i += 2) { if (o.isSkinnedMesh && o.getVertexPosition) o.getVertexPosition(i, v); else v.fromBufferAttribute(pa, i); q.copy(v.applyMatrix4(o.matrixWorld)).applyMatrix4(inv);
            const d = Math.min(rx + 0.004 - Math.abs(q.x - cx), ry + 0.004 - Math.abs(q.y - cy), q.z - mouth, end - q.z) * sc; if (d > worst) { worst = d; where = name + ': ' + o.name + ' in the ' + (sp.kind || sp.fitKind) + ' shell'; } } } } } }
      press([]); T.flightHold && T.flightHold(false); T.player.position.copy(home);
      ok(spots.length >= 2 && worst <= 0.0005, 'his legs never inside a hip-riding holster shell (' + spots.length + ' shells, walk/run/crouch/aim/jump; worst ' + (worst * 1000).toFixed(1) + ' mm' + (worst > 0 ? ', ' + where : '') + ')');
    }
    setVest(vest0); T.carryDbg(CONFIGS[4]); await sim(0.3);
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
