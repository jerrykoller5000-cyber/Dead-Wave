// studio/model-look.js — how the studio looks at a model (docs/drafts/modellab.md). Claude's (studio/*).
//
// The views of a contact sheet and how each is framed, the 1.75 m scale figure, the game's three
// lights (day, night, and night vision), the parts list and the highlight on one part, joint labels
// that don't sit on each other, what changed between two versions of a model file, and the note the
// lab sends to the review folder (contract 5). The model lab (studio/model-lab.html), its sheet mode
// and studio/render-sheet.mjs all use it. It needs no browser, so Node tests it (model-look.test.mjs).
//
// Nothing here is random: the same model gives the same sheet on Jerry's PC and in the cloud.
import * as THREE from 'three';
import { buildModel, modelAsset } from './model.js';

// --- The views -----------------------------------------------------------------------------------------
// The six views of a sheet, in the order the sheet lays them out: three across, two down. Front, side,
// back and top are orthographic and share one scale, so a size reads straight off them against the
// ruler, and front, side and back stand on one ground line. The three-quarter views are in perspective,
// the way an eye sees it. `dir` points from the model to the camera, in the model's frame (+Z forward,
// +Y up; "L" is the -X side, docs/drafts/model.md), so the side view looks at its R side.
export const SHEET_VIEWS = [
  { key: 'front', label: 'front', dir: [0, 0, 1], ortho: true },
  { key: 'side', label: 'side (its R, +X)', dir: [1, 0, 0], ortho: true },
  { key: 'back', label: 'back', dir: [0, 0, -1], ortho: true },
  { key: 'top', label: 'top (its front down)', dir: [0, 1, 0], ortho: true, up: [0, 0, -1] },
  { key: 'three-front', label: 'three-quarter, front', dir: [1, 0.55, 1.25], ortho: false },
  { key: 'three-back', label: 'three-quarter, back', dir: [-1, 0.55, -1.25], ortho: false }
];
export const VIEW = Object.fromEntries(SHEET_VIEWS.map((v) => [v.key, v]));

// The game's play camera (index.html: FOV_DEFAULT 60, CAM_R_DEFAULT 12, CAM_ELEV_DEFAULT 0.8 rad),
// for the sheet's "in the game" tile: the model as big as the player sees it on a 1280 × 720 screen.
export const PLAY_CAMERA = { fov: 60, distance: 12, elevation: 0.8, screen: [1280, 720] };

const _v = new THREE.Vector3();
// A camera's axes for a view: z points back at the camera (three.js lookAt), x to the right of the
// picture, y up it. A view straight down uses its own `up` (the top view puts the model's front at the
// bottom of the picture, as a plan does under an elevation).
export function viewBasis(view) {
  const z = new THREE.Vector3(...view.dir).normalize();
  const up = new THREE.Vector3(...(view.up || [0, 1, 0]));
  if (Math.abs(z.dot(up)) > 0.999) up.set(0, 0, -1);
  const x = new THREE.Vector3().crossVectors(up, z).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return { x, y, z };
}
const corners = (box) => {
  const out = [];
  for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
  return out;
};
// How far a box reaches along a view's picture axes: { x: [lo, hi], y: [lo, hi], z: [lo, hi] }, metres.
export function viewExtent(box, view) {
  const b = viewBasis(view), out = { x: [Infinity, -Infinity], y: [Infinity, -Infinity], z: [Infinity, -Infinity] };
  for (const c of corners(box)) {
    for (const k of ['x', 'y', 'z']) {
      const d = c.dot(b[k]);
      out[k][0] = Math.min(out[k][0], d); out[k][1] = Math.max(out[k][1], d);
    }
  }
  return out;
}

