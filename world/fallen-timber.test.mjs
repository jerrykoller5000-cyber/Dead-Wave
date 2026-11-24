import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import { createFallenTimber, createTimberBarkTexture, createTimberFooting, createTimberGroundShade, fitFallenTimber } from './fallen-timber.js';

const forms = createFallenTimber(THREE);
const at = (form, yaw, floor, scale = 1, allowPoint) => fitFallenTimber(form, 3, -7, yaw, scale, floor, allowPoint);

test('the three loose logs have deterministic distinct bodies, finite normals and a single vertex-coloured geometry each', () => {
  const copies = createFallenTimber(THREE);
  assert.deepEqual(forms.map(f => f.name), ['weathered', 'forked', 'mossy']);
  assert.equal(new Set(forms.map(f => f.length)).size, forms.length);
  for (const [i, form] of forms.entries()) {
    const { position, normal, color } = form.geometry.attributes;
    assert.equal(position.count, color.count);
    assert(position.count / 3 <= 300);
    assert.deepEqual(position.array, copies[i].geometry.attributes.position.array);
    assert.deepEqual(color.array, copies[i].geometry.attributes.color.array);
    assert(new Set(color.array).size > 30);
    for (let v = 0; v < position.count; v++) {
      assert(Math.abs(Math.hypot(normal.getX(v), normal.getY(v), normal.getZ(v)) - 1) < 1e-5, form.name);
    }
  }
});

test('each rigid body beds into a sloping plane across different orientations and sizes', () => {
  for (const form of forms) for (const yaw of [0, 0.9, 2.2]) for (const scale of [0.74, 1.35]) {
    const floor = (x, z) => 1 + 0.40 * x - 0.12 * z;
    const pose = at(form, yaw, floor, scale);
    assert(pose, form.name);
    const transform = new THREE.Matrix4().fromArray(pose.matrix);
    assert(Math.abs(transform.determinant() - scale ** 3) < 1e-6);
    // Check the visible geometry independently from the contact station list.
    const geometry = form.geometry.attributes.position;
    let lowest = Infinity;
    for (let i = 0; i < geometry.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(geometry, i).applyMatrix4(transform);
      lowest = Math.min(lowest, p.y - floor(p.x, p.z));
    }
    assert(Math.abs(lowest + 0.012 * scale) < 1e-5, form.name);
    assert(pose.maxGap <= 0.12 * scale);
    assert.equal(pose.matrix[12], 3);
    assert.equal(pose.matrix[14], -7);
  }
});

test('uneven ground is accepted if it supports the trunk, while a ridge, hollow or cliff is rejected', () => {
  for (const form of forms) {
    assert(at(form, 0, x => 0.08 * x + 0.018 * Math.cos(x * 3)), form.name);
    assert.equal(at(form, 0, x => Math.abs(x - 3) < 0.36 ? 0.45 : 0), null, form.name);
    assert.equal(at(form, 0, x => Math.abs(x - 3) < 0.36 ? -0.45 : 0), null, form.name);
    assert.equal(at(form, 0, x => 1.1 * x), null, form.name);
    assert.equal(at(form, 0, () => NaN), null, form.name);
  }
});

test('a narrow ridge cannot prop the actual ends or all bark-ring vertices into the air', () => {
  const form = forms[1];
  // These low rises fit the clearance tolerance of the continuous trunk, but
  // lift an end by 6.2 cm, or all mesh vertices by 2.2 cm, on the first site.
  for (const [crest, height] of [[-1.10833, 0.082], [-1.19167, 0.04]]) {
    const ground = x => height * Math.exp(-(((x - crest) / 0.07) ** 2));
    assert.equal(fitFallenTimber(form, 0, 0, 0, 1, ground), null);
    assert(fitFallenTimber(form, 3, 0, 0, 1, ground));
  }
});

