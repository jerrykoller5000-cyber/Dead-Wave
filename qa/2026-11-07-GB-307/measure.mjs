// GB-307: measure pistol tris + bbox vs low_poly_glock-19.glb (reference ONLY).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as THREE from '../../vendor/three/three.core.js';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { weaponModelContext } = await import(pathToFileURL(path.join(ROOT, 'tools/marine-inspector.js')).href);
const { makePistolModel } = await import(pathToFileURL(path.join(ROOT, 'studio/weapon-sidearms.js')).href);
const { floatingParts } = await import(pathToFileURL(path.join(ROOT, 'studio/gun-detail.js')).href);

const MARINE_UPM = 1.655 / 1.80;
const pistolSize = { len: 0.431, m: 0.195, look: 1.45 };
const sizeK = pistolSize.m * pistolSize.look * MARINE_UPM / pistolSize.len;

const ctx = weaponModelContext();
const gun = makePistolModel(ctx);
gun.scale.setScalar(sizeK);
gun.updateMatrixWorld(true);

let tris = 0, meshes = 0;
gun.traverse((o) => {
  if (!o.isMesh || !o.geometry) return;
  meshes++;
  const idx = o.geometry.index;
  const pos = o.geometry.attributes.position;
  tris += idx ? (idx.count / 3) : (pos.count / 3);
});
const box = new THREE.Box3().setFromObject(gun);
const size = box.getSize(new THREE.Vector3());
const floats = floatingParts(THREE, gun);
const mats = new Set();
gun.traverse((o) => { if (o.isMesh && o.material) mats.add(o.material.uuid); });

const out = {
  sizeK,
  tris: Math.round(tris),
  meshes,
  materials: mats.size,
  bbox: { x: +size.x.toFixed(4), y: +size.y.toFixed(4), z: +size.z.toFixed(4) },
  lengthZ: +size.z.toFixed(4),
  heightY: +size.y.toFixed(4),
  widthX: +size.x.toFixed(4),
  floating: floats.map((o) => ({ name: o.name || '', parent: o.parent && o.parent.name, pos: o.position.toArray().map((v)=>+v.toFixed(4)) })).slice(0, 40),
  floatingCount: floats.length,
  hasSlide: !!gun.userData.slide,
  hasMag: !!gun.userData.mag,
};
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-07-GB-307/before-metrics.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));

function parseGlb(filePath) {
  const rawBuf = fs.readFileSync(filePath);
  const buf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let json = null, o = 12;
  while (o + 8 <= u8.length) {
    const len = dv.getUint32(o, true);
    const type = dv.getUint32(o + 4, true);
    const chunk = u8.slice(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    o += 8 + len;
  }
  let tris = 0;
  for (const m of (json.meshes || [])) for (const p of (m.primitives || [])) {
    if (p.indices != null) tris += json.accessors[p.indices].count / 3;
    else tris += json.accessors[p.attributes.POSITION].count / 3;
  }
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of (json.meshes || [])) for (const p of (m.primitives || [])) {
    const a = json.accessors[p.attributes.POSITION];
    if (a.min) for (let i = 0; i < 3; i++) min[i] = Math.min(min[i], a.min[i]);
    if (a.max) for (let i = 0; i < 3; i++) max[i] = Math.max(max[i], a.max[i]);
  }
  const raw = [max[0]-min[0], max[1]-min[1], max[2]-min[2]];
  const longest = Math.max(...raw);
  const real = 0.195;
  const s = real / longest;
  return {
    file: path.basename(filePath),
    rawTris: Math.round(tris),
    rawSize: raw.map((v) => +v.toFixed(4)),
    scaledToRealM: raw.map((v) => +(v * s).toFixed(4)),
    scale: +s.toFixed(6),
  };
}
const ref = parseGlb(path.join(ROOT, 'Claude outputs/refs/models/low_poly_glock-19.glb'));
fs.writeFileSync(path.join(ROOT, 'qa/2026-11-07-GB-307/ref-metrics.json'), JSON.stringify(ref, null, 2));
console.log('REF', JSON.stringify(ref, null, 2));