// Metres per pixel that fits every orthographic view of `boxes` (one box per view key, or one for all)
// into a w × h tile with `pad` of the tile left clear round it. The sheet uses the biggest for all four,
// so they share a scale.
export function orthoScale(boxes, views, w, h, pad = 0.08) {
  let mpp = 0;
  for (const v of views) {
    if (!v.ortho) continue;
    const e = viewExtent(boxes[v.key] || boxes.all, v);
    mpp = Math.max(mpp, (e.x[1] - e.x[0]) / (w * (1 - 2 * pad)), (e.y[1] - e.y[0]) / (h * (1 - 2 * pad)));
  }
  return mpp || 0.01;
}

// Points an orthographic camera at a box from a view, `mpp` metres to a pixel, the box in the middle.
// Returns the camera's frame so a caller can draw a ruler: { mpp, x0, y0 } where x0, y0 is the
// picture's left and top edge along the view's axes.
export function fitOrtho(cam, box, view, w, h, mpp) {
  const b = viewBasis(view), e = viewExtent(box, view);
  const cx = (e.x[0] + e.x[1]) / 2, cy = (e.y[0] + e.y[1]) / 2, depth = e.z[1] - e.z[0];
  const hw = (mpp * w) / 2, hh = (mpp * h) / 2;
  Object.assign(cam, { left: -hw, right: hw, top: hh, bottom: -hh, near: 0.01, far: depth + 20, zoom: 1 });
  // The camera sits 10 m in front of the box's near face, looking along -z.
  const at = new THREE.Vector3().addScaledVector(b.x, cx).addScaledVector(b.y, cy).addScaledVector(b.z, e.z[1] + 10);
  cam.position.copy(at);
  cam.up.copy(b.y);
  cam.lookAt(_v.copy(at).addScaledVector(b.z, -1));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return { mpp, x0: cx - hw, y0: cy + hh, basis: b };
}

