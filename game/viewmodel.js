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
import { VM, VM_POSES, VM_RELOADS, VM_SOCKETS, VM_BLADES, VM_GRENADE, VM_HANDS } from './viewmodel-poses.js';
import { SIGHT } from './sight-points.js';
import { buildViewArm, wristSpacePoint, HAND_SCALE } from '../studio/fp-arms.js';
import { copyPose, lerpPose, HAND_POSES } from '../studio/marine-hand.js';
import { ITEM_POSES, gripPose } from '../studio/hand-grips.js';
import { flippedTwin, needsFlip } from './vm-flip.js';

const smooth = (t) => { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ARM_CLOTH = new Set(['live-sleeve', 'live-sleeve-rolled', 'live-bare-arm']);

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
  function vmMaterial(src, noVC = false) {
    if (!src) return src;
    if (Array.isArray(src)) return src.map((s) => vmMaterial(s, noVC));
    const key = noVC ? 'n|' + src.uuid : src.uuid;
    let e = vmMats.get(key);
    if (e && e.version === src.version && e.map === src.map && e.transparent === src.transparent) return e.mat;
    const mat = makeVmMat(src, noVC);
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
    const beams = new Set(); for (const k in weaponMeshes) { const g = weaponMeshes[k]; if (g && g.userData && g.userData.laser) beams.add(g.userData.laser); }
    const walkArm = (o) => { if (beams.has(o)) return; add(o); for (const c of o.children) walkArm(c); };
    for (const a of [ud.armLG, ud.armRG]) if (a) walkArm(a);
    // AG-168 (defect 2): the guns slung on his back and holstered under his arms poked into the view (looking down, and
    // over the slide in the reload); out of the eye too.
    for (const g of (ctx.stowed ? ctx.stowed() : [])) if (g) walkArm(g);
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
    const stamp = on ? (gunSrc ? gunSrc.uuid : '-') + '|' + (gunSrc2 ? gunSrc2.uuid : '-') + '|' + (rig ? rig.bakes : 0) + '|' + gunNodes(gunSrc) + '|' + stowedNodes() : '';
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
      o = new T.InstancedMesh(geoOf(src.geometry), vmMaterial(src.material), src.count);
      o.instanceMatrix.array.set(src.instanceMatrix.array);
      o.instanceMatrix.needsUpdate = true;
      o.userData.vmInstanceVersion = src.instanceMatrix.version;
      if (src.instanceColor) o.instanceColor = src.instanceColor.clone();
      o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = src.renderOrder || 0;   // CL-304 (J6): no world shadow on the view gun either
    } else if (src.isMesh) {
      o = new T.Mesh(geoOf(src.geometry), vmMaterial(src.material));
      o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; o.renderOrder = src.renderOrder || 0;   // CL-304 (J6): no world shadow on the view gun either
    } else o = new T.Group();
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
  function buildGun(key, pair = false) {
    dropGun();
    const src = weaponMeshes[key];
    if (!src) return;
    S.lastFlashT = null; S.lastFlashT2 = null;
    gun = copyGun(key, src, gunHolder);
    const off = pair && ctx.offhand ? ctx.offhand(key) : null;
    if (off) gun2 = copyGun(key, off, gunHolder2);
  }
  function copyGun(key, src, holder) {
    // CL-293 (Jerry, 3 Nov: "there being no stocks"): the stock is in the copy now, shown at the hip and put away down the
    // sights (update, below), where it would fill the eye.
    const ud = src.userData || {}, pairs = [], skip = new Set([ud.laser].filter(Boolean));
    const r = cloneLean(src, pairs, skip);
    r.position.set(0, 0, 0); r.quaternion.set(0, 0, 0, 1); r.scale.set(1, 1, 1);
    holder.add(r);
    const map = new Map(pairs);
    // MU-11 (finding 3): the palm ride and the slide's grab work in the gun root's space: a magazine or slide deeper in the
    // gun's tree is left to his own gun's animation (mirrored) instead.
    const direct = (o) => (o && o.parent === src ? o : null);
    const gun = { key, src, root: r, pairs, slide: map.get(direct(ud.slide)) || null,
      work: map.get(direct(ud.work || ud.slide)) || null, mag: map.get(direct(ud.mag)) || null,
      pump: map.get(direct(ud.pump)) || null, bolt: map.get(direct(ud.bolt)) || null,
      cylinder: map.get(direct(ud.cylinder)) || null, shell: map.get(direct(ud.reloadShell)) || null,
      // GB-302: reload moving parts Claude drives (direct children of the gun root, as pump/slide).
      ammoBox: map.get(direct(ud.ammoBox)) || null,
      fuelCan: map.get(direct(ud.fuelCan)) || null,
      empties: map.get(direct(ud.empties)) || null,
      speedloader: map.get(direct(ud.speedloader)) || null,
      fuelCap: map.get(direct(ud.fuelCap)) || null,
      // CL-306: the launcher's drum on its hinge (GP-20039: ud.mag is the hinge), its latch and winding key
      drum: map.get(ud.drum) || null, latch: map.get(direct(ud.drumLatch)) || null, winder: map.get(ud.drumWinder) || null,
      loadRound: map.get(direct(ud.loadRound)) || null,   // GP-20039: the loose round for the support fingers
      stock: map.get(ud.fpStock) || null,
      flash: map.get(ud.flash) || null,
      nodes: countNodes(src), s: 1, foot: null, magBase: null };
    gun.workBase = gun.work ? gun.work.position.clone() : null;
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
  function readSockets(key, settled, dt) {
    const ud = marine.userData, src = weaponMeshes[key];
    const wr = ud.elbowRG && ud.elbowRG.userData.wrist, wl = ud.elbowLG && ud.elbowLG.userData.wrist;
    if (!src || !wr || !wl) return;
    if (wr.userData.hand) copyPose(wr.userData.hand.pose, sockets.poseR);
    if (wl.userData.hand) copyPose(wl.userData.hand.pose, sockets.poseL);
    const first = sockets.key !== key || !sockets.r;
    if (!first && !settled) return;
    src.updateWorldMatrix(true, false); wr.updateWorldMatrix(true, false); wl.updateWorldMatrix(true, false);
    const inv = _sinv.copy(src.matrixWorld).invert();
    const k = first ? 1 : 1 - Math.exp(-4 * dt);
    for (const [side, w] of [['r', wr], ['l', wl]]) {
      _sm.multiplyMatrices(inv, w.matrixWorld); fromMatrix(_sm, _sf);
      // CL-293 (J54): a hand's turn on the gun can be set per gun (VM_SOCKETS gripRot / supportRot: x, y, z radians, YXZ, in
      // the gun's space, on top of the hold's own turn) and tried live (info.tune[key][side] = { p, r }, then retune()).
      { const A = VM_SOCKETS[key], tn = info.tune[key] && info.tune[key][side], rr = (tn && tn.r) || (A && (side === 'r' ? A.gripRot : A.supportRot));
        if (rr) _sf.q.premultiply(_tq2.setFromEuler(_te.set(rr[0], rr[1], rr[2], 'YXZ')));
        // CL-301 (Jerry, 4 Nov: "Left hand should have a motorcycle grip on chainsaw palm facing down"): or the hand's own axes
        // set outright in the gun's space (VM_SOCKETS gripBasis / supportBasis { x: the grip channel, y: toward the elbow }),
        // live as info.tune[key][side].basis; the position still comes from the authored grip point.
        const B = (tn && tn.basis) || (A && (side === 'r' ? A.gripBasis : A.supportBasis));
        if (B) { _bx.set(B.x[0], B.x[1], B.x[2]).normalize(); _by.set(B.y[0], B.y[1], B.y[2]); _by.addScaledVector(_bx, -_by.dot(_bx)).normalize(); _bz.crossVectors(_bx, _by); basisQ(_bx, _by, _bz, _sf.q); } }
      if (first || !sockets[side]) sockets[side] = { p: _sf.p.clone(), q: _sf.q.clone(), s: _sf.s };
      else lerpF(sockets[side], _sf, k, sockets[side]);
      const authored = VM_SOCKETS[key], tnp = info.tune[key] && info.tune[key][side] && info.tune[key][side].p;
      // A pistol grip can keep its gun-frame anchor while the glove closes on its
      // visible side. The launcher uses this to show the trigger hand below the receiver.
      const tgt = tnp || (authored && (side === 'r' ? (authored.gripContact || authored.grip) : authored.support));
      if (tgt && arms) {
        _target.set(tgt[0], tgt[1], tgt[2]);
        wristSpacePoint(arms[side], 'grip', _contact).multiplyScalar(sockets[side].s).applyQuaternion(sockets[side].q);
        sockets[side].p.copy(_target).sub(_contact);
      }
    }
    sockets.key = key;
  }

  // --- springs ---------------------------------------------------------------------------------------------------
  const spring = (c) => ({ x: [0, 0, 0], v: [0, 0, 0], t: [0, 0, 0], k: c.k, c: 2 * c.z * Math.sqrt(c.k) });
  const sp = { pos: spring(VM.spring.pos), rot: spring(VM.spring.rot) };
  const cs = spring(VM.camera || { k: 300, z: 0.82 });   // CL-293: the view's share of each shot (pitch, yaw), cameraPunch()
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
    const end = Math.min(0.9, (R.mag.seat || 0.6) + 0.1), k = 1 / end;
    const hand = R.hand.filter((h) => h[0] <= end && h[1] !== 'work').map((h) => [Math.min(1, h[0] * k), h[1], h[2]]);
    hand.push([1, 'fore', 'fore']);
    const gun = R.gun.filter((g) => g[0] <= end).map((g) => [Math.min(1, g[0] * k), g[1]]);
    gun.push([Math.min(1, end * k + 0.001), null], [1, null]);
    const mag = { grab: R.mag.grab * k, swapOut: R.mag.swapOut * k, swapIn: R.mag.swapIn * k, seat: R.mag.seat * k };
    T2 = Object.freeze({ ...R, hand: Object.freeze(hand), gun: Object.freeze(gun), mag: Object.freeze(mag), rack: null, rock: R.rock ? { ...R.rock, out: R.rock.out.map((v) => v * k), in: R.rock.in.map((v) => v * k) } : null, tactical: true });
    tacCache.set(R, T2); return T2;
  }
  const reloadOf = (P, st) => { const R = P.reload && VM_RELOADS[P.reload]; return R && st.reloadU != null && st.reloadEmpty === false ? tacticalOf(R) : R; };
  const POSES = { mag: gripPose(ITEM_POSES.mag), pouch: gripPose(ITEM_POSES.pouch), cup: gripPose(ITEM_POSES.cup), pinch: gripPose(ITEM_POSES.pinch), open: copyPose(HAND_POSES.open) };
  const fingerPose = (name) => (name === 'fore' ? sockets.poseL : POSES[name] || sockets.poseL);
  const _ka = F(), _kb = F(), _pa = copyPose(HAND_POSES.relaxed);
  function reloadHand(R, u, out) {
    const K = R.hand;
    let i = 0; while (i < K.length - 1 && u >= K[i + 1][0]) i++;
    const j = Math.min(K.length - 1, i + 1), t = j === i ? 0 : smooth((u - K[i][0]) / (K[j][0] - K[i][0]));
    placeFrame(K[i][1], R, u, _ka); placeFrame(K[j][1], R, u, _kb);
    lerpF(_ka, _kb, t, out);
    lerpPose(fingerPose(K[i][2]), fingerPose(K[j][2]), t, _pa);
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
  const _y = V3(), _d = V3(), _ax = V3(), _qs = Q(), _qe = Q(), _wp = V3(), _qa = Q();
  function poseArm(arm, W, hint, max) {
    _y.set(0, 1, 0).applyQuaternion(W.q);
    _d.set(hint[0], hint[1], hint[2]).sub(W.p).normalize();
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
    const ad = AK ? null : adsOf(key);
    if (ad) {
      _adsQ.copy(ad.q);
      _adsP.set(0, 0, -P.ads.rear).sub(_gp.copy(ad.rear).multiplyScalar(s).applyQuaternion(_adsQ));
    } else { _adsQ.copy(_hipQ); _adsP.copy(_hipP); }
    const a = smooth(st.ads || 0);
    G.p.copy(_hipP).lerp(_adsP, a); G.q.copy(_hipQ).slerp(_adsQ, a); G.s = s;
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
    const mixRun = (v) => v[0] + (v[1] - v[0]) * S.run;
    const bk = S.bobW * (1 + (b.ads - 1) * a), br = VM.breathe, bth = Math.sin(S.time * Math.PI * 2 * br.rate) * (1 + (br.ads - 1) * a);
    const bs = Math.sin(S.bobPhase), bd = (Math.cos(2 * S.bobPhase) - 1) * 0.5;   // across (-1..1), down (0..-1)
    // the sprint (not down the sights): down, across toward the middle, back, and turned in; eased in and out
    const spWant = (st.sprint != null ? (st.sprint ? 1 : 0) : (S.run > 0.6 && speed > 9 ? 1 : 0)) * (st.grounded ? 1 : S.sprint > 0.5 ? 1 : 0) * (1 - a) * (st.reloadU != null ? 0.4 : 1);
    { const ps = info.tune.sprint || VM.sprint, tau = spWant > S.sprint ? ps.in : ps.out; S.sprint += (spWant - S.sprint) * (dt > 0 ? 1 - Math.exp(-dt / tau) : 0); }
    const spr = smooth(S.sprint), PS = info.tune.sprint || VM.sprint;   // CL-293: live tuning
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
    // raised from below
    const lo = 1 - smooth(S.raise);
    off.y -= 0.26 * lo; off.z += 0.06 * lo;
    rq.multiply(_eq.setFromAxisAngle(AX_X, -0.85 * lo));
    // turns about the grip, then the offset
    G.p.sub(pivot).applyQuaternion(rq).add(pivot).add(off);
    G.q.premultiply(rq);
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
      if (o.isMesh && s.material && !Array.isArray(s.material)) {
        const want = vmMaterial(s.material);
        if (o.material !== want) o.material = want;
        mirrorMaterial(s.material, o.material);
      }
    }
  }

  const _eR = [0, 0, 0], _eL = [0, 0, 0], _eA = [0, 0, 0];
  const _sh = V3(), _shm = M4(), VM_SHOULDER = [0.19, -0.24, 0.08];   // CL-293: his shoulder from the eye (as the eye sees it, his right)
  const _wm = M4(), _mf = F(), _mrel = F(), _wellF = F(), _localF = F(), _wiF = F(), _local2 = F(), _outF = F(), _gi = Q(), _psc = V3(), _mw = V3(), _rockQ = Q(), _rockPivot = V3(), _rockMoved = V3();
  function update(dt, st) {
    dt = Math.min(0.05, Math.max(0, dt || 0));
    frameDt = dt > 0 ? dt : 1 / 60;   // CL-305: the twist's rate limit
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
      if (S.raise > 0.02 && gun) S.raise = Math.max(0, S.raise - dt * VM.raise * 1.6);
      else { S.raise = 0; if (key) { syncArmMaterials(); buildGun(key, pair); } else if (!HN) dropGun(); }
    } else if (key) S.raise = Math.min(1, S.raise + dt * VM.raise);
    // CL-307: a blade swing (index.html st.blade) keeps the view on with the gun put away below it
    const BL = gun && st && st.blade && VM_BLADES[st.blade.kind] ? VM_BLADES[st.blade.kind] : null;
    if (BL) S.raise = Math.max(0, S.raise - dt * VM.raise * 2.5);
    const active = !!gun && (S.raise > 0.001 || !!BL || !!HN);
    info.active = active; info.key = gun ? gun.key : null; info.raise = S.raise; info.akimbo = !!gun2; info.blade = BL ? st.blade.kind : null;
    info.hands = HN ? st.hands.kind : null;
    // The world's scope mask owns the full sniper sight picture above 82% ADS.
    root.visible = active && !(gun && gun.key === 'sniper' && (st.ads || 0) >= 0.82);
    setEyeHide(active, active ? gun.src : null, active && gun2 ? gun2.src : null);
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
    if (gun.stock) gun.stock.visible = gun.key !== 'launcher' && (st.ads || 0) < 0.08;
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
    gun.root.visible = !BL && !HN; if (gun2) gun2.root.visible = !BL && !HN;   // CL-307: put away for the blade; CL-317: for the empty hands
    // The copied action cycles on a shot; the original gun keeps its third-person animation.
    S.slideT += dt;
    if (gun.slide && P.slideKick) { const t = S.slideT, k = t < 0.018 ? t / 0.018 : t < 0.075 ? 1 - (t - 0.018) / 0.057 : 0; gun.slide.position.z -= P.slideKick * k; }
    if (gun.work && gun.work !== gun.slide && P.workKick) { const t = S.slideT, k = t < 0.018 ? t / 0.018 : t < 0.075 ? 1 - (t - 0.018) / 0.057 : 0; gun.work.position.z -= P.workKick * k; }
    if (gun2) {   // CL-301: the left gun's action on its own shots
      S.slideT2 += dt; const t = S.slideT2, k = t < 0.018 ? t / 0.018 : t < 0.075 ? 1 - (t - 0.018) / 0.057 : 0;
      if (gun2.slide && P.slideKick) gun2.slide.position.z -= P.slideKick * k;
      if (gun2.work && gun2.work !== gun2.slide && P.workKick) gun2.work.position.z -= P.workKick * k;
    }
    // The reload's bolt/charging-handle pull follows the support hand after the magazine seats.
    { const Rr = reloadOf(P, st), rk = Rr && Rr.rack, ur = st.reloadU;
      if (gun.work && rk && ur != null) { const back = smooth((ur - rk[0]) / (rk[1] - rk[0])) * (1 - smooth((ur - rk[2]) / 0.03)); gun.work.position.z -= rk[3] * back; } }
    // the hands (CL-301: a pair has no support hand: the left holds the left gun as the right holds its own, and no
    // reload hands; both guns dip in gunFrame)
    const R = AK ? null : reloadOf(P, st);
    const u = R && st.reloadU != null ? clamp(st.reloadU, 0, 1) : null;
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
    let poseR = sockets.poseR;
    const boltW = (!AK && gun.bolt && (st.boltHand || 0) > 0.001) ? clamp(st.boltHand, 0, 1) : 0;
    if (boltW > 0) {
      gun.bolt.updateMatrix();
      // Live bolt part grab (moves with lift/pull). CL-306: the knob from the model (gb145Grab) and the hand's facing
      // by the handle's side (boltSide: +1 the gun's left, which the mirrored view shows on the right).
      const _bat = _pat, _bz = _pz, _by = _py, sud = gun.src.userData, bs = sud.boltSide || -1;
      if (sud.bolt && sud.bolt.userData && sud.bolt.userData.gb145Grab) _bat.copy(sud.bolt.userData.gb145Grab); else _bat.set(bs * 0.075, 0.012, 0.02);
      _bat.applyMatrix4(gun.bolt.matrix);
      _bz.set(bs * 0.8, 0.1, -0.6).normalize();
      _by.set(-bs * 0.6, -0.25, -0.76).addScaledVector(_bz, -_by.dot(_bz)).normalize();
      const _bx = _px.crossVectors(_by, _bz);
      const _bF = _local2; basisQ(_bx, _by, _bz, _bF.q); _bF.s = sockets.r.s;
      const palmR = wristSpacePoint(arms.r, 'palm', _ppalm).multiplyScalar(_bF.s).applyQuaternion(_bF.q);
      _bF.p.copy(_bat).sub(palmR);
      mul(G, _bF, _outF);
      // lerp wrist from grip to bolt
      WR.p.lerp(_outF.p, boltW);
      WR.q.slerp(_outF.q, boltW);
      if (FOL) follow(WR, eR);
      else if (REL) rel(WR, REL.r, eR);
      twistToward(arms.r, WR, eR);
      poseR = POSES.pinch || sockets.poseR;
      info.handPlace = 'bolt';
    }
    let poseL = sockets.poseL;
    // CL-293 (J54): a support hand's own fingers and thumb for a gun (VM_SOCKETS supportPose, a HAND_POSES-shaped pose: the
    // pistol's thumbs forward), or tried live (info.tune[key].poseL); the body's hold gives the rest.
    { const tp = (info.tune[gun.key] && info.tune[gun.key].poseL) || (VM_SOCKETS[gun.key] && VM_SOCKETS[gun.key].supportPose); if (tp) poseL = tp; }
    if (AK) {   // CL-301: the left hand on the left gun, the right hand's hold mirrored, the right hand's fingers
      mul(G2, mirrorSocket(SR, _localF), WL);
      if (AKB) { _akh[0] = WL.p.x - AKB[0] * MX; _akh[1] = WL.p.y + AKB[1]; _akh[2] = WL.p.z + AKB[2]; twistToward(arms.l, WL, _akh, VM.akimbo.twistMax, 'behind'); }
      if (AKF) followK(WL, eL); else rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = 'pair';
      poseL = sockets.poseR;
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
      if (FOL) follow(_foreWL, eL); else if (REL) rel(_foreWL, REL.l, eL);
    }
    else {
      mul(G, sockets.l, WL);
      // A shotgun's support hand stays on the moving forend through each pump stroke.
      if (gun.pump && gun.pumpBase) WL.p.add(_pg.copy(gun.pump.position).sub(gun.pumpBase).multiplyScalar(G.s).applyQuaternion(G.q));
      if (FOL) follow(WL, eL);
      else if (REL) rel(WL, REL.l, eL);
      twistToward(arms.l, WL, eL); info.handPlace = boltW > 0 ? 'bolt' : 'fore';
    }
    // (CL-306: the reload's elbow is set above, from the hold's wrist)
    const GRN = !AK && st.grenade && st.grenade.phase ? st.grenade : null;   // CL-307: the throw
    if (GRN) poseL = grenadeFrame(GRN, WL, eL, dt) || poseL;
    else if (grenadeC) grenadeC.root.visible = false;
    if (BL) { poseR = sockets.poseR; poseL = POSE_RELAXED; bladeFrame(BL, st.blade, WR, WL, eR, eL); }
    else if (blade) blade.root.visible = false;
    if (HN) { const hp = handsFrame(HN, st.hands, WR, WL, eR, eL, dt); poseR = hp.r; poseL = hp.l; }
    mirrorWorn(arms.r, 1); mirrorWorn(arms.l, -1);
    info.wrist.r = poseArm(arms.r, WR, eR, VM.wristMax);
    info.wrist.l = poseArm(arms.l, WL, eL, VM.wristMax);
    // CL-293 (Jerry, 3 Nov: "the arms looking weird and skinny", "elbow flared in the wrong direction"): the upper arm turns
    // at the elbow toward his shoulder (view space, as the eye sees it: 0.19 m out, 0.24 m down, a little behind the eye).
    for (const [a, sx] of [[arms.r, 1], [arms.l, -1]]) {
      if (!a.upper) continue;
      a.root.updateMatrix();
      _sh.set(VM_SHOULDER[0] * sx * MX, VM_SHOULDER[1], VM_SHOULDER[2]).applyMatrix4(_shm.copy(a.root.matrix).invert());
      const len = _sh.length();
      if (len > 1e-4) { a.upper.quaternion.setFromUnitVectors(AX_Y, _sh.multiplyScalar(1 / len)); a.upper.scale.set(1, Math.max(1, len / 0.34), 1); }
    }
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
        if (R.rock && gun.magFootLocal) {
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
    }
    if (gun2 && gun2.mag && gun2.magBase) { gun2.mag.position.copy(gun2.magBase.pos); gun2.mag.quaternion.copy(gun2.magBase.quat); gun2.mag.scale.copy(gun2.magBase.scale); gun2.mag.visible = true; }
    // The pump loads one shell per game reload cycle. Keep the loose shell in
    // the support palm until its port beat, then seat and hide it.
    if (gun.shell && gun.shellBase && R && R.kind === 'shell') {
      const inPalm = u != null && u >= 0.29 && u < 0.56;
      const atPort = u != null && u >= 0.56 && u < 0.74;
      gun.shell.visible = inPalm || atPort;
      if (inPalm) {
        const local = placeLocalOfWrist(_local2);
        gun.shell.position.copy(wristSpacePoint(arms.l, 'palm', _ppalm).multiplyScalar(local.s).applyQuaternion(local.q).add(local.p));
        gun.shell.quaternion.copy(local.q).multiply(gun.shellBase.quat);
      } else {
        gun.shell.position.copy(gun.shellBase.pos);
        gun.shell.quaternion.copy(gun.shellBase.quat);
      }
    }
    driveParts(R, u);
    place();
  }
  // CL-306: the reload's moving parts (GB-302: named on the gun, at rest unless the view moves them). The revolver's six
  // empties show in the open cylinder, slide out of its back at the ejector's press and are gone; its speedloader comes up in
  // the support palm from the pouch, goes onto the cylinder's back and is gone once the rounds are in. Everything in the
  // cylinder's own frame, so it rides the swing (the body's; GB-300 on the pair).
  const _cm = M4(), _cb = M4(), _cq = Q(), _cp = V3(), _cs = V3(), _lp = V3();
  function driveParts(R, u) {
    if (!R || gun2) return;   // the pair: the body's cylinders (GB-300); no hand is free for a loader
    if (gun.empties && gun.emptiesBase) {
      const E = gun.empties, win = R.empties;
      if (win && u != null && gun.cylinder && gun.magBase && u >= win.show && u < win.gone) {
        // the cylinder's frame now, over its frame at rest: the casings were built in the chambers at rest
        partMatrix(gun.cylinder, _cm); _cb.compose(gun.magBase.pos, gun.magBase.quat, gun.magBase.scale).invert();
        _cm.multiply(_cb).decompose(_cp, _cq, _cs);
        const k = smooth((u - win.out[0]) / (win.out[1] - win.out[0]));
        _lp.set(0, 0, -win.travel * k).applyQuaternion(_cq);   // out of the back (the cylinder's -z), muzzle up
        E.position.copy(_cp).add(_lp); E.quaternion.copy(_cq); E.visible = true;
        for (const c of E.children) c.visible = true;
      } else {
        E.position.copy(gun.emptiesBase.pos); E.quaternion.copy(gun.emptiesBase.quat); E.visible = false;
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
  const _pq2 = Q();
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
  const _grA = F(), _grB = F(), _grF = F(), _grS = F(), _grH = F(), _grQ = Q();
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
    eL[0] = WL.p.x - 0.12 * MX; eL[1] = WL.p.y - 0.30; eL[2] = WL.p.z + 0.16;
    twistToward(arms.l, WL, eL);
    info.handPlace = 'grenade';
    return inHand ? sockets.poseR : POSES.open;
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
    updateProjection(VM.fov + (VM.adsFov - VM.fov) * smooth(S.ads));
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
  // The world point the main camera shows where the view gun's muzzle is drawn, at the muzzle's own distance.
  function muzzleWorld(out, which = 1) {   // CL-301: which 2, the pair's left gun's (null without one)
    const g = which === 2 ? gun2 : gun;
    if (!g) return null;
    const mz = g.src.userData.muzzleLocal;
    if (!mz) return null;
    const v = viewPoint(mz, _mw, which);
    const k = Math.tan((camera.fov || 60) * Math.PI / 360) / Math.tan(proj.fov * Math.PI / 360);
    v.x *= k * MX; v.y *= k;
    camera.updateMatrixWorld();
    return out.copy(v).applyMatrix4(camera.matrixWorld);
  }
  function showing(key) { return info.active && !!gun && gun.key === key && S.raise > 0.5; }
  function dispose() {
    setEyeHide(false, null);
    dropGun();
    if (root.parent) root.parent.remove(root);
  }
  return {
    root, space, update, place, muzzleWorld, showing, viewPoint, ndc, dispose, info, retune: () => { sockets.key = null; },
    // CL-293: the view's turn for this shot's spring (radians: p up, y left); 0 unless the view gun is up.
    cameraPunch: (out = { p: 0, y: 0 }) => { const on = info.active && S.raise > 0.5; out.p = on ? cs.x[0] : 0; out.y = on ? cs.x[1] : 0; return out; },
    get gun() { return gun; }, get gun2() { return gun2; }, get frame2() { return G2; }, get arms() { return arms; }, get sockets() { return sockets; }, get frame() { return G; },
    get wrists() { return { r: WR, l: WL }; }, get proj() { return proj; }, get hidden() { return hidden; }, get filtering() { return filterOn; },
    isEyeHidden: (o) => hideOn && !!(o && o.userData && o.userData.vmEyeHide)
  };
}
