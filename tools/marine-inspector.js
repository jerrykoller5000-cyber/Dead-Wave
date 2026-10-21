// tools/marine-inspector.js — 1:1 Standalone Marine CIF, Kit, Weapon & Animation Inspector (AG-75).
// Uses the exact runtime builders, IK solvers, waist deformation, carry-rig fit, and animation modules from index.html.

import * as THREE from 'three';
import { rbox, addCast, boxProjectUV, slab as profileSlab, lathe as profileLathe, curve as profileCurve } from '../core/geometry.js';
import { paintCamo, CAMO_KEYS, isCamoKey } from '../core/camo.js';
import { paintRuneFinish, paintRuneGlow } from '../world/runes.js';
import * as WARDROBE_LISTS from '../game/wardrobe.js';
import { CAMO_ITEMS, BOOT_HEX, RUBBER_HEX, defaultWardrobe } from '../game/wardrobe.js';
import { buildMarineHead, buildMarineHair, buildMarineFeatures, buildBalaclava } from '../ui/marine-face.js';
import { buildMarineHelmet, detailMarineNvg } from '../studio/marine-headgear.js';
import { buildMarineEyewear } from '../ui/marine-eyewear.js';
import { buildMarineBody } from '../studio/marine-body.js';
import { createMarineWaist, followMarineWaist } from '../studio/marine-waist.js';
import { HAND_POSES, lerpPose } from '../studio/marine-hand.js';
import { applyMarineSurfaceDetail } from '../studio/marine-detail.js';
import { bakeMarineAO } from '../studio/marine-ao.js';
import * as Studio from '../studio/index.js';
import { createMarineIdle } from '../studio/marine-idle.js';
import { createMarineTurn } from '../studio/marine-turn.js';
import { GAIT_WEIGHT, gaitExtras, leanFromAccel } from '../studio/marine-gait-feel.js';
import { AIR, airPose } from '../studio/marine-air.js';
import { sampleBedExit } from '../studio/marine-bed-exit.js';
import { createDraw, LEFT_REST as DRAW_LEFT_REST } from '../studio/marine-draw.js';
import { divePose, plantDiveLeg } from '../studio/marine-dive-pose.js';
import { DIVE, createDive, startDive, stepDive, endDive, diveLie, diveBasis, smooth as diveSmooth } from '../studio/marine-dive.js';
import { CREW_STANCE, createFootPlant, stepFootPlant, stanceFeet, legReach, createMortarLoad, stepMortarLoad, fireMortarLoad, mortarLoadU } from '../studio/crew-footwork.js';
import { JUMP_FEEL, createJumpState, jumpPose } from '../game/marine-jump.js';
import { sampleVault } from '../game/player-vault.js';
import { createSawStart, stepSawStart, sawStartPose } from '../game/chainsaw-animation.js';
import { createSelectorFlick } from '../game/selector-flick.js';
import { WATCHMAN, createWatchman, stepWatchman, watchmanPose, watchmanCarry } from '../game/watchman-mg.js';
import { webbingGeometry, bandolierFit } from '../ui/marine-webbing.js';
import { fitWeaponSling } from '../ui/weapon-sling.js';
import { BOOTS_HEX, buildInsulatedBoots, buildWornBoots } from '../world/lightning.js';
import { makePistolModel, makeRevolverModel, makeUziModel, makeKnifeModel } from '../studio/weapon-sidearms.js';
import { makeM4Model, makeAkModel, makeAa12Model, makeShotgunModel, makeSniperModel } from '../studio/weapon-longarms.js';
import { makeMinigunModel, makeLauncherModel, makeFlamerModel, makeChainsawModel, makeMortarModel, makeM240Model } from '../studio/weapon-heavy.js';
import { makeKatanaModel, makeSheathedKatana } from '../studio/katana.js';

export const RUNE_FINISH_KEY = 'rune';
export const isGunFinishKey = (k) => k === RUNE_FINISH_KEY || isCamoKey(k) || k === 'm81';
export const SUPPRESSOR = {
  m4:      { r: 0.025, len: 0.17, back: 0.065, look: 'rifle' },
  ak:      { r: 0.031, len: 0.18, back: 0.036, heavyBack: 0.05, look: 'ak' },
  pistol:  { r: 0.0275, len: 0.15, back: 0.008, look: 'pistol' },
  uzi:     { r: 0.027, len: 0.16, back: 0.02, look: 'pistol' },
  sniper:  { r: 0.04, len: 0.31, back: 0.124, look: 'sniper' },
  shotgun: { r: 0.06, len: 0.36, back: 0.045, look: 'big', clamp: { r: 0.044, z: -0.033, len: 0.025 } }
};
function makeSuppressorGroup({ gunKit, mats }, spec) {
  const can = new THREE.Group();
  const K = gunKit(can);
  const r = spec.r, L = spec.len;
  const tube = spec.look === 'ak' ? mats.gunMetal : mats.gunDark;
  K.cyl(r + 0.002, r + 0.002, 0.03, mats.gunMetal, 0, 0, 0.015, can, 12);
  K.cyl(r, r, L, tube, 0, 0, L * 0.5, can, 14);
  return can;
}

// === Shared Camo & Materials (1:1 from index.html) ===============================
function makeCamoTexture() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#5c6647'; g.fillRect(0, 0, S, S);
  let s = 1981; const R = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const blob = (col, n, rx, ry) => {
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const x = R() * S, y = R() * S, w = rx * (0.6 + R() * 0.8), h = ry * (0.6 + R() * 0.8), a = (R() - 0.5) * 1.1;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
        g.save(); g.translate(x + ox, y + oy); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        g.ellipse(w * 0.55, h * 0.2, w * 0.65, h * 0.55, 0.4, 0, Math.PI * 2);
        g.ellipse(-w * 0.45, -h * 0.15, w * 0.5, h * 0.5, -0.3, 0, Math.PI * 2);
        g.fill(); g.restore();
      }
    }
  };
  blob('#3b4a2b', 22, 18, 9);
  blob('#6b4f32', 16, 15, 8);
  blob('#1e2119', 14, 12, 5);
  g.fillStyle = 'rgba(0,0,0,0.06)';
  for (let y = 0; y < S; y += 2) g.fillRect(0, y, S, 1);
  for (let x = 0; x < S; x += 2) g.fillRect(x, 0, 1, S);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const camoTex = makeCamoTexture();
const _camoTiles = new Map([['m81', camoTex]]);
const runeFinish = { tex: null, glowTex: null, level: 0.65 };
function ensureRuneFinish() {
  if (runeFinish.tex) return runeFinish.tex;
  const S = 256, make = (paint) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    paint(img.data, S, S); ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  runeFinish.tex = make(paintRuneFinish);
  runeFinish.glowTex = make(paintRuneGlow);
  _camoTiles.set(RUNE_FINISH_KEY, runeFinish.tex);
  return runeFinish.tex;
}
export function camoTile(key) {
  if (key === RUNE_FINISH_KEY) return ensureRuneFinish();
  let t = _camoTiles.get(key);
  if (t) return t;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(S, S);
  paintCamo(key, img.data, S, S);
  ctx.putImageData(img, 0, 0);
  t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  _camoTiles.set(key, t);
  return t;
}

const skinMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, roughness: 0.85, metalness: 0.05 });
const hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.9, metalness: 0.02 });
const camoGreen = new THREE.MeshStandardMaterial({ color: 0x4a5d3a, roughness: 0.9, metalness: 0.05 });
const camoOD = new THREE.MeshStandardMaterial({ color: 0x5c6444, roughness: 0.88, metalness: 0.06 });
const helmetMat = new THREE.MeshStandardMaterial({ color: 0x3d4f2f, roughness: 0.65, metalness: 0.2 });
const goggleMat = new THREE.MeshStandardMaterial({ color: 0x1a1e18, roughness: 0.25, metalness: 0.5 });
const lensMat = new THREE.MeshStandardMaterial({ color: 0x1a2820, roughness: 0.15, metalness: 0.7 });
const nvgLensOnMat = new THREE.MeshStandardMaterial({ color: 0x3aff7a, emissive: 0x1fd45a, emissiveIntensity: 1.6, roughness: 0.15, metalness: 0.4 });
const nvgMat = new THREE.MeshStandardMaterial({ color: 0x252820, roughness: 0.5, metalness: 0.4 });
const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1c, roughness: 0.85, metalness: 0.1 });
const pouchMat = new THREE.MeshStandardMaterial({ color: 0x4e4836, roughness: 0.88, metalness: 0.08 });
const gloveMat = new THREE.MeshStandardMaterial({ color: 0x242620, roughness: 0.8, metalness: 0.1 });
const maskDark = new THREE.MeshStandardMaterial({ color: 0x141614, roughness: 0.92, metalness: 0.05 });
const jawPrint = new THREE.MeshStandardMaterial({ color: 0xd8d2c2, roughness: 0.88, metalness: 0.05 });
const patchMat = new THREE.MeshStandardMaterial({ color: 0x8b7e5a, roughness: 0.85, metalness: 0.05 });
const patchInk = new THREE.MeshStandardMaterial({ color: 0x23251e, roughness: 0.9, metalness: 0.05 });
const plateMat = new THREE.MeshStandardMaterial({ color: 0x424838, roughness: 0.78, metalness: 0.12 });
const uniformMat = new THREE.MeshStandardMaterial({ color: 0xe2ded0, map: camoTex, roughness: 0.95, metalness: 0.02 });
const trouserMat = new THREE.MeshStandardMaterial({ color: 0xd2cebd, map: camoTex, roughness: 0.95, metalness: 0.02 });
const coverMat = new THREE.MeshStandardMaterial({ color: 0xd8d6c4, map: camoTex, roughness: 0.9, metalness: 0.05 });
const carrierMat = new THREE.MeshStandardMaterial({ color: 0x4c5138, roughness: 0.88, metalness: 0.06 });
const webMat = new THREE.MeshStandardMaterial({ color: 0x2f3326, roughness: 0.9, metalness: 0.04 });
const soleMat = new THREE.MeshStandardMaterial({ color: 0x121210, roughness: 0.95 });
const laceMat = new THREE.MeshStandardMaterial({ color: 0x5f5846, roughness: 0.9 });
const leatherMat = new THREE.MeshStandardMaterial({ color: 0x3b3326, roughness: 0.8, metalness: 0.05 });

// Gun shared materials
const gunMetal = new THREE.MeshStandardMaterial({ color: 0x3a3f48, metalness: 0.75, roughness: 0.38 });
const gunBody = new THREE.MeshStandardMaterial({ color: 0x484b51, metalness: 0.28, roughness: 0.48 });
const gunDark = new THREE.MeshStandardMaterial({ color: 0x27292d, metalness: 0.3, roughness: 0.52 });
const gunMid = new THREE.MeshStandardMaterial({ color: 0x5c6068, metalness: 0.32, roughness: 0.44 });
const gunAccent = new THREE.MeshStandardMaterial({ color: 0x383b41, metalness: 0.45, roughness: 0.34 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4b29, roughness: 0.6, metalness: 0.03 });
const bladeMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.6, roughness: 0.26 });
const gunPoly = new THREE.MeshStandardMaterial({ color: 0x323437, metalness: 0.03, roughness: 0.76 });
const gunRubber = new THREE.MeshStandardMaterial({ color: 0x17181a, metalness: 0.0, roughness: 0.95 });
const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2c15, roughness: 0.64, metalness: 0.03 });
const steelMat = new THREE.MeshStandardMaterial({ color: 0xb0b6bd, metalness: 0.62, roughness: 0.26 });
const brassMat = new THREE.MeshStandardMaterial({ color: 0xc69b45, metalness: 0.65, roughness: 0.3 });
const gunOlive = new THREE.MeshStandardMaterial({ color: 0x525a3b, metalness: 0.06, roughness: 0.74 });
const gunTan = new THREE.MeshStandardMaterial({ color: 0x9a8560, metalness: 0.05, roughness: 0.74 });
const magPoly = new THREE.MeshStandardMaterial({ color: 0x37393b, metalness: 0.03, roughness: 0.74 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x14303e, emissive: 0x0b2b3b, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.08 });
const sightDotMat = new THREE.MeshStandardMaterial({ color: 0xff3322, emissive: 0xff2211, emissiveIntensity: 1.8 });
const shellRedMat = new THREE.MeshStandardMaterial({ color: 0xb3261e, metalness: 0.2, roughness: 0.55 });
const fuelRedMat = new THREE.MeshStandardMaterial({ color: 0xa8261c, roughness: 0.5, metalness: 0.3 });
const hazardYellow = new THREE.MeshStandardMaterial({ color: 0xd9a51f, roughness: 0.55, metalness: 0.2 });
const gaugeFace = new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 0.5 });

function makePgbPatch() {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#4a4635'; ctx.fillRect(0, 0, 128, 96);
  ctx.strokeStyle = '#1d1f18'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, 120, 88);
  ctx.fillStyle = '#171914'; ctx.font = '900 44px "Black Ops One", Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('PGB', 64, 51);
  const tex = new THREE.CanvasTexture(cv);
  if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88, metalness: 0.04 });
  const m = addCast(new THREE.Mesh(rbox(0.01, 0.05, 0.068, 0.003), mat));
  m.name = 'pgbPatch';
  return m;
}

const rmesh = (w, h, d, mat, r) => addCast(new THREE.Mesh(rbox(w, h, d, r), mat));

const _cloneLeanEmpty = Object.freeze({});
function cloneLean(obj, recursive = true) {
  const ud = obj.userData; obj.userData = _cloneLeanEmpty;
  let c;
  try { c = new obj.constructor().copy(obj, false); } finally { obj.userData = ud; }
  const keep = {};
  for (const k in ud) {
    const v = ud[k];
    if (v == null || typeof v !== 'object') keep[k] = v;
    else if (!(v.isObject3D || v.isMaterial || v.isTexture || v.isBufferGeometry)) {
      try { keep[k] = JSON.parse(JSON.stringify(v)); } catch (_) {}
    }
  }
  c.userData = keep;
  if (recursive) for (const ch of obj.children) c.add(cloneLean(ch, true));
  return c;
}

const _mgV = new THREE.Vector3(), _mgN = new THREE.Vector3(), _mgNM = new THREE.Matrix3();
function mergeRigidMeshes(root, gearParts, keep) {
  const gearOf = new Map();
  for (const k of Object.keys(gearParts)) for (const m of gearParts[k]) gearOf.set(m, k);
  const groups = [];
  root.traverse((o) => { if (o.isGroup || o === root) groups.push(o); });
  for (const grp of groups) {
    const byMat = new Map();
    for (const c of grp.children) {
      if (!c.isMesh || keep.has(c) || c.children.length || !c.geometry || !c.geometry.attributes.position || Array.isArray(c.material)) continue;
      let byGear = byMat.get(c.material); if (!byGear) { byGear = new Map(); byMat.set(c.material, byGear); }
      const gk = gearOf.get(c) || '';
      let list = byGear.get(gk); if (!list) { list = []; byGear.set(gk, list); }
      list.push(c);
    }
    for (const [mat, byGear] of byMat) for (const [gk, list] of byGear) {
      if (list.length < 2) {
        if (mat.map && list.length === 1) {
          const c = list[0], src = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
          const P = src.attributes.position, uvA = new Float32Array(P.count * 2);
          boxProjectUV(P.array, uvA);
          src.setAttribute('uv', new THREE.BufferAttribute(uvA, 2));
          c.geometry = src;
        }
        continue;
      }
      let total = 0;
      const prep = list.map((c) => { const geo = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry; c.updateMatrix(); total += geo.attributes.position.count; return { geo, m: c.matrix }; });
      const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), uv = new Float32Array(total * 2);
      let o = 0;
      for (const { geo, m } of prep) {
        _mgNM.getNormalMatrix(m);
        const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
        for (let i = 0; i < P.count; i++) {
          _mgV.fromBufferAttribute(P, i).applyMatrix4(m);
          pos[(o + i) * 3] = _mgV.x; pos[(o + i) * 3 + 1] = _mgV.y; pos[(o + i) * 3 + 2] = _mgV.z;
          if (N) { _mgN.fromBufferAttribute(N, i).applyMatrix3(_mgNM).normalize(); nrm[(o + i) * 3] = _mgN.x; nrm[(o + i) * 3 + 1] = _mgN.y; nrm[(o + i) * 3 + 2] = _mgN.z; }
          if (U) { uv[(o + i) * 2] = U.getX(i); uv[(o + i) * 2 + 1] = U.getY(i); }
        }
        o += P.count;
      }
      if (mat.map) boxProjectUV(pos, uv);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const merged = new THREE.Mesh(geo, mat);
      merged.castShadow = true; merged.receiveShadow = true;
      for (const c of list) grp.remove(c);
      grp.add(merged);
      if (gk) { gearParts[gk] = gearParts[gk].filter((x) => list.indexOf(x) < 0); gearParts[gk].push(merged); }
    }
  }
}

export const DRESS_HAIR = { black: 0x16130f, darkBrown: 0x3a2c1e, brown: 0x6b4a2b, auburn: 0x7c3b1d, blond: 0xc9a466, grey: 0x8c8a84 };
export const DRESS_EYES = { brown: 0x4a3020, hazel: 0x7a6634, green: 0x3f6b3a, blue: 0x3d6f9e, grey: 0x7c858c };
export const DRESS_SKIN = [0xf2d3b8, 0xe2bc98, 0xd3b08a, 0xc4a882, 0x8f6a4a, 0x5c4030];
export const DRESS = {
  cap: WARDROBE_LISTS.CAP_STYLES, eyewear: WARDROBE_LISTS.EYEWEAR_STYLES, sleeves: WARDROBE_LISTS.SLEEVES,
  cut: WARDROBE_LISTS.TROUSER_CUTS, boots: BOOT_HEX, hair: DRESS_HAIR, eyes: DRESS_EYES, skin: DRESS_SKIN,
};
const eyewearMats = {
  gold: new THREE.MeshStandardMaterial({ color: 0xc9a85c, roughness: 0.3, metalness: 0.85 }),
  aviLens: new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.08, metalness: 0.8, emissive: 0x0c140e, emissiveIntensity: 0.4 }),
  viperFrame: new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.35, metalness: 0.1 }),
  viperLens: new THREE.MeshStandardMaterial({ color: 0x7a2fa0, roughness: 0.08, metalness: 0.9, emissive: 0x2a1060, emissiveIntensity: 0.35 }),
  wayFrame: new THREE.MeshStandardMaterial({ color: 0x0e0e0e, roughness: 0.28, metalness: 0.1 }),
  wayLens: new THREE.MeshStandardMaterial({ color: 0x151a1c, roughness: 0.1, metalness: 0.6 }),
  gogFrame: new THREE.MeshStandardMaterial({ color: 0x7d6d4f, roughness: 0.7, metalness: 0.05 }),
  gogLens: new THREE.MeshStandardMaterial({ color: 0x2a2e30, roughness: 0.1, metalness: 0.65 }),
  gogStrap: new THREE.MeshStandardMaterial({ color: 0x6f6247, roughness: 0.9, metalness: 0.02 }),
  sock: new THREE.MeshStandardMaterial({ color: 0x4a4a3c, roughness: 0.95 }),
};

function applyWardrobe(who, state) {
  const w = who && who.userData && who.userData.wardrobe;
  if (!w || !state) return;
  for (const id of CAMO_ITEMS) {
    const entry = w[id];
    const pick = state.items[id] && state.items[id].camo;
    if (!entry) continue;
    for (const mat of entry.mats) {
      if (mat.userData.dress !== 'camo') continue;
      if (mat.userData.issueMap === undefined) {
        mat.userData.issueMap = mat.map || null;
        mat.userData.dressTint = mat.color.getHex();
      }
      const tex = isCamoKey(pick) ? camoTile(pick) : mat.userData.issueMap;
      mat.map = tex;
      mat.color.setHex(!tex || tex === camoTex ? mat.userData.dressTint : 0xffffff);
      mat.needsUpdate = true;
    }
  }
  const boots = w.boots;
  const colour = BOOT_HEX[state.items.boots && state.items.boots.colour] || BOOT_HEX.black;
  if (boots) for (const mat of boots.mats) {
    if (mat.userData.dress !== 'colour') continue;
    mat.map = null;
    mat.color.setHex(colour);
    mat.needsUpdate = true;
  }
}

function dressParts(m, state) {
  const d = m && m.userData && m.userData.dress;
  if (!d) return;
  const it = (state && state.items) || {}, body = (state && state.body) || {};
  const pick = (list, v) => (list.includes(v) ? v : list[0]);
  const hat = pick(DRESS.cap, it.cap && it.cap.style);
  for (const k of Object.keys(d.hats)) d.hats[k].visible = k === hat;
  const eye = pick(DRESS.eyewear, it.eyewear && it.eyewear.style);
  for (const k of Object.keys(d.eyes)) d.eyes[k].visible = k === eye;
  const rolled = (it.shirt && it.shirt.sleeves) === 'rolled';
  for (const o of d.sleeveDown) o.visible = !rolled;
  for (const o of d.sleeveRolled) o.visible = rolled;
  const shorts = (it.trousers && it.trousers.cut) === 'shorts';
  for (const o of d.legLong) o.visible = !shorts;
  for (const o of d.legShort) o.visible = shorts;
  const gloves = !(it.gloves && it.gloves.worn === false);
  for (const o of d.gloveOn) o.visible = gloves;
  for (const o of d.handBare) o.visible = !gloves;
  const skin = DRESS_SKIN[DRESS_SKIN[body.skin] != null ? body.skin : 3];
  d.mats.skin.color.setHex(skin);
  d.mats.skinShade.color.setHex(skin).multiplyScalar(0.8);
  d.mats.scar.color.setHex(skin).lerp(new THREE.Color(0xffffff), 0.18);
  d.mats.hair.color.setHex(DRESS_HAIR[body.hair] != null ? DRESS_HAIR[body.hair] : DRESS_HAIR.darkBrown);
  d.mats.iris.color.setHex(DRESS_EYES[body.eyes] != null ? DRESS_EYES[body.eyes] : DRESS_EYES.brown);
  d.picked = { hat, eyewear: eye, rolled, shorts, gloves, skin: body.skin, hair: body.hair, eyes: body.eyes };
}

