// combat/training-wreck.js - CB-250 (Jerry's J120 and J122, 9 Nov playtest). J120: "If you shoot a target with a flamethrower,
// the target should burn up and turn to a pile of ash. The player will no longer be able to use the range computer. He can
// still free shoot other targets he has yet to burn." J122: "Grenade launcher needs to blow range targets to pieces. The
// player will not longer be able to use the range computer."
//
// A Training Ground plate that the flamer or a launcher shell takes is wrecked for the rest of the visit: a flamed plate
// burns (it blackens, flames lick it, embers go up) and sinks into a pile of ash on its stand; a plate in a shell's blast
// breaks into pieces that fly off from the blast and lie on the floor. A wrecked lane is out (state 'wrecked': the hinge
// update leaves it, world/training-ballistics.js traceTraining skips every target that is not 'up', so rounds and flames
// pass through where it stood, and hitTarget refuses it); the others still free-shoot. While any lane is wrecked the range
// computer is dead (any(): index.html will not open it). enterTraining clears all of it (tg.resetTargets puts the plates
// up; clear() brings back the hinge, the plate's own material and removes the ash and the pieces).
//
// `T` is three.js; `tg` the Training Ground (world/training.js); `fx` is the game's: { embers(x, y, z, n, s) and
// sound(kind, x, y, z), world metres }, both optional. Only the five original lanes can be wrecked (a drill's bank is not).

const BURN_S = 2.4, SINK_FROM = 1.5, ASH_GLOW_S = 7;
const GRAVITY = 9.8, PIECES = 9, STAND_TOP = 0.23;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ease = (u) => u * u * (3 - 2 * u);

