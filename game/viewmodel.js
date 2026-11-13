// game/viewmodel.js - CL-281 (J10-J17; docs/specs/first-person-1.2.md): the first-person view gun.
//
// In first person the eye used to look out of his head at his own arms and the gun they hold, so whatever the body
// did (the stride, the hold's reach, a wall in front of him) showed in the view. With a gun listed in
// game/viewmodel-poses.js the view now has its own forearms and hands (studio/fp-arms.js) on a copy of that gun,
// placed in the camera's space and drawn with their own projection (VM.fov, near 1 cm) pressed into the front of the
// depth range: in the world's one pass, lit by the world's own lights, shadows and the night's goggles, never through
// a wall. His body's arms and gun stay where they are for his shadow and are only left out of the eye's pass.
//
// The hands sit on the gun where the third-person hold has them (each wrist's place on the gun, read off his body
// while the hold is settled), the fingers as his fingers are. The forearms run from the wrists toward elbows below
// the view, the wrists bending at most VM.wristMax. On top: the sights onto the view's line (right-click), the sway
// of a turn and a strafe, the walk's bob, breathing, a landing's dip, the recoil and the slide's kick, and the reload
// worked in front of the eye (VM_RELOADS).
//
// index.html calls update(dt, state) each frame before it draws and place() in renderFrame; it asks muzzleWorld()
// where the view gun's muzzle appears (the laser leaves from there).
import { VM, VM_POSES, VM_RELOADS, VM_SOCKETS, VM_BLADES, VM_GRENADE, VM_HANDS, VM_TRIGGER, VM_CONTROLS, VM_SELECT, VM_LIGHT } from './viewmodel-poses.js';
import { SIGHT } from './sight-points.js';
import { buildViewArm, wristSpacePoint, HAND_SCALE, UPPER_ARM_LEN } from '../studio/fp-arms.js';
import { copyPose, lerpPose, HAND_POSES } from '../studio/marine-hand.js';
import { ITEM_POSES, gripPose } from '../studio/hand-grips.js';
import { handContact } from '../studio/hand-contacts.js';   // CL-334 h
import { VM_FIT } from './viewmodel-fit.js';   // CL-334 h: each gun's hands fitted to its shape (generated)
import { flippedTwin, needsFlip } from './vm-flip.js';
import { updateArtworkInstances } from '../studio/weapon-model-hooks.js';

const smooth = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ARM_CLOTH = new Set(['live-sleeve', 'live-sleeve-rolled', 'live-bare-arm']);
// CC-342 (J123): the sniper's view gun goes behind the scope's glass (index.html #scopeOverlay) at this much of the aim
const SNIPER_GLASS = 0.6;
// CC-342 (J121, the chainsaw: "The Fov should still be pulled in more and the chainsaw sit slightly lower ... Right now it
// covering the crosshairs"): a gun's own view FOV (degrees, vertical) in place of VM.fov; J88 narrowed them all (60 to 54)
const VIEW_FOV = Object.freeze({ chainsaw: 48 });
// CC-342 (J119): how far into the aim a gun's stock is put away (GB-296: 0.08 for the rest, before it can sweep into the
// sight picture); the Breacher's leaves the frame at the bottom right by itself, so it goes only once in the sights
const STOCK_AWAY = Object.freeze({ aa12: 0.9 });
// CC-342 (J123: "the transparent front end of the optic"): the NX8's two lenses (studio/weapon-optics.js, faint glass at
// 0.28 for the third person) let the eye see through the whole scope at 40 cm, the world behind its objective. In the view
// copy they are coated glass: dark, glossy, not see-through. Only the scope's; a red dot's window stays clear.
const COATED_LENSES = new Set(['50 mm objective lens', 'ocular lens']);

