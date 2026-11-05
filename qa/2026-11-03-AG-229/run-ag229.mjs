import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import * as THREE from './../../vendor/three/three.core.js';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa', '2026-11-03-AG-229');
const STILLS_DIR = path.join(OUT_DIR, 'stills');
fs.mkdirSync(STILLS_DIR, { recursive: true });

const GUN_IDS = [
  'minigun',
  'm4',
  'ak',
  'uzi',
  'shotgun',
  'aa12',
  'revolver',
  'sniper',
  'launcher',
  'chainsaw',
];

function readAccessor(doc, bin, index) {
  const acc = doc.accessors[index];
  const bv = doc.bufferViews[acc.bufferView];
  const start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const ncomp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
  const stride = bv.byteStride || compSize * ncomp;
  const out = new Float32Array(acc.count * ncomp);
  const dv = new DataView(bin);
  for (let i = 0; i < acc.count; i++) {
    const o = start + i * stride;
    for (let c = 0; c < ncomp; c++) {
      let v = 0;
      if (acc.componentType === 5126) v = dv.getFloat32(o + c * 4, true);
      else if (acc.componentType === 5123) v = dv.getUint16(o + c * 2, true);
      else if (acc.componentType === 5125) v = dv.getUint32(o + c * 4, true);
      else if (acc.componentType === 5121) v = dv.getUint8(o + c);
      else if (acc.componentType === 5122) v = dv.getInt16(o + c * 2, true);
      else if (acc.componentType === 5120) v = dv.getInt8(o + c);
      out[i * ncomp + c] = v;
    }
  }
  return out;
}

function nodeMatrix(n) {
  const m = new THREE.Matrix4();
  if (n.matrix) m.fromArray(n.matrix);
  else {
    const t = n.translation || [0, 0, 0];
    const r = n.rotation || [0, 0, 0, 1];
    const s = n.scale || [1, 1, 1];
    m.compose(
      new THREE.Vector3(t[0], t[1], t[2]),
      new THREE.Quaternion(r[0], r[1], r[2], r[3]),
      new THREE.Vector3(s[0], s[1], s[2])
    );
  }
  return m;
}

function parseGlbStats(filePath, realLen) {
  const rawBuf = fs.readFileSync(filePath);
  const buf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let json = null, bin = null, binShort = false, o = 12;
  while (o + 8 <= u8.length) {
    const len = dv.getUint32(o, true);
    const type = dv.getUint32(o + 4, true);
    const chunk = u8.slice(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk));
    else if (type === 0x004e4942) {
      const have = Math.max(0, Math.min(len, u8.length - (o + 8)));
      const declared = json && json.buffers && json.buffers[0] ? (json.buffers[0].byteLength || 0) : 0;
      const need = Math.max(have, declared);
      const padded = new Uint8Array(need);
      padded.set(u8.subarray(o + 8, o + 8 + have));
      bin = padded.buffer;
      binShort = have < need;
    }
    o += 8 + len;
  }
  const group = new THREE.Group();
  const doc = json;
  const nodes = doc.nodes || [];
  const world = nodes.map(() => new THREE.Matrix4());
  const kids = nodes.map(() => []);
  nodes.forEach((n, i) => (n.children || []).forEach((c) => kids[i].push(c)));
  const roots = new Set(nodes.map((_, i) => i));
  kids.forEach((list) => list.forEach((c) => roots.delete(c)));
  const sceneNodes = (doc.scenes && doc.scenes[doc.scene || 0] && doc.scenes[doc.scene || 0].nodes) || [...roots];
  function walk(i, parent) {
    world[i].multiplyMatrices(parent, nodeMatrix(nodes[i] || {}));
    for (const c of kids[i]) walk(c, world[i]);
  }
  for (const r of sceneNodes) walk(r, new THREE.Matrix4());
  const mat = new THREE.MeshBasicMaterial();
  let meshCount = 0;
  let triCount = 0;
  nodes.forEach((n, i) => {
    if (n.mesh == null) return;
    const mesh = doc.meshes[n.mesh];
    for (const prim of mesh.primitives || []) {
      if (prim.mode != null && prim.mode !== 4) continue;
      if (prim.attributes.POSITION == null) continue;
      const pos = readAccessor(doc, bin, prim.attributes.POSITION);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      if (prim.indices != null) {
        const idx = readAccessor(doc, bin, prim.indices);
        const acc = doc.accessors[prim.indices];
        const Arr = acc.componentType === 5125 ? Uint32Array : Uint16Array;
        geo.setIndex(new THREE.BufferAttribute(new Arr(idx), 1));
        triCount += idx.length / 3;
      } else {
        triCount += (pos.length / 3) / 3;
      }
      const m = new THREE.Mesh(geo, mat);
      m.applyMatrix4(world[i]);
      group.add(m);
      meshCount++;
    }
  });
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const s = box.getSize(new THREE.Vector3());
  const axes = [['x', s.x], ['y', s.y], ['z', s.z]].sort((a, b) => b[1] - a[1]);
  if (axes[0][0] === 'x') group.rotateY(Math.PI / 2);
  else if (axes[0][0] === 'y') group.rotateX(-Math.PI / 2);
  group.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(group);
  const s2 = box2.getSize(new THREE.Vector3());
  if (s2.x > s2.y) group.rotateZ(Math.PI / 2);
  group.updateMatrixWorld(true);
  const raw = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  const longest = Math.max(raw.x, raw.y, raw.z) || 1;
  group.scale.setScalar(realLen / longest);
  group.updateMatrixWorld(true);
  const finalBox = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  return {
    meshCount,
    triCount: Math.round(triCount),
    binShort,
    refBox: {
      x: Number(finalBox.x.toFixed(3)),
      y: Number(finalBox.y.toFixed(3)),
      z: Number(finalBox.z.toFixed(3)),
    },
  };
}