export function makeMarine({ legacyBody = false } = {}) {
  const g = new THREE.Group();
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x2b2e24, roughness: 0.9, metalness: 0.05 });
  const buckleMat = new THREE.MeshStandardMaterial({ color: 0x7a7c74, roughness: 0.45, metalness: 0.6 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x3a3f33, roughness: 0.85, metalness: 0.1 });
  const put = (parent, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, rz); parent.add(mesh); return mesh; };
  const cyl = (rt, rb, h, mat, seg = 10) => addCast(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat));
  const itemMats = new Map(), matItem = new Map();
  const wear = (item) => (base) => {
    let m = itemMats.get(item); if (!m) { m = new Map(); itemMats.set(item, m); }
    let c = m.get(base);
    if (!c) { c = base.clone(); c.name = 'wear:' + item; m.set(base, c); matItem.set(c, item); }
    return c;
  };
  const uniformW = wear('shirt')(uniformMat), trouserW = wear('trousers')(trouserMat);
  const bootW = wear('boots')(bootMat), soleW = wear('boots')(soleMat), gloveW = wear('gloves')(gloveMat);
  const beltW = wear('belt')(strapMat), holsterW = wear('holster')(pouchMat), maskW = wear('mask')(maskDark);
  const capW = wear('cap')(coverMat), capBandW = wear('cap')(camoOD), shellW = wear('helmet')(coverMat);
  const carrierW = wear('carrier')(carrierMat), carrierPouchW = wear('carrier')(pouchMat);
  const packW = wear('pack')(camoGreen), packTrimW = wear('pack')(camoOD), padW = wear('pads')(padMat), plateW = wear('pads')(plateMat);
  if (!legacyBody) applyMarineSurfaceDetail(THREE, {
    cloth: [uniformW, trouserW, maskW, capW, shellW, carrierW, carrierPouchW, packW, packTrimW, beltW, holsterW],
    leather: [bootW, gloveW], rubber: [soleW, padW, plateW]
  });
  for (const mat of [uniformW, trouserW, gloveW, beltW, holsterW, maskW, capW, shellW, carrierW, carrierPouchW, packW, packTrimW, padW]) mat.userData.dress = 'camo';
  bootW.userData.dress = 'colour';
  const skinW = skinMat.clone(), hairW = hairMat.clone(), irisW = hairMat.clone();
  const dress = { hats: {}, eyes: {}, sleeveDown: [], sleeveRolled: [], legLong: [], legShort: [], gloveOn: [], handBare: [], mats: { skin: skinW, hair: hairW, iris: irisW } };
  const part = (parent, list) => { const grp = new THREE.Group(); parent.add(grp); if (list) list.push(grp); return grp; };
  const TORSO_PIVOT_Y = 0.7;
  const {
    lowerBody, hip, hipGrip, gearParts, legLG, legRG, torsoG, armLG, armRG, elbowLG, elbowRG, wristLG, wristRG, gripL, gripR, weaponMount, patches
  } = buildMarineBody(THREE, {
    root: g, put, rmesh, cyl, part, dress, pgbPatch: makePgbPatch,
    mats: {
      uniformW, trouserW, bootW, soleW, gloveW, beltW, holsterW,
      carrierW, carrierPouchW, packW, packTrimW, padW, plateW, skinW,
      strapMat, buckleMat, padMat, camoOD, pouchMat, leatherMat, patchMat,
      patchInk, webMat, nvgMat, laceMat, sockMat: eyewearMats.sock
    }
  });
  const HEAD_PIVOT_Y = 1.22;
  const headG = new THREE.Group();
  headG.scale.set(0.94, 0.97, 0.94);
  headG.position.set(0, HEAD_PIVOT_Y - TORSO_PIVOT_Y, 0);
  torsoG.add(headG);
  const hAdd = (mesh, x, y, z) => { mesh.position.set(x, y - HEAD_PIVOT_Y, z); headG.add(mesh); return mesh; };
  hAdd(cyl(0.065, 0.085, 0.13, skinW, 10), 0, 1.24, 0);
  headG.add(buildMarineHead(THREE, skinW));
  const bareFaceDetails = new THREE.Group(); bareFaceDetails.visible = true; headG.add(bareFaceDetails);
  g.userData.bareFaceDetails = bareFaceDetails;
  bareFaceDetails.add(buildMarineHair(THREE, hairW));

  const hatG = new THREE.Group();
  hatG.position.y = -HEAD_PIVOT_Y;
  headG.add(hatG);
  gearParts.bareHead.push(hatG);
  const hatAt = (grp, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => put(grp, mesh, x, y, z, rx, ry, rz);
  const cover = dress.hats.cover = part(hatG);
  const crown = (rings, mat, n = 24) => {
    const p = [], uv = [], ix = [];
    for (const [y, rx, rz] of rings) for (let j = 0; j <= n; j++) { const a = (j / n + 0.0625) * Math.PI * 2; p.push(Math.sin(a) * rx, y, Math.cos(a) * rz); uv.push(j / n, y * 4); }
    for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < n; j++) { const a = r * (n + 1) + j, b = a + n + 1; ix.push(a, a + 1, b, a + 1, b + 1, b); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ix); geo.computeVertexNormals(); return addCast(new THREE.Mesh(geo, mat));
  };
  const bill = (w, d) => {
    const s = new THREE.Shape(); s.moveTo(-w * 0.5, 0); s.quadraticCurveTo(-w * 0.56, d * 0.7, -w * 0.34, d); s.quadraticCurveTo(0, d * 1.13, w * 0.34, d); s.quadraticCurveTo(w * 0.56, d * 0.7, w * 0.5, 0); s.closePath();
    const edge = s.getPoints(12); edge.pop(); const v = [], ix = [], n = edge.length;
    for (const h of [0, 0.008]) { v.push(0, d * 0.45, h); for (const p of edge) v.push(p.x, p.y, h); }
    for (let j = 0; j < n; j++) { const a = j + 1, b = (j + 1) % n + 1, q = n + 1; ix.push(0, b, a, q, q + a, q + b, a, b, q + a, b, q + b, q + a); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(v.length / 3 * 2), 2)); geo.setIndex(ix); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getY(i), t = p.getZ(i); p.setXYZ(i, x, 1.536 - t - 0.012 * (x / (w * 0.5)) ** 2 - 0.025 * z / d, z + 0.098); } geo.computeVertexNormals(); return addCast(new THREE.Mesh(geo, capW));
  };
  cover.add(crown([[1.505, 0.145, 0.151], [1.535, 0.146, 0.152], [1.61, 0.137, 0.144], [1.628, 0.122, 0.13], [1.628, 0, 0]], capW, 8));
  cover.add(crown([[1.508, 0.147, 0.153], [1.532, 0.148, 0.154]], capBandW, 8), bill(0.255, 0.142));
  hatAt(cover, rmesh(0.045, 0.026, 0.006, patchInk, 0.003), 0, 1.573, 0.145);
  const boonie = dress.hats.boonie = part(hatG);
  boonie.add(crown([[1.511, 0.15, 0.161], [1.55, 0.149, 0.158], [1.612, 0.135, 0.145], [1.626, 0.111, 0.12], [1.629, 0, 0]], capW));
  boonie.add(crown([[1.524, 0.153, 0.164], [1.548, 0.153, 0.163]], capBandW));
  const brimGeo = new THREE.RingGeometry(0.146, 0.238, 32, 4), brimP = brimGeo.attributes.position;
  for (let i = 0; i < brimP.count; i++) { const x = brimP.getX(i), z = brimP.getY(i), t = (Math.hypot(x, z) - 0.146) / 0.092, a = Math.atan2(x, z); brimP.setXYZ(i, x, 1.512 - 0.025 * t + 0.01 * Math.sin(3 * a) * t, z * 1.1); } brimGeo.computeVertexNormals(); capW.side = THREE.DoubleSide; boonie.add(addCast(new THREE.Mesh(brimGeo, capW)));
  for (const sx of [-1, 1]) for (const z of [-0.055, 0.055]) hatAt(boonie, cyl(0.009, 0.009, 0.006, patchInk, 8), sx * 0.146, 1.57, z, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) hatAt(boonie, rmesh(0.006, 0.12, 0.006, strapMat, 0.002), sx * 0.142, 1.46, 0.03, 0, 0, sx * -0.12);
  const ballcap = (grp) => {
    grp.add(crown([[1.511, 0.135, 0.147], [1.551, 0.137, 0.147], [1.59, 0.12, 0.127], [1.625, 0.074, 0.077], [1.641, 0, 0]], capW), bill(0.224, 0.155));
    hatAt(grp, cyl(0.012, 0.013, 0.008, capBandW, 8), 0, 1.642, 0);
    for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2, points = [[0.132, 1.516], [0.133, 1.55], [0.115, 1.59], [0.07, 1.627], [0.007, 1.642]].map(([r, y]) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 1.08)); grp.add(addCast(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.0012, 3, false), capBandW))); }
    hatAt(grp, rmesh(0.07, 0.03, 0.012, strapMat, 0.004), 0, 1.53, -0.148);
  };
  ballcap(dress.hats.ballcap = part(hatG));
  const back = dress.hats.ballcapBack = part(hatG);
  back.rotation.y = Math.PI;
  ballcap(back);

  const hlAdd = (mesh, x, y, z) => { hAdd(mesh, x, y, z); gearParts.helmet.push(mesh); return mesh; };
  buildMarineHelmet(THREE, {
    add: hlAdd, mesh: (geo, mat) => addCast(new THREE.Mesh(geo, mat)),
    mats: { shellW, helmetMat, nvgMat, strapMat, pouchMat, buckleMat }
  });

  const nvgPivot = new THREE.Group();
  nvgPivot.position.set(0, 1.58 - HEAD_PIVOT_Y, 0.218);
  headG.add(nvgPivot);
  const link = (parent, a, b, w, d, mat) => { const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), mid = av.clone().add(bv).multiplyScalar(0.5), mesh = put(parent, rmesh(w, av.distanceTo(bv), d, mat, 0.003), mid.x, mid.y, mid.z); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize()); return mesh; };
  put(nvgPivot, cyl(0.017, 0.017, 0.078, nvgMat, 10), 0, 0, 0, 0, 0, Math.PI / 2);
  for (const sx of [-1, 1]) {
    link(nvgPivot, [sx * 0.027, 0, 0], [sx * 0.027, -0.089, 0.035], 0.012, 0.02, nvgMat);
    put(nvgPivot, cyl(0.013, 0.013, 0.012, buckleMat, 10), sx * 0.034, -0.089, 0.035, 0, 0, Math.PI / 2);
    link(nvgPivot, [sx * 0.025, -0.089, 0.035], [sx * 0.018, -0.13, 0.016], 0.012, 0.018, nvgMat);
  }
  put(nvgPivot, rmesh(0.043, 0.036, 0.057, nvgMat, 0.005), 0, -0.128, 0.027);
  put(nvgPivot, rmesh(0.148, 0.023, 0.033, nvgMat, 0.006), 0, -0.14, 0.035);
  const nvgLenses = [];
  for (const sx of [-0.055, 0.055]) {
    put(nvgPivot, cyl(0.033, 0.038, 0.12, nvgMat, 12), sx, -0.16, 0.055, Math.PI / 2);
    put(nvgPivot, cyl(0.04, 0.04, 0.022, goggleMat, 12), sx, -0.16, 0.109, Math.PI / 2);
    put(nvgPivot, cyl(0.037, 0.037, 0.02, goggleMat, 12), sx, -0.16, -0.006, Math.PI / 2);
    nvgLenses.push(put(nvgPivot, addCast(new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), lensMat)), sx, -0.16, 0.121));
  }
  detailMarineNvg(THREE, {
    pivot: nvgPivot, put, mesh: (geo, mat) => addCast(new THREE.Mesh(geo, mat)),
    mats: { nvgMat, helmetMat, buckleMat }
  });
  nvgPivot.rotation.x = -1.35;
  gearParts.nvg.push(nvgPivot);
  g.userData.nvgLenses = nvgLenses;

  for (const sx of [-1, 1]) {
    const cushion = hlAdd(addCast(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), padMat)), sx * 0.157, 1.398, -0.003); cushion.scale.set(0.021, 0.059, 0.045);
    const cup = hlAdd(addCast(new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), pouchMat)), sx * 0.18, 1.399, -0.003); cup.scale.set(0.026, 0.056, 0.043);
    hlAdd(cyl(0.016, 0.016, 0.016, nvgMat, 10), sx * 0.21, 1.488, -0.033).rotation.z = Math.PI / 2;
    for (const z of [-0.033, 0.028]) { const arm = link(headG, [sx * 0.214, 1.488 - HEAD_PIVOT_Y, -0.033], [sx * 0.204, 1.41 - HEAD_PIVOT_Y, z], 0.008, 0.009, nvgMat); gearParts.helmet.push(arm); }
    for (let k = 0; k < 3; k++) hlAdd(rmesh(0.004, 0.004, 0.021, nvgMat, 0.001), sx * 0.205, 1.373 + k * 0.008, 0.001);
  }
  const boomPath = new THREE.CatmullRomCurve3([[0.188, 1.38, 0.018], [0.18, 1.342, 0.075], [0.13, 1.326, 0.171], [0.061, 1.329, 0.193]].map(([x, y, z]) => new THREE.Vector3(x, y - HEAD_PIVOT_Y, z)));
  const micBoom = addCast(new THREE.Mesh(new THREE.TubeGeometry(boomPath, 14, 0.004, 5, false), nvgMat)); headG.add(micBoom); gearParts.helmet.push(micBoom);
  hlAdd(rmesh(0.043, 0.024, 0.023, nvgMat, 0.011), 0.061, 1.329, 0.193);

  const skinShade = new THREE.MeshStandardMaterial({ color: 0x9c7f5e, roughness: 0.9 });
  const scarMat = new THREE.MeshStandardMaterial({ color: 0xcfb28e, roughness: 0.6 });
  dress.mats.skinShade = skinShade; dress.mats.scar = scarMat;
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
  headG.add(buildMarineFeatures(THREE, {
    skinW, skinShade, hairW, irisW, eyeWhite: jawPrint,
    eyeDark: eyeMat, glint: glintMat, scarMat
  }));
  const balaclavaMesh = buildBalaclava(THREE, maskW);
  headG.add(balaclavaMesh);
  g.userData.balaclavaMesh = balaclavaMesh;

  const eyeG = new THREE.Group();
  eyeG.position.y = -HEAD_PIVOT_Y;
  headG.add(eyeG);
  dress.eyes.none = part(eyeG);
  buildMarineEyewear(THREE, { mats: eyewearMats, group: (style) => (dress.eyes[style] = part(eyeG)), mesh: (geo, mat) => addCast(new THREE.Mesh(geo, mat)) });
  g.userData.eyewearG = eyeG;

  // CL-185: live flexible shirt waist between pelvis (lowerBody) and chest (torsoG)
  const waist = !legacyBody ? createMarineWaist(THREE, g, { lower: lowerBody, torso: torsoG, projectUV: boxProjectUV }) : null;
  mergeRigidMeshes(g, gearParts, new Set([hip, ...patches, ...nvgLenses, ...(waist ? [waist.mesh] : [])]));
  { const src = hip.geometry.clone(), P = src.attributes.position, uvA = new Float32Array(P.count * 2); boxProjectUV(P.array, uvA); src.setAttribute('uv', new THREE.BufferAttribute(uvA, 2)); hip.geometry = src; }
  const wardrobe = {};
  for (const [item, m] of itemMats) wardrobe[item] = { mats: [...m.values()], meshes: [] };
  g.traverse((o) => { if (o.isMesh && matItem.has(o.material)) wardrobe[matItem.get(o.material)].meshes.push(o); });
  g.userData.wardrobe = wardrobe;
  g.userData.dress = dress;
  dressParts(g, null);

  g.userData.gripR = gripR;
  g.userData.weaponMount = weaponMount;
  g.userData.armLG = armLG;
  g.userData.armRG = armRG;
  g.userData.elbowLG = elbowLG;
  g.userData.gripL = gripL;
  g.userData.elbowRG = elbowRG;
  g.userData.wristLG = wristLG;
  g.userData.wristRG = wristRG;
  g.userData.forearmLG = elbowLG;
  g.userData.forearmRG = elbowRG;
  g.userData.legLG = legLG;
  g.userData.legRG = legRG;
  g.userData.kneeLG = legLG.userData.knee;
  g.userData.kneeRG = legRG.userData.knee;
  g.userData.ankleLG = legLG.userData.ankle;
  g.userData.ankleRG = legRG.userData.ankle;
  g.userData.hip = hip;
  g.userData.lowerBody = lowerBody;
  g.userData.torsoG = torsoG;
  g.userData.headG = headG;
  g.userData.nvgPivot = nvgPivot;
  g.userData.gearParts = gearParts;
  g.userData.hipGrip = hipGrip;
  for (const k of Object.keys(gearParts)) for (const m of gearParts[k]) m.visible = k.startsWith('bare');
  g.userData.torsoPivotY = TORSO_PIVOT_Y;
  g.userData.headPivotY = HEAD_PIVOT_Y;
  const aoMats = new Set([...matItem.keys(), skinW, hairW, strapMat, buckleMat, padMat]);
  g.userData.ao = { mats: aoMats, bootMats: new Set([bootW, soleW]), trouserMats: new Set([trouserW]), shirtMats: new Set([uniformW]) };
  g.userData.aoInfo = bakeMarineAO(THREE, g, g.userData.ao);
  return g;
}

// === Weapons, Carry Rig & Attachments (1:1 from index.html) ======================
function gunKit(gun) {
  const place = (m, x, y, z, rx, ry, rz, parent) => { m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; (parent || gun).add(m); return m; };
  return {
    box: (w, h, d, mat, x, y, z, rx, ry, rz, parent, r) => place(new THREE.Mesh(rbox(w, h, d, r), mat), x, y, z, rx, ry, rz, parent),
    cyl: (rt, rb, len, mat, x, y, z, parent, seg = 12, axis = 'z') => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, len, seg), mat);
      return place(m, x, y, z, axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0, parent);
    },
    tor: (r, t, mat, x, y, z, rx, ry, rz, parent, arc = Math.PI * 2, seg = 16) => place(new THREE.Mesh(new THREE.TorusGeometry(r, t, 6, seg, arc), mat), x, y, z, rx, ry, rz, parent),
    sph: (r, mat, x, y, z, parent, seg = 10) => place(new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg >> 1)), mat), x, y, z, 0, 0, 0, parent),
    disc: (r, mat, x, y, z, ry, parent, seg = 12) => place(new THREE.Mesh(new THREE.CircleGeometry(r, seg), mat), x, y, z, 0, ry || 0, 0, parent),
    group: (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); (parent || gun).add(g); return g; },
    slab: (pts, w, mat, o = {}) => place(new THREE.Mesh(profileSlab(pts, w, o.bevel == null ? 0.004 : o.bevel, o.segs || 2), mat), o.x || 0, o.y || 0, o.z || 0, o.rx, o.ry, o.rz, o.parent),
    lathe: (prof, mat, o = {}) => place(new THREE.Mesh(profileLathe(prof, o.seg || 14, o.phase || 0), mat), o.x || 0, o.y || 0, o.z || 0, o.rx, o.ry, o.rz, o.parent),
    rail: (len, x, y, z, parent, w = 0.042, side = 0) => {
      const p = parent || gun;
      if (side === 2) {
        place(new THREE.Mesh(rbox(w, 0.014, len, 0.003), gunDark), x, y, z, 0, 0, 0, p);
        for (let s = -len / 2 + 0.012; s < len / 2 - 0.006; s += 0.026) place(new THREE.Mesh(rbox(w + 0.006, 0.018, 0.01, 0.002), gunAccent), x, y - 0.002, z + s, 0, 0, 0, p);
      } else if (side) {
        place(new THREE.Mesh(rbox(0.014, w, len, 0.003), gunDark), x, y, z, 0, 0, 0, p);
        for (let s = -len / 2 + 0.012; s < len / 2 - 0.006; s += 0.026) place(new THREE.Mesh(rbox(0.018, w + 0.006, 0.01, 0.002), gunAccent), x + side * 0.002, y, z + s, 0, 0, 0, p);
      } else {
        place(new THREE.Mesh(rbox(w, 0.014, len, 0.003), gunDark), x, y, z, 0, 0, 0, p);
        for (let s = -len / 2 + 0.012; s < len / 2 - 0.006; s += 0.026) place(new THREE.Mesh(rbox(w + 0.006, 0.018, 0.01, 0.002), gunAccent), x, y + 0.002, z + s, 0, 0, 0, p);
      }
    }
  };
}
function gunBand(line, h) {
  const a = [], b = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[Math.max(0, i - 1)], q = line[Math.min(line.length - 1, i + 1)];
    const dz = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dz, dy) || 1;
    a.push([line[i][0] - dy / l * h, line[i][1] + dz / l * h]);
    b.push([line[i][0] + dy / l * h, line[i][1] - dz / l * h]);
  }
  return a.concat(b.reverse());
}
function gripOutline(cz, cy, h, d, rake, tang = 1) {
  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;
  const P = [[-0.06, 0.04], [0.28, 0.038], [0.42, 0.031], [0.53, 0.039], [0.64, 0.032], [0.94, 0.036], [0.985, 0.033], [1.0, 0.022],
             [1.0, -0.03], [0.985, -0.04], [0.55, -0.041], [0.16, -0.039], [0.04, -0.04 - 0.012 * tang], [-0.06, -0.04 - 0.012 * tang]];
  return P.map(([u, v]) => { const uu = (u - 0.5) * h, vv = v * k; return [cz - uu * sr + vv * cr, cy - uu * cr - vv * sr]; });
}
function gunArc(cz, cy, r, a0, a1, n = 8) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cz + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return out;
}

const flashGeo = new THREE.SphereGeometry(0.11, 8, 6);
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffdd55 });
function gunEffects(gun, mz) {
  const flash = new THREE.Mesh(flashGeo, flashMat);
  flash.position.copy(mz);
  flash.visible = false;
  gun.add(flash);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff2b1a, transparent: true, opacity: 0.9, depthWrite: false });
  const beamGeo = new THREE.CylinderGeometry(0.003, 0.003, 2.2, 6);
  beamGeo.rotateX(Math.PI / 2); beamGeo.translate(0, 0, 1.1);
  const laser = new THREE.Mesh(beamGeo, beamMat);
  laser.position.copy(mz);
  laser.visible = false;
  gun.add(laser);
  gun.userData.flash = flash;
  gun.userData.laser = laser;
  gun.userData.muzzleLocal = mz.clone();
  gun.userData.muzzleBase = mz.clone();
}
function gunSuppressor(gun, K, key) {
  const S = SUPPRESSOR[key], mz = gun.userData.muzzleLocal;
  if (!S || !mz) return;
  const can = K.group(mz.x, mz.y, mz.z - S.back);
  const r = S.r, L = S.len;
  const tube = S.look === 'ak' ? gunMetal : gunDark;
  K.cyl(r + 0.002, r + 0.002, 0.03, gunAccent, 0, 0, 0.015, can, 12);
  K.cyl(r, r, L - 0.04, tube, 0, 0, 0.03 + (L - 0.04) / 2, can, 14);
  can.visible = false; can.name = 'suppressor';
  gun.userData.suppressor = can;
  gun.userData.suppressorLen = L - S.back;
  gun.userData.muzzleBase = mz.clone();
  gun.userData.suppressed = false;
}
function layoutChainsawChain(gun) {
  const teeth = gun && gun.userData && gun.userData.chainTeeth;
  if (!teeth || !teeth.length) return;
  const L = 0.34, R = 0.055, straight = 2 * L, cap = Math.PI * R, total = 2 * straight + 2 * cap;
  const n = teeth.length;
  for (let i = 0; i < n; i++) {
    let s = ((i / n) % 1) * total, ang = 0;
    const pos = teeth[i].position;
    if (s < straight) { pos.set(0, R, -L + s); ang = 0; }
    else if ((s -= straight) < cap) { ang = s / R; pos.set(0, R * Math.cos(ang), L + R * Math.sin(ang)); }
    else if ((s -= cap) < straight) { pos.set(0, -R, L - s); ang = Math.PI; }
    else { s -= straight; ang = Math.PI + s / R; pos.set(0, R * Math.cos(ang), -L + R * Math.sin(ang)); }
    teeth[i].rotation.set(ang, 0, 0);
  }
}
function finishGun(gun) {
  const keep = new Set();
  for (const v of Object.values(gun.userData)) {
    if (v && v.isObject3D) keep.add(v);
    else if (Array.isArray(v)) for (const item of v) if (item && item.isObject3D) keep.add(item);
  }
  mergeRigidMeshes(gun, {}, keep);
  return gun;
}
const M240_PIVOT = new THREE.Vector3(0, 0.84, 0);
export function weaponModelContext() {
  return {
    THREE, gunKit, gunBand, gripOutline, gunArc, gunEffects, gunSuppressor, finishGun,
    mergeRigidMeshes, profileCurve, layoutChainsawChain, M240_PIVOT,
    gunMetal, gunBody, gunDark, gunMid, gunAccent, woodMat, bladeMat, gunPoly, gunRubber,
    woodDark, steelMat, brassMat, gunOlive, gunTan, magPoly, glassMat, sightDotMat,
    shellRedMat, fuelRedMat, hazardYellow, gaugeFace
  };
}

const MARINE_UPM = 1.655 / 1.80;
const WEAPON_SIZE = {
  pistol:   { len: 0.431, m: 0.195, look: 1.45, pos: [0.0, 0.07, 0.03],   scale: 1.05 },
  revolver: { len: 0.538, m: 0.27,  look: 1.4,  pos: [0.0, 0.07, 0.035],  scale: 1.08 },
  uzi:      { len: 0.725, m: 0.47,  look: 1.0,  pos: [0.0, 0.08, 0.03],   scale: 1.00 },
  m4:       { len: 1.423, m: 0.84,  look: 1.35, pos: [0.0, 0.10, 0.08],   scale: 0.92 },
  ak:       { len: 1.464, m: 0.88,  look: 1.35, pos: [0.0, 0.11, 0.09],   scale: 0.92 },
  aa12:     { len: 1.393, m: 0.96,  look: 1.2,  pos: [0.0, 0.12, 0.09],   scale: 0.90 },
  shotgun:  { len: 1.376, m: 1.0,   look: 1.25, pos: [0.0, 0.09, 0.07],   scale: 0.95 },
  sniper:   { len: 1.608, m: 1.15,  look: 1.25, pos: [0.0, 0.09, 0.14],   scale: 0.88 },
  launcher: { len: 1.091, m: 0.75,  look: 1.2,  pos: [0.0, -0.02, -0.04], scale: 0.92 },
  flamer:   { len: 1.094, m: 0.95,  look: 1.05, pos: [0.0, 0.07, 0.02],   scale: 1.00 },
  chainsaw: { len: 1.356, m: 0.85,  look: 1.2,  pos: [0.0, -0.05, -0.04], scale: 1.18 },
  minigun:  { pos: [0.02, 0.02, 0.02], scale: 0.88 }
};
function weaponSizeFactor(k) {
  const s = WEAPON_SIZE[k];
  if (!s) return 1;
  const base = s.len ? (s.m * (s.look || 1) * MARINE_UPM) / s.len : 1;
  return base * (s.scale == null ? 1 : s.scale);
}

export function buildAllWeapons() {
  const ctx = weaponModelContext();
  const meshes = {
    minigun: makeMinigunModel(ctx),
    m4: makeM4Model(ctx),
    ak: makeAkModel(ctx),
    aa12: makeAa12Model(ctx),
    pistol: makePistolModel(ctx),
    uzi: makeUziModel(ctx),
    shotgun: makeShotgunModel(ctx),
    revolver: makeRevolverModel(ctx),
    sniper: makeSniperModel(ctx),
    launcher: makeLauncherModel(ctx),
    flamer: makeFlamerModel(ctx),
    chainsaw: makeChainsawModel(ctx)
  };
  const GUN_BASE = {};
  for (const [k, gun] of Object.entries(meshes)) {
    const s = WEAPON_SIZE[k];
    if (s && s.pos) gun.position.set(s.pos[0], s.pos[1], s.pos[2]);
    const f = weaponSizeFactor(k);
    gun.scale.setScalar(f);
    gun.userData.sizeK = f;
    gun.userData.baseGunPos = gun.position.clone();
    gun.userData.baseGunRot = gun.rotation.clone();
    GUN_BASE[k] = { pos: gun.position.clone(), rot: gun.rotation.clone() };
  }
  return { meshes, ctx, GUN_BASE };
}

export function registerGunFurniture(guns) {
  const FURNITURE = new Set([woodMat, woodDark, gunPoly, gunOlive, gunTan]);
  const out = {};
  for (const [id, gun] of Object.entries(guns)) {
    const copies = new Map();
    gun.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || !FURNITURE.has(o.material)) return;
      let c = copies.get(o.material);
      if (!c) { c = o.material.clone(); c.name = 'furniture:' + id; c.userData.issueColor = c.color.getHex(); copies.set(o.material, c); }
      o.material = c;
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      const P = src.attributes.position, uv = new Float32Array(P.count * 2);
      boxProjectUV(P.array, uv);
      src.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      o.geometry = src;
    });
    out[id] = [...copies.values()];
  }
  return out;
}

export function dressGuns(gunFurniture, picks = {}) {
  if (!gunFurniture) return;
  for (const [id, mats] of Object.entries(gunFurniture)) {
    const key = picks[id];
    const tex = key && isGunFinishKey(key) ? camoTile(key) : null;
    const rune = tex && key === RUNE_FINISH_KEY;
    for (const mat of mats) {
      mat.map = tex;
      if (mat.emissive) {
        mat.emissiveMap = rune ? runeFinish.glowTex : null;
        mat.emissive.setHex(rune ? 0xffffff : 0x000000);
        mat.emissiveIntensity = rune ? 0.55 * Math.max(0, runeFinish.level) : 1;
      }
      mat.color.setHex(tex ? 0xe6e2d6 : mat.userData.issueColor);
      mat.needsUpdate = true;
    }
  }
}

const MOD_LOOK_MAT = new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.42, metalness: 0.62 });
const MOD_LOOK_RING = new THREE.MeshStandardMaterial({ color: 0x4a4e52, roughness: 0.35, metalness: 0.7 });
const HEAVY_LOOK = { m4: { r: 0.019, len: 0.2 }, ak: { r: 0.021, len: 0.19 }, uzi: { r: 0.022, len: 0.08 }, minigun: { r: 0.075, len: 0.24 } };
const EXT_GROWS = { aa12: 1, minigun: 1, flamer: 1 };

export function gunExtLook(gun, w, on) {
  const ud = gun.userData, mag = ud.mag;
  if (w === 'shotgun') {
    if (!ud.tubeExt) {
      const tube = new THREE.Group(), K = gunKit(tube);
      K.lathe([[0, 0.816], [0.022, 0.816], [0.022, 0.914], [0.026, 0.914], [0.026, 0.931], [0, 0.931]], gunDark, { y: -0.04, seg: 12 });
      tube.name = 'extendedTube'; gun.add(tube); ud.tubeExt = tube;
    }
    ud.tubeExt.visible = !!on;
    return;
  }
  if (!mag) return;
  if (!ud.magStretch) {
    ud.magBaseScale = mag.scale.clone();
    const shape = new THREE.Group(), tilt = w === 'uzi' ? 0.22 : w === 'pistol' ? 0.25 : 0;
    shape.name = 'magazineBody'; shape.rotation.x = tilt;
    const unrotate = new THREE.Matrix4().makeRotationX(-tilt);
    for (const part of [...mag.children]) { shape.add(part); part.applyMatrix4(unrotate); }
    mag.add(shape);
    const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity), v = new THREE.Vector3();
    shape.updateWorldMatrix(true, true);
    const inv = new THREE.Matrix4().copy(shape.matrixWorld).invert(), m = new THREE.Matrix4();
    shape.traverseVisible((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox; if (!bb) return;
      m.multiplyMatrices(inv, o.matrixWorld);
      for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) { v.set(x, y, z).applyMatrix4(m); hi.max(v); }
    });
    shape.userData.feedY = Number.isFinite(hi.y) ? hi.y : 0;
    ud.magStretch = shape;
  }
  const shape = ud.magStretch, scale = on ? (w === 'aa12' ? 1.22 : EXT_GROWS[w] ? 1.45 : 1.48) : 1;
  shape.scale.set(w === 'aa12' ? scale : 1, scale, w === 'aa12' ? scale : 1);
  shape.position.set(0, shape.userData.feedY * (1 - scale), 0).applyEuler(shape.rotation);
}

export function gunHeavyLook(gun, w, on) {
  const ud = gun.userData, H = HEAVY_LOOK[w];
  if (!H) return;
  if (ud.heavyLook === undefined) {
    ud.heavyLook = null;
    const mz = ud.muzzleBase || ud.muzzleLocal;
    if (mz) {
      const g = new THREE.Group(); g.name = 'heavyBarrelLook';
      const back = (SUPPRESSOR[w] ? (SUPPRESSOR[w].heavyBack || SUPPRESSOR[w].back) : 0.02) + 0.012;
      const z1 = mz.z - back, z0 = z1 - H.len;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(H.r, H.r, H.len, 14), MOD_LOOK_MAT);
      tube.rotation.x = Math.PI / 2; tube.position.set(mz.x, mz.y, (z0 + z1) / 2); g.add(tube);
      for (let k = 0; k < 4; k++) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(H.r * 1.14, H.r * 1.14, H.len * 0.05, 14), MOD_LOOK_RING);
        ring.rotation.x = Math.PI / 2; ring.position.set(mz.x, mz.y, z0 + H.len * (0.14 + k * 0.24)); g.add(ring);
      }
      g.visible = false; gun.add(g); ud.heavyLook = g;
    }
  }
  if (ud.heavyLook) ud.heavyLook.visible = !!on;
}

export function fitGunSuppressor(gun, w, on) {
  const spec = SUPPRESSOR[w];
  if (!spec || !gun) return;
  const ud = gun.userData;
  if (!ud.muzzleBase) ud.muzzleBase = ud.muzzleLocal.clone();
  if (!ud.suppressor) {
    const can = makeSuppressorGroup({ THREE, gunKit, mats: { gunMetal, gunDark } }, spec);
    const b = ud.muzzleBase;
    can.position.set(b.x, b.y, b.z - (spec.back || 0));
    gun.add(can);
    ud.suppressor = can;
  }
  ud.suppressor.visible = !!on;
  const dz = on ? spec.len - (spec.back || 0) : 0;
  ud.muzzleLocal.set(ud.muzzleBase.x, ud.muzzleBase.y, ud.muzzleBase.z + dz);
  if (ud.flash) ud.flash.position.z = ud.muzzleLocal.z;
}

// === Carry Rig (1:1 from index.html lines 19950-20230) ===========================
const CARRY_SLOTS = { mags: 5, grenades: 4, shells: 10, rounds40: 6, boxes: 2, tanks: 2 };
const CARRY_SLING_SCALE = { minigun: 0.62, flamer: 0.8, chainsaw: 0.8, sniper: 0.85, launcher: 0.9 };
const carryMats = {
  mag: new THREE.MeshStandardMaterial({ color: 0x24272b, roughness: 0.5, metalness: 0.5 }),
  shell: new THREE.MeshStandardMaterial({ color: 0x8e2a22, roughness: 0.55, metalness: 0.1 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xa8843c, roughness: 0.4, metalness: 0.7 }),
  grenade: new THREE.MeshStandardMaterial({ color: 0x4b5434, roughness: 0.7, metalness: 0.2 }),
  box: new THREE.MeshStandardMaterial({ color: 0x4a5236, roughness: 0.8, metalness: 0.2 }),
  tank: new THREE.MeshStandardMaterial({ color: 0x6d705c, roughness: 0.55, metalness: 0.45 })
};