export function createViewmodel(ctx) {
  const { THREE: T, TSL, renderer, scene, camera, marine } = ctx;
  const weaponMeshes = ctx.weaponMeshes;
  const holdOf = (k) => (ctx.hold ? ctx.hold(k) : null);
  const V3 = () => new T.Vector3(), Q = () => new T.Quaternion(), M4 = () => new T.Matrix4();

  const root = new T.Group(); root.name = 'viewmodel'; root.visible = false; root.matrixAutoUpdate = true;
  scene.add(root);
  // AG-168 (D-75: he is left-handed; his gun hand is his anatomical left): the view shows his hold mirrored, so first
  // person reads as a traditional shooter's (J12), the gun low right, the firing hand from the right. Everything below
  // `space` is his own hold; VM.mirror flips it. The tables are written as the eye sees them (screen terms) and turned
  // into his space here (mx below).
  const MX = VM.mirror ? -1 : 1;
  const space = new T.Group(); space.name = 'vm-space'; space.scale.set(MX, 1, 1); root.add(space);
  const gunHolder = new T.Group(); gunHolder.name = 'vm-gun'; space.add(gunHolder);
  // CL-301 (Jerry, 3 Nov: the akimbo pistols in first person were one big pistol at the bottom left and no hands): a pair
  // has its second gun (the off hand's, ctx.offhand) here, in the left hand: the right hand's hold mirrored across the view.
  const gunHolder2 = new T.Group(); gunHolder2.name = 'vm-gun-2'; space.add(gunHolder2);
  const bladeHolder = new T.Group(); bladeHolder.name = 'vm-blade'; space.add(bladeHolder);   // CL-307: the knife in the firing hand
  const grenadeHolder = new T.Group(); grenadeHolder.name = 'vm-grenade'; space.add(grenadeHolder);   // CL-307: the grenade in the support hand
  // AG-168 v2: on the WebGPU backend the mirror drew everything below `space` inside out (r175 doesn't flip the front
  // face for a mirrored mesh; game/vm-flip.js). There each mesh below it draws a twin of its geometry wound the other way.
  const FLIP = needsFlip(renderer, MX < 0);
  const geoOf = (g) => (FLIP && g ? flippedTwin(T, g) : g);
  const flipMeshes = (o) => { if (FLIP) o.traverse((m) => { if (m.isMesh && m.geometry) m.geometry = geoOf(m.geometry); }); };

  // --- the projection: in the materials' vertex stage when the renderer has node materials ---------------------
  const zMin = renderer && renderer.coordinateSystem === 2000 ? -1 : 0;   // WebGL clip z runs -w..w, WebGPU 0..w
  const projU = TSL && typeof TSL.uniform === 'function' ? TSL.uniform(new T.Matrix4()) : null;
  const canHack = !!(projU && TSL.positionView && typeof TSL.vec4 === 'function' && renderer && renderer.library && typeof renderer.library.fromMaterial === 'function');
  const proj = { fov: VM.fov, aspect: 1, e: new Float32Array(16) };
  function vmMVP() {
    const c = projU.mul(TSL.positionView);
    return TSL.vec4(c.x, c.y, c.z.sub(c.w.mul(zMin)).mul(VM.depth).add(c.w.mul(zMin)), c.w);
  }
  function updateProjection(fov) {
    const aspect = camera.aspect || 1, n = VM.near, f = VM.far, t = Math.tan(fov * Math.PI / 360);
    proj.fov = fov; proj.aspect = aspect;
    const e = proj.e; e.fill(0);
    e[0] = 1 / (aspect * t); e[5] = 1 / t; e[11] = -1;
    if (zMin < 0) { e[10] = (f + n) / (n - f); e[14] = 2 * f * n / (n - f); } else { e[10] = f / (n - f); e[14] = f * n / (n - f); }
    if (projU && projU.value && projU.value.elements) { const d = projU.value.elements; for (let i = 0; i < 16; i++) d[i] = e[i]; }
  }

  // --- materials: a copy of each source, its vertex stage swapped -----------------------------------------------
  const vmMats = new Map();   // key -> { src, mat, version, map }
  // The source palette serves the distant third-person gun and its shadow. At 40 cm those
  // same dark values crush the view gun into one mass. Lift only the view copy, preserving
  // the military family's painted-steel / bare-steel / polymer roughness split.
  const vmFinish = new Map([
    [0x484b51, [0x6d7178, 0.08, 0.63]],  // phosphate receiver
    [0x5c6068, [0x858990, 0.08, 0.61]],  // lighter pressed plate and handguard
    [0x27292d, [0x383b40, 0.08, 0.69]],  // recessed controls, sight frames
    [0x383b41, [0x565b62, 0.10, 0.58]],  // parkerized barrel
    [0x3a3f48, [0x7b828b, 0.85, 0.42]],  // bare steel at handled edges
    [0x323437, [0x505451, 0.02, 0.84]],  // moulded polymer
    [0x17181a, [0x232527, 0.00, 0.92]],  // rubber remains the darkest material
  ]);
  const packedGunPaint = (src) => src?.name === 'fold-static' ||
    (!!src?.vertexColors && src?.color?.getHex() === 0xffffff && src.metalness === 0.08 && src.roughness === 0.66);
  function finishViewMaterial(src, m) {
    if (!src?.color || !m?.color || src.map) return;
    // foldStatic and the flamer/sniper/minigun body batch pack paints into
    // vertex colour. The node path below lifts each value separately;
    // the plain-material fallback uses one moderate gain.
    if (packedGunPaint(src)) { m.color.setRGB(m.colorNode ? 1 : 2, m.colorNode ? 1 : 2, m.colorNode ? 1 : 2); return; }
    const issue = src.userData?.issueColor;
    const recipe = vmFinish.get(issue ?? src.color.getHex());
    if (!recipe) return;
    const [color, metalness, roughness] = recipe;
    m.color.setHex(color);
    m.metalness = metalness;
    m.roughness = roughness;
  }
  function makeVmMat(src, noVC) {
    let m;
    const ud = src.userData;
    try { m = src.clone(); } catch (_) { src.userData = {}; m = src.clone(); src.userData = ud; }
    if (canHack && !m.isNodeMaterial) { try { m = renderer.library.fromMaterial(m) || m; } catch (_) { /* plain copy */ } }
    if (canHack && m.isNodeMaterial) {
      m.setupModelViewProjection = vmMVP;
      const base = m.customProgramCacheKey;
      m.customProgramCacheKey = function () { return (base ? base.call(this) : '') + '|vm281'; };
    }
    if (noVC) m.vertexColors = false;
    m.fog = false;
    m.name = 'vm:' + (src.name || src.type || '');
    m.userData = { vm281: true };
    finishViewMaterial(src, m);
    if (packedGunPaint(src) && m.isNodeMaterial && TSL?.attribute && TSL.normalWorld && TSL.cameraPosition && TSL.positionWorld) {
      const paint = TSL.attribute('color', 'vec3');
      const metal = src.name === 'fold-static' ? TSL.attribute('foldRM', 'vec2').y : TSL.float(0.08);
      const value = TSL.dot(paint, TSL.vec3(0.2126, 0.7152, 0.0722));
      const lift = TSL.mix(TSL.float(1.35), TSL.float(2.65), TSL.smoothstep(0.015, 0.12, value));
      // Rubber and recessed controls stay dark; bare steel and bright hazard
      // marks keep their sheen without clipping. foldRM still sets each folded
      // face's physical roughness and metalness, so no batch or draw is split.
      const limit = TSL.smoothstep(0.25, 0.55, value).max(TSL.smoothstep(0.5, 0.8, metal));
      m.colorNode = paint.mul(TSL.mix(lift, TSL.float(1.4), limit));
      m.vertexColors = false; // colorNode already reads the packed attribute
      m.color.setRGB(1, 1, 1);
      // No overlay draw: a restrained, colour-matched glint on the receiver's
      // existing grazing faces. It is most useful when dusk loses the key light.
      const facing = TSL.abs(TSL.dot(TSL.normalWorld, TSL.normalize(TSL.cameraPosition.sub(TSL.positionWorld))));
      const edge = TSL.float(1).sub(facing).pow(2.4);
      m.emissiveNode = paint.mul(edge.mul(0.14).add(0.012));
    }
    return m;
  }
  const VM_MAT_KEEP = new Set(['uuid', 'id', 'version', '_listeners', 'setupModelViewProjection', 'customProgramCacheKey', 'userData']);   // CD-1: vmMaterial's in-place update
  function vmMaterial(src, noVC = false) {
    if (!src) return src;
    if (Array.isArray(src)) return src.map((s) => vmMaterial(s, noVC));
    const key = noVC ? 'n|' + src.uuid : src.uuid;
    let e = vmMats.get(key);
    if (e && e.version === src.version && e.map === src.map && e.transparent === src.transparent) return e.mat;
    const mat = makeVmMat(src, noVC);
    // CD-1 (ChatGPT 2, GT-20079: factory -> M81 -> factory looked right but each view material was a new one): a source that
    // changes its version, map or transparency updates the view copy it already has, in place: the same instance and uuid
    // (the renderer rebuilds it on needsUpdate), the view's own hooks kept; only a change of kind makes a new one. (Every
    // own property is carried over: a node material's copy() skips the standard ones, the colour and the map.)
    if (e && e.mat && e.mat.type === mat.type) {
      for (const k of Object.keys(mat)) if (!VM_MAT_KEEP.has(k)) e.mat[k] = mat[k];
      e.mat.userData = { vm281: true };
      e.mat.needsUpdate = true;
      e.version = src.version; e.map = src.map; e.transparent = src.transparent; e.src = src;
      return e.mat;
    }
    if (e && e.mat && e.mat.dispose) { try { e.mat.dispose(); } catch (_) {} }
    vmMats.set(key, e = { src, mat, version: src.version, map: src.map, transparent: src.transparent });
    return mat;
  }
  // What the game changes on a material from frame to frame (the flash's fade, a glow's colour).
  function mirrorMaterial(src, m) {
    if (!src || !m || Array.isArray(src)) return;
    if (src.color && m.color) m.color.copy(src.color);
    finishViewMaterial(src, m);
    if (src.emissive && m.emissive) m.emissive.copy(src.emissive);
    if (src.emissiveIntensity != null) m.emissiveIntensity = src.emissiveIntensity;
    if (src.opacity != null) m.opacity = src.opacity;
    m.visible = src.visible !== false;
  }

  // --- his body's arms and gun: out of the eye's pass, still in the shadows' -------------------------------------
  let hidden = new Set(), hideOn = false, filterOn = false, prevFn = null, hideStamp = '';
  const canFilter = !!(renderer && typeof renderer.setRenderObjectFunction === 'function' && typeof renderer.renderObject === 'function');
  const filter = function (object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId) {
    if (hideOn && object.userData && object.userData.vmEyeHide === true) return;
    if (prevFn) prevFn(object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId);
    else renderer.renderObject(object, sc, cam, geometry, material, group, lightsNode, clippingContext, passId);
  };
  function setFilter(on) {
    if (!canFilter || on === filterOn) return;
    if (on) { const f = renderer.getRenderObjectFunction ? renderer.getRenderObjectFunction() : null; prevFn = typeof f === 'function' && f !== filter ? f : null; renderer.setRenderObjectFunction(filter); }
    else { renderer.setRenderObjectFunction(prevFn); prevFn = null; }
    filterOn = on;
  }
  function eyeHideSet(gunSrc, gunSrc2) {
    const ud = marine.userData, set = new Set();
    const add = (o) => { if (o && (o.isMesh || o.isSkinnedMesh)) set.add(o); };
    // The lasers' beams stay in (the gun he holds hangs on his right forearm, so its beam is under his arm too).
    const beams = new Set(); for (const k in weaponMeshes) { const g = weaponMeshes[k]; if (g && g.userData && g.userData.laser) beams.add(g.userData.laser);
      const o = ctx.offhand ? ctx.offhand(k) : null; if (o && o.userData && o.userData.laser) beams.add(o.userData.laser); }   // CL-327 (J73): the pair's left beam too (it hangs on his other arm)
    for (const g of [gunSrc, gunSrc2]) if (g && g.userData && g.userData.laser) beams.add(g.userData.laser);
    const walkArm = (o) => { if (beams.has(o)) return; add(o); for (const c of o.children) walkArm(c); };
    for (const a of [ud.armLG, ud.armRG]) if (a) walkArm(a);
    // AG-168 (defect 2): the guns slung on his back and holstered under his arms poked into the view (looking down, and
    // over the slide in the reload); out of the eye too.
    for (const g of (ctx.stowed ? ctx.stowed() : [])) if (g) walkArm(g);
    // CH-1 (J151 note 10): and the pack's second-gun holsters (the carry rig's pairs), which ctx.stowed does not list.
    for (const g of carryPairs()) walkArm(g);
    // GP-20002: only the radio cluster on the carrier leaves the eye; its vest and shadow stay.
    for (const o of (ud.gearParts && ud.gearParts.vest) || []) if (o.userData.vmEyeRadio) add(o);
    const rig = ud.rigSkin;
    if (rig && rig.skins) for (const s of rig.skins) if (s.userData && s.userData.rigSplit) set.add(s);
    marine.traverse((o) => { if (o.isMesh && ARM_CLOTH.has(o.name)) set.add(o); });
    for (const g of [gunSrc, gunSrc2]) {   // CL-301: and the pair's other gun
      if (!g) continue;
      const laser = g.userData && g.userData.laser;
      const walk = (o) => { if (o === laser) return; add(o); for (const c of o.children) walk(c); };
      walk(g);
    }
    return set;
  }
  // MU-11 (finding 1): his gun's nodes are counted once every 15th frame (it was twice a frame), for both the eye-hide's
  // stamp and the copy's rebuild.
  let nodeCount = 0, nodeCountFor = null, nodeAge = 0, stowCount = 0, stowAge = 99;
  // CH-1 (J151 note 10, Jerry: "Floating random red dot off to left of screen using shotgun"): the count alone missed a copy
  // re-made with as many parts (a camo or a laser at the workbench: the new copy stayed in the eye) and lagged up to 15
  // frames behind an optic fitted to a slung gun. The stamp also carries which copies hang on him and which optic is on the
  // gun in his hand, read every frame (a few ids, no traversal).
  function carryPairs() { const r = marine.userData && marine.userData.carry; return r && r.pairs ? r.pairs.map((p) => p && p.g).filter(Boolean) : []; }
  function idsOf(g, h) { for (const c of g.children) { h = (h * 31 + c.id) | 0; for (const k of c.children) h = (h * 31 + k.id) | 0; } return h; }   // the copies and their parts, two levels
  function stowedIds(gunSrc) {   // a number: no string or closure built each frame
    let h = 7;
    const st = ctx.stowed ? ctx.stowed() : null;
    if (st) for (const g of st) if (g) h = idsOf(g, h);
    const r = marine.userData && marine.userData.carry;
    if (r && r.pairs) for (const p of r.pairs) if (p && p.g) h = idsOf(p.g, h);
    const opt = gunSrc && gunSrc.userData && gunSrc.userData.fittedOptic;
    return (h * 31 + (opt ? opt.id : 0)) | 0;
  }
  function stowedNodes() {
    if (++stowAge < 15) return stowCount;
    stowAge = 0; stowCount = 0;
    for (const g of (ctx.stowed ? ctx.stowed() : [])) if (g) g.traverse(() => { stowCount++; });
    return stowCount;
  }
  function gunNodes(src) {
    if (!src) return 0;
    if (src !== nodeCountFor || ++nodeAge >= 15) { nodeCount = countNodes(src); nodeCountFor = src; nodeAge = 0; }
    return nodeCount;
  }
  function setEyeHide(on, gunSrc, gunSrc2 = null) {
    const rig = marine.userData.rigSkin;
    const stamp = on ? (gunSrc ? gunSrc.uuid : '-') + '|' + (gunSrc2 ? gunSrc2.uuid : '-') + '|' + (rig ? rig.bakes : 0) + '|' + gunNodes(gunSrc) + '|' + stowedNodes() + '|' + stowedIds(gunSrc) : '';
    if (stamp === hideStamp && on === hideOn) return;
    const next = on ? eyeHideSet(gunSrc, gunSrc2) : new Set();
    for (const o of hidden) if (!next.has(o)) o.userData.vmEyeHide = false;
    for (const o of next) o.userData.vmEyeHide = true;
    hidden = next; hideOn = on; hideStamp = stamp;
    setFilter(on);
  }
  function countNodes(o) { let n = 0; o.traverse(() => { n++; }); return n; }

  // --- the arms ---------------------------------------------------------------------------------------------------
  let arms = null;
  // His own lower arm's parts, to read their materials and which are worn (the glove or the bare hand, sleeves down
  // or rolled).
  function bodyArm(side) {
    const ud = marine.userData, elbow = side > 0 ? ud.elbowRG : ud.elbowLG;
    const wrist = elbow && elbow.userData && elbow.userData.wrist;
    if (!wrist) return null;
    let glove = null, bare = null, rolled = null;
    for (const c of wrist.children) {
      const hands = c.children.filter((m) => m.isMesh && m.name === 'gb152-hand');
      if (hands.length >= 2) glove = { g: c, main: hands[0], pads: hands[1] }; else if (hands.length === 1) bare = { g: c, main: hands[0] };
    }
    for (const c of elbow.children) { let has = false; c.traverse((o) => { if (o.name === 'wrist-continuous-skin') has = true; }); if (has && c !== wrist) { rolled = c; break; } }
    return { elbow, wrist, glove, bare, rolled };
  }
  function bodyMats() {
    let uniform = null, skin = null;
    marine.traverse((o) => { if (!o.isMesh) return; if (!uniform && o.name === 'live-sleeve') uniform = o.material; if (!skin && o.name === 'live-bare-arm') skin = o.material; });
    const r = bodyArm(1);
    if (!skin && r && r.bare) skin = r.bare.main.material;
    return { uniform, skin, glove: r && r.glove ? r.glove.main.material : skin, pads: r && r.glove ? r.glove.pads.material : null };
  }
  let matStamp = '', bodyCache = null, bodyAge = 0;
  // His arm's parts and materials, looked up again every half second or so (and after a re-bake of his rig).
  function body() {
    const bakes = marine.userData.rigSkin ? marine.userData.rigSkin.bakes : 0;
    // MU-11 (finding 5): a change of camo, gloves or sleeves bakes him again, so that alone refreshes it (and every 10 s).
    if (!bodyCache || ++bodyAge > 600 || bodyCache.bakes !== bakes) { bodyCache = { mats: bodyMats(), r: bodyArm(1), l: bodyArm(-1), bakes }; bodyAge = 0; }
    return bodyCache;
  }
  function syncArmMaterials() {
    const m = body().mats;
    const stamp = [m.uniform, m.skin, m.glove, m.pads].map((x) => (x ? x.uuid + ':' + x.version + ':' + (x.map ? x.map.uuid : '') : '-')).join('|');
    if (stamp === matStamp && arms) return;
    const vm = { uniform: vmMaterial(m.uniform, true), skin: vmMaterial(m.skin, true), glove: vmMaterial(m.glove, true), pads: vmMaterial(m.pads, true) };
    // CD-1 (Claude 1, J126): in a strong curl the glove's skinning folds a few faces over at the knuckle creases (about 25 per
    // hand, the largest ~5 mm²); one-sided they drew as pinholes (the background through the glove at the eye). The hand's
    // own copies are drawn from both sides so a fold shows the glove, not a hole; the sleeve keeps its one side.
    for (const k of ['skin', 'glove', 'pads']) if (vm[k] && T.DoubleSide !== undefined && vm[k].side !== T.DoubleSide) { vm[k].side = T.DoubleSide; vm[k].needsUpdate = true; }
    if (!arms) { arms = { r: buildViewArm(T, 1, vm), l: buildViewArm(T, -1, vm) }; flipMeshes(arms.r.root); flipMeshes(arms.l.root); }
    else { arms.r.setMaterials(vm); arms.l.setMaterials(vm); }
    if (!arms.r.root.parent) space.add(arms.r.root, arms.l.root);
    matStamp = stamp;
  }

  // --- the gun's copy ------------------------------------------------------------------------------------------------
  let gun = null;   // { key, src, root, pairs, work, slide, mag, pump, bolt, cylinder, shell, flash, nodes, s, foot, magBase }
  function cloneLean(src, pairs, skip) {
    let o;
    if (src.isInstancedMesh) {
      // The chainsaw's moving teeth are one draw. Keep their instances in the
      // eye copy; a plain Mesh would show only the prototype tooth.
      const capacity = src.instanceMatrix.array.length / 16;
      o = new T.InstancedMesh(geoOf(src.geometry), vmMaterial(src.material), capacity);
      o.count = src.count;
      if (src.userData.artworkSlots) o.userData.artworkSlots = src.userData.artworkSlots;
      o.instanceMatrix.array.set(src.instanceMatrix.array);
      o.instanceMatrix.needsUpdate = true;
      o.userData.vmInstanceVersion = src.instanceMatrix.version;
      if (src.instanceColor) o.instanceColor = src.instanceColor.clone();
      o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = src.renderOrder || 0;   // CL-304 (J6): no world shadow on the view gun either
    } else if (src.isMesh) {
      o = new T.Mesh(geoOf(src.geometry), vmMaterial(src.material));
      o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = src.renderOrder || 0;   // CL-304 (J6): no world shadow on the view gun either
    } else o = new T.Group();
    if (src.userData.artworkSlot) o.userData.artworkSlot = src.userData.artworkSlot;
    o.name = src.name; o.position.copy(src.position); o.quaternion.copy(src.quaternion); o.scale.copy(src.scale); o.visible = src.visible;
    pairs.push([src, o]);
    for (const c of src.children) { if (skip.has(c) || c.isLight || c.isCamera) continue; o.add(cloneLean(c, pairs, skip)); }
    return o;
  }
  let gun2 = null;  // CL-301: the pair's other gun (the same record), in the left hand
  // CL-307: a copy of his knife group (ctx.blade(): the knife, the machete and the katana as its children, one shown), kept
  // across guns; its parts mirrored from his each frame while a swing shows it.
  let blade = null;   // { src, root, pairs }
  function bladeCopy() {
    const src = ctx.blade ? ctx.blade() : null;
    if (!src) return null;
    if (blade && blade.src === src && blade.nodes === countNodes(src)) return blade;
    if (blade) bladeHolder.remove(blade.root);
    const pairs = [], r = cloneLean(src, pairs, new Set());
    r.position.set(0, 0, 0); r.quaternion.set(0, 0, 0, 1); r.scale.set(1, 1, 1);
    bladeHolder.add(r);
    blade = { src, root: r, pairs: pairs.filter(([s]) => s !== src), nodes: countNodes(src), s: 1 };
    return blade;
  }
  let grenadeC = null;   // CL-307: a copy of the grenade in his hand (ctx.grenade())
  function grenadeCopy() {
    const src = ctx.grenade ? ctx.grenade() : null;
    if (!src) return null;
    if (grenadeC && grenadeC.src === src) return grenadeC;
    if (grenadeC) grenadeHolder.remove(grenadeC.root);
    const pairs = [], r = cloneLean(src, pairs, new Set());
    r.position.set(0, 0, 0); r.quaternion.set(0, 0, 0, 1); r.scale.set(1, 1, 1);
    grenadeHolder.add(r);
    grenadeC = { src, root: r, pairs: pairs.filter(([s]) => s !== src), s: 1 };
    return grenadeC;
  }
  function dropGun() {
    if (arms) { for (const a of [arms.r, arms.l]) if (a) a.twist = null; }   // CL-305: a new gun's twist starts afresh
    if (gun) { gunHolder.remove(gun.root); gun = null; }
    if (gun2) { gunHolder2.remove(gun2.root); gun2 = null; }
  }
  // AG-302: pre-built gun copies stay cached across switches (rebuilt automatically if fitted nodes/source change).
  const gunCache = new Map(), gun2Cache = new Map();
  function resetGunCopy(g) {
    g.root.position.set(0, 0, 0); g.root.quaternion.set(0, 0, 0, 1); g.root.scale.set(1, 1, 1); g.root.visible = true;
    mirrorParts(g);
    if (g.work && g.workBase) g.work.position.copy(g.workBase);
    if (g.pump && g.pumpBase) g.pump.position.copy(g.pumpBase);
    if (g.bolt && g.boltBase) g.bolt.position.copy(g.boltBase);
    for (const [part, base] of [[g.shell, g.shellBase], [g.ammoBox, g.ammoBoxBase], [g.fuelCan, g.fuelCanBase],
      [g.empties, g.emptiesBase], [g.speedloader, g.speedloaderBase], [g.fuelCap, g.fuelCapBase], [g.loadRound, g.loadRoundBase]]) {
      if (part && base) { part.position.copy(base.pos); part.quaternion.copy(base.quat); }
    }
    if (g.mag && g.magBase) { g.mag.position.copy(g.magBase.pos); g.mag.quaternion.copy(g.magBase.quat); g.mag.scale.copy(g.magBase.scale); }
  }
  function takeGunCopy(cache, key, src, holder) {
    let g = cache.get(key);
    if (!g || g.src !== src || g.nodes !== countNodes(src)) {
      g = copyGun(key, src, holder);
      cache.set(key, g);
    } else {
      resetGunCopy(g);
      holder.add(g.root);
    }
    return g;
  }
  function buildGun(key, pair = false) {
    dropGun();
    const src = weaponMeshes[key];
    if (!src) return;
    S.lastFlashT = null; S.lastFlashT2 = null;
    gun = takeGunCopy(gunCache, key, src, gunHolder);
    const off = pair && ctx.offhand ? ctx.offhand(key) : null;
    if (off) gun2 = takeGunCopy(gun2Cache, key, off, gunHolder2);
  }
  let _coated = null;
  function coatedLens() {   // CC-342 (J123): blue-black coated glass with a hard sheen, as a scope's lenses look from outside
    return _coated || (_coated = new T.MeshStandardMaterial({ name: 'cc342-coated-lens', color: 0x0b1416, metalness: 0.55, roughness: 0.07,
      emissive: 0x03080a, side: T.DoubleSide }));
  }
  function copyGun(key, src, holder) {
    // CL-293 (Jerry, 3 Nov: "there being no stocks"): the stock is in the copy now, shown at the hip and put away down the
    // sights (update, below), where it would fill the eye.
    const ud = src.userData || {}, pairs = [], skip = new Set([ud.laser].filter(Boolean));
    const r = cloneLean(src, pairs, skip);
    r.position.set(0, 0, 0); r.quaternion.set(0, 0, 0, 1); r.scale.set(1, 1, 1);
    if (key === 'sniper') r.traverse((o) => { if (o.isMesh && COATED_LENSES.has(o.name)) { o.userData.vmOwnMat = vmMaterial(coatedLens()); o.material = o.userData.vmOwnMat; } });   // CC-342 (J123)
    holder.add(r);
    const map = new Map(pairs);
    // MU-11 (finding 3): the palm ride and the slide's grab work in the gun root's space: a magazine or slide deeper in the
    // gun's tree is left to his own gun's animation (mirrored) instead.
    const direct = (o) => (o && o.parent === src ? o : null);
    const gun = { key, src, root: r, pairs, slide: map.get(direct(ud.slide)) || null, recoilBolt: map.get(ud.recoilBolt) || null,   // CL-322: the Breacher's stroke
      work: map.get(direct(ud.work || ud.slide)) || null, mag: map.get(direct(ud.mag)) || null,
      pump: map.get(direct(ud.pump)) || null, bolt: map.get(direct(ud.bolt)) || null,
      cylinder: map.get(direct(ud.cylinder)) || null, shell: map.get(direct(ud.reloadShell)) || null,
      trigger: map.get(ud.trigger) || null, hammer: map.get(ud.hammer) || null,   // CE-1: the revolver's double action (doubleActionPose)
      // GB-302: reload moving parts Claude drives (direct children of the gun root, as pump/slide).
      ammoBox: map.get(direct(ud.ammoBox)) || null,
      fuelCan: map.get(direct(ud.fuelCan)) || null,
      empties: map.get(direct(ud.empties)) || null,
      palmRounds: map.get(direct(ud.palmRounds)) || null,   // CL-326: the revolver's unfired rounds for his palm
      starter: map.get(direct(ud.starterHandle)) || null,   // CL-326 (J82): the chainsaw's starter handle (the body's pull moves it)
      speedloader: map.get(direct(ud.speedloader)) || null,
      fuelCap: map.get(direct(ud.fuelCap)) || null,
      // CL-306: the launcher's drum on its hinge (GP-20039: ud.mag is the hinge), its latch and winding key
      drum: map.get(ud.drum) || null, latch: map.get(direct(ud.drumLatch)) || null, winder: map.get(ud.drumWinder) || null,
      loadRound: map.get(direct(ud.loadRound)) || null,   // GP-20039: the loose round for the support fingers
      stock: map.get(ud.fpStock) || null,
      flash: map.get(ud.flash) || null,
      barrel: map.get(direct(ud.barrelAssembly)) || null,   // CE-11 (GT-20104): the pistol's tilting barrel
      nodes: countNodes(src), s: 1, foot: null, magBase: null };
    // CE-2 (J130): the gun's controls (ChatGPT 2's userData.controls: a name per control) as the copy's own nodes, for the hand
    gun.ctrls = {};
    for (const [k, nm] of Object.entries(ud.controls || {})) { const o = nm && src.getObjectByName(nm), c = o && map.get(o); if (c) gun.ctrls[k] = c; }
    gun.workBase = gun.work ? gun.work.position.clone() : null;
    gun.barrelBase = gun.barrel ? { x: gun.barrel.position.x, y: gun.barrel.position.y, z: gun.barrel.position.z, rx: gun.barrel.rotation.x } : null;   // CE-11
    gun.pumpBase = gun.pump ? gun.pump.position.clone() : null;
    gun.boltBase = gun.bolt ? gun.bolt.position.clone() : null;   // GB-301: exposed like the shotgun's pump
    gun.shellBase = gun.shell ? { pos: gun.shell.position.clone(), quat: gun.shell.quaternion.clone() } : null;
    gun.ammoBoxBase = gun.ammoBox ? { pos: gun.ammoBox.position.clone(), quat: gun.ammoBox.quaternion.clone() } : null;
    gun.fuelCanBase = gun.fuelCan ? { pos: gun.fuelCan.position.clone(), quat: gun.fuelCan.quaternion.clone() } : null;
    gun.emptiesBase = gun.empties ? { pos: gun.empties.position.clone(), quat: gun.empties.quaternion.clone() } : null;
    gun.speedloaderBase = gun.speedloader ? { pos: gun.speedloader.position.clone(), quat: gun.speedloader.quaternion.clone() } : null;
    gun.fuelCapBase = gun.fuelCap ? { pos: gun.fuelCap.position.clone(), quat: gun.fuelCap.quaternion.clone() } : null;
    gun.loadRoundBase = gun.loadRound ? { pos: gun.loadRound.position.clone(), quat: gun.loadRound.quaternion.clone() } : null;
    gun.pairs = pairs.filter(([s]) => s !== src);   // the copy's root is placed here, not mirrored
    if (gun.mag && (ud.baseMagPos || ud.baseAmmoPos)) {
      const mp = ud.baseMagPos || ud.baseAmmoPos, mr = ud.baseMagRot || ud.baseAmmoRot;   // CL-306: the rotary gun's box (index.html names its rest baseAmmo*)
      const q = Q(); if (mr) q.setFromEuler(mr); else q.copy(gun.mag.quaternion);
      gun.magBase = { pos: mp.clone(), quat: q, scale: gun.mag.scale.clone() };
    }
    return gun;
  }
  // An object's own-space bounds from its meshes' vertices (studio code's reloadLocalBox, here for the copy).
  function localBox(obj) {
    obj.updateMatrixWorld(true);
    const inv = M4().copy(obj.matrixWorld).invert(), m = M4(), v = V3(), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    obj.traverse((o) => {
      const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
      if (!pa) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pa.count; i++) {
        v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(m);
        lo[0] = Math.min(lo[0], v.x); lo[1] = Math.min(lo[1], v.y); lo[2] = Math.min(lo[2], v.z);
        hi[0] = Math.max(hi[0], v.x); hi[1] = Math.max(hi[1], v.y); hi[2] = Math.max(hi[2], v.z);
      }
    });
    return lo[0] === Infinity ? null : { min: new T.Vector3(lo[0], lo[1], lo[2]), max: new T.Vector3(hi[0], hi[1], hi[2]) };
  }

  // --- frames: { p, q, s } (position, rotation, uniform scale) ------------------------------------------------------
  // Scratch objects: nothing below allocates per frame (CL-220's rule: no garbage on the frame's path).
  const _fsc = V3(), _mp = V3(), _mq = Q(), _bm = M4(), _eq = Q(), _sinv = M4(), _dp = V3(), _dq = Q(), _dsc = V3();
  const AX_X = new T.Vector3(1, 0, 0), AX_Y = new T.Vector3(0, 1, 0), AX_Z = new T.Vector3(0, 0, 1);
  const F = () => ({ p: V3(), q: Q(), s: 1 });
  const fromMatrix = (m, f) => { m.decompose(f.p, f.q, _fsc); f.s = Math.abs(_fsc.x) || 1; return f; };
  const mul = (a, b, out) => {   // out = a * b (out may be a or b)
    _mp.copy(b.p).multiplyScalar(a.s).applyQuaternion(a.q).add(a.p);
    _mq.copy(a.q).multiply(b.q);
    const s = a.s * b.s;
    out.p.copy(_mp); out.q.copy(_mq); out.s = s; return out;
  };
  const lerpF = (a, b, t, out) => { out.p.copy(a.p).lerp(b.p, t); out.q.copy(a.q).slerp(b.q, t); out.s = a.s + (b.s - a.s) * t; return out; };
  const basisQ = (x, y, z, q) => {   // a rotation whose columns are x, y, z
    _bm.set(x.x, y.x, z.x, 0, x.y, y.y, z.y, 0, x.z, y.z, z.z, 0, 0, 0, 0, 1); return q.setFromRotationMatrix(_bm);
  };
  // yaw about view y, pitch about view x, roll about view z, applied to a bore that already points ahead.
  const eulerQ = (yaw, pitch, roll, q) => q.setFromAxisAngle(AX_Y, yaw).multiply(_eq.setFromAxisAngle(AX_X, pitch)).multiply(_eq.setFromAxisAngle(AX_Z, roll));
  const BORE_AHEAD = Q().setFromAxisAngle(AX_Y, Math.PI);   // the gun's +z (its bore) onto the view's -z

  // --- where each hand sits on the gun: read off his body while the hold is settled --------------------------------
  const sockets = { key: null, r: null, l: null, poseR: copyPose(HAND_POSES.relaxed), poseL: copyPose(HAND_POSES.relaxed) };
  const _bx = V3(), _by = V3(), _bz = V3();
  const _sm = M4(), _sf = F(), _contact = V3(), _target = V3(), _tq2 = Q(), _te = new T.Euler(), _fy = V3();
  // CL-325 (J72): each gun's settled hold (a pair's apart), so a gun comes up with the hands already in place
  const sockCache = {};
  const keepF = (f) => ({ p: f.p.clone(), q: f.q.clone(), s: f.s });
  function readSockets(key, settled, dt) {
    const ud = marine.userData, src = weaponMeshes[key];
    const wr = ud.elbowRG && ud.elbowRG.userData.wrist, wl = ud.elbowLG && ud.elbowLG.userData.wrist;
    if (!src || !wr || !wl) return;
    if (wr.userData.hand) copyPose(wr.userData.hand.pose, sockets.poseR);
    if (wl.userData.hand) copyPose(wl.userData.hand.pose, sockets.poseL);
    const first = sockets.key !== key || !sockets.r, ck = key + (gun2 ? '|2' : ''), kept = sockCache[ck];
    if (first && kept) { sockets.r = keepF(kept.r); sockets.l = keepF(kept.l); sockets.key = key; return; }
    // CL-325 (J72): while a gun comes up (and a moment after) the body is still taking its hold: a kept hold stands; the
    // first time, the hands follow the body's hold every frame, so they don't come up turned and then twist into place
    const raising = S.rising && (S.raise < 1 || S.upT < 0.35);
    if (raising && kept) return;
    const follow = raising && !kept;
    if (!first && !settled && !follow) return;
    src.updateWorldMatrix(true, false); wr.updateWorldMatrix(true, false); wl.updateWorldMatrix(true, false);
    const inv = _sinv.copy(src.matrixWorld).invert();
    const k = first || follow ? 1 : 1 - Math.exp(-4 * dt);
    for (const [side, w] of [['r', wr], ['l', wl]]) {
      _sm.multiplyMatrices(inv, w.matrixWorld); fromMatrix(_sm, _sf);
      // CL-293 (J54): a hand's turn on the gun can be set per gun (VM_SOCKETS gripRot / supportRot: x, y, z radians, YXZ, in
      // the gun's space, on top of the hold's own turn) and tried live (info.tune[key][side] = { p, r }, then retune()).
      { const A = VM_SOCKETS[key], tn = info.tune[key] && info.tune[key][side], fit = VM_FIT[key] && VM_FIT[key][side], rr = (tn && tn.r) || (!fit && A && (side === 'r' ? A.gripRot : A.supportRot));
        if (rr) _sf.q.premultiply(_tq2.setFromEuler(_te.set(rr[0], rr[1], rr[2], 'YXZ')));
        // CL-301 (Jerry, 4 Nov: "Left hand should have a motorcycle grip on chainsaw palm facing down"): or the hand's own axes
        // set outright in the gun's space (VM_SOCKETS gripBasis / supportBasis { x: the grip channel, y: toward the elbow }),
        // live as info.tune[key][side].basis; the position still comes from the authored grip point.
        const B = (tn && tn.basis) || (fit && fit.basis) || (A && (side === 'r' ? A.gripBasis : A.supportBasis));   // CL-334 h: the fit's turn first
        if (B) { _bx.set(B.x[0], B.x[1], B.x[2]).normalize(); _by.set(B.y[0], B.y[1], B.y[2]); _by.addScaledVector(_bx, -_by.dot(_bx)).normalize(); _bz.crossVectors(_bx, _by); basisQ(_bx, _by, _bz, _sf.q); } }
      if (first || !sockets[side]) sockets[side] = { p: _sf.p.clone(), q: _sf.q.clone(), s: _sf.s };
      else lerpF(sockets[side], _sf, k, sockets[side]);
      const authored = VM_SOCKETS[key], tnp = info.tune[key] && info.tune[key][side] && info.tune[key][side].p;
      // A pistol grip can keep its gun-frame anchor while the glove closes on its
      // visible side. The launcher uses this to show the trigger hand below the receiver.
      const fitp = VM_FIT[key] && VM_FIT[key][side] && VM_FIT[key][side].p;   // CL-334 h: the fit's place (the gun's frame keeps its grip anchor)
      const tgt = tnp || fitp || (authored && (side === 'r' ? (authored.gripContact || authored.grip) : authored.support));
      if (tgt && arms) {
        _target.set(tgt[0], tgt[1], tgt[2]);
        wristSpacePoint(arms[side], 'grip', _contact).multiplyScalar(sockets[side].s).applyQuaternion(sockets[side].q);
        sockets[side].p.copy(_target).sub(_contact);
      }
    }
    sockets.key = key;
    if (settled && S.rising && !raising && sockets.r && sockets.l) sockCache[ck] = { r: keepF(sockets.r), l: keepF(sockets.l) };   // up and settled only (not while it goes down)
  }

  // --- springs ---------------------------------------------------------------------------------------------------
  const spring = (c) => ({ x: [0, 0, 0], v: [0, 0, 0], t: [0, 0, 0], k: c.k, c: 2 * c.z * Math.sqrt(c.k) });
  const sp = { pos: spring(VM.spring.pos), rot: spring(VM.spring.rot) };
  const cs = spring(VM.camera || { k: 300, z: 0.82 });   // CL-293: the view's share of each shot (pitch, yaw), cameraPunch()
  // CC-342 (J109: "the new optics do not have any recoil visible when using them"): the optic is bolted to the gun, so
  // through a magnified optic's glass (the prism, the ACOG; the view gun hidden behind it) the sight picture turns with
  // the gun's own kick: a spring kicked as the gun's (back up, a random side), weighted by the glass (S.glassW), added
  // to cameraPunch. A red dot's dot rides the gun's bore instead (opticDotOffset).
  const ok = spring(VM.spring.rot);
  // CL-301: a pair's kicks, each gun its own (the sway, the bob and the rest stay in sp, shared)
  const KA = { pos: spring(VM.spring.pos), rot: spring(VM.spring.rot) }, KB = { pos: spring(VM.spring.pos), rot: spring(VM.spring.rot) };
  function stepSpring(s, dt) {
    const n = Math.max(1, Math.ceil(dt * 240)), h = dt / n;
    for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const acc = -s.k * (s.x[a] - s.t[a]) - s.c * s.v[a]; s.v[a] += acc * h; s.x[a] += s.v[a] * h; }
  }

  // --- state ------------------------------------------------------------------------------------------------------
  const S = { raise: 0, want: null, ads: 0, bobPhase: 0, bobW: 0, time: 0, lastFlashT: null, slideT: 9, wasGrounded: true, fallV: 0,
    camQ: null, reloadU: null, shots: 0, lastPlace: null, wx: 0, wy: 0, run: 0, sprint: 0, push: 0, lastFlashT2: null, slideT2: 9, shots2: 0 };
  const G = F();                 // the gun's frame in view space this frame
  const G2 = F();                // CL-301: the pair's other gun's
  const WR = F(), WL = F();      // the wrists' frames in view space
  const info = { tune: {}, active: false, key: null, akimbo: false, raise: 0, ads: 0, wrist: { r: 0, l: 0 }, magState: 'seated', handPlace: 'fore', reloadU: null, hack: canHack, filter: canFilter, flip: FLIP, wristMax: VM.wristMax };

  const _pz = V3(), _py = V3(), _pat = V3(), _px = V3(), _pinv = Q(), _pg = V3(), _ppalm = V3();
  // The left hand's places through a reload, as wrist frames in the gun's own space.
  let rockNow = 0;   // CL-322: the rock's angle while the hand's places are worked out (reloadHand)
  const _rkPivot = V3(), _rkQ = Q();
  const rockAngle = (R, u) => R.rock.angle * (smooth((u - R.rock.out[0]) / (R.rock.out[1] - R.rock.out[0])) - smooth((u - R.rock.in[0]) / (R.rock.in[1] - R.rock.in[0])));
  function placeFrame(name, R, u, out) {
    const pl = R.places, arm = arms.l, sL = sockets.l;
    if (name === 'fore' || !gun) { out.p.copy(sL.p); out.q.copy(sL.q); out.s = sL.s; return out; }
    const z = _pz, y = _py, at = _pat;
    if (name === 'pouch') {
      const g = G, inv = _pinv.copy(g.q).invert();
      at.set(pl.pouch.at[0] * MX, pl.pouch.at[1], pl.pouch.at[2]).sub(g.p).applyQuaternion(inv).multiplyScalar(1 / g.s);
      z.set(pl.pouch.z[0] * MX, pl.pouch.z[1], pl.pouch.z[2]).applyQuaternion(inv); y.set(pl.pouch.y[0] * MX, pl.pouch.y[1], pl.pouch.y[2]).applyQuaternion(inv);
    } else if (pl[name] && (pl[name].at || pl[name].part || name === 'work')) {
      const place = pl[name];
      const part = place.part ? gun[place.part] : (name === 'work' ? gun.work : null);
      if (place.part && part) {
        // CL-306: the frame in the gun root's space (a drum on its hinge is two deep); the magazine as it sits at rest
        // (it rides the palm during a reload, so a place on it must not follow it round).
        if (place.part === 'mag' && gun.magBase) _pm.compose(gun.magBase.pos, gun.magBase.quat, gun.magBase.scale);
        else partMatrix(part, _pm);
        if (place.rootAt) at.set(0, 0, 0).applyMatrix4(_pm).add(_pg.set(...place.rootAt));   // from the part's origin, in the gun's own axes (a drum that turns)
        else {
          if (place.at) at.set(...place.at);
          else if (place.grab) at.set(...place.grab);
          else at.set(0, 0, 0);
          at.applyMatrix4(_pm);
        }
      } else if (place.at) {
        at.set(...place.at);
        if (name === 'work' && gun.work && gun.workBase) at.add(_pg.copy(gun.work.position).sub(gun.workBase));
      } else if (part) {
        if (!gun.grab) { const b = localBox(part); gun.grab = b ? new T.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.25 * (b.max.y - b.min.y), b.min.z + 0.25 * (b.max.z - b.min.z)) : V3(); }
        part.updateMatrix();
        at.copy(gun.grab).add(_pg.set(...place.grab)).applyMatrix4(part.matrix);
      } else at.set(0, 0, 0);
      z.set(...place.z); y.set(...place.y);
      if (place.part && part && place.local) { _pq.setFromRotationMatrix(_pm); z.applyQuaternion(_pq); y.applyQuaternion(_pq); }   // CL-306: directions in the part's own space (the swung drum)
    } else {
      if (!gun.foot) footOf();
      if (gun.foot) at.copy(gun.foot); else at.set(0, 0, 0);
      if (name === 'below') at.y -= pl.below.drop;
      z.set(...pl.well.z); y.set(...pl.well.y);
      if (rockNow && R.rock && R.rock.pivot && gun.magBase) {
        // CL-322 (the AK manual): the magazine rocks on its front lug, in and out; the palm holding it turns with it
        // about that lug (the bottom forward on the way out, back on the way in), so the hand never leaves the magazine.
        _pm.compose(gun.magBase.pos, gun.magBase.quat, gun.magBase.scale);
        _rkPivot.set(...R.rock.pivot).applyMatrix4(_pm);
        _rkQ.setFromAxisAngle(AX_X, -rockNow);
        at.sub(_rkPivot).applyQuaternion(_rkQ).add(_rkPivot);
        z.applyQuaternion(_rkQ); y.applyQuaternion(_rkQ);
      }
    }
    z.normalize(); y.addScaledVector(z, -y.dot(z)).normalize();
    const x = _px.crossVectors(y, z);
    basisQ(x, y, z, out.q);
    out.s = sL.s;
    const palm = wristSpacePoint(arm, 'palm', _ppalm).multiplyScalar(out.s).applyQuaternion(out.q);
    out.p.copy(at).sub(palm);
    return out;
  }
  // CL-306: a part's local matrix composed up to the gun root (mirrorParts copies position/quaternion/scale only).
  const _pm = M4(), _pq = Q();
  function partMatrix(part, out) {
    out.identity();
    for (let o = part; o && o !== gun.root; o = o.parent) { o.updateMatrix(); out.premultiply(o.matrix); }
    return out;
  }
  function footOf() {
    if (!gun.mag || !gun.magBase) { gun.foot = null; return; }
    const keep = { p: gun.mag.position.clone(), q: gun.mag.quaternion.clone() };
    gun.mag.position.copy(gun.magBase.pos); gun.mag.quaternion.copy(gun.magBase.quat);
    const b = localBox(gun.mag);
    const inMag = b ? new T.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2) : V3();
    gun.mag.updateMatrix();
    gun.magFootLocal = inMag.clone();
    gun.foot = inMag.applyMatrix4(gun.mag.matrix);
    gun.mag.position.copy(keep.p); gun.mag.quaternion.copy(keep.q);
  }
  // CL-306 (J13/J19, the audit docs/fps/reloads-audit.md): a reload with rounds left is a tactical one: the magazine comes
  // out and the fresh one goes in, and NO slide, bolt or charging handle is worked (a chambered round stays). The empty
  // reload is the authored path as it is. The tactical path is the same path cut after the seat and stretched over the
  // reload's whole time, so the hands take their time instead of waiting at the end. Built once per reload path.
  const tacCache = new WeakMap();
  function tacticalOf(R) {
    if (!R || !R.mag || !R.rack) return R;   // no rack: a tube, a cylinder, a drum: the same reload either way
    let T2 = tacCache.get(R); if (T2) return T2;
    // CE-2 (J103: "Do not see hand racking slide for reload, need to see"; CLAUDE DIRECTOR 11 Nov: one rack on every pistol
    // reload): a path with tacticalRack keeps its whole path, the rack included, with rounds left too
    if (R.tacticalRack) { T2 = Object.freeze({ ...R, tactical: true }); tacCache.set(R, T2); return T2; }
    const end = Math.min(0.9, (R.mag.seat || 0.6) + 0.1), k = 1 / end;
    const hand = R.hand.filter((h) => h[0] <= end && h[1] !== 'work').map((h) => [Math.min(1, h[0] * k), h[1], h[2]]);
    hand.push([1, 'fore', 'fore']);
    const gun = R.gun.filter((g) => g[0] <= end).map((g) => [Math.min(1, g[0] * k), g[1]]);
    gun.push([Math.min(1, end * k + 0.001), null], [1, null]);
    const mag = { grab: R.mag.grab * k, swapOut: R.mag.swapOut * k, swapIn: R.mag.swapIn * k, seat: R.mag.seat * k };
    T2 = Object.freeze({ ...R, hand: Object.freeze(hand), gun: Object.freeze(gun), mag: Object.freeze(mag), rack: null, rock: R.rock ? { ...R.rock, out: R.rock.out.map((v) => v * k), in: R.rock.in.map((v) => v * k) } : null, tactical: true });
    tacCache.set(R, T2); return T2;
  }
  // CL-326 (J80): a reload loaded a round at a time (R.perRound) has one trip a round to load (st.rounds.need)
  const perRoundCache = new Map();
  function perRoundOf(R, need) {
    const n = clamp(need | 0, 1, 12), key = R, byN = perRoundCache.get(key) || perRoundCache.set(key, {}).get(key);
    if (byN[n]) return byN[n];
    const PR = R.perRound, sl = (PR.end - PR.start) / n, hand = PR.pre.map((k) => k.slice()), trips = [];
    for (let i = 0; i < n; i++) { const t0 = PR.start + i * sl; for (const k of PR.trip) hand.push([t0 + k[0] * sl, k[1], k[2]]); trips.push([t0 + PR.round[0] * sl, t0 + PR.round[1] * sl]); }
    for (const k of PR.post) hand.push(k.slice());
    return (byN[n] = Object.freeze({ ...R, hand, round: { ...R.round, trips } }));
  }
  const reloadOf = (P, st) => { let R = P.reload && VM_RELOADS[P.reload];
    if (R && R.perRound && st.reloadU != null && st.rounds && st.rounds.need) R = perRoundOf(R, st.rounds.need);
    return R && st.reloadU != null && st.reloadEmpty === false ? tacticalOf(R) : R; };
  const POSES = { mag: gripPose(ITEM_POSES.mag), pouch: gripPose(ITEM_POSES.pouch), cup: gripPose(ITEM_POSES.cup), pinch: gripPose(ITEM_POSES.pinch), open: copyPose(HAND_POSES.open) };
  // CE-9 (GT-20101): a reload may name its own finger poses (R.poses: { name: ITEM_POSES-style entry }), the pistol's rack
  // grip that keeps its fingers off the round in the open port and its thumb on the slide's side
  const _rPoses = new WeakMap();
  const fingerPose = (name, R) => { if (name === 'fore') return sockets.poseL; const e = R && R.poses && R.poses[name];
    if (e) { let p = _rPoses.get(e); if (!p) _rPoses.set(e, p = gripPose(e)); return p; } return POSES[name] || sockets.poseL; };
  const _ka = F(), _kb = F(), _pa = copyPose(HAND_POSES.relaxed);
  function reloadHand(R, u, out) {
    const K = R.hand;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    rockNow = R.rock && R.rock.pivot ? rockAngle(R, u) : 0;
    info.rock = rockNow;
    placeFrame(K[i][1], R, u, _ka); placeFrame(K[j][1], R, u, _kb);
    rockNow = 0;
    lerpF(_ka, _kb, t, out);
    lerpPose(fingerPose(K[i][2], R), fingerPose(K[j][2], R), t, _pa);
    info.handPlace = t < 0.5 ? K[i][1] : K[j][1];
    return _pa;
  }
  function reloadGunOffset(R, u, pos, rot) {
    const K = R.gun;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    const a = K[i][1], b = K[j][1];
    for (let c = 0; c < 3; c++) {
      pos[c] = (a ? a.pos[c] : 0) * (1 - t) + (b ? b.pos[c] : 0) * t;
      rot[c] = (a ? a.rot[c] : 0) * (1 - t) + (b ? b.rot[c] : 0) * t;
    }
  }
  function magState(R, u) {
    if (!R || !R.mag) return 'seated';
    const m = R.mag;
    if (u == null || u < m.grab || u >= m.seat) return 'seated';
    if (u >= m.swapOut && u < m.swapIn) return 'pouch';
    return 'hand';
  }

  // AG-168 (the GPU's first look: the forearms came straight at the eye, the right one across the body): a hand on a
  // grip may turn round it in its fist, so before the wrist bends, the hand turns round its grip channel (its own x
  // through the channel's middle, which stays put) toward its elbow, at most VM.twistMax.
  // CL-305 (J8, Jerry 7 Nov: "Fps Arms elobow popping up and down on run with pistol"): measured in the cloud (steps-elbow3),
  // the gun eased smoothly into the sprint pose while the hand's twist ran -0.27 -> -0.6 and then flipped to +0.6 in one
  // frame (1.19 rad; the forearm followed with 1.08): as the sprint pitches the gun down, the elbow hint passes behind the
  // grip, atan2 crosses +-pi and the clamp changes side. Now a twist keeps the side it was on while the hint is in the far
  // half, and changes at most TWIST_RATE rad/s, per arm and per hint (arm.twist[key]); a new gun starts afresh (dropGun).
  const TWIST_RATE = 5;   // 0.6 rad (the clamp's whole range) in 0.12 s, in step with the sprint's 0.18 s ease; after: the worst frame 0.08 rad (was 1.08)
  let frameDt = 1 / 60;
  const _ta = V3(), _ty = V3(), _td = V3(), _tc = V3(), _tq = Q(), _tp = V3();
  function twistToward(arm, W, hint, max = VM.twistMax, key = 'elbow') {
    _ta.set(1, 0, 0).applyQuaternion(W.q);
    _ty.set(0, 1, 0).applyQuaternion(W.q).addScaledVector(_ta, -_ty.set(0, 1, 0).applyQuaternion(W.q).dot(_ta));
    _td.set(hint[0], hint[1], hint[2]).sub(W.p); _td.addScaledVector(_ta, -_td.dot(_ta));
    if (_ty.lengthSq() < 1e-10 || _td.lengthSq() < 1e-10) return 0;
    _ty.normalize(); _td.normalize();
    let ang = Math.atan2(_tp.crossVectors(_ty, _td).dot(_ta), _ty.dot(_td));
    const tw = arm.twist || (arm.twist = {}), prev = tw[key];
    if (prev != null) {
      if (Math.abs(ang) > Math.PI / 2 && prev !== 0 && Math.sign(ang) !== Math.sign(prev)) ang = Math.sign(prev) * Math.abs(ang);   // the far half: stay on our side
      ang = clamp(ang, -max, max);
      ang = clamp(ang, prev - TWIST_RATE * frameDt, prev + TWIST_RATE * frameDt);
    } else ang = clamp(ang, -max, max);
    tw[key] = ang;
    wristSpacePoint(arm, 'grip', _tc).multiplyScalar(W.s).applyQuaternion(W.q).add(W.p);   // the channel's middle
    _tq.setFromAxisAngle(_ta, ang);
    W.q.premultiply(_tq);
    W.p.sub(_tc).applyQuaternion(_tq).add(_tc);
    return ang;
  }
  // Put an arm's wrist on frame W (view space) and point its forearm at the elbow hint, the wrist bending at most max.
  // CL-334 e (Jerry, 10 Nov: "Setting limits for extension in the arms would prevent impossible movements as well"): the
  // wrist bends as a wrist does, by direction: toward the palm (flexion) and back (extension) as far as max (and 75 / 70
  // degrees), but sideways only 20 degrees toward the thumb and 35 toward the little finger; between them on an ellipse.
  // Seen from the hand (+y toward the elbow, +z the palm's side, +x*side the thumb's edge), the forearm leans toward the
  // palm when the wrist flexes, and toward the thumb's edge when the hand turns toward the thumb (radial; CD-1, Claude 2's proof).
  const WRIST_LIMITS = { flex: 1.31, ext: 1.22, radial: 0.35, ulnar: 0.61 };
  const _y = V3(), _d = V3(), _ax = V3(), _qs = Q(), _qe = Q(), _wp = V3(), _qa = Q(), _hx = V3(), _hz = V3();
  function poseArm(arm, W, hint, max) {
    _y.set(0, 1, 0).applyQuaternion(W.q);
    _d.set(hint[0], hint[1], hint[2]).sub(W.p).normalize();
    {
      const side = arm.side || 1;
      _hx.set(1, 0, 0).applyQuaternion(W.q); _hz.set(0, 0, 1).applyQuaternion(W.q);
      let aF = Math.atan2(_d.dot(_hz), _d.dot(_y)), aD = Math.atan2(_d.dot(_hx) * side, _d.dot(_y));   // aF > 0 flexion; aD > 0 radial (CD-1: in a radial bend the forearm leans to the thumb's edge; the sign was the other way, Claude 2's proof)
      const lf = aF >= 0 ? Math.min(WRIST_LIMITS.flex, max) : Math.min(WRIST_LIMITS.ext, max), ld = aD >= 0 ? WRIST_LIMITS.radial : WRIST_LIMITS.ulnar;
      const e = (aF / lf) * (aF / lf) + (aD / ld) * (aD / ld);
      arm.wristBend = { flex: +aF.toFixed(3), dev: +aD.toFixed(3), over: +e.toFixed(2) };   // for the checks (radians, before the limit)
      if (e > 1) {
        const k = 1 / Math.sqrt(e); aF *= k; aD *= k;
        const tx = Math.tan(aD) * side, tz = Math.tan(aF);
        _d.copy(_y).addScaledVector(_hx, tx).addScaledVector(_hz, tz).normalize();
      }
    }
    let ang = Math.acos(clamp(_y.dot(_d), -1, 1));
    if (ang > max) {
      _ax.crossVectors(_y, _d); if (_ax.lengthSq() < 1e-10) _ax.set(1, 0, 0); _ax.normalize();
      _d.copy(_y).applyQuaternion(_qa.setFromAxisAngle(_ax, max)); ang = max;
    }
    _qs.setFromUnitVectors(_y, _d);
    _qe.copy(_qs).multiply(W.q);
    const se = W.s / HAND_SCALE, L = arm.layout;
    arm.root.quaternion.copy(_qe);
    arm.root.scale.set(se, se, se);
    _wp.set(L.wrist[0], L.wrist[1], L.wrist[2]).multiplyScalar(se).applyQuaternion(_qe);
    arm.root.position.copy(W.p).sub(_wp);
    arm.wrist.quaternion.copy(_qe).invert().multiply(W.q);
    arm.wrist.position.set(L.wrist[0], L.wrist[1], L.wrist[2]);
    arm.wrist.scale.setScalar(HAND_SCALE);
    return ang;
  }
  // The worn parts as his: the glove or the bare hand, the sleeve down or rolled.
  function mirrorWorn(arm, side) {
    const b = side > 0 ? body().r : body().l;
    if (!b) return;
    const gloveOn = b.glove ? b.glove.g.visible : !b.bare;
    arm.parts.glove.visible = gloveOn; arm.parts.bare.visible = !gloveOn;
    const rolled = !!(b.rolled && b.rolled.visible);
    arm.parts.rolled.visible = rolled; arm.parts.sleeve.visible = !rolled;
  }

  // The view gun's frame for this frame (view space), from the pose, the springs and the reload.
  const _hipQ = Q(), _adsQ = Q(), _hipP = V3(), _adsP = V3(), _gp = V3(), _rq = Q(), _grip = V3(), _cdq = Q(), _ciq = Q(), _lv = V3(), _off = V3(), _rqq = Q();
  const _rpos = [0, 0, 0], _rrot = [0, 0, 0];
  const _foreWL = F();   // CL-306
  const adsCache = {};   // per gun: the sights' turn and the rear sight (its own space), constants
  function adsOf(key) {
    if (adsCache[key] !== undefined) return adsCache[key];
    const sg = SIGHT[key];
    if (!sg) return (adsCache[key] = null);
    const f = new T.Vector3(sg.fwd[0], sg.fwd[1], sg.fwd[2]).normalize();
    const u = new T.Vector3(0, 1, 0).addScaledVector(f, -f.y).normalize();
    const r = new T.Vector3().crossVectors(f, u);
    // gun basis [r, u, f] onto the view's [x, y, -z]: R = Bv * Bg^T
    const m = M4(); m.set(r.x, r.y, r.z, 0, u.x, u.y, u.z, 0, -f.x, -f.y, -f.z, 0, 0, 0, 0, 1);
    const q = Q().setFromRotationMatrix(m);
    const rear = sg.notch ? new T.Vector3(0, sg.notch[1], sg.notch[0]) : new T.Vector3(sg.pos[0], sg.pos[1], sg.pos[2]);
    return (adsCache[key] = { q, rear });
  }
  // CL-323: a fitted optic's sight line (index.html's mount.userData.line, in the gun's own space), level along the optic's
  // axis. A red dot keeps the gun where its irons held it (the rear point at the irons' z, P.ads.rear ahead); a magnified
  // optic (the prism, the ACOG) comes up to the eye, its eye point VM.opticRelief ahead, and the world's glass takes over
  // (index.html's #scopeOverlay; the view hides at 82%, as the sniper's). The ACOG's RMR on top: top (st.opticTop 0..1)
  // blends the two lines and the two reliefs (J51).
  const _optQ = Q(), _optRear = V3(), _optAd = { q: _optQ, rear: _optRear, relief: 0, magW: 0 };
  let _optQSet = false;
  function opticAds(key, src, P, top) {
    const m = src && src.userData.fittedOptic, L = m && m.userData.line;
    if (!L || !P.ads) return null;
    if (!_optQSet) { const mm = M4(); mm.set(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1); _optQ.setFromRotationMatrix(mm); _optQSet = true; }   // the gun's +z onto the view's -z
    const sg = SIGHT[key], ironZ = sg ? (sg.notch ? sg.notch[0] : sg.pos[2]) : L.eye[2];
    const R = VM.opticRelief || { acog: 0.10, prism: 0.12 }, mag = R[L.kind] != null;
    const t = L.topEye ? Math.min(1, Math.max(0, top || 0)) : 0;
    let y = L.eye[1], z = mag ? L.eye[2] : ironZ, d = mag ? R[L.kind] : P.ads.rear;
    if (t > 0) { y += (L.topEye[1] - L.eye[1]) * t; z += (ironZ - z) * t; d += (P.ads.rear - d) * t; }
    _optRear.set(0, y, z); _optAd.relief = d; _optAd.magW = mag ? 1 - t : 0;
    return _optAd;
  }
  // CC-342 (J109): the optic's own kick (ok) on each of the gun's shots, at the aim's share as the gun's (P.kick.ads), and
  // the glass's weight: from 55% of the aim to 88%, as index.html fades #scopeOverlay in (optGlass), times its magW (0 on
  // the ACOG's RMR on top).
  function opticKick(P, OA, st, a, dt) {
    const n = gun.src.userData.shots | 0, k = P.kick;
    if (S.okShots != null && S.okGun === gun.src && n !== S.okShots && k && OA) {
      const m = 1 + ((k.ads != null ? k.ads : 1) - 1) * a;
      // a velocity kick, as the camera's (CL-293): it rises over ~65 ms and settles in ~0.25 s; at 0.6 its peak is the
      // gun's own turn a frame after the shot (the M4's ACOG: 40 mrad, a sixth of the 4X field)
      const imp = 2.72 * Math.sqrt(ok.k) * (VM.opticKick != null ? VM.opticKick : 0.6);
      ok.v[1] += k.up * m * imp; ok.v[0] += (Math.random() - 0.5) * 2 * k.side * m * imp;
    }
    S.okShots = n; S.okGun = gun.src; S.opticTop = st.opticTop || 0;
    stepSpring(ok, dt);
    const lim = VM.opticKickMax || 0.12; ok.x[1] = clamp(ok.x[1], -lim, lim); ok.x[0] = clamp(ok.x[0], -lim, lim);
    const u = clamp(((st.ads || 0) - 0.55) / 0.33, 0, 1);
    S.glassW = OA && OA.magW > 0 ? OA.magW * smooth(u) : 0;
  }
  function gunFrame(P, key, st, dt, AK = null) {
    // CL-301 (GP-20022): the view's own grip point (VM_SOCKETS grip) when it has one, so the view holds still when the third
    // person's hold (WEAPON_HOLD grip) moves; the hold's grip otherwise.
    const s = gun.s, H = holdOf(key), AG = VM_SOCKETS[key] && VM_SOCKETS[key].grip, GR = AG || (H && H.grip);
    const grip = GR ? _grip.set(GR[0], GR[1], GR[2]) : _grip.set(0, 0, 0);
    // hip (CL-301: a pair's right gun at VM.akimbo[key]; the left one is its mirror, below)
    const HP = AK || (info.tune[key] && info.tune[key].hip) || P.hip;   // CL-301: info.tune[key].hip to try a hip live
    eulerQ(HP.yaw * MX, HP.pitch, HP.roll * MX, _hipQ).multiply(BORE_AHEAD);
    _hipP.set(HP.at[0] * MX, HP.at[1], HP.at[2]).sub(_gp.copy(grip).multiplyScalar(s).applyQuaternion(_hipQ));
    // down the sights: the sight line onto the view's centre line, the rear sight P.ads.rear ahead of the eye. A pair
    // has no sights: right-click brings both guns in and up a little (VM.akimbo.aim).
    const AP = !AK && P.ads && P.ads.pose;   // CL-322: a sightless gun's raised pose instead of a sight line (the saw: J60)
    const OA = AK || AP ? null : opticAds(key, gun.src, P, st.opticTop);   // CL-323: a fitted optic's line
    const ad = AK || AP ? null : OA || adsOf(key);
    if (ad) {
      _adsQ.copy(ad.q);
      const AR = (info.tune[key] && info.tune[key].adsRear) || P.ads.rear;   // CL-324: live tuning
      _adsP.set(0, 0, -(OA ? OA.relief : AR)).sub(_gp.copy(ad.rear).multiplyScalar(s).applyQuaternion(_adsQ));
    } else if (AP) {
      eulerQ(AP.yaw * MX, AP.pitch, AP.roll * MX, _adsQ).multiply(BORE_AHEAD);
      _adsP.set(AP.at[0] * MX, AP.at[1], AP.at[2]).sub(_gp.copy(grip).multiplyScalar(s).applyQuaternion(_adsQ));
    } else { _adsQ.copy(_hipQ); _adsP.copy(_hipP); }
    const MW = OA && OA.magW > 0 ? OA.magW : key === 'sniper' ? 1 : 0;   // CL-324: the sniper's scope too
    const a = smooth(MW > 0 ? Math.min(1, (st.ads || 0) / (1 - 0.25 * MW)) : (st.ads || 0));   // CL-323: a magnified optic at the eye by 75% of the aim, before its glass
    G.p.copy(_hipP).lerp(_adsP, a); G.q.copy(_hipQ).slerp(_adsQ, a); G.s = s;
    (S.restQ || (S.restQ = Q())).copy(G.q);   // CL-327: the rest pose's turn (the hip, the aim), for boreDelta
    // CL-328 (D-125): the hand-over on a view change (st.swap 0..1, index.html): the gun across from his other hand's side
    // (the pose mirrored across the view) with a dip
    S.swapK = AK || st.swap == null ? 1 : clamp(st.swap, 0, 1);
    if (S.swapK < 1) {
      const k = smooth(S.swapK), W = VM.swap;
      _swP.set(-G.p.x * W.across, G.p.y - W.low, G.p.z); _swQ.set(G.q.x, -G.q.y, -G.q.z, G.q.w);
      G.p.copy(_swP.lerp(G.p, k)); G.p.y -= W.dip * Math.sin(Math.PI * k);
      G.q.copy(_swQ.slerp(G.q, k));
    }
    if (AK && VM.akimbo && VM.akimbo.aim) { const am = VM.akimbo.aim; G.p.x -= am.in * a * MX; G.p.y += am.up * a; G.p.z -= am.fwd * a; }
    // the pivot for the offsets' turns: the grip
    const pivot = _gp.copy(grip).multiplyScalar(s).applyQuaternion(G.q).add(G.p);
    // the view's turn since the last frame (camera space), for the sway
    const cq = camera.quaternion;
    let wy = 0, wx = 0;
    if (S.camQ && dt > 0) { const d = _cdq.copy(S.camQ).invert().multiply(cq); const sgn = d.w < 0 ? -1 : 1; wx = 2 * d.x * sgn / dt; wy = 2 * d.y * sgn / dt; }
    S.camQ = (S.camQ || Q()).copy(cq);
    const sw = VM.sway, adsK = 1 + (sw.ads - 1) * a;
    // CL-293 (MU-31's second suspect): the turn rate low-passed before it moves the gun (the springs chased each delta)
    { const kf = dt > 0 ? 1 - Math.exp(-dt / sw.tau) : 0; S.wx += (clamp(wx, -40, 40) - S.wx) * kf; S.wy += (clamp(wy, -40, 40) - S.wy) * kf; wx = S.wx; wy = S.wy; }
    const lim = sw.lookMax;
    // velocity in the view's space
    const vx = st.vx || 0, vz = st.vz || 0, inv = _ciq.copy(cq).invert(), lv = _lv.set(vx, 0, vz).applyQuaternion(inv);
    sp.rot.t[0] = clamp(-wy * sw.look, -lim, lim) * adsK * MX;     // yaw lags the turn (as the eye sees it)
    sp.rot.t[1] = clamp(-wx * sw.look, -lim, lim) * adsK;          // pitch lags
    sp.rot.t[2] = clamp(wy * sw.look * 0.6 - lv.x * sw.move * 1.5, -lim, lim) * adsK * MX;   // a little roll into the turn and the strafe
    sp.pos.t[0] = clamp(-lv.x * sw.move, -sw.moveMax, sw.moveMax) * adsK * MX;
    sp.pos.t[1] = 0; sp.pos.t[2] = clamp(-lv.z * sw.move * 0.5, -sw.moveMax * 0.6, sw.moveMax * 0.6) * adsK;
    // landing
    if (st.grounded && !S.wasGrounded) { const dip = Math.min(VM.land.max, Math.abs(S.fallV) * VM.land.per); sp.pos.v[1] -= dip * 28; sp.rot.v[1] -= dip * 9; }
    S.wasGrounded = !!st.grounded; if (!st.grounded) S.fallV = st.vy || 0;
    // the shot: recoil and the slide
    const ft = gun.src.userData.shots | 0;   // index.html triggerMuzzleFlash counts them (on the gun that fired)
    if (ft !== S.lastFlashT && S.lastFlashT != null) { shotKick(AK ? KA : sp, P.kick, a, AK ? VM.akimbo.kick : 1); S.slideT = 0; S.shots++; }
    S.lastFlashT = ft;
    if (AK && gun2) {   // CL-301: the left gun's own shots kick it alone
      const f2 = gun2.src.userData.shots | 0;
      if (f2 !== S.lastFlashT2 && S.lastFlashT2 != null) { shotKick(KB, P.kick, a, VM.akimbo.kick); S.slideT2 = 0; S.shots2++; }
      S.lastFlashT2 = f2;
    }
    opticKick(P, OA, st, a, dt);   // CC-342 (J109)
    stepSpring(sp.pos, dt); stepSpring(sp.rot, dt);
    stepSpring(KA.pos, dt); stepSpring(KA.rot, dt); stepSpring(KB.pos, dt); stepSpring(KB.rot, dt);
    stepSpring(cs, dt); if (VM.camera) cs.x[0] = clamp(cs.x[0], -VM.camera.max, VM.camera.max);
    // the walk's bob and breathing. CL-293 (J55): on his stride (st.phase is index.html's walkPhase, the cycle his legs
    // and his eye are on): across and a roll once a stride, down once a step, a little yaw for the figure eight; walk to
    // run by his run weight (st.run, POSE.gaitRun). Without a phase it keeps its own at his legs' cadence.
    const speed = Math.hypot(vx, vz), b = VM.bob, bw = st.grounded ? Math.min(1, speed / 3) : 0;
    S.bobW += (bw - S.bobW) * (1 - Math.exp(-6 * dt));
    const runW = st.run != null ? clamp(st.run, 0, 1) : smooth((speed - 8) / 3);
    S.run += (runW - S.run) * (1 - Math.exp(-6 * dt));
    if (st.phase != null && isFinite(st.phase)) S.bobPhase = st.phase;
    else if (speed > 0.3) S.bobPhase = (S.bobPhase + dt * (b.cadence[0] + (b.cadence[1] - b.cadence[0]) * S.run)) % (Math.PI * 2);
    S.time += dt;
    const RB = (AK ? VM.akimbo.runBob : P.runBob) || 1;   // CL-325 (J73): the handguns' jog: more bob at a run
    const mixRun = (v) => v[0] + (v[1] * RB - v[0]) * S.run;
    const bk = S.bobW * (1 + (b.ads - 1) * a), br = VM.breathe, bth = Math.sin(S.time * Math.PI * 2 * br.rate) * (1 + (br.ads - 1) * a);
    const bs = Math.sin(S.bobPhase), bd = (Math.cos(2 * S.bobPhase) - 1) * 0.5;   // across (-1..1), down (0..-1)
    // the sprint (not down the sights): down, across toward the middle, back, and turned in; eased in and out
    const firing = (S.slideT != null && S.slideT < 0.5 && S.shots > 0) || !!st.stream;   // CL-324 (J89): a shot (or the flamer's stream) brings the gun to the aim at once
    const spWant = firing ? 0 : (st.sprint != null ? (st.sprint ? 1 : 0) : (S.run > 0.6 && speed > 9 ? 1 : 0)) * (st.grounded ? 1 : S.sprint > 0.5 ? 1 : 0) * (1 - a) * (st.reloadU != null ? 0.4 : 1);
    { const ps = info.tune.sprint || (AK ? VM.akimbo.sprint : P.sprint) || VM.sprint, tau = firing ? 0.035 : spWant > S.sprint ? ps.in : ps.out; S.sprint += (spWant - S.sprint) * (dt > 0 ? 1 - Math.exp(-dt / tau) : 0); }
    const spr = smooth(S.sprint), PS = info.tune.sprint || (AK ? VM.akimbo.sprint : P.sprint) || VM.sprint;   // CL-293: live tuning; CL-325: per gun / the pairs
    // CL-293 (J59): a stream (the flamer held) pushes the gun back and up a little, eased in over 0.3 s and held while it
    // runs, with a slow sway of the nozzle; no shake. Out over 0.2 s when it stops.
    { const pw = st.stream ? 1 : 0, tp = pw > S.push ? 0.3 : 0.2; S.push += (pw - S.push) * (dt > 0 ? 1 - Math.exp(-dt / tp) : 0); }
    const pu = smooth(S.push), PB = VM.push || { back: 0.03, up: 0.006, pitch: 0.035, sway: 0.004, rate: 1.3 }, psw = Math.sin(S.time * Math.PI * 2 * PB.rate) * PB.sway * pu;
    const off = _off.set(sp.pos.x[0] + bs * mixRun(b.x) * bk - PS.across * spr * MX,
      sp.pos.x[1] + bd * mixRun(b.y) * bk + bth * br.y - PS.down * spr,
      sp.pos.x[2] + PS.back * spr + PB.back * pu);
    off.x += psw * MX; off.y += PB.up * pu;
    const rq = eulerQ(sp.rot.x[0] + (bs * mixRun(b.yaw) * bk + PS.yaw * spr) * MX, sp.rot.x[1] + bth * br.pitch + PS.pitch * spr + PB.pitch * pu,
      sp.rot.x[2] + (bs * mixRun(b.roll) * bk + PS.roll * spr) * MX, _rqq);
    // the reload's own moves (CL-301: a pair dips out of the view and comes back up loaded)
    const R = reloadOf(P, st);   // CL-306: the tactical path when rounds are left
    S.pairDip = null;
    if (AK && st.reloadU != null) {
      // CL-306 (the audit: both guns dipped together and nothing else happened): each gun in turn, the right first, on the
      // body's own windows (index.html akimboReloadDip, GB-300's cylinders): applied after the mirror, in update(), so the
      // left gun has its own dip. A pistol or a Wasp goes down out of the view to its pouch and comes back up loaded; a
      // revolver stays in view, muzzle up, for its cylinder.
      const u = clamp(st.reloadU, 0, 1), seg = (a, b) => smooth((u - a) / (b - a));
      S.pairDip = { r: seg(0.06, 0.24) * (1 - seg(0.34, 0.50)), l: seg(0.48, 0.66) * (1 - seg(0.76, 0.92)) };
    } else if (R && st.reloadU != null) {
      const pos = _rpos, rot = _rrot;
      reloadGunOffset(R, st.reloadU, pos, rot);
      pos[0] *= MX; rot[0] *= MX; rot[2] *= MX;   // written as the eye sees it
      const k = 1 - a * 0.7;
      off.x += pos[0] * k; off.y += pos[1] * k; off.z += pos[2] * k;
      rq.multiply(eulerQ(rot[0] * k, rot[1] * k, rot[2] * k, _rq));
    }
    // CE-3: through an ammo change's unload the gun rolls its ejection port toward the eye, eased in and out (R.unload)
    { const U = !AK && R && R.unload, want = U && S.unloadW ? 1 : 0, tau = ((U && U.ease) || 0.12) / 3;
      S.unloadK = (S.unloadK || 0) + (want - (S.unloadK || 0)) * (dt > 0 ? 1 - Math.exp(-dt / tau) : 0);
      if (U && S.unloadK > 0.0005 && st.reloadU == null) {
        const k = smooth(S.unloadK) * (1 - a * 0.7);
        off.x += U.pos[0] * MX * k; off.y += U.pos[1] * k; off.z += U.pos[2] * k;
        rq.multiply(eulerQ(U.rot[0] * MX * k, U.rot[1] * k, U.rot[2] * MX * k, _rq));
      } }
    // raised from below
    const lo = 1 - smooth(S.raise);
    off.y -= 0.26 * lo; off.z += 0.06 * lo;
    rq.multiply(_eq.setFromAxisAngle(AX_X, -0.85 * lo));
    // turns about the grip, then the offset
    G.p.sub(pivot).applyQuaternion(rq).add(pivot).add(off);
    G.q.premultiply(rq);
  }

  // CE-2: the trigger finger's scratch, and the hold's give without the index finger's vertices (the give fades with the
  // whole pose's distance from the fit, so an index on the trigger would take the other fingers' give with it): its pose
  // keeps the fit's but for the index, which follows the hand's own.
  let _trigPose = copyPose(HAND_POSES.relaxed); const _trgP = V3(), _trgQ = Q(), trigContacts = new Map();
  function trigContact(key, pose) {
    const c0 = handContact(key, 'r'); if (!c0) return null;
    let c = trigContacts.get(key);
    if (!c || c.src !== c0) {
      c = { src: c0, pose: copyPose(c0.pose) };
      for (const kind of ['glove', 'bare', 'pads']) {
        const K = c0[kind], sk = arms.r.rig.skins && arms.r.rig.skins.find((x) => x.kind === kind);
        if (!K || !sk) { c[kind] = K; continue; }
        const keep = [];
        for (let i = 0; i < K.idx.length; i++) { const v = K.idx[i], w = sk.w1[v], a = sk.seg[v], b = sk.b1[v]; if (!((a >= 1 && a <= 3 && 1 - w > 0.2) || (b >= 1 && b <= 3 && w > 0.2))) keep.push(i); }
        const idx = new Uint16Array(keep.length), d = new Float32Array(keep.length * 3);
        keep.forEach((i, n) => { idx[n] = K.idx[i]; d[n * 3] = K.d[i * 3]; d[n * 3 + 1] = K.d[i * 3 + 1]; d[n * 3 + 2] = K.d[i * 3 + 2]; });
        c[kind] = { idx, d };
      }
      trigContacts.set(key, c);
    }
    for (let j = 0; j < 4; j++) c.pose.f[0][j] = pose.f[0][j];
    return c;
  }
  // CE-2 (J110, J130): controls that show the gun's state (VM_CONTROLS): the selector's lever eased to the turn for
  // st.fireMode about its axle. Runs after mirrorParts (his own gun's selector doesn't turn), so each frame from the rest.
  // CE-9 (J149, D-177): every row of VM_CONTROLS[key] (a userData.controls name) the same way: a turn (rad) about its
  // axis or a slide (m) along it, from the part's rest, k of the way (0..1) by what drives it: turns (the selector per
  // st.fireMode, or fixed), ready (the gun up: a safety off, a grip safety squeezed, a switch armed), fire (the trigger
  // held), reload (beats [in, held, out, home] of the authored reload, or a list of them; the empty one only with empty)
  // or unload (beats of an ammo change's unload, S.unloadW; first: on its first shell only, CE-10). A part the
  // gun's own action already moves (the view's work, pump or the launcher's latch) is never in a row.
  const _ctlP = V3(), _ctlQ = Q(), _ctlA = V3(), ctlAng = {};
  const ctlAxis = (a, out) => (Array.isArray(a) ? out.set(a[0], a[1], a[2]).normalize() : out.copy(a === 'y' ? AX_Y : a === 'z' ? AX_Z : AX_X));
  const beats = (u, b) => (u == null || u < b[0] || u > b[3] ? 0 : u < b[1] ? smooth((u - b[0]) / Math.max(1e-4, b[1] - b[0])) : u <= b[2] ? 1 : 1 - smooth((u - b[2]) / Math.max(1e-4, b[3] - b[2])));
  function reloadBeatU(g, st) {   // the reload's u on its authored beats (a tactical path is cut after the seat and stretched)
    if (st.reloadU == null) return null;
    const P = VM_POSES[g.key], R0 = P && P.reload && VM_RELOADS[P.reload], R = P && reloadOf(P, st), u = clamp(st.reloadU, 0, 1);
    if (!R0 || !R || !R.tactical || R0.tacticalRack || !R0.mag) return u;
    return u * Math.min(0.9, (R0.mag.seat || 0.6) + 0.1);
  }
  // CE-9b (J149: "... as separate moving parts the hands can work"): a row with a hand in VM_SELECT (game/viewmodel-poses.js)
  // waits for its digit: on a change (X, or the gun coming up past VM_SELECT.upAt) the firing thumb (or index) goes onto
  // the lever in H.reach s, the lever turns under it (the row's time), the digit stays H.hold s, then goes back to the grip
  // in H.back s; ctlHand[name].e is how far the digit is on (0..1). Going down (or the gun put away for a blade) the
  // safety goes back with the raise as before. The digit's values follow the lever's angle (H.at/H.v, handCtlPose).
  const ctlHand = {};
  function controlStates(g, st, dt) {
    const C = (info.tune.controls && info.tune.controls[g.key]) || VM_CONTROLS[g.key]; if (!C) return;   // live: info.tune.controls = { <key>: rows }
    if (ctlAng.gun !== g) { for (const k in ctlAng) delete ctlAng[k]; for (const k in ctlHand) delete ctlHand[k]; ctlAng.gun = g; }
    const HS = (info.tune.select && info.tune.select[g.key]) || VM_SELECT[g.key];   // live: info.tune.select = { <key>: { <control>: H } }
    const ub = reloadBeatU(g, st), out = info.controls = {};
    for (const name in C) {
      const R = C[name], part = g.ctrls[name];
      if (!R || !part || part.parent == null) continue;
      const H = HS && HS[name] && !gun2 ? HS[name] : null;
      let want = 0;
      if (R.turns) want = st.fireMode && R.turns[st.fireMode] != null ? R.turns[st.fireMode] : R.fixed && R.turns[R.fixed] != null ? R.turns[R.fixed] : 0;
      else {
        let k = 0;
        if (R.ready && H) k = Math.max(k, S.rising && S.raise > VM_SELECT.upAt ? 1 : Math.min(smooth(S.raise), ctlAng[name] != null && (R.turn || R.slide) ? Math.abs(ctlAng[name] / (R.turn || R.slide)) : 1));
        else if (R.ready) k = Math.max(k, smooth(S.raise));
        if (R.fire && st.fireHeld && S.raise > 0.98) k = Math.max(k, 1);
        if (R.reload && !(R.empty && st.reloadEmpty === false)) for (const b of (Array.isArray(R.reload[0]) ? R.reload : [R.reload])) k = Math.max(k, beats(ub, b));
        if (R.unload && S.unloadW && !(R.first && (S.unloadW.unloaded | 0) > 0)) k = Math.max(k, beats(clamp(S.unloadW.u, 0, 1), R.unload));   // CE-10 (J151 note 12): first, the first shell's only
        want = k * (R.turn != null ? R.turn : R.slide || 0);
      }
      const id = name; let a = ctlAng[id];
      const hd = H ? (ctlHand[id] || (ctlHand[id] = { e: 0, h: 0 })) : null;
      if (a == null) a = H && R.ready ? 0 : want;   // with a hand the safety starts on (the gun comes up from below)
      else if ((R.reload || R.unload) && !R.ready && !R.fire && !R.turns) a = want;   // a reload's beats are their own easing
      else if (R.ready && !R.fire && !R.turns && Math.abs(want) < Math.abs(a) && !(R.reload && ub != null)) a = want;   // back on safe with the gun as it goes down (the raise is the easing)
      else if (hd && Math.abs(want - a) > 1e-5 && hd.e < 1) { /* the lever waits for the digit */ }
      else { const span = Math.abs(R.turns ? (R.turns.auto != null && R.turns.semi != null ? R.turns.auto - R.turns.semi : want) : (R.turn != null ? R.turn : R.slide || 0)) || 1;
        const step = span * (dt / (R.time || 0.12)); a += Math.max(-step, Math.min(step, want - a)); }
      const HH = info.tune.handHold;   // the cloud's strips: { control, a, e } holds a lever (and its digit) still
      if (HH && HH.control === name) { a = HH.a; if (hd) { hd.e = HH.e; hd.h = 0; } }
      else if (hd) {
        if (Math.abs(want - a) > 1e-5 && !(R.ready && Math.abs(want) < Math.abs(a))) { hd.h = 0; hd.e = Math.min(1, hd.e + dt / H.reach); }
        else if ((hd.h += dt) > H.hold) hd.e = Math.max(0, hd.e - dt / H.back);
      }
      if (hd) hd.a = a;
      ctlAng[id] = a; out[name] = a;
      if (Math.abs(a) < 1e-6) continue;
      ctlAxis(R.axis, _ctlA);
      if (R.slide != null && R.turn == null && !R.turns) { part.position.addScaledVector(_ctlA, a); continue; }
      const pv = R.axle || R.pivot, rp = part.position;
      _ctlP.set(pv && pv[0] != null ? pv[0] : rp.x, pv && pv[1] != null ? pv[1] : rp.y, pv && pv[2] != null ? pv[2] : rp.z);
      _ctlQ.setFromAxisAngle(_ctlA, a);
      part.position.sub(_ctlP).applyQuaternion(_ctlQ).add(_ctlP); part.quaternion.premultiply(_ctlQ);
    }
    if (out.selector != null) info.selector = out.selector;
  }
  // CE-9b: the busiest VM_SELECT control (the digit most of the way on), its row's values at the lever's angle: the hand's
  // move (x: [dx, dy, dz] in the gun's space and a roll phi about the gun's z through the palm H.palm, so the digit can
  // reach) and the digit's values, eased in by e. handCtlMove moves the firing wrist before the arm is posed; handCtlPose
  // puts the digit's values on the hand's pose after the trigger finger has been set.
  let _hcPose = copyPose(HAND_POSES.relaxed);
  const _hc = { H: null, name: null, e: 0, a: 0, k: 0, i: 0, u: 0 }, _hcM = F(), _hcGi = F(), _hcW = F(), _hcV = V3(), _hcP0 = V3();
  function handCtlPick(g) {
    _hc.H = null; info.handCtl = null;
    const HS = (info.tune.select && info.tune.select[g.key]) || VM_SELECT[g.key];
    if (!HS || ctlAng.gun !== g || gun2) return null;
    let best = null, bn = null;
    for (const n in ctlHand) if (HS[n] && ctlHand[n].e > 1e-4 && (!best || ctlHand[n].e > best.e)) { best = ctlHand[n]; bn = n; }
    if (!best) return null;
    const H = HS[bn], at = H.at, a = best.a;
    let i = 0; while (i < at.length - 2 && (at[1] > at[0] ? a > at[i + 1] : a < at[i + 1])) i++;
    _hc.H = H; _hc.name = bn; _hc.e = best.e; _hc.a = a; _hc.k = smooth(best.e); _hc.i = i; _hc.u = clamp((a - at[i]) / ((at[i + 1] - at[i]) || 1), 0, 1);
    info.handCtl = { control: bn, digit: H.digit || 'thumb', e: best.e, a };
    return _hc;
  }
  function handCtlMove(W, e) {
    const H = _hc.H; if (!H || !H.x) return;
    const A = H.x[_hc.i], B = H.x[_hc.i + 1], u = _hc.u, lx = (j) => A[j] + (B[j] - A[j]) * u;
    const phi = lx(3), c = Math.cos(phi), sn = Math.sin(phi), P = H.palm;
    _hcM.q.set(0, 0, Math.sin(phi / 2), Math.cos(phi / 2)); _hcM.s = 1;
    _hcM.p.set(P[0] + lx(0) - (c * P[0] - sn * P[1]), P[1] + lx(1) - (sn * P[0] + c * P[1]), P[2] + lx(2) - P[2]);
    _hcGi.q.copy(G.q).invert(); _hcGi.s = 1 / G.s; _hcGi.p.copy(G.p).multiplyScalar(-_hcGi.s).applyQuaternion(_hcGi.q);
    mul(_hcGi, W, _hcW); mul(_hcM, _hcW, _hcW); mul(G, _hcW, _hcW);
    _hcP0.copy(W.p); lerpF(W, _hcW, _hc.k, W);
    _hcV.copy(W.p).sub(_hcP0); e[0] += _hcV.x; e[1] += _hcV.y; e[2] += _hcV.z;
  }
  function handCtlPose(g, pose) {
    const H = _hc.H; if (!H) return null;
    const A = H.v[_hc.i], B = H.v[_hc.i + 1], u = _hc.u, k = _hc.k;
    _hcPose = copyPose(pose, _hcPose);
    const dst = H.digit === 'index' ? _hcPose.f[0] : _hcPose.t;
    for (let j = 0; j < A.length; j++) { const v = A[j] + (B[j] - A[j]) * u; dst[j] = dst[j] + (v - dst[j]) * k; }
    return _hcPose;
  }
  // CE-4 (J16; ChatGPT 2's GT-20084 switch): 2 in first person, the light's switch pressed by the support thumb (index.html
  // st.lightPress: t s since the key; the light changes at VM_LIGHT's 'at', the pad fully in). The hand leaves its hold,
  // turned about the palm by the gun's E.r and slid (gun space) so the pressing digit's pad or tip (E.pad on its end bone
  // E.k: the thumb's or a finger's) comes onto the switch's contact from VM_LIGHT.gap out along its axis, presses it in its
  // travel (the eye copy's pad moves with it: the switch's node), lifts off and goes home. That digit's own values E.v (E.fi
  // the finger, -1 the thumb), the rest of the hand eased toward relaxed by E.o (solved in the cloud against the gun as
  // drawn, nothing of the glove in it: Claude 5's solve-light). Null when there is no press to show.
  const LIGHT_RELAX = { f: VM_LIGHT.curl, t: HAND_POSES.relaxed.t };
  const _lpFull = copyPose(HAND_POSES.relaxed), _lpPose = copyPose(HAND_POSES.relaxed), _lpGi = F(), _lpH = F(), _lpW = F(), _lpM = M4(), _lpM2 = M4(),
    _lpC = V3(), _lpA = V3(), _lpPad = V3(), _lpPiv = V3(), _lpQ = Q(), _lpV = V3(), _lpHold = V3(), _lpZ = V3();
  function lightTimes() { const T0 = VM_LIGHT.times, t1 = T0.reach, t2 = t1 + T0.press, t3 = t2 + T0.hold, t4 = t3 + T0.lift; return { t1, t2, t3, t4, t5: t4 + T0.back, at: t1 + T0.press * 0.5 }; }
  function lightRest(sw) {
    const r = sw.userData.restPosition || sw.userData.vmLightRest || (sw.userData.vmLightRest = sw.position.toArray());
    sw.position.fromArray(r); return r;
  }
  function lightPressFrame(WL, hold, st) {
    const TL = info.tune.light, LP = st.lightPress || (TL && typeof TL.t === 'number' ? { t: TL.t } : null);   // live: info.tune.light = { t, <key>: { r, t, o } }
    const E = (TL && TL[gun.key]) || VM_LIGHT[gun.key], sw = gun.ctrls.lightSwitch, ls = gun.src.userData.lightSwitch;
    info.light = null;
    if (!sw || !ls) return null;
    const rest = lightRest(sw);
    if (!LP || !E || gun2 || LP.t == null || LP.t < 0) return null;
    const TT = lightTimes(), t = LP.t;
    if (t >= TT.t5) return null;
    const k = t < TT.t4 ? smooth(t / TT.t1) : 1 - smooth((t - TT.t4) / VM_LIGHT.times.back);
    const press = t < TT.t1 ? 0 : t < TT.t2 ? smooth((t - TT.t1) / VM_LIGHT.times.press) : t < TT.t3 ? 1 : 1 - smooth((t - TT.t3) / VM_LIGHT.times.lift);
    const gap = VM_LIGHT.gap * (t < TT.t1 ? 1 - smooth(t / TT.t1) : t < TT.t3 ? 0 : smooth((t - TT.t3) / VM_LIGHT.times.lift));
    // the switch's node in the gun's space (its parents' own frames up to the gun's root), its contact and inward axis
    _lpM.identity(); for (let o = sw.parent; o && o !== gun.root; o = o.parent) { o.updateMatrix(); _lpM.premultiply(o.matrix); }
    _lpC.fromArray(rest).applyMatrix4(_lpM);
    _lpA.fromArray(ls.axis).transformDirection(_lpM);
    // the press pose and its pad (hand space)
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) _lpFull.f[i][j] = hold.f[i][j] + (LIGHT_RELAX.f[i][j] - hold.f[i][j]) * E.o;
    for (let j = 0; j < 6; j++) _lpFull.t[j] = (hold.t[j] || 0) + ((LIGHT_RELAX.t[j] || 0) - (hold.t[j] || 0)) * E.o;
    if (E.fi < 0) for (let j = 0; j < 6; j++) _lpFull.t[j] = E.v[j]; else for (let j = 0; j < 4; j++) _lpFull.f[E.fi][j] = E.v[j];
    const rig = arms.l.rig, Lw = arms.l.layout.wrist;
    rig.set(_lpFull); const m = rig.matrices()[E.k];
    const px = E.pad[0], py = E.pad[1], pz = E.pad[2];
    _lpPad.set(m[0] * px + m[1] * py + m[2] * pz + m[3], m[4] * px + m[5] * py + m[6] * pz + m[7], m[8] * px + m[9] * py + m[10] * pz + m[11]);
    const palm = rig.point('palm', _lpPiv);
    // the wrist on its hold in the gun's space, turned about the palm by E.r
    _lpGi.q.copy(G.q).invert(); _lpGi.s = 1 / G.s; _lpGi.p.copy(G.p).multiplyScalar(-_lpGi.s).applyQuaternion(_lpGi.q);
    mul(_lpGi, WL, _lpH);
    const hp = (x, out) => out.copy(x).sub(_lpV.fromArray(Lw)).multiplyScalar(_lpH.s).applyQuaternion(_lpH.q).add(_lpH.p);
    hp(palm, _lpPiv);
    const ang = Math.hypot(E.r[0], E.r[1], E.r[2]);
    if (ang > 1e-9) {
      _lpQ.setFromAxisAngle(_lpV.set(E.r[0] / ang, E.r[1] / ang, E.r[2] / ang), ang);
      _lpH.p.sub(_lpPiv).applyQuaternion(_lpQ).add(_lpPiv); _lpH.q.premultiply(_lpQ);
    }
    // slid so the pad is on the contact (out by the gap, in by the press)
    const padG = _lpPad.sub(_lpV.fromArray(Lw)).multiplyScalar(_lpH.s).applyQuaternion(_lpH.q).add(_lpH.p);
    _lpH.p.add(_lpV.copy(_lpC).addScaledVector(_lpA, -(VM_LIGHT.face + gap) + ls.travel * press).sub(padG));
    mul(G, _lpH, _lpW);
    // CE-9 (13 Nov): off the hold first: E.release (gun units) along the hold's palm normal, quick out and late in, and with
    // E.ease 2 the hand heads for the switch and turns only once it is out (k squared): heading straight off the hold it
    // turned its fingers through the fore-end or the pump
    _lpZ.set(0, 0, 1).applyQuaternion(WL.q);
    lerpF(WL, _lpW, E.ease === 2 ? k * k : k, WL);
    if (E.release && k > 0 && k < 1) WL.p.addScaledVector(_lpZ, E.release * Math.sqrt(4 * k * (1 - k)) * G.s);
    // CE-9 (tce4; J151 notes 17 and 46, the arm and the thumb through the GW-4 and the sniper working the light): on the way
    // to the switch and back the hand arcs out from the gun along the switch's outward axis (E.lift gun units at the
    // middle of the way, VM_LIGHT.lift by default) instead of cutting straight through the light and the fore-end
    // (E.arc [x, y, z]: the way out in the gun's own axes instead, for a gun whose light sits where outward runs into it)
    { const arc = E.arc || (E.lift != null ? E.lift : VM_LIGHT.lift || 0), w = 4 * k * (1 - k);
      if (arc && k > 0 && k < 1) {
        if (Array.isArray(arc)) _lpV.set(arc[0], arc[1], arc[2]); else _lpV.copy(_lpA).multiplyScalar(-arc);
        WL.p.add(_lpV.multiplyScalar(w * G.s).applyQuaternion(G.q));
      } }
    // the eye copy's pad in by the thumb (the switch's node; studio/weapon-light-switch.js moves the pad's vertices)
    if (press > 0) { sw.position.x += ls.axis[0] * ls.travel * press; sw.position.y += ls.axis[1] * ls.travel * press; sw.position.z += ls.axis[2] * ls.travel * press; }
    info.light = { t, k, press, gap };
    return lerpPose(hold, _lpFull, k, _lpPose);
  }
  // CE-1: a shot's stroke: 0 to 1 by tb, held to th, home (0) by te; 0 outside.
  const stroke = (t, tb, th, te) => (t < 0 ? 0 : t < tb ? smooth(t / tb) : t < th ? 1 : t < te ? 1 - smooth((t - th) / (te - th)) : 0);
  // CE-1 (GT-20075, Claude 5): the action on a view copy, t seconds after its last shot. Runs after mirrorParts, which
  // puts every part back where his own gun has it, so a part left alone shows the third-person gun's own pose.
  function actionCycle(g, P, t, st) {
    const A = P.action || {}, ud = g.src.userData || {};
    const slide = A.slide || (P.slideKick ? { travel: P.slideKick, t: [0.018, 0.018, 0.075] } : null);
    if (g.slide && slide) g.slide.position.z -= slide.travel * stroke(t, slide.t[0], slide.t[1], slide.t[2]);
    const work = A.work || (P.workKick ? { travel: P.workKick, t: [0.018, 0.018, 0.075] } : null);   // a handle that rides the carrier
    if (g.work && g.work !== g.slide && work && work.travel) g.work.position.z -= work.travel * stroke(t, work.t[0], work.t[1], work.t[2]);
    const bolt = A.bolt || (P.boltStroke ? { travel: P.boltStroke, t: [0.04, 0.04, 0.13] } : null);
    if (g.recoilBolt && bolt && ud.recoilBoltPose) {
      const travel = bolt.travel === 'port' ? ud.portStroke || 0 : bolt.travel;
      ud.recoilBoltPose(g.recoilBolt, travel * stroke(t, bolt.t[0], bolt.t[1], bolt.t[2]));
    }
    // A double action: at the shot the sear has broken (the trigger back, the hammer down on the pin); the trigger
    // goes forward again to its reset and the hammer stays down (resetting). Not in a reload: that has the hammer.
    const da = A.doubleAction;
    // J118 (CLAUDE DIRECTOR's (c), 11 Nov: "Hammer needs to pull back on trigger pull like it would in real double action"):
    // while index.html's trigger lead runs (st.triggerPull.u, 0 at the click, 1 at the break) the pull draws the hammer up
    // to full cock (.88 of the travel); the round goes at the break and the reset follows as above
    const lead = st.triggerPull && st.triggerPull.weapon === g.key && st.triggerPull.u != null && g === gun ? clamp(st.triggerPull.u, 0, 1) : null;
    if (da && g.trigger && g.hammer && ud.doubleActionPose && st.reloadU == null) {
      if (lead != null) ud.doubleActionPose(g.trigger, g.hammer, 0.88 * lead, false);
      else if (t < da.t[2]) ud.doubleActionPose(g.trigger, g.hammer, stroke(t, da.t[0], da.t[1], da.t[2]), true);
    }
    // CE-6 (J136): index.html's indexChambers turns his own gun's cylinder (ud.chamberIndex), and mirrorParts has brought it
    // here; the view's own turn below only for a gun that doesn't carry one
    if (da && g.cylinder && ud.chamberNoses) { if (ud.chamberIndex) info.cylSpin = ud.chamberIndex.s; else cylinderTurn(g, ud.chamberNoses, lead, st); }
  }
  // CE-2 (J118: "the cylinder turns at the eye"): the view's cylinder indexed to its rounds. index.html fills chambers 0..L-1
  // (live) and fires them from L-1 down (revolverChambers), each chamber at 30 + 60i degrees round the cylinder's axis, the
  // top (90) on the bore under the hammer. At rest the chamber just fired (L) sits under the hammer; a pull turns the next
  // live one (L-1) up by the time the hammer is at full cock (u 0.85), and the break leaves it there (L-1 is then the
  // rest). In chamber steps: rest 1 - L, a pull adds up to one. Let go before the break and it eases back (6 steps/s).
  // The turn is index.html's order: clockwise from behind, as a Colt's (a Smith & Wesson turns the other way).
  const _cylQ = Q();
  function cylinderTurn(g, noses, lead, st) {
    let L = 0; for (const n of noses) if (n && n.visible) L++;
    const want = 1 - L + (lead != null ? smooth(clamp(lead / 0.85, 0, 1)) : 0);
    let s = g.cylSpin;
    if (s == null || st.reloadU != null) s = want;
    else {
      let d = want - s; d -= 6 * Math.round(d / 6);   // the nearest way round
      if (lead != null || d >= -1e-6) s += d;   // the pull, and the break's new count: at once
      else s += Math.max(d, -6 * frameDt);   // let go before the break (or rounds put in outside a reload): back, eased
    }
    s -= 6 * Math.floor(s / 6); g.cylSpin = s; info.cylSpin = s;
    if (Math.abs(s) > 1e-5) g.cylinder.quaternion.multiply(_cylQ.setFromAxisAngle(AX_Z, s * Math.PI / 3));
  }
  // A shot's kick into a pair of springs (back, up, a random side), and the view's share of it (CL-293).
  function shotKick(K, k, a, mul = 1) {
    const m = (1 + (k.ads - 1) * a) * mul;
    K.pos.x[2] += k.back * m; K.rot.x[1] += k.up * m; K.rot.x[0] += (Math.random() - 0.5) * 2 * k.side * m;
    const C = VM.camera;   // CL-293: a velocity kick, so the view rises over a few frames instead of jumping (peak = share x up)
    if (C) { const imp = 2.72 * Math.sqrt(cs.k); cs.v[0] += k.up * m * C.share * imp; cs.v[1] += (Math.random() - 0.5) * 2 * k.side * m * C.side * imp; }
  }
  // CL-301: the frame mirrored across the view's middle (x to -x), the gun's own x mirrored too, so it's a turn, not a
  // reflection: the left gun is the right one's double, the right way out.
  const mirrorFrame = (a, out) => { out.p.set(-a.p.x, a.p.y, a.p.z); out.q.set(a.q.x, -a.q.y, -a.q.z, a.q.w); out.s = a.s; return out; };
  // A pair's own kick (K) on a gun's frame, turned about its grip (gx: the grip's x, mirrored for the left gun).
  const _kq = Q(), _kp = V3();
  // CL-306: a pair's reload dip on one gun's frame (view space): down and back by k, pitched (muzzle up) and rolled in.
  const _dipQ = Q(), _dipP = V3();
  function dipFrame(Fr, D, k, sx, grip, gx) {
    if (!(k > 0.0005)) return;
    const pivot = _dipP.set(gx, grip.y, grip.z).multiplyScalar(Fr.s).applyQuaternion(Fr.q).add(Fr.p);
    eulerQ(0, D.pitch * k, D.roll * k * sx, _dipQ);
    Fr.p.sub(pivot).applyQuaternion(_dipQ).add(pivot);   // turns about the grip, like the kick
    Fr.q.premultiply(_dipQ);
    Fr.p.x += (D.out || 0) * k * sx; Fr.p.y -= D.down * k; Fr.p.z += D.back * k;
  }
  function kickFrame(Fr, K, grip, gx) {
    const pivot = _kp.set(gx, grip.y, grip.z).multiplyScalar(Fr.s).applyQuaternion(Fr.q).add(Fr.p);
    eulerQ(K.rot.x[0], K.rot.x[1], K.rot.x[2], _kq);
    Fr.p.sub(pivot).applyQuaternion(_kq).add(pivot); Fr.p.x += K.pos.x[0]; Fr.p.y += K.pos.x[1]; Fr.p.z += K.pos.x[2];
    Fr.q.premultiply(_kq);
  }
  // The right wrist's place on the right gun, mirrored onto the left gun for the left hand: its grip point where the right
  // hand's grip point is, mirrored (the two hands' layouts differ by a centimetre or so).
  const _ms1 = V3(), _ms2 = V3(), _srA = F();
  function mirrorSocket(sr, out) {
    out.q.set(sr.q.x, -sr.q.y, -sr.q.z, sr.q.w); out.s = sr.s;
    wristSpacePoint(arms.r, 'grip', _ms1).multiplyScalar(sr.s).applyQuaternion(sr.q).add(sr.p); _ms1.x = -_ms1.x;
    wristSpacePoint(arms.l, 'grip', _ms2).multiplyScalar(out.s).applyQuaternion(out.q);
    out.p.copy(_ms1).sub(_ms2);
    return out;
  }
  function mirrorParts(gun) {
    for (const [s, o] of gun.pairs) {
      o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.scale.copy(s.scale); o.visible = s.visible;
      if (s.isInstancedMesh && o.isInstancedMesh && s.instanceMatrix.version !== o.userData.vmInstanceVersion) {
        o.count = s.count;
        o.instanceMatrix.array.set(s.instanceMatrix.array);
        o.instanceMatrix.needsUpdate = true;
        o.userData.vmInstanceVersion = s.instanceMatrix.version;
      }
      if (o.isMesh) { const g = geoOf(s.geometry); if (o.geometry !== g) o.geometry = g; }   // MU-11 (finding 2): a part's shape swapped in place (its twin under the mirror on WebGPU)
      if (o.isMesh && o.userData.vmOwnMat) { if (o.material !== o.userData.vmOwnMat) o.material = o.userData.vmOwnMat; }   // CC-342: the view's own (the scope's coated lenses)
      else if (o.isMesh && s.material && !Array.isArray(s.material)) {
        const want = vmMaterial(s.material);
        if (o.material !== want) o.material = want;
        mirrorMaterial(s.material, o.material);
      }
    }
  }

  const _eR = [0, 0, 0], _eL = [0, 0, 0], _eA = [0, 0, 0];
  // CD-1 (CLAUDE DIRECTOR, 11 Nov: the revolver's support hand cupped round the firing glove): a gun's own support elbow on
  // the hold (view space from the support wrist, as elbowRel: x the view's, y down, z back toward him), so the forearm comes
  // from under the gun and the hand can cup the other; live as info.tune[key].supportElbow. The hold only (a reload keeps its own).
  const VM_SUPPORT_ELBOW = { revolver: [-0.02, -0.22, 0.20] };
  const _sh = V3(), _shm = M4(), VM_SHOULDER = [0.19, -0.24, 0.08];   // CL-293: his shoulder from the eye (as the eye sees it, his right)
  const _wm = M4(), _mf = F(), _mrel = F(), _wellF = F(), _localF = F(), _wiF = F(), _local2 = F(), _outF = F(), _gi = Q(), _psc = V3(), _mw = V3(), _rockQ = Q(), _rockPivot = V3(), _rockMoved = V3();
  function update(dt, st) {
    if (st) { S.pitch = st.pitch || 0; if (st.phase != null && isFinite(st.phase)) S.bobPhase = st.phase; }   // CL-324 (J70): the empty hands' frame and swing
    dt = Math.min(0.05, Math.max(0, dt || 0));
    frameDt = dt > 0 ? dt : 1 / 60;   // CL-305: the twist's rate limit
    // CE-3 (J133): X's change of type on the gun in hand (index.html st.ammoSwitch, CB-294): its load is the reload's path,
    // a shell a trip (st.reloadU the shell's own 0..1); its unload the forend worked once a shell (S.unloadW: gunFrame's roll,
    // the stroke and the shell out of the port below). The view's own copy of st; nothing goes back.
    const SWa = st && st.reloadU == null && st.ammoSwitch && st.ammoSwitch.gun === st.weapon ? st.ammoSwitch : null;
    if (SWa && SWa.phase === 'load') st = Object.assign({}, st, { reloadU: clamp(SWa.u, 0, 1), reloadEmpty: true, rounds: null });
    S.unloadW = SWa && SWa.phase === 'unload' ? SWa : null;
    info.ammoSwitch = SWa ? { phase: SWa.phase, u: SWa.u } : null;
    const candidate = st && st.want && st.weapon && VM_POSES[st.weapon] ? weaponMeshes[st.weapon] : null;
    const needsStockSplit = st && (st.weapon === 'm4' || st.weapon === 'ak' ||
      st.weapon === 'shotgun' || st.weapon === 'aa12' || st.weapon === 'sniper');
    const key = candidate && (!needsStockSplit || (candidate.userData && candidate.userData.fpStock && candidate.userData.fpStock.parent === candidate)) ? st.weapon : null;
    // CL-301: a pair (index.html akimboOn) when the off hand has its gun and VM.akimbo places it
    const pair = !!(key && st.akimbo && ctx.offhand && ctx.offhand(key) && VM.akimbo && VM.akimbo[key]);
    // lower before a change; raise once the new one is in (one gun to two, or back, is a change)
    // CL-317: hands without a gun (index.html st.hands: unarmed, or on a ladder): the last gun's arms stay, the gun put away
    const HN = !key && st && st.hands && VM_HANDS[st.hands.kind] && gun ? VM_HANDS[st.hands.kind] : null;
    if ((gun ? gun.key + (gun2 ? '|2' : '') : null) !== (key ? key + (pair ? '|2' : '') : null)) {
      S.rising = false; S.upT = 0;
      if (S.raise > 0.02 && gun) S.raise = Math.max(0, S.raise - dt * VM.raise * 1.6);
      else { S.raise = 0; if (key) { syncArmMaterials(); buildGun(key, pair); } else if (!HN) dropGun(); }
    } else if (key) { S.upT = S.raise >= 1 ? (S.upT || 0) + dt : 0; S.raise = Math.min(1, S.raise + dt * VM.raise); S.rising = true; }
    // CL-307: a blade swing (index.html st.blade) keeps the view on with the gun put away below it
    const BL = gun && st && st.blade && VM_BLADES[st.blade.kind] ? VM_BLADES[st.blade.kind] : null;
    if (BL) S.raise = Math.max(0, S.raise - dt * VM.raise * (BL.lower || 2.5));
    // CE-4 (J16, the knife's stab): the blade comes out once the gun is down out of sight (its raise under BL.out, or at
    // the latest BL.put of the swing): until then the hand stays on the gun as it drops (it vanished on the swing's first
    // frame and the blade stood in its place)
    const BLON = !!BL && (BL.put == null || S.raise <= (BL.out || 0.15) || clamp(st.blade.u || 0, 0, 1) >= BL.put);
    const active = !!gun && (S.raise > 0.001 || !!BL || !!HN);
    info.active = active; info.key = gun ? gun.key : null; info.raise = S.raise; info.akimbo = !!gun2; info.blade = BL ? st.blade.kind : null;
    info.hands = HN ? st.hands.kind : null;
    // The world's scope mask owns the full sniper sight picture above SNIPER_GLASS of the aim (CC-342, J123: "the model
    // stays visible for too long when transitioning to scope": it was 82%, the scope's eyepiece already centred and the
    // glass's ring and reticle over it from about 60%).
    root.visible = active && !(gun && ((gun.key === 'sniper' && (st.ads || 0) >= SNIPER_GLASS) || (st.opticGlass && (st.ads || 0) >= 0.88)));   // CL-323: a magnified optic's glass too (full at 88%)
    // CG-1 (J151 note 4, Jerry 13 Nov: "Camo resize glitch is persistent in 1st person on arms and all weapons"): between
    // guns (the old one down, the new one not up yet: a change of gun, a draw) the eye stays first person (index.html
    // st.eye), so his body's arms and the gun in his hand stay out of the eye's pass. They used to come back into it for
    // those frames, drawn at the world's field of view and his body's own size: the sleeves', gloves' and gun's camo
    // jumped to another size and back on every change of gun.
    const eyeOn = active || !!(st && st.eye);
    const hideGun = active ? gun.src : eyeOn && st.weapon ? weaponMeshes[st.weapon] || null : null;
    const hideGun2 = active ? (gun2 ? gun2.src : null) : eyeOn && st.weapon && ctx.offhand ? ctx.offhand(st.weapon) || null : null;
    setEyeHide(eyeOn, hideGun, hideGun2);
    if (!active) { S.camQ = null; S.lastPlace = null; if (blade) blade.root.visible = false; return; }
    syncArmMaterials();
    if (gunNodes(gun.src) !== gun.nodes) buildGun(gun.key, !!gun2);
    if (!sockets.r || !sockets.l || sockets.key !== gun.key) readSockets(gun.key, true, dt);
    if (!sockets.r || !sockets.l || !arms) { root.visible = false; return; }   // MU-11 (finding 7): nothing to hold it with yet
    const P = VM_POSES[gun.key];
    gun.src.updateWorldMatrix(true, false);
    gun.src.matrixWorld.decompose(_dp, _dq, _dsc); gun.s = Math.abs(_dsc.x) || 1;
    readSockets(gun.key, !!st.settled, dt);
    mirrorParts(gun); if (gun2) mirrorParts(gun2);
    // The launcher's butt sits behind the view eye against the shoulder.
    // Apply this after mirroring or the source restores its visible flag.
    // GB-296 (J9): hide the stock as soon as ADS starts (was 0.35), so it never sweeps into the
    // sight picture on the way up. Launcher stock stays off always (GP-20037).
    // CL-326 (J79: the sniper's stock "disappears for a second before popping in" on the way out of the scope): on the way
    // out it shows as soon as the view gun does (under 0.82); GB-296's early hide stays on the way in
    { const a = st.ads || 0, prev = S.adsPrevStock == null ? a : S.adsPrevStock;
      if (gun.key === 'sniper') { if (a < 0.08 || a > prev + 1e-5) S.stockOut = false; else if (a < prev - 1e-5) S.stockOut = true; }
      // CC-342 (J119, the Breacher: "Stock disappearing ... when going from hip-fire to ads"): its stock is in the frame's
      // corner at the hip and leaves it by itself on the way up, so it is put away only once in the sights (STOCK_AWAY)
      if (gun.stock) gun.stock.visible = gun.key !== 'launcher' && (a < (STOCK_AWAY[gun.key] || 0.08) || (gun.key === 'sniper' && S.stockOut && a < SNIPER_GLASS));
      S.adsPrevStock = a; }
    S.ads = st.ads || 0; info.ads = S.ads;
    const AK = gun2 ? (info.tune.akimbo && info.tune.akimbo[gun.key]) || VM.akimbo[gun.key] : null;   // live: info.tune.akimbo = { pistol: {...}, elbowRel }
    gunFrame(P, gun.key, st, dt, AK);
    if (gun2) {   // CL-301: the left gun the right one's mirror, then each its own kick
      const H = holdOf(gun.key), gr = H && H.grip ? _grip.set(H.grip[0], H.grip[1], H.grip[2]) : _grip.set(0, 0, 0);
      mirrorFrame(G, G2);
      if (S.pairDip) {   // CL-306: each gun's own reload dip (the right first)
        const D = (VM.akimbo.dipBy && VM.akimbo.dipBy[gun.key]) || VM.akimbo.dip;
        dipFrame(G, D, S.pairDip.r, MX, gr, gr.x); dipFrame(G2, D, S.pairDip.l, -MX, gr, -gr.x);
      }
      kickFrame(G, KA, gr, gr.x); kickFrame(G2, KB, gr, -gr.x);
      gun2.root.position.copy(G2.p); gun2.root.quaternion.copy(G2.q); gun2.root.scale.setScalar(G2.s);
    }
    gun.root.position.copy(G.p); gun.root.quaternion.copy(G.q); gun.root.scale.setScalar(G.s);
    gun.root.visible = !BLON && !HN; if (gun2) gun2.root.visible = !BLON && !HN;   // CL-307: put away for the blade (CE-4: once it is down); CL-317: for the empty hands
    // The copied action cycles on a shot; the original gun keeps its third-person animation.
    S.slideT += dt;
    // CE-1 (GT-20075): each gun's action on its own shot, the same in the pair's left copy. P.action (viewmodel-poses.js)
    // names the moving part and its time: a slide or a reciprocating handle back and home, a carrier seen through its
    // port (the model's recoilBoltPose, its stroke the model's portStroke), the revolver's trigger and hammer (the
    // model's doubleActionPose). Each cycle ends before the next shot can come (the gun's interval).
    actionCycle(gun, P, S.slideT, st);
    controlStates(gun, st, dt);   // CE-2 (J110): the selector shows the fire mode
    if (gun2) { S.slideT2 += dt; actionCycle(gun2, P, S.slideT2, st); }
    // The reload's bolt/charging-handle pull follows the support hand after the magazine seats.
    { const Rr = reloadOf(P, st), rk = Rr && Rr.rack, ur = st.reloadU;
      // CE-2 (J103): through a reload the view's slide or handle is the view's own: his body's rack (mirrored from his gun
      // by mirrorParts) moved it with no hand on it in a tactical reload and doubled the empty reload's (0.196 for 0.07)
      if (gun.work && gun.workBase && ur != null && !AK) gun.work.position.z = gun.workBase.z;
      if (gun.work && rk && ur != null) {
        // CE-11 (J151 note 2, Jerry 13 Nov: "The chamber and barrel on reload need to look more realistic"): on an empty
        // reload with Rr.lockBack the slide is locked back from the start (the last round fired it there), the support hand
        // pulls it the last few mm off the stop over [0]-[1] and lets it run home at [2]
        const lock = Rr.lockBack && !Rr.tactical;
        const back = lock ? (ur < rk[2] ? 1 + Rr.lockBack * smooth((ur - rk[0]) / (rk[1] - rk[0])) : 1 - smooth((ur - rk[2]) / 0.03))
          : smooth((ur - rk[0]) / (rk[1] - rk[0])) * (1 - smooth((ur - rk[2]) / 0.03));
        gun.work.position.z -= rk[3] * back; } }
    // CE-11 (J151 note 2; ChatGPT 2's GT-20104 pistol: a hollow slide over a barrel on its rear chamber datum): the view's
    // barrel follows its slide as a Browning tilting barrel does: back with it its first P.barrel.joint, then unlocked over
    // the next P.barrel.unlock its chamber drops P.barrel.drop and it tilts P.barrel.tilt (rad about x), the hood leaving
    // the port; home with it. On every shot's kick and through the reload's rack.
    { const B = P.barrel, br = gun.barrel, bb = gun.barrelBase;
      if (B && br && bb && gun.work && gun.workBase) {
        const s = Math.max(0, gun.workBase.z - gun.work.position.z), j = Math.min(s, B.joint), u2 = clamp((s - B.joint) / B.unlock, 0, 1);
        br.position.set(bb.x, bb.y - B.drop * u2, bb.z - j); br.rotation.x = bb.rx + B.tilt * u2;
        info.barrel = { s, j, u: u2 };
      } }
    // CE-3 (J133): an ammo change's unload works the forend back and home once a shell (R.unload.pump); the support hand
    // rides it as on a shot. The view's own stroke while his gun's forend is at rest (index.html may stroke its own: then
    // the mirror carries it and this stands aside).
    { const Uw = S.unloadW, Rr = reloadOf(P, st), U = Rr && Rr.unload;
      if (Uw && U && gun.pump && gun.pumpBase && !AK) {
        const sp = gun.src.userData.pump, sb = gun.src.userData.basePumpPos, pp = U.pump, u = clamp(Uw.u, 0, 1);
        if (!sp || !sb || Math.abs(sp.position.z - sb.z) < 1e-5) gun.pump.position.z = gun.pumpBase.z - U.travel * smooth((u - pp[0]) / (pp[1] - pp[0])) * (1 - smooth((u - pp[2]) / (pp[3] - pp[2])));
      } }
    // the hands (CL-301: a pair has no support hand: the left holds the left gun as the right holds its own, and no
    // reload hands; both guns dip in gunFrame)
    const R = AK ? null : reloadOf(P, st);
    const u = R && st.reloadU != null ? clamp(st.reloadU, 0, 1) : null;
    S.lightFree = !AK && u == null && st.reloadU == null && !(st.grenade && st.grenade.phase) && !BL && !HN && !st.ammoSwitch && !st.sprint;   // CE-4: the support hand free for the light's switch
    info.reloadKind = u != null ? (R.tactical ? 'tactical' : 'empty') : null;   // CL-306
    info.reloadU = AK && st.reloadU != null ? clamp(st.reloadU, 0, 1) : u;
    const eR = _eR, eL = _eL;
    const EB = (info.tune[gun.key] && info.tune[gun.key].elbows) || P.elbows;   // CL-293: live tuning
    eR[0] = EB.r[0] * MX; eR[1] = EB.r[1]; eR[2] = EB.r[2];
    eL[0] = EB.l[0] * MX; eL[1] = EB.l[1]; eL[2] = EB.l[2];
    // CL-293 (J54: "Wrists should flare out more. They are bent too inward"): with P.elbowFollow [length, drop] the forearm
    // runs on along the hand's own line and drops, so the wrist stays nearly straight and the arms come in from the sides.
    const FOL = !AK && !(info.tune[gun.key] && info.tune[gun.key].elbows) && ((info.tune[gun.key] && info.tune[gun.key].elbowFollow) || P.elbowFollow);
    const follow = (W, e) => { _fy.set(0, 1, 0).applyQuaternion(W.q); e[0] = W.p.x + _fy.x * FOL[0]; e[1] = W.p.y + _fy.y * FOL[0] - FOL[1]; e[2] = W.p.z + _fy.z * FOL[0]; };
    // CL-293 (GP-20018: the long guns moved up close): P.elbowRel { r, l } puts each elbow at an offset from its own wrist
    // (view space, as the eye sees it: x out to that side, y down, z back toward him), so the forearms keep their angle
    // in the view wherever the gun sits; live as info.tune[key].elbowRel. Fixed elbows (P.elbows) when it's absent.
    const REL = AK ? (info.tune.akimbo && info.tune.akimbo.elbowRel) || VM.akimbo.elbowRel :
      !FOL && !(info.tune[gun.key] && info.tune[gun.key].elbows) && ((info.tune[gun.key] && info.tune[gun.key].elbowRel) || P.elbowRel);
    const rel = (W, o, e) => { e[0] = W.p.x + o[0] * MX; e[1] = W.p.y + o[1]; e[2] = W.p.z + o[2]; };
    // CL-301: a pair's forearms may run on along each hand's own line instead ([length, drop], VM.akimbo.follow), the
    // wrists straight, as in Jerry's references (the forearms come up from below behind the grips)
    const AKF = AK && (info.tune.akimbo && info.tune.akimbo.follow !== undefined ? info.tune.akimbo.follow : VM.akimbo.follow);
    const followK = (W, e) => { _fy.set(0, 1, 0).applyQuaternion(W.q); e[0] = W.p.x + _fy.x * AKF[0]; e[1] = W.p.y + _fy.y * AKF[0] - AKF[1]; e[2] = W.p.z + _fy.z * AKF[0]; };
    // CL-301: a pair's right hand has its grip point on the hold's grip (WEAPON_HOLD grip) when the gun has no authored one:
    // the body's akimbo hold is read as it stands, and on the test page's stand-in it left the hand 36 cm off the gun.
    let SR = sockets.r;
    if (AK) {
      const Hh = holdOf(gun.key);
      if (Hh && Hh.grip && !(VM_SOCKETS[gun.key] && VM_SOCKETS[gun.key].grip)) {
        _srA.q.copy(sockets.r.q); _srA.s = sockets.r.s;
        wristSpacePoint(arms.r, 'grip', _ms1).multiplyScalar(_srA.s).applyQuaternion(_srA.q);
        _srA.p.set(Hh.grip[0], Hh.grip[1], Hh.grip[2]).sub(_ms1); SR = _srA;
      }
    }
    mul(G, SR, WR);
    if (S.swapK < 1 && !AK) {   // CL-328: the firing hand comes up onto the grip as the gun arrives
      const W = VM.swap, d = 1 - smooth((S.swapK - W.hand[0]) / (W.hand[1] - W.hand[0]));
      WR.p.y -= W.handDrop * d; WR.p.x += W.handOut * MX * d;
    }
    // CL-301 (the first look: the forearms ran out flat to the sides, as the body's hold has them): a pair's hands first
    // turn round their grips toward a point behind and below the wrist (VM.akimbo.behind, out to that side), so the
    // forearms come back toward him from below, then run on along the hand.
    const AKB = AK && ((info.tune.akimbo && info.tune.akimbo.behind) || VM.akimbo.behind);
    const _akh = _eA;
    if (AKB) { _akh[0] = WR.p.x + AKB[0] * MX; _akh[1] = WR.p.y + AKB[1]; _akh[2] = WR.p.z + AKB[2]; twistToward(arms.r, WR, _akh, VM.akimbo.twistMax, 'behind'); }
    if (AKF) followK(WR, eR);
    else if (FOL) follow(WR, eR);
    else if (REL) rel(WR, REL.r, eR);
    twistToward(arms.r, WR, eR);
    // GB-301 (J18): the firing hand leaves the grip onto the sniper's bolt knob (after each shot and on reload work).
    // Gun frame stays put (unlike 3P where the gun is parented to the hand). Support stays on the forend.
    // CL-325 (J72/J88): a gun's own firing-hand pose in the view (VM_SOCKETS gripPose, fitted to the view gun), or tried live
    const gripP = (info.tune[gun.key] && info.tune[gun.key].poseR) || (VM_FIT[gun.key] && VM_FIT[gun.key].r && VM_FIT[gun.key].r.pose) || (VM_SOCKETS[gun.key] && VM_SOCKETS[gun.key].gripPose) || sockets.poseR;
    let poseR = gripP;
    const boltW = (!AK && gun.bolt && (st.boltHand || 0) > 0.001) ? clamp(st.boltHand, 0, 1) : 0;
    if (boltW > 0) {
      gun.bolt.updateMatrix();
      // Live bolt part grab (moves with lift/pull). CL-306: the knob from the model (gb145Grab) and the hand's facing
      // by the handle's side (boltSide: +1 the gun's left, which the mirrored view shows on the right).
      const _bat = _pat, _bz = _pz, _by = _py, sud = gun.src.userData, bs = sud.boltSide || -1;
      if (sud.bolt && sud.bolt.userData && sud.bolt.userData.gb145Grab) _bat.copy(sud.bolt.userData.gb145Grab); else _bat.set(bs * 0.075, 0.012, 0.02);
      _bat.applyMatrix4(gun.bolt.matrix);
      // CL-326 (J79): palm down over the bolt, the knob pinched in the thumb's, index's and middle's tips, the forearm back
      // toward his shoulder on the bolt's side (was the palm to the side, the forearm across the rifle)
      // the hand's line toward the elbow's hint below and behind the knob in the view, the palm down (the rifle's -y)
      const BE = VM.boltElbowR || [0.14, -0.24, 0.22];
      _bkV.copy(_bat).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);   // the knob in view space
      _by.set(BE[0] * MX, BE[1], BE[2]).applyQuaternion(_bgi.copy(G.q).invert()).normalize();   // toward the elbow, gun space
      _bz.set(0, -1, 0).addScaledVector(_by, -_by.dot(_bz.set(0, -1, 0))).normalize();
      const _bx = _px.crossVectors(_by, _bz);
      const _bF = _local2; basisQ(_bx, _by, _bz, _bF.q); _bF.s = sockets.r.s;
      const palmR = wristSpacePoint(arms.r, 'palm', _ppalm).add(_pinchOff).multiplyScalar(_bF.s).applyQuaternion(_bF.q);
      _bF.p.copy(_bat).sub(palmR);
      mul(G, _bF, _outF);
      // lerp wrist from grip to bolt
      WR.p.lerp(_outF.p, boltW);
      WR.q.slerp(_outF.q, boltW);
      if (FOL) follow(WR, eR);
      else if (REL) rel(WR, REL.r, eR);
      { const BE = VM.boltElbowR; if (BE) for (let k = 0; k < 3; k++) eR[k] += (_bkV.getComponent(k) + (k === 0 ? BE[0] * MX : BE[k]) - eR[k]) * boltW; }   // CL-326
      twistToward(arms.r, WR, eR);
      poseR = POSES.pinch || sockets.poseR;
      info.handPlace = 'bolt';
    }
    // CL-326 (J82): the chainsaw's pull-start: the firing hand leaves the rear handle for the starter's T-handle (the
    // body's own pull, GP-188, moves the handle and its cord on his saw; the view's copy follows), its line toward the
    // elbow's hint, the T across the fist, and back to the handle as the cord goes home
    const sawW = (!AK && gun.starter && (st.sawTake || 0) > 0.001) ? clamp(st.sawTake, 0, 1) : 0;
    if (sawW > 0) {
      const SS = VM.sawStart, _bat = _pat, _bz = _pz, _by = _py;
      _bat.copy(gun.starter.position);
      _bkV.copy(_bat).multiplyScalar(G.s).applyQuaternion(G.q).add(G.p);   // the handle in view space
      _by.set(SS.elbow[0] * MX, SS.elbow[1], SS.elbow[2]).applyQuaternion(_bgi.copy(G.q).invert()).normalize();   // toward the elbow, gun space
      _bz.set(SS.palm[0], SS.palm[1], SS.palm[2]); _bz.addScaledVector(_by, -_by.dot(_bz)).normalize();
      const _bx = _px.crossVectors(_by, _bz);
      const _bF = _local2; basisQ(_bx, _by, _bz, _bF.q); _bF.s = sockets.r.s;
      const gripR = wristSpacePoint(arms.r, 'grip', _ppalm).multiplyScalar(_bF.s).applyQuaternion(_bF.q);
      _bF.p.copy(_bat).sub(gripR);
      mul(G, _bF, _outF);
      WR.p.lerp(_outF.p, sawW); WR.q.slerp(_outF.q, sawW);
      if (FOL) follow(WR, eR);
      else if (REL) rel(WR, REL.r, eR);
      for (let k = 0; k < 3; k++) eR[k] += (_bkV.getComponent(k) + (k === 0 ? SS.elbow[0] * MX : SS.elbow[k]) - eR[k]) * sawW;
      twistToward(arms.r, WR, eR);
      info.handPlace = 'starter';
    }
    let poseL = sockets.poseL;
    // CL-293 (J54): a support hand's own fingers and thumb for a gun (VM_SOCKETS supportPose, a HAND_POSES-shaped pose: the
    // pistol's thumbs forward), or tried live (info.tune[key].poseL); the body's hold gives the rest.
    { const tp = (info.tune[gun.key] && info.tune[gun.key].poseL) || (VM_FIT[gun.key] && VM_FIT[gun.key].l && VM_FIT[gun.key].l.pose) || (VM_SOCKETS[gun.key] && VM_SOCKETS[gun.key].supportPose); if (tp) poseL = tp; }
    if (AK) {   // CL-301: the left hand on the left gun, the right hand's hold mirrored, the right hand's fingers
      mul(G2, mirrorSocket(SR, _localF), WL);
      if (AKB) { _akh[0] = WL.p.x - AKB[0] * MX; _akh[1] = WL.p.y + AKB[1]; _akh[2] = WL.p.z + AKB[2]; twistToward(arms.l, WL, _akh, VM.akimbo.twistMax, 'behind'); }
      if (AKF) followK(WL, eL); else rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = 'pair';
      poseL = gripP;
    } else if (u != null) {
      poseL = reloadHand(R, u, _localF); mul(G, _localF, WL);
      // GB-301 (J18): sniper 'work' is the firing hand on the bolt — support returns to the forend for those beats.
      if (gun.key === 'sniper' && info.handPlace === 'work') {
        mul(G, sockets.l, WL); poseL = sockets.poseL; info.handPlace = boltW > 0 ? 'bolt' : 'fore';
      }
      // CL-306 (the audit: the Wasp's and KR-7's charging pulls swept the support forearm across the view, 10 cm from the
      // eye): during a reload the support elbow stays where the hold keeps it, so the forearm pivots from low left up to
      // the magazine or the handle instead of standing up through the middle of the view under the raised hand.
      mul(G, sockets.l, _foreWL);
      if (FOL) follow(_foreWL, eL);
      else if (REL) {   // CL-326: the hold's hint while the hand is on the hold, a low one (VM.reloadElbowL) as it leaves it
        rel(_foreWL, REL.l, eL);
        const LO = (R && R.elbowL) || VM.reloadElbowL;
        if (LO) { rel(_foreWL, LO, _eLo); const w = clamp(WL.p.distanceTo(_foreWL.p) / 0.10, 0, 1); for (let k = 0; k < 3; k++) eL[k] += (_eLo[k] - eL[k]) * w; }
      }
    }
    else {
      mul(G, sockets.l, WL);
      // A shotgun's support hand stays on the moving forend through each pump stroke.
      if (gun.pump && gun.pumpBase) WL.p.add(_pg.copy(gun.pump.position).sub(gun.pumpBase).multiplyScalar(G.s).applyQuaternion(G.q));
      const SEL = (info.tune[gun.key] && info.tune[gun.key].supportElbow) || VM_SUPPORT_ELBOW[gun.key];   // CD-1
      if (SEL) rel(WL, SEL, eL);
      else if (FOL) follow(WL, eL);
      else if (REL) rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = boltW > 0 ? 'bolt' : 'fore';
      // CE-4: the light's switch, from the hold as it stands (turned toward the elbow); the elbow goes with the wrist (its
      // rise only by VM_LIGHT.elbowUp, so a reach up over the gun keeps the forearm below the view)
      if (!st.grenade && !BL && !HN && !boltW && !sawW) {
        _lpHold.copy(WL.p); const lp = lightPressFrame(WL, poseL, st);
        if (lp) { poseL = lp; info.handPlace = 'light'; eL[0] += WL.p.x - _lpHold.x; eL[1] += (WL.p.y - _lpHold.y) * VM_LIGHT.elbowUp; eL[2] += WL.p.z - _lpHold.z; }
      }
    }
    // (CL-306: the reload's elbow is set above, from the hold's wrist)
    const GRN = !AK && st.grenade && st.grenade.phase ? st.grenade : null;   // CL-307: the throw
    if (GRN) poseL = grenadeFrame(GRN, WL, eL, dt) || poseL;
    else if (grenadeC) grenadeC.root.visible = false;
    if (BLON) { poseR = sockets.poseR; poseL = POSE_RELAXED; bladeFrame(BL, st.blade, WR, WL, eR, eL); }
    else if (blade) blade.root.visible = false;
    if (HN) { const hp = handsFrame(HN, st.hands, WR, WL, eR, eL, dt); poseR = hp.r; poseL = hp.l; }
    // CE-9b: the firing hand onto a selector or safety (VM_SELECT): the wrist's move first, the digit after the trigger
    _hc.H = null; info.handCtl = null;
    if (!BLON && !HN && !GRN && u == null && handCtlPick(gun)) handCtlMove(WR, eR);
    mirrorWorn(arms.r, 1); mirrorWorn(arms.l, -1);
    info.wrist.r = poseArm(arms.r, WR, eR, VM.wristMax);
    info.wrist.l = poseArm(arms.l, WL, eL, VM.wristMax);
    for (const a of [arms.r, arms.l]) if (a.bendSleeve && a.parts.sleeve.visible) a.bendSleeve(a.wrist.quaternion);   // CL-334 h (J128): the sleeve's end gives with the wrist
    // CL-293 (Jerry, 3 Nov: "the arms looking weird and skinny", "elbow flared in the wrong direction"): the upper arm turns
    // at the elbow toward his shoulder (view space, as the eye sees it: 0.19 m out, 0.24 m down, a little behind the eye).
    for (const [a, sx] of [[arms.r, 1], [arms.l, -1]]) {
      if (!a.upper) continue;
      a.root.updateMatrix();
      _sh.set(VM_SHOULDER[0] * sx * MX, VM_SHOULDER[1], VM_SHOULDER[2]).applyMatrix4(_shm.copy(a.root.matrix).invert());
      const len = _sh.length();
      if (len > 1e-4) { a.upper.quaternion.setFromUnitVectors(AX_Y, _sh.multiplyScalar(1 / len)); a.upper.scale.set(1, Math.max(1, len / UPPER_ARM_LEN), 1); }   // CG-1: no stretch (the sleeve runs past the shoulder)
    }
    // CE-2 (J103: "Trigger finger needs to be in actual trigger guard when firing ... Finger needs to physically pull the
    // trigger for each shot"; J112): on a gun with VM_TRIGGER the firing hand's index lies in the guard with its pad on the
    // trigger's face (solved against the gun with the hand where VM_FIT puts it), and presses it back on each shot and while
    // the trigger is held; the trigger turns on its pin with it. Claude 1's fit keeps the hand, the other fingers and the
    // thumb (agreed 11 Nov). Not on a pair yet (their hands sit on the hold's grip, not the fit).
    // CE-2 (12 Nov): info.tune.trigger[key] tries an entry live (the solver's pick before it goes into VM_TRIGGER)
    const TR = !AK && ((info.tune.trigger && info.tune.trigger[gun.key]) || VM_TRIGGER[gun.key]);
    let trigOn = false;
    if (TR && poseR === gripP && !BL && !HN) {
      const want = (st.fireHeld || (S.slideT < TR.hold && S.shots > 0)) ? 1 : 0;
      S.trig = want >= (S.trig || 0) ? want : Math.max(want, (S.trig || 0) - dt / TR.release);
      // J118: a double action's finger follows its trigger (the model's doubleActionPose turns it through the pull and the
      // reset, actionCycle above): TR.follow is the trigger's turn at full travel
      if (TR.follow && gun.trigger) S.trig = clamp(gun.trigger.rotation.x / TR.follow, 0, 1);
      const k = TR.follow ? S.trig : smooth(S.trig), f = (_trigPose = copyPose(gripP, _trigPose)).f[0];   // a following finger keeps to its trigger's own travel
      for (let j = 0; j < 4; j++) f[j] = TR.rest[j] + (TR.pull[j] - TR.rest[j]) * k;
      poseR = _trigPose; trigOn = true; info.trigger = k;
      const tp = gun.ctrls[TR.part || 'trigger'];
      if (tp && tp.parent === gun.root && TR.turn) {
        if (TR.pivot) _trgP.set(TR.pivot[0], TR.pivot[1], TR.pivot[2]); else _trgP.copy(tp.position);   // no pivot: the control's own origin (its pin, userData.triggerPin)
        _trgQ.setFromAxisAngle(AX_X, TR.turn * k);
        tp.position.sub(_trgP).applyQuaternion(_trgQ).add(_trgP); tp.quaternion.premultiply(_trgQ);
      }
    } else { S.trig = 0; info.trigger = null; }
    // CE-9b: the firing thumb (or index) on a selector or safety while VM_SELECT's row has it there (controlStates above)
    if (_hc.H && (poseR === gripP || poseR === _trigPose)) { const hp = handCtlPose(gun, poseR); if (hp) poseR = hp; }
    // CL-334 h (J126 rule 2: "No part of the hand may clip through any part of a weapon"): where this gun's hold presses the
    // hand into its grip, the hand gives (studio/hand-contacts.js); it fades as the hand's pose leaves the hold's.
    // CE-2: with the index on the trigger, the give without the index's own (the rest of the hand keeps its give)
    if (arms.r.rig.setContact) { arms.r.rig.setContact(trigOn ? trigContact(gun.key, poseR) : handContact(gun.key, 'r')); arms.l.rig.setContact(AK ? null : handContact(gun.key, 'l')); }
    arms.r.rig.set(poseR).update(); arms.l.rig.set(poseL).update();
    for (const a of [arms.r, arms.l]) if (a.bridge && a.parts.rolled.visible && a.bridge.userData.bend) a.bridge.userData.bend();
    // the magazine: seated, in the support palm, or away in the pouch
    if (gun.mag && gun.magBase && (!R || R.mag)) {
      const ms = R ? magState(R, u) : 'seated';
      info.magState = ms;
      if (ms === 'hand') {
        placeFrame(R.magPlace || 'well', R, u, _wellF);   // CL-306: a tank or a box has its own place
        _mf.p.copy(gun.magBase.pos); _mf.q.copy(gun.magBase.quat); _mf.s = gun.magBase.scale.x;
        // the magazine rides the palm as it was when the palm took it at the well: M = W * (Wwell^-1 * Mbase)
        const wi = _wiF; wi.q.copy(_wellF.q).invert(); wi.s = 1 / _wellF.s;
        wi.p.copy(_wellF.p).multiplyScalar(-wi.s).applyQuaternion(wi.q);
        mul(wi, _mf, _mrel);
        const local = placeLocalOfWrist(_local2);
        const out = mul(local, _mrel, _outF);
        gun.mag.position.copy(out.p); gun.mag.quaternion.copy(out.q); gun.mag.scale.setScalar(out.s);
        if (R.rock && !R.rock.pivot && gun.magFootLocal) {   // CL-322: with a pivot the palm's frame turns instead (placeFrame)
          const rock = R.rock;
          const angle = rock.angle * (smooth((u - rock.out[0]) / (rock.out[1] - rock.out[0])) - smooth((u - rock.in[0]) / (rock.in[1] - rock.in[0])));
          _rockPivot.copy(gun.magFootLocal).multiplyScalar(out.s).applyQuaternion(gun.mag.quaternion);
          gun.mag.quaternion.multiply(_rockQ.setFromAxisAngle(AX_X, angle));
          _rockMoved.copy(gun.magFootLocal).multiplyScalar(out.s).applyQuaternion(gun.mag.quaternion);
          gun.mag.position.add(_rockPivot.sub(_rockMoved));
        }
        gun.mag.visible = true;
      } else {
        gun.mag.position.copy(gun.magBase.pos); gun.mag.quaternion.copy(gun.magBase.quat); gun.mag.scale.copy(gun.magBase.scale);
        gun.mag.visible = ms !== 'pouch';
      }
      // CE-3 (GT-20080's top round, ChatGPT 2): index.html shows the rounds the gun holds, which change only at the reload's
      // end, so the magazine that comes up from the pouch (from the swap on) shows its top round: it is a full one. Before
      // the swap the outgoing one shows what it held (the mirror of his gun's).
      if (R && R.mag && u != null && u >= R.mag.swapIn) {
        if (gun.magTop === undefined) gun.magTop = gun.mag.getObjectByName('magazine top round') || null;
        if (gun.magTop) gun.magTop.visible = true;
      }
    }
    if (gun2 && gun2.mag && gun2.magBase) { gun2.mag.position.copy(gun2.magBase.pos); gun2.mag.quaternion.copy(gun2.magBase.quat); gun2.mag.scale.copy(gun2.magBase.scale); gun2.mag.visible = true; }
    // The pump loads one shell per game reload cycle. Keep the loose shell in
    // the support palm until its port beat, then seat and hide it.
    if (gun.shell && gun.shellBase && R && R.kind === 'shell') {
      // CL-326 (J76): the shell pinched at the fingertips (thumb, index, middle) from the pouch, then pushed up into the port
      // and forward into the tube (R.shell { inHand, push, depth }); the old palm ride without one
      const W8 = R.shell || { inHand: [0.29, 0.56], push: [0.56, 0.74], depth: 0 };
      const inPalm = u != null && u >= W8.inHand[0] && u < W8.inHand[1];
      const atPort = u != null && u >= W8.push[0] && u < W8.push[1];
      gun.shell.visible = inPalm || atPort;
      if (inPalm || (atPort && W8.depth)) {
        const local = placeLocalOfWrist(_local2);
        if (R.shell) {
          wristSpacePoint(arms.l, 'thumbTip', _tipA); wristSpacePoint(arms.l, 'indexTip', _tipB); wristSpacePoint(arms.l, 'middleTip', _tipC);
          _ppalm.copy(_tipA).add(_tipB).add(_tipC).multiplyScalar(1 / 3);
        } else wristSpacePoint(arms.l, 'palm', _ppalm);
        gun.shell.position.copy(_ppalm.multiplyScalar(local.s).applyQuaternion(local.q).add(local.p));
        gun.shell.quaternion.copy(local.q).multiply(gun.shellBase.quat);
        if (atPort) {   // from the fingers into the port, then forward into the tube
          const k = smooth((u - W8.push[0]) / (W8.push[1] - W8.push[0]));
          _tipA.copy(gun.shellBase.pos); _tipA.z += W8.depth * Math.max(0, k * 2 - 1);
          gun.shell.position.lerp(_tipA, Math.min(1, k * 2)); gun.shell.quaternion.slerp(gun.shellBase.quat, Math.min(1, k * 2));
        }
      } else {
        gun.shell.position.copy(gun.shellBase.pos);
        gun.shell.quaternion.copy(gun.shellBase.quat);
      }
    }
    // CE-3 (J133): the unload's shell (the type coming out: index.html's syncReloadShell) up out of the ejection port on the
    // back stroke and away to the right, turning (R.unload.shell, fly); index.html puts it back in his count
    { const Uw = S.unloadW, U = R && R.unload, EP = gun.src.userData && gun.src.userData.ejectPort;
      if (Uw && U && U.shell && gun.shell && gun.shellBase && EP && !AK) {
        const u = clamp(Uw.u, 0, 1), W = U.shell, on = u >= W[0] && u < W[2];
        gun.shell.visible = on;
        if (on) {
          const k1 = smooth((u - W[0]) / (W[1] - W[0])), k2 = clamp((u - W[1]) / (W[2] - W[1]), 0, 1);
          gun.shell.position.set(EP[0] - 0.014 + 0.024 * k1 + U.fly[0] * k2, EP[1] + 0.008 * k1 + U.fly[1] * k2 - 0.06 * k2 * k2, EP[2] + U.fly[2] * k2);
          gun.shell.quaternion.copy(gun.shellBase.quat).premultiply(_eq.setFromAxisAngle(AX_Y, -0.5 * k1 - 1.8 * k2)).premultiply(_rq.setFromAxisAngle(AX_Z, -2.4 * k2));
        }
      } }
    driveParts(R, u, st.rounds || null);
    updateArtworkInstances(T, gun.root);
    if (gun2) updateArtworkInstances(T, gun2.root);
    place();
  }
  // CL-306: the reload's moving parts (GB-302: named on the gun, at rest unless the view moves them). The revolver's six
  // empties show in the open cylinder, slide out of its back at the ejector's press and are gone; its speedloader comes up in
  // the support palm from the pouch, goes onto the cylinder's back and is gone once the rounds are in. Everything in the
  // cylinder's own frame, so it rides the swing (the body's; GB-300 on the pair).
  const _cm = M4(), _cb = M4(), _cq = Q(), _cp = V3(), _cs = V3(), _lp = V3();
  const _swP = V3(), _swQ = Q();   // CL-328
  function driveParts(R, u, RN = null) {
    if (!R || gun2) return;   // the pair: the body's cylinders (GB-300); no hand is free for a loader
    // CL-326 (J78): the true counts (RN: index.html st.rounds { spent, live, load }); six of each without them
    const nSpent = RN && RN.spent != null ? clamp(RN.spent | 0, 0, 6) : 6, nLive = RN && RN.live != null ? clamp(RN.live | 0, 0, 6 - nSpent) : 0;
    if (gun.empties && gun.emptiesBase) {
      const E = gun.empties, win = R.empties;
      if (win && u != null && gun.cylinder && gun.magBase && u >= win.show && u < win.gone && nSpent > 0) {
        // the cylinder's frame now, over its frame at rest: the casings were built in the chambers at rest
        partMatrix(gun.cylinder, _cm); _cb.compose(gun.magBase.pos, gun.magBase.quat, gun.magBase.scale).invert();
        _cm.multiply(_cb).decompose(_cp, _cq, _cs);
        const k = smooth((u - win.out[0]) / (win.out[1] - win.out[0]));
        _lp.set(0, 0, -win.travel * k).applyQuaternion(_cq);   // out of the back (the cylinder's -z), muzzle up
        E.position.copy(_cp).add(_lp); E.quaternion.copy(_cq); E.visible = true;
        for (let i = 0; i < E.children.length; i++) E.children[i].visible = i >= nLive && i < nLive + nSpent;   // the fired chambers come after the live ones (index.html revolverChambers)
      } else {
        E.position.copy(gun.emptiesBase.pos); E.quaternion.copy(gun.emptiesBase.quat); E.visible = false;
      }
    }
    if (gun.palmRounds) {
      // the unfired rounds: out of their chambers' backs with the cases, then into the cupped palm, to the pouch with it
      const PRd = gun.palmRounds, win = R.live, EP = gun.src.userData.reloadParts && gun.src.userData.reloadParts.empties;
      const on = !!(win && EP && u != null && gun.cylinder && gun.magBase && nLive > 0 && u >= win.out[0] && u < win.gone);
      PRd.visible = on; PRd.position.set(0, 0, 0); PRd.quaternion.set(0, 0, 0, 1);
      if (on) {
        partMatrix(gun.cylinder, _cm); _cb.compose(gun.magBase.pos, gun.magBase.quat, gun.magBase.scale).invert();
        _cm.multiply(_cb).decompose(_cp, _cq, _cs);   // the cylinder's move off its rest
        const ko = smooth((u - win.out[0]) / (win.out[1] - win.out[0])), kp = smooth((u - win.toPalm[0]) / (win.toPalm[1] - win.toPalm[0]));
        const local = placeLocalOfWrist(_local2);
        for (let i = 0; i < PRd.children.length; i++) {
          const r = PRd.children[i], show = i < nLive; r.visible = show; if (!show) continue;
          const a = Math.PI / 6 + i * Math.PI / 3;
          // in its chamber (at rest), carried by the cylinder's move, slid out of the back
          r.position.set(Math.cos(a) * EP.chamberR, EP.chamberY0 + Math.sin(a) * EP.chamberR, EP.chamberZ0 - win.travel * ko).applyQuaternion(_cq).add(_cp);
          r.quaternion.copy(_cq);
          if (kp > 0) {   // into the palm: a row across it, lying along the fingers
            _lp.copy(wristSpacePoint(arms.l, 'palm', _ppalm)); _lp.x += (i - (nLive - 1) / 2) * 0.017; _lp.z += 0.010;
            _lp.multiplyScalar(local.s).applyQuaternion(local.q).add(local.p);
            r.position.lerp(_lp, kp); r.quaternion.slerp(_pq2.copy(local.q).multiply(_rowQ), kp);
          }
        }
      }
    }
    if (gun.loadRound && gun.loadRoundBase) {
      // the launcher's loose round: in the support fingers on each trip from the pouch to the open drum's bottom chamber,
      // its nose along the bore (it goes into the chamber's back), gone at the push home (the body's round shows then)
      const Rd = gun.loadRound, trips = R.round && R.round.trips;
      let on = null;
      if (trips && u != null) for (const t of trips) if (u >= t[0] && u < t[1]) { on = t; break; }
      if (on) {
        const local = placeLocalOfWrist(_local2), ahead = R.round.ahead || 0.045;
        Rd.position.copy(wristSpacePoint(arms.l, 'palm', _ppalm).multiplyScalar(local.s).applyQuaternion(local.q).add(local.p));
        Rd.position.z += ahead; Rd.position.y += R.round.up || 0;   // its back end at the fingertips, above them so the eye sees it past the glove
        Rd.quaternion.copy(gun.loadRoundBase.quat);
        Rd.visible = true;
      } else { Rd.position.copy(gun.loadRoundBase.pos); Rd.quaternion.copy(gun.loadRoundBase.quat); Rd.visible = false; }
    }
    if (gun.speedloader && gun.speedloaderBase) {
      const L = gun.speedloader, win = R.loader;
      if (win && u != null && gun.cylinder && u >= win.show && u < win.gone) {
        L.visible = true;
        if (RN && RN.load) for (let i = 1; i < L.children.length; i++) L.children[i].visible = i <= RN.load && u < win.push[1];   // CL-326: as many rounds as the loader holds (child 0 is its ring), in the chambers once pushed home
        const local = placeLocalOfWrist(_local2);
        // in the palm (from the pouch), then onto the cylinder's back, the rounds into the chambers
        const inPalm = u < win.toPart[0], tp = smooth((u - win.toPart[0]) / (win.toPart[1] - win.toPart[0]));
        partMatrix(gun.cylinder, _cm); _cm.decompose(_cp, _cq, _cs);
        const push = smooth((u - win.push[0]) / (win.push[1] - win.push[0]));
        _lp.set(0, 0, -(win.back - (win.back - win.seat) * push)).applyQuaternion(_cq).add(_cp);
        if (inPalm || tp < 1) {
          const pp = wristSpacePoint(arms.l, 'palm', _ppalm).multiplyScalar(local.s).applyQuaternion(local.q).add(local.p);
          const pq = _pq2.copy(local.q).multiply(gun.speedloaderBase.quat);
          if (inPalm) { L.position.copy(pp); L.quaternion.copy(pq); }
          else { L.position.copy(pp).lerp(_lp, tp); L.quaternion.copy(pq).slerp(_cq, tp); }
        } else { L.position.copy(_lp); L.quaternion.copy(_cq); }
      } else {
        L.position.copy(gun.speedloaderBase.pos); L.quaternion.copy(gun.speedloaderBase.quat); L.visible = false;
      }
    }
  }
  const _pq2 = Q(), _tipA = V3(), _tipB = V3(), _tipC = V3();
  const _rowQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2);   // CL-326: a round's +z along the hand's -y (the fingers)
  const _pinchOff = new T.Vector3(0, -0.062, 0.022), _bkV = new T.Vector3(), _bgi = new T.Quaternion(), _eLo = [0, 0, 0];   // CL-326: from the palm to a pinch's fingertips, wrist space (the fingers' -y, the palm's +z)
  // CL-307: the blade's swing. A gun-like frame on the key path (view space, as the eye sees it: x and the yaw/roll turned
  // for his side), the fist on it as on the gun's grip (sockets.r), the blade's root at hold in that frame; the support
  // wrist away out of the view, both elbows toward the shoulders.
  const _bfA = F(), _bfB = F(), _bfF = F(), _bfH = F(), _bfQ = Q(), POSE_RELAXED = copyPose(HAND_POSES.relaxed);
  function bladeFrame(BL, bs, WR, WL, eR, eL) {
    const u = clamp(bs.u || 0, 0, 1), K = BL.keys;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    const keyF = (k, out) => {
      const a = K[k][1];
      out.p.set(a.p[0] * MX, a.p[1], a.p[2]); out.s = gun.s;
      out.q.copy(BORE_AHEAD).multiply(eulerQ(a.e[0] * MX, a.e[1], a.e[2] * MX, _bfQ));
      if (a.e[3]) out.q.premultiply(_bfQ.setFromAxisAngle(AX_Z, a.e[3] * MX));   // the swing, about the view's depth axis
      return out;
    };
    lerpF(keyF(i, _bfA), keyF(j, _bfB), t, _bfF);
    mul(_bfF, sockets.r, WR);   // the fist where the grip would be
    const B = bladeCopy();
    if (B) {
      mirrorParts(B);
      _bfH.p.set(BL.hold.pos[0] * MX, BL.hold.pos[1], BL.hold.pos[2]); _bfH.s = B.s;
      eulerQ(BL.hold.rot[0] * MX, BL.hold.rot[1], BL.hold.rot[2] * MX, _bfH.q);
      mul(_bfF, _bfH, _bfF);
      B.root.position.copy(_bfF.p); B.root.quaternion.copy(_bfF.q); B.root.scale.setScalar(_bfF.s * (B.src.scale.x || 1));
      B.root.visible = true;
    }
    WL.p.set(BL.away[0] * MX, BL.away[1], BL.away[2]); WL.q.copy(WR.q); WL.s = WR.s;
    eR[0] = WR.p.x + 0.10 * MX; eR[1] = WR.p.y - 0.30; eR[2] = WR.p.z + 0.22;
    eL[0] = WL.p.x - 0.08 * MX; eL[1] = WL.p.y - 0.25; eL[2] = WL.p.z + 0.18;
    twistToward(arms.r, WR, eR);
    info.handPlace = 'blade';
  }
  // CL-317: the hands without a gun. 'empty': VM_HANDS.empty's two places with a breathing bob. 'ladder': the body's own
  // rung targets (world space) brought into the view (the main camera's fov to the view's, x mirrored as the hold is),
  // each hand gripping over its rung. The last gun's socket poses give the fingers: the grip's for a rung, relaxed for
  // the empty hands.
  const _hnA = F(), _hnB = F(), _hnQ = Q(), _hnV = V3(), _hnInv = M4(), _hnPose = { r: null, l: null }, _hnSR = F(), _hnSL = F();
  // The empty hands' fingers: easier than the body's hang (GB-169) so they read curled from behind, short of a fist.
  const POSE_EASY = copyPose({ f: [[0.55, 0.7, 0.4, 0.03], [0.62, 0.78, 0.45, 0], [0.7, 0.85, 0.5, -0.03], [0.8, 0.95, 0.55, -0.07]], t: [0.5, 0.1, 0.3] });
  function handsFrame(HN, hs, WR, WL, eR, eL, dt) {
    S.handsT = (S.handsT || 0) + dt;
    // Each key is a grip-point frame (a gun pointing that way); the wrist sits in it as the hold's socket turns it (the
    // socket's orientation only, its offset dropped: the hand is at the key place), the left as the right's mirror.
    _hnSR.q.copy(sockets.r.q); _hnSR.s = sockets.r.s; _hnSR.p.set(0, 0, 0);
    mirrorSocket(sockets.r, _hnSL); _hnSL.p.set(0, 0, 0);
    const keyF = (p, e, out, sx) => {   // as gunFrame turns a gun: the angles in view space, then the bore ahead
      out.p.set(p[0] * MX, p[1], p[2]); out.s = gun.s;
      eulerQ(e[0] * sx * MX, e[1], e[2] * sx * MX, out.q).multiply(BORE_AHEAD);
      return out;
    };
    if (hs.kind === 'ladder' && hs.r && hs.l) {
      camera.updateMatrixWorld();
      _hnInv.copy(camera.matrixWorld).invert();
      const k = Math.tan((camera.fov || 60) * Math.PI / 360) / Math.tan(proj.fov * Math.PI / 360);
      const G = HN.grab;
      for (const [src, out, sx, sk] of [[hs.l, WR, 1, _hnSR], [hs.r, WL, -1, _hnSL]]) {   // the body's left hand is the view's right (the mirror)
        _hnV.copy(src).applyMatrix4(_hnInv);
        _hnV.x *= MX / k; _hnV.y /= k;
        _hnA.p.copy(_hnV); _hnA.p.y -= G.down || 0; _hnA.p.z += G.back || 0; _hnA.s = gun.s;
        eulerQ(G.e[0] * sx * MX, G.e[1], G.e[2] * sx * MX, _hnA.q).multiply(BORE_AHEAD);
        mul(_hnA, sk, out);
      }
      _hnPose.r = sockets.poseR; _hnPose.l = sockets.poseR;
    } else if (hs.kind === 'empty' && HN.sides) {
      // CL-324 (J70): at his sides, in his body's frame turned into the view's by his pitch (looking down shows them),
      // swinging with his stride (st.phase) by his walk weight (S.bobW)
      const SD = HN.sides, th = -(S.pitch || 0), c = Math.cos(th), sn = Math.sin(th), ph = S.bobPhase || 0, wk = S.bobW || 0;
      const place = (B, sgn, out, sx) => {
        const sw = Math.sin(ph) * SD.swing * wk * sgn, x = B[0] * MX, y = B[1] + SD.lift * Math.abs(sw) / Math.max(1e-6, SD.swing), z = B[2] - sw;
        out.p.set(x, y * c - z * sn, y * sn + z * c); out.s = gun.s;
        eulerQ(SD.e[0] * sx * MX, SD.e[1] - th - sw * 1.2, SD.e[2] * sx * MX, out.q).multiply(BORE_AHEAD);
        return out;
      };
      mul(place(SD.r, 1, _hnA, 1), _hnSR, WR);
      mul(place(SD.l, -1, _hnB, -1), _hnSL, WL);
      const E = SD.elbow, ey = E[1], ez = E[2];
      eR[0] = WR.p.x + E[0] * MX; eR[1] = WR.p.y + ey * c - ez * sn; eR[2] = WR.p.z + ey * sn + ez * c;
      eL[0] = WL.p.x - E[0] * MX; eL[1] = WL.p.y + ey * c - ez * sn; eL[2] = WL.p.z + ey * sn + ez * c;
      twistToward(arms.r, WR, eR); twistToward(arms.l, WL, eL);
      _hnPose.r = POSE_EASY; _hnPose.l = POSE_EASY; info.handPlace = hs.kind;
      return _hnPose;
    } else {
      const bob = HN.bob ? Math.sin(S.handsT * HN.bob.rate * Math.PI * 2) * HN.bob.y : 0;
      const TN = info.tune.hands || null;   // live: vm().info.tune.hands = { r: { p, e }, l: { p, e } }
      const KR = (TN && TN.r) || HN.r, KL = (TN && TN.l) || HN.l;
      keyF(KR.p, KR.e, _hnA, 1); _hnA.p.y += bob; if (HN.bob) _hnA.p.x += Math.sin(S.handsT * HN.bob.rate * Math.PI) * HN.bob.x * MX;
      mul(_hnA, _hnSR, WR);
      keyF(KL.p, KL.e, _hnB, 1); _hnB.p.y += bob * 0.8; if (HN.bob) _hnB.p.x -= Math.sin(S.handsT * HN.bob.rate * Math.PI + 0.7) * HN.bob.x * MX;
      mul(_hnB, _hnSL, WL);
      _hnPose.r = POSE_EASY; _hnPose.l = POSE_EASY;
    }
    const E = HN.elbow;
    eR[0] = WR.p.x + E.r[0] * MX; eR[1] = WR.p.y + E.r[1]; eR[2] = WR.p.z + E.r[2];
    eL[0] = WL.p.x + E.l[0] * MX; eL[1] = WL.p.y + E.l[1]; eL[2] = WL.p.z + E.l[2];
    twistToward(arms.r, WR, eR); twistToward(arms.l, WL, eL);
    info.handPlace = hs.kind;
    return _hnPose;
  }
  // CL-307: the grenade throw's support hand. The body's phase and its time pick two of VM_GRENADE's places and the way
  // between them; 'fore' is the hand's place on the gun. The fist as on a mirrored pistol grip (the pair's left hand);
  // the grenade's root at hold in it while the body has one in hand.
  const _grA = F(), _grB = F(), _grF = F(), _grS = F(), _grH = F(), _grQ = Q(), _grP = copyPose(HAND_POSES.relaxed);
  function grenadeFrame(gr, WL, eL, dt) {
    const T0 = VM_GRENADE.times, P = VM_GRENADE.places, ph = gr.phase, t = gr.t || 0;
    let a, b, k, inHand;
    if (ph === 'grab') { a = 'fore'; b = 'pouch'; k = smooth(t / T0.grab); inHand = t >= T0.inHand; }
    else if (ph === 'raise') { a = 'pouch'; b = 'cocked'; k = smooth(t / T0.raise); inHand = true; }
    else if (ph === 'cocked') { a = 'cocked'; b = 'cocked'; k = 0; inHand = true; }
    else if (ph === 'throw') {
      if (t < T0.whip) { a = 'cocked'; b = 'whip'; k = smooth(t / T0.whip); inHand = true; }
      else { a = 'whip'; b = 'follow'; k = smooth((t - T0.whip) / T0.follow); inHand = false; }
    }
    else if (ph === 'back') { a = 'follow'; b = 'fore'; k = smooth(t / T0.back); inHand = false; }
    else return null;
    const placeF = (name, out) => {
      if (name === 'fore') { mul(G, sockets.l, out); return out; }
      const q = P[name];
      out.p.set(q.p[0] * MX, q.p[1], q.p[2]); out.s = gun.s;
      out.q.copy(BORE_AHEAD).multiply(eulerQ(q.e[0] * MX, q.e[1], q.e[2] * MX, _grQ));
      mul(out, mirrorSocket(sockets.r, _grS), out);   // the fist on it
      return out;
    };
    lerpF(placeF(a, _grA), placeF(b, _grB), k, WL);
    if (ph === 'cocked') { S.grBob = (S.grBob || 0) + dt; WL.p.y += VM_GRENADE.bob.y * Math.sin(S.grBob * VM_GRENADE.bob.rate * Math.PI * 2); } else S.grBob = 0;
    const C = grenadeCopy();
    if (C) {
      if (inHand) {
        mirrorParts(C);
        // the grenade at hold in the fist: from the wrist back through the mirrored grip socket to the gun-like frame
        mirrorSocket(sockets.r, _grS);
        _grF.q.copy(_grS.q).invert(); _grF.s = 1 / _grS.s; _grF.p.copy(_grS.p).multiplyScalar(-_grF.s).applyQuaternion(_grF.q);
        mul(WL, _grF, _grF);
        _grH.p.set(VM_GRENADE.hold.pos[0] * MX, VM_GRENADE.hold.pos[1], VM_GRENADE.hold.pos[2]); _grH.s = 1;
        eulerQ(VM_GRENADE.hold.rot[0] * MX, VM_GRENADE.hold.rot[1], VM_GRENADE.hold.rot[2] * MX, _grH.q);
        mul(_grF, _grH, _grF);
        C.root.position.copy(_grF.p); C.root.quaternion.copy(_grF.q); C.root.scale.setScalar(_grF.s * (C.src.scale.x || 1));
        C.root.visible = true;
      } else C.root.visible = false;
    }
    // CE-4 (12 Nov): the elbow from each place's own offset off the wrist (elb, view space as the eye sees it; the default
    // below and behind the hand): up and out to the side at the cock, so the wind-up reads as an overhand throw
    { const E0 = VM_GRENADE.elbow || [-0.12, -0.30, 0.16], ea = (a !== 'fore' && P[a].elb) || E0, eb = (b !== 'fore' && P[b].elb) || E0;
      eL[0] = WL.p.x + (ea[0] + (eb[0] - ea[0]) * k) * MX; eL[1] = WL.p.y + ea[1] + (eb[1] - ea[1]) * k; eL[2] = WL.p.z + ea[2] + (eb[2] - ea[2]) * k; }
    twistToward(arms.l, WL, eL);
    info.handPlace = 'grenade';
    // CE-4: the fingers eased through it (VM_GRENADE.fingers), the fist while the grenade is in hand
    const FG = VM_GRENADE.fingers;
    if (inHand || !FG) return inHand ? sockets.poseR : POSES.open;
    if (ph === 'grab') return lerpPose(sockets.poseL, FG.reach, smooth(t / T0.inHand), _grP);
    if (ph === 'throw') return lerpPose(sockets.poseR, FG.release, smooth((t - T0.whip) / FG.open), _grP);
    return lerpPose(FG.release, sockets.poseL, smooth(t / T0.back), _grP);
  }
  // The support wrist's frame in the gun's own space (WL is view space).
  function placeLocalOfWrist(out) {
    const gi = _gi.copy(G.q).invert();
    out.q.copy(gi).multiply(WL.q); out.s = WL.s / G.s;
    out.p.copy(WL.p).sub(G.p).applyQuaternion(gi).multiplyScalar(1 / G.s);
    return out;
  }
  // Onto the camera, with this frame's projection.
  function place() {
    if (!root.visible) return;
    camera.updateMatrixWorld();
    camera.matrixWorld.decompose(root.position, root.quaternion, _psc);
    root.scale.set(1, 1, 1);
    { const own = gun && VIEW_FOV[gun.key], F0 = info.tune.fov || own || VM.fov, F1 = info.tune.adsFov || (own ? Math.min(own, VM.adsFov) : VM.adsFov);   // CC-342 (J121): a gun's own view FOV
      updateProjection(F0 + (F1 - F0) * smooth(S.ads)); }   // CL-324: live tuning
    root.updateMatrixWorld(true);
  }
  // A point on the view gun (its own space) in view space.
  function viewPoint(local, out = V3(), which = 1) {   // CL-301: which 2, the pair's left gun
    const Fr = which === 2 ? G2 : G;
    if (!gun || (which === 2 && !gun2)) return out.set(0, 0, 0);
    return out.copy(local).multiplyScalar(Fr.s).applyQuaternion(Fr.q).add(Fr.p);
  }
  // A view-space point on screen (ndc), through the view gun's projection.
  function ndc(v, out = { x: 0, y: 0, d: 0 }) {   // v in his space (viewPoint's): mirrored as the eye sees it
    const t = Math.tan(proj.fov * Math.PI / 360), d = -v.z;
    out.x = v.x * MX / (Math.max(1e-6, d) * t * (proj.aspect || 1)); out.y = v.y / (Math.max(1e-6, d) * t); out.d = d;
    return out;
  }
  // Project any gun-local point through the view gun's lens into the main
  // camera's world. The laser and white-light windows use this separately.
  function pointWorld(local, out, which = 1) {
    const g = which === 2 ? gun2 : gun;
    if (!g || !local) return null;
    const v = viewPoint(local, _mw, which);
    const k = Math.tan((camera.fov || 60) * Math.PI / 360) / Math.tan(proj.fov * Math.PI / 360);
    v.x *= k * MX; v.y *= k;
    camera.updateMatrixWorld();
    return out.copy(v).applyMatrix4(camera.matrixWorld);
  }
  // The world point the main camera shows where the view gun's muzzle is drawn.
  function muzzleWorld(out, which = 1) {   // CL-301: which 2, the pair's left gun
    const g = which === 2 ? gun2 : gun;
    return pointWorld(g?.src.userData.muzzleLocal, out, which);
  }
  function showing(key) { return info.active && !!gun && gun.key === key && S.raise > 0.5; }
  // CE-7 (J144c): the laser's and the light's line: null when the view isn't on this gun (third person: the body's gun);
  // true while the view gun is drawn at any raise (a swap or a reload dips it); false while it is put away for a blade
  // swing or the empty hands (not drawn: no line). which 2: the pair's left gun.
  function holding(key, which = 1) { const g = which === 2 ? gun2 : gun; if (!info.active || !gun || gun.key !== key || !g) return null; return !!g.root.visible; }
  // CC-342 (J109): where a red dot's dot is drawn (ndc, the screen's centre 0, 0; y up): along the optic's own line from the
  // view gun's dot (its RMR, or the ACOG's RMR on top), so it rides the gun's kick and sway as the window round it does.
  // null without a fitted optic's line.
  // CE-10 (J151 note 14, Jerry 13 Nov: "The red dot appears to slide while firing the shotgun ADS"): the line's point 400 m
  // out swings with the gun's whole turn while the window, a hand's length from the eye, moves a fraction of it: on the
  // shotgun's kick the dot rose 0.24 ndc with its window at 0.04 (half-height 0.03), out of the housing and up the screen.
  // The dot is drawn on its window (the RMR's glass, its centre on the line) and keeps only a short drift toward where the
  // line points, eased to at most VM_DOT.drift of the window's half-height: it rides the kick and sway with the housing
  // round it and never leaves it.
  const _odA = V3(), _odB = V3(), _odD = V3(), _odN = { x: 0, y: 0, d: 0 }, _odW = { x: 0, y: 0, d: 0 }, _odH = { x: 0, y: 0, d: 0 };
  const VM_DOT = { drift: 0.35, glassHalf: 0.008, eyeToDot: 0.046 };   // the RMR's glass half-height and its eye-to-dot, in the optic's units (studio/weapon-optics.js rmr)
  function opticDotOffset(out = { x: 0, y: 0 }) {
    const m = gun && gun.src && gun.src.userData.fittedOptic, L = m && m.userData.line;
    if (!L || !info.active) return null;
    const top = L.topDot && L.topEye && S.opticTop > 0.5, e = top ? L.topEye : L.eye, d = top ? L.topDot : L.dot;
    _odD.set(d[0] - e[0], d[1] - e[1], d[2] - e[2]);
    const len = _odD.length();
    if (len < 1e-5) _odD.set(0, 0, 1); else _odD.multiplyScalar(1 / len);
    _odA.set(d[0], d[1], d[2]).addScaledVector(_odD, 400 / Math.max(1e-3, gun.s));   // 400 m ahead along its line
    viewPoint(_odA, _odB); ndc(_odB, _odN);
    viewPoint(_odA.set(d[0], d[1], d[2]), _odB); ndc(_odB, _odW);   // the window's centre
    const up = (len > 1e-5 ? len / VM_DOT.eyeToDot : 1) * VM_DOT.glassHalf;   // the glass's half-height in gun units
    viewPoint(_odA.set(d[0], d[1] + up, d[2]), _odB); ndc(_odB, _odH);
    const cap = Math.max(1e-4, Math.abs(_odH.y - _odW.y) * VM_DOT.drift), dx = _odN.x - _odW.x, dy = _odN.y - _odW.y, r = Math.hypot(dx, dy);
    const k = r > 1e-9 ? cap * Math.tanh(r / cap) / r : 1;   // the drift eased toward the cap, any way it points
    out.x = _odW.x + dx * k; out.y = _odW.y + dy * k;
    out.win = Math.abs(_odH.y - _odW.y);   // CE-10: the window's half-height (ndc), for tce10
    return out;
  }
  // AG-302 / AG-304: pre-build first-person gun copies and arms for Training blackout compilation, then restore hidden state.
  // Passing `onlyKeys` (e.g. ['pistol']) warms only the issued weapon during blackout so entry stays ~5 s, while `warmBgGun`
  // stages the remaining 11 weapons one at a time for time-sliced post-blackout background compilation.
  function prepareWarmup(onlyKeys = null) {
    dropGun();
    setEyeHide(false, null);
    syncArmMaterials();
    const warmGroup = new T.Group();
    warmGroup.name = 'vm-warmup';
    warmGroup.position.set(0, 0, -0.6);
    space.add(warmGroup);
    const keys = Array.isArray(onlyKeys) ? onlyKeys : Object.keys(VM_POSES);
    for (const k of keys) {
      const src = weaponMeshes[k];
      if (!src || !VM_POSES[k]) continue;
      takeGunCopy(gunCache, k, src, warmGroup);
    }
    const bl = bladeCopy(), gr = grenadeCopy();
    const prevRootVis = root.visible;
    const saved = [];
    root.visible = true;
    root.traverse((o) => {
      if (o === root) return;
      const inst = !!(o.isInstancedMesh && o.count === 0 && o.instanceMatrix && o.instanceMatrix.count > 0);
      saved.push({ o, vis: o.visible, cull: o.frustumCulled, inst });
      o.visible = true;
      if (o.isMesh) o.frustumCulled = false;
      if (inst) o.count = 1;
    });
    place();
    const pendingTex = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) for (const tk of ['map', 'normalMap']) {
        const tex = m && m[tk];
        if (tex && !tex.image) pendingTex.push(tex);
      }
    });
    const readySync = pendingTex.length === 0;
    const ready = readySync
      ? Promise.resolve()
      : new Promise((resolve) => {
          const t0 = Date.now();
          const check = () => {
            if (pendingTex.every((t) => !!t.image) || Date.now() - t0 > 200) resolve();
            else setTimeout(check, 8);
          };
          check();
        });
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      for (let i = saved.length - 1; i >= 0; i--) {
        const s = saved[i];
        s.o.visible = s.vis;
        s.o.frustumCulled = s.cull;
        if (s.inst) s.o.count = 0;
      }
      while (warmGroup.children.length) warmGroup.remove(warmGroup.children[warmGroup.children.length - 1]);
      space.remove(warmGroup);
      if (bl && bl.root) bl.root.visible = false;
      if (gr && gr.root) gr.root.visible = false;
      root.visible = prevRootVis;
      dropGun();
      setEyeHide(false, null);
    };
    return { ready, readySync, restore };
  }
  function warmBgGun(key) {
    const src = weaponMeshes[key];
    if (!src || !VM_POSES[key]) return null;
    syncArmMaterials();
    const bgGroup = new T.Group();
    bgGroup.name = 'vm-bg-warm-' + key;
    bgGroup.visible = false;
    bgGroup.position.set(0, 0, -0.6);
    space.add(bgGroup);
    const entries = [];
    if (!(gun && gun.key === key) && !gunCache.has(key)) {
      entries.push(takeGunCopy(gunCache, key, src, bgGroup));
    }
    const off = ctx.offhand ? ctx.offhand(key) : null;
    if (off && !(gun2 && gun && gun.key === key) && !gun2Cache.has(key)) {
      entries.push(takeGunCopy(gun2Cache, key, off, bgGroup));
    }
    const meshes = [], saved = [];
    bgGroup.traverse((o) => {
      if (o === bgGroup) return;
      const inst = !!(o.isInstancedMesh && o.count === 0 && o.instanceMatrix && o.instanceMatrix.count > 0);
      saved.push({ o, vis: o.visible, cull: o.frustumCulled, inst });
      o.visible = true;
      if (o.isMesh || o.isLine || o.isPoints || o.isSprite) {
        o.frustumCulled = false;
        meshes.push(o);
      }
      if (inst) o.count = 1;
    });
    place();
    bgGroup.updateMatrixWorld(true);
    let cleaned = false;
    return {
      meshes,
      cleanup: () => {
        if (cleaned) return;
        cleaned = true;
        for (let i = saved.length - 1; i >= 0; i--) {
          const s = saved[i];
          s.o.visible = s.vis;
          s.o.frustumCulled = s.cull;
          if (s.inst) s.o.count = 0;
        }
        for (const e of entries) {
          if (e && e.root && e.root.parent === bgGroup) bgGroup.remove(e.root);
        }
        if (bgGroup.parent) bgGroup.parent.remove(bgGroup);
      }
    };
  }
  const _bdR = Q();
  function dispose() {
    setEyeHide(false, null);
    dropGun();
    gunCache.clear();
    gun2Cache.clear();
    if (root.parent) root.parent.remove(root);
  }
  return {
    root, space, update, place, muzzleWorld, pointWorld, showing, holding, viewPoint, ndc, dispose, prepareWarmup, warmBgGun, info, opticDotOffset /* CC-342 */, retune: () => { sockets.key = null; for (const k in sockCache) delete sockCache[k]; },
    // CL-293: the view's turn for this shot's spring (radians: p up, y left); 0 unless the view gun is up.
    // CL-327: how far the view gun is turned off its rest pose (the sway, the kick, the sprint's carry, a reload, the
    // raise), in the eye's space (the mirror undone), for the laser's and the light's line. which 2: the pair's left gun.
    boreDelta: (out, which = 1) => {
      if (!gun || !S.restQ || (which === 2 && !gun2)) return out.identity();
      const Fr = which === 2 ? G2 : G;
      if (which === 2) _bdR.set(S.restQ.x, -S.restQ.y, -S.restQ.z, S.restQ.w); else _bdR.copy(S.restQ);
      out.copy(Fr.q).multiply(_bdR.invert());
      if (MX < 0) { out.y = -out.y; out.z = -out.z; }
      return out;
    },
    cameraPunch: (out = { p: 0, y: 0 }) => { const on = info.active && S.raise > 0.5, gw = on && S.glassW > 0 ? S.glassW : 0;   // CC-342 (J109): through the glass, the gun's own kick
      out.p = on ? cs.x[0] + ok.x[1] * gw : 0; out.y = on ? cs.x[1] + ok.x[0] * MX * gw : 0; return out; },
    get gun() { return gun; }, get gun2() { return gun2; }, get frame2() { return G2; }, get arms() { return arms; }, get sockets() { return sockets; }, get frame() { return G; },
    get wrists() { return { r: WR, l: WL }; }, get proj() { return proj; }, get hidden() { return hidden; }, get filtering() { return filterOn; },
    isEyeHidden: (o) => hideOn && !!(o && o.userData && o.userData.vmEyeHide),
    // CE-4: when the support thumb can press the light's switch on the gun in hand (key) now: the press's times (at: the
    // pad fully in, when index.html changes the light; total: the hand home), else null (index.html changes it at once)
    lightPressTimes: (key) => (info.active && gun && gun.key === key && !gun2 && S.raise > 0.98 && S.lightFree && (VM_LIGHT[key] || (info.tune.light && info.tune.light[key])) && gun.ctrls.lightSwitch && gun.src.userData.lightSwitch ? (() => { const T0 = lightTimes(); return { at: T0.at, total: T0.t5 }; })() : null)
  };
}