// Points a perspective camera at a box from a view so all of it is in the picture with `pad` clear
// round it (of the half-picture), and the box's picture is centred. Returns the camera's distance.
export function fitPerspective(cam, box, view, aspect, pad = 0.08) {
  const b = viewBasis(view);
  const ty = Math.tan((cam.fov * Math.PI) / 360) * (1 - pad), tx = ty * aspect;
  const target = box.getCenter(new THREE.Vector3());
  const pts = corners(box);
  let dist = 1;
  // Twice: fit the distance, then move the target so the picture of the box is centred, then fit again.
  for (let pass = 0; pass < 3; pass++) {
    dist = 0;
    for (const p of pts) {
      const q = _v.copy(p).sub(target);
      const cx = q.dot(b.x), cy = q.dot(b.y), cz = q.dot(b.z);
      dist = Math.max(dist, cz + Math.abs(cx) / tx, cz + Math.abs(cy) / ty);
    }
    if (pass === 2) break;
    let lx = Infinity, hx = -Infinity, ly = Infinity, hy = -Infinity;
    for (const p of pts) {
      const q = _v.copy(p).sub(target);
      const d = dist - q.dot(b.z);
      const sx = q.dot(b.x) / d, sy = q.dot(b.y) / d;
      lx = Math.min(lx, sx); hx = Math.max(hx, sx); ly = Math.min(ly, sy); hy = Math.max(hy, sy);
    }
    target.addScaledVector(b.x, ((lx + hx) / 2) * dist).addScaledVector(b.y, ((ly + hy) / 2) * dist);
  }
  cam.aspect = aspect;
  cam.near = Math.max(0.01, dist / 200);
  cam.far = dist * 10 + 50;
  cam.position.copy(target).addScaledVector(b.z, dist);
  cam.up.copy(b.y);
  cam.lookAt(target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return dist;
}

// Where the scale figure stands for a view: on the picture's left of the model, `gap` metres clear
// of it, level with its middle in depth, on the ground, so it never hides behind the model or in front
// of it. [x, 0, z] in the model's frame.
export const FIGURE_HALF_WIDTH = 0.3;
export function figureSpot(box, view, gap = 0.35) {
  const b = viewBasis(view.dir[1] > 0.99 ? view : { ...view, dir: [view.dir[0], 0, view.dir[2]] });
  // The figure stands upright, so only the picture's horizontal matters; for the top view that is x.
  const r = new THREE.Vector3(b.x.x, 0, b.x.z).normalize();
  const c = box.getCenter(new THREE.Vector3()).setY(0);
  let lo = Infinity;
  for (const p of corners(box)) lo = Math.min(lo, p.dot(r));
  const t = lo - gap - FIGURE_HALF_WIDTH - c.dot(r);
  return [c.x + r.x * t, 0, c.z + r.z * t];
}

// --- The scale figure --------------------------------------------------------------------------------
// A plain person exactly 1.75 m tall, facing +Z like every rig, built by the same buildModel as the
// models it stands beside. Its feet and nose point the way it faces. (The studio's marine stand-in is
// 1.56 m to the top of his cap, and the game's marine about 1.62 m, so neither is the 1.75 m mark.)
export const FIGURE_HEIGHT = 1.75;
export const SCALE_FIGURE = {
  format: 'dw-model/1', name: 'scale-figure', kind: 'prop', version: 1, owner: 'claude',
  notes: 'A plain person exactly 1.75 m tall, to judge a model\'s size by. Not a game model.',
  materials: { body: { color: '#98a2b4', roughness: 0.85 }, dark: { color: '#687286', roughness: 0.85 } },
  parts: [
    { name: 'legL', shape: 'capsule', size: [0.07, 0.74], at: [-0.1, 0.44, 0], mirror: 'x', material: 'dark' },
    { name: 'footL', shape: 'rbox', size: [0.11, 0.07, 0.26], at: [-0.1, 0.035, 0.05], mirror: 'x', material: 'dark' },
    { name: 'hips', shape: 'rbox', size: [0.34, 0.2, 0.21], at: [0, 0.88, 0], material: 'dark' },
    { name: 'torso', shape: 'rbox', size: [0.4, 0.56, 0.23], at: [0, 1.22, 0], material: 'body' },
    { name: 'neck', shape: 'cylinder', size: [0.05, 0.1], segments: 8, at: [0, 1.52, 0], material: 'body' },
    { name: 'head', shape: 'sphere', size: [0.11], segments: [14, 10], at: [0, 1.64, 0], material: 'body' },
    { name: 'nose', shape: 'box', size: [0.03, 0.04, 0.04], at: [0, 1.63, 0.115], material: 'dark' },
    { name: 'armL', shape: 'capsule', size: [0.05, 0.56], at: [-0.255, 1.16, 0], rot: [0, 0, -3], mirror: 'x', material: 'body' }
  ],
  budget: { draws: 2, triangles: 4000 },
  merge: 'color'
};
export function buildFigure() {
  const f = buildModel(SCALE_FIGURE);
  f.group.name = 'scale figure (1.75 m)';
  f.group.userData.figure = true;
  for (const m of f.meshes) { m.userData.model = null; m.userData.figure = true; }
  return f;
}

// --- Light -----------------------------------------------------------------------------------------------
// The game's light (index.html: the sky's day and night, updateNvgVisual), so a model is judged in the
// light it will be seen in. Full day; full night with the goggles up; and night with them down, where
// the game also greens its canvas with a CSS filter and darkens the edges.
export const NVG_FILTER = 'grayscale(1) brightness(1.5) contrast(1.14) sepia(.1) hue-rotate(92deg) saturate(.38)';
export const LIGHTS = {
  day: { label: 'Day', bg: 0x2a3140, hemi: [0xddeeff, 0x445566, 0.68], key: [0xfffaf5, 1.73], ambient: [0x223344, 0.04], filter: '' },
  night: { label: 'Night', bg: 0x020508, hemi: [0xddeeff, 0x445566, 0.15], key: [0x8899cc, 0.4], ambient: [0x223344, 0.06], filter: '' },
  nvg: { label: 'Night vision', bg: 0x111b22, hemi: [0xddeeff, 0x445566, 0.62], key: [0x8899cc, 0.82], ambient: [0x223344, 0.22], filter: NVG_FILTER }
};
// Sets a scene's lights to one of LIGHTS. `rig` is { hemi, key, ambient } (three.js lights).
export function applyLight(mode, scene, rig) {
  const L = LIGHTS[mode] || LIGHTS.day;
  scene.background = new THREE.Color(L.bg);
  rig.hemi.color.setHex(L.hemi[0]); rig.hemi.groundColor.setHex(L.hemi[1]); rig.hemi.intensity = L.hemi[2];
  rig.key.color.setHex(L.key[0]); rig.key.intensity = L.key[1];
  rig.ambient.color.setHex(L.ambient[0]); rig.ambient.intensity = L.ambient[1];
  return L;
}
// The goggles' dark edges (index.html #nvgOverlay), drawn over a picture of w × h.
export function drawNvgEdges(ctx, x, y, w, h) {
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.hypot(w, h) * 0.55);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(10,17,22,0.16)');
  g.addColorStop(1, 'rgba(0,3,6,0.94)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

// --- Size ---------------------------------------------------------------------------------------------
const mm = (v) => Math.round(v * 1000) / 1000;
// A model's reach at rest, metres to the millimetre: { min, max, size } (size is width x, height y, depth z).
export function modelBounds(object) {
  object.updateWorldMatrix(true, true);
  const b = new THREE.Box3().setFromObject(object);
  if (b.isEmpty()) return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] };
  return { min: b.min.toArray().map(mm), max: b.max.toArray().map(mm), size: b.getSize(new THREE.Vector3()).toArray().map(mm) };
}
export const sizeText = (bounds) => `${bounds.size.map((v) => v.toFixed(2)).join(' × ')} m (w × h × d)`;