export const CARRY_FIT = {
  pistol:   { s: 1 },
  revolver: { s: 1, holster: [[0.004, -0.008, 0], [-0.004, -0.007, 0]], holsterBand: [[0.006, -0.011, -0.001], [-0.005, -0.01, -0.001]] },
  uzi:      { s: 1, holster: [[-0.001, -0.009, 0.001], [0.002, -0.034, 0.002]], holsterBand: [[0.003, 0.04, -0.003], [0.001, -0.02, 0.001]] },
  m4:       { s: 1, sling: [[-0.034, -0.03, -0.004], [0.002, -0.001, 0]] },
  ak:       { s: 1, sling: [[0.008, 0.008, 0.001], [0.001, -0.001, 0]] },
  aa12:     { s: 1, sling: [[0.021, 0.017, 0.003], [-0.021, 0.017, 0.003]] },
  shotgun:  { s: 1, sling: [[-0.047, -0.038, -0.006], [0.041, -0.034, -0.005]] },
  sniper:   { s: 1, sling: [[0.017, 0.016, 0.002], [0.002, -0.002, 0]] },
  launcher: { s: 1, sling: [[-0.006, -0.004, -0.001], [0.021, -0.014, -0.003]] },
  flamer:   { s: 1, sling: [[0.062, 0.057, 0.007], [0.004, -0.003, 0]] },
  chainsaw: { s: 1, sling: [[0.004, 0.003, 0.001], [-0.016, 0.014, 0.002]] }
};
const _fitA = new THREE.Vector3(), _fitB = new THREE.Vector3();
function fitCarriedGun(spot, cls, band) {
  const gun = spot && spot.gun, f = gun && CARRY_FIT[spot.kind];
  if (!f) return;
  let m = spot.g;
  while (m && !(m.userData && m.userData.weaponMount)) m = m.parent;
  const mount = m && m.userData.weaponMount;
  let rel = 1;
  if (mount) {
    mount.updateWorldMatrix(true, false); spot.g.updateWorldMatrix(true, false);
    rel = mount.getWorldScale(_fitA).x / (spot.g.getWorldScale(_fitB).x || 1);
  }
  gun.scale.setScalar(rel * (f.s || 1));
  const set = (band && f[cls + 'Band']) || f[cls], o = set && set[spot.g.position.x < 0 ? 1 : 0];
  if (o) gun.position.set(o[0], o[1], o[2]); else gun.position.set(0, 0, 0);
}
export function fitCarriedGuns(rig) {
  rig.slings.forEach((s) => { fitCarriedGun(s, 'sling'); fitWeaponSling(THREE, s, rig.slingVest, carryMats.mag); });
  const band = !!(rig.bandolier && rig.bandolier.visible) || !!(rig.belt40 && rig.belt40.visible);
  for (const h of rig.holsters.concat(rig.pairs)) fitCarriedGun(h, 'holster', band);
  fitCarriedGun(rig.hip, 'hip'); fitCarriedGun(rig.hipPair, 'hip');
}

function carryGunCopy(weaponMeshes, kind) {
  const src = weaponMeshes[kind];
  if (!src) return null;
  const g = cloneLean(src);
  const lights = [];
  g.traverse((o) => { if (o.isLight) lights.push(o); });
  for (const l of lights) if (l.parent) l.parent.remove(l);
  const fx = new Set();
  for (const [k, v] of Object.entries(src.userData)) if (v && v.isObject3D && /laser|flash|reloadShell|beam|glow/i.test(k)) fx.add(v);
  const orig = [], copy = [];
  src.traverse((o) => { if (!o.isLight) orig.push(o); });
  g.traverse((o) => copy.push(o));
  orig.forEach((o, i) => { if (fx.has(o) && copy[i]) copy[i].visible = false; });
  for (const [key, base] of [['mag', 'Mag'], ['ammoBox', 'Ammo'], ['slide', 'Slide'], ['bolt', 'Bolt'],
    ['pump', 'Pump'], ['cylinder', 'Cylinder'], ['hammer', 'Hammer'], ['drum', 'Drum']]) {
    const part = src.userData[key], clone = part && copy[orig.indexOf(part)];
    if (!clone) continue;
    const pos = src.userData['base' + base + 'Pos'], rot = src.userData['base' + base + 'Rot'];
    if (pos) clone.position.copy(pos);
    if (rot) clone.rotation.copy(rot);
    clone.visible = true;
  }
  g.userData = { carryKind: kind };
  g.visible = true;
  g.position.set(0, 0, 0); g.rotation.set(0, 0, 0);
  const inv = new THREE.Matrix4(), m = new THREE.Matrix4(), v = new THREE.Vector3();
  g.updateMatrixWorld(true);
  inv.copy(g.matrixWorld).invert();
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  g.traverseVisible((o) => {
    if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const P = o.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i), P.getZ(i)).applyMatrix4(m); lo.min(v); hi.max(v); }
  });
  const wrap = new THREE.Group();
  if (Number.isFinite(lo.x)) g.position.set(-(lo.x + hi.x) / 2 * g.scale.x, -(lo.y + hi.y) / 2 * g.scale.y, -(lo.z + hi.z) / 2 * g.scale.z);
  wrap.add(g);
  wrap.userData.length = Number.isFinite(lo.z) ? (hi.z - lo.z) * g.scale.z : 0.6;
  return wrap;
}

function carryInstanced(geo, mat, n, place) {
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { place(o, i); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = 0;
  mesh.castShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

export function buildCarryRig(m, weaponMeshes) {
  const put = (parent, mesh, x, y, z) => { mesh.position.set(x, y, z); parent.add(mesh); return mesh; };
  const strapMat = webMat, buckleMat = carryMats.mag;
  const ud = m.userData, torso = ud.torsoG, hipsG = ud.lowerBody;
  const tp = ud.torsoPivotY || 0.7;
  const T = (x, y, z) => new THREE.Vector3(x, y - tp, z);
  const rig = { slings: [], holsters: [], pairs: [], copies: new Map(), sig: '', t: 0, weaponMeshes, marine: m };
  for (const sx of [1, -1]) {
    const g = new THREE.Group();
    g.position.copy(T(sx * 0.29, 1.04, -0.255));
    g.rotation.set(-Math.PI / 2, 0, -sx * 0.12, 'ZXY');
    g.scale.setScalar(0.85);
    torso.add(g);
    const sling = addCast(new THREE.Mesh(new THREE.BufferGeometry(), webMat));
    sling.userData.torsoPivotY = tp;
    g.add(sling);
    rig.slings.push({ g, sling, kind: null });
  }
  for (const sx of [1, -1]) {
    const g = new THREE.Group();
    g.position.copy(T(sx * 0.255, 0.93, -0.1));
    g.rotation.set(-0.35, Math.PI, 0);
    g.scale.setScalar(0.8);
    torso.add(g);
    const shell = rmesh(0.085, 0.09, 0.23, leatherMat, 0.016);
    shell.position.set(0, -0.005, 0.05);
    g.add(shell);
    rig.holsters.push({ g, shell, kind: null });
    const extra = new THREE.Group(); torso.add(extra);
    const extraShell = shell.clone(); extra.add(extraShell);
    rig.pairs.push({ g: extra, shell: extraShell, kind: null });
  }
  const PACK_FIT = { pistol: { x: 0.115, y: 1.02, z: -0.333, tilt: -0.15 }, revolver: { x: 0.115, y: 1.02, z: -0.327, tilt: 0 } };
  rig.packFit = PACK_FIT;
  rig.placeSecondary = (spot, side, lower = false) => {
    const fit = lower && PACK_FIT[spot.kind], rev = !!fit, gripIn = rev ? -1 : 1;
    spot.g.position.copy(T(lower ? side * (rev ? fit.x : 0.19) : side * 0.12, lower ? (rev ? fit.y : 0.76) : 1.01, lower ? (rev ? fit.z : -0.39) : -0.295));
    spot.g.rotation.set(lower ? Math.PI / 2 + (rev ? fit.tilt : 0) : -Math.PI / 2, 0, lower ? side * -0.12 : side * 0.72, 'ZXY');
    spot.g.scale.setScalar(lower ? 0.68 : 0.72);
    if (spot.gun) spot.gun.rotation.z = gripIn * (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    spot.shell.scale.set(lower ? 1 : 0.8, lower ? 1 : 0.28, lower ? 1 : 0.3);
    spot.shell.position.set(lower ? -gripIn * side * 0.055 : 0, lower ? 0 : 0.025, lower ? 0.11 : -0.03);
    if (!spot.loop) {
      spot.loop = rmesh(0.032, 0.02, 0.258, leatherMat, 0.006);
      spot.loop.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.15, -0.21).normalize());
      spot.g.add(spot.loop);
    }
    spot.loop.visible = lower;
    spot.loop.position.set(-gripIn * side * 0.055, 0.075, -0.105);
  };
  const harness = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.032, 0.014), leatherMat));
  harness.position.copy(T(0, 0.95, -0.19));
  torso.add(harness);
  rig.harness = harness;

  const hip = new THREE.Group();
  hip.position.set(-0.228, 0.57, 0.035);
  hip.rotation.set(Math.PI / 2, 0, 0.1);
  hip.scale.setScalar(0.8);
  hipsG.add(hip);
  rig.hip = { g: hip, kind: null };
  const hipPair = new THREE.Group(); hipPair.position.set(0.228, 0.57, 0.035);
  hipPair.rotation.set(Math.PI / 2, 0, -0.1); hipPair.scale.setScalar(0.8); hipsG.add(hipPair);
  const hipShell = addCast(new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.07, 0.15), leatherMat));
  hipShell.position.set(0, 0, 0.05); hipPair.add(hipShell);
  rig.hipPair = { g: hipPair, shell: hipShell, kind: null };

  const MAG_AT = [[-0.125, 0.705, 0.142], [0.125, 0.705, 0.142], [-0.098, 0.975, 0.191], [0, 0.975, 0.191], [0.098, 0.975, 0.191]];
  rig.mags = carryInstanced(new THREE.BoxGeometry(0.045, 0.05, 0.024), carryMats.mag, CARRY_SLOTS.mags, (o, i) => o.position.copy(T(...MAG_AT[i])));
  torso.add(rig.mags);

  rig.grenades = carryInstanced(new THREE.SphereGeometry(0.034, 10, 8), carryMats.grenade, CARRY_SLOTS.grenades, (o, i) => { o.position.copy(T(0.215, 0.62, 0.08 - i * 0.062)); o.scale.set(1, 1.2, 1); });
  torso.add(rig.grenades);

  const band = (dir) => {
    const g = new THREE.Group();
    g.position.copy(T(0, 0.98, 0));
    g.rotation.z = dir * 0.62;
    const points = [[0, -0.33, 0.14], [0, -0.27, 0.225], [0, 0, 0.255], [0, 0.22, 0.22], [0, 0.25, 0.02], [0, 0.22, -0.15], [0, 0, -0.25], [0, -0.31, -0.14], [0, -0.35, 0]];
    const variants = [false, true].map((vest) => {
      const v = new THREE.Group(), fit = bandolierFit(dir, vest, dir === 1 ? 0.032 : 0);
      v.add(addCast(new THREE.Mesh(webbingGeometry(THREE, points, 0.06, 0.007, { closed: true, segments: 64, fit }), webMat)));
      for (let j = 0; j < 10; j++) { const y = -0.27 + j * 0.054, p = fit(new THREE.Vector3(0, y, 0.2)); put(v, rmesh(0.065, 0.012, 0.012, strapMat, 0.003), 0, y, p.z + 0.008); }
      const p = fit(new THREE.Vector3(0, -0.235, 0.2));
      put(v, rmesh(0.074, 0.043, 0.015, buckleMat, 0.005), 0, p.y, p.z + 0.01);
      put(v, rmesh(0.052, 0.026, 0.016, webMat, 0.003), 0, p.y, p.z + 0.019);
      mergeRigidMeshes(v, {}, new Set()); g.add(v); return v;
    });
    g.userData.fit = (vest, ammo) => {
      variants[0].visible = !vest; variants[1].visible = !!vest;
      const fit = bandolierFit(dir, vest, dir === 1 ? 0.032 : 0), o = new THREE.Object3D();
      for (let i = 0; i < ammo.instanceMatrix.count; i++) {
        o.position.copy(fit(new THREE.Vector3(0, dir === 1 ? -0.25 + i * 0.09 : -0.27 + i * 0.054, 0.2)));
        o.position.z += dir === 1 ? 0.025 : 0.016; o.rotation.z = Math.PI / 2; o.updateMatrix(); ammo.setMatrixAt(i, o.matrix);
      }
      ammo.instanceMatrix.needsUpdate = true; ammo.computeBoundingSphere();
    };
    torso.add(g);
    return g;
  };
  rig.bandolier = band(-1);
  rig.shells = carryInstanced(new THREE.CylinderGeometry(0.011, 0.011, 0.05, 8), carryMats.shell, CARRY_SLOTS.shells, (o, i) => { const y = -0.27 + i * 0.054; o.position.set(0, y, 0.27 - 0.035 * (y / 0.24) ** 2); o.rotation.z = Math.PI / 2; });
  rig.bandolier.add(rig.shells);
  rig.belt40 = band(1);
  rig.rounds40 = carryInstanced(new THREE.CylinderGeometry(0.02, 0.02, 0.045, 10), carryMats.brass, CARRY_SLOTS.rounds40, (o, i) => { const y = -0.25 + i * 0.09; o.position.set(0, y, 0.279 - 0.035 * (y / 0.24) ** 2); o.rotation.z = Math.PI / 2; });
  rig.belt40.add(rig.rounds40);

  rig.boxes = carryInstanced(new THREE.BoxGeometry(0.09, 0.1, 0.13), carryMats.box, CARRY_SLOTS.boxes, (o, i) => o.position.copy(T(-0.195, 0.9 + i * 0.11, -0.245)));
  torso.add(rig.boxes);
  rig.tanks = carryInstanced(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 12), carryMats.tank, CARRY_SLOTS.tanks, (o, i) => { o.position.copy(T(0, 1.235, -0.28 + i * 0.1)); o.rotation.z = Math.PI / 2; });
  torso.add(rig.tanks);
  if (ud.hipGrip) ud.hipGrip.visible = false;
  ud.carry = rig;
  ud.carryRig = rig;
  return rig;
}

function mountCarryGun(rig, spot, key, kind) {
  if (spot.kind === kind) return;
  if (spot.gun) spot.g.remove(spot.gun);
  spot.gun = kind ? carryGunCopy(rig.weaponMeshes, kind) : null;
  if (spot.gun) {
    if (key.startsWith('sling')) spot.gun.scale.setScalar(CARRY_SLING_SCALE[kind] || 1);
    spot.g.add(spot.gun);
  }
  spot.kind = kind;
}

export function applyCarryPlan(rig, plan, vestOn = true) {
  rig.slingVest = vestOn;
  rig.slings.forEach((s, i) => {
    const k = plan.slung[i];
    mountCarryGun(rig, s, 'sling' + i, k);
    s.sling.visible = !!k;
  });
  const secKinds = plan.holstered || [null, null];
  const pairKinds = plan.holsteredPairs || [null, null];
  rig.holsters.forEach((h, i) => {
    const k = secKinds[i];
    mountCarryGun(rig, h, 'holster' + i, k);
    h.g.visible = !!k;
  });
  rig.pairs.forEach((h, i) => {
    const k = pairKinds[i];
    mountCarryGun(rig, h, 'pair' + i, k);
    h.g.visible = !!k;
  });
  for (let i = 0; i < 2; i++) {
    const kind = secKinds[i], side = secKinds.indexOf(kind) === i ? 1 : -1;
    rig.placeSecondary(rig.holsters[i], side, kind !== 'uzi');
    rig.placeSecondary(rig.pairs[i], -side, kind !== 'uzi');
  }
  rig.harness.visible = secKinds.some(Boolean);
  mountCarryGun(rig, rig.hip, 'hip', plan.hip);
  mountCarryGun(rig, rig.hipPair, 'hipPair', plan.hipPair || null);
  rig.hipPair.g.visible = !!plan.hipPair;

  const c = plan.counts;
  rig.mags.count = c.mags;
  rig.grenades.count = c.grenades;
  rig.shells.count = c.shells;
  rig.rounds40.count = c.rounds40;
  rig.boxes.count = c.boxes;
  rig.tanks.count = c.tanks;
  rig.bandolier.visible = !!(plan.bands.bandolier && c.shells > 0);
  rig.belt40.visible = !!(plan.bands.belt40 && c.rounds40 > 0);
  rig.bandolier.userData.fit(vestOn, rig.shells);
  rig.belt40.userData.fit(vestOn, rig.rounds40);
  fitCarriedGuns(rig);
}
// === Blades, Props, Wardrobe Sync & Weapon Hold IK (1:1 from index.html) ===========
export function buildBladeMeshesAndProps(marine) {
  const ctx = weaponModelContext();
  const knife = makeKnifeModel(ctx);
  knife.position.set(0.0, 0.0, 0.04);
  knife.scale.setScalar(1.15);
  (marine.userData.gripL || marine.userData.weaponMount).add(knife);
  {
    const k = makeKatanaModel({ THREE });
    k.visible = false;
    knife.add(k);
    knife.userData.katanaModel = k;
  }
  const BLADE_SIZE = {
    knifeModel:   { len: 0.603, m: 0.30, look: 1.3 },
    macheteModel: { len: 0.92,  m: 0.62, look: 1.15 },
    katanaModel:  { len: 0.92,  m: 0.98, look: 1.1 }
  };
  for (const k in BLADE_SIZE) {
    if (knife.userData[k]) knife.userData[k].scale.multiplyScalar(BLADE_SIZE[k].m * BLADE_SIZE[k].look * MARINE_UPM / BLADE_SIZE[k].len);
  }
  knife.visible = false;

  const katanaWorn = makeSheathedKatana({ THREE });
  {
    const hips = marine.userData.lowerBody || marine;
    const at = new THREE.Group();
    at.position.set(0.25, 0.76, 0.06);
    at.rotation.set(0, Math.PI, -0.18);
    hips.add(at);
    katanaWorn.rotation.x = 0.36;
    katanaWorn.scale.setScalar(1.05);
    katanaWorn.visible = false;
    at.add(katanaWorn);
  }

  const grenadeHand = new THREE.Group();
  const grBodyMat = new THREE.MeshStandardMaterial({ color: 0x3b4828, roughness: 0.55, metalness: 0.25 });
  const grSpoonMat = new THREE.MeshStandardMaterial({ color: 0x6a7068, roughness: 0.35, metalness: 0.75 });
  const grPinMat = new THREE.MeshStandardMaterial({ color: 0xd4b84a, roughness: 0.3, metalness: 0.85 });
  const grBandMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.45, metalness: 0.3 });
  const grHull = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), grBodyMat);
  grHull.scale.set(1, 1.25, 1); grenadeHand.add(grHull);
  const grBand = new THREE.Mesh(new THREE.CylinderGeometry(0.043, 0.043, 0.014, 10), grBandMat);
  grBand.position.y = 0.012; grenadeHand.add(grBand);
  const grNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.024, 8), grSpoonMat);
  grNeck.position.y = 0.058; grenadeHand.add(grNeck);
  const grHead = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.032), grSpoonMat);
  grHead.position.set(0, 0.074, 0.003); grenadeHand.add(grHead);
  const grSpoon = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.072, 0.008), grSpoonMat);
  grSpoon.position.set(0, 0.032, 0.038); grSpoon.rotation.x = 0.14; grenadeHand.add(grSpoon);
  const grPin = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 12), grPinMat);
  grPin.position.set(0.02, 0.072, 0.008); grPin.rotation.y = Math.PI / 2;
  grenadeHand.add(grPin);
  grenadeHand.userData.pin = grPin;
  grenadeHand.position.set(0, -0.02, 0.03);
  grenadeHand.visible = false;
  marine.userData.gripL.add(grenadeHand);

  const lighterHand = new THREE.Group();
  const lighterBody = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.038, 0.012), new THREE.MeshStandardMaterial({ color: 0xc4a24b, roughness: 0.3, metalness: 0.85 }));
  const lighterFlame = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.028, 8), new THREE.MeshBasicMaterial({ color: 0xffaa22 }));
  lighterFlame.position.y = 0.032;
  lighterHand.add(lighterBody, lighterFlame);
  lighterHand.position.set(0, -0.02, 0.04);
  lighterHand.visible = false;
  marine.userData.gripR.add(lighterHand);

  // Carried mortar & M240B meshes (1:1 from index.html lines 30921-30958)
  const carriedMortarMesh = makeMortarModel(ctx, null, true);
  carriedMortarMesh.scale.setScalar(0.78);
  carriedMortarMesh.position.set(0.2, 1.06, -0.12);
  carriedMortarMesh.rotation.set(-0.55, 0.22, 0.34);
  carriedMortarMesh.visible = false;
  marine.add(carriedMortarMesh);

  const carriedM240Mesh = new THREE.Group();
  {
    const inner = makeM240Model(ctx, true);
    inner.position.set(-0, -0.84, 0.16);
    carriedM240Mesh.add(inner);
    carriedM240Mesh.userData.gun = inner;
    carriedM240Mesh.name = 'carried-m240';
    carriedM240Mesh.scale.setScalar(0.86);
    carriedM240Mesh.position.set(0.41, 1.14, 0.05);
    carriedM240Mesh.rotation.set(-0.26, 0.0, -0.13);
    carriedM240Mesh.visible = false;
    marine.add(carriedM240Mesh);
  }

  return { knife, katanaWorn, grenadeHand, lighterHand, carriedMortarMesh, carriedM240Mesh };
}

export function syncMarineAppearance(m, state) {
  const gp = m.userData.gearParts;
  if (!gp) return;

  // Build wardrobeState for applyWardrobe and dressParts (1:1 with index.html)
  const wState = defaultWardrobe(state.camoUniform || 'm81');
  wState.items.shirt.camo = state.camoUniform || 'm81';
  wState.items.trousers.camo = state.camoUniform || 'm81';
  wState.items.carrier.camo = state.camoVest || 'coyoteBrown';
  wState.items.pads.camo = state.camoPouches || 'coyoteBrown';
  wState.items.holster.camo = state.camoPouches || 'coyoteBrown';
  wState.items.belt.camo = state.camoPouches || 'coyoteBrown';
  wState.items.pack.camo = state.camoPack || 'm81';
  wState.items.helmet.camo = state.camoHelmet || 'm81';
  wState.items.cap.camo = state.camoHelmet || 'm81';
  wState.items.gloves.camo = state.camoGloves || 'coyoteBrown';
  wState.items.shirt.sleeves = state.sleevesMode === 'rolled' ? 'rolled' : 'down';
  wState.items.trousers.cut = state.trouserCut === 'shorts' ? 'shorts' : 'trousers';
  wState.items.gloves.worn = !!state.gear_gloves;
  wState.items.cap.style = state.dressHat && state.dressHat !== 'none' ? state.dressHat : 'cover';
  wState.items.eyewear.style = state.dressEyewear || 'none';
  wState.items.boots.colour = BOOT_HEX[state.dressBootColor] ? state.dressBootColor : 'black';
  wState.body.skin = Number(state.dressSkin) || 0;
  wState.body.eyes = state.dressEyes || 'brown';
  wState.body.hair = state.dressHairColor || 'darkBrown';

  applyWardrobe(m, wState);
  dressParts(m, wState);

  // Soft cap vs bare head when helmet is off
  if (m.userData.dress && m.userData.dress.hats) {
    for (const [k, grp] of Object.entries(m.userData.dress.hats)) {
      grp.visible = !state.gear_helmet && state.dressHat === k;
    }
  }

  // gearParts visibility (1:1 with applyGearVisibility in index.html line 20799)
  const setGp = (k, on) => { if (gp[k]) for (const o of gp[k]) o.visible = on; };
  setGp('helmet', !!state.gear_helmet);
  setGp('bareHead', !state.gear_helmet);
  setGp('nvg', !!state.gear_helmet && !!state.gear_nvg);
  setGp('vest', !!state.gear_vest);
  setGp('bareTorso', !state.gear_vest && !!state.gear_pouches);
  setGp('pads', !!state.gear_pouches);

  if (m.userData.nvgPivot) {
    m.userData.nvgPivot.rotation.x = state.gear_nvgDown ? 0 : -1.35;
  }

  // Wardrobe slot mesh toggles (pack, shirt, trousers, boots, balaclava)
  const w = m.userData.wardrobe;
  if (w) {
    if (w.pack) for (const o of w.pack.meshes) o.visible = !!state.gear_pack;
    if (w.shirt) for (const o of w.shirt.meshes) o.visible = !!state.gear_shirt;
    if (w.trousers) for (const o of w.trousers.meshes) o.visible = !!state.gear_trousers;
    if (w.boots) for (const o of w.boots.meshes) o.visible = !!state.gear_boots;
    if (w.mask) for (const o of w.mask.meshes) o.visible = false;
  }
  if (m.userData.bareFaceDetails) m.userData.bareFaceDetails.visible = true;
  if (m.userData.waist && m.userData.waist.mesh) m.userData.waist.mesh.visible = !!state.gear_shirt;

  // Insulated boots tint (1:1 with tintInsulatedBoots in index.html line 9724)
  if (state.gear_insulatedBoots && w && w.boots) {
    for (const mat of w.boots.mats) {
      if (mat.userData.dress === 'colour') {
        mat.map = null;
        mat.color.setHex(BOOTS_HEX);
        mat.needsUpdate = true;
      }
    }
  }

  if (m.userData.katanaWorn) m.userData.katanaWorn.visible = !!state.modKatanaWorn;
  followMarineWaist(THREE, m.userData);
  if (m.userData.waist && m.userData.waist.bend) m.userData.waist.bend();
}

// === Weapon Hold & 2-Bone Arm IK (1:1 verbatim from index.html lines 41976-42755) ===
export const WEAPON_HOLD = {
  pistol:   { twist: 0.1, hold: [-0.32, -0.08, 0.4], grip: [0, -0.066, -0.016], trig: [0, -0.05, 0.073], fore: [-0.058, -0.09, 0.012] },
  revolver: { twist: 0.1, hold: [-0.32, -0.08, 0.4], grip: [0, -0.07, -0.04], trig: [0, -0.02, 0.035], fore: [-0.058, -0.1, -0.014] },
  uzi:      { twist: 0.2, hold: [-0.3, -0.16, 0.34], grip: [0, -0.088, -0.017], trig: [0, -0.056, 0.05], fore: [0, -0.03, 0.18] },
  m4:       { twist: 0.8, hold: [-0.24, -0.12, 0.28], grip: [0, -0.106, -0.076], trig: [0, -0.078, -0.011], fore: [0, 0.0, 0.36], sh: { butt: [0, -0.003, -0.569], eye: [0, 0.134, -0.20] } },
  ak:       { twist: 0.8, hold: [-0.24, -0.12, 0.28], grip: [0, -0.126, -0.095], trig: [0, -0.062, -0.019], fore: [0, -0.02, 0.37], sh: { butt: [0, -0.078, -0.597], eye: [0, 0.09, -0.30] } },
  aa12:     { twist: 0.8, hold: [-0.24, -0.13, 0.26], grip: [0, -0.145, -0.096], trig: [0, -0.104, -0.016], fore: [0, -0.015, 0.36], sh: { butt: [0, -0.005, -0.572], eye: [0, 0.16, -0.30] } },
  shotgun:  { twist: 0.8, hold: [-0.24, -0.12, 0.24], grip: [0, -0.088, -0.056], trig: [0, -0.058, 0.023], fore: 'pump', pumpDy: -0.015, sh: { butt: [0, -0.02, -0.496], eye: [0, 0.08, -0.28] } },
  sniper:   { twist: 0.8, hold: [-0.24, -0.12, 0.28], grip: [0, -0.088, -0.117], trig: [0, -0.064, -0.052], fore: [0, -0.005, 0.35], sh: { butt: [0, -0.018, -0.622], eye: [0, 0.15, -0.40] } },
  launcher: { twist: 0.8, hold: [-0.24, -0.14, 0.26], grip: [0, -0.088, -0.046], trig: [0, -0.074, 0.014], fore: [0, -0.075, 0.42], sh: { butt: [0, 0.008, -0.504], eye: [0, 0.19, -0.18] } },
  minigun:  { twist: 0.6, hold: [-0.3, -0.3, 0.2], grip: [0, 0.2, -0.28], fore: [0, 0.14, -0.05] },
  flamer:   { twist: 0.6, hold: [-0.26, -0.26, 0.22], grip: [0, -0.078, -0.157], trig: [0, -0.048, -0.09], fore: [0, -0.07, 0.28] },
  chainsaw: { twist: 0.5, hold: [-0.24, -0.34, 0.22], grip: [0, -0.086, -0.176], trig: [0, -0.075, -0.115], fore: [0, 0.18, 0.02], level: true }
};

