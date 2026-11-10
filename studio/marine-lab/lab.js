// CC-340 (Claude 3): the marine lab. The marine's body (studio/marine-body.js) and head (ui/marine-face.js) built
// outside the game, the way makeMarine (index.html) assembles them, with stand-in materials of the game's colours, so
// a change to the body or the head can be looked at in seconds instead of a game load. It is a working tool, not
// the judge: every round is still checked in the game itself (the inspector, tools/camera.mjs).
// Driven by tools/marine-lab.mjs (window.LAB.shot(view)), or opened at studio/marine-lab/index.html.
import * as THREE from '../../vendor/three/three.webgpu.js';
import { rbox } from '../../core/geometry.js';
import { buildMarineBody } from '../marine-body.js';
import { buildMarineHats } from '../marine-hats.js';
import { buildMarineHelmet, fitMarineHelmetParts } from '../marine-headgear.js';
import { buildMarineEyewear } from '../../ui/marine-eyewear.js';
import * as FACE from '../../ui/marine-face.js';

const q = new URLSearchParams(location.search);
const mat = (color, rough = .85, metal = 0) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
const addCast = (m) => { m.castShadow = m.receiveShadow = true; return m; };
const put = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; };
const rmesh = (w, h, d, m, r) => addCast(new THREE.Mesh(rbox(w, h, d, r), m));
const cyl = (rt, rb, h, m, seg = 10) => addCast(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m));