// Tick marks for a ruler over [lo, hi] metres at `mpp` metres a pixel: a tick every `step`, a label on
// every `label`th, so labels stay at least ~40 px apart.
export function rulerTicks(lo, hi, mpp) {
  const steps = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10];
  const step = steps.find((s) => s / mpp >= 14) || 10;
  const label = steps.find((s) => s >= step && s / mpp >= 40 && Math.abs(s / step - Math.round(s / step)) < 1e-9) || step * 4;
  const out = [];
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
    const v = +(k * step).toFixed(3);
    out.push({ v, major: Math.abs(v / label - Math.round(v / label)) < 1e-6 });
  }
  return { step, label, ticks: out };
}

// --- Labels ----------------------------------------------------------------------------------------------
// Joint names beside their dots without sitting on each other. Each label tries eight places round its
// point, nearest first; one that fits nowhere is left out (shown: false) and its dot stays. `measure`
// gives a text's width in pixels. Deterministic: the same points give the same labels.
export function placeLabels(items, { w, h, measure, lineH = 13, gap = 5 }) {
  const placed = [];
  const tries = (tw) => [[gap, -gap - lineH], [gap, gap], [-gap - tw, -gap - lineH], [-gap - tw, gap], [-tw / 2, -gap * 2 - lineH], [-tw / 2, gap * 2], [gap * 3, -lineH / 2], [-gap * 3 - tw, -lineH / 2]];
  const hits = (r) => placed.some((p) => r.x < p.x + p.w && p.x < r.x + r.w && r.y < p.y + p.h && p.y < r.y + r.h);
  // Left to right, top to bottom, so the order doesn't depend on how the joints were listed.
  const order = items.map((it, i) => i).sort((a, b) => items[a].y - items[b].y || items[a].x - items[b].x || (items[a].text < items[b].text ? -1 : 1));
  const out = new Array(items.length);
  for (const i of order) {
    const it = items[i], tw = measure(it.text);
    let got = null;
    for (const [dx, dy] of tries(tw)) {
      const r = { x: it.x + dx, y: it.y + dy, w: tw, h: lineH };
      if (r.x < 2 || r.y < 2 || r.x + r.w > w - 2 || r.y + r.h > h - 2 || hits(r)) continue;
      got = r;
      break;
    }
    if (got) placed.push(got);
    out[i] = { ...it, shown: !!got, lx: got ? got.x : null, ly: got ? got.y : null };
  }
  return out;
}