export const SHOULDER_HOLD = {
  pocket: [0.20, 0.33, 0.17],
  adsPocket: [0.17, 0.40, 0.18],
  rollR: [-0.04, -0.02, 0.10],
  rollL: [0.03, 0, 0.06],
  neck: [0, 0.40, -0.02],
  eye: [0.045, 0.215, 0.125],
  cheekMax: 0.5,
  reach: 0.54
};

export const UNARMED_ARMS = {
  x: 0.03, y: 0, z: 0.04, elbow: -0.18,
  armR: [0.03, 0, 0.04], elbowR: [-0.18, 0, 0],
  armL: [0.03, 0, -0.04], elbowL: [-0.18, 0, 0]
};

export const AKIMBO_CARRY = {
  run: 1, walk: 0.5, rate: 7, hold: 0.5, at: [-0.15, 0.1, 0.15], up: 1.25, presentX: -0.15,
  fwd: [-0.3, 0.6], retreatReach: 0.07,
  elbow: [0.265, 0.14, 0.0], presentElbow: [0.22, 0.14, 0.12]
};

const IK_UPPER = 0.28;
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const _AXIS_Y = new THREE.Vector3(0, 1, 0);
const _POLE_R = new THREE.Vector3(0.55, -0.8, -0.25);
const _POLE_L = new THREE.Vector3(-0.55, -0.8, -0.1);
const _HAND_R = new THREE.Vector3(-0.01, -0.26, 0.12);
const _HAND_L = new THREE.Vector3(0.02, -0.27, 0.13);

const HANDS = {
  rollMax: 0.85,
  reachL: 0.52,
  knifeYaw: 0.5,
  drawFit: true,
  rake: 0.25,
  fore: { launcher: 'up', flamer: 'up', pistol: 'grip', revolver: 'grip', chainsaw: 'across' },
  skip: { minigun: true }
};

const WRIST = { max: 1.3, passes: 4, slideMax: 0.12 };

const _hv = {
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(),
  f: new THREE.Vector3(), g: new THREE.Vector3(), anchor: new THREE.Vector3(), origin: new THREE.Vector3(), fore: new THREE.Vector3()
};
const _hq = { a: new THREE.Quaternion(), b: new THREE.Quaternion(), gun: new THREE.Quaternion() };
const _hm = { a: new THREE.Matrix4(), b: new THREE.Matrix4(), c: new THREE.Matrix4() };
const _hE = new THREE.Euler();
const _hScale = new THREE.Vector3();
const _ik = {
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(),
  e: new THREE.Vector3(), f: new THREE.Vector3(), g: new THREE.Vector3(),
  q: new THREE.Quaternion(), m1: new THREE.Matrix4(), m2: new THREE.Matrix4(), id: new THREE.Quaternion(),
  legacyTarget: new THREE.Vector3()
};
const _rl = {
  a: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), e: new THREE.Vector3(), w: new THREE.Vector3(),
  q: new THREE.Quaternion(), m: new THREE.Quaternion(), g: new THREE.Quaternion()
};
const _wr = {
  q: new THREE.Quaternion(), e: new THREE.Quaternion(), id: new THREE.Quaternion(), qa: new THREE.Quaternion(),
  qe: new THREE.Quaternion(), g: new THREE.Vector3(), t: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), at: new THREE.Vector3()
};
const _sh = {
  ud: null, baseR: null, baseL: null, headUd: null, headBase: null,
  headQ0: new THREE.Quaternion(), headQW: new THREE.Quaternion(), headMoved: false,
  v: new THREE.Vector3(), w: new THREE.Vector3(), m: new THREE.Vector3(), n: new THREE.Vector3(),
  q: new THREE.Quaternion(), id: new THREE.Quaternion()
};

const wristOf = (elbowG) => (elbowG && elbowG.userData && elbowG.userData.wrist) || null;
function restWrists(ud) {
  for (const e of [ud.elbowRG, ud.elbowLG]) {
    const wr = wristOf(e);
    if (wr) wr.quaternion.identity();
  }
}
function fistPointW(elbowG, hand, a, out) {
  const wr = wristOf(elbowG);
  if (!wr) return elbowG.localToWorld(out.copy(hand));
  wr.updateMatrixWorld(true);
  return wr.localToWorld(out.copy(hand).lerp(wr.userData.grip, a).sub(wr.position));
}
function gripDownDir(out) { return out.set(0, -Math.cos(HANDS.rake), -Math.sin(HANDS.rake)); }
function foreChannelDir(w, out) {
  const k = HANDS.fore[w];
  if (k === 'up') return out.set(0, 1, 0);
  if (k === 'grip') return gripDownDir(out).negate();
  if (k === 'across') return out.set(-1, 0, 0);
  return out.set(0, 0, 1);
}

// Supports both index.html's 6-arg signature (armG, elbowG, hand, targetW, pole, w)
// and shoulder-offset 7-arg signature (armG, elbowG, tx, ty, tz, side, tuck).
export function solveArmIK(armG, elbowG, a3, a4, a5, a6, a7) {
  if (!armG || !elbowG) return;
  if (typeof a3 === 'number') {
    const tx = a3, ty = a4, tz = a5, side = a6 || 1;
    const parent = armG.parent;
    if (parent) parent.updateMatrixWorld(true);
    _ik.legacyTarget.copy(armG.position).add(_ik.a.set(tx, ty, tz));
    if (parent) parent.localToWorld(_ik.legacyTarget);
    return solveArmIK(armG, elbowG, side > 0 ? _HAND_R : _HAND_L, _ik.legacyTarget, side > 0 ? _POLE_R : _POLE_L, 1);
  }
  const hand = a3, targetW = a4, pole = a5, w = a6 == null ? 1 : a6;
  if (w <= 0.001) return;
  const wr = elbowG.userData && elbowG.userData.wrist;
  if (wr && hand !== wr.position) wr.quaternion.slerp(_ik.id, Math.min(1, w));
  const parent = armG.parent;
  parent.updateMatrixWorld(true);
  const T = _ik.a.copy(targetW); parent.worldToLocal(T);
  const D = T.sub(armG.position);
  const a = IK_UPPER, b = hand.length();
  const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.005, D.length()));
  const K = (a * a + b * b - d * d) / (2 * a);
  const R = Math.hypot(hand.y, hand.z), phi = Math.atan2(hand.z, hand.y);
  const c = Math.acos(Math.max(-1, Math.min(1, K / R)));
  const t1 = c - phi, t2 = -c - phi;
  const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  const th1 = wrap(t1), th2 = wrap(t2);
  const theta = Math.abs(th1 + 0.8) < Math.abs(th2 + 0.8) ? th1 : th2;
  const cs = Math.cos(theta), sn = Math.sin(theta);
  const H = _ik.b.set(hand.x, -a + hand.y * cs - hand.z * sn, hand.y * sn + hand.z * cs);
  const e1 = _ik.c.copy(H).normalize();
  const e2 = _ik.d.set(0, -a, 0); e2.addScaledVector(e1, -e2.dot(e1)).normalize();
  const f1 = _ik.e.copy(D).normalize();
  const f2 = _ik.f.copy(pole); f2.addScaledVector(f1, -f2.dot(f1));
  if (f2.lengthSq() < 1e-6) return;
  f2.normalize();
  const e3 = _ik.g.crossVectors(e1, e2);
  _ik.m1.makeBasis(e1, e2, e3);
  const f3 = _ik.a.crossVectors(f1, f2);
  _ik.m2.makeBasis(f1, f2, f3);
  _ik.m2.multiply(_ik.m1.transpose());
  _ik.q.setFromRotationMatrix(_ik.m2);
  armG.quaternion.slerp(_ik.q, w);
  _ik.q.setFromAxisAngle(_AXIS_X, theta);
  elbowG.quaternion.slerp(_ik.q, w);
}

function rollForearm(elbowG, hand, wantW, sign, w) {
  if (w <= 0.001) return 0;
  const a = _rl.a.copy(hand).normalize();
  const d = _rl.d.copy(wantW).applyQuaternion(elbowG.getWorldQuaternion(_rl.q).invert());
  const c = _rl.c.set(sign, 0, 0);
  c.addScaledVector(a, -c.dot(a)); d.addScaledVector(a, -d.dot(a));
  if (c.lengthSq() < 1e-6 || d.lengthSq() < 1e-6) return 0;
  c.normalize(); d.normalize();
  let ang = Math.atan2(_rl.e.crossVectors(c, d).dot(a), c.dot(d));
  ang = Math.max(-HANDS.rollMax, Math.min(HANDS.rollMax, ang)) * w;
  elbowG.quaternion.multiply(_rl.m.setFromAxisAngle(a, ang));
  elbowG.updateMatrixWorld(true);
  return ang;
}

export function foreDrop(gun, H) {
  if (!gun || !H) return 0;
  if (gun.userData.cu100Drop != null) return gun.userData.cu100Drop;
  gun.updateMatrixWorld(true);
  const pump = H.fore === 'pump' ? gun.userData.pump : null;
  const f = pump ? gun.worldToLocal(pump.parent.localToWorld(pump.position.clone().add(_wr.d.set(0, H.pumpDy != null ? H.pumpDy : -0.045, 0))))
    : new THREE.Vector3(H.fore[0], H.fore[1], H.fore[2]);
  const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), v = new THREE.Vector3(), m = new THREE.Matrix4();
  const near = () => Math.abs(v.z - f.z) < 0.025 && Math.abs(v.x - f.x) < 0.035;
  let best = null, bestD = Infinity;
  (pump || gun).traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    for (let p = o; p && p !== gun; p = p.parent) if (!p.visible) return;
    m.multiplyMatrices(inv, o.matrixWorld);
    const P = o.geometry.attributes.position;
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); const d = v.distanceToSquared(f); if (d < bestD) { bestD = d; best = o; } }
  });
  let low = Infinity;
  const pieces = [];
  if (pump) pump.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position) pieces.push(o); });
  else if (best && bestD < 0.06 * 0.06) pieces.push(best);
  for (const anyZ of [false, true]) {
    for (const o of pieces) {
      m.multiplyMatrices(inv, o.matrixWorld);
      const P = o.geometry.attributes.position;
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m); if ((anyZ ? Math.abs(v.x - f.x) < 0.07 : near()) && v.y < f.y + 0.02 && v.y > f.y - 0.057) low = Math.min(low, v.y); }
    }
    if (low !== Infinity) break;
  }
  gun.userData.cu100Drop = low === Infinity ? 0 : Math.max(0, Math.min(0.045, f.y - low - 0.012));
  return gun.userData.cu100Drop;
}

export function holdHand(armG, elbowG, hand, anchorW, channelW, sign, pole, k = 1, a = 1, rollK = k) {
  sign = -sign;
  const wr = wristOf(elbowG);
  if (!wr || a <= 0.001) {
    if (wr) wr.quaternion.identity();
    solveArmIK(armG, elbowG, hand, anchorW, pole, k);
    return rollForearm(elbowG, hand, channelW, sign, rollK);
  }
  const g = _wr.g.copy(hand).lerp(wr.userData.grip, a).sub(wr.position);
  _wr.qa.copy(armG.quaternion); _wr.qe.copy(elbowG.quaternion);
  let roll = 0;
  wr.updateMatrixWorld(true); wr.getWorldQuaternion(_wr.q);
  const t = _wr.t.copy(g).applyQuaternion(_wr.q).negate().add(anchorW);
  for (let i = 0; i < WRIST.passes; i++) {
    armG.quaternion.copy(_wr.qa); elbowG.quaternion.copy(_wr.qe);
    solveArmIK(armG, elbowG, wr.position, t, pole, k);
    armG.updateMatrixWorld(true);
    roll = rollForearm(elbowG, wr.position, channelW, sign, rollK);
    const d = _wr.d.copy(channelW).applyQuaternion(elbowG.getWorldQuaternion(_wr.e).invert()).normalize();
    _wr.q.setFromUnitVectors(_wr.c.set(sign, 0, 0), d);
    const ang = 2 * Math.acos(Math.min(1, Math.abs(_wr.q.w)));
    const s = (ang > WRIST.max ? WRIST.max / ang : 1) * k * a;
    wr.quaternion.copy(_wr.id).slerp(_wr.q, s);
    wr.updateMatrixWorld(true);
    const miss = _wr.d.copy(anchorW).sub(wr.localToWorld(_wr.c.copy(g)));
    if (miss.lengthSq() < 1e-6 || k < 0.999) break;
    t.add(miss);
  }
  wr.updateMatrixWorld(true);
  return roll;
}

export function poseHands(m, modeR = 'fist', modeL = 'fist') {
  const ud = m && m.userData ? m.userData : m;
  if (!ud) return;
  const mapPose = (k) => {
    if (typeof k === 'number') return k > 0.5 ? HAND_POSES.fist : HAND_POSES.relaxed;
    if (k === 'open' || k === 'openPalm') return HAND_POSES.open || HAND_POSES.relaxed;
    if (k === 'hang' || k === 'relaxed') return HAND_POSES.hang || HAND_POSES.relaxed;
    return HAND_POSES.fist || HAND_POSES.relaxed;
  };
  const wR = ud.wristRG || wristOf(ud.elbowRG);
  const wL = ud.wristLG || wristOf(ud.elbowLG);
  if (wR && wR.userData && wR.userData.hand) wR.userData.hand.set(mapPose(modeR)).update();
  if (wL && wL.userData && wL.userData.hand) wL.userData.hand.set(mapPose(modeL)).update();
}

function shoulderRoll(ud, w) {
  const aR = ud.armRG, aL = ud.armLG;
  if (!aR || !aL) return;
  if (_sh.ud !== ud) { _sh.ud = ud; _sh.baseR = new THREE.Vector3(0.34, 0.38, 0.02); _sh.baseL = new THREE.Vector3(-0.34, 0.38, 0.02); }
  const R = SHOULDER_HOLD.rollR, L = SHOULDER_HOLD.rollL;
  aR.position.set(_sh.baseR.x + R[0] * w, _sh.baseR.y + R[1] * w, _sh.baseR.z + R[2] * w);
  aL.position.set(_sh.baseL.x + L[0] * w, _sh.baseL.y + L[1] * w, _sh.baseL.z + L[2] * w);
}

export function cheekWeld(ud, gun, eyeOnGun, a) {
  const head = ud.headG, torso = ud.torsoG;
  if (!head || !torso || !eyeOnGun || a < 0.001) return;
  const S = SHOULDER_HOLD;
  const N = _sh.n.set(S.neck[0], S.neck[1], S.neck[2]);
  const headBase = _sh.headBase || (_sh.headBase = new THREE.Vector3(0, (ud.headPivotY || 1.22) - (ud.torsoPivotY || 0.7), 0));
  const eye = _sh.v.set(S.eye[0], S.eye[1], S.eye[2]).multiply(head.scale).applyQuaternion(head.quaternion).add(head.position).sub(N).normalize();
  gun.updateMatrixWorld(true);
  const want = gun.localToWorld(_sh.w.set(eyeOnGun[0], eyeOnGun[1], eyeOnGun[2]));
  torso.worldToLocal(want).sub(N).normalize();
  const q = _sh.q.setFromUnitVectors(eye, want);
  const ang = 2 * Math.acos(Math.min(1, Math.abs(q.w)));
  const t = (ang > S.cheekMax ? S.cheekMax / ang : 1) * a;
  _hq.b.copy(q); q.identity().slerp(_hq.b, t);
  head.quaternion.premultiply(q);
  head.position.copy(headBase).sub(N).applyQuaternion(q).add(N);
  head.updateMatrixWorld(true);
}

export function holdShoulderGun(ud, gun, wKey, H, k, ads, target, mountOffset = null) {
  const S = SHOULDER_HOLD, sh = H.sh, torso = ud.torsoG, armR = ud.armRG, weaponMount = ud.weaponMount;
  const a = ads * ads * (3 - 2 * ads);
  const P = _hv.anchor.set(
    S.pocket[0] + (S.adsPocket[0] - S.pocket[0]) * a,
    S.pocket[1] + (S.adsPocket[1] - S.pocket[1]) * a,
    S.pocket[2] + (S.adsPocket[2] - S.pocket[2]) * a
  );
  torso.localToWorld(P);
  gun.getWorldScale(_hScale);
  const s = _hScale.x;
  const butt = _sh.m.set(sh.butt[0], sh.butt[1], sh.butt[2]);
  const mz = gun.userData.muzzleLocal || _hv.fore.set(0, 0, 1);
  const f = _hv.c.subVectors(target, P);
  for (let i = 0; i < 3; i++) {
    if (f.lengthSq() < 1) f.set(0, 0, 1);
    f.normalize();
    const x = _hv.d.crossVectors(_AXIS_Y, f);
    if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
    x.normalize();
    const y = _hv.e.crossVectors(f, x);
    _hm.a.makeBasis(x, y, f);
    _hq.gun.setFromRotationMatrix(_hm.a);
    if (i === 2) break;
    const muzzle = _hv.g.copy(mz).sub(butt).multiplyScalar(s).applyQuaternion(_hq.gun).add(P);
    f.subVectors(target, muzzle);
  }
  if (mountOffset) {
    _hE.set(mountOffset.rx || 0, mountOffset.ry || 0, mountOffset.rz || 0);
    _hq.gun.multiply(_hq.a.setFromEuler(_hE));
  }
  const fx = f.x, fy = f.y, fz = f.z;
  const origin = _hv.origin.copy(butt).multiplyScalar(-s).applyQuaternion(_hq.gun).add(P);
  const sw = _hv.b.copy(armR.position); torso.localToWorld(sw);
  const grip = _hv.f;
  for (let i = 0; i < 2; i++) {
    grip.set(H.grip[0], H.grip[1], H.grip[2]).multiplyScalar(s).applyQuaternion(_hq.gun).add(origin);
    const over = grip.distanceTo(sw) - S.reach;
    if (over <= 0) break;
    origin.x -= fx * over; origin.y -= fy * over; origin.z -= fz * over;
  }
  grip.set(H.grip[0], H.grip[1], H.grip[2]).multiplyScalar(s).applyQuaternion(_hq.gun).add(origin);
  if (HANDS.skip[wKey]) solveArmIK(armR, ud.elbowRG, _HAND_R, grip, _POLE_R, k);
  else holdHand(armR, ud.elbowRG, _HAND_R, grip, gripDownDir(_rl.w).applyQuaternion(_hq.gun), 1, _POLE_R, k, 1);
  armR.updateMatrixWorld(true);
  _hm.a.compose(origin, _hq.gun, _hScale);
  _hm.b.compose(gun.position, gun.quaternion, gun.scale).invert();
  _hm.a.multiply(_hm.b);
  _hm.c.copy(weaponMount.parent.matrixWorld).invert().multiply(_hm.a);
  _hm.c.decompose(weaponMount.position, weaponMount.quaternion, weaponMount.scale);
  weaponMount.updateMatrixWorld(true);
  cheekWeld(ud, gun, sh.eye, a * k);
}

const _aimTargetW = new THREE.Vector3();
const _akPoleR = new THREE.Vector3(), _akPoleL = new THREE.Vector3();
export function holdWeapon(m, w, gun, opts = {}) {
  const ud = m.userData;
  const mount = ud.weaponMount, armR = ud.armRG, armL = ud.armLG;
  const elbR = ud.elbowRG, elbL = ud.elbowLG, torso = ud.torsoG, head = ud.headG;
  if (!mount || !armR || !armL || !torso) return;
  restWrists(ud);
  if (ud.offhandMount) ud.offhandMount.visible = false;
  if (w === 'none' || !gun) {
    shoulderRoll(ud, 0);
    const u = UNARMED_ARMS;
    armR.rotation.set(u.x, -u.y, u.z);
    elbR.rotation.set(u.elbow, 0, 0);
    armL.rotation.set(u.x, u.y, -u.z);
    elbL.rotation.set(u.elbow, 0, 0);
    if (ud.wristLG) ud.wristLG.rotation.set(0.05, 1.15, 0);
    if (ud.wristRG) ud.wristRG.rotation.set(0.05, -1.15, 0);
    poseHands(m, 'hang', 'hang');
    return;
  }
  const H = WEAPON_HOLD[w] || WEAPON_HOLD.m4;
  const aki = !!(opts.akimbo && (w === 'pistol' || w === 'revolver' || w === 'uzi'));
  const ads = THREE.MathUtils.clamp(opts.ads || 0, 0, 1);
  const k = 1;

  // Bladed stance torso twist & head counter-turn (1:1 with index.html lines 19188-19213)
  if (!opts.skipTwist) {
    const holdTwist = aki ? 0.05 : (H.twist || 0);
    torso.rotation.y += holdTwist;
    if (head) head.rotation.y -= holdTwist;
  }
  shoulderRoll(ud, H.sh && !aki ? 1 : 0);
  m.updateMatrixWorld(true);

  const shoulderW = _hv.anchor.copy(armR.position); torso.localToWorld(shoulderW);
  const target = _aimTargetW.set(0, shoulderW.y - 0.04, 8.0);
  const dxz = Math.hypot(target.x - shoulderW.x, target.z - shoulderW.z);
  const pitch = Math.max(-0.75, Math.min(0.6, Math.atan2(target.y - shoulderW.y, Math.max(0.5, dxz))));
  const holdX = aki ? AKIMBO_CARRY.presentX : H.hold[0];
  const pp = AKIMBO_CARRY.presentElbow;
  _akPoleR.set(pp[0], pp[1], pp[2]).sub(armR.position);
  _akPoleL.set(-pp[0], pp[1], pp[2]).sub(armL.position);

  if (H.sh && !aki) {
    holdShoulderGun(ud, gun, w, H, k, ads, target, opts.mountOffset || null);
  } else {
    const off = _hv.origin.set(holdX, H.hold[1], H.hold[2]).applyAxisAngle(_AXIS_X, -pitch * 0.7);
    const anchor = _hv.anchor.copy(armR.position).add(off);
    torso.localToWorld(anchor);
    const f = _hv.c;
    const aimGun = () => {
      f.subVectors(target, anchor);
      if (H.level || f.lengthSq() < 0.04) f.set(0, H.level ? -0.08 : 0, 1);
      f.normalize();
      const x = _hv.d.crossVectors(_AXIS_Y, f);
      if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
      x.normalize();
      const y = _hv.e.crossVectors(f, x);
      _hm.a.makeBasis(x, y, f);
      _hq.gun.setFromRotationMatrix(_hm.a);
      if (opts.mountOffset) {
        _hE.set(opts.mountOffset.rx || 0, opts.mountOffset.ry || 0, opts.mountOffset.rz || 0);
        _hq.gun.multiply(_hq.a.setFromEuler(_hE));
      }
    };
    aimGun();
    if (!aki && Array.isArray(H.fore) && !HANDS.skip[w] && HANDS.fore[w] !== 'grip') {
      gun.getWorldScale(_hScale);
      const shL = _hv.b.copy(armL.position); torso.localToWorld(shL);
      for (let i = 0; i < 2; i++) {
        const fw = _hv.g.set(H.fore[0] - H.grip[0], H.fore[1] - H.grip[1], H.fore[2] - H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun).add(anchor);
        const over = fw.distanceTo(shL) - HANDS.reachL;
        if (over <= 0) break;
        anchor.addScaledVector(fw.sub(shL).normalize(), -over); aimGun();
      }
    }
    if (HANDS.skip[w]) solveArmIK(armR, elbR, _HAND_R, anchor, _POLE_R, k);
    else holdHand(armR, elbR, _HAND_R, anchor, gripDownDir(_rl.w).applyQuaternion(_hq.gun), 1, aki ? _akPoleR : _POLE_R, k, 1);
    armR.updateMatrixWorld(true);
    gun.getWorldScale(_hScale);
    const grip = _hv.f.set(H.grip[0], H.grip[1], H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun);
    const origin = _hv.origin.copy(anchor).sub(grip);
    _hm.a.compose(origin, _hq.gun, _hScale);
    _hm.b.compose(gun.position, gun.quaternion, gun.scale).invert();
    _hm.a.multiply(_hm.b);
    _hm.c.copy(mount.parent.matrixWorld).invert().multiply(_hm.a);
    _hm.c.decompose(mount.position, mount.quaternion, mount.scale);
    mount.updateMatrixWorld(true);
  }

  if (aki && ud.offhandMount && ud.offhandMeshes && ud.offhandMeshes[w]) {
    const offGun = ud.offhandMeshes[w];
    ud.offhandMount.visible = true;
    for (const [ok, om] of Object.entries(ud.offhandMeshes)) om.visible = (ok === w);
    const offL = _hv.origin.set(-holdX, H.hold[1], H.hold[2]).applyAxisAngle(_AXIS_X, -pitch * 0.7);
    const anchorL = _hv.b.copy(armL.position).add(offL);
    torso.localToWorld(anchorL);
    const lf = _hv.c.subVectors(target, anchorL).normalize();
    const lx = _hv.d.crossVectors(_AXIS_Y, lf).normalize();
    const ly = _hv.e.crossVectors(lf, lx);
    _hm.a.makeBasis(lx, ly, lf);
    _hq.gun.setFromRotationMatrix(_hm.a);
    holdHand(armL, elbL, _HAND_L, anchorL, gripDownDir(_rl.w).negate().applyQuaternion(_hq.gun), 1, _akPoleL, k, 1);
    armL.updateMatrixWorld(true);
    offGun.getWorldScale(_hScale);
    const gripL2 = _hv.f.set(H.grip[0], H.grip[1], H.grip[2]).multiply(_hScale).applyQuaternion(_hq.gun);
    const originL = _hv.origin.copy(anchorL).sub(gripL2);
    _hm.a.compose(originL, _hq.gun, _hScale);
    _hm.b.compose(offGun.position, offGun.quaternion, offGun.scale).invert();
    _hm.a.multiply(_hm.b);
    _hm.c.copy(ud.offhandMount.parent.matrixWorld).invert().multiply(_hm.a);
    _hm.c.decompose(ud.offhandMount.position, ud.offhandMount.quaternion, ud.offhandMount.scale);
    ud.offhandMount.updateMatrixWorld(true);
    poseHands(m, 'fist', 'fist');
    return;
  }

  if (opts.skipSupportHand) {
    poseHands(m, 'fist', 'open');
    return;
  }

  const fore = _hv.fore;
  if (H.fore === 'pump' && gun.userData.pump) { fore.copy(gun.userData.pump.position); fore.y += H.pumpDy != null ? H.pumpDy : -0.045; }
  else fore.set(H.fore[0], H.fore[1], H.fore[2]);
  gun.localToWorld(fore);

  let palmItem = null;
  const reloading = !!opts.reloading;
  if (reloading && RELOAD_PLAN[w]) {
    palmItem = reloadSupportTarget(w, opts.reloadU || 0, gun, fore, ud, torso);
  }
  const handRollLW = reloading ? 0 : 1;

  if (HANDS.skip[w]) {
    solveArmIK(armL, elbL, _HAND_L, fore, _POLE_L, k);
  } else {
    const wrapG = HANDS.fore[w] === 'grip';
    const aL = HANDS.fore[w] === 'across' ? 0 : handRollLW;
    const chL = foreChannelDir(w, _rl.w).applyQuaternion(gun.getWorldQuaternion(_rl.g));
    const sgL = HANDS.fore[w] === 'up' || wrapG || aL <= 0.001 ? 1 : -1;
    if (aL > 0.001 && (!HANDS.fore[w] || H.fore === 'pump')) {
      const drop = foreDrop(gun, H);
      if (drop > 0) fore.addScaledVector(_wr.d.set(0, 1, 0).transformDirection(gun.matrixWorld), -drop * gun.getWorldScale(_hScale).y * aL);
    }
    holdHand(armL, elbL, _HAND_L, fore, chL, sgL, _POLE_L, k, aL, k * handRollLW);
    const short = aL > 0.001 ? fistPointW(elbL, _HAND_L, aL, _wr.at).distanceTo(fore) : 0;
    if (short > 0.004 && !HANDS.fore[w] && H.fore !== 'pump' && H.sh) {
      fore.addScaledVector(chL, -Math.min(WRIST.slideMax, short * 1.25) * aL);
      holdHand(armL, elbL, _HAND_L, fore, chL, sgL, _POLE_L, k, aL, k * handRollLW);
    } else if (short > 0.004 && (H.fore === 'pump' || HANDS.fore[w] === 'up') && wristOf(elbL)) {
      const aS = aL * Math.max(0, 1 - 1.2 * short / _HAND_L.distanceTo(wristOf(elbL).userData.grip));
      holdHand(armL, elbL, _HAND_L, fore, chL, sgL, _POLE_L, k, aS, k * handRollLW);
    }
  }
  if (palmItem === 'mag') reloadMagToPalm(gun, ud);
  else if (palmItem === 'shell') reloadShellToPalm(gun, ud);
  poseHands(m, 'fist', 'fist');
}

// === Reload, Blade, Grenade, Carry & Starter Animations (1:1 from index.html) ====
const _clamp01 = (v) => Math.max(0, Math.min(1, v));
const _smooth = (u) => { u = _clamp01(u); return u * u * (3 - 2 * u); };
const _lerp = (a, b, t) => a + (b - a) * t;
const _seg = (u, a, b) => _smooth(_clamp01((u - a) / Math.max(1e-4, b - a)));
const _pulse = (u, a, mid, b) => u <= a || u >= b ? 0 : (u < mid ? _seg(u, a, mid) : 1 - _seg(u, mid, b));