async function screenshotJpg(page, file, quality = 92) {
  const res = await page.send('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, Buffer.from(res.data, 'base64'));
  return file;
}

async function main() {
  const server = await serve(ROOT, 0);
  console.log(`Started local static server on ${server.origin}`);

  const browser = await launch({
    headless: false,
    args: ['--window-size=1920,1080'],
  });

  try {
    const page = await browser.newPage({ width: 1920, height: 1080 });
    const pageErrors = [];
    page.conn.onEvent((msg) => {
      if (msg.sessionId !== page.sessionId) return;
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails || {};
        pageErrors.push(String(d.exception?.description || d.text || 'unknown error'));
      }
    });

    console.log(`Navigating to ${server.origin}/tools/refview/index.html`);
    await page.goto(`${server.origin}/tools/refview/index.html`);
    const ready = await page.waitFor("!!(window.refview && window.refview.gun === 'minigun')", { timeout: 35000 });
    if (!ready) {
      throw new Error('tools/refview never initialized window.refview for minigun');
    }

    const results = {};

    for (const id of GUN_IDS) {
      console.log(`Evaluating gun ${id}...`);
      await page.evaluate(`(() => {
        const sel = document.getElementById('gun');
        sel.value = ${JSON.stringify(id)};
        sel.dispatchEvent(new Event('change'));
      })()`);

      await page.waitFor(`!!(window.refview && window.refview.gun === ${JSON.stringify(id)})`, { timeout: 35000 });
      await page.evaluate(`new Promise((r) => {
        let count = 0;
        function f() { if (++count > 16) r(); else requestAnimationFrame(f); }
        requestAnimationFrame(f);
      })`);

      const info = await page.evaluate(`(() => {
        const err = document.getElementById('err')?.textContent || '';
        const readout = document.getElementById('readout')?.textContent || '';
        return {
          gun: window.refview?.gun,
          real: window.refview?.real,
          lines: window.refview?.lines,
          ours: window.refview?.ours,
          ref: window.refview?.ref,
          err,
          readout,
        };
      })()`);

      // Capture Side view
      await page.evaluate(`document.getElementById('side').click()`);
      await page.evaluate(`new Promise((r) => {
        let count = 0;
        function f() { if (++count > 12) r(); else requestAnimationFrame(f); }
        requestAnimationFrame(f);
      })`);
      const sidePath = path.join(STILLS_DIR, `${id}-side.jpg`);
      await screenshotJpg(page, sidePath, 92);

      // Capture Top view
      await page.evaluate(`document.getElementById('top').click()`);
      await page.evaluate(`new Promise((r) => {
        let count = 0;
        function f() { if (++count > 12) r(); else requestAnimationFrame(f); }
        requestAnimationFrame(f);
      })`);
      const topPath = path.join(STILLS_DIR, `${id}-top.jpg`);
      await screenshotJpg(page, topPath, 92);

      // Capture Orbit view
      await page.evaluate(`document.getElementById('reset').click()`);
      await page.evaluate(`new Promise((r) => {
        let count = 0;
        function f() { if (++count > 12) r(); else requestAnimationFrame(f); }
        requestAnimationFrame(f);
      })`);
      const orbitPath = path.join(STILLS_DIR, `${id}-orbit.jpg`);
      await screenshotJpg(page, orbitPath, 92);

      // Parse oursBox from lines
      const oursBoxLine = (info.lines || []).find((l) => l.startsWith('oursBox ')) || 'oursBox 0 0 0';
      const [ox, oy, oz] = oursBoxLine.replace('oursBox ', '').split(' ').map(Number);

      const glbFiles = {
        minigun: 'm134_handheld_minigun.glb',
        m4: 'm4_sopmod.glb',
        ak: 'ak-47.glb',
        uzi: 'uzi.glb',
        shotgun: 'shotgun.glb',
        aa12: 'aa12.glb',
        revolver: '38_special_revolver.glb',
        sniper: 'sniper.glb',
        launcher: 'naders_grenade_launcher.glb',
        chainsaw: 'chainsaw.glb',
      };
      const glbStats = parseGlbStats(path.join(ROOT, 'Claude outputs', 'refs', 'models', glbFiles[id]), info.real);

      results[id] = {
        gun: id,
        glbFile: glbFiles[id],
        realTargetLength: info.real,
        ours: {
          ...info.ours,
          box: { x: ox, y: oy, z: oz },
        },
        ref: {
          ...info.ref,
          box: glbStats.refBox,
          meshCount: glbStats.meshCount,
          triCount: glbStats.triCount,
          binShort: glbStats.binShort,
        },
        deltas: {
          lengthPct: Number((((ox && oz ? oz : info.ours.length) - glbStats.refBox.z) / glbStats.refBox.z * 100).toFixed(1)),
          heightPct: Number(((oy - glbStats.refBox.y) / glbStats.refBox.y * 100).toFixed(1)),
          widthPct: Number(((ox - glbStats.refBox.x) / glbStats.refBox.x * 100).toFixed(1)),
          boreOverGripDeltaM: Number(((info.ours?.boreOverGrip || 0) - (info.ref?.boreOverGrip || 0)).toFixed(3)),
          gripRakeDeltaDeg: Number(((info.ours?.rakeDeg || 0) - (info.ref?.rakeDeg || 0)).toFixed(1)),
          sightHeightDeltaM: Number(((info.ours?.sightH || 0) - (info.ref?.sightH || 0)).toFixed(3)),
        },
        err: info.err,
        lines: info.lines,
      };
      console.log(`Captured ${id}: oursBox=${ox}x${oy}x${oz}m vs refBox=${glbStats.refBox.x}x${glbStats.refBox.y}x${glbStats.refBox.z}m`);
    }

    fs.writeFileSync(
      path.join(OUT_DIR, 'metrics.json'),
      JSON.stringify({ pageErrors, results }, null, 2),
      'utf8'
    );
    console.log(`Saved metrics.json (${Object.keys(results).length} guns, ${pageErrors.length} pageErrors)`);

    console.log('Generating contact sheets via build-sheets.py...');
    execFileSync('python', [path.join(OUT_DIR, 'build-sheets.py')], { stdio: 'inherit' });
    console.log('Contact sheets generated successfully.');
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