// --- Parts -----------------------------------------------------------------------------------------------
// A model built twice: as the game builds it (merged) and one mesh per part (to count each part's
// triangles and to draw one part on its own). Kept per JSON object, so a page asks as often as it likes.
const BUILDS = new WeakMap();
function builds(json) {
  let b = BUILDS.get(json);
  if (!b) { b = { merged: buildModel(json), single: buildModel({ ...json, merge: false }) }; BUILDS.set(json, b); }
  return b;
}
const triCount = (g) => Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
// One row per part in the file, in its order: what it is, where it hangs, how many copies it draws
// (array × mirror), their triangles, and which mesh the game draws it in (merged parts share one).
export function partRows(json) {
  const { merged, single } = builds(json);
  const rows = json.parts.map((p, i) => ({
    i, name: p.name || `part ${i}`, shape: p.shape, joint: p.joint || null, material: p.material, limb: p.limb || null,
    copies: 0, triangles: 0, drawn: [], meshes: [], merge: p.merge !== false, note: p.note || ''
  }));
  for (const s of single.parts) {
    const r = rows[s.src];
    r.copies++;
    r.triangles += triCount(s.mesh.geometry);
    if (s.name && !r.drawn.includes(s.name)) r.drawn.push(s.name);
  }
  for (const m of merged.parts) {
    const r = rows[m.src], name = m.mesh.name || r.name;
    if (!r.meshes.includes(name)) r.meshes.push(name);
  }
  // How many parts share each mesh, so a row can say "drawn with 11 others".
  const share = new Map();
  for (const m of merged.parts) share.set(m.mesh, (share.get(m.mesh) || new Set()).add(m.src));
  for (const r of rows) {
    const others = new Set();
    for (const m of merged.parts) if (m.src === r.i) for (const s of share.get(m.mesh)) if (s !== r.i) others.add(s);
    r.sharedWith = others.size;
  }
  return rows;
}

// Meshes that draw one part (every copy of it), every part of one material, or every part ({ all: true }),
// over the model. They hang on the same joints as the part, so they move with a clip or a reaction.
// `joints` is the shown model's { name: Group }, `root` the group parts without a joint hang on;
// `material` is one material, or a function of the part ({ src, name, material, ... }) giving one.
// Returns the meshes; take them off with mesh.removeFromParent().
export function partOverlay(json, joints, root, which, material) {
  const { single } = builds(json);
  const out = [];
  for (const s of single.parts) {
    if (which.src !== undefined && s.src !== which.src) continue;
    if (which.material !== undefined && s.material !== which.material) continue;
    const parent = s.joint ? joints[s.joint] : root;
    if (!parent) continue;
    const m = new THREE.Mesh(s.mesh.geometry, typeof material === 'function' ? material(s) : material);
    m.position.copy(s.mesh.position); m.quaternion.copy(s.mesh.quaternion); m.scale.copy(s.mesh.scale);
    m.renderOrder = 30;
    m.userData.overlay = true;
    m.userData.src = s.src;
    m.userData.limb = s.limb;
    m.name = 'highlight:' + (s.name || s.src);
    parent.add(m);
    out.push(m);
  }
  return out;
}

// The parts map: each part of the file its own colour, the same every time, so neighbours differ (the
// golden-angle walk round the hue circle) and "part 12" is the same colour on every sheet.
export function partColor(i) {
  return new THREE.Color().setHSL((i * 0.381966) % 1, 0.62, i % 2 ? 0.5 : 0.62);
}
export const partHex = (i) => '#' + partColor(i).getHexString();