export function createTrainingWreck(T, tg, fx = {}) {
  const base = tg.targets.length;
  const lanes = new Map();   // index -> a lane's record (see begin)
  const shared = [];         // what every lane uses: the flame texture and quad, the ash cone, the pieces' steel
  let flameMat = null, flameGeo = null, ashMat0 = null, ashGeo = null, pieceMat = null;
  const _v = new T.Vector3();

  function makeShared() {
    if (flameMat) return;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d'), g = c.createRadialGradient(32, 40, 2, 32, 36, 30);
    g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(0.35, 'rgba(255,150,40,0.85)'); g.addColorStop(0.75, 'rgba(200,50,10,0.35)'); g.addColorStop(1, 'rgba(120,20,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    const tex = new T.CanvasTexture(cv);
    flameMat = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    flameGeo = new T.PlaneGeometry(1, 1);
    ashMat0 = new T.MeshStandardMaterial({ color: 0x4a4743, roughness: 1, metalness: 0, emissive: 0xff4a10, emissiveIntensity: 0.9 });
    ashGeo = new T.ConeGeometry(0.4, 0.17, 9, 1);
    pieceMat = new T.MeshStandardMaterial({ color: 0x2c2d2a, roughness: 0.7, metalness: 0.6, side: T.DoubleSide });
    shared.push(tex, flameMat, flameGeo, ashMat0, ashGeo, pieceMat);
  }
  function worldXYZ(lane) { _v.set(lane.centre.x, lane.centre.y, lane.centre.z); lane.root.localToWorld(_v); return [_v.x, _v.y, _v.z]; }
  function makeAsh(lane, size) {
    lane.ashMat = ashMat0.clone(); lane.own.push(lane.ashMat);
    const a = new T.Mesh(ashGeo, lane.ashMat);
    a.scale.set(size, size * 0.9, size); a.position.set(0, STAND_TOP + 0.085 * size, 0);
    lane.root.add(a); lane.ash = a; lane.ashT = 0;
  }

  function begin(index, kind, from) {
    const t = tg.targets[index];
    if (!t || index >= base || lanes.has(index) || t.state !== 'up') return false;
    const root = t.pivot.parent;
    if (!root) return false;
    makeShared();
    t.state = 'wrecked'; t.t = 0;
    const lane = { kind, t: 0, root, pivot: t.pivot, plate: t.plate, mat0: t.plate.material, mat: null, ash: null, ashMat: null, ashT: 0, flames: [], pieces: [], own: [], emberT: 0 };
    lanes.set(index, lane);
    const w = t.box.maxX - t.box.minX, h = t.box.maxY - t.box.minY;   // the plate's size (its box is the upright plate)
    t.plate.updateWorldMatrix(true, false); t.plate.getWorldPosition(_v);
    lane.centre = root.worldToLocal(_v.clone());   // the plate's middle in the stand's frame
    if (kind === 'burn') {
      lane.mat = t.plate.material.clone(); lane.own.push(lane.mat); t.plate.material = lane.mat;   // the plates share one material
      for (let k = 0; k < 5; k++) {
        for (const ry of [0, Math.PI / 2]) {
          const m = new T.Mesh(flameGeo, flameMat); m.rotation.y = ry; m.renderOrder = 4;
          m.userData = { ox: (k - 2) * w * 0.2 + (Math.random() - 0.5) * 0.06, oy: (Math.random() - 0.3) * h * 0.55, ph: Math.random() * 6.28, sz: 0.38 + Math.random() * 0.22 };
          root.add(m); lane.flames.push(m);
        }
      }
      fx.sound?.('ignite', ...worldXYZ(lane));
    } else {
      const f = from ? root.worldToLocal(new T.Vector3(from.x, from.y, from.z)) : new T.Vector3(lane.centre.x, lane.centre.y, lane.centre.z - 2);
      t.pivot.visible = false;
      for (let k = 0; k < PIECES; k++) {
        const pw = 0.12 + Math.random() * 0.22, ph = 0.1 + Math.random() * 0.2;
        const geo = new T.BoxGeometry(pw, ph, 0.025); lane.own.push(geo);
        const m = new T.Mesh(geo, pieceMat);
        const x = lane.centre.x + (Math.random() - 0.5) * w * 0.8, y = lane.centre.y + (Math.random() - 0.5) * h * 0.8, z = lane.centre.z;
        m.position.set(x, y, z); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        let dx = x - f.x, dz = z - f.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
        const sp = 1.4 + Math.random() * 2.6;   // pieces land within a few metres of the stand
        root.add(m);
        lane.pieces.push({ m, vx: dx * sp + (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 3.4, vz: dz * sp + (Math.random() - 0.5) * 1.6,
          wx: (Math.random() - 0.5) * 16, wy: (Math.random() - 0.5) * 16, wz: (Math.random() - 0.5) * 16, rest: false, hw: Math.max(pw, ph) / 2 });
      }
      fx.embers?.(...worldXYZ(lane), 22, 1.2);
      fx.sound?.('shatter', ...worldXYZ(lane));
    }
    return true;
  }

  function update(dt) {
    for (const [index, lane] of lanes) {
      const t = tg.targets[index];
      if (t && t.state !== 'wrecked') { t.state = 'wrecked'; if (lane.kind === 'blow') t.pivot.visible = false; }   // a reset must not bring it back
      lane.t += dt;
      if (lane.kind === 'burn') burnStep(lane, dt, t); else pieceStep(lane, dt);
      if (lane.ash) { lane.ashT += dt; lane.ashMat.emissiveIntensity = 0.9 * (1 - clamp01(lane.ashT / ASH_GLOW_S)); }   // the cinders cool
    }
  }
  function burnStep(lane, dt, t) {
    if (lane.t < BURN_S) {
      // Blackening, glow, flames, embers; from SINK_FROM the plate sinks into the ash that grows under it.
      const burnU = clamp01(lane.t / SINK_FROM);
      lane.mat.color.setRGB(1 - 0.92 * burnU, 1 - 0.95 * burnU, 1 - 0.96 * burnU);
      if (lane.mat.emissive) { lane.mat.emissive.setRGB(1, 0.32, 0.05); lane.mat.emissiveIntensity = 0.85 * Math.sin(burnU * Math.PI) + 0.1; }
      const grow = lane.t < SINK_FROM ? Math.min(1, lane.t / 0.35) : 1 - clamp01((lane.t - SINK_FROM) / (BURN_S - SINK_FROM));
      lane.flames.forEach((m, k) => {
        const d = m.userData, flick = 0.75 + 0.25 * Math.sin(lane.t * 17 + d.ph) + 0.15 * Math.sin(lane.t * 31 + d.ph * 2);
        const sz = d.sz * grow * flick;
        m.position.set(lane.centre.x + d.ox, lane.centre.y + d.oy + sz * 0.35, lane.centre.z + (k % 2 ? 0.04 : -0.04));
        m.scale.set(sz * 0.8, sz * 1.5, 1);
      });
      lane.emberT -= dt;
      if (lane.emberT <= 0) { lane.emberT = 0.1; fx.embers?.(...worldXYZ(lane), 3, 1.0); }
      if (lane.t > SINK_FROM) {
        const s = ease(clamp01((lane.t - SINK_FROM) / (BURN_S - SINK_FROM)));
        lane.pivot.scale.y = Math.max(0.001, 1 - s);
        if (!lane.ash) makeAsh(lane, 0.25);
        const size = 0.25 + 0.75 * s;
        lane.ash.scale.set(size, size * 0.9, size); lane.ash.position.y = STAND_TOP + 0.085 * size;
      }
    } else if (lane.flames.length || lane.pivot.visible) {
      // Done: the plate is ash.
      for (const m of lane.flames) m.parent?.remove(m);
      lane.flames.length = 0;
      lane.pivot.visible = false; lane.pivot.scale.y = 1;
      if (t) t.plate.material = lane.mat0;
      if (!lane.ash) makeAsh(lane, 1);
      lane.ash.scale.set(1, 0.9, 1); lane.ash.position.y = STAND_TOP + 0.085;
      fx.embers?.(...worldXYZ(lane), 6, 0.8);
    }
  }
  function pieceStep(lane, dt) {
    const s = Math.min(dt, 0.05);
    for (const p of lane.pieces) {
      if (p.rest) continue;
      p.vy -= GRAVITY * s;
      const drag = Math.exp(-1.1 * s); p.vx *= drag; p.vz *= drag;
      p.m.position.x += p.vx * s; p.m.position.y += p.vy * s; p.m.position.z += p.vz * s;
      p.m.rotation.x += p.wx * s; p.m.rotation.y += p.wy * s; p.m.rotation.z += p.wz * s;
      if (p.m.position.y < p.hw * 0.4 + 0.01) {   // the floor (the stand's frame is at floor level)
        p.m.position.y = p.hw * 0.4 + 0.01;
        if (Math.abs(p.vy) < 1.6) { p.rest = true; p.m.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4; p.m.rotation.z = Math.random() * 6; continue; }
        p.vy *= -0.32; p.vx *= 0.6; p.vz *= 0.6; p.wx *= 0.5; p.wy *= 0.5; p.wz *= 0.5;
      }
    }
  }

  function clear() {
    for (const [index, lane] of lanes) {
      const t = tg.targets[index];
      for (const m of lane.flames) m.parent?.remove(m);
      for (const p of lane.pieces) p.m.parent?.remove(p.m);
      if (lane.ash) lane.ash.parent?.remove(lane.ash);
      if (t) { t.pivot.visible = true; t.pivot.scale.y = 1; t.plate.material = lane.mat0; if (t.state === 'wrecked') t.state = 'up'; }
      for (const o of lane.own) o.dispose?.();
    }
    lanes.clear();
  }
  function dispose() {
    clear();
    for (const o of shared) o.dispose?.();
    shared.length = 0; flameMat = flameGeo = ashMat0 = ashGeo = pieceMat = null;
  }

  return {
    // The flamer ('burn') or a launcher shell ('blow', `from` the blast's middle, world) takes lane `index`: false when it
    // is not up (already wrecked, falling, down), or not one of the five original lanes.
    take: (index, kind, from) => begin(index, kind === 'blow' ? 'blow' : 'burn', from),
    isWrecked: (index) => lanes.has(index),
    any: () => lanes.size > 0,
    count: () => lanes.size,
    update, clear, dispose,
    debug: () => [...lanes].map(([index, l]) => ({
      index, kind: l.kind, t: l.t, ash: !!l.ash, ashSize: l.ash ? l.ash.scale.x : 0, flames: l.flames.length, pieces: l.pieces.length,
      resting: l.pieces.filter((p) => p.rest).length, p0: l.pieces[0] ? { y: +l.pieces[0].m.position.y.toFixed(2), x: +l.pieces[0].m.position.x.toFixed(2), z: +l.pieces[0].m.position.z.toFixed(2), vy: +l.pieces[0].vy.toFixed(2), rest: l.pieces[0].rest } : null, plateVisible: l.pivot.visible, plateColor: l.mat ? l.mat.color.r : null,
    })),
  };
}