export function buildLabMarine(opt = {}) {
  const g = new THREE.Group();
  const camo = mat(0x6b6a45, .92), trouser = mat(0x66654a, .92), boot = mat(0x2a2520, .7), sole = mat(0x161412, .9);
  const glove = mat(0x2a2a26, .8), belt = mat(0x2b2e24, .9), strapMat = mat(0x2b2e24, .9), buckleMat = mat(0x7a7c74, .45, .6);
  const padMat = mat(0x3a3f33, .85), pouch = mat(0x4f5038, .9), carrier = mat(0x5d5c40, .9), pack = mat(0x4a5538, .9);
  const skinW = mat(0xc4a882, .78), hairW = mat(0x3a2c1e, .95), irisW = mat(0x3a2c1e, .5), maskW = mat(0x81613c, .78);
  const capW = mat(0x6b6a45, .9), capBandW = mat(0x4a5538, .9), shellW = mat(0x6b6a45, .9), helmetMat = mat(0x3d4030, .7);
  const nvgMat = mat(0x1d1f1c, .6, .3), patchMat = mat(0x5a5a48, .9), patchInk = mat(0x1a1a1a, .9), webMat = mat(0x34372a, .9);
  const leatherMat = mat(0x3a2a1c, .7), laceMat = mat(0x222018, .9), sockMat = mat(0x3a3a32, .95);
  const dress = { hats: {}, eyes: {}, sleeveDown: [], sleeveRolled: [], legLong: [], legShort: [], gloveOn: [], handBare: [], mats: { skin: skinW, hair: hairW, iris: irisW } };
  const part = (parent, list) => { const grp = new THREE.Group(); parent.add(grp); if (list) list.push(grp); return grp; };
  const B = buildMarineBody(THREE, {
    root: g, put, rmesh, cyl, part, dress, pgbPatch: null,
    mats: { uniformW: camo, trouserW: trouser, bootW: boot, soleW: sole, gloveW: glove, beltW: belt, holsterW: pouch,
      carrierW: carrier, carrierPouchW: pouch, packW: pack, packTrimW: pack, padW: padMat, plateW: padMat, skinW,
      strapMat, buckleMat, padMat, camoOD: capBandW, pouchMat: pouch, leatherMat, patchMat, patchInk, webMat, nvgMat, laceMat, sockMat }
  });
  const TORSO_PIVOT_Y = .7, HEAD_PIVOT_Y = 1.22;
  // makeMarine's head (index.html), as it is assembled there
  const headG = new THREE.Group();
  const hs = FACE.HEAD_GROUP_SCALE || [.94, .97, .94];
  headG.scale.set(...hs);
  headG.position.set(0, HEAD_PIVOT_Y - (B.torsoPivotY || TORSO_PIVOT_Y), 0); B.torsoG.add(headG);
  const hAdd = (mesh, x, y, z) => { mesh.position.set(x, y - HEAD_PIVOT_Y, z); headG.add(mesh); return mesh; };
  if (!FACE.HEAD_GROUP_SCALE || opt.oldNeck) hAdd(cyl(0.065, 0.085, 0.13, skinW, 10), 0, 1.24, 0);   // CC-340: the neck is the head's own now
  headG.add(FACE.buildMarineHead(THREE, skinW, { lite: !!opt.lite }));
  const bare = new THREE.Group(); headG.add(bare); bare.add(FACE.buildMarineHair(THREE, hairW));
  const hatG = new THREE.Group(); hatG.position.y = -HEAD_PIVOT_Y; headG.add(hatG);
  buildMarineHats(THREE, { hatG, part, dress, mats: { capW, capBandW, patchInk, strapMat }, addCast, rmesh, cyl, put });
  const helmet = [];
  buildMarineHelmet(THREE, { add: (m, x, y, z) => { hAdd(m, x, y, z); helmet.push(m); return m; }, mesh: (geo, m) => addCast(new THREE.Mesh(geo, m)),
    mats: { shellW, helmetMat, nvgMat, strapMat, pouchMat: pouch, buckleMat } });
  fitMarineHelmetParts(THREE, helmet, HEAD_PIVOT_Y);
  const skinShade = mat(0x9c7f5e, .9), scarMat = mat(0xcfb28e, .6);
  headG.add(FACE.buildMarineFeatures(THREE, { skinW, skinShade, hairW, irisW, eyeWhite: mat(0xf2eee6, .45), eyeDark: new THREE.MeshBasicMaterial({ color: 0x0a0a0a }), glint: new THREE.MeshBasicMaterial({ color: 0xffffff }), scarMat, lite: !!opt.lite }));
  const bala = FACE.buildBalaclava(THREE, maskW); headG.add(bala);
  if (opt.beard) headG.add(FACE.buildSurvivorBeard(THREE, hairW, { lite: !!opt.lite }));
  const eyeG = new THREE.Group(); eyeG.position.y = -HEAD_PIVOT_Y; headG.add(eyeG);
    dress.eyes.none = part(eyeG);
  try { buildMarineEyewear(THREE, { mats: { gold: mat(0xc9a85c,.3,.85), aviLens: mat(0x3a4a3a,.08,.8), viperFrame: mat(0xeeeeea,.35), viperLens: mat(0x7a2fa0,.08,.9), wayFrame: mat(0x0e0e0e,.28), wayLens: mat(0x151a1c,.1,.6), gogFrame: mat(0x7d6d4f,.7), gogLens: mat(0x2a2e30,.1,.65), gogStrap: mat(0x6f6247,.9), sock: sockMat }, group: (style) => (dress.eyes[style] = part(eyeG)), mesh: (geo, m) => addCast(new THREE.Mesh(geo, m)) }); } catch (e) { console.warn('eyewear', e); }
  // the default kit: cover on, sleeves down, trousers long, gloves on, no armour
  const show = (lists, on) => lists.forEach((x) => (x.visible = on));
  const kit = { hat: opt.hat ?? 'cover', helmet: !!opt.helmet, vest: !!opt.vest, mask: opt.mask ?? true, eyes: opt.eyes ?? 'none', rolled: !!opt.rolled, shorts: !!opt.shorts, gloves: opt.gloves ?? true, hair: opt.hair ?? true };
  for (const [k, h] of Object.entries(dress.hats)) h.visible = !kit.helmet && k === kit.hat;
  for (const [k, e] of Object.entries(dress.eyes)) e.visible = k === kit.eyes;
  show(helmet, kit.helmet);
  for (const [k, list] of Object.entries(B.gearParts)) for (const m of list) m.visible = k === 'helmet' ? kit.helmet : k === 'vest' ? kit.vest : k === 'bareTorso' ? !kit.vest : k === 'bareHead' ? !kit.helmet : k === 'pads' ? !!opt.pads : k === 'nvg' ? false : false;
  hatG.visible = !kit.helmet;
  bala.visible = kit.mask; bare.visible = kit.hair;
  show(dress.sleeveDown, !kit.rolled); show(dress.sleeveRolled, kit.rolled);
  show(dress.legLong, !kit.shorts); show(dress.legShort, kit.shorts);
  show(dress.gloveOn, kit.gloves); show(dress.handBare, !kit.gloves);
  if (opt.head) headG.rotation.set(...opt.head);
  g.userData = { ...B, headG, hatG, dress, kit };
  return g;
}