test('the wood atlas provides repeatable bark, end grain and localized moss with complete UVs', () => {
  const atlas = createTimberBarkTexture(THREE), again = createTimberBarkTexture(THREE);
  assert.equal(atlas.colorSpace, THREE.SRGBColorSpace);
  assert(atlas.generateMipmaps);
  assert.deepEqual(atlas.image.data, again.image.data);
  const {width, height, data} = atlas.image, bandBytes = width * height;
  assert.equal(width, 512);
  assert.equal(height, 512);
  for (let strip = 0; strip < 4; strip++) {
    const levels = new Set();
    let moss = 0;
    for (let i = strip * bandBytes; i < (strip + 1) * bandBytes; i += 4) {
      levels.add(data[i]);
      if (data[i + 1] - data[i + 2] > 12) moss++;
    }
    assert(levels.size > 50);
    if (strip === 2) assert(moss > 500 && moss < width * height / 4 * 0.75);
    else assert.equal(moss, 0);
  }
  for (const {geometry} of forms) {
    const uv = geometry.attributes.uv;
    assert.equal(uv.count, geometry.attributes.position.count);
    assert(uv.array.every(v => v >= 0 && v <= 1));
  }
  atlas.dispose();
  again.dispose();
});

test('clearance disks cover all projected branch and end vertices, with ground heights supplied to obstacle checks', () => {
  const floor = (x, z) => 0.12 * x + 0.19 * z;
  for (const form of forms) {
    const disks = [];
    const pose = at(form, 0.7, floor, 1.26, (x, z, r, height) => {
      assert.equal(height, floor(x, z));
      disks.push({ x, z, r });
      return true;
    });
    assert(pose);
    const p = form.geometry.attributes.position, transform = new THREE.Matrix4().fromArray(pose.matrix);
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(transform);
      assert(disks.some(d => Math.hypot(v.x - d.x, v.z - d.z) <= d.r), form.name);
    }
    // An obstacle under the far tip misses a midpoint-only placement check.
    const last = disks.at(-1), ox = last.x - Math.sin(0.7) * last.r * 0.82, oz = last.z + Math.cos(0.7) * last.r * 0.82;
    assert(Math.hypot(ox - 3, oz + 7) > last.r);
    assert.equal(at(form, 0.7, floor, 1.26, (x, z, r) => Math.hypot(x - ox, z - oz) > r), null);
  }
});

test('footing matches vertical rays through the rendered bark, forks, splinters and empty gaps', () => {
  const footing = createTimberFooting();
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), origin = new THREE.Vector3();
  for (const form of forms) {
    const fit = at(form, 0.83, (x, z) => 0.12 * x - 0.25 * z, 1.2);
    const mesh = new THREE.Mesh(form.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    mesh.matrix.fromArray(fit.matrix);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrixWorld(true);
    footing.set(mesh, form.geometry, fit.matrix);
    let hits = 0, misses = 0;
    for (let ix = -22; ix <= 22; ix++) for (let iz = -22; iz <= 22; iz++) {
      const x = fit.x + ix * 0.087, z = fit.z + iz * 0.083;
      ray.set(origin.set(x, 20, z), down);
      const hit = ray.intersectObject(mesh, false)[0];
      const top = footing.heightAt(x, z);
      if (!hit) {
        misses++;
        assert.equal(top, null, form.name);
      } else {
        hits++;
        assert(Math.abs(top - hit.point.y) < 1e-7, form.name);
        assert.equal(footing.heightAt(x, z, top - 0.03), null);
        assert.equal(footing.heightAt(x, z, top), top);
      }
    }
    assert(hits > 90 && misses > 350);
    footing.remove(mesh);
    assert.equal(footing.heightAt(fit.x, fit.z), null);
    mesh.material.dispose();
  }
});