const reloadPlanMag = (reach, pouch, seat, extra, home, work = null) => ({ kind: 'mag', reach, pouch, seat, work, keys: [
  [0, 'fore'], [reach, 'well'], [reach + 0.07, 'below'], [pouch, 'pouch'], [pouch + 0.04, 'pouch'],
  [seat - 0.09, 'below'], [seat, 'well'], [seat + 0.04, 'well'], ...extra, [home, 'fore']] });

export const RELOAD_PLAN = {
  pistol: reloadPlanMag(0.10, 0.32, 0.60, [[0.68, 'work'], [0.90, 'work']], 1.0, 'slide'),
  uzi: reloadPlanMag(0.10, 0.32, 0.58, [], 0.80),
  sniper: reloadPlanMag(0.10, 0.30, 0.54, [[0.62, 'work'], [0.94, 'work']], 1.0, 'bolt'),
  m4: reloadPlanMag(0.12, 0.34, 0.62, [], 0.84),
  ak: reloadPlanMag(0.12, 0.34, 0.62, [], 0.84),
  aa12: reloadPlanMag(0.12, 0.34, 0.62, [], 0.84),
  revolver: { kind: 'part', part: 'cylinder', keys: [[0, 'fore'], [0.08, 'part'], [0.16, 'part'], [0.30, 'pouch'], [0.36, 'pouch'], [0.46, 'part'], [0.80, 'part'], [0.94, 'fore']] },
  launcher: { kind: 'part', part: 'drum', keys: [[0, 'fore'], [0.06, 'fore'], [0.28, 'pouch'], [0.34, 'pouch'], [0.54, 'part'], [0.76, 'part'], [0.94, 'fore']] },
  shotgun: { kind: 'shell', keys: [[0, 'fore'], [0.06, 'fore'], [0.26, 'pouch'], [0.32, 'pouch'], [0.56, 'port'], [0.74, 'port'], [0.92, 'fore']] },
  minigun: { kind: 'part', part: 'ammoBox', keys: [[0, 'fore'], [0.12, 'part'], [0.26, 'pouch'], [0.36, 'pouch'], [0.58, 'part'], [0.80, 'part'], [0.94, 'fore']] },
  flamer: { kind: 'part', part: 'tank', keys: [[0, 'fore'], [0.14, 'part'], [0.30, 'pouch'], [0.42, 'pouch'], [0.64, 'part'], [0.84, 'part'], [0.96, 'fore']] }
};

const _rsp = {
  fore: new THREE.Vector3(), well: new THREE.Vector3(), below: new THREE.Vector3(), pouch: new THREE.Vector3(),
  work: new THREE.Vector3(), part: new THREE.Vector3(), port: new THREE.Vector3(), out: new THREE.Vector3(),
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), m: new THREE.Matrix4(), n: new THREE.Matrix4(), v: new THREE.Vector3()
};

function reloadMagState(w, u) {
  const p = RELOAD_PLAN[w];
  if (!p || p.kind !== 'mag') return 'seated';
  if (u < p.reach || u >= p.seat) return 'seated';
  if (u >= p.pouch - 0.015 && u < p.pouch + 0.055) return 'pouch';
  return 'hand';
}
function reloadShellState(u) { return u < 0.29 ? 'none' : u < 0.56 ? 'hand' : u < 0.74 ? 'port' : 'none'; }
function reloadMagPose(gun, w, u) {
  const mag = gun.userData.mag, bp = gun.userData.baseMagPos;
  if (!mag || !bp) return;
  mag.position.copy(bp);
  if (gun.userData.baseMagRot) mag.rotation.copy(gun.userData.baseMagRot); else mag.rotation.set(0, 0, 0);
  mag.visible = reloadMagState(w, u) !== 'pouch';
}
function reloadLocalBox(obj) {
  const S = _rsp, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  obj.updateMatrixWorld(true);
  S.m.copy(obj.matrixWorld).invert();
  obj.traverse((o) => {
    const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pa) return;
    S.n.multiplyMatrices(S.m, o.matrixWorld);
    for (let i = 0; i < pa.count; i++) {
      S.v.fromBufferAttribute(pa, i).applyMatrix4(S.n);
      lo[0] = Math.min(lo[0], S.v.x); lo[1] = Math.min(lo[1], S.v.y); lo[2] = Math.min(lo[2], S.v.z);
      hi[0] = Math.max(hi[0], S.v.x); hi[1] = Math.max(hi[1], S.v.y); hi[2] = Math.max(hi[2], S.v.z);
    }
  });
  return lo[0] === Infinity ? null : { min: new THREE.Vector3(lo[0], lo[1], lo[2]), max: new THREE.Vector3(hi[0], hi[1], hi[2]) };
}
function reloadMagFoot(gun) {
  const gd = gun.userData, mag = gd.mag, key = mag.scale.y.toFixed(3);
  if (gd.gb145Foot && gd.gb145FootFor === key) return;
  const keep = { p: mag.position.clone(), r: mag.rotation.clone() };
  mag.position.copy(gd.baseMagPos);
  if (gd.baseMagRot) mag.rotation.copy(gd.baseMagRot); else mag.rotation.set(0, 0, 0);
  const box = reloadLocalBox(mag);
  gd.gb145FootInMag = !box ? new THREE.Vector3() : new THREE.Vector3((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2);
  mag.updateMatrix();
  gd.gb145Foot = gd.gb145FootInMag.clone().applyMatrix4(mag.matrix);
  gd.gb145FootFor = key;
  mag.position.copy(keep.p); mag.rotation.copy(keep.r); mag.updateMatrixWorld(true);
}
function reloadWellWorld(gun, w, out) {
  const p = RELOAD_PLAN[w], gd = gun.userData;
  if (p && p.kind === 'part' && gd[p.part]) {
    gd[p.part].getWorldPosition(out); gun.worldToLocal(out).add(_rsp.c.set(0, p.part === 'drum' ? -0.06 : -0.035, 0));
    return gun.localToWorld(out);
  }
  if (gd.mag && gd.baseMagPos) { reloadMagFoot(gun); return gd.mag.parent.localToWorld(out.copy(gd.gb145Foot)); }
  return gun.getWorldPosition(out);
}
function reloadPouchWorld(ud, torso, arm, out) {
  const sx = Math.sign(arm && arm.position ? arm.position.x : -1) || -1;
  const vest = ud.gearParts && ud.gearParts.vest && ud.gearParts.vest.some((o) => o.visible);
  const piv = ud.torsoPivotY || 0.7;
  return torso.localToWorld(vest ? out.set(0.12 * sx, 0.965 - piv, 0.25) : out.set(0.115 * sx, 0.68 - piv, 0.19));
}
function reloadGrabPoint(obj, kind) {
  const b = reloadLocalBox(obj);
  if (!b) return new THREE.Vector3();
  return kind === 'slide'
    ? new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y - 0.25 * (b.max.y - b.min.y), b.min.z + 0.25 * (b.max.z - b.min.z))
    : new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
}
function reloadSupportTarget(w, u, gun, fore, ud, torso) {
  const p = RELOAD_PLAN[w], S = _rsp, gd = gun.userData;
  S.fore.copy(fore);
  if (p.kind === 'mag' && gd.mag && gd.baseMagPos) {
    reloadWellWorld(gun, w, S.well);
    gd.mag.parent.localToWorld(S.below.copy(gd.gb145Foot).add(S.a.set(0, -0.1, 0)));
  } else { S.well.copy(fore); S.below.copy(fore); }
  reloadPouchWorld(ud, torso, ud.armLG, S.pouch);
  S.work.copy(fore);
  const wobj = p.work === 'slide' ? gd.slide : (p.work === 'bolt' ? gd.bolt : null);
  if (wobj) {
    if (!wobj.userData.gb145Grab) wobj.userData.gb145Grab = reloadGrabPoint(wobj, p.work);
    wobj.localToWorld(S.work.copy(wobj.userData.gb145Grab));
  }
  if (p.kind === 'part') reloadWellWorld(gun, w, S.part); else S.part.copy(fore);
  if (gd.reloadShell && gd.baseReloadShellPos) gd.reloadShell.parent.localToWorld(S.port.copy(gd.baseReloadShellPos)); else S.port.copy(fore);
  const K = p.keys;
  let i = 0;
  while (i < K.length - 1 && u >= K[i + 1][0]) i++;
  S.out.copy(S[K[i][1]]);
  if (i < K.length - 1) S.out.lerp(S[K[i + 1][1]], _smooth((u - K[i][0]) / (K[i + 1][0] - K[i][0])));
  fore.copy(S.out);
  if (p.kind === 'mag') return reloadMagState(w, u) === 'hand' ? 'mag' : null;
  if (p.kind === 'shell') return reloadShellState(u) === 'hand' ? 'shell' : null;
  return null;
}
function reloadMagToPalm(gun, ud) {
  const gd = gun.userData, mag = gd.mag, par = mag && mag.parent, S = _rsp;
  if (!mag || !par || !gd.gb145Foot) return;
  ud.elbowLG.updateMatrixWorld(true);
  const hand = par.worldToLocal(ud.elbowLG.localToWorld(S.a.copy(_HAND_L)));
  const far = Math.min(1, hand.distanceTo(gd.gb145Foot) / 0.25);
  mag.visible = true;
  if (gd.baseMagRot) mag.rotation.copy(gd.baseMagRot); else mag.rotation.set(0, 0, 0);
  mag.rotation.x += 0.35 * far; mag.rotation.z += 0.15 * far;
  mag.position.copy(gd.baseMagPos);
  mag.updateMatrixWorld(true);
  const foot = par.worldToLocal(mag.localToWorld(S.b.copy(gd.gb145FootInMag)));
  mag.position.add(hand.sub(foot));
  mag.updateMatrixWorld(true);
}
function reloadShellToPalm(gun, ud) {
  const rs = gun.userData.reloadShell;
  if (!rs) return;
  ud.elbowLG.updateMatrixWorld(true);
  rs.visible = true; rs.scale.setScalar(1);
  rs.position.copy(rs.parent.worldToLocal(ud.elbowLG.localToWorld(_rsp.a.copy(_HAND_L))));
}
function sniperBoltPose(gun, open, back) {
  const gd = gun && gun.userData;
  if (!gd || !gd.bolt || !gd.baseBoltPos) return;
  const bp = gd.baseBoltPos, br = gd.baseBoltRot || { x: 0, y: 0, z: 0 }, side = gd.boltSide || 1;
  gd.bolt.position.set(bp.x, bp.y + 0.01 * open, bp.z - 0.09 * back);
  gd.bolt.rotation.set(br.x, br.y, (br.z || 0) + side * 1.05 * open);
}

export function updateReloadAnimInspector(m, w, gun, progress, GUN_BASE) {
  if (!gun) return;
  const ud = gun.userData;
  const base = GUN_BASE[w];
  if (base) {
    gun.position.copy(base.pos);
    gun.rotation.copy(base.rot);
  }
  for (const [k, bk] of [['mag', 'Mag'], ['bolt', 'Bolt'], ['slide', 'Slide'], ['pump', 'Pump'], ['cylinder', 'Cylinder'], ['drum', 'Drum'], ['ammoBox', 'Ammo']]) {
    const part = ud[k];
    if (!part) continue;
    if (ud['base' + bk + 'Pos']) part.position.copy(ud['base' + bk + 'Pos']);
    if (ud['base' + bk + 'Rot']) part.rotation.copy(ud['base' + bk + 'Rot']);
    part.visible = true;
  }

  const reloadMountOff = { rx: 0, ry: 0, rz: 0, y: 0 };
  if (w === 'minigun') {
    const tip = _seg(progress, 0.0, 0.16) * (1 - _seg(progress, 0.78, 0.96));
    const box = _seg(progress, 0.12, 0.30) * (1 - _seg(progress, 0.68, 0.84));
    reloadMountOff.rx = -0.14 * tip; reloadMountOff.rz = 0.04 * tip; reloadMountOff.y = 0.006 * tip;
    if (ud.ammoBox && ud.baseAmmoPos) {
      ud.ammoBox.position.set(ud.baseAmmoPos.x + 0.05 * box, ud.baseAmmoPos.y - 0.08 * box, ud.baseAmmoPos.z + 0.02 * box);
      ud.ammoBox.rotation.z = (ud.baseAmmoRot?.z || 0.12) + 0.75 * box;
      ud.ammoBox.rotation.x = 0.4 * box;
    }
  } else if (w === 'uzi' || w === 'm4' || w === 'ak' || w === 'aa12') {
    const tilt = _seg(progress, 0.0, 0.15) * (1 - _seg(progress, 0.90, 1.0));
    reloadMountOff.rx = -0.20 * tilt; reloadMountOff.rz = 0.04 * tilt;
    reloadMagPose(gun, w, progress);
  } else if (w === 'pistol') {
    const tilt = _seg(progress, 0.0, 0.18) * (1 - _seg(progress, 0.90, 1.0));
    const slideAmt = _seg(progress, 0.72, 0.88) * (1 - _seg(progress, 0.88, 0.96));
    reloadMountOff.rx = -0.22 * tilt; reloadMountOff.rz = 0.05 * tilt;
    if (ud.slide && ud.baseSlidePos) {
      ud.slide.position.set(ud.baseSlidePos.x, ud.baseSlidePos.y, ud.baseSlidePos.z - 0.13 * slideAmt);
    }
    reloadMagPose(gun, 'pistol', progress);
  } else if (w === 'shotgun') {
    const tip = _seg(progress, 0.0, 0.12) * (1 - _seg(progress, 0.90, 1.0));
    const chamberPump = _seg(progress, 0.80, 0.90) * (1 - _seg(progress, 0.90, 0.98));
    reloadMountOff.rx = -0.14 * tip; reloadMountOff.rz = 0.04 * tip; reloadMountOff.y = 0.006 * tip;
    if (ud.pump && ud.basePumpPos) {
      ud.pump.position.set(ud.basePumpPos.x, ud.basePumpPos.y, ud.basePumpPos.z - 0.12 * chamberPump);
    }
    if (ud.reloadShell && ud.baseReloadShellPos) {
      const rs = ud.reloadShell, bp = ud.baseReloadShellPos, ss = reloadShellState(progress);
      const k = ss === 'port' ? _seg(progress, 0.56, 0.72) : 0;
      rs.visible = ss === 'hand' || ss === 'port';
      rs.position.set(bp.x, bp.y - 0.02 * (1 - k), bp.z - 0.03 * (1 - k));
      rs.scale.setScalar(1);
    }
  } else if (w === 'revolver') {
    const openAmt = _seg(progress, 0.0, 0.16) * (1 - _seg(progress, 0.80, 0.96));
    const tip = _seg(progress, 0.0, 0.14) * (1 - _seg(progress, 0.84, 1.0));
    const ejector = _pulse(progress, 0.14, 0.20, 0.28);
    reloadMountOff.rx = -0.16 * tip; reloadMountOff.rz = 0.05 * tip;
    if (ud.cylinder) {
      const bp = ud.baseCylinderPos || ud.baseMagPos, br = ud.baseCylinderRot || ud.baseMagRot;
      if (bp && br) {
        ud.cylinder.position.set(bp.x + 0.095 * openAmt + 0.012 * ejector, bp.y - 0.008 * openAmt, bp.z + 0.01 * openAmt);
        ud.cylinder.rotation.set(br.x, br.y + 0.16 * openAmt, br.z + progress * Math.PI);
      }
    }
  } else if (w === 'sniper') {
    const tilt = _seg(progress, 0.0, 0.16) * (1 - _seg(progress, 0.92, 1.0));
    const boltOpen = _seg(progress, 0.64, 0.72) * (1 - _seg(progress, 0.88, 0.96));
    const boltBack = _seg(progress, 0.70, 0.80) * (1 - _seg(progress, 0.80, 0.90));
    reloadMountOff.rx = -0.20 * tilt; reloadMountOff.rz = 0.04 * tilt;
    sniperBoltPose(gun, boltOpen, boltBack);
    reloadMagPose(gun, 'sniper', progress);
  } else if (w === 'launcher') {
    const openAmt = _seg(progress, 0.0, 0.16) * (1 - _seg(progress, 0.80, 0.96));
    const tip = _seg(progress, 0.0, 0.14) * (1 - _seg(progress, 0.84, 1.0));
    reloadMountOff.rx = -0.18 * tip; reloadMountOff.rz = 0.055 * tip;
    if (ud.drum) {
      const bp = ud.baseDrumPos || ud.baseMagPos, br = ud.baseDrumRot || ud.baseMagRot;
      if (bp && br) {
        ud.drum.position.set(bp.x + 0.12 * openAmt, bp.y - 0.01 * openAmt, bp.z + 0.012 * openAmt);
        ud.drum.rotation.set(br.x, br.y + 1.05 * openAmt, br.z);
      }
    }
  } else if (w === 'flamer') {
    const tip = _pulse(progress, 0.0, 0.3, 0.9);
    reloadMountOff.rx = 0.35 * tip; reloadMountOff.y = -0.03 * tip;
  }

  holdWeapon(m, w, gun, { ads: 0, reloading: true, reloadU: progress, reloadMountOff });
}

// 1:1 bladeSwingPose and updateKnifeAnim from index.html lines 44639-44760
const KNIFE_REST_POS = { x: 0.0, y: 0.0, z: 0.04 };
const KNIFE_SLIDE = 0.2;
const _POLE_KNIFE = new THREE.Vector3(-0.45, -0.7, 0.15);
let _kp = null;

export function bladeSwingPose(u, heavy) {
  let yaw, tilt, roll, reach, lift;
  if (!heavy) {
    if (u < 0.16) {
      const k = _smooth(u / 0.16);
      yaw = _lerp(0, 0.28, k); tilt = _lerp(0, -0.15, k); roll = _lerp(0, 0.12, k);
      reach = _lerp(0, -0.03, k); lift = _lerp(0, 0.02, k);
    } else if (u < 0.42) {
      const k = _smooth((u - 0.16) / 0.26);
      yaw = _lerp(0.28, 0.04, k); tilt = _lerp(-0.15, 0.08, k); roll = _lerp(0.12, 0.0, k);
      reach = _lerp(-0.03, 0.14, k); lift = _lerp(0.02, 0.0, k);
    } else if (u < 0.64) {
      const k = _smooth((u - 0.42) / 0.22);
      yaw = _lerp(0.04, -0.55, k); tilt = _lerp(0.08, 0.18, k); roll = _lerp(0, -0.22, k);
      reach = _lerp(0.14, 0.04, k); lift = _lerp(0, -0.03, k);
    } else {
      const k = _smooth((u - 0.64) / 0.36);
      yaw = _lerp(-0.55, 0, k); tilt = _lerp(0.18, 0, k); roll = _lerp(-0.22, 0, k);
      reach = _lerp(0.04, 0, k); lift = _lerp(-0.03, 0, k);
    }
  } else if (u < 0.18) {
    const k = _smooth(u / 0.18);
    yaw = _lerp(0, 0.45, k); tilt = _lerp(0, -0.55, k); roll = _lerp(0, 0.55, k);
    reach = _lerp(0, -0.06, k); lift = _lerp(0, 0.08, k);
  } else if (u < 0.36) {
    const k = _smooth((u - 0.18) / 0.18);
    yaw = _lerp(0.45, 0.95, k); tilt = _lerp(-0.55, -1.05, k); roll = _lerp(0.55, 1.15, k);
    reach = _lerp(-0.06, 0.02, k); lift = _lerp(0.08, 0.12, k);
  } else if (u < 0.58) {
    const k = _smooth((u - 0.36) / 0.22);
    yaw = _lerp(0.95, -1.2, k); tilt = _lerp(-1.05, 0.42, k); roll = _lerp(1.15, -0.5, k);
    reach = _lerp(0.02, 0.16, k); lift = _lerp(0.12, -0.08, k);
  } else {
    const k = _smooth((u - 0.58) / 0.42);
    yaw = _lerp(-1.2, 0, k); tilt = _lerp(0.42, 0, k); roll = _lerp(-0.5, 0, k);
    reach = _lerp(0.16, 0, k); lift = _lerp(-0.08, 0, k);
  }
  return { yaw, tilt, roll, reach, lift };
}

export function updateKnifeAnimInspector(m, knife, u, isKatana = false, combo = 0, clips = null, wKey = 'm4', activeGun = null) {
  if (!knife) return;
  // First apply the normal weapon hold (with support hand released for the blade slash)
  if (wKey && wKey !== 'none' && activeGun) {
    holdWeapon(m, wKey, activeGun, { ads: 0, skipSupportHand: true });
  } else {
    holdWeapon(m, 'none', null);
  }
  knife.visible = true;
  for (const ch of knife.children) {
    if (ch === knife.userData.katanaModel) ch.visible = isKatana;
    else ch.visible = !isKatana;
  }
  if (m.userData.katanaWorn && m.userData.katanaWorn.userData.hilt) {
    m.userData.katanaWorn.userData.hilt.visible = !isKatana;
  }
  const heavy = isKatana;
  const pose = bladeSwingPose(u, heavy);
  const clip = clips ? (heavy ? clips.macheteClip : clips.knifeClip) : null;
  let yaw = pose.yaw;
  if (clip) yaw *= heavy ? 0.85 : HANDS.knifeYaw;
  const dir = combo % 2 === 0 ? 1 : -1;
  knife.rotation.set(pose.tilt, -yaw * dir, -pose.roll * dir);
  knife.position.set(KNIFE_REST_POS.x, KNIFE_REST_POS.y + pose.lift * KNIFE_SLIDE, KNIFE_REST_POS.z + pose.reach * KNIFE_SLIDE);

  const ud = m.userData, torso = ud.torsoG, armL = ud.armLG, elbowL = ud.elbowLG;
  if (clip && torso && armL && elbowL) {
    if (heavy) {
      const up = u < 0.36 ? _smooth(u / 0.36) : Math.max(0, 1 - _smooth((u - 0.36) / 0.28));
      _POLE_KNIFE.set(-0.35 - 0.45 * (1 - up), -0.15 + 1.05 * up, -0.4 * up);
    } else _POLE_KNIFE.set(-0.4, -0.75, 0.2);
    m.updateMatrixWorld(true);
    const P = _kp || (_kp = { rest: new THREE.Vector3(), chest: new THREE.Vector3(), side: new THREE.Vector3(), up: new THREE.Vector3(),
      fwd: new THREE.Vector3(), q: new THREE.Quaternion(), out: new THREE.Vector3() });
    elbowL.localToWorld(P.rest.copy(_HAND_L));
    torso.localToWorld(P.chest.set(0, 1.22 - (ud.torsoPivotY || 0.7), 0.12));
    torso.getWorldQuaternion(P.q);
    P.side.set(-1, 0, 0).applyQuaternion(P.q); P.up.set(0, 1, 0).applyQuaternion(P.q); P.fwd.set(0, 0, 1).applyQuaternion(P.q);
    Studio.handPointAt(clip, u, (at) => P[at] || P.rest, P, P.out);
    solveArmIK(armL, elbowL, _HAND_L, P.out, _POLE_KNIFE, 1);
    if (heavy && torso) {
      const wind = u < 0.36 ? _smooth(u / 0.36) : _smooth(Math.max(0, 1 - (u - 0.36) / 0.5));
      torso.rotation.x += 0.14 * wind;
      torso.rotation.z += (u < 0.5 ? 0.07 : -0.04) * wind;
    }
    armL.updateMatrixWorld(true);
  } else if (armL && elbowL) {
    const swing = heavy
      ? (u < 0.36 ? _smooth(u / 0.36) : _lerp(1, -1, _smooth(Math.min(1, (u - 0.36) / 0.3))))
      : (u < 0.16 ? _smooth(u / 0.16) * 0.4 : (u < 0.5 ? _lerp(0.4, -0.6, _smooth((u - 0.16) / 0.34)) : _lerp(-0.6, 0, _smooth((u - 0.5) / 0.5))));
    armL.rotation.z = -0.55 - swing * (heavy ? 0.34 : 0.22);
    armL.rotation.x = -0.55 - Math.abs(swing) * (heavy ? 0.5 : 0.28);
    elbowL.rotation.x = -0.55 - Math.abs(swing) * (heavy ? 0.55 : 0.35);
  }
  poseHands(m, wKey === 'none' ? 'hang' : 'fist', 'fist');
}

// 1:1 GR_KEY and grenadeArm from index.html lines 44211-44269
export const GR_KEY = {
  pouch:   { frame: 'torso', at: new THREE.Vector3( 0.0,  0.84,  0.20), pole: new THREE.Vector3(-0.5, -0.4, -0.8) },
  lift:    { frame: 'body',  at: new THREE.Vector3(-0.36, 1.22,  0.30), pole: new THREE.Vector3(-1.0, -0.4, -0.2) },
  cock:    { frame: 'body',  at: new THREE.Vector3(-0.28, 1.50, -0.24), pole: new THREE.Vector3(-1.0, -0.05, -0.2) },
  release: { frame: 'body',  at: new THREE.Vector3(-0.24, 1.61,  0.26), pole: new THREE.Vector3(-1.0,  0.1,  0.0) },
  follow:  { frame: 'body',  at: new THREE.Vector3( 0.0,  1.00,  0.45), pole: new THREE.Vector3(-0.7, -0.7, -0.1) }
};
const _ga = {
  rest: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), t: new THREE.Vector3(),
  pa: new THREE.Vector3(), pb: new THREE.Vector3(), pc: new THREE.Vector3(), pole: new THREE.Vector3(), q: new THREE.Quaternion()
};
const _gaSm = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

export function updateGrenadeAnimInspector(m, grenadeHand, u, wKey = 'm4', activeGun = null) {
  if (wKey && wKey !== 'none' && activeGun) {
    activeGun.visible = true;
    holdWeapon(m, wKey, activeGun, { ads: 0, skipSupportHand: true });
  } else {
    holdWeapon(m, 'none', null);
  }
  const ud = m.userData, torso = ud.torsoG, armL = ud.armLG, elbowL = ud.elbowLG;
  if (!torso || !armL || !elbowL) return;
  m.updateMatrixWorld(true);
  const pv = ud.torsoPivotY || 0.7;
  const at = (k, out) => {
    const K = GR_KEY[k];
    return K.frame === 'torso' ? torso.localToWorld(out.set(K.at.x, K.at.y - pv, K.at.z)) : m.localToWorld(out.copy(K.at));
  };
  const poleOf = (k, out) => {
    const K = GR_KEY[k];
    if (K.frame === 'torso') return out.copy(K.pole).applyQuaternion(torso.getWorldQuaternion(_ga.q));
    return out.copy(K.pole);
  };
  elbowL.localToWorld(_ga.rest.copy(_HAND_L));
  const a = _ga.a, b = _ga.b, pa = _ga.pa, pb = _ga.pb;
  let segU = 0, w = 1, ease = _gaSm, phase = 'grab';
  if (u < 0.16) {
    phase = 'grab'; a.copy(_ga.rest); at('pouch', b); poleOf('pouch', pa); pb.copy(pa); segU = u / 0.16; w = _gaSm(u / 0.08);
  } else if (u < 0.44) {
    phase = 'raise'; at('pouch', a); at('cock', b); poleOf('pouch', pa); poleOf('cock', pb); segU = (u - 0.16) / 0.28;
  } else if (u < 0.60) {
    phase = 'cocked';
    const k = (u - 0.44) / 0.16, K = GR_KEY.cock.at;
    m.localToWorld(_ga.c.set(K.x, K.y + 0.03 * k, K.z - 0.07 * k));
    a.copy(_ga.c); b.copy(a); poleOf('cock', pa); pb.copy(pa); segU = 1;
  } else if (u < 0.74) {
    phase = 'whip'; at('cock', a); at('release', b); poleOf('cock', pa); poleOf('release', pb); segU = (u - 0.60) / 0.14;
    ease = (x) => { x = Math.max(0, Math.min(1, x)); return x * x; };
  } else if (u < 0.88) {
    phase = 'follow'; at('release', a); at('follow', b); poleOf('release', pa); poleOf('follow', pb); segU = (u - 0.74) / 0.14;
    ease = (x) => 1 - (1 - Math.max(0, Math.min(1, x))) ** 2;
  } else {
    phase = 'back'; at('follow', a); b.copy(_ga.rest); poleOf('follow', pa); pb.copy(pa); segU = (u - 0.88) / 0.12; w = 1 - _gaSm(segU);
  }
  const s = ease(segU);
  if (phase === 'raise') {
    const c = at('lift', _ga.c), om = 1 - s;
    _ga.t.set(om * om * a.x + 2 * om * s * c.x + s * s * b.x, om * om * a.y + 2 * om * s * c.y + s * s * b.y, om * om * a.z + 2 * om * s * c.z + s * s * b.z);
    _ga.pole.copy(pa).lerp(poleOf('lift', _ga.pc), Math.min(1, s * 2)).lerp(pb, Math.max(0, s * 2 - 1));
  } else {
    _ga.t.copy(a).lerp(b, s);
    _ga.pole.copy(pa).lerp(pb, s);
  }
  _ga.pole.applyQuaternion(torso.getWorldQuaternion(_ga.q).invert()).normalize();
  solveArmIK(armL, elbowL, _HAND_L, _ga.t, _ga.pole, w);
  armL.updateMatrixWorld(true);
  if (grenadeHand) grenadeHand.visible = (u >= 0.14 && u <= 0.74);
  poseHands(m, wKey === 'none' ? 'hang' : 'fist', u < 0.74 ? 'fist' : 'open');
}

export const CARRY_M240 = { scale: 0.86, at: [0.41, 1.14, 0.05], rot: [-0.26, 0.0, -0.13], hold: [0, 0.84, -0.16] };
export const CARRY_ARM = { x: -1.0, y: -0.2, z: 0.25, elbow: -2.0, w: 0 };
const _watchmanCarryScratch = { y: 0, z: 0, pitch: 0, roll: 0, support: 0, weight: 0 };
const _watchmanR = new THREE.Vector3(), _watchmanL = new THREE.Vector3(), _watchmanCh = new THREE.Vector3();

export function watchmanHandsInspector(m, gun, right, left, wR, wL, carrying = false) {
  if (!gun) return;
  const u = m.userData;
  m.updateMatrixWorld(true); gun.updateMatrixWorld(true);
  _watchmanR.set(...right); gun.localToWorld(_watchmanR);
  _watchmanL.set(...left); gun.localToWorld(_watchmanL);
  _watchmanCh.set(carrying ? 1 : 0, carrying ? 0 : -1, 0).transformDirection(gun.matrixWorld);
  holdHand(u.armRG, u.elbowRG, _HAND_R, _watchmanR, _watchmanCh, 1, _POLE_R, wR, 1, wR);
  _watchmanCh.set(1, 0, 0).transformDirection(gun.matrixWorld);
  holdHand(u.armLG, u.elbowLG, _HAND_L, _watchmanL, _watchmanCh, 1, _POLE_L, wL, 1, wL);
  poseHands(m, 'fist', 'fist');
}

export function updateCarryPoseInspector(m, kind, props, phase = 0) {
  const isM240 = kind === 'm240';
  const u = m.userData;
  const bob = Math.sin(phase * 2) * 0.015;
  if (isM240) {
    const mesh = props.carriedM240Mesh;
    if (mesh) {
      mesh.visible = true;
      const c = watchmanCarry(1.2, _watchmanCarryScratch);
      mesh.position.set(CARRY_M240.at[0], c.y + bob, c.z);
      mesh.rotation.set(c.pitch, 0, c.roll);
      if (u.torsoG) {
        u.torsoG.rotation.z -= 0.035 * c.weight;
        u.torsoG.rotation.x += 0.025 * c.weight;
      }
      watchmanHandsInspector(m, mesh.userData.gun, [0, 0.96, 0.075], [-0.095, 0.84, 0.05], 1, c.support, true);
    }
  } else {
    const mesh = props.carriedMortarMesh;
    if (mesh) {
      mesh.visible = true;
      mesh.position.set(0.2, 1.06 + bob, -0.12);
      mesh.rotation.set(-0.55, 0.22, 0.34);
    }
    if (u.armRG) u.armRG.rotation.set(CARRY_ARM.x, CARRY_ARM.y, CARRY_ARM.z);
    if (u.elbowRG) u.elbowRG.rotation.set(CARRY_ARM.elbow, 0, 0);
    if (u.armLG) u.armLG.rotation.set(-Math.sin(phase) * 0.35, 0, 0.04);
    if (u.elbowLG) u.elbowLG.rotation.set(-0.22, 0, 0);
    poseHands(m, 'hang', 'fist');
  }
}

// 1:1 poseSawStarter from index.html lines 42801-42836
const _saw = {
  mount: new THREE.Matrix4(), local: new THREE.Matrix4(),
  home: new THREE.Vector3(), target: new THREE.Vector3(), grip: new THREE.Vector3(),
  channel: new THREE.Vector3(), end: new THREE.Vector3(), direction: new THREE.Vector3(), q: new THREE.Quaternion()
};
export function poseSawStarter(m, gun, u) {
  if (!gun) return;
  const ud = m.userData, weaponMount = ud.weaponMount;
  const data = gun.userData, handle = data.starterHandle, cord = data.starterCord;
  if (!handle || !cord) return;
  const sawState = { phase: 'starting', t: u * 0.82 };
  const pose = sawStartPose(sawState);
  weaponMount.updateMatrixWorld(true);
  _saw.mount.copy(weaponMount.matrixWorld);
  _saw.home.copy(data.starterHome);
  _saw.target.copy(_saw.home).addScaledVector(_saw.direction.set(0.24, 0.11, -0.04), pose.cord);
  gun.localToWorld(_saw.target);
  _saw.grip.set(...WEAPON_HOLD.chainsaw.grip); gun.localToWorld(_saw.grip);
  _saw.target.lerp(_saw.grip, 1 - pose.take);
  gun.getWorldQuaternion(_saw.q);
  gripDownDir(_saw.channel).applyQuaternion(_saw.q);
  _saw.channel.lerp(_saw.direction.set(0, 0, 1).applyQuaternion(_saw.q), pose.take).normalize();
  holdHand(ud.armRG, ud.elbowRG, _HAND_R, _saw.target, _saw.channel, 1, _POLE_R, 1, 1);
  ud.armRG.updateMatrixWorld(true);
  _saw.local.copy(weaponMount.parent.matrixWorld).invert().multiply(_saw.mount);
  _saw.local.decompose(weaponMount.position, weaponMount.quaternion, weaponMount.scale);
  weaponMount.updateMatrixWorld(true);
  handle.position.copy(data.starterHome);
  if (sawState.t >= 0.22 && sawState.t <= 0.67) {
    fistPointW(ud.elbowRG, _HAND_R, 1, _saw.end);
    gun.worldToLocal(_saw.end); handle.position.copy(_saw.end);
  }
  _saw.direction.subVectors(handle.position, data.starterExit);
  const length = _saw.direction.length();
  cord.visible = length > 0.035;
  cord.position.copy(data.starterExit).add(handle.position).multiplyScalar(0.5);
  cord.scale.set(1, Math.max(0.001, length), 1);
  cord.quaternion.setFromUnitVectors(_AXIS_Y, _saw.direction.normalize());
  poseHands(m, 'fist', 'fist');
}

// 1:1 poseLightFire from index.html lines 18524-18569
export function poseCampfireLighter(m, lighterHand, u, tSec) {
  const dur = 1.85;
  const t = u * dur;
  const ud = m.userData;
  const down = Math.min(1, t / 0.36);
  const rise = t > dur - 0.42 ? Math.min(1, (t - (dur - 0.42)) / 0.42) : 0;
  const k = down * (1 - rise);
  const reach = Math.max(0, Math.min(1, (t - 0.28) / 0.38)) * (1 - rise);
  if (ud.weaponMount) ud.weaponMount.visible = false;
  if (ud.offhandMount) ud.offhandMount.visible = false;
  if (ud.kneeRG) ud.kneeRG.rotation.x = 1.55 * k;
  if (ud.kneeLG) ud.kneeLG.rotation.x = 0.62 * k;
  if (ud.legRG) ud.legRG.rotation.set(0.22 * k, 0, 0.06 * k);
  if (ud.legLG) ud.legLG.rotation.set(-0.9 * k, 0, 0);
  if (ud.ankleRG) ud.ankleRG.rotation.x = 0.35 * k;
  if (ud.ankleLG) ud.ankleLG.rotation.x = 0.15 * k;
  if (ud.torsoG) ud.torsoG.rotation.set(0.48 * k, -0.18 * k, 0.04 * k);
  if (ud.headG) ud.headG.rotation.set(0.28 * k + 0.12 * reach, -0.25 * reach, 0);
  if (ud.armRG) ud.armRG.rotation.set(-0.6 - 1.15 * reach, 0.15 * reach, -0.1 + 0.35 * k);
  if (ud.armLG) ud.armLG.rotation.set(-0.55 - 0.45 * k, 0, 0.55 - 0.15 * k);
  if (ud.elbowRG) ud.elbowRG.rotation.set(-0.2 - 1.05 * reach, 0, 0);
  if (ud.elbowLG) ud.elbowLG.rotation.set(-0.55 - 0.7 * k, 0, 0);
  m.position.y = -0.46 * k;
  if (lighterHand) lighterHand.visible = reach > 0.08;
  poseHands(m, 'fist', 'hang');
}

// === Locomotion, Crouch IK, Dive, Vault, Ladder, Cot & Studio Clips (1:1) ========
export function resetMarineRig(m, props) {
  m.position.set(0, 0, 0);
  m.rotation.set(0, 0, 0);
  const u = m.userData;
  if (u.lowerBody) { u.lowerBody.position.set(0, 0, 0); u.lowerBody.rotation.set(0, 0, 0); }
  if (u.hip) { u.hip.rotation.set(0, 0, 0); }
  if (u.torsoG) { u.torsoG.position.set(0, u.torsoPivotY || 0.7, 0); u.torsoG.rotation.set(0, 0, 0); }
  if (u.headG) { u.headG.position.set(0, (u.headPivotY || 1.22) - (u.torsoPivotY || 0.7), 0); u.headG.rotation.set(0, 0, 0); }
  // 1:1 with studio/marine-body.js line 424: armG.position.set(side * 0.34, 1.08 - 0.7, 0.02)
  if (u.armLG) { u.armLG.position.set(-0.34, 1.08 - (u.torsoPivotY || 0.7), 0.02); u.armLG.rotation.set(0, 0, 0); }
  if (u.armRG) { u.armRG.position.set( 0.34, 1.08 - (u.torsoPivotY || 0.7), 0.02); u.armRG.rotation.set(0, 0, 0); }
  if (u.elbowLG) u.elbowLG.rotation.set(-0.35, 0, 0);
  if (u.elbowRG) u.elbowRG.rotation.set(-0.20, 0, 0);
  restWrists(u);
  if (u.weaponMount) {
    u.weaponMount.visible = true;
    u.weaponMount.position.set(0.12826, 0.15981, -0.10022);
    u.weaponMount.rotation.set(1.23359, 0.24103, 0.08361);
    u.weaponMount.scale.set(1, 1, 1);
  }
  if (u.offhandMount) u.offhandMount.visible = false;
  if (u.legLG) { u.legLG.position.set(-0.13, 0.62, 0); u.legLG.rotation.set(0, 0, 0); }
  if (u.legRG) { u.legRG.position.set( 0.13, 0.62, 0); u.legRG.rotation.set(0, 0, 0); }
  if (u.kneeLG) u.kneeLG.rotation.set(0, 0, 0);
  if (u.kneeRG) u.kneeRG.rotation.set(0, 0, 0);
  if (u.ankleLG) u.ankleLG.rotation.set(0, 0, 0);
  if (u.ankleRG) u.ankleRG.rotation.set(0, 0, 0);
  if (props) {
    if (props.knife) props.knife.visible = false;
    if (props.grenadeHand) props.grenadeHand.visible = false;
    if (props.lighterHand) props.lighterHand.visible = false;
    if (props.carriedMortarMesh) props.carriedMortarMesh.visible = false;
    if (props.carriedM240Mesh) props.carriedM240Mesh.visible = false;
  }
}

// 1:1 with marineGait + GAIT_FEEL in index.html lines 18098-18153 & 18864-18898
const GAIT_FEEL = {
  head: 0.33, roll: 0.4, hipRoll: [0.03, 0.045], twistArmed: 0.35, twistUnarmed: 0.8, leanSwing: 0.5,
  leanMean: [0.038, 0.288], bob: 0.75, legYaw: 0.85
};
const _gE = new THREE.Euler();
const _gOut = { thighL: 0, kneeL: 0, thighR: 0, kneeR: 0, bob: 0, lean: 0, twist: 0, roll: 0, hx: 0, hy: 0, hz: 0, footL: 0, footR: 0, levelL: 1, levelR: 1 };
const _gPt = (parts) => {
  let x = 0, y = 0, z = 0, w = 0;
  for (const p of parts || []) if (p.fixed) { x += p.fixed[0] * p.w; y += p.fixed[1] * p.w; z += p.fixed[2] * p.w; w += p.w; }
  return w > 0 ? [x / w, y / w, z / w] : null;
};
export function sampleMarineGait(clips, u, runW) {
  const W = clips && clips.walk, Rn = clips && clips.run;
  if (!W || !Rn) return null;
  const pw = Studio.sampleClip(W, u * W.length), pr = Studio.sampleClip(Rn, u * Rn.length);
  const pose = Studio.blendPoses(pw, pr, runW);
  const dyW = (clips.dy && clips.dy.walk) || 0, dyR = (clips.dy && clips.dy.run) || 0;
  const dy = dyW + (dyR - dyW) * runW;
  const pel = pose.joints.pelvis && pose.joints.pelvis.pos;
  const bob = pel ? pel[1] : 0;
  const o = _gOut, A = 0.27, B = 0.2502;
  o.bob = bob;
  for (const side of ['L', 'R']) {
    const ch = pose.chains && pose.chains['foot' + side], t = ch && _gPt(ch.ik);
    if (!t) return null;
    const ry = t[1] + dy - (0.62 + bob), rz = t[2];
    o['foot' + side] = Math.max(0, t[1] + dy - 0.10);
    o['level' + side] = ch.level == null ? 1 : ch.level;
    const d = Math.max(0.05, Math.min(A + B - 1e-4, Math.hypot(ry, rz)));
    const knee = Math.PI - Math.acos(Math.max(-1, Math.min(1, (A * A + B * B - d * d) / (2 * A * B))));
    const al = Math.acos(Math.max(-1, Math.min(1, (A * A + d * d - B * B) / (2 * A * d))));
    o['thigh' + side] = Math.atan2(-rz, -ry) - al;
    o['knee' + side] = knee;
  }
  const sp = pose.joints.spine && pose.joints.spine.rot;
  if (sp) { _gE.setFromQuaternion(sp, 'XYZ'); o.lean = _gE.x; o.twist = _gE.y; o.roll = _gE.z; } else { o.lean = o.twist = o.roll = 0; }
  const hd = pose.joints.head && pose.joints.head.rot;
  if (hd) { _gE.setFromQuaternion(hd, 'XYZ'); o.hx = _gE.x; o.hy = _gE.y; o.hz = _gE.z; } else { o.hx = o.hy = o.hz = 0; }
  return o;
}

// 1:1 CROUCH constants and 2-bone leg IK from index.html lines 18068-18079 & 19279-19322
const CROUCH = {
  drop: 0.28, lean: 0.22, hipY: 0.62, L1: 0.27, L2: 0.2502, ankleH: 0.10, toe: 0.13, heel: 0.05,
  frontZ: 0.13, rearZ: -0.17, rearPitch: 0.38, splay: 0.06, step: 0.22, lift: 0.08, stance: 0.62, maxCad: 9.8
};
export function applyCrouchIK(m, crouchAmt, walkPhase = 0, moveK = 0) {
  if (crouchAmt <= 0.001) return;
  const ud = m.userData, Q = CROUCH, L1 = Q.L1, L2 = Q.L2, c = crouchAmt;
  const bodyDip = -c * Q.drop;
  m.position.y = bodyDip;
  if (ud.torsoG) ud.torsoG.rotation.x += c * Q.lean;
  if (ud.headG) ud.headG.rotation.x -= c * Q.lean * 0.85;
  const hipH = Q.hipY + bodyDip;
  for (let s = 0; s < 2; s++) {
    const leg = s ? ud.legRG : ud.legLG, kn = s ? ud.kneeRG : ud.kneeLG, an = s ? ud.ankleRG : ud.ankleLG;
    if (!leg || !kn || !an) continue;
    const u = (((walkPhase + (s ? Math.PI : 0) - 1.5 * Math.PI) / (Math.PI * 2)) % 1 + 1) % 1;
    let wz, wl = 0, wp;
    if (u < Q.stance) {
      const q = u / Q.stance;
      wz = Q.step * (1 - 2 * q);
      wp = q < 0.18 ? -0.22 * (1 - q / 0.18) : (q > 0.7 ? 0.45 * (q - 0.7) / 0.3 : 0);
    } else {
      const q = (u - Q.stance) / (1 - Q.stance), e = q * q * (3 - 2 * q);
      wz = -Q.step + 2 * Q.step * e;
      wl = Q.lift * Math.sin(Math.PI * q);
      wp = 0.45 - 0.67 * e;
    }
    const iz = s ? Q.rearZ : Q.frontZ, ip = s ? Q.rearPitch : 0;
    const fz = iz + (wz - iz) * moveK, lift = wl * moveK;
    const a0 = leg.rotation.x, k0 = kn.rotation.x, p0 = a0 + k0 + an.rotation.x;
    const pitch = p0 + (ip + (wp - ip) * moveK - p0) * c;
    const sy = -(L1 * Math.cos(a0) + L2 * Math.cos(a0 + k0)), sz = -(L1 * Math.sin(a0) + L2 * Math.sin(a0 + k0));
    const ankH = Q.ankleH * Math.cos(pitch) + (pitch > 0 ? Q.toe : Q.heel) * Math.sin(Math.abs(pitch));
    const tg = -(hipH - ankH - lift), ty = Math.max(tg, sy + (tg - sy) * c), tz = sz + (fz - sz) * c;
    const d = Math.min(L1 + L2 - 0.002, Math.max(0.06, Math.hypot(ty, tz)));
    const k = Math.acos(Math.max(-1, Math.min(1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
    const a = Math.atan2(-tz, -ty) - Math.atan2(L2 * Math.sin(k), L1 + L2 * Math.cos(k));
    leg.rotation.x = a;
    kn.rotation.x = k;
    an.rotation.x = pitch - a - k;
    leg.rotation.z += ((s ? 1 : -1) * Q.splay - leg.rotation.z) * c;
    an.rotation.z = -leg.rotation.z * c;
  }
}

export function applyLocomotionPose(m, clips, opts = {}) {
  const u = opts.u || 0;
  const phase = u * Math.PI * 2;
  const speed = opts.speed || 0;
  const crouch = opts.crouch || 0;
  const strafe = opts.strafe || 0;
  const back = !!opts.back;
  const unarmed = !!opts.unarmed;
  const runW = THREE.MathUtils.clamp((speed - 3.5) / 3.7, 0, 1);
  const effU = back ? (1 - u) % 1 : u;
  const ud = m.userData;

  if (speed > 0.05) {
    const G = sampleMarineGait(clips, effU, runW);
    const lowerYaw = strafe * 0.65;
    if (G && crouch < 0.99) {
      const F = GAIT_FEEL;
      const bob = G.bob * F.bob;
      const leanMean = F.leanMean[0] + (F.leanMean[1] - F.leanMean[0]) * runW;
      const dirLean = back ? -0.5 : 1;
      const torsoLean = (leanMean + (G.lean - leanMean) * F.leanSwing) * dirLean;
      const chest = unarmed ? F.twistUnarmed : F.twistArmed;
      let torsoTwist = -lowerYaw * 0.22 + G.twist * chest;
      let torsoRoll = G.roll * F.roll;
      const X = gaitExtras(effU, runW, G, CROUCH.L1 + CROUCH.L2);
      torsoTwist += X.chestYaw;
      torsoRoll += X.chestRoll;

      m.position.y = bob;
      if (ud.lowerBody) {
        ud.lowerBody.position.x = X.swayX;
        ud.lowerBody.position.y = 0;
        ud.lowerBody.rotation.y = lowerYaw + X.pelvisYaw;
        ud.lowerBody.rotation.z = Math.sin(phase) * (F.hipRoll[0] + (F.hipRoll[1] - F.hipRoll[0]) * runW);
      }
      if (ud.torsoG) {
        ud.torsoG.position.y = (ud.torsoPivotY || 0.7) + Math.abs(ud.lowerBody ? ud.lowerBody.rotation.z : 0) * 0.05;
        ud.torsoG.rotation.set(torsoLean, torsoTwist, torsoRoll);
      }
      if (ud.headG) {
        ud.headG.rotation.set(-torsoLean * 0.5 + G.hx * F.head, G.hy * F.head - lowerYaw * 0.1, G.hz * F.head);
      }
      ud.legLG.rotation.set(G.thighL, X.legYaw, X.legZ);
      ud.kneeLG.rotation.x = G.kneeL;
      ud.legRG.rotation.set(G.thighR, X.legYaw, X.legZ);
      ud.kneeRG.rotation.x = G.kneeR;
      if (ud.ankleLG) ud.ankleLG.rotation.x = -(G.thighL + G.kneeL) * 0.8 + X.ankleL;
      if (ud.ankleRG) ud.ankleRG.rotation.x = -(G.thighR + G.kneeR) * 0.8 + X.ankleR;
    } else {
      const amp = Math.min(1, speed / 7) * 0.65;
      ud.legLG.rotation.x = Math.sin(phase) * amp;
      ud.legRG.rotation.x = -Math.sin(phase) * amp;
      ud.kneeLG.rotation.x = Math.max(0, -Math.cos(phase)) * amp * 1.1;
      ud.kneeRG.rotation.x = Math.max(0, Math.cos(phase)) * amp * 1.1;
    }
  }
  if (crouch > 0) applyCrouchIK(m, crouch, phase, Math.min(1, speed / 2.2));
}

export function applyDivePose(m, u, mode = 'full') {
  const ud = m.userData;
  const diveState = mode === 'prone'
    ? { phase: 'lie', t: 0.35, dirX: 0, dirZ: 1 }
    : { phase: 'air', t: u * DIVE.air, dirX: 0, dirZ: 1 };
  const vy = mode === 'prone' ? 0 : (0.5 - u) * 5.0;
  const lie = diveLie(diveState, vy);
  const dp = divePose(diveState, vy);
  m.position.y = mode === 'prone' ? 0.20 : 0.22 + Math.sin(u * Math.PI) * 0.52;
  m.rotation.x = (Math.PI / 2 - 0.14) * lie.flat;
  if (dp) {
    if (ud.torsoG) ud.torsoG.rotation.set(dp.chest || 0, 0, dp.side || 0);
    if (ud.headG) ud.headG.rotation.set((-0.45 * lie.flat) + (dp.head || 0), 0, 0);
    if (ud.legLG) ud.legLG.rotation.set(dp.legL || 0, 0, dp.spread || 0);
    if (ud.legRG) ud.legRG.rotation.set(dp.legR || 0, 0, -(dp.spread || 0));
    if (ud.kneeLG) ud.kneeLG.rotation.x = dp.kneeL || 0;
    if (ud.kneeRG) ud.kneeRG.rotation.x = dp.kneeR || 0;
    if (ud.ankleLG) ud.ankleLG.rotation.x = dp.ankleL || 0;
    if (ud.ankleRG) ud.ankleRG.rotation.x = dp.ankleR || 0;
  }
}

export function applyVaultPose(m, u) {
  const P = sampleVault(u);
  const s = Math.sin(u * Math.PI);
  const ud = m.userData;
  m.position.y = P && P.hipLift != null ? P.hipLift : s * 0.56;
  if (ud.torsoG) {
    ud.torsoG.rotation.x = P && P.torsoPitch != null ? P.torsoPitch : 0.35 * s;
    ud.torsoG.rotation.z = P && P.torsoRoll != null ? P.torsoRoll : -0.18 * s;
  }
  ud.legLG.rotation.set(P && P.thighL != null ? P.thighL : -0.95 * s, 0, -0.15 * s);
  ud.kneeLG.rotation.set(P && P.kneeL != null ? P.kneeL : 1.45 * s, 0, 0);
  ud.legRG.rotation.set(P && P.thighR != null ? P.thighR : -0.45 * s, 0, 0.15 * s);
  ud.kneeRG.rotation.set(P && P.kneeR != null ? P.kneeR : 0.85 * s, 0, 0);
  m.updateMatrixWorld(true);
  const plantW = _hv.a.set(-0.18, 0.72, 0.32);
  solveArmIK(ud.armLG, ud.elbowLG, _HAND_L, plantW, _POLE_L, Math.sin(u * Math.PI));
  poseHands(m, 'fist', 'open');
}

// 1:1 with poseLadder + ladderHands in index.html lines 18330-18395
export function applyClimbPose(m, u) {
  const ud = m.userData;
  if (ud.weaponMount) ud.weaponMount.visible = false;
  const cyc = u * Math.PI * 2;
  const sL = Math.sin(cyc), sR = Math.sin(cyc + Math.PI);
  const cL = Math.cos(cyc), cR = Math.cos(cyc + Math.PI);
  m.position.set(0, -0.08, 0.04);
  if (ud.torsoG) ud.torsoG.rotation.set(0.10, 0.06 * sL, 0);
  if (ud.headG) ud.headG.rotation.set(-0.35, 0, 0);
  // 2-bone leg solve onto ladder rungs at z = 0.28
  const L1 = 0.27, L2 = 0.2502;
  for (let s = 0; s < 2; s++) {
    const leg = s ? ud.legRG : ud.legLG, kn = s ? ud.kneeRG : ud.kneeLG, an = s ? ud.ankleRG : ud.ankleLG;
    const phaseS = s ? sR : sL;
    const rungY = 0.25 + (s ? 0.15 : 0) + 0.15 * phaseS;
    const ty = rungY + 0.11 - 0.62, tz = 0.16;
    const d = Math.min(L1 + L2 - 0.002, Math.max(0.06, Math.hypot(ty, tz)));
    const k = Math.acos(Math.max(-1, Math.min(1, (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2))));
    const a = Math.atan2(-tz, -ty) - Math.atan2(L2 * Math.sin(k), L1 + L2 * Math.cos(k));
    leg.rotation.set(a, 0, 0);
    kn.rotation.set(k, 0, 0);
    if (an) an.rotation.set(-(a + k) - 0.05, 0, 0);
  }
  m.updateMatrixWorld(true);
  const handLW = _hv.a.set(-0.18, 1.15 + 0.15 * cL, 0.26);
  const handRW = _hv.b.set( 0.18, 1.15 + 0.15 * cR, 0.26);
  solveArmIK(ud.armLG, ud.elbowLG, _HAND_L, handLW, _POLE_L, 1);
  solveArmIK(ud.armRG, ud.elbowRG, _HAND_R, handRW, _POLE_R, 1);
  poseHands(m, 'fist', 'fist');
}

export function applyBedExitPose(m, u) {
  const B = sampleBedExit(u);
  if (B) {
    m.position.set(B.x || 0, B.y || 0, B.z || 0);
    if (m.userData.torsoG && B.torsoPitch != null) m.userData.torsoG.rotation.x = B.torsoPitch;
    if (m.userData.legLG && B.thighL != null) m.userData.legLG.rotation.x = B.thighL;
    if (m.userData.legRG && B.thighR != null) m.userData.legRG.rotation.x = B.thighR;
    if (m.userData.kneeLG && B.kneeL != null) m.userData.kneeLG.rotation.x = B.kneeL;
    if (m.userData.kneeRG && B.kneeR != null) m.userData.kneeRG.rotation.x = B.kneeR;
  }
}

export function applyCrewStationPose(m, role, u, stageProps) {
  const ud = m.userData;
  if (ud.weaponMount) ud.weaponMount.visible = false;
  if (role === 'm240_gunner') {
    m.position.y -= (WATCHMAN && WATCHMAN.drop) || 0.12;
    applyCrouchIK(m, 0.35);
    if (ud.torsoG) ud.torsoG.rotation.x = 0.14;
    if (ud.headG) ud.headG.rotation.x = -0.08;
    const elev = stageProps && stageProps.m240 && stageProps.m240.userData.elev;
    if (elev) {
      watchmanHandsInspector(m, elev, [0.025, -0.105, -0.15], [-0.095, 0.005, -0.02], 1, 1, false);
    }
  } else if (role === 'mortar_gunner') {
    applyCrouchIK(m, 0.85);
    if (ud.lowerBody) ud.lowerBody.rotation.y = -0.8;
    if (ud.torsoG) { ud.torsoG.rotation.y = -0.68; ud.torsoG.rotation.x = 0.42; }
    m.updateMatrixWorld(true);
    solveArmIK(ud.armRG, ud.elbowRG, _HAND_R, _hv.a.set(-0.18, 0.62, 0.34), _POLE_R, 1);
    solveArmIK(ud.armLG, ud.elbowLG, _HAND_L, _hv.b.set(-0.28, 0.56, 0.32), _POLE_L, 1);
    poseHands(m, 'fist', 'fist');
  } else if (role === 'mortar_loader') {
    applyCrouchIK(m, 0.78);
    const drop = _pulse(u, 0.20, 0.50, 0.80);
    if (ud.lowerBody) ud.lowerBody.rotation.y = -0.8;
    if (ud.torsoG) { ud.torsoG.rotation.y = -0.68; ud.torsoG.rotation.x = 0.36 + 0.14 * drop; }
    m.updateMatrixWorld(true);
    solveArmIK(ud.armRG, ud.elbowRG, _HAND_R, _hv.a.set(-0.28, 0.92 - 0.24 * drop, 0.34), _POLE_R, 1);
    solveArmIK(ud.armLG, ud.elbowLG, _HAND_L, _hv.b.set(-0.36, 0.88 - 0.24 * drop, 0.34), _POLE_L, 1);
    poseHands(m, 'fist', 'fist');
  }
}

export const ANIMATION_CATALOG = [
  // Poses & Weapon Holds
  { id: 'pose_cif_preview',  name: 'CIF Wardrobe Preview Stance', cat: 'Poses & Weapon Holds', duration: 4.0, loop: true,  weaponOverride: null,       desc: 'Subtle breathing and arm hold from the CIF locker preview.', source: 'index.html :: poseDressPreview() + holdWeapon()' },
  { id: 'pose_tpose',        name: 'Neutral Rig / T-Pose',        cat: 'Poses & Weapon Holds', duration: 2.0, loop: true,  weaponOverride: 'none',     desc: 'Zeroed bind pose for checking shoulder caps, waist loft, and boot shafts.', source: 'index.html :: makeMarine() + studio/marine-body.js' },
  { id: 'pose_unarmed',      name: 'Unarmed Relaxed Stand',       cat: 'Poses & Weapon Holds', duration: 3.0, loop: true,  weaponOverride: 'none',     desc: 'Holstered unarmed stance with inward wrist hang.', source: 'index.html :: UNARMED_ARMS + poseHands(hang)' },
  { id: 'hold_active_hip',   name: 'Active Weapon — Hip Hold',    cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: null,       desc: 'Standard two-handed weapon hip hold using WEAPON_HOLD + 2-bone IK.', source: 'index.html :: holdWeapon(m, w, gun, { ads: 0 })' },
  { id: 'hold_active_ads',   name: 'Active Weapon — Shoulder ADS',cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: null,       desc: 'RMB shouldered sight alignment with cheekWeld() and head/torso yaw.', source: 'index.html :: holdShoulderGun() + cheekWeld() (SHOULDER_HOLD)' },
  { id: 'hold_m4_ads',       name: 'M4A1 Carbine — Shoulder ADS', cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'm4',       desc: 'M4 carbine raised to eye line via cheekWeld().', source: 'index.html :: SHOULDER_HOLD.m4 + cheekWeld()' },
  { id: 'hold_sniper_ads',   name: 'M40A5 Sniper — Shoulder ADS', cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'sniper',   desc: 'Sniper rifle shouldered scope alignment.', source: 'index.html :: SHOULDER_HOLD.sniper + cheekWeld()' },
  { id: 'hold_pistol_2h',    name: 'M9 Pistol — Two-Hand Hold',   cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'pistol',   desc: 'Service pistol two-hand grip and support cup.', source: 'index.html :: WEAPON_HOLD.pistol + holdHand()' },
  { id: 'hold_minigun',      name: 'M134 Minigun — Top-Bar Hold', cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'minigun',  desc: 'Heavy underslung minigun hold with top spade grip.', source: 'index.html :: WEAPON_HOLD.minigun (palmR:-1, palmL:-1)' },
  { id: 'hold_chainsaw',     name: 'Chainsaw — Top-Bar Hold',     cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'chainsaw', desc: 'Two-stroke chainsaw low hip hold with top loop bar.', source: 'index.html :: WEAPON_HOLD.chainsaw (palmL:-1)' },
  { id: 'hold_akimbo_pistol',name: 'Akimbo Dual M9 Pistols',      cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'pistol',   desc: 'Dual-wield pistol stance from AKIMBO_CARRY.', source: 'index.html :: AKIMBO_CARRY.pistol' },
  { id: 'hold_akimbo_uzi',   name: 'Akimbo Dual Micro Uzis',      cat: 'Poses & Weapon Holds', duration: 2.5, loop: true,  weaponOverride: 'uzi',      desc: 'Dual-wield Uzi SMG stance from AKIMBO_CARRY.', source: 'index.html :: AKIMBO_CARRY.uzi' },

  // Locomotion & Studio Clips
  { id: 'loco_walk',         name: 'Walk Forward (Studio Gait)',  cat: 'Locomotion & Clips',   duration: 1.05, loop: true, weaponOverride: null,       desc: 'Walk cycle blended from studio/clips/marine/walk.json via marineGait().', source: 'index.html :: marineGait(u, 0) + studio/clips/marine/walk.json' },
  { id: 'loco_run',          name: 'Run Sprint (Studio Gait)',    cat: 'Locomotion & Clips',   duration: 0.72, loop: true, weaponOverride: null,       desc: 'Sprint cycle blended from studio/clips/marine/run.json via marineGait().', source: 'index.html :: marineGait(u, 1) + studio/clips/marine/run.json' },
  { id: 'loco_strafe_l',     name: 'Strafe Left (Gait Hip Twist)',cat: 'Locomotion & Clips',   duration: 0.95, loop: true, weaponOverride: null,       desc: 'Sideways strafe with lowerBody counter-yaw and torso twist.', source: 'index.html :: updateMarinePose() lowerYaw + marineGait()' },
  { id: 'loco_strafe_r',     name: 'Strafe Right (Gait Hip Twist)',cat: 'Locomotion & Clips',  duration: 0.95, loop: true, weaponOverride: null,       desc: 'Rightward strafe with lowerBody counter-yaw and torso twist.', source: 'index.html :: updateMarinePose() lowerYaw + marineGait()' },
  { id: 'loco_backpedal',    name: 'Backpedal (Reverse Gait)',    cat: 'Locomotion & Clips',   duration: 1.05, loop: true, weaponOverride: null,       desc: 'Reverse stride cycle when moving backward while aiming forward.', source: 'index.html :: updateMarinePose(strideDir=-1) + marineGait()' },
  { id: 'loco_crouch_idle',  name: 'Crouch Idle (2-Bone Leg IK)', cat: 'Locomotion & Clips',   duration: 2.4, loop: true,  weaponOverride: null,       desc: 'Crouched stance solving 2-bone thigh/shin/ankle IK.', source: 'index.html :: updateMarinePose() CROUCH 2-bone leg IK' },
  { id: 'loco_crouch_walk',  name: 'Crouch Walk (IK + Gait)',     cat: 'Locomotion & Clips',   duration: 1.2, loop: true,  weaponOverride: null,       desc: 'Low crouched walk combining gait stride with crouch hip drop.', source: 'index.html :: updateMarinePose() CROUCH IK + marineGait()' },
  { id: 'loco_turn_l',       name: 'Turn-In-Place Step Left',     cat: 'Locomotion & Clips',   duration: 0.9, loop: true,  weaponOverride: null,       desc: 'Pivoting footwork when turning aim past deadzone.', source: 'studio/marine-turn.js :: createMarineTurn()' },
  { id: 'loco_turn_r',       name: 'Turn-In-Place Step Right',    cat: 'Locomotion & Clips',   duration: 0.9, loop: true,  weaponOverride: null,       desc: 'Rightward pivot footstep when turning aim.', source: 'studio/marine-turn.js :: createMarineTurn()' },
  { id: 'idle_smoking',      name: 'Boredom & Cigarette Smoke Idle', cat: 'Locomotion & Clips', duration: 8.0, loop: true, weaponOverride: 'none',     desc: 'Pack draw, lighter spark, and smoking cycle after SMOKE_AFTER.', source: 'studio/marine-idle.js :: createMarineIdle()' },

  // Reloads (1:1 RELOAD_PLAN)
  { id: 'reload_active',     name: 'Reload — Active Weapon',      cat: 'Weapon Reloads',       duration: 2.1, loop: true,  weaponOverride: null,       desc: 'Full reload sequence for whichever weapon is selected.', source: 'index.html :: updateReloadAnim() + RELOAD_PLAN[active]' },
  { id: 'reload_m4',         name: 'Reload — M4A1 Mag & Bolt',    cat: 'Weapon Reloads',       duration: 2.0, loop: true,  weaponOverride: 'm4',       desc: 'Mag drop, pouch fetch, magwell seat, and bolt-catch rack.', source: 'index.html :: RELOAD_PLAN.m4 + reload-rifle.hand.json' },
  { id: 'reload_ak',         name: 'Reload — AK-47 Rock-In Mag',  cat: 'Weapon Reloads',       duration: 2.1, loop: true,  weaponOverride: 'ak',       desc: 'AK rock-in magazine insertion and charging handle rack.', source: 'index.html :: RELOAD_PLAN.ak (rockIn: 0.35)' },
  { id: 'reload_aa12',       name: 'Reload — AA-12 Drum Swap',    cat: 'Weapon Reloads',       duration: 2.3, loop: true,  weaponOverride: 'aa12',     desc: '20-round drum swap and bolt rack.', source: 'index.html :: RELOAD_PLAN.aa12 (kind: drum)' },
  { id: 'reload_shotgun',    name: 'Reload — M870 Shell-by-Shell',cat: 'Weapon Reloads',       duration: 2.6, loop: true,  weaponOverride: 'shotgun',  desc: 'Individual 12ga shell insertion into loading port + pump rack.', source: 'index.html :: RELOAD_PLAN.shotgun (shells + pump)' },
  { id: 'reload_sniper',     name: 'Reload — M40A5 Mag & Bolt',   cat: 'Weapon Reloads',       duration: 2.3, loop: true,  weaponOverride: 'sniper',   desc: 'Box mag swap and bolt handle lift/draw/throw.', source: 'index.html :: RELOAD_PLAN.sniper + sniperBoltPose()' },
  { id: 'reload_pistol',     name: 'Reload — M9 Pistol Mag & Slide', cat: 'Weapon Reloads',    duration: 1.7, loop: true,  weaponOverride: 'pistol',   desc: 'Pistol magazine drop/insert and overhand slide rack.', source: 'index.html :: RELOAD_PLAN.pistol (rackKey: slide)' },
  { id: 'reload_revolver',   name: 'Reload — .357 Swing Cylinder',cat: 'Weapon Reloads',       duration: 2.4, loop: true,  weaponOverride: 'revolver', desc: 'Swing-out cylinder open, casing dump, and speedloader insert.', source: 'index.html :: RELOAD_PLAN.revolver (kind: cylinder)' },
  { id: 'reload_launcher',   name: 'Reload — M79 Breach Load 40mm',cat: 'Weapon Reloads',      duration: 2.2, loop: true,  weaponOverride: 'launcher', desc: 'Break-action 40mm grenade breach load.', source: 'index.html :: RELOAD_PLAN.launcher (kind: breach)' },
  { id: 'reload_minigun',    name: 'Reload — Minigun Belt Box',   cat: 'Weapon Reloads',       duration: 2.8, loop: true,  weaponOverride: 'minigun',  desc: 'Heavy 300-round ammo box unlatch and feed seating.', source: 'index.html :: RELOAD_PLAN.minigun (kind: box)' },
  { id: 'reload_flamer',     name: 'Reload — Flamer Fuel Canister',cat: 'Weapon Reloads',      duration: 2.6, loop: true,  weaponOverride: 'flamer',   desc: 'Napalm pressure canister swap.', source: 'index.html :: RELOAD_PLAN.flamer (kind: canister)' },
  { id: 'saw_starter_pull',  name: 'Chainsaw Pull-Cord Starter',  cat: 'Weapon Reloads',       duration: 1.5, loop: true,  weaponOverride: 'chainsaw', desc: 'Left hand braces top bar while right hand yanks starter cord.', source: 'game/chainsaw-animation.js :: sawStartPose() + poseSawStarter()' },

  // Combat, Melee, Grenade & Traversal
  { id: 'melee_knife',       name: 'Combat Knife Slash',          cat: 'Combat & Traversal',   duration: 0.55, loop: true, weaponOverride: 'none',     desc: 'Fast close-combat knife slash arc.', source: 'index.html :: updateKnifeAnim() + bladeSwingPose(katana=false)' },
  { id: 'melee_katana_1',    name: 'Katana Slash — Combo Cut 1',  cat: 'Combat & Traversal',   duration: 0.65, loop: true, weaponOverride: 'none',     desc: 'Two-handed diagonal katana draw cut.', source: 'index.html :: bladeSwingPose(katana=true, combo=0)' },
  { id: 'melee_katana_2',    name: 'Katana Slash — Combo Cut 2',  cat: 'Combat & Traversal',   duration: 0.65, loop: true, weaponOverride: 'none',     desc: 'Two-handed reverse return katana cut.', source: 'index.html :: bladeSwingPose(katana=true, combo=1)' },
  { id: 'grenade_throw',     name: 'Frag Grenade Pin-Pull & Throw',cat: 'Combat & Traversal',  duration: 1.15, loop: true, weaponOverride: null,       desc: 'Pin pull, windup, overhand release, and follow-through.', source: 'index.html :: updateGrenadeAnim() + GR_KEY' },
  { id: 'jump_standing',     name: 'Jump — Standing Vertical',    cat: 'Combat & Traversal',   duration: 0.85, loop: true, weaponOverride: null,       desc: 'Takeoff knee tuck, apex hang, and landing compression.', source: 'game/marine-jump.js :: jumpPose(u, "standing")' },
  { id: 'jump_running',      name: 'Jump — Running Stride Leap',  cat: 'Combat & Traversal',   duration: 0.85, loop: true, weaponOverride: null,       desc: 'Split-leg running leap from marine-jump.js.', source: 'game/marine-jump.js :: jumpPose(u, "running")' },
  { id: 'air_freefall',      name: 'Airborne Freefall Counter-Swing',cat: 'Combat & Traversal',duration: 1.8, loop: true,  weaponOverride: null,       desc: 'Extended airborne leg pedaling and torso pitch.', source: 'studio/marine-air.js :: airPose(fallSec)' },
  { id: 'dive_full',         name: 'Shootdodge Dive — Launch',    cat: 'Combat & Traversal',   duration: 1.1, loop: true,  weaponOverride: null,       desc: 'Max Payne shootdodge airborne flight pose (V key).', source: 'studio/marine-dive-pose.js :: divePose() + studio/marine-dive.js' },
  { id: 'dive_prone',        name: 'Shootdodge Dive — Prone Aim', cat: 'Combat & Traversal',   duration: 2.0, loop: true,  weaponOverride: null,       desc: 'Post-dive ground prone shooting alignment.', source: 'studio/marine-dive.js :: diveLie() + plantDiveLeg()' },
  { id: 'vault_hurdle',      name: 'Sandbag / Wall Hurdle Vault', cat: 'Combat & Traversal',   duration: 0.75, loop: true, weaponOverride: null,       desc: 'One-hand obstacle brace and hip hurdle vault.', source: 'game/player-vault.js :: sampleVault()', prop: 'wall' },
  { id: 'climb_ladder',      name: 'Watchtower Ladder Climb (IK)',cat: 'Combat & Traversal',   duration: 1.2, loop: true,  weaponOverride: 'none',     desc: '4-limb rung climbing solver with upward head look.', source: 'index.html :: poseClimb() 4-limb ladder IK', prop: 'ladder' },

  // Crew-Served, Carry & Camp Interactions
  { id: 'carry_mortar',      name: 'Carry 60mm Mortar Tube',      cat: 'Crew & Camp',          duration: 1.4, loop: true,  weaponOverride: 'none',     desc: 'Right-shoulder collapsed 60mm mortar carry.', source: 'index.html :: updateCarryPose("mortar") + CARRY_ARM' },
  { id: 'carry_m240',        name: 'Carry M240B Machine Gun',     cat: 'Crew & Camp',          duration: 1.4, loop: true,  weaponOverride: 'none',     desc: 'Right-shoulder folded M240B tripod carry.', source: 'index.html :: watchmanCarry() + watchmanHands() + CARRY_M240' },
  { id: 'crew_m240_gunner',  name: 'M240B Tripod Gunner Station', cat: 'Crew & Camp',          duration: 2.0, loop: true,  weaponOverride: 'none',     desc: 'Braced gunner stance behind the tripod M240B.', source: 'game/watchman-mg.js :: watchmanPose() + watchmanHands()', prop: 'm240' },
  { id: 'crew_mortar_gunner',name: 'Mortar Pit — Gunner Aiming',  cat: 'Crew & Camp',          duration: 2.0, loop: true,  weaponOverride: 'none',     desc: 'Crouched mortar gunner traverse/elevation grip.', source: 'studio/crew-footwork.js + updateMortarCrew()', prop: 'mortar' },
  { id: 'crew_mortar_loader',name: 'Mortar Pit — Loader Drop',    cat: 'Crew & Camp',          duration: 1.8, loop: true,  weaponOverride: 'none',     desc: 'Mortar loader shell drop into muzzle.', source: 'studio/crew-footwork.js :: mortarLoadU()', prop: 'mortar' },
  { id: 'camp_cot_exit',     name: 'Barracks Cot Sit-Up & Stand', cat: 'Crew & Camp',          duration: 1.8, loop: true,  weaponOverride: 'none',     desc: 'Waking up on the barracks cot and swinging boots to floor.', source: 'studio/marine-bed-exit.js :: sampleBedExit()', prop: 'cot' },
  { id: 'camp_lighter',      name: 'Campfire Kneeling Lighter',   cat: 'Crew & Camp',          duration: 2.2, loop: true,  weaponOverride: 'none',     desc: 'Kneeling campfire ignition with brass lighter.', source: 'index.html :: poseCampfireLighter()', prop: 'campfire' }
];
// === Stage Context Props, Clip Loader, Pose Evaluator & Inspector UI =============
function buildStageProps(scene) {
  const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4328, roughness: 0.85 });
  const matSteel = new THREE.MeshStandardMaterial({ color: 0x363a3d, roughness: 0.45, metalness: 0.65 });
  const matSand = new THREE.MeshStandardMaterial({ color: 0x8a7b5c, roughness: 0.92 });
  const matCanvas = new THREE.MeshStandardMaterial({ color: 0x4b5338, roughness: 0.88 });
  const group = new THREE.Group();
  scene.add(group);

  const ladder = new THREE.Group();
  const railGeo = new THREE.BoxGeometry(0.04, 2.4, 0.05);
  const railL = new THREE.Mesh(railGeo, matWood); railL.position.set(-0.20, 1.2, 0.28);
  const railR = new THREE.Mesh(railGeo, matWood); railR.position.set( 0.20, 1.2, 0.28);
  ladder.add(railL, railR);
  for (let y = 0.25; y <= 2.25; y += 0.30) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.40, 8), matSteel);
    rung.rotation.z = Math.PI / 2; rung.position.set(0, y, 0.28);
    ladder.add(rung);
  }
  ladder.visible = false; group.add(ladder);

  const wall = new THREE.Group();
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col <= 1; col++) {
      const bag = new THREE.Mesh(rbox(0.42, 0.22, 0.26, 0.06), matSand);
      bag.position.set(col * 0.40 + (row % 2) * 0.12, 0.11 + row * 0.20, 0.36);
      wall.add(bag);
    }
  }
  wall.visible = false; group.add(wall);

  const cot = new THREE.Group();
  const sheet = new THREE.Mesh(rbox(0.76, 0.06, 1.85, 0.02), matCanvas);
  sheet.position.set(0, 0.40, -0.15); cot.add(sheet);
  for (const [x, z] of [[-0.35, -0.95], [0.35, -0.95], [-0.35, 0.65], [0.35, 0.65]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.40, 0.04), matWood);
    leg.position.set(x, 0.20, z); cot.add(leg);
  }
  cot.visible = false; group.add(cot);

  const campfire = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), matSand);
    stone.position.set(Math.cos(a) * 0.24, 0.05, 0.55 + Math.sin(a) * 0.24);
    campfire.add(stone);
  }
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.38, 7), matWood);
    log.rotation.set(0.35, i * 1.05, Math.PI / 2 - 0.3);
    log.position.set(0, 0.09, 0.55);
    campfire.add(log);
  }
  campfire.visible = false; group.add(campfire);

  const wCtx = weaponModelContext();
  const mortar = makeMortarModel(wCtx, null, false);
  mortar.position.set(-0.34, 0, 0.38);
  mortar.visible = false; group.add(mortar);

  const m240 = makeM240Model(wCtx, false);
  m240.position.set(0, 0, 0.46);
  m240.visible = false; group.add(m240);

  return { group, ladder, wall, cot, campfire, mortar, m240 };
}

async function preloadMarineClips() {
  const clips = { dy: { walk: 0, run: 0 }, reloadClip: null, knifeClip: null, macheteClip: null };
  const names = ['walk', 'run'];
  await Promise.all([
    ...names.map(async (n) => {
      try {
        const json = await Studio.fetchClipJson('marine/' + n);
        const clip = Studio.loadClip(json);
        clips[n] = clip;
        let lo = Infinity;
        for (const f of ['footL', 'footR']) for (const k of (json.tracks[f] && json.tracks[f].ik) || []) lo = Math.min(lo, k[1][1]);
        clips.dy[n] = Number.isFinite(lo) ? 0.10 - lo : 0;
      } catch (e) {
        console.warn('[MarineInspector] Could not load clip marine/' + n, e);
      }
    }),
    Studio.fetchHandPath('reload-rifle').then((c) => { clips.reloadClip = c; }).catch(() => {}),
    Studio.fetchHandPath('knife-slash').then((c) => { clips.knifeClip = c; }).catch(() => {}),
    Studio.fetchHandPath('machete-chop').then((c) => { clips.macheteClip = c; }).catch(() => {})
  ]);
  return { clips };
}