// Which part of the file a ray hits first: { src, name, point, distance }, or null. A merged mesh can't
// say which of its parts was clicked, so the ray is tried on each part's own mesh, posed where the
// shown model's joints are now (a clip or a reaction may have moved them). Skipped: `hidden` limbs.
export function partAt(json, joints, root, raycaster, hidden = new Set()) {
  const { single } = builds(json);
  let best = null;
  for (const s of single.parts) {
    const parent = s.joint ? joints[s.joint] : root;
    if (!parent || (s.limb && hidden.has(s.limb))) continue;
    parent.updateWorldMatrix(true, false);
    s.mesh.updateMatrix();
    s.mesh.matrixWorld.multiplyMatrices(parent.matrixWorld, s.mesh.matrix);
    const hit = raycaster.intersectObject(s.mesh, false)[0];
    if (hit && (!best || hit.distance < best.distance)) best = { src: s.src, name: s.name || `part ${s.src}`, point: hit.point.toArray(), distance: hit.distance };
  }
  return best;
}

// --- Checks an agent can't do by eye --------------------------------------------------------------------
// What a model looks like it gets wrong, in numbers, at rest: whether its parts hang together as one
// piece (a part that touches nothing floats; a gap between two halves shows in a close view), and what
// is under the ground (a model that floats, one with a "waterline" joint, is let off). Parts are
// compared by their boxes in the model's frame, so a turned part counts as a little bigger than it is:
// the check errs toward "touching". `touch` is how close counts as touching, in metres: by default 1.2%
// of the model's biggest size (2 cm on a man, 7 cm on the boat), and never under 1 cm, so the small
// gaps a blocky figure is built with (an arm held off the body) pass and a gap that shows doesn't.
const gapBetween = (a, b) => Math.hypot(
  Math.max(0, a.min.x - b.max.x, b.min.x - a.max.x),
  Math.max(0, a.min.y - b.max.y, b.min.y - a.max.y),
  Math.max(0, a.min.z - b.max.z, b.min.z - a.max.z));
export function modelChecks(json, opts = {}) {
  const { single } = builds(json);
  single.group.updateMatrixWorld(true);
  const parts = single.parts.map((p) => ({ name: p.name || `part ${p.src}`, src: p.src, box: new THREE.Box3().setFromObject(p.mesh, true) }));
  const all = new THREE.Box3();
  for (const p of parts) all.union(p.box);
  const s = all.getSize(new THREE.Vector3());
  const touch = opts.touch ?? +Math.max(0.01, 0.012 * Math.max(s.x, s.y, s.z)).toFixed(3);
  // Pieces: parts joined by touching, as a union-find over every pair.
  const up = parts.map((_, i) => i);
  const find = (i) => (up[i] === i ? i : (up[i] = find(up[i])));
  for (let i = 0; i < parts.length; i++) for (let k = i + 1; k < parts.length; k++) if (gapBetween(parts[i].box, parts[k].box) <= touch) up[find(i)] = find(k);
  const groups = new Map();
  parts.forEach((p, i) => { const r = find(i); (groups.get(r) || groups.set(r, []).get(r)).push(p); });
  const size = (g) => g.reduce((s, p) => { const v = p.box.getSize(_v); return s + v.x * v.y * v.z; }, 0);
  const pieces = [...groups.values()].sort((a, b) => size(b) - size(a));
  // Each piece but the biggest: how far it is from the rest, and between which two parts.
  const gaps = pieces.slice(1).map((g) => {
    let best = null;
    for (const p of g) for (const q of parts) {
      if (g.includes(q)) continue;
      const d = gapBetween(p.box, q.box);
      if (!best || d < best.metres) best = { metres: +d.toFixed(3), between: [p.name, q.name] };
    }
    // Names once each; a part only some of whose copies float says how many ("1 of the 7 spine").
    const names = [...new Set(g.map((p) => p.name))].map((n) => {
      const here = g.filter((p) => p.name === n).length, of = parts.filter((p) => p.name === n).length;
      return here < of ? `${here} of the ${of} ${n}` : n;
    });
    return { parts: names, items: g.length, ...best };
  });
  const floats = json.joints && json.joints.waterline;
  const under = floats ? [] : parts.filter((p) => p.box.min.y < -touch);
  const depth = under.length ? +(-Math.min(...under.map((p) => p.box.min.y))).toFixed(3) : 0;
  return {
    pieces: pieces.length, gaps, touch,
    underGround: under.length ? { metres: depth, parts: [...new Set(under.map((p) => p.name))] } : null
  };
}
// The checks as short sentences, for the sheet's header and the lab's panel.
export function checkSentences(c) {
  const out = [];
  for (const g of c.gaps) {
    const who = g.parts.length > 3 ? g.parts.slice(0, 3).join('; ') + ` and ${g.parts.length - 3} more` : g.parts.join('; ');
    out.push(`${who} ${g.items > 1 ? 'float' : 'floats'} ${g.metres} m off the rest (${g.between[0]} to ${g.between[1]})`);
  }
  if (c.underGround) out.push(`${c.underGround.metres} m under the ground: ${c.underGround.parts.slice(0, 4).join(', ')}${c.underGround.parts.length > 4 ? ' and more' : ''}`);
  return out;
}

// --- What changed between two versions of a file -----------------------------------------------------------
const short = (v) => {
  const s = JSON.stringify(v);
  return s === undefined ? 'nothing' : s.length > 60 ? s.slice(0, 57) + '...' : s;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Keyed by name: joints and materials are already; parts by their name, or "part i" when they have none.
const byName = (parts) => {
  const m = new Map();
  (parts || []).forEach((p, i) => { let k = p.name || `part ${i}`; while (m.has(k)) k += "'"; m.set(k, p); });
  return m;
};
function diffMap(what, a, b, out) {
  const A = a instanceof Map ? a : new Map(Object.entries(a || {})), B = b instanceof Map ? b : new Map(Object.entries(b || {}));
  const added = [...B.keys()].filter((k) => !A.has(k)), removed = [...A.keys()].filter((k) => !B.has(k));
  if (added.length) out.push(`${what} added: ${added.join(', ')}`);
  if (removed.length) out.push(`${what} removed: ${removed.join(', ')}`);
  for (const [k, v] of A) {
    if (!B.has(k) || same(v, B.get(k))) continue;
    const w = B.get(k);
    if (v && w && typeof v === 'object' && typeof w === 'object' && !Array.isArray(v)) {
      const keys = [...new Set([...Object.keys(v), ...Object.keys(w)])].filter((f) => !same(v[f], w[f]));
      out.push(`${what.replace(/s$/, '')} ${k}: ${keys.map((f) => `${f} ${short(v[f])} → ${short(w[f])}`).join('; ')}`);
    } else out.push(`${what.replace(/s$/, '')} ${k}: ${short(v)} → ${short(w)}`);
  }
}
// Sentences saying what changed from model file `a` to `b`: fields, materials, joints, parts, limbs.
export function modelDiff(a, b) {
  const out = [];
  const skip = new Set(['materials', 'joints', 'parts', 'chains', 'notes']);
  for (const k of [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])]) {
    if (skip.has(k) || same(a[k], b[k])) continue;
    out.push(`${k}: ${short(a[k])} → ${short(b[k])}`);
  }
  diffMap('materials', a.materials, b.materials, out);
  diffMap('joints', a.joints, b.joints, out);
  diffMap('chains', a.chains, b.chains, out);
  diffMap('parts', byName(a.parts), byName(b.parts), out);
  if (!same(a.notes, b.notes)) out.push('notes: rewritten');
  return out;
}