test('replacing and removing overlapping supports updates old and new grid buckets', () => {
  const footing = createTimberFooting(), low = {}, high = {};
  const indexed = new THREE.BoxGeometry(2, 1, 1), transform = new THREE.Matrix4();
  footing.set(low, indexed, transform.makeTranslation(-1.5, 3.5, 0));
  footing.set(high, indexed, transform.makeTranslation(-1.5, 4, 0));
  assert.equal(footing.heightAt(-1.5, 0), 4.5);
  assert.equal(footing.heightAt(-1.5, 0, 4.2), null);
  footing.set(high, indexed, transform.makeTranslation(5, 2, -5));
  assert.equal(footing.heightAt(-1.5, 0), 4);
  assert.equal(footing.heightAt(5, -5), 2.5);
  assert.equal(footing.heightAt(6, -5.5), 2.5); // exactly on a cell edge and mesh corner
  assert.equal(footing.heightAt(6.0001, -5.5), null);
  footing.remove(high);
  footing.remove(high);
  assert.equal(footing.heightAt(5, -5), null);
  assert.equal(footing.heightAt(-1.5, 0), 4);
  footing.remove(low);
  assert.equal(footing.heightAt(-1.5, 0), null);
  indexed.dispose();
});

test('contact shade follows uneven terrain, feathers every boundary and stays under the bark on a forked log', () => {
  const floor = (x, z) => x * 0.11 - z * 0.08 + 0.018 * Math.cos(x * 2);
  const shade = createTimberGroundShade(THREE, 2, floor), form = forms[1], pose = at(form, 0.64, floor);
  assert(shade.set('first', form, pose.matrix));
  const geo = shade.mesh.geometry, p = geo.attributes.position, c = geo.attributes.color;
  assert(shade.mesh.material.fog && shade.mesh.material.transparent && !shade.mesh.material.depthWrite);
  assert.equal(c.itemSize, 4);
  const count = p.count / 2, columns = 7;
  for (let i = 0; i < count; i++) {
    assert(Math.abs(p.getY(i) - floor(p.getX(i), p.getZ(i)) - 0.004) < 1e-5);
    const alpha = c.getW(i);
    if (i < columns || i >= count - columns || i % columns === 0 || i % columns === columns - 1) assert.equal(alpha, 0);
    else assert(alpha > 0 && alpha <= 0.341);
  }
  const center = Math.floor(count / 2);
  const halfWidth = Math.hypot(p.getX(center + 3) - p.getX(center), p.getZ(center + 3) - p.getZ(center));
  assert(halfWidth < form.radius * 0.90);
  assert(c.getW(center) > c.getW(center + 1));
  assert(c.getW(center + 1) > c.getW(center + 2));
});

test('contact shade refits and compacts into one draw without leaving marks at old locations', () => {
  const floor = () => 0, shade = createTimberGroundShade(THREE, 2, floor), form = forms[0];
  const geo = shade.mesh.geometry, p = geo.attributes.position;
  const first = fitFallenTimber(form, -8, 0, 0, 1, floor);
  const second = fitFallenTimber(form, 5, 0, 0, 1, floor);
  assert.equal(shade.mesh.visible, false);
  shade.set('first', form, first.matrix); const one = geo.drawRange.count;
  shade.set('second', form, new THREE.Matrix4().fromArray(second.matrix));
  assert.equal(geo.drawRange.count, one * 2);
  shade.remove('first');
  assert.equal(geo.drawRange.count, one);
  assert(p.getX(0) > 3);
  shade.set('second', form, first.matrix);
  assert.equal(geo.drawRange.count, one);
  assert(p.getX(0) < -8);
  shade.remove('second'); shade.remove('second');
  assert.equal(geo.drawRange.count, 0);
  assert.equal(shade.mesh.visible, false);
});

test('the game node renderer reads shade opacity from the fourth vertex-color component', async () => {
  const webgpu = await import('../vendor/three/three.webgpu.js');
  const shade = createTimberGroundShade(webgpu, 1, () => 0, webgpu.TSL);
  const material = shade.mesh.material;
  assert.equal(material.type, 'MeshBasicNodeMaterial');
  assert.equal(material.opacityNode.components, 'w');
  assert.equal(material.opacityNode.node.getAttributeName(), 'color');
  assert.equal(material.opacityNode.node.nodeType, 'vec4');
});
