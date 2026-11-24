// studio/weapon-textures.test.mjs — AG-410 unit tests for procedural weapon PBR library.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEAPON_PBR_KEYS,
  tileNoise,
  tileFbm,
  flipRowsRGBA,
  heightToNormalRGBA,
  genParkerizedPixels,
  genAnodizedPixels,
  genMachinedSteelPixels,
  genBladeSteelPixels,
  genPolymerPixels,
  genRubberPixels,
  genEnamelPixels,
  genBrassPixels,
  genWalnutPixels,
  genBirchAtlasPixels,
  genWoodStipplePixels,
  genKatanaBladePixels,
  genKatanaWrapPixels,
  genKatanaSamegawaPixels,
  genKatanaLacquerPixels,
  genChasedGoldPixels,
  genOpticalGlassPixels,
  genPressureGaugePixels,
  getWeaponPBR,
  applyWeaponPBR,
  classifyWeaponMaterial,
  applyGunFurniturePBR,
  projectWeaponUVs,
  getWeaponFoldPBR,
} from './weapon-textures.js';
import * as FakeThree from '../tools/tests/fakethree.mjs';

function makeMockThree() {
  class DataTexture {
    constructor(data, width, height, format, type) {
      this.data = data;
      this.image = { data, width, height };
      this.format = format;
      this.type = type;
      this.isDataTexture = true;
      this.needsUpdate = false;
      this.channel = 0;
    }
  }
  class Vector2 {
    constructor(x = 0, y = 0) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; return this; }
  }
  return {
    DataTexture,
    Vector2,
    RGBAFormat: 1023,
    UnsignedByteType: 1009,
    SRGBColorSpace: 'srgb',
    RepeatWrapping: 1000,
    ClampToEdgeWrapping: 1001,
    LinearFilter: 1006,
    LinearMipmapLinearFilter: 1008,
  };
}

