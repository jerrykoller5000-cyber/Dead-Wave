// studio/model-look.test.mjs — how the studio looks at a model (docs/drafts/modellab.md). Real three.js
// maths in Node, no browser:
//   node --import ./studio/node-three.mjs --test studio/model-look.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { validateModel, buildModel, modelAsset } from './model.js';
import { models } from './models/index.js';
import { parseNotes } from '../crew/notes.mjs';
import {
  SHEET_VIEWS, VIEW, viewBasis, viewExtent, orthoScale, fitOrtho, fitPerspective, figureSpot, SCALE_FIGURE, buildFigure,
  FIGURE_HEIGHT, LIGHTS, NVG_FILTER, modelBounds, rulerTicks, placeLabels, partRows, partOverlay, partAt, modelDiff,
  modelNote, noteBlock, readLabQuery, labQuery, ASSET_NAME, partColor, partHex, modelChecks, checkSentences
} from './model-look.js';

const project = (p, cam) => new THREE.Vector3(...p).project(cam);
const corners = (b) => [...Array(8)].map((_, i) => [i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z]);
// The model and the figure where a view stands it, as the sheet frames them.
function stage(json, view) {
  const m = buildModel(json);
  const box = new THREE.Box3().setFromObject(m.group);
  const f = buildFigure();
  f.group.position.set(...figureSpot(box, view));
  f.group.updateMatrixWorld(true);
  const all = box.clone().union(new THREE.Box3().setFromObject(f.group));
  all.min.y = Math.min(all.min.y, 0);
  return { m, box, fbox: new THREE.Box3().setFromObject(f.group), all };
}

test('the sheet has six views: four straight, two in perspective, in the order it lays them out', () => {
  assert.deepEqual(SHEET_VIEWS.map((v) => v.key), ['front', 'side', 'back', 'top', 'three-front', 'three-back']);
  assert.deepEqual(SHEET_VIEWS.filter((v) => v.ortho).map((v) => v.key), ['front', 'side', 'back', 'top']);
  // Each view's axes are square, and the camera looks back along its dir.
  for (const v of SHEET_VIEWS) {
    const b = viewBasis(v);
    assert.ok(Math.abs(b.x.dot(b.y)) < 1e-9 && Math.abs(b.y.dot(b.z)) < 1e-9 && Math.abs(b.x.dot(b.z)) < 1e-9, v.key);
    assert.ok(b.z.dot(new THREE.Vector3(...v.dir).normalize()) > 0.999, v.key);
  }
  // The top view puts the model's front (+Z) at the bottom of the picture, as a plan does.
  assert.ok(viewBasis(VIEW.top).y.z < -0.99);
  // The side view looks at the R side (+X), so its front is on the left of the picture.
  assert.ok(viewBasis(VIEW.side).x.z < -0.99);
});

test('the scale figure is a valid model exactly 1.75 m tall, facing +Z, in one draw', () => {
  assert.deepEqual(validateModel(SCALE_FIGURE), []);
  const f = buildFigure();
  const b = modelBounds(f.group);
  assert.equal(FIGURE_HEIGHT, 1.75);
  assert.ok(Math.abs(b.max[1] - 1.75) < 0.001 && Math.abs(b.min[1]) < 0.001, `it stands from ${b.min[1]} to ${b.max[1]} m`);
  assert.equal(f.cost.draws, 1);
  const nose = SCALE_FIGURE.parts.find((p) => p.name === 'nose');
  assert.ok(nose.at[2] > 0.1, 'the nose points the way it faces');
});

test('every model fits every view of its sheet, the elevations on one ground line and one scale', () => {
  const TW = 532, TH = 400;
  for (const ref of models.names()) {
    const json = models.json(ref);
    const boxes = {}, st = {};
    for (const v of SHEET_VIEWS) { st[v.key] = stage(json, v); boxes[v.key] = st[v.key].all; }
    const elev = SHEET_VIEWS.filter((v) => v.ortho && v.dir[1] === 0);
    const mpp = orthoScale(boxes, elev, TW, TH, 0.09);
    const grounds = [];
    for (const v of elev) {
      const cam = new THREE.OrthographicCamera();
      fitOrtho(cam, boxes[v.key], v, TW, TH, mpp);
      for (const c of corners(boxes[v.key])) {
        const p = project(c, cam);
        assert.ok(Math.abs(p.x) <= 0.99 && Math.abs(p.y) <= 0.99, `${ref} ${v.key}: a corner at ${p.x.toFixed(3)}, ${p.y.toFixed(3)}`);
      }
      grounds.push(project([0, 0, 0], cam).y);
      // The figure stands clear of the model in the picture.
      const m = viewExtent(st[v.key].box, v), f = viewExtent(st[v.key].fbox, v);
      assert.ok(f.x[1] < m.x[0] || f.x[0] > m.x[1], `${ref} ${v.key}: the figure overlaps the model`);
    }
    assert.ok(Math.max(...grounds) - Math.min(...grounds) < 1e-9, `${ref}: the ground line moves between elevations (${grounds})`);
    for (const v of SHEET_VIEWS.filter((x) => !x.ortho)) {
      const cam = new THREE.PerspectiveCamera(34, TW / TH, 0.05, 400);
      fitPerspective(cam, boxes[v.key], v, TW / TH, 0.1);
      let lx = 1, hx = -1, ly = 1, hy = -1;
      for (const c of corners(boxes[v.key])) {
        const p = project(c, cam);
        assert.ok(Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z < 1, `${ref} ${v.key}: a corner at ${p.x.toFixed(3)}, ${p.y.toFixed(3)}`);
        lx = Math.min(lx, p.x); hx = Math.max(hx, p.x); ly = Math.min(ly, p.y); hy = Math.max(hy, p.y);
      }
      assert.ok(Math.abs(lx + hx) < 0.05 && Math.abs(ly + hy) < 0.05, `${ref} ${v.key}: off centre (${lx}, ${hx}, ${ly}, ${hy})`);
      assert.ok(hx - lx > 1.6 || hy - ly > 1.6, `${ref} ${v.key}: it fills too little of the picture`);
    }
  }
});

test('the light is the game\'s: its night-vision filter is the one on the game\'s canvas', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const m = /canvas\.nvg-phosphor\s*\{\s*filter:\s*([^;]+);/.exec(html);
  assert.ok(m, 'index.html has a canvas.nvg-phosphor filter');
  assert.equal(NVG_FILTER, m[1].trim());
  assert.equal(LIGHTS.nvg.filter, NVG_FILTER);
  assert.ok(LIGHTS.night.hemi[2] < LIGHTS.nvg.hemi[2] && LIGHTS.nvg.hemi[2] < LIGHTS.day.hemi[2]);
  // The game's own numbers (index.html: hemi 0.18 + 0.5 by day, 0.15 at night, at least 0.62 with the goggles).
  assert.equal(LIGHTS.day.hemi[2], 0.68);
  assert.equal(LIGHTS.night.hemi[2], 0.15);
  assert.equal(LIGHTS.nvg.hemi[2], 0.62);
});

test('a ruler ticks at least 14 px apart and names a round number at least 40 px apart', () => {
  for (const mpp of [0.001, 0.004, 0.0064, 0.016, 0.05, 0.2]) {
    const r = rulerTicks(-0.3, 3, mpp);
    assert.ok(r.step / mpp >= 14, `${mpp}: ticks ${r.step / mpp} px apart`);
    assert.ok(r.label / mpp >= 40, `${mpp}: labels ${r.label / mpp} px apart`);
    assert.ok(r.ticks.some((t) => t.v === 0 && t.major), `${mpp}: 0 m is named`);
    assert.ok(Math.abs(r.label / r.step - Math.round(r.label / r.step)) < 1e-9, `${mpp}: a label every whole number of ticks`);
  }
});

test('joint labels never sit on each other, stay in the picture, and come out the same every time', () => {
  const items = [];
  for (let i = 0; i < 40; i++) items.push({ text: 'joint' + i, x: 200 + (i % 7) * 9, y: 150 + Math.floor(i / 7) * 6 });
  const measure = (t) => t.length * 7;
  const a = placeLabels(items, { w: 400, h: 300, measure, lineH: 12 });
  const b = placeLabels(items, { w: 400, h: 300, measure, lineH: 12 });
  assert.deepEqual(a, b);
  const shown = a.filter((l) => l.shown);
  assert.ok(shown.length > 5 && shown.length < 40, `${shown.length} shown`);
  for (let i = 0; i < shown.length; i++) {
    const p = shown[i], pw = measure(p.text);
    assert.ok(p.lx >= 2 && p.ly >= 2 && p.lx + pw <= 398 && p.ly + 12 <= 298);
    for (let k = i + 1; k < shown.length; k++) {
      const q = shown[k], qw = measure(q.text);
      assert.ok(!(p.lx < q.lx + qw && q.lx < p.lx + pw && p.ly < q.ly + 12 && q.ly < p.ly + 12), `${p.text} and ${q.text} overlap`);
    }
  }
});

test('the parts list counts every copy and its triangles, and says which mesh draws it', () => {
  for (const ref of models.names()) {
    const json = models.json(ref), m = buildModel(json), single = buildModel({ ...json, merge: false });
    const rows = partRows(json);
    assert.equal(rows.length, json.parts.length, ref);
    assert.equal(rows.reduce((s, r) => s + r.copies, 0), m.parts.length, `${ref}: copies`);
    assert.equal(rows.reduce((s, r) => s + r.triangles, 0), single.cost.triangles, `${ref}: triangles`);
    for (const r of rows) {
      assert.ok(r.meshes.length >= 1, `${ref} ${r.name}: no mesh`);
      if (json.merge === false || json.parts[r.i].merge === false) assert.equal(r.sharedWith, 0, `${ref} ${r.name} draws alone`);
    }
  }
  // The drum's paint and band share a mesh: merge "color".
  const drum = partRows(models.json('prop/fuel-drum'));
  const band = drum.find((r) => r.name === 'band');
  assert.ok(band.sharedWith >= 1 && band.meshes[0] === drum.find((r) => r.name === 'drum').meshes[0]);
});

test('a picked part lights up every copy of it where the model draws it, and follows its joint', () => {
  const json = models.json('creature/spider');
  const m = buildModel(json), single = buildModel({ ...json, merge: false });
  const rows = partRows(json);
  const r = rows.find((x) => x.copies >= 4);
  const mat = new THREE.MeshBasicMaterial();
  const over = partOverlay(json, m.joints, m.group, { src: r.i }, mat);
  assert.equal(over.length, r.copies);
  m.group.updateMatrixWorld(true); single.group.updateMatrixWorld(true);
  const own = single.parts.filter((p) => p.src === r.i).map((p) => new THREE.Box3().setFromObject(p.mesh));
  for (const o of over) {
    const b = new THREE.Box3().setFromObject(o);
    assert.ok(own.some((x) => x.min.distanceTo(b.min) < 1e-6 && x.max.distanceTo(b.max) < 1e-6), `${o.name} is not where the part is`);
  }
  // Turn the joint one copy hangs on: its highlight turns with it.
  const hung = over.find((o) => o.parent !== m.group);
  if (hung) {
    const before = new THREE.Box3().setFromObject(hung).getCenter(new THREE.Vector3());
    hung.parent.rotation.x += 0.8; m.group.updateMatrixWorld(true);
    const after = new THREE.Box3().setFromObject(hung).getCenter(new THREE.Vector3());
    assert.ok(before.distanceTo(after) > 1e-3, 'the highlight stayed put');
  }
  for (const o of over) o.removeFromParent();
  // Every part of one material.
  const flesh = partOverlay(json, m.joints, m.group, { material: 'flesh' }, mat);
  assert.equal(flesh.length, rows.filter((x) => x.material === 'flesh').reduce((s, x) => s + x.copies, 0));
});

test('the parts map gives every part its own colour, the same every time, neighbours unlike', () => {
  const seen = new Set();
  for (let i = 0; i < 64; i++) {
    const a = partColor(i), b = partColor(i + 1);
    assert.equal(partHex(i), '#' + partColor(i).getHexString(), 'the same colour every time');
    const d = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
    assert.ok(d > 0.12, `parts ${i} and ${i + 1} look alike (${partHex(i)}, ${partHex(i + 1)})`);
    seen.add(partHex(i));
  }
  assert.equal(seen.size, 64);
  // Every drawn copy, each with the part it draws, coloured by a function of the part.
  const json = models.json('prop/evac-boat'), m = buildModel(json);
  const all = partOverlay(json, m.joints, m.group, {}, (p) => new THREE.MeshBasicMaterial({ color: partColor(p.src) }));
  assert.equal(all.length, m.parts.length);
  for (const o of all) assert.equal('#' + o.material.color.getHexString(), partHex(o.userData.src));
  assert.deepEqual([...new Set(all.map((o) => o.userData.src))].sort((a, b) => a - b), json.parts.map((p, i) => i));
});

test('a click on the model finds the part of the file under it, even inside a merged mesh', () => {
  // The drum draws its hoops, cap and skull stencil as one mesh; a ray at the stencil finds the stencil.
  const json = models.json('prop/fuel-drum'), m = buildModel(json);
  const rows = partRows(json);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, 0.5, 5), new THREE.Vector3(0, 0, -1));
  const hit = partAt(json, m.joints, m.group, ray);
  assert.equal(rows[hit.src].name, 'skull');
  // Just above the band, the paint.
  ray.set(new THREE.Vector3(0, 0.7, 5), new THREE.Vector3(0, 0, -1));
  assert.equal(rows[partAt(json, m.joints, m.group, ray).src].name, 'drum');
  // A limb taken off can't be clicked.
  const z = models.json('creature/zombie'), zm = buildModel(z), zr = partRows(z);
  zm.group.updateMatrixWorld(true);
  const head = new THREE.Box3().setFromObject(zm.joints.head).getCenter(new THREE.Vector3());
  const r2 = new THREE.Raycaster(new THREE.Vector3(head.x, head.y, 5), new THREE.Vector3(0, 0, -1));
  assert.equal(zr[partAt(z, zm.joints, zm.group, r2).src].name, 'head');
  const without = partAt(z, zm.joints, zm.group, r2, new Set(['head']));
  assert.ok(!without || zr[without.src].name !== 'head');
});

test('the checks: pieces that don\'t touch, and what is under the ground', () => {
  const box = (name, at, size = [0.2, 0.2, 0.2]) => ({ name, shape: 'box', size, at, material: 'a' });
  const t = (parts, extra = {}) => ({ format: 'dw-model/1', name: 't', kind: 'prop', materials: { a: { color: '#aa3322' } }, parts, budget: { draws: 64, triangles: 20000 }, ...extra });
  // Two boxes a metre high: one piece when they touch, two with a 0.1 m gap between them.
  assert.deepEqual(checkSentences(modelChecks(t([box('base', [0, 0.1, 0]), box('lid', [0, 0.3, 0])]))), []);
  const apart = modelChecks(t([box('base', [0, 0.1, 0]), box('lid', [0, 0.4, 0])]));
  assert.equal(apart.pieces, 2);
  assert.deepEqual([apart.gaps[0].parts, apart.gaps[0].metres, apart.gaps[0].between], [['lid'], 0.1, ['lid', 'base']]);
  assert.match(checkSentences(apart)[0], /^lid floats 0\.1 m off the rest \(lid to base\)$/);
  // Some copies of an array float: it says how many.
  const arr = modelChecks(t([box('slab', [0, 0.1, 0], [1, 0.2, 0.2]), { ...box('peg', [-0.4, 0.25, 0], [0.05, 0.1, 0.05]), array: { count: 3, step: [0.4, 0.1, 0] } }]));
  // (the first peg stands on the slab; the other two float apart, each a piece of its own)
  assert.deepEqual(checkSentences(arr).map((x) => x.slice(0, 25)), ['1 of the 3 peg floats 0.1', '1 of the 3 peg floats 0.2']);
  // Under the ground, unless it floats on water.
  const sunk = modelChecks(t([box('base', [0, 0.05, 0])]));
  assert.deepEqual(sunk.underGround, { metres: 0.05, parts: ['base'] });
  assert.equal(modelChecks(t([box('hull', [0, 0.05, 0])], { joints: { waterline: { at: [0, 0.1, 0] } } })).underGround, null);
  // The models on disk: the drum, the boat and the spider hang together; the zombie shows the game's own
  // 5 cm gap at the waist and its feet under the ground (P-73).
  for (const ref of ['prop/fuel-drum', 'prop/evac-boat', 'creature/spider']) assert.deepEqual(checkSentences(modelChecks(models.json(ref))), [], ref);
  const z = modelChecks(models.json('creature/zombie'));
  assert.equal(z.pieces, 2);
  assert.deepEqual([z.gaps[0].metres, z.gaps[0].between], [0.05, ['pelvis', 'torso']]);
  assert.equal(z.underGround.metres, 0.26);
});

test('what changed between two versions of a model file, in sentences', () => {
  const a = models.json('prop/fuel-drum'), b = JSON.parse(JSON.stringify(a));
  assert.deepEqual(modelDiff(a, b), []);
  b.version = 2;
  b.materials.iron.color = '#000000';
  b.parts[0].size = [0.4, 0.95];
  b.parts = b.parts.filter((p) => p.name !== 'bung');
  b.parts.push({ name: 'dent', shape: 'box', size: [0.1, 0.1, 0.02], material: 'paint' });
  b.budget = { draws: 2, triangles: 420 };
  b.notes += ' More.';
  const d = modelDiff(a, b);
  for (const want of ['version: 1 → 2', 'budget:', 'material iron: color "#3a2a26" → "#000000"', 'parts added: dent', 'parts removed: bung', 'part drum: size [0.36,0.95] → [0.4,0.95]', 'notes: rewritten']) {
    assert.ok(d.some((s) => s.startsWith(want)), `no "${want}" in ${JSON.stringify(d)}`);
  }
});

test('the note the lab sends is contract 5\'s, and its copy reads as Jerry\'s note', () => {
  const json = models.json('creature/spider');
  const n = modelNote({ json, ref: 'creature/spider', text: 'Longer legs.', context: 'day; front', snapshot: 'data:image/png;base64,iVBORw0KGgo=' });
  assert.equal(n.asset, modelAsset(json));
  assert.match(n.asset, ASSET_NAME);
  assert.deepEqual(n.meta, { kind: 'model', ref: 'creature/spider', owner: 'claude', version: json.version, file: 'studio/models/creature/spider.json', look: 'studio/model-lab.html?model=creature/spider' });
  assert.equal(n.snapshot.slice(0, 22), 'data:image/png;base64,');
  assert.ok(!('snapshot' in modelNote({ json, ref: 'creature/spider', text: 'x' })), 'no picture, no snapshot field');
  const named = modelNote({ json, ref: 'creature/spider', text: 'x', asset: 'spider-six' });
  assert.equal(named.asset, 'spider-six');
  assert.equal(named.meta.look, 'studio/model-lab.html?model=creature/spider&asset=spider-six');
  assert.throws(() => modelNote({ json, ref: 'creature/spider', text: 'x', asset: '../x' }), /review folder name/);
  // Pasted under the stub, crew/notes.mjs reads it as a note from Jerry on v1, waiting.
  const block = noteBlock({ version: 1, text: '## sneaky heading\nLonger legs.', context: 'day; front', day: '2026-09-26' });
  const notes = parseNotes('# Notes\n\n<!-- stub -->\n\n' + block);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].version, 'v1');
  assert.equal(notes[0].state, 'waiting');
  assert.ok(notes[0].text.includes('Longer legs.') && notes[0].text.includes('(In the model lab: day; front)'));
});

test('the lab\'s address holds everything it shows, and reads back the same', () => {
  const s = { model: 'creature/spider', light: 'nvg', wire: true, joints: true, names: false, spin: false, grid: false, figure: 'marine', part: 7, view: null, cam: { yaw: 0.7, pitch: 0.35, dist: 6 }, at: [0, 0.5, 0.25], clip: 'spider/idle' };
  const q = labQuery(s);
  assert.equal(q, 'model=creature/spider&clip=spider/idle&light=nvg&figure=marine&wire=1&joints=1&grid=0&part=7&cam=0.7,0.35,6&at=0,0.5,0.25');
  const r = readLabQuery(new URLSearchParams(q));
  for (const k of ['model', 'light', 'wire', 'joints', 'names', 'spin', 'grid', 'figure', 'part', 'cam', 'at', 'clip']) assert.deepEqual(r[k], s[k], k);
  // A named view stands for the camera; defaults stay out of the address.
  assert.equal(labQuery({ model: 'prop/fuel-drum', light: 'day', figure: 'figure', grid: true, view: 'top', cam: { yaw: 1, pitch: 1, dist: 1 }, at: [0, 0, 0], part: null }), 'model=prop/fuel-drum&view=top');
  const d = readLabQuery(new URLSearchParams('model=x&light=purple&view=nowhere&part=-1'));
  assert.equal(d.light, 'day'); assert.equal(d.view, null); assert.equal(d.part, null); assert.equal(d.grid, true);
});