export function evaluateMarinePose(ctx, anim, u, tSec) {
  const { marine, weaponMeshes, GUN_BASE, props, stageProps, clips, idleRig, state } = ctx;
  resetMarineRig(marine, props);
  if (idleRig && idleRig.reset) idleRig.reset();

  // Determine effective held weapon for this animation
  let wKey = state.weaponMode === 'unarmed' ? 'none' : state.weaponSelect;
  if (anim.weaponOverride !== null && anim.weaponOverride !== undefined) {
    wKey = anim.weaponOverride;
  }
  const bladeMode = state.weaponMode === 'blade' && anim.weaponOverride === null;

  for (const [k, mesh] of Object.entries(weaponMeshes)) {
    mesh.visible = !bladeMode && (k === wKey);
    if (GUN_BASE[k]) {
      mesh.position.copy(GUN_BASE[k].pos);
      mesh.rotation.copy(GUN_BASE[k].rot);
    }
    const ud = mesh.userData;
    for (const [pk, bk] of [['mag', 'Mag'], ['bolt', 'Bolt'], ['slide', 'Slide'], ['pump', 'Pump'], ['cylinder', 'Cylinder'], ['drum', 'Drum'], ['ammoBox', 'Ammo']]) {
      if (ud[pk] && ud['base' + bk + 'Pos']) ud[pk].position.copy(ud['base' + bk + 'Pos']);
      if (ud[pk] && ud['base' + bk + 'Rot']) ud[pk].rotation.copy(ud['base' + bk + 'Rot']);
    }
  }
  const activeGun = weaponMeshes[wKey] || null;
  const adsVal = state.modShoulderADS ? 1 : 0;
  const akimboVal = !!state.modAkimbo;

  // Stage prop visibility
  const propType = anim.prop || 'none';
  for (const k of ['ladder', 'wall', 'cot', 'campfire', 'mortar', 'm240']) {
    if (stageProps[k]) stageProps[k].visible = (k === propType);
  }

  const phase = u * Math.PI * 2;
  const id = anim.id;

  if (bladeMode && !id.startsWith('melee_')) {
    const isKatana = state.bladeSelect === 'katana';
    updateKnifeAnimInspector(marine, props.knife, 0.36, isKatana, 0, clips, 'none', null);
  } else if (id === 'pose_tpose') {
    if (marine.userData.weaponMount) marine.userData.weaponMount.visible = false;
    marine.userData.armLG.rotation.set(0, 0,  1.35);
    marine.userData.armRG.rotation.set(0, 0, -1.35);
    marine.userData.elbowLG.rotation.set(0, 0, 0);
    marine.userData.elbowRG.rotation.set(0, 0, 0);
    poseHands(marine, 'open', 'open');
  } else if (id === 'pose_unarmed') {
    holdWeapon(marine, 'none', null);
  } else if (id === 'pose_cif_preview') {
    if (marine.userData.torsoG) marine.userData.torsoG.rotation.y = Math.sin(phase) * 0.04;
    if (marine.userData.headG) marine.userData.headG.rotation.y = -Math.sin(phase) * 0.03;
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'hold_active_hip') {
    holdWeapon(marine, wKey, activeGun, { ads: 0, akimbo: akimboVal });
  } else if (id === 'hold_active_ads' || id === 'hold_m4_ads' || id === 'hold_sniper_ads') {
    holdWeapon(marine, wKey, activeGun, { ads: 1, akimbo: false });
  } else if (id === 'hold_pistol_2h' || id === 'hold_minigun' || id === 'hold_chainsaw') {
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: false });
  } else if (id === 'hold_akimbo_pistol' || id === 'hold_akimbo_uzi') {
    holdWeapon(marine, wKey, activeGun, { ads: 0, akimbo: true });
  } else if (id === 'loco_walk') {
    applyLocomotionPose(marine, clips, { u, speed: 3.5, crouch: 0, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_run') {
    applyLocomotionPose(marine, clips, { u, speed: 7.2, crouch: 0, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal * 0.35, akimbo: akimboVal, carry: akimboVal ? 0.85 : 0 });
  } else if (id === 'loco_strafe_l') {
    applyLocomotionPose(marine, clips, { u, speed: 3.8, crouch: 0, strafe: -1, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_strafe_r') {
    applyLocomotionPose(marine, clips, { u, speed: 3.8, crouch: 0, strafe: 1, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_backpedal') {
    applyLocomotionPose(marine, clips, { u, speed: 3.4, crouch: 0, back: true, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_crouch_idle') {
    applyLocomotionPose(marine, clips, { u, speed: 0, crouch: 1, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_crouch_walk') {
    applyLocomotionPose(marine, clips, { u, speed: 2.2, crouch: 1, unarmed: wKey === 'none' });
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'loco_turn_l' || id === 'loco_turn_r') {
    const dir = id === 'loco_turn_l' ? 1 : -1;
    const lift = Math.sin(u * Math.PI);
    if (marine.userData.lowerBody) marine.userData.lowerBody.rotation.y = dir * 0.28 * Math.sin(phase);
    if (marine.userData.torsoG) marine.userData.torsoG.rotation.y = -dir * 0.14 * Math.sin(phase);
    marine.userData.legLG.rotation.x = -0.25 * lift * (dir > 0 ? 1 : 0.4);
    marine.userData.kneeLG.rotation.x = 0.45 * lift * (dir > 0 ? 1 : 0.4);
    marine.userData.legRG.rotation.x = -0.25 * lift * (dir < 0 ? 1 : 0.4);
    marine.userData.kneeRG.rotation.x = 0.45 * lift * (dir < 0 ? 1 : 0.4);
    holdWeapon(marine, wKey, activeGun, { ads: adsVal, akimbo: akimboVal });
  } else if (id === 'idle_smoking') {
    holdWeapon(marine, 'none', null);
    if (idleRig) {
      idleRig.reset();
      idleRig.step(25.2 + u * 12.0, { eligible: true, active: false, paused: false });
      idleRig.pose(0.016);
    }
  } else if (id.startsWith('reload_')) {
    updateReloadAnimInspector(marine, wKey, activeGun, u, GUN_BASE);
  } else if (id === 'saw_starter_pull') {
    holdWeapon(marine, 'chainsaw', activeGun, { ads: 0 });
    poseSawStarter(marine, activeGun, u);
  } else if (id === 'melee_knife') {
    updateKnifeAnimInspector(marine, props.knife, u, false, 0, clips, state.weaponSelect, weaponMeshes[state.weaponSelect]);
  } else if (id === 'melee_katana_1') {
    updateKnifeAnimInspector(marine, props.knife, u, true, 0, clips, state.weaponSelect, weaponMeshes[state.weaponSelect]);
  } else if (id === 'melee_katana_2') {
    updateKnifeAnimInspector(marine, props.knife, u, true, 1, clips, state.weaponSelect, weaponMeshes[state.weaponSelect]);
  } else if (id === 'grenade_throw') {
    updateGrenadeAnimInspector(marine, props.grenadeHand, u, state.weaponSelect, weaponMeshes[state.weaponSelect]);
  } else if (id === 'jump_standing' || id === 'jump_running') {
    const vyNorm = 1 - 2 * u;
    const fwdSpd = id === 'jump_running' ? 6.5 : 0;
    const AP = airPose(vyNorm, fwdSpd, 0, 1, {});
    marine.position.y = Math.sin(u * Math.PI) * 0.48;
    if (marine.userData.torsoG) {
      marine.userData.torsoG.rotation.x += AP.lean || 0;
      marine.userData.torsoG.rotation.z -= AP.side || 0;
    }
    if (marine.userData.headG) marine.userData.headG.rotation.x += AP.head || 0;
    if (marine.userData.legLG) marine.userData.legLG.rotation.set((AP.thighL || 0) - (AP.kneeL || 0) * 0.35, 0, AP.legZL || 0);
    if (marine.userData.legRG) marine.userData.legRG.rotation.set((AP.thighR || 0) - (AP.kneeR || 0) * 0.35, 0, AP.legZR || 0);
    if (marine.userData.kneeLG) marine.userData.kneeLG.rotation.x = AP.kneeL || 0;
    if (marine.userData.kneeRG) marine.userData.kneeRG.rotation.x = AP.kneeR || 0;
    if (marine.userData.ankleLG) marine.userData.ankleLG.rotation.x = -(marine.userData.legLG.rotation.x + (AP.kneeL || 0)) * 0.35;
    if (marine.userData.ankleRG) marine.userData.ankleRG.rotation.x = -(marine.userData.legRG.rotation.x + (AP.kneeR || 0)) * 0.35;
    holdWeapon(marine, wKey, activeGun, { ads: adsVal * 0.5, akimbo: akimboVal });
  } else if (id === 'air_freefall') {
    const AP = airPose(-0.85, 2.2 * Math.sin(phase), 1.4 * Math.cos(phase), 1, {});
    marine.position.y = 0.35;
    if (marine.userData.torsoG) {
      marine.userData.torsoG.rotation.x += AP.lean || 0;
      marine.userData.torsoG.rotation.z -= AP.side || 0;
    }
    if (marine.userData.headG) marine.userData.headG.rotation.x += AP.head || 0;
    if (marine.userData.legLG) marine.userData.legLG.rotation.set((AP.thighL || 0) - (AP.kneeL || 0) * 0.35, 0, AP.legZL || 0);
    if (marine.userData.legRG) marine.userData.legRG.rotation.set((AP.thighR || 0) - (AP.kneeR || 0) * 0.35, 0, AP.legZR || 0);
    if (marine.userData.kneeLG) marine.userData.kneeLG.rotation.x = AP.kneeL || 0;
    if (marine.userData.kneeRG) marine.userData.kneeRG.rotation.x = AP.kneeR || 0;
    holdWeapon(marine, wKey, activeGun, { ads: 0, akimbo: akimboVal });
  } else if (id === 'dive_full' || id === 'dive_prone') {
    applyDivePose(marine, u, id === 'dive_prone' ? 'prone' : 'full');
    holdWeapon(marine, wKey, activeGun, { ads: 0, akimbo: akimboVal });
  } else if (id === 'vault_hurdle') {
    holdWeapon(marine, wKey, activeGun, { ads: 0, skipSupportHand: true });
    applyVaultPose(marine, u);
  } else if (id === 'climb_ladder') {
    applyClimbPose(marine, u);
  } else if (id === 'carry_mortar') {
    applyLocomotionPose(marine, clips, { u, speed: 2.6, crouch: 0, unarmed: true });
    if (marine.userData.weaponMount) marine.userData.weaponMount.visible = false;
    updateCarryPoseInspector(marine, 'mortar', props, phase);
  } else if (id === 'carry_m240') {
    applyLocomotionPose(marine, clips, { u, speed: 2.6, crouch: 0, unarmed: true });
    if (marine.userData.weaponMount) marine.userData.weaponMount.visible = false;
    updateCarryPoseInspector(marine, 'm240', props, phase);
  } else if (id.startsWith('crew_')) {
    applyCrewStationPose(marine, id.slice(5), u, stageProps);
  } else if (id === 'camp_cot_exit') {
    applyBedExitPose(marine, u);
    holdWeapon(marine, 'none', null);
  } else if (id === 'camp_lighter') {
    poseCampfireLighter(marine, props.lighterHand, u, tSec);
  }

  // Aim Yaw / Pitch manual offsets
  if (state.aimYaw || state.aimPitch) {
    if (marine.userData.torsoG) {
      marine.userData.torsoG.rotation.y += (Number(state.aimYaw) || 0) * 0.65;
      marine.userData.torsoG.rotation.x += (Number(state.aimPitch) || 0) * 0.55;
    }
    if (marine.userData.headG) {
      marine.userData.headG.rotation.y += (Number(state.aimYaw) || 0) * 0.35;
      marine.userData.headG.rotation.x += (Number(state.aimPitch) || 0) * 0.45;
    }
  }

  // Keep flexible shirt waist and live shoulder caps synced 1:1 with index.html
  followMarineWaist(THREE, marine.userData);
  if (marine.userData.waist && marine.userData.waist.bend) marine.userData.waist.bend();
  if (marine.userData.liveShoulder) {
    for (const s of marine.userData.liveShoulder) s.bend();
  }
}

const CAM_BOOKMARKS = {
  full:   { yaw: 0.48,  pitch: 0.12, dist: 3.10, at: [0.0, 0.85, 0.0] },
  threeQ: { yaw: 0.78,  pitch: 0.16, dist: 2.85, at: [0.0, 0.86, 0.0] },
  head:   { yaw: 0.35,  pitch: 0.10, dist: 0.72, at: [0.0, 1.44, 0.04] },
  torso:  { yaw: 0.45,  pitch: 0.10, dist: 1.15, at: [0.0, 1.04, 0.05] },
  hands:  { yaw: 0.55,  pitch: 0.12, dist: 0.85, at: [0.08, 0.88, 0.24] },
  back:   { yaw: 2.75,  pitch: 0.14, dist: 1.85, at: [0.0, 0.98, -0.08] },
  boots:  { yaw: 0.48,  pitch: 0.14, dist: 1.15, at: [0.0, 0.36, 0.02] }
};

function fmtRad(r) {
  return (r || 0).toFixed(2);
}

function updateJointReadout(marine, el) {
  if (!el || !marine) return;
  const u = marine.userData;
  const rows = [
    ['armRG',   u.armRG?.rotation],
    ['elbowRG', u.elbowRG?.rotation],
    ['wristRG', u.wristRG?.rotation],
    ['armLG',   u.armLG?.rotation],
    ['elbowLG', u.elbowLG?.rotation],
    ['wristLG', u.wristLG?.rotation],
    ['torsoG',  u.torsoG?.rotation],
    ['lower',   u.lowerBody?.rotation],
    ['headG',   u.headG?.rotation],
    ['legLG',   u.legLG?.rotation],
    ['kneeLG',  u.kneeLG?.rotation],
    ['legRG',   u.legRG?.rotation],
    ['kneeRG',  u.kneeRG?.rotation],
    ['mountP',  u.weaponMount?.position]
  ];
  el.innerHTML = '<strong>LIVE 1:1 RIG TELEMETRY</strong><br/>' + rows.map(([name, v]) => {
    if (!v) return `${name}: —`;
    return `${name}: [${fmtRad(v.x)}, ${fmtRad(v.y)}, ${fmtRad(v.z)}]`;
  }).join('<br/>');
}

export async function initMarineInspector() {
  const viewport = document.getElementById('viewport');
  if (!viewport) return;

  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: true });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  renderer.shadowMap.enabled = true;
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14181d);

  const camera = new THREE.PerspectiveCamera(38, viewport.clientWidth / viewport.clientHeight, 0.05, 60);
  const orbit = { yaw: 0.48, pitch: 0.12, dist: 3.10, at: new THREE.Vector3(0, 0.85, 0) };
  function placeCam() {
    const cp = Math.cos(orbit.pitch), sp = Math.sin(orbit.pitch);
    camera.position.set(
      orbit.at.x + Math.sin(orbit.yaw) * cp * orbit.dist,
      orbit.at.y + sp * orbit.dist,
      orbit.at.z + Math.cos(orbit.yaw) * cp * orbit.dist
    );
    camera.lookAt(orbit.at);
  }
  placeCam();

  // Interactive Orbit + Pan + Wheel Zoom on viewport canvas
  let dragBtn = -1, lastX = 0, lastY = 0;
  renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  renderer.domElement.addEventListener('pointerdown', (e) => {
    dragBtn = e.button; lastX = e.clientX; lastY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (dragBtn < 0) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (dragBtn === 0) {
      orbit.yaw -= dx * 0.007;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.007, -1.2, 1.35);
    } else {
      orbit.at.y = THREE.MathUtils.clamp(orbit.at.y + dy * 0.0025, 0.05, 1.85);
    }
    placeCam();
  });
  renderer.domElement.addEventListener('pointerup', () => { dragBtn = -1; });
  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.dist = THREE.MathUtils.clamp(orbit.dist * (1 + Math.sign(e.deltaY) * 0.09), 0.32, 6.5);
    placeCam();
  }, { passive: false });

  function setCameraBookmark(name) {
    const bm = CAM_BOOKMARKS[name] || CAM_BOOKMARKS.full;
    orbit.yaw = bm.yaw; orbit.pitch = bm.pitch; orbit.dist = bm.dist;
    orbit.at.set(bm.at[0], bm.at[1], bm.at[2]);
    placeCam();
  }

  // Lighting
  const hemi = new THREE.HemisphereLight(0xdce6f2, 0x3a352c, 0.9);
  scene.add(hemi);
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.9);
  keyLight.position.set(2.8, 4.2, 3.2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  Object.assign(keyLight.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 0.5, far: 12 });
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x90b4e8, 0.65);
  fillLight.position.set(-2.6, 2.2, 1.4);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xdbe8ff, 0.75);
  rimLight.position.set(0.4, 2.8, -3.0);
  scene.add(rimLight);

  // Ground & Grid
  const ground = new THREE.Mesh(new THREE.CircleGeometry(4.5, 48), new THREE.MeshStandardMaterial({ color: 0x1a1f26, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(6, 24, 0x3a4654, 0x252c35);
  grid.position.y = 0.002;
  scene.add(grid);

  const jointMarkers = new THREE.Group();
  jointMarkers.visible = false;
  scene.add(jointMarkers);

  // Build 1:1 Marine, Weapons, Offhand Mount, Carry Rig, Blades & Props
  const marine = makeMarine({ legacyBody: false });
  scene.add(marine);

  const { meshes: weaponMeshes, GUN_BASE } = buildAllWeapons();
  for (const gun of Object.values(weaponMeshes)) {
    gun.visible = false;
    marine.userData.weaponMount.add(gun);
  }
  const offhandMount = new THREE.Group();
  offhandMount.visible = false;
  marine.userData.gripL.add(offhandMount);
  const { meshes: offhandMeshes } = buildAllWeapons();
  for (const gun of Object.values(offhandMeshes)) {
    gun.visible = false;
    offhandMount.add(gun);
  }
  marine.userData.offhandMount = offhandMount;
  marine.userData.offhandMeshes = offhandMeshes;

  const gunFurniture = registerGunFurniture(weaponMeshes);
  const carryRig = buildCarryRig(marine, weaponMeshes);
  const props = buildBladeMeshesAndProps(marine);
  marine.userData.katanaWorn = props.katanaWorn;
  const stageProps = buildStageProps(scene);

  const idleRig = createMarineIdle({
    THREE, marine, scene,
    solveArm: (side, target) => solveArmIK(
      marine.userData['arm' + side + 'G'],
      marine.userData['elbow' + side + 'G'],
      side === 'R' ? _HAND_R : _HAND_L,
      target,
      side === 'R' ? _POLE_R : _POLE_L,
      1
    ),
    smoke: () => {}, ground: () => 0, ignite: () => {}
  });
  const { clips } = await preloadMarineClips();

  // Populate camo & gun finish dropdowns from real CAMO_KEYS
  const camoSelectIds = ['camoUniform', 'camoVest', 'camoPouches', 'camoPack', 'camoHelmet', 'camoGloves'];
  const allCamos = ['m81', ...CAMO_KEYS.filter((k) => k !== 'm81')];
  for (const id of camoSelectIds) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    sel.innerHTML = allCamos.map((k) => `<option value="${k}">${k}</option>`).join('');
  }
  const gunFinishSel = document.getElementById('gunFinish');
  if (gunFinishSel) {
    gunFinishSel.innerHTML = ['issue', RUNE_FINISH_KEY, ...allCamos].map((k) => `<option value="${k}">${k}</option>`).join('');
  }

  // Inspector State matching marine-inspector.html IDs
  const state = {
    gear_helmet: true,
    gear_nvg: true,
    gear_nvgDown: false,
    gear_vest: true,
    gear_pouches: true,
    gear_pack: true,
    gear_shirt: true,
    gear_gloves: true,
    gear_trousers: true,
    gear_boots: true,
    gear_insulatedBoots: false,
    sleevesMode: 'down',
    trouserCut: 'trousers',
    dressSkin: '1',
    dressEyes: 'brown',
    dressHairColor: 'darkBrown',
    dressBootColor: 'black',
    dressHat: 'none',
    dressEyewear: 'none',
    camoUniform: 'm81',
    camoVest: 'coyoteBrown',
    camoPouches: 'coyoteBrown',
    camoPack: 'm81',
    camoHelmet: 'm81',
    camoGloves: 'coyoteBrown',
    weaponMode: 'gun',
    gunFinish: 'issue',
    weaponSelect: 'm4',
    bladeSelect: 'knife',
    modShoulderADS: false,
    modSuppressor: false,
    modExtMag: false,
    modHeavyBarrel: false,
    modLaser: false,
    modAkimbo: false,
    modKatanaWorn: true,
    carrySlung0: 'shotgun',
    carrySlung1: 'sniper',
    carryHolster0: 'uzi',
    carryHolster1: '',
    carryHip: 'pistol',
    carryHipPair: '',
    carryMags: 3,
    carryGrenades: 2,
    carryShells: 6,
    carryRounds40: 0,
    carryBoxes: 0,
    carryTanks: 0,
    aimYaw: 0,
    aimPitch: 0,
    chkTurntable: false,
    chkWireframe: false,
    chkAxes: false,
    chkGrid: true
  };

  function syncAll() {
    syncMarineAppearance(marine, state);
    const picks = {};
    if (state.gunFinish && state.gunFinish !== 'issue') {
      for (const k of Object.keys(weaponMeshes)) picks[k] = state.gunFinish;
    }
    dressGuns(gunFurniture, picks);

    for (const [k, gun] of Object.entries(weaponMeshes)) {
      fitGunSuppressor(gun, k, state.modSuppressor);
      gunExtLook(gun, k, state.modExtMag);
      gunHeavyLook(gun, k, state.modHeavyBarrel);
      if (gun.userData.laser) gun.userData.laser.visible = !!state.modLaser && k === state.weaponSelect;
    }

    const plan = {
      slung: [state.carrySlung0 || null, state.carrySlung1 || null],
      holstered: [state.carryHolster0 || null, state.carryHolster1 || null],
      holsteredPairs: [null, null],
      hip: state.carryHip || null,
      hipPair: state.carryHipPair || null,
      counts: {
        mags: Number(state.carryMags) || 0,
        grenades: Number(state.carryGrenades) || 0,
        shells: Number(state.carryShells) || 0,
        rounds40: Number(state.carryRounds40) || 0,
        boxes: Number(state.carryBoxes) || 0,
        tanks: Number(state.carryTanks) || 0
      },
      bands: {
        bandolier: (Number(state.carryShells) || 0) > 0,
        belt40: (Number(state.carryRounds40) || 0) > 0
      }
    };
    applyCarryPlan(carryRig, plan, !!state.gear_vest, !!state.gear_pack);

    marine.traverse((o) => {
      if (o.isMesh && o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => { m.wireframe = !!state.chkWireframe; });
        else o.material.wireframe = !!state.chkWireframe;
      }
    });
    grid.visible = !!state.chkGrid;
    ground.visible = !!state.chkGrid;
  }

  // Bind all state keys to matching DOM inputs
  for (const key of Object.keys(state)) {
    const el = document.getElementById(key);
    if (!el) continue;
    if (el.type === 'checkbox') {
      el.checked = !!state[key];
      el.addEventListener('change', () => { state[key] = el.checked; syncAll(); });
    } else {
      el.value = String(state[key]);
      el.addEventListener('input', () => {
        state[key] = el.type === 'range' ? Number(el.value) : el.value;
        const valEl = document.getElementById(key + 'Val');
        if (valEl) valEl.textContent = String(el.value);
        syncAll();
      });
    }
  }

  // Quick CIF Presets
  function applyPreset(overrides) {
    Object.assign(state, overrides);
    for (const [k, v] of Object.entries(state)) {
      const el = document.getElementById(k);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = String(v);
      const valEl = document.getElementById(k + 'Val');
      if (valEl) valEl.textContent = String(v);
    }
    syncAll();
  }

  document.querySelectorAll('[data-cif-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = btn.dataset.cifPreset;
      if (p === 'full') applyPreset({
        gear_helmet: true, gear_nvg: true, gear_nvgDown: false, gear_vest: true, gear_pouches: true, gear_pack: true,
        gear_shirt: true, gear_gloves: true, gear_trousers: true, gear_boots: true, gear_insulatedBoots: false,
        sleevesMode: 'down', trouserCut: 'trousers', dressHat: 'none', dressEyewear: 'none', modKatanaWorn: true,
        carrySlung0: 'shotgun', carrySlung1: 'sniper', carryHolster0: 'uzi', carryHip: 'pistol', carryMags: 3, carryGrenades: 2, carryShells: 6
      });
      else if (p === 'specops') applyPreset({
        gear_helmet: true, gear_nvg: true, gear_nvgDown: true, gear_vest: true, gear_pouches: true, gear_pack: false,
        sleevesMode: 'rolled', trouserCut: 'trousers', dressEyewear: 'goggles', modSuppressor: true, modLaser: true
      });
      else if (p === 'jungle') applyPreset({
        gear_helmet: false, gear_nvg: false, gear_vest: false, gear_pouches: true, gear_pack: true,
        sleevesMode: 'rolled', trouserCut: 'trousers', dressHat: 'boonie', dressEyewear: 'aviators'
      });
      else if (p === 'shorts') applyPreset({
        gear_helmet: false, gear_nvg: false, gear_vest: false, gear_pouches: false, gear_pack: false,
        sleevesMode: 'rolled', trouserCut: 'shorts', dressHat: 'ballcapBack', dressEyewear: 'pitViper',
        carrySlung0: '', carrySlung1: '', carryHolster0: '', carryShells: 0
      });
      else if (p === 'stripped') applyPreset({
        gear_helmet: false, gear_nvg: false, gear_vest: false, gear_pouches: false, gear_pack: false,
        gear_shirt: true, gear_gloves: false, gear_trousers: true, gear_boots: true, modKatanaWorn: false,
        sleevesMode: 'rolled', trouserCut: 'shorts', dressHat: 'none', dressEyewear: 'none',
        carrySlung0: '', carrySlung1: '', carryHolster0: '', carryHolster1: '', carryHip: '', carryHipPair: '',
        carryMags: 0, carryGrenades: 0, carryShells: 0, carryRounds40: 0, carryBoxes: 0, carryTanks: 0
      });
    });
  });

  // Joint Pivot Markers
  const markerGeo = new THREE.SphereGeometry(0.018, 10, 8);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0x58a6ff, depthTest: false });
  const trackedJoints = ['lowerBody', 'torsoG', 'headG', 'armLG', 'elbowLG', 'wristLG', 'armRG', 'elbowRG', 'wristRG', 'legLG', 'kneeLG', 'ankleLG', 'legRG', 'kneeRG', 'ankleRG', 'weaponMount'];
  const markerMeshes = trackedJoints.map((k) => {
    const m = new THREE.Mesh(markerGeo, markerMat);
    m.renderOrder = 999;
    jointMarkers.add(m);
    return { key: k, mesh: m };
  });

  // Populate Animation Category Filter & List
  const animCatSel = document.getElementById('animCategory');
  const categories = ['All Categories', ...new Set(ANIMATION_CATALOG.map((a) => a.cat))];
  if (animCatSel) {
    animCatSel.innerHTML = categories.map((c) => `<option value="${c}">${c}</option>`).join('');
  }

  let currentAnim = ANIMATION_CATALOG[0];
  let playing = true;
  let speedMult = 1.0;
  let animPhase = 0;
  let totalSec = 0;
  let catFilter = 'All Categories';
  let searchFilter = '';

  const animListEl = document.getElementById('animList');
  const activeAnimIndex = document.getElementById('activeAnimIndex');
  const activeAnimTitle = document.getElementById('activeAnimTitle');
  const activeAnimDesc = document.getElementById('activeAnimDesc');
  const activeAnimSource = document.getElementById('activeAnimSource');
  const animScrubber = document.getElementById('animScrubber');
  const animTimeReadout = document.getElementById('animTimeReadout');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const jointReadoutEl = document.getElementById('jointReadout');
  const statusBadge = document.getElementById('statusBadge');

  function getFilteredAnims() {
    return ANIMATION_CATALOG.filter((a) => {
      if (catFilter !== 'All Categories' && a.cat !== catFilter) return false;
      if (searchFilter && !a.name.toLowerCase().includes(searchFilter) && !a.id.toLowerCase().includes(searchFilter) && !a.source.toLowerCase().includes(searchFilter)) return false;
      return true;
    });
  }

  function renderAnimList() {
    if (!animListEl) return;
    const list = getFilteredAnims();
    animListEl.innerHTML = '';
    let lastCat = null;
    list.forEach((a) => {
      if (a.cat !== lastCat) {
        lastCat = a.cat;
        const h = document.createElement('div');
        h.className = 'anim-cat-header';
        h.textContent = a.cat;
        animListEl.appendChild(h);
      }
      const globalIdx = ANIMATION_CATALOG.indexOf(a) + 1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'anim-row' + (a.id === currentAnim.id ? ' active' : '');
      btn.innerHTML = `<span class="anim-idx">#${globalIdx}</span><span>${a.name}</span><span class="anim-dur">${a.duration.toFixed(1)}s</span>`;
      btn.addEventListener('click', () => selectAnim(a.id));
      animListEl.appendChild(btn);
    });
  }

  function selectAnim(id) {
    const found = ANIMATION_CATALOG.find((a) => a.id === id);
    if (!found) return;
    currentAnim = found;
    animPhase = 0;
    const idx = ANIMATION_CATALOG.indexOf(currentAnim) + 1;
    if (activeAnimIndex) activeAnimIndex.textContent = `${idx} / ${ANIMATION_CATALOG.length}`;
    if (activeAnimTitle) activeAnimTitle.textContent = currentAnim.name;
    if (activeAnimDesc) activeAnimDesc.textContent = currentAnim.desc || '';
    if (activeAnimSource) activeAnimSource.textContent = `Source: ${currentAnim.source}`;
    renderAnimList();
  }

  function stepAnim(delta) {
    const list = getFilteredAnims();
    if (!list.length) return;
    const i = list.findIndex((a) => a.id === currentAnim.id);
    const next = list[(i + delta + list.length) % list.length];
    selectAnim(next.id);
  }

  animCatSel?.addEventListener('change', (e) => { catFilter = e.target.value; renderAnimList(); });
  document.getElementById('animSearch')?.addEventListener('input', (e) => {
    searchFilter = (e.target.value || '').trim().toLowerCase();
    renderAnimList();
  });

  btnPlayPause?.addEventListener('click', () => {
    playing = !playing;
    btnPlayPause.textContent = playing ? '⏸ Pause (Space)' : '▶ Play (Space)';
  });
  document.getElementById('btnPrevAnim')?.addEventListener('click', () => stepAnim(-1));
  document.getElementById('btnNextAnim')?.addEventListener('click', () => stepAnim(1));
  document.getElementById('animSpeed')?.addEventListener('change', (e) => {
    speedMult = Number(e.target.value) || 1.0;
  });
  animScrubber?.addEventListener('input', () => {
    playing = false;
    if (btnPlayPause) btnPlayPause.textContent = '▶ Play (Space)';
    animPhase = Number(animScrubber.value) || 0;
  });
  document.getElementById('btnResetAim')?.addEventListener('click', () => {
    state.aimYaw = 0; state.aimPitch = 0;
    const yEl = document.getElementById('aimYaw'), pEl = document.getElementById('aimPitch');
    if (yEl) yEl.value = '0';
    if (pEl) pEl.value = '0';
  });

  // Camera focus buttons
  document.querySelectorAll('[data-cam-focus]').forEach((btn) => {
    btn.addEventListener('click', () => setCameraBookmark(btn.dataset.camFocus));
  });

  // Lighting preset
  document.getElementById('lightingPreset')?.addEventListener('change', (e) => {
    const mode = e.target.value;
    if (mode === 'day') {
      scene.background.setHex(0x263240); hemi.intensity = 1.1; keyLight.intensity = 2.3; keyLight.color.setHex(0xfff6e5);
    } else if (mode === 'night') {
      scene.background.setHex(0x08120c); hemi.intensity = 0.45; keyLight.intensity = 1.1; keyLight.color.setHex(0x66ff99);
    } else if (mode === 'rim') {
      scene.background.setHex(0x0c0f12); hemi.intensity = 0.25; keyLight.intensity = 0.6; rimLight.intensity = 2.2;
    } else {
      scene.background.setHex(0x14181d); hemi.intensity = 0.9; keyLight.intensity = 1.9; keyLight.color.setHex(0xfff4e0); rimLight.intensity = 0.75;
    }
  });

  // Fidelity & Animation Issue Logger
  const flaggedIssues = [];
  const flaggedListEl = document.getElementById('flaggedList');
  const flagNoteInput = document.getElementById('flagNoteInput');
  document.getElementById('btnFlagIssue')?.addEventListener('click', () => {
    const note = (flagNoteInput?.value || '').trim() || 'Visual / pose issue flagged';
    const entry = `[${currentAnim.id} @ ${Math.round(animPhase * 100)}%] (${currentAnim.source}) — ${note}`;
    flaggedIssues.push(entry);
    if (flagNoteInput) flagNoteInput.value = '';
    if (flaggedListEl) {
      flaggedListEl.innerHTML = flaggedIssues.map((it) => `<div class="flag-item">${it}</div>`).join('');
    }
  });
  document.getElementById('btnCopyFlags')?.addEventListener('click', () => {
    if (navigator.clipboard) navigator.clipboard.writeText(flaggedIssues.join('\n'));
  });

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
    if (e.code === 'Space') { e.preventDefault(); btnPlayPause?.click(); }
    else if (e.key === '[' || e.key === 'ArrowUp') { e.preventDefault(); stepAnim(-1); }
    else if (e.key === ']' || e.key === 'ArrowDown') { e.preventDefault(); stepAnim(1); }
    else if (e.key === ',') { playing = false; animPhase = (animPhase - 0.02 + 1) % 1; }
    else if (e.key === '.') { playing = false; animPhase = (animPhase + 0.02) % 1; }
    else if (e.key === '1') setCameraBookmark('full');
    else if (e.key === '2') setCameraBookmark('threeQ');
    else if (e.key === '3') setCameraBookmark('head');
    else if (e.key === '4') setCameraBookmark('torso');
    else if (e.key === '5') setCameraBookmark('hands');
    else if (e.key === '6') setCameraBookmark('back');
    else if (e.key === '7') setCameraBookmark('boots');
  });

  window.addEventListener('resize', () => {
    if (!viewport.clientWidth || !viewport.clientHeight) return;
    camera.aspect = viewport.clientWidth / viewport.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  });

  const ctx = { marine, weaponMeshes, GUN_BASE, props, stageProps, clips, idleRig, state };
  syncAll();
  selectAnim(currentAnim.id);
  if (statusBadge) statusBadge.textContent = `1:1 GAME RIG READY · ${ANIMATION_CATALOG.length} ANIMS`;

  window.__marineInspector = {
    scene, camera, marine, weaponMeshes, carryRig, props, stageProps,
    state, ANIMATION_CATALOG, selectAnim, syncAll, applyPreset, setCameraBookmark,
    setScrub: (u) => { playing = false; animPhase = THREE.MathUtils.clamp(u, 0, 1); if (animScrubber) animScrubber.value = String(animPhase); },
    getCurrentAnim: () => currentAnim
  };

  let lastT = performance.now();
  const worldVec = new THREE.Vector3();
  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    totalSec += dt * speedMult;

    if (playing) {
      const dur = Math.max(0.1, currentAnim.duration || 1.5);
      animPhase += (dt * speedMult) / dur;
      if (currentAnim.loop !== false) animPhase = animPhase % 1;
      else animPhase = Math.min(1, animPhase);
      if (animScrubber) animScrubber.value = String(animPhase.toFixed(3));
    }

    if (animTimeReadout) {
      const dur = currentAnim.duration || 1.5;
      animTimeReadout.textContent = `${(animPhase * dur).toFixed(2)}s / ${dur.toFixed(2)}s (${Math.round(animPhase * 100)}%)`;
    }

    evaluateMarinePose(ctx, currentAnim, animPhase, totalSec);

    if (state.chkTurntable) {
      marine.rotation.y = (now * 0.0006) % (Math.PI * 2);
    }

    jointMarkers.visible = !!state.chkAxes;
    if (state.chkAxes) {
      marine.updateMatrixWorld(true);
      for (const jm of markerMeshes) {
        const obj = marine.userData[jm.key];
        if (obj) {
          obj.getWorldPosition(worldVec);
          jm.mesh.position.copy(worldVec);
        }
      }
    }

    updateJointReadout(marine, jointReadoutEl);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}
