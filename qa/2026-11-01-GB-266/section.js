    // GB-266 (CL-289 iron, CL-287 W2; D-106): the old man's horseshoe sets (utilities' supply 'horseshoes'), hung with E
    // over a ring gap or a cut shortcut (GP-20007), close it to the dead only (combat/iron-gaps.js). The line is marked in
    // both of the dead's fields (valleyBlock, tagged) and updateZombies pushes a dead body back off it; he is never pushed.
    // Held for the run with the utilities and reset with it; E again takes a set down to move it.
    const ironSupply = {
      count: () => (utilitiesOn && utilities.isOn('iron')) ? utilities.supply('horseshoes') : 0,
      take: () => utilities.use('horseshoes', 1),
      give: () => { const s = utilities.read(); s.supply.horseshoes = (s.supply.horseshoes || 0) + 1; utilities.load(s); },
    };
    const ironGaps = createIronGaps(ironSupply);
    const ironMeshes = new Map(), ironHungList = [];
    let ironHungN = 0, ironSpotCache = null, ironSpotSig = '', ironLook = null;
    const _ironOut = { x: 0, z: 0 };
    function ironSpots() {
      let sig = '';
      for (const b of shortcutBands) sig += b.cut ? '1' : '0';
      if (ironSpotCache && sig === ironSpotSig) return ironSpotCache;
      const out = [];
      for (const band of wallBands) if (band.kind === 'hq-thicket') out.push(...ringGapSpots(band));
      for (const band of shortcutBands) { const s = shortcutSpot(band); if (s) out.push(s); }
      ironSpotCache = out; ironSpotSig = sig;
      return out;
    }
    function ironPushDead(x, z, r, px, pz) {
      _ironOut.x = x; _ironOut.z = z;
      for (let i = 0; i < ironHungList.length; i++) {
        const p = ironPush(ironHungList[i], _ironOut.x, _ironOut.z, r, px, pz);
        if (p) { _ironOut.x = p.x; _ironOut.z = p.z; }
      }
      return _ironOut;
    }
    // One set: two posts and a wire across the gap, the shoes hung on it open end up. Two draws a set.
    function ironMerge(parts) {
      const pos = [], nor = [];
      for (const p of parts) {
        const g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
        g.applyMatrix4(p.m); pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array); g.dispose();
      }
      const n = pos.reduce((a, b) => a + b.length, 0), P = new Float32Array(n), N = new Float32Array(n);
      for (let i = 0, o = 0; i < pos.length; o += pos[i].length, i++) { P.set(pos[i], o); N.set(nor[i], o); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
      g.computeBoundingSphere(); return g;
    }
    function ironMesh(s) {
      if (!ironLook) ironLook = {
        post: new THREE.CylinderGeometry(0.06, 0.075, 1.7, 6), wire: new THREE.CylinderGeometry(0.012, 0.012, 1, 4),
        shoe: new THREE.TorusGeometry(0.075, 0.015, 4, 10, Math.PI * 1.6),
        wood: new THREE.MeshStandardMaterial({ color: 0x4e3d2c, roughness: 0.92, metalness: 0.05 }),
        iron: new THREE.MeshStandardMaterial({ color: 0x5f5a54, roughness: 0.55, metalness: 0.7 }),
      };
      const k = ironLook, ux = s.ux, uz = s.uz, up = new THREE.Vector3(0, 1, 0);
      const ax = s.x - ux * s.half, az = s.z - uz * s.half, bx = s.x + ux * s.half, bz = s.z + uz * s.half;
      const ay = sampleHeight(ax, az), by = sampleHeight(bx, bz);
      const m4 = (x, y, z, q, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q || new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
      const a = new THREE.Vector3(ax, ay + 1.5, az), b = new THREE.Vector3(bx, by + 1.5, bz), d = b.clone().sub(a), len = d.length();
      const wq = new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize());
      const frame = ironMerge([
        { geo: k.post, m: m4(ax, ay + 0.75, az) }, { geo: k.post, m: m4(bx, by + 0.75, bz) },
        { geo: k.wire, m: m4((ax + bx) / 2, (ay + by) / 2 + 1.5, (az + bz) / 2, wq, 1, len, 1) },
      ]);
      // The torus's gap is centred at -0.2 pi: turned 0.7 pi about z it opens up; then its plane along the line.
      const sq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-uz, ux), 0.7 * Math.PI, 'YXZ'));
      const shoes = [], n = Math.max(3, Math.round(s.half * 2 / 0.42));
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, p = a.clone().addScaledVector(d, t);
        shoes.push({ geo: k.shoe, m: m4(p.x, p.y - 0.1, p.z, sq) });
      }
      const g = new THREE.Group(); g.name = 'iron-' + s.id;
      const fm = new THREE.Mesh(frame, k.wood), sm = new THREE.Mesh(ironMerge(shoes), k.iron);
      fm.castShadow = sm.castShadow = true;
      g.add(fm, sm); return g;
    }
    function ironSync() {
      ironGaps.prune(new Set(ironSpots().map((s) => s.id)));
      ironHungList.length = 0;
      for (const s of ironGaps.hung()) ironHungList.push(s);
      ironHungN = ironHungList.length;
      for (const [id, g] of ironMeshes) if (!ironGaps.isHung(id)) {
        scene.remove(g); g.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
        ironMeshes.delete(id); valleyUnblock('iron:' + id);
      }
      for (const s of ironHungList) if (!ironMeshes.has(s.id)) {
        const g = ironMesh(s); scene.add(g); ironMeshes.set(s.id, g);
        for (const c of ironBlockCircles(s)) valleyBlock(c.x, c.z, c.r, 'iron:' + s.id);
      }
      utilityHud();
      try { updateFlowFields(0, true); } catch (_) {}
    }
    // The spot in reach: a hung one (to take down), or an empty one when he has a set.
    function ironTarget(px, pz) {
      if (!gameStarted || gameOver || won) return null;
      const s = nearestSpot(ironSpots(), px, pz);
      if (!s) return null;
      if (ironGaps.isHung(s.id)) return s;
      return ironSupply.count() > 0 ? s : null;
    }
    function ironPromptText() {
      const P = localPlayer.position, s = ironTarget(P.x, P.z);
      if (!s) return null;
      return ironGaps.isHung(s.id)
        ? sayText('utility.iron.takeDownPrompt', { interact: 'E' }, 'E \u2014 Take the horseshoes down')
        : sayText('utility.iron.hangPrompt', { interact: 'E' }, 'E \u2014 Hang horseshoes');
    }
    function ironUseE() {
      const P = localPlayer.position, s = ironTarget(P.x, P.z);
      if (!s) return false;
      const was = ironGaps.isHung(s.id);
      const done = was ? ironGaps.takeDown(s.id) : ironGaps.hang(s);
      if (!done) return false;
      ironSync();
      if (!was) showBanner(sayText('utility.iron.hangBanner', {}, 'THE GAP IS CLOSED TO THE DEAD'), '', 1.8, '#d7c6a4');
      window.dispatchEvent(new CustomEvent('dw-log', { detail: { iron: s.id, state: was ? 'down' : 'hung', left: utilities.supply('horseshoes') } }));
      return true;
    }
    window.addEventListener('dw-game', (e) => { if (e.detail?.type === 'run-reset') { ironGaps.reset(); ironSync(); } });
    function ironDbg() {
      return {
        spots: () => ironSpots().map((s) => ({ id: s.id, kind: s.kind, x: s.x, z: s.z, ux: s.ux, uz: s.uz, half: s.half, hung: ironGaps.isHung(s.id) })),
        read: () => ironGaps.read(), left: () => ironSupply.count(), target: () => { const P = localPlayer.position, s = ironTarget(P.x, P.z); return s ? s.id : null; },
        prompt: () => ironPromptText(), use: () => ironUseE(), meshes: () => ironMeshes.size,
        hang: (id) => { const s = ironSpots().find((q) => q.id === id); const ok = !!s && ironGaps.hang(s); if (ok) ironSync(); return ok; },
        down: (id) => { const ok = ironGaps.takeDown(id); if (ok) ironSync(); return ok; },
        push: (x, z, r = 0.35, px = x, pz = z) => { const p = ironPushDead(x, z, r, px, pz); return { x: p.x, z: p.z }; },
        blocks: () => valleyBlocks.filter((b) => b.tag).length,
      };
    }