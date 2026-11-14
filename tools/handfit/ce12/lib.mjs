// CE-12 job helpers (page side via ev)
export async function equip(ev, key, opts = {}) {
  return ev(async ({ key, opts }) => {
    const T = TT; window.__held = false; window.__dt = null; T.setShotView(null);
    if (opts.akimbo != null) { /* left as is */ }
    const i = T.WEAPON_ORDER.indexOf(key);
    for (let k = 0; k < 40 && T.getCurrentWeapon() !== key; k++) { T.setWeapon(i); await new Promise((r) => setTimeout(r, 300)); }
    if (T.isUnarmed()) T.toggleHolster();
    await window.__sim(opts.settle ?? 2.5);
    return { cur: T.getCurrentWeapon(), unarmed: T.isUnarmed() };
  }, { key, opts });
}
// close views around the hands, offsets in the player's own frame (+z forward, +x his left, +y up)
export const CLOSE = {
  right: { d: [-0.42, 0.16, 0.42], fov: 32 }, left: { d: [0.42, 0.16, 0.42], fov: 32 },
  front: { d: [-0.15, 0.05, 0.75], fov: 30 }, fl: { d: [0.36, 0.34, 0.5], fov: 32 }, cl: { d: [0.36, 0.26, 0.42], fov: 30 }, cb: { d: [0.26, -0.4, 0.32], fov: 30 }, cu: { d: [0.08, 0.58, 0.06], fov: 30 }, fr: { d: [-0.36, 0.34, 0.5], fov: 32 }, top: { d: [-0.05, 0.6, -0.1], fov: 30 }, below: { d: [-0.2, -0.45, 0.35], fov: 30 },
  wide: { d: [-1.7, 0.4, 1.7], fov: 34, body: true }, back: { d: [-0.9, 0.9, -2.6], fov: 34, body: true },
};
export async function view(ev, name, focus = 'mid') {
  return ev(({ name, C, focus }) => {
    const T = TT, H = T.handsDbg, THREE = T.THREE;
    if (name === 'game') { T.setShotView(null); return 'game'; }
    const gr = H.gripPoint('R'), gl = H.gripPoint('L');
    let m = focus === 'r' ? gr : focus === 'l' ? gl : gr.clone().add(gl).multiplyScalar(0.5);
    // his frame from the facing (the aim yaw): fwd = toward the aim point, left = up x fwd
    const p = T.player.position, a = T.aimTarget;
    const ry = T.player.rotation.y, fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), up = new THREE.Vector3(0, 1, 0), left = new THREE.Vector3().crossVectors(up, fwd);
    if (name === 'game2x') {   // the game camera's eye, framed on him (the right-click 2x zoom's look, tighter)
      const c = window.__gameEye || (window.__gameEye = T.inspectHost().camera.position.clone());
      const t = p.clone().add(new THREE.Vector3(0, 1.0, 0));
      T.setShotView({ x: c.x, y: c.y, z: c.z, tx: t.x, ty: t.y, tz: t.z, fov: 7 }); return name;
    }
    const V = C[name];
    if (V.body) m = p.clone().add(new THREE.Vector3(0, 1.0, 0));
    const d = new THREE.Vector3().addScaledVector(left, V.d[0]).addScaledVector(up, V.d[1]).addScaledVector(fwd, V.d[2]);
    T.setShotView({ x: m.x + d.x, y: m.y + d.y, z: m.z + d.z, tx: m.x, ty: m.y, tz: m.z, fov: V.fov });
    return name;
  }, { name, C: CLOSE, focus });
}
export const frames = (ev, n = 3) => ev(async (n) => { const T = TT; const was = window.__held; window.__held = true; await new Promise((r) => setTimeout(r, 400 * n)); window.__held = was; }, n);
// pose under the game camera, then freeze the sim and move only the camera for each view
export async function freezeShots(ev, shot, prefix, views, { settle = 0.8, light = null } = {}) {
  const out = [];
  await ev(() => { TT.setShotView(null); window.__held = false; });
  if (settle > 0) await ev((s) => window.__sim(s), settle);
  await ev(() => { window.__gameEye = TT.inspectHost().camera.position.clone(); window.__held = true; });
  for (const v of views) {
    const [name, focus] = v.split(':');
    await view(ev, name, focus || 'mid');
    await new Promise((r) => setTimeout(r, 1800));
    out.push(await shot(`${prefix}-${name}${focus ? '-' + focus : ''}${light ? '-' + light : ''}`));
  }
  await ev(() => { TT.setShotView(null); });
  return out;
}
// an action held at key frames: start() (page code string run once), hold(u) (page code with u), views per frame
export async function actionSheet(ev, shot, prefix, { start, hold, release, us, views, settle = 0.5, arg = null }) {
  const out = [];
  await ev(() => { window.__held = false; TT.setShotView(null); });
  await ev(start, arg);
  for (const u of us) {
    await ev(hold, u);
    out.push(...await freezeShots(ev, shot, `${prefix}-u${String(u).replace('.', '')}`, views, { settle }));
    await ev(() => { window.__held = false; });
  }
  if (release) await ev(release);
  return out;
}
// the held pose in each light: views x lights (the sim frozen; only the light and the camera move)
export async function lightShots(ev, shot, prefix, views, lights = ['noon', 'overcast', 'dusk', 'night']) {
  const out = [];
  await ev(() => { window.__gameEye = window.__gameEye || TT.inspectHost().camera.position.clone(); window.__held = true; });
  for (const L of lights) {
    await ev((L) => { window.eyeLight = L; }, L);
    for (const v of views) { const [name, focus] = v.split(':'); await view(ev, name, focus || 'mid'); await new Promise((r) => setTimeout(r, 2200)); out.push(await shot(`${prefix}-${name}${focus ? '-' + focus : ''}-${L}`)); }
  }
  await ev(() => { window.eyeLight = 'noon'; TT.setShotView(null); });
  return out;
}
// tint the gloves (support red, firing blue) or put them back
export const tint = (ev, on) => ev((on) => { const T = TT, ud = T.getMarine().userData; window.__mats = window.__mats || new Map();
  if (!on) { for (const [o, m] of window.__mats) o.material = m; window.__mats.clear(); return 0; }
  const red = new T.THREE.MeshBasicMaterial({ color: 0xd02020 }), blu = new T.THREE.MeshBasicMaterial({ color: 0x2060e0 });
  for (const [e, m] of [[ud.elbowLG, red], [ud.elbowRG, blu]]) { const w = e.userData.wrist; if (w) w.traverse((o) => { if (o.isMesh) { if (!window.__mats.has(o)) window.__mats.set(o, o.material); o.material = m; } }); }
  return window.__mats.size; }, on);
