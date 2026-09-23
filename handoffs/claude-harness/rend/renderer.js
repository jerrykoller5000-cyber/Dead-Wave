window.__render = function (roots, cam, W, H, bg, opts) {
  opts = opts || {};
  const T = window.TT, THREE = T.THREE;
  const tris = [], ttris = [], sprites = [];
  const vA = new THREE.Vector3();
  const texCache = new Map();
  const L22 = (v) => Math.pow(Math.max(0, v), 2.2);
  function texData(tex) {
    if (!tex || !tex.image || !tex.image.getContext) return null;
    let d = texCache.get(tex); if (d) return d;
    const c = tex.image; d = { w: c.width, h: c.height, px: c.getContext('2d').getImageData(0, 0, c.width, c.height).data, rx: (tex.repeat && tex.repeat.x) || 1, ry: (tex.repeat && tex.repeat.y) || 1 };
    texCache.set(tex, d); return d;
  }
  function samp(td, u, v) {
    u -= Math.floor(u); v -= Math.floor(v);
    const ti = ((Math.min(td.h - 1, Math.floor((1 - v) * td.h))) * td.w + Math.min(td.w - 1, Math.floor(u * td.w))) * 4;
    return [td.px[ti] / 255, td.px[ti + 1] / 255, td.px[ti + 2] / 255, td.px[ti + 3] / 255];
  }
  const visibleChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const isSprite = (o) => o.isSprite || (o.constructor && o.constructor.name === 'Sprite');
  for (const root of roots) {
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!visibleChain(o) || !o.material) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m.visible === false) return;
      if (isSprite(o)) {
        const e = o.matrixWorld.elements;
        sprites.push({ p: [e[12], e[13], e[14]], sx: Math.hypot(e[0], e[1], e[2]) * Math.sign(o.scale.x || 1), sy: Math.hypot(e[4], e[5], e[6]), c: [(o.center && o.center.x != null) ? o.center.x : 0.5, (o.center && o.center.y != null) ? o.center.y : 0.5], m });
        return;
      }
      if (!o.isMesh || !o.geometry) return;
      const pos = o.geometry.attributes.position; if (!pos) return;
      const opacity = m.transparent ? (m.opacity == null ? 1 : m.opacity) : 1;
      if (opacity < 0.02) return;
      const uv = o.geometry.attributes.uv, col = o.geometry.attributes.color, emb = o.geometry.attributes.ember, idx = o.geometry.index;
      const ud = m.userData || {};
      const base = m.color ? [L22(m.color.r), L22(m.color.g), L22(m.color.b)] : [1, 1, 1];
      const em = m.emissive ? [L22(m.emissive.r) * (m.emissiveIntensity || 0), L22(m.emissive.g) * (m.emissiveIntensity || 0), L22(m.emissive.b) * (m.emissiveIntensity || 0)] : [0, 0, 0];
      const td = texData(m.map);
      const vcOn = !!m.vertexColors || !!ud.groundDetail || !!ud.treeCanopy || !!ud.treeWood || !!ud.caveRock;
      const emberK = ud.treeCanopy ? 1.6 : (ud.treeWood ? 2.6 : 0);
      const additive = m.blending === THREE.AdditiveBlending || m.blending === 2;
      const isWater = !!(o.userData && o.userData.water) && !!opts.shadeWater;
      const transparent = isWater || (!!m.transparent && (opacity < 0.999 || additive || !!td));
      const wdA = isWater ? o.geometry.attributes.wdepth : null, wfA = isWater ? o.geometry.attributes.wflow : null;
      const wp = [];
      for (let i = 0; i < pos.count; i++) { vA.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(o.matrixWorld); wp.push([vA.x, vA.y, vA.z]); }
      const n = idx ? idx.count : pos.count;
      for (let k = 0; k < n; k += 3) {
        const a = idx ? idx.getX(k) : k, b = idx ? idx.getX(k + 1) : k + 1, c = idx ? idx.getX(k + 2) : k + 2;
        if (!wp[a] || !wp[b] || !wp[c]) continue;
        const t = { p: [wp[a], wp[b], wp[c]], uv: uv ? [[uv.getX(a), uv.getY(a)], [uv.getX(b), uv.getY(b)], [uv.getX(c), uv.getY(c)]] : null,
          vc: col ? [[col.getX(a), col.getY(a), col.getZ(a)], [col.getX(b), col.getY(b), col.getZ(b)], [col.getX(c), col.getY(c), col.getZ(c)]] : null,
          emb: (emb && emberK) ? [emb.getX(a), emb.getX(b), emb.getX(c)] : null, emberK,
          gd: (ud.groundDetail && o.geometry.attributes.gworn) ? { worn: [a, b, c].map(v => [o.geometry.attributes.gworn.getX(v), o.geometry.attributes.gworn.getY(v), o.geometry.attributes.gworn.getZ(v)]), wear: [a, b, c].map(v => o.geometry.attributes.gwear.getX(v)) } : null,
          tk: ud.treeCanopy ? 1 : (ud.treeWood ? 2 : (ud.caveRock ? 3 : 0)), base, em, td, vcOn, basic: !!m.isMeshBasicMaterial || m.constructor.name === 'MeshBasicMaterial', opacity, additive, fog: m.fog !== false,
          water: isWater ? { d: [a, b, c].map(v => wdA.getX(v)), f: [a, b, c].map(v => [wfA.getX(v), wfA.getY(v), wfA.getZ(v), wfA.getW(v)]) } : null };
        if (isWater) { t.vcOn = false; t.base = [1, 1, 1]; t.basic = false; t.opacity = 1; }
        (transparent ? ttris : tris).push(t);
      }
    });
  }
  const P = cam.pos, Tg = cam.target;
  const f = norm(sub(Tg, P)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  // Sprites become camera-facing quads.
  for (const s of sprites) {
    const m = s.m, td = texData(m.map);
    const col = m.color ? [L22(m.color.r), L22(m.color.g), L22(m.color.b)] : [1, 1, 1];
    const cx = s.c[0], cy = s.c[1];
    const corner = (qx, qy) => [s.p[0] + r[0] * (qx - cx) * s.sx + u[0] * (qy - cy) * s.sy, s.p[1] + r[1] * (qx - cx) * s.sx + u[1] * (qy - cy) * s.sy, s.p[2] + r[2] * (qx - cx) * s.sx + u[2] * (qy - cy) * s.sy];
    const A = corner(0, 0), B = corner(1, 0), C = corner(1, 1), D = corner(0, 1);
    const additive = m.blending === THREE.AdditiveBlending || m.blending === 2;
    for (const [p3, uv3] of [[[A, B, C], [[0, 0], [1, 0], [1, 1]]], [[A, C, D], [[0, 0], [1, 1], [0, 1]]]]) {
      ttris.push({ p: p3, uv: uv3, vc: null, base: col, em: [0, 0, 0], td, vcOn: false, basic: true, opacity: m.opacity == null ? 1 : m.opacity, additive, fog: m.fog !== false, sprite: true });
    }
  }
  const lin = new Float32Array(W * H * 3);
  const zb = new Float32Array(W * H).fill(Infinity);
  const bgc = bg || [0.22, 0.26, 0.24];
  for (let i = 0; i < W * H; i++) { const t = i / (W * H); for (let k = 0; k < 3; k++) lin[i * 3 + k] = L22(bgc[k] * (1 - t * 0.4)); }
  const F = (H / 2) / Math.tan((cam.fov || 30) * Math.PI / 360);
  const L = norm([0.45, 0.85, 0.5]), L2 = norm([-0.6, 0.3, -0.5]);
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  const srgb = (x) => Math.pow(Math.max(0, Math.min(1, x)), 1 / 2.2);
  function raster(t, pass) {
    const [p0, p1, p2] = t.p;
    let nrm = norm(cross(sub(p1, p0), sub(p2, p0)));
    const toCam = sub(P, p0);
    if (dot(nrm, toCam) < 0) nrm = [-nrm[0], -nrm[1], -nrm[2]];
    let shc = null;
    if (opts.physical && !t.basic) { const Ld = norm(opts.sunDir || [0.5, 0.8, 0.3]); const nd = Math.max(0, dot(nrm, Ld)) * 1.35 / Math.PI; const hy = nrm[1] * 0.5 + 0.5; const hk = 1.1 / Math.PI; shc = [nd * 1.0 + hk * (0.058 + (0.72 - 0.058) * hy), nd * 0.89 + hk * (0.09 + (0.85 - 0.09) * hy), nd * 0.67 + hk * (0.13 + (1.0 - 0.13) * hy)]; }
    const sh = t.basic ? 1 : 0.28 + 0.62 * Math.max(0, dot(nrm, L)) + 0.14 * Math.max(0, dot(nrm, L2)) + 0.08 * (nrm[1] * 0.5 + 0.5);
    const sp = t.p.map((p) => { const d = sub(p, P); const z = dot(d, f); return [W / 2 + dot(d, r) / z * F, H / 2 - dot(d, u) / z * F, z]; });
    if (sp.some((s) => s[2] < 0.05)) return;
    const minX = Math.max(0, Math.floor(Math.min(sp[0][0], sp[1][0], sp[2][0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(sp[0][0], sp[1][0], sp[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(sp[0][1], sp[1][1], sp[2][1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(sp[0][1], sp[1][1], sp[2][1])));
    const area = (sp[1][0] - sp[0][0]) * (sp[2][1] - sp[0][1]) - (sp[2][0] - sp[0][0]) * (sp[1][1] - sp[0][1]);
    if (Math.abs(area) < 1e-9) return;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((sp[1][0] - px) * (sp[2][1] - py) - (sp[2][0] - px) * (sp[1][1] - py)) / area;
      const w1 = ((sp[2][0] - px) * (sp[0][1] - py) - (sp[0][0] - px) * (sp[2][1] - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-4 || w1 < -1e-4 || w2 < -1e-4) continue;
      const iz = w0 / sp[0][2] + w1 / sp[1][2] + w2 / sp[2][2];
      const z = 1 / iz;
      const id = y * W + x;
      if (z >= zb[id]) continue;
      const a = [w0 / sp[0][2] * z, w1 / sp[1][2] * z, w2 / sp[2][2] * z];
      let cr = t.base[0], cg = t.base[1], cb = t.base[2], alpha = t.opacity;
      if (t.vcOn && t.vc) {
        let vr = t.vc[0][0] * a[0] + t.vc[1][0] * a[1] + t.vc[2][0] * a[2], vg = t.vc[0][1] * a[0] + t.vc[1][1] * a[1] + t.vc[2][1] * a[2], vb = t.vc[0][2] * a[0] + t.vc[1][2] * a[1] + t.vc[2][2] * a[2];
        if (opts.physical) { vr = L22(vr); vg = L22(vg); vb = L22(vb); }
        cr *= vr; cg *= vg; cb *= vb;
      }
      if (opts.shade && t.gd) { const wx = t.p[0][0] * a[0] + t.p[1][0] * a[1] + t.p[2][0] * a[2], wz = t.p[0][2] * a[0] + t.p[1][2] * a[1] + t.p[2][2] * a[2]; const wn = [0, 1, 2].map(ch => L22(t.gd.worn[0][ch] * a[0] + t.gd.worn[1][ch] * a[1] + t.gd.worn[2][ch] * a[2])); const we = t.gd.wear[0] * a[0] + t.gd.wear[1] * a[1] + t.gd.wear[2] * a[2]; const res = opts.shade(wx, wz, z, [cr, cg, cb], wn, we); cr = res[0]; cg = res[1]; cb = res[2]; }
      if (opts.shadeTree && t.tk) { const wx = t.p[0][0] * a[0] + t.p[1][0] * a[1] + t.p[2][0] * a[2], wy = t.p[0][1] * a[0] + t.p[1][1] * a[1] + t.p[2][1] * a[2], wz = t.p[0][2] * a[0] + t.p[1][2] * a[1] + t.p[2][2] * a[2]; if (t.vc) { const vv = [0,1,2].map(ch => t.vc[0][ch] * a[0] + t.vc[1][ch] * a[1] + t.vc[2][ch] * a[2]); window.__vcLum = (vv[0] + vv[1] + vv[2]) / 3; } const k = opts.shadeTree(t.tk, wx, wy, wz, nrm, z); cr *= k; cg *= k; cb *= k; }
      if (t.water) {
        const wx = t.p[0][0] * a[0] + t.p[1][0] * a[1] + t.p[2][0] * a[2], wy = t.p[0][1] * a[0] + t.p[1][1] * a[1] + t.p[2][1] * a[2], wz = t.p[0][2] * a[0] + t.p[1][2] * a[1] + t.p[2][2] * a[2];
        const dd = t.water.d[0] * a[0] + t.water.d[1] * a[1] + t.water.d[2] * a[2];
        const ff = [0, 1, 2, 3].map(ch => t.water.f[0][ch] * a[0] + t.water.f[1][ch] * a[1] + t.water.f[2][ch] * a[2]);
        const res = opts.shadeWater(wx, wy, wz, dd, ff, P);
        cr = L22(res[0]); cg = L22(res[1]); cb = L22(res[2]); alpha = res[3];
      }
      if (t.td && t.uv) {
        const tu = (t.uv[0][0] * a[0] + t.uv[1][0] * a[1] + t.uv[2][0] * a[2]) * t.td.rx, tv = (t.uv[0][1] * a[0] + t.uv[1][1] * a[1] + t.uv[2][1] * a[2]) * t.td.ry;
        const s4 = samp(t.td, tu, tv);
        cr *= L22(s4[0]); cg *= L22(s4[1]); cb *= L22(s4[2]); alpha *= s4[3];
      }
      const s0 = shc ? shc[0] : sh, s1 = shc ? shc[1] : sh, s2 = shc ? shc[2] : sh;
      let orr = cr * s0 + t.em[0], og = cg * s1 + t.em[1], ob = cb * s2 + t.em[2];
      if (t.emb) { const e = (t.emb[0] * a[0] + t.emb[1] * a[1] + t.emb[2] * a[2]) * t.emberK * (t.tk === 2 && opts.shadeTree ? (window.__crack || 1) : 1); orr += e * 1.0; og += e * 0.36; ob += e * 0.07; }
      let fk = 0;
      if (opts.fog && t.fog) fk = Math.max(0, Math.min(1, (z - opts.fog[3]) / (opts.fog[4] - opts.fog[3])));
      if (pass === 0) {
        if (opts.fog) { orr += (opts.fog[0] - orr) * fk; og += (opts.fog[1] - og) * fk; ob += (opts.fog[2] - ob) * fk; }
        zb[id] = z;
        lin[id * 3] = orr; lin[id * 3 + 1] = og; lin[id * 3 + 2] = ob;
      } else if (t.additive) {
        const k = alpha * (1 - fk);
        lin[id * 3] += orr * k; lin[id * 3 + 1] += og * k; lin[id * 3 + 2] += ob * k;
      } else {
        if (opts.fog) { orr += (opts.fog[0] - orr) * fk; og += (opts.fog[1] - og) * fk; ob += (opts.fog[2] - ob) * fk; }
        lin[id * 3] += (orr - lin[id * 3]) * alpha; lin[id * 3 + 1] += (og - lin[id * 3 + 1]) * alpha; lin[id * 3 + 2] += (ob - lin[id * 3 + 2]) * alpha;
      }
    }
  }
  for (const t of tris) raster(t, 0);
  const depthOf = (t) => { const c = [(t.p[0][0] + t.p[1][0] + t.p[2][0]) / 3, (t.p[0][1] + t.p[1][1] + t.p[2][1]) / 3, (t.p[0][2] + t.p[1][2] + t.p[2][2]) / 3]; return dot(sub(c, P), f); };
  ttris.sort((a, b) => depthOf(b) - depthOf(a));
  for (const t of ttris) raster(t, 1);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(W, H);
  for (let i = 0; i < W * H; i++) { img.data[i * 4] = srgb(lin[i * 3]) * 255; img.data[i * 4 + 1] = srgb(lin[i * 3 + 1]) * 255; img.data[i * 4 + 2] = srgb(lin[i * 3 + 2]) * 255; img.data[i * 4 + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  return { url: cv.toDataURL('image/png'), tris: tris.length + ttris.length };
};
