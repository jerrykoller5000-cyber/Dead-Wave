// world/story-fence.js - AG-245 (D-116; props' look are yours).
// The mast yard's chain-link fence ring and vine-grown double gate.
//
// API:
//   buildChainLinkRing(THREE, { pts, gates, heightAt }) -> THREE.Group
//   buildVines(THREE, L) -> THREE.Group with userData.shut and userData.cut
//
// Rules & Principles:
// - Low draw counts: ring merged into 2 draws (mesh quads + steel parts),
//   vines merged into 2 draws per state (wood + foliage). (1.2 speed rule).
// - Real chain-link look: galvanized diamond wire texture, tubular steel posts,
//   caps, rails, outrigger barbed arms, and concertina razor wire coil on top.
// - Authentic vines: thick tangled woody creepers and rich ivy leaf clusters
//   locking the gate shut in userData.shut; severed ends, pale wood cores,
//   hanging limp tendrils and ground debris in userData.cut.

let _cachedLinkTex = null;

export function createChainLinkTexture(THREE) {
  if (typeof document === 'undefined' || !document.createElement) return null;
  if (_cachedLinkTex) return _cachedLinkTex;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  // Galvanized steel wire palette
  const wireBase = '#8a9491';
  const wireLit = '#c2cecb';
  const wireShadow = '#555e5b';
  const wireCenter = '#a6b2af';

  // Draw two interlaced sets of diagonal wires forming chain-link diamonds
  const half = size / 2;
  const drawDiamondWire = (ox, oy) => {
    ctx.save();
    ctx.translate(ox, oy);

    // Wire shadow/stroke
    ctx.strokeStyle = wireShadow;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, half + 1);
    ctx.lineTo(half + 1, 0);
    ctx.lineTo(size, half + 1);
    ctx.lineTo(half + 1, size);
    ctx.closePath();
    ctx.stroke();

    // Wire main body
    ctx.strokeStyle = wireBase;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, half);
    ctx.lineTo(half, 0);
    ctx.lineTo(size, half);
    ctx.lineTo(half, size);
    ctx.closePath();
    ctx.stroke();

    // Specular highlight line along upper wire edge
    ctx.strokeStyle = wireLit;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, half - 1);
    ctx.lineTo(half - 1, 0);
    ctx.moveTo(size, half - 1);
    ctx.lineTo(half + 1, size);
    ctx.stroke();

    // Knuckle weave highlight at corners
    ctx.fillStyle = wireCenter;
    for (const [kx, ky] of [[0, half], [half, 0], [size, half], [half, size]]) {
      ctx.beginPath();
      ctx.arc(kx, ky, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  drawDiamondWire(0, 0);

  _cachedLinkTex = new THREE.CanvasTexture(canvas);
  _cachedLinkTex.wrapS = THREE.RepeatWrapping;
  _cachedLinkTex.wrapT = THREE.RepeatWrapping;
  _cachedLinkTex.colorSpace = THREE.SRGBColorSpace;
  return _cachedLinkTex;
}

export function getStoryFenceMaterials(THREE) {
  const tex = createChainLinkTexture(THREE);
  const linkMat = new THREE.MeshStandardMaterial({
    map: tex || null,
    color: tex ? 0xffffff : 0x8a9491,
    alphaTest: tex ? 0.45 : 0.0,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 0.58,
    metalness: 0.65,
    wireframe: false,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x5a6360,
    roughness: 0.65,
    metalness: 0.72,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x3d2b1d,
    roughness: 0.95,
    metalness: 0.04,
  });

  const cutWoodMat = new THREE.MeshStandardMaterial({
    color: 0xd2c29d,
    roughness: 0.88,
    metalness: 0.02,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x3a5626,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const foliageDarkMat = new THREE.MeshStandardMaterial({
    color: 0x243918,
    roughness: 0.96,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  return { linkMat, steelMat, woodMat, cutWoodMat, foliageMat, foliageDarkMat };
}

// ---------------------------------------------------------------------------
// Low-level buffer builder for merging shapes into a single BufferGeometry
// ---------------------------------------------------------------------------
function createBufferAccumulator() {
  const pos = [];
  const nrm = [];
  const uv = [];
  const col = [];
  const idx = [];

  return {
    pos, nrm, uv, col, idx,
    addQuad(p0, p1, p2, p3, uv0, uv1, uv2, uv3, normal) {
      const base = pos.length / 3;
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
      const nx = normal ? normal.x : 0, ny = normal ? normal.y : 0, nz = normal ? normal.z : 1;
      nrm.push(nx, ny, nz, nx, ny, nz, nx, ny, nz, nx, ny, nz);
      if (uv0) uv.push(uv0.u, uv0.v, uv1.u, uv1.v, uv2.u, uv2.v, uv3.u, uv3.v);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    },
    addBox(cx, cy, cz, w, h, d, yaw = 0, colorHex = null) {
      const hx = w * 0.5, hy = h * 0.5, hz = d * 0.5;
      const cos = Math.cos(yaw), sin = Math.sin(yaw);
      const rot = (x, z) => ({ x: cx + x * cos - z * sin, z: cz + x * sin + z * cos });

      const fbl = rot(-hx, hz), fbr = rot(hx, hz);
      const bbl = rot(-hx, -hz), bbr = rot(hx, -hz);
      const y0 = cy - hy, y1 = cy + hy;

      // 6 faces
      const faces = [
        // Front (+z in local)
        { a: { x: fbl.x, y: y0, z: fbl.z }, b: { x: fbr.x, y: y0, z: fbr.z }, c: { x: fbr.x, y: y1, z: fbr.z }, d: { x: fbl.x, y: y1, z: fbl.z }, n: { x: -sin, y: 0, z: cos } },
        // Back (-z in local)
        { a: { x: bbr.x, y: y0, z: bbr.z }, b: { x: bbl.x, y: y0, z: bbl.z }, c: { x: bbl.x, y: y1, z: bbl.z }, d: { x: bbr.x, y: y1, z: bbr.z }, n: { x: sin, y: 0, z: -cos } },
        // Top (+y)
        { a: { x: fbl.x, y: y1, z: fbl.z }, b: { x: fbr.x, y: y1, z: fbr.z }, c: { x: bbr.x, y: y1, z: bbr.z }, d: { x: bbl.x, y: y1, z: bbl.z }, n: { x: 0, y: 1, z: 0 } },
        // Bottom (-y)
        { a: { x: fbl.x, y: y0, z: fbl.z }, b: { x: bbl.x, y: y0, z: bbl.z }, c: { x: bbr.x, y: y0, z: bbr.z }, d: { x: fbr.x, y: y0, z: fbr.z }, n: { x: 0, y: -1, z: 0 } },
        // Right (+x in local)
        { a: { x: fbr.x, y: y0, z: fbr.z }, b: { x: bbr.x, y: y0, z: bbr.z }, c: { x: bbr.x, y: y1, z: bbr.z }, d: { x: fbr.x, y: y1, z: fbr.z }, n: { x: cos, y: 0, z: sin } },
        // Left (-x in local)
        { a: { x: bbl.x, y: y0, z: bbl.z }, b: { x: fbl.x, y: y0, z: fbl.z }, c: { x: fbl.x, y: y1, z: fbl.z }, d: { x: bbl.x, y: y1, z: bbl.z }, n: { x: -cos, y: 0, z: -sin } },
      ];

      for (const f of faces) {
        this.addQuad(f.a, f.b, f.c, f.d, null, null, null, null, f.n);
      }
    },
    addCylinder(p0, p1, radius, sides = 6) {
      const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
      const len = Math.hypot(dx, dy, dz);
      if (len < 1e-4) return;

      const dirX = dx / len, dirY = dy / len, dirZ = dz / len;
      // Perpendicular vector
      let upX = 0, upY = 1, upZ = 0;
      if (Math.abs(dirY) > 0.95) { upX = 1; upY = 0; upZ = 0; }
      // Cross dir x up -> u
      let ux = dirY * upZ - dirZ * upY, uy = dirZ * upX - dirX * upZ, uz = dirX * upY - dirY * upX;
      const ulen = Math.hypot(ux, uy, uz);
      ux /= ulen; uy /= ulen; uz /= ulen;
      // Cross u x dir -> v
      const vx = uy * dirZ - uz * dirY, vy = uz * dirX - ux * dirZ, vz = ux * dirY - uy * dirX;

      const ring0 = [], ring1 = [], normals = [];
      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2;
        const cos = Math.cos(a), sin = Math.sin(a);
        const nx = ux * cos + vx * sin, ny = uy * cos + vy * sin, nz = uz * cos + vz * sin;
        normals.push({ x: nx, y: ny, z: nz });
        ring0.push({ x: p0.x + nx * radius, y: p0.y + ny * radius, z: p0.z + nz * radius });
        ring1.push({ x: p1.x + nx * radius, y: p1.y + ny * radius, z: p1.z + nz * radius });
      }

      for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        const pA = ring0[i], pB = ring0[next], pC = ring1[next], pD = ring1[i];
        const nA = normals[i], nB = normals[next];
        const avgN = { x: (nA.x + nB.x) * 0.5, y: (nA.y + nB.y) * 0.5, z: (nA.z + nB.z) * 0.5 };
        this.addQuad(pA, pB, pC, pD, null, null, null, null, avgN);
      }
    },
    // Concertina razor ribbon helical coil with blades
    addRazorCoil(p0, p1, radius = 0.20, pitch = 0.36, stepsPerTurn = 14) {
      const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
      const len = Math.hypot(dx, dy, dz);
      if (len < 0.1) return;

      const ux = dx / len, uy = dy / len, uz = dz / len;
      // Perpendicular vectors
      let px = -uz, py = 0, pz = ux;
      const plen = Math.hypot(px, pz) || 1;
      px /= plen; pz /= plen;
      const qx = 0, qy = 1, qz = 0;

      const totalTurns = len / pitch;
      const totalSteps = Math.max(8, Math.ceil(totalTurns * stepsPerTurn));
      let prevPt = null;

      for (let s = 0; s <= totalSteps; s++) {
        const t = s / totalSteps;
        const u = t * len;
        const angle = t * totalTurns * Math.PI * 2;
        const cos = Math.cos(angle) * radius;
        const sin = Math.sin(angle) * radius;

        const curPt = {
          x: p0.x + ux * u + px * cos + qx * sin,
          y: p0.y + uy * u + py * cos + qy * sin,
          z: p0.z + uz * u + pz * cos + qz * sin,
        };

        if (prevPt) {
          // Thin cylinder wire strand
          this.addCylinder(prevPt, curPt, 0.008, 4);

          // Stamped razor barb pair every 3 steps
          if (s % 3 === 0) {
            const barbLen = 0.055, barbW = 0.016;
            // Blade pointing tangentially outward
            const bx = px * cos * 0.4, bz = pz * cos * 0.4;
            const b0 = { x: curPt.x - bx * 0.5, y: curPt.y, z: curPt.z - bz * 0.5 };
            const b1 = { x: curPt.x + bx + ux * barbLen, y: curPt.y + barbW, z: curPt.z + bz + uz * barbLen };
            const b2 = { x: curPt.x + bx - ux * barbLen, y: curPt.y - barbW, z: curPt.z + bz - uz * barbLen };
            this.addQuad(b0, b1, curPt, b2, null, null, null, null, { x: qx, y: 1, z: qz });
          }
        }
        prevPt = curPt;
      }
    },
    toBufferGeometry(THREE) {
      const geo = new THREE.BufferGeometry();
      if (pos.length) geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      if (nrm.length) geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      if (uv.length) geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      if (col.length) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      if (idx.length) geo.setIndex(idx);
      geo.computeVertexNormals();
      return geo;
    }
  };
}

// ---------------------------------------------------------------------------
// 1. buildChainLinkRing(THREE, { pts, gates, heightAt })
// ---------------------------------------------------------------------------
export function buildChainLinkRing(THREE, { pts = [], gates = [], heightAt = () => 0 } = {}) {
  const group = new THREE.Group();
  group.name = 'story-fence-ring';

  const mats = getStoryFenceMaterials(THREE);
  const H = 2.35; // Fence fabric height

  // Identify kept points outside gate clearings
  const isKept = (p) => !gates.some((g) => {
    const clearHalf = (g.half || g.span || 1.8) + 0.12;
    return Math.hypot(p.x - g.x, p.z - g.z) < clearHalf;
  });

  const keep = pts.map(isKept);

  const steelBuf = createBufferAccumulator();
  const linkBuf = createBufferAccumulator();

  // Helper to construct a fence run between 3D points
  const runFenceSpan = (pA, pB, isTerminalA = false, isTerminalB = false) => {
    const dx = pB.x - pA.x, dz = pB.z - pA.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return;

    const ya = heightAt(pA.x, pA.z);
    const yb = heightAt(pB.x, pB.z);
    const yaw = Math.atan2(dz, dx);
    const nx = -Math.sin(yaw), nz = Math.cos(yaw);

    // 1. Chain link mesh quad
    const uSpan = len / 0.12;
    const vSpan = H / 0.12;
    linkBuf.addQuad(
      { x: pA.x, y: ya + 0.08, z: pA.z },
      { x: pB.x, y: yb + 0.08, z: pB.z },
      { x: pB.x, y: yb + H, z: pB.z },
      { x: pA.x, y: ya + H, z: pA.z },
      { u: 0, v: 0 },
      { u: uSpan, v: 0 },
      { u: uSpan, v: vSpan },
      { u: 0, v: vSpan },
      { x: nx, y: 0, z: nz }
    );

    // 2. Top rail (pipe running continuously across the top of fence fabric)
    steelBuf.addCylinder(
      { x: pA.x, y: ya + H, z: pA.z },
      { x: pB.x, y: yb + H, z: pB.z },
      0.024, 6
    );

    // 3. Bottom tension rail
    steelBuf.addCylinder(
      { x: pA.x, y: ya + 0.12, z: pA.z },
      { x: pB.x, y: yb + 0.12, z: pB.z },
      0.016, 5
    );

    // 4. Helical concertina razor coil along the top rail
    steelBuf.addRazorCoil(
      { x: pA.x, y: ya + H + 0.22, z: pA.z },
      { x: pB.x, y: yb + H + 0.22, z: pB.z },
      0.20, 0.38, 12
    );
  };

  // Helper to add a post
  const addPost = (p, isTerminal = false, yardCenter = null) => {
    const y = heightAt(p.x, p.z);
    const postR = isTerminal ? 0.055 : 0.042;
    const postH = H + (isTerminal ? 0.55 : 0.45);

    // Vertical pipe post
    steelBuf.addCylinder(
      { x: p.x, y: y - 0.25, z: p.z },
      { x: p.x, y: y + postH, z: p.z },
      postR, 8
    );

    // Concrete/steel base footing
    steelBuf.addBox(p.x, y + 0.03, p.z, postR * 4.2, 0.06, postR * 4.2, 0);

    // Dome cap
    steelBuf.addCylinder(
      { x: p.x, y: y + postH, z: p.z },
      { x: p.x, y: y + postH + 0.06, z: p.z },
      postR * 1.15, 8
    );

    // Outrigger arm (45-degree angled barbed wire extension arm facing outward)
    let outX = p.x, outZ = p.z;
    if (yardCenter) {
      const cdx = p.x - yardCenter.x, cdz = p.z - yardCenter.z;
      const clen = Math.hypot(cdx, cdz) || 1;
      outX = cdx / clen; outZ = cdz / clen;
    } else {
      outX = 0; outZ = 1;
    }

    const armTip = {
      x: p.x + outX * 0.32,
      y: y + postH + 0.26,
      z: p.z + outZ * 0.32,
    };
    steelBuf.addCylinder({ x: p.x, y: y + H, z: p.z }, armTip, 0.016, 5);

    // Terminal tension bands if end post
    if (isTerminal) {
      for (const ty of [0.4, 1.2, 2.0]) {
        steelBuf.addCylinder(
          { x: p.x, y: y + ty - 0.03, z: p.z },
          { x: p.x, y: y + ty + 0.03, z: p.z },
          postR * 1.25, 8
        );
      }
    }
  };

  // Approximate yard center for orienting outrigger arms outwards
  let cx = 0, cz = 0;
  if (pts.length) {
    for (const p of pts) { cx += p.x; cz += p.z; }
    cx /= pts.length; cz /= pts.length;
  }
  const yardCenter = { x: cx, z: cz };

  // Loop over contiguous kept point runs
  for (let i = 1; i < pts.length; i++) {
    if (keep[i - 1] && keep[i]) {
      runFenceSpan(pts[i - 1], pts[i]);
      // Post every 2 segments
      if (i % 2 === 0) addPost(pts[i], false, yardCenter);
    }
  }
  // Wrap-around segment between last and first
  if (pts.length > 2 && keep[pts.length - 1] && keep[0]) {
    runFenceSpan(pts[pts.length - 1], pts[0]);
  }

  // Connect gates: from gate terminal post to nearest kept ring point
  for (const g of gates) {
    const half = (g.half || g.span || 1.8);
    for (const side of [-1, 1]) {
      const gp = {
        x: g.x + g.ax * side * (half + 0.12),
        z: g.z + g.az * side * (half + 0.12)
      };
      // Gate terminal post
      addPost(gp, true, yardCenter);

      // Connect to closest kept ring point
      let best = null, bestDist = 4.0;
      pts.forEach((p, idx) => {
        if (!keep[idx]) return;
        const d = Math.hypot(p.x - gp.x, p.z - gp.z);
        if (d < bestDist) { bestDist = d; best = p; }
      });
      if (best) {
        runFenceSpan(gp, best, true, false);
      }
    }
  }

  // Build the 2 merged meshes (1 linkMesh + 1 steelMesh)
  const linkGeo = linkBuf.toBufferGeometry(THREE);
  const steelGeo = steelBuf.toBufferGeometry(THREE);

  const linkMesh = new THREE.Mesh(linkGeo, mats.linkMat);
  linkMesh.name = 'fence-link-mesh';
  linkMesh.castShadow = true;
  linkMesh.receiveShadow = true;

  const steelMesh = new THREE.Mesh(steelGeo, mats.steelMat);
  steelMesh.name = 'fence-steel-mesh';
  steelMesh.castShadow = true;
  steelMesh.receiveShadow = true;

  group.add(linkMesh);
  group.add(steelMesh);

  return group;
}

// ---------------------------------------------------------------------------
// 2. buildVines(THREE, L)
// ---------------------------------------------------------------------------
export function buildVines(THREE, L = 1.8) {
  const root = new THREE.Group();
  root.name = 'story-vines';

  const mats = getStoryFenceMaterials(THREE);

  const shutGroup = new THREE.Group();
  shutGroup.name = 'vines-shut';
  shutGroup.visible = true;

  const cutGroup = new THREE.Group();
  cutGroup.name = 'vines-cut';
  cutGroup.visible = false;

  root.userData.shut = shutGroup;
  root.userData.cut = cutGroup;
  root.add(shutGroup);
  root.add(cutGroup);

  // Deterministic pseudo-random generator
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0;
      return (s >>> 0) / 4294967296;
    };
  }

  const rng = makeRng(0x8f2a14);

  // Buffer accumulators for shut state
  const shutWood = createBufferAccumulator();
  const shutLeaf = createBufferAccumulator();

  // Buffer accumulators for cut state
  const cutWood = createBufferAccumulator();
  const cutLeaf = createBufferAccumulator();

  // Helper: Leaf quad or cluster
  const addLeafCluster = (buf, x, y, z, radius = 0.16, count = 3, rFn = rng) => {
    for (let k = 0; k < count; k++) {
      const lx = x + (rFn() - 0.5) * radius * 1.5;
      const ly = y + (rFn() - 0.5) * radius * 1.5;
      const lz = z + (rFn() - 0.5) * radius * 1.5;
      const leafSize = 0.10 + rFn() * 0.12;
      const yaw = rFn() * Math.PI * 2;
      const pitch = (rFn() - 0.5) * 1.2;

      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);

      const p0 = { x: lx - cosY * leafSize * 0.5, y: ly - sinP * leafSize * 0.5, z: lz - sinY * leafSize * 0.5 };
      const p1 = { x: lx + cosY * leafSize * 0.5, y: ly - sinP * leafSize * 0.5, z: lz + sinY * leafSize * 0.5 };
      const p2 = { x: lx + cosY * leafSize * 0.4, y: ly + cosP * leafSize * 0.8, z: lz + sinY * leafSize * 0.4 };
      const p3 = { x: lx - cosY * leafSize * 0.4, y: ly + cosP * leafSize * 0.8, z: lz - sinY * leafSize * 0.4 };

      buf.addQuad(p0, p1, p2, p3, null, null, null, null, { x: 0, y: cosP, z: sinY });
    }
  };

  // Helper: Vine branch segment (spline along points)
  const addVineStrand = (woodBuf, leafBuf, pts, radius = 0.032, leafDensity = 0.6) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      woodBuf.addCylinder(a, b, radius, 5);

      if (rng() < leafDensity) {
        const midX = (a.x + b.x) * 0.5, midY = (a.y + b.y) * 0.5, midZ = (a.z + b.z) * 0.5;
        addLeafCluster(leafBuf, midX, midY, midZ, 0.18, 3, rng);
      }
    }
  };

  // -------------------------------------------------------------------------
  // A. SHUT STATE: Dense overgrown vines binding both leaves and center seam
  // -------------------------------------------------------------------------

  // 1. Heavy climbing trunks from the side posts inwards
  for (const side of [-1, 1]) {
    // 3 main trunks per side
    for (let t = 0; t < 3; t++) {
      const trunkPts = [];
      const startX = side * (L * (0.85 + rng() * 0.25));
      const targetY = 0.4 + t * 0.7 + rng() * 0.3;
      let curX = startX, curY = 0.05, curZ = (rng() - 0.5) * 0.08;
      trunkPts.push({ x: curX, y: curY, z: curZ });

      const steps = 7;
      for (let s = 1; s <= steps; s++) {
        const progress = s / steps;
        curX = startX + (0 - startX) * progress * 0.8 + (rng() - 0.5) * 0.15;
        curY = 0.05 + targetY * progress + (rng() - 0.5) * 0.12;
        curZ = (rng() < 0.5 ? -1 : 1) * (0.04 + rng() * 0.08);
        trunkPts.push({ x: curX, y: curY, z: curZ });
      }
      addVineStrand(shutWood, shutLeaf, trunkPts, 0.038 - t * 0.006, 0.75);
    }
  }

  // 2. Thick central crossing brambles locking the two gate leaves across x = 0
  const crossBrambles = [
    // Low cross
    [ { x: -L * 0.65, y: 0.35, z: 0.04 }, { x: -0.28, y: 0.52, z: 0.06 }, { x: 0.0, y: 0.60, z: 0.07 }, { x: 0.32, y: 0.58, z: 0.05 }, { x: L * 0.65, y: 0.42, z: 0.03 } ],
    // Mid cross (diagonal lock)
    [ { x: -L * 0.75, y: 0.85, z: -0.05 }, { x: -0.32, y: 1.15, z: -0.04 }, { x: 0.02, y: 1.28, z: 0.08 }, { x: 0.35, y: 1.35, z: 0.06 }, { x: L * 0.70, y: 1.62, z: -0.03 } ],
    // High cross
    [ { x: -L * 0.70, y: 1.75, z: 0.05 }, { x: -0.25, y: 1.88, z: 0.06 }, { x: 0.0, y: 1.92, z: 0.08 }, { x: 0.30, y: 1.85, z: 0.05 }, { x: L * 0.72, y: 1.70, z: 0.04 } ],
    // Severe central knot around lock level y ~ 1.25m
    [ { x: -0.45, y: 1.40, z: 0.07 }, { x: -0.15, y: 1.32, z: 0.09 }, { x: 0.0, y: 1.24, z: 0.10 }, { x: 0.22, y: 1.18, z: 0.08 }, { x: 0.48, y: 1.05, z: 0.06 } ],
    [ { x: -0.42, y: 1.08, z: -0.06 }, { x: -0.12, y: 1.20, z: -0.08 }, { x: 0.0, y: 1.26, z: -0.09 }, { x: 0.18, y: 1.35, z: -0.07 }, { x: 0.45, y: 1.45, z: -0.05 } ],
  ];

  for (const b of crossBrambles) {
    addVineStrand(shutWood, shutLeaf, b, 0.034, 0.85);
  }

  // 3. Dense ivy leaves clustered over the central gate seam
  for (let i = 0; i < 35; i++) {
    const lx = (rng() - 0.5) * 1.1; // Central 1.1m
    const ly = 0.3 + rng() * 1.8;
    const lz = (rng() - 0.5) * 0.22;
    addLeafCluster(shutLeaf, lx, ly, lz, 0.24, 4, rng);
  }

  // 4. Hanging tendrils draping from top rail
  for (let i = 0; i < 18; i++) {
    const hx = (rng() - 0.5) * 2 * L * 0.85;
    const len = 0.45 + rng() * 0.85;
    const tendril = [
      { x: hx, y: 2.25, z: 0.06 },
      { x: hx + (rng() - 0.5) * 0.08, y: 2.25 - len * 0.5, z: (rng() - 0.5) * 0.1 },
      { x: hx + (rng() - 0.5) * 0.14, y: 2.25 - len, z: 0.04 },
    ];
    addVineStrand(shutWood, shutLeaf, tendril, 0.018, 0.6);
  }

  // -------------------------------------------------------------------------
  // B. CUT STATE: Severed central corridor, hanging limp strands, cut ends, debris
  // -------------------------------------------------------------------------
  // Cut gap: |x| < 0.26 is clear so gate leaves can swing open freely.

  // 1. Severed trunk stumps pointing toward center with pale sapwood cut faces
  for (const b of crossBrambles) {
    // Left severed half: from start up to x = -0.26
    const leftHalf = b.filter(p => p.x <= -0.22);
    if (leftHalf.length >= 2) {
      addVineStrand(cutWood, cutLeaf, leftHalf, 0.034, 0.7);
      // Clean cut stump at the severance point
      const last = leftHalf[leftHalf.length - 1];
      const cutEndTip = { x: last.x + 0.04, y: last.y - 0.02, z: last.z };
      // Woody collar
      cutWood.addCylinder(last, cutEndTip, 0.036, 6);
      // Flat cut face with pale wood core
      cutWood.addCylinder(
        { x: cutEndTip.x - 0.005, y: cutEndTip.y, z: cutEndTip.z },
        cutEndTip,
        0.032, 6
      );

      // Limp dangling end hanging downwards under gravity
      const hangPts = [
        cutEndTip,
        { x: cutEndTip.x - 0.03, y: cutEndTip.y - 0.28, z: cutEndTip.z + 0.03 },
        { x: cutEndTip.x - 0.05, y: cutEndTip.y - 0.55, z: cutEndTip.z + 0.02 }
      ];
      addVineStrand(cutWood, cutLeaf, hangPts, 0.022, 0.5);
    }

    // Right severed half: from x = 0.22 to end
    const rightHalf = b.filter(p => p.x >= 0.22);
    if (rightHalf.length >= 2) {
      addVineStrand(cutWood, cutLeaf, rightHalf, 0.034, 0.7);
      const first = rightHalf[0];
      const cutEndTip = { x: first.x - 0.04, y: first.y - 0.02, z: first.z };
      cutWood.addCylinder(first, cutEndTip, 0.036, 6);
      cutWood.addCylinder(
        { x: cutEndTip.x + 0.005, y: cutEndTip.y, z: cutEndTip.z },
        cutEndTip,
        0.032, 6
      );

      const hangPts = [
        cutEndTip,
        { x: cutEndTip.x + 0.03, y: cutEndTip.y - 0.28, z: cutEndTip.z + 0.03 },
        { x: cutEndTip.x + 0.05, y: cutEndTip.y - 0.55, z: cutEndTip.z + 0.02 }
      ];
      addVineStrand(cutWood, cutLeaf, hangPts, 0.022, 0.5);
    }
  }

  // 2. Climbing side trunks remain intact on each leaf
  for (const side of [-1, 1]) {
    for (let t = 0; t < 2; t++) {
      const trunkPts = [];
      const startX = side * (L * (0.85 + rng() * 0.25));
      const targetY = 0.5 + t * 0.8;
      let curX = startX, curY = 0.05, curZ = (rng() - 0.5) * 0.08;
      trunkPts.push({ x: curX, y: curY, z: curZ });

      const steps = 6;
      for (let s = 1; s <= steps; s++) {
        const progress = s / steps;
        curX = startX + (side * 0.35 - startX) * progress;
        curY = 0.05 + targetY * progress;
        curZ = (rng() < 0.5 ? -1 : 1) * 0.06;
        trunkPts.push({ x: curX, y: curY, z: curZ });
      }
      addVineStrand(cutWood, cutLeaf, trunkPts, 0.032, 0.65);
    }
  }

  // 3. Severed vine debris fallen at the base/threshold (y ~ 0.02 to 0.12)
  for (let d = 0; d < 8; d++) {
    const dx = (rng() - 0.5) * 0.55;
    const dz = (rng() - 0.5) * 0.35;
    const dlen = 0.18 + rng() * 0.26;
    const dyaw = rng() * Math.PI;

    const pA = { x: dx - Math.cos(dyaw) * dlen * 0.5, y: 0.04 + rng() * 0.04, z: dz - Math.sin(dyaw) * dlen * 0.5 };
    const pB = { x: dx + Math.cos(dyaw) * dlen * 0.5, y: 0.03 + rng() * 0.04, z: dz + Math.sin(dyaw) * dlen * 0.5 };
    cutWood.addCylinder(pA, pB, 0.028, 5);

    // Chopped leaf bundle on ground
    addLeafCluster(cutLeaf, dx, 0.03, dz, 0.15, 3, rng);
  }

  // -------------------------------------------------------------------------
  // Build and attach merged meshes
  // -------------------------------------------------------------------------
  // Shut group meshes (2 draws)
  const shutWoodGeo = shutWood.toBufferGeometry(THREE);
  const shutLeafGeo = shutLeaf.toBufferGeometry(THREE);
  const shutWoodMesh = new THREE.Mesh(shutWoodGeo, mats.woodMat);
  shutWoodMesh.name = 'vines-shut-wood';
  shutWoodMesh.castShadow = true;
  const shutLeafMesh = new THREE.Mesh(shutLeafGeo, mats.foliageMat);
  shutLeafMesh.name = 'vines-shut-foliage';
  shutLeafMesh.castShadow = true;
  shutGroup.add(shutWoodMesh);
  shutGroup.add(shutLeafMesh);

  // Cut group meshes (2 draws)
  const cutWoodGeo = cutWood.toBufferGeometry(THREE);
  const cutLeafGeo = cutLeaf.toBufferGeometry(THREE);
  const cutWoodMesh = new THREE.Mesh(cutWoodGeo, mats.woodMat);
  cutWoodMesh.name = 'vines-cut-wood';
  cutWoodMesh.castShadow = true;
  const cutLeafMesh = new THREE.Mesh(cutLeafGeo, mats.foliageMat);
  cutLeafMesh.name = 'vines-cut-foliage';
  cutLeafMesh.castShadow = true;
  cutGroup.add(cutWoodMesh);
  cutGroup.add(cutLeafMesh);

  return root;
}