// Poses for looking at anatomy: 'game' (makeMarine's rest), 'a' (arms down at 40 degrees), 't' (arms out).
export function pose(g, name) {
  const u = g.userData;
  if (name === 'a' || name === 't') {
    const out = name === 'a' ? .62 : 1.45;
    u.armLG.rotation.set(0, 0, -out); u.armRG.rotation.set(0, 0, out);
    u.elbowLG.rotation.set(-.12, 0, 0); u.elbowRG.rotation.set(-.12, 0, 0);
  }
}

let renderer, scene, camera, marine;
export function setBody(name) { }
export async function init() {
  renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: true });
  const W = +(q.get('w') || 900), H = +(q.get('h') || 900);
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement); await renderer.init();
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x8d939a);
  camera = new THREE.PerspectiveCamera(30, W / H, .02, 50);
  scene.add(new THREE.HemisphereLight(0xdfe6ee, 0x4a4436, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2dc, 2.4); sun.position.set(2.5, 4, 3); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -1.2, right: 1.2, top: 2, bottom: -.2, near: .5, far: 12 }); sun.shadow.bias = -.0004; scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d4ff, .6); fill.position.set(-3, 2, -2); scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat(0x5a5e58, .95)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  window.LAB = { THREE, scene, camera, renderer, build, shot, measure };
}
export function build(opt = {}) {
  if (marine) scene.remove(marine);
  marine = buildLabMarine(opt); pose(marine, opt.pose || 'game'); scene.add(marine);
  marine.updateMatrixWorld(true);
  // cloth meshes follow their bones before each draw (liveCloth's onBeforeRender)
  return measure();
}
// views: yaw in degrees (0: his front), the look point's height, the distance
export async function shot({ yaw = 0, pitch = 0, y = .85, dist = 3.6, fov = 30 } = {}) {
  const a = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
  camera.fov = fov; camera.updateProjectionMatrix();
  camera.position.set(Math.sin(a) * Math.cos(p) * dist, y + Math.sin(p) * dist, Math.cos(a) * Math.cos(p) * dist);
  camera.lookAt(0, y, 0);
  await renderer.renderAsync(scene, camera);
  await renderer.renderAsync(scene, camera);
  return renderer.domElement.toDataURL('image/png');
}
export function measure() {
  const box = new THREE.Box3(), out = {};
  marine.updateMatrixWorld(true);
  box.setFromObject(marine); out.height = box.max.y - box.min.y; out.width = box.max.x - box.min.x;
  const head = new THREE.Box3();
  marine.userData.headG.traverse((o) => { if (o.isMesh && o.visible && /head|marine-shaped/.test(o.name)) head.expandByObject(o); });
  out.head = { h: head.max.y - head.min.y, w: head.max.x - head.min.x, d: head.max.z - head.min.z, top: head.max.y, chin: head.min.y };
  return out;
}