// --- The note (contract 5) -------------------------------------------------------------------------------
// The review folder a model's notes go to, as the notes endpoint wants it named.
export const ASSET_NAME = /^[a-z0-9][a-z0-9-]{1,63}$/;
// What the lab POSTs to /__studio/note: { asset, text, context, snapshot?, meta }. `meta` makes the
// folder the first time (the endpoint ignores it once meta.json is there): the model's kind, its
// "kind/name", the agent who answers, the version Jerry is looking at, its file, and where to look.
export function modelNote({ json, ref, text, context = '', snapshot = null, asset = null, file = null, look = null }) {
  const name = asset || modelAsset(json);
  if (!ASSET_NAME.test(name)) throw new Error(`"${name}" is not a review folder name (a-z, 0-9 and "-", 2 to 64 of them)`);
  const version = Number.isInteger(json.version) && json.version >= 1 ? json.version : 1;
  return {
    asset: name, text, context,
    ...(snapshot ? { snapshot } : {}),
    meta: {
      kind: 'model', ref, owner: json.owner || 'claude', version,
      file: file || `studio/models/${ref}.json`,
      look: look || `studio/model-lab.html?model=${ref}${asset ? '&asset=' + asset : ''}`
    }
  };
}
// The same note as a block to paste at the top of notes.md, when there's no endpoint to take it.
export function noteBlock({ version, text, context, day }) {
  const clean = String(text).replace(/\r\n?/g, '\n').replace(/^[ \t#>]+/gm, '').trim();
  return `## ${day} · Jerry · v${version} · lab\n${clean}\n${context ? `(In the model lab: ${context.replace(/\s*\n\s*/g, ' ')})\n` : ''}`;
}

// --- The lab's state in its address ----------------------------------------------------------------------
// Everything that decides what the lab shows, so an address repeats a view exactly: Jerry's note carries
// it, and `node studio/render-sheet.mjs --look "<it>"` draws the same picture for an agent.
export const LIGHT_MODES = Object.keys(LIGHTS);
export const FIGURES = ['figure', 'marine', 'none'];
export function readLabQuery(q) {
  const get = (k) => (q.get(k) === null ? null : q.get(k));
  const flag = (k, dflt) => (get(k) === null ? dflt : get(k) !== '0' && get(k) !== 'false');
  const cam = (get('cam') || '').split(',').map(Number);
  const at = (get('at') || '').split(',').map(Number);
  return {
    model: get('model'), file: get('file'), asset: get('asset'), clip: get('clip'),
    light: LIGHT_MODES.includes(get('light')) ? get('light') : 'day',
    figure: FIGURES.includes(get('figure')) ? get('figure') : 'figure',
    wire: flag('wire', false), joints: flag('joints', false), names: flag('names', false), spin: flag('spin', false), colors: flag('colors', false),
    grid: flag('grid', true), view: VIEW[get('view')] ? get('view') : null,
    part: get('part') !== null && /^\d+$/.test(get('part')) ? +get('part') : null,
    cam: cam.length === 3 && cam.every(Number.isFinite) ? { yaw: cam[0], pitch: cam[1], dist: cam[2] } : null,
    at: at.length === 3 && at.every(Number.isFinite) ? at : null
  };
}
export function labQuery(s) {
  const q = new URLSearchParams();
  if (s.file) q.set('file', s.file); else if (s.model) q.set('model', s.model);
  if (s.asset) q.set('asset', s.asset);
  if (s.clip) q.set('clip', s.clip);
  if (s.light && s.light !== 'day') q.set('light', s.light);
  if (s.figure && s.figure !== 'figure') q.set('figure', s.figure);
  for (const k of ['wire', 'joints', 'names', 'spin', 'colors']) if (s[k]) q.set(k, '1');
  if (s.grid === false) q.set('grid', '0');
  if (s.view) q.set('view', s.view);
  if (s.part !== null && s.part !== undefined) q.set('part', String(s.part));
  if (s.cam && !s.view) q.set('cam', [s.cam.yaw, s.cam.pitch, s.cam.dist].map((v) => +v.toFixed(3)).join(','));
  if (s.at && !s.view) q.set('at', s.at.map((v) => +v.toFixed(3)).join(','));
  return q.toString().replace(/%2F/g, '/').replace(/%2C/g, ',');
}