describe('studio/weapon-textures.js', () => {
  it('tileNoise & tileFbm are deterministic and wrap seamlessly across [0, 1)', () => {
    const a = tileNoise(0, 0.25, 8, 8, 7);
    const b = tileNoise(1, 0.25, 8, 8, 7);
    assert.ok(Math.abs(a - b) < 1e-6);
    assert.equal(tileFbm(0.37, 0.61, 6, 6, 19, 3), tileFbm(0.37, 0.61, 6, 6, 19, 3));
  });

  it('flipRowsRGBA reverses scanlines losslessly and heightToNormalRGBA produces unit-length tangent normals', () => {
    const src = new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
    const flipped = flipRowsRGBA(src, 2, 2);
    assert.deepEqual([...flipped.subarray(0, 4)], [7, 8, 9, 255]);
    assert.deepEqual([...flipped.subarray(8, 12)], [1, 2, 3, 255]);

    const h = new Float32Array(16 * 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) h[y * 16 + x] = Math.sin((x / 16) * Math.PI * 2) * 0.5 + 0.5;
    const nrm = heightToNormalRGBA(h, 16, 16, 1.8);
    assert.equal(nrm.length, 16 * 16 * 4);
    for (let i = 0; i < nrm.length; i += 4) {
      const nx = (nrm[i] / 255) * 2 - 1;
      const ny = (nrm[i + 1] / 255) * 2 - 1;
      const nz = (nrm[i + 2] / 255) * 2 - 1;
      const len = Math.hypot(nx, ny, nz);
      assert.ok(Math.abs(len - 1) < 0.03, `normal length ${len} not unit`);
      assert.ok(nz > 0, 'tangent normal must point +Z');
    }
  });

  it('all 18 procedural weapon generators produce valid non-flat col, normal, and ORM buffers', () => {
    const gens = [
      genParkerizedPixels, genAnodizedPixels, genMachinedSteelPixels, genBladeSteelPixels,
      genPolymerPixels, genRubberPixels, genEnamelPixels, genBrassPixels,
      genWalnutPixels, genBirchAtlasPixels, genWoodStipplePixels,
      genKatanaBladePixels, genKatanaWrapPixels, genKatanaSamegawaPixels, genKatanaLacquerPixels,
      genChasedGoldPixels, genOpticalGlassPixels, genPressureGaugePixels,
    ];
    assert.equal(gens.length, WEAPON_PBR_KEYS.length);
    for (const fn of gens) {
      const res = fn(64);
      assert.equal(res.col.length, 64 * 64 * 4);
      assert.equal(res.nrm.length, 64 * 64 * 4);
      assert.equal(res.orm.length, 64 * 64 * 4);
      let minC = 255, maxC = 0, minR = 255, maxR = 0;
      for (let i = 0; i < res.col.length; i += 4) {
        if (res.col[i] < minC) minC = res.col[i];
        if (res.col[i] > maxC) maxC = res.col[i];
        if (res.orm[i + 1] < minR) minR = res.orm[i + 1];
        if (res.orm[i + 1] > maxR) maxR = res.orm[i + 1];
      }
      assert.ok(maxC - minC >= 12, `${fn.name} albedo too flat (${minC}..${maxC})`);
      assert.ok(maxR - minR >= 8, `${fn.name} roughness too flat (${minR}..${maxR})`);
    }
  });

  it('getWeaponPBR caches per THREE instance, binds ORM to uv channel 0, and returns null on fakethree', () => {
    assert.equal(getWeaponPBR(FakeThree, 'parkerized'), null);
    assert.equal(getWeaponFoldPBR(FakeThree, null), null);

    const T = makeMockThree();
    const a = getWeaponPBR(T, 'parkerized');
    const b = getWeaponPBR(T, 'parkerized');
    assert.ok(a && a === b, 'cached entry must be reused');
    assert.equal(a.normalMap.channel, 0);
    assert.equal(a.ormMap.channel, 0);
    assert.equal(a.map.colorSpace, 'srgb');
    assert.notEqual(a.normalMap.colorSpace, 'srgb');
    assert.notEqual(a.ormMap.colorSpace, 'srgb');
  });

  it('applyGunFurniturePBR preserves map === null and exact issue roughness/metalness for t146 & t334', () => {
    const T = makeMockThree();
    const receiverMat = {
      isMaterial: true, name: 'gunPaint:m4', roughness: 0.66, metalness: 0.08, map: null,
      userData: { weaponFinishRole: 'receiver', issueColor: 0x484b51, issueMap: null, issueRoughness: 0.66, issueMetalness: 0.08 },
    };
    const polyMat = {
      isMaterial: true, name: 'gunPaint:m4', roughness: 0.76, metalness: 0.03, map: null,
      userData: { weaponFinishRole: 'furniture', issueColor: 0x323437, issueMap: null, issueRoughness: 0.76, issueMetalness: 0.03 },
    };
    const count = applyGunFurniturePBR(T, { m4: [receiverMat, polyMat] });
    assert.equal(count, 2);
    assert.equal(receiverMat.map, null, 'factory receiver map must stay null for t146');
    assert.equal(polyMat.map, null, 'factory polymer map must stay null for t146');
    assert.equal(receiverMat.roughness, 0.66);
    assert.equal(receiverMat.metalness, 0.08);
    assert.ok(receiverMat.normalMap && receiverMat.roughnessMap && receiverMat.aoMap);
    assert.equal(receiverMat.aoMap.channel, 0, 'aoMap must read uv channel 0 to keep uv1 free for barrel-heat');
    assert.equal(polyMat.userData.weaponPBRKind, 'polymer');
    assert.equal(classifyWeaponMaterial({ userData: { weaponFinishRole: 'tank' }, name: 'flamer red enamel', roughness: 0.63, metalness: 0.13 }), 'enamel');
    assert.equal(classifyWeaponMaterial({ userData: { weaponFinishRole: 'suppressor shell' }, name: '', roughness: 0.68, metalness: 0.08 }), 'anodized');
    // Cloned polymer material reassigned to light shell must overwrite polymer maps with anodized
    const lightMat = {
      isMaterial: true, name: 'gunPaint:revolver', roughness: 0.76, metalness: 0.03, map: null,
      userData: { weaponFinishRole: 'light shell', weaponPBRKind: 'polymer', issueColor: 0x323437, issueMap: null },
    };
    applyWeaponPBR(T, lightMat, 'polymer', { useMap: false });
    applyGunFurniturePBR(T, { revolver: [lightMat] });
    assert.equal(lightMat.userData.weaponPBRKind, 'anodized');
    assert.equal(lightMat.normalMap, getWeaponPBR(T, 'anodized').normalMap);
    assert.equal(lightMat.map, null);
    assert.equal(classifyWeaponMaterial({ userData: { weaponFinishRole: 'receiver', issueName: 'flamer field enamel' }, name: 'gunPaint:flamer', roughness: 0.65, metalness: 0.16 }), 'enamel');
  });

  it('applyWeaponPBR supports markFoldable and projectWeaponUVs generates non-degenerate UVs', () => {
    const T = makeMockThree();
    const m = { isMaterial: true, roughness: 0.42, metalness: 0.85, userData: {} };
    applyWeaponPBR(T, m, 'machinedSteel', { useMap: false, useMetalMap: true, markFoldable: true });
    assert.equal(m.userData.weaponBasePBR, true);
    assert.ok(m.normalMap && m.roughnessMap && m.metalnessMap && m.aoMap);

    const pos = new FakeThree.Float32BufferAttribute([0, 0, 0, 0.42, 0, 0, 0.42, 0.42, 0], 3);
    const nrm = new FakeThree.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3);
    const geo = new FakeThree.BufferGeometry();
    geo.setAttribute('position', pos);
    geo.setAttribute('normal', nrm);
    const mesh = new FakeThree.Mesh(geo, m);
    const updated = projectWeaponUVs(mesh, { tileMeters: 0.42 });
    assert.equal(updated, 1);
    assert.ok(geo.attributes.uv, 'uv attribute created');
    assert.ok(Math.abs(geo.attributes.uv.getX(1) - 1.0) < 1e-5);
    assert.ok(Math.abs(geo.attributes.uv.getY(2) - 1.0) < 1e-5);
  });
});
