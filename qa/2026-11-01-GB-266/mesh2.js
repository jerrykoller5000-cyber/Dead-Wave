      const k = ironLook, up = new THREE.Vector3(0, 1, 0);
      const m4 = (x, y, z, q, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q || new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
      const frameParts = [], shoes = [];
      const segs = ironSegs(s);
      for (let q = 0; q < segs.length; q++) {
        const sg = segs[q], ux = sg.ux, uz = sg.uz;
        const ax = sg.x - ux * sg.half, az = sg.z - uz * sg.half, bx = sg.x + ux * sg.half, bz = sg.z + uz * sg.half;
        const ay = sampleHeight(ax, az), by = sampleHeight(bx, bz);
        const a = new THREE.Vector3(ax, ay + 1.5, az), b = new THREE.Vector3(bx, by + 1.5, bz), d = b.clone().sub(a), len = d.length();
        if (q === 0) frameParts.push({ geo: k.post, m: m4(ax, ay + 0.75, az) });
        frameParts.push({ geo: k.post, m: m4(bx, by + 0.75, bz) });
        frameParts.push({ geo: k.wire, m: m4((ax + bx) / 2, (ay + by) / 2 + 1.5, (az + bz) / 2, new THREE.Quaternion().setFromUnitVectors(up, d.clone().normalize()), 1, len, 1) });
        // The torus's gap is centred at -0.2 pi: turned 0.7 pi about z it opens up; then its plane along the wire.
        const sq = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(-uz, ux), 0.7 * Math.PI, 'YXZ'));
        const n = Math.max(2, Math.round(len / 0.42));
        for (let i = 0; i < n; i++) { const p = a.clone().addScaledVector(d, (i + 0.5) / n); shoes.push({ geo: k.shoe, m: m4(p.x, p.y - 0.1, p.z, sq) }); }
      }
      const g = new THREE.Group(); g.name = 'iron-' + s.id;
      const fm = new THREE.Mesh(ironMerge(frameParts), k.wood), sm = new THREE.Mesh(ironMerge(shoes), k.iron);
      fm.castShadow = sm.castShadow = true;
      g.add(fm, sm); return g;