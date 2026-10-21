// studio/import-ual.mjs — brings the Quaternius Universal Animation Library (UAL 1 and 2, CC0)
// into the studio as reference motion (CL-59, D-40). It reads the packs' .glb files directly (no
// loader, no dependency), keeps the body's bones (no fingers) and the clips we use, samples them
// at 30 fps and writes one compact JSON the studio can play on a plain mannequin.
//
//   node studio/import-ual.mjs <folder with the unzipped packs>
//
// Jerry's copies: Desktop\Animation Assets\Universal Animation Library[Standard] (1).zip and
// Universal Animation Library 2[Standard].zip. We use the in-place versions (no "_RM").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets', 'anim', 'reference');
const SRC = process.argv[2];
if (!SRC) { console.error('usage: node studio/import-ual.mjs <folder with the unzipped UAL packs>'); process.exit(2); }

// The clips we keep, and what each is good for. Add a line to bring another in.
const WANT = {
  Idle_Loop: 'standing still: weight, breathing',
  Walk_Loop: 'a plain walk: contact, passing, stride timing',
  Jog_Fwd_Loop: 'a jog',
  Sprint_Loop: 'flat out: lean, arm drive, flight phase (the guardian\'s bound)',
  Crouch_Fwd_Loop: 'moving low',
  Roll: 'a dodge roll',
  Push_Loop: 'leaning into a heavy push, feet driving (the guardian\'s drag)',
  Walk_Carry_Loop: 'walking with a load held in front (the guardian\'s walk-out)',
  OverhandThrow: 'wind-up, throw and follow-through (the guardian\'s throw)',
  PickUp_Table: 'bending to take something',
  Punch_Cross: 'a committed strike: anticipation, hit, recovery',
  Zombie_Idle_Loop: 'a zombie standing',
  Zombie_Walk_Fwd_Loop: 'a zombie walking',
  Zombie_Scratch: 'a zombie clawing at something (the guardian\'s grab)',
  Hit_Knockback: 'taking a big hit and staggering back',
  Hit_Chest: 'a hit to the body',
  Hit_Head: 'a hit to the head',
  Death01: 'a death fall',
  LayToIdle: 'getting up off the ground',
  NinjaJump_Start: 'crouch and spring (the guardian\'s pounce)',
  NinjaJump_Land: 'landing heavy',
  ClimbUp_1m: 'hauling up onto a ledge',
  Slide_Start: 'dropping into a slide'
};
const FPS = 30;
const SKIP = /index|middle|pinky|ring|thumb|_leaf_/;

function readGlb(file) {
  const b = fs.readFileSync(file);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + jsonLen).toString('utf8'));
  const binStart = 20 + jsonLen + 8;
  const bin = b.subarray(binStart, binStart + b.readUInt32LE(20 + jsonLen));
  const acc = (i) => {
    const a = json.accessors[i], v = json.bufferViews[a.bufferView];
    const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
    if (a.componentType !== 5126) throw new Error('only float accessors are supported');
    const stride = (v.byteStride || n * 4), off = (v.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Float32Array(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = bin.readFloatLE(off + k * stride + c * 4);
    return { n, data: out };
  };
  return { json, acc };
}
const slerp = (a, b, t) => {
  let [ax, ay, az, aw] = a, [bx, by, bz, bw] = b;
  let d = ax * bx + ay * by + az * bz + aw * bw;
  if (d < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; d = -d; }
  if (d > 0.9995) { const r = [ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, aw + (bw - aw) * t]; const l = Math.hypot(...r); return r.map((x) => x / l); }
  const th = Math.acos(d), s = Math.sin(th), wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
  return [ax * wa + bx * wb, ay * wa + by * wb, az * wa + bz * wb, aw * wa + bw * wb];
};
function sampler(times, vals, n, t) {
  const T = times.data;
  if (t <= T[0]) return Array.from(vals.data.subarray(0, n));
  const last = T.length - 1;
  if (t >= T[last]) return Array.from(vals.data.subarray(last * n, last * n + n));
  let i = 1; while (T[i] < t) i++;
  const u = (t - T[i - 1]) / (T[i] - T[i - 1]);
  const a = Array.from(vals.data.subarray((i - 1) * n, i * n)), b = Array.from(vals.data.subarray(i * n, i * n + n));
  return n === 4 ? slerp(a, b, u) : a.map((x, k) => x + (b[k] - x) * u);
}
const r4 = (x) => Math.round(x * 10000) / 10000;

const packs = [];
for (const dir of fs.readdirSync(SRC)) {
  const g = path.join(SRC, dir, 'Unreal-Godot');
  if (!fs.existsSync(g)) continue;
  for (const f of fs.readdirSync(g)) if (/^UAL\d_Standard\.glb$/.test(f)) packs.push({ file: path.join(g, f), pack: f.slice(0, 4) });
}
if (!packs.length) { console.error('no UAL?_Standard.glb found under', SRC); process.exit(1); }

let skeleton = null;
const clips = {};
for (const { file, pack } of packs) {
  const { json, acc } = readGlb(file);
  const nodes = json.nodes, joints = json.skins[0].joints;
  const parentOf = new Map();
  nodes.forEach((n, i) => (n.children || []).forEach((c) => parentOf.set(c, i)));
  const keep = joints.filter((i) => !SKIP.test(nodes[i].name));
  if (!skeleton) {
    skeleton = keep.map((i) => ({
      name: nodes[i].name,
      parent: keep.indexOf(parentOf.get(i)),
      t: (nodes[i].translation || [0, 0, 0]).map(r4),
      r: (nodes[i].rotation || [0, 0, 0, 1]).map(r4)
    }));
  }
  const byName = new Map(keep.map((i) => [i, nodes[i].name]));
  for (const anim of json.animations) {
    if (!WANT[anim.name] || clips[anim.name]) continue;
    const ch = {};
    let length = 0;
    for (const c of anim.channels) {
      const bone = byName.get(c.target.node);
      if (!bone || (c.target.path !== 'rotation' && !(c.target.path === 'translation' && (bone === 'pelvis' || bone === 'root')))) continue;
      const s = anim.samplers[c.sampler];
      const times = acc(s.input), vals = acc(s.output);
      length = Math.max(length, times.data[times.data.length - 1]);
      (ch[bone] || (ch[bone] = {}))[c.target.path] = { times, vals };
    }
    const frames = Math.max(2, Math.round(length * FPS) + 1);
    const rot = {}, pos = {};
    for (const [bone, paths] of Object.entries(ch)) {
      for (const [p, { times, vals }] of Object.entries(paths)) {
        const flat = [];
        for (let f = 0; f < frames; f++) flat.push(...sampler(times, vals, vals.n, Math.min(length, f / FPS)).map(r4));
        // A channel that never moves is left out: the mannequin keeps its rest there.
        const n = vals.n, first = flat.slice(0, n);
        if (flat.every((x, k) => Math.abs(x - first[k % n]) < 2e-4)) continue;
        (p === 'rotation' ? rot : pos)[bone] = flat;
      }
    }
    clips[anim.name] = { pack, length: r4(length), loop: /_Loop$/.test(anim.name), frames, goodFor: WANT[anim.name], rot, pos };
  }
}
const missing = Object.keys(WANT).filter((n) => !clips[n]);
fs.mkdirSync(OUT, { recursive: true });
const data = { format: 'dw-ref/1', source: 'Quaternius, Universal Animation Library 1 and 2 (CC0 1.0)', fps: FPS, skeleton, clips };
fs.writeFileSync(path.join(OUT, 'ual.json'), JSON.stringify(data));
const catalogue = Object.entries(clips).map(([name, c]) => ({ name, pack: c.pack, length: c.length, loop: c.loop, goodFor: c.goodFor }));
fs.writeFileSync(path.join(OUT, 'catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');
fs.writeFileSync(path.join(OUT, 'LICENSE.txt'), `The reference animations in ual.json come from the Universal Animation Library 1 and 2
by Quaternius (https://quaternius.com), released under CC0 1.0 Universal (public domain):
https://creativecommons.org/publicdomain/zero/1.0/

Kept here: the body's bones (no fingers) and the clips listed in catalogue.json, sampled at
${FPS} fps by studio/import-ual.mjs. Credit is not required; we give it anyway.
`);
console.log(`ual.json: ${Object.keys(clips).length} clips, ${skeleton.length} bones, ${(fs.statSync(path.join(OUT, 'ual.json')).size / 1024).toFixed(0)} KB`);
if (missing.length) console.log('not found in the packs:', missing.join(', '));
