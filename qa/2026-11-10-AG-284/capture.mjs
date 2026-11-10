// qa/2026-11-10-AG-284/capture.mjs
// Captures matched BEFORE and AFTER GPU renders across all 11 AG-284 model families,
// four distinct well-exposed lights (noon, overcast, dusk, night with local lamp),
// and tight studio-lit joint close-ups on RTX 5080 via DWInspect.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot: node crew/crew.mjs slot run antigravity AG-284 --checks "..." -- node qa/2026-11-10-AG-284/capture.mjs --before|--after');
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT_QA = HERE;
const OUT_REV = path.join(ROOT, 'review/AG-284');
fs.mkdirSync(OUT_QA, { recursive: true });
fs.mkdirSync(OUT_REV, { recursive: true });

const mode = process.argv.includes('--after') ? 'after' : 'before';

function writeRetry(filePath, data, retries = 20, delay = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      fs.writeFileSync(filePath, data);
      return;
    } catch (e) {
      if (i === retries - 1) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delay);
    }
  }
}

// 16 deterministic stage-relative camera views covering all 11 model families in AG-284:
// walls, floors, barricades, sandbags, wire, railing, platform, pillar, stairs,
// traps (spikes, mine, lure, barrel), and the skeletal marine.
const SHOTS = [
  {
    slug: '01-wall-t1',
    title: 'Wall T1 (Reinforced Plank)',
    id: 'build.wall',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.55, dy: 1.40, dz: 3.45, tdx: 0, tdy: 1.00, tdz: 0.88, fov: 38 }
  },
  {
    slug: '02-floor-t2',
    title: 'Floor T2 (Steel Tread Plate)',
    id: 'build.floor',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.45, dy: 1.15, dz: 1.75, tdx: 0, tdy: 0.14, tdz: 0, fov: 36 }
  },
  {
    slug: '03-barricade-t1',
    title: 'Barricade T1 (Braced)',
    id: 'build.barricade',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.35, dy: 1.05, dz: 3.15, tdx: 0, tdy: 0.65, tdz: 0.88, fov: 36 }
  },
  {
    slug: '04-barricade-t2',
    title: 'Barricade T2 (Czech Hedgehog)',
    id: 'build.barricade',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.35, dy: 1.05, dz: 3.05, tdx: 0, tdy: 0.60, tdz: 0.88, fov: 36 }
  },
  {
    slug: '05-sandbag-t1',
    title: 'Sandbag T1 (Double-Stacked)',
    id: 'build.sandbag',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.25, dy: 0.92, dz: 2.85, tdx: 0, tdy: 0.46, tdz: 0.82, fov: 35 }
  },
  {
    slug: '06-wire-t1',
    title: 'Wire T1 (Concertina)',
    id: 'build.wire',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.25, dy: 0.92, dz: 2.85, tdx: 0, tdy: 0.50, tdz: 0.82, fov: 35 }
  },
  {
    slug: '07-railing-t1',
    title: 'Railing T1 (Mesh Railing)',
    id: 'build.railing',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.25, dy: 0.92, dz: 2.95, tdx: 0, tdy: 0.52, tdz: 0.92, fov: 35 }
  },
  {
    slug: '08-platform-t2',
    title: 'Platform T2 (Gun Emplacement)',
    id: 'build.platform',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.75, dy: 1.35, dz: 2.15, tdx: 0, tdy: 0.35, tdz: 0, fov: 37 }
  },
  {
    slug: '09-pillar-t1',
    title: 'Pillar T1 (Concrete Pillar)',
    id: 'build.pillar',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 1.35, dy: 1.45, dz: 2.15, tdx: 0, tdy: 1.00, tdz: 0, fov: 36 }
  },
  {
    slug: '10-stairs-t2',
    title: 'Stairs T2 (Retractable Stairs)',
    id: 'build.stairs',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.95, dy: 1.55, dz: 2.35, tdx: 0, tdy: 0.95, tdz: 0, fov: 38 }
  },
  {
    slug: '11-spikes-t0',
    title: 'Trap: Spikes T0 (Sprung)',
    id: 'build.spikes',
    variant: '0',
    groundAtZero: true,
    sprungSpikes: true,
    cam: { dx: 1.35, dy: 1.05, dz: 1.65, tdx: 0, tdy: 0.16, tdz: 0, fov: 35 }
  },
  {
    slug: '12-lure-t2',
    title: 'Trap: Lure T2 (Tesla Beacon)',
    id: 'build.lure',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.15, dy: 1.28, dz: 1.95, tdx: 0, tdy: 0.90, tdz: 0, fov: 36 }
  },
  {
    slug: '13-barrel-t0',
    title: 'Trap: Barrel (Fuel Drum)',
    id: 'build.barrel',
    variant: null,
    groundAtZero: true,
    cam: { dx: 0.98, dy: 0.88, dz: 1.58, tdx: 0, tdy: 0.46, tdz: 0, fov: 35 }
  },
  {
    slug: '14-skeletal-marine',
    title: 'Skeletal Marine (Upper & Torso)',
    id: 'person.skeletal-marine',
    variant: null,
    groundAtZero: true,
    cam: { dx: 0.65, dy: 1.28, dz: 1.38, tdx: 0, tdy: 1.02, tdz: 0, fov: 35 }
  },
  {
    slug: '15-mine-t2',
    title: 'Trap: Mine T2 (Bounding Mine)',
    id: 'build.mine',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 0.78, dy: 0.58, dz: 1.02, tdx: 0, tdy: 0.16, tdz: 0, fov: 34 }
  },
  {
    slug: '16-skeletal-marine-full',
    title: 'Skeletal Marine (Full Rig & Boots)',
    id: 'person.skeletal-marine',
    variant: null,
    groundAtZero: true,
    cam: { dx: 1.05, dy: 0.98, dz: 2.55, tdx: 0, tdy: 0.72, tdz: 0, fov: 36 }
  }
];

// Representative models shown side-by-side across all four distinct lights (noon, overcast, dusk, night)
const FOUR_LIGHT_SHOTS = [
  {
    ...SHOTS[0], // 01 Wall T1 (Reinforced Plank) - full height & base framed
    cam: { dx: 1.75, dy: 1.48, dz: 3.85, tdx: 0, tdy: 1.05, tdz: 0.88, fov: 38 }
  },
  SHOTS[3],  // 04 Barricade T2 (Czech Hedgehog)
  {
    ...SHOTS[4], // 05 Sandbag T1 (Double-Stacked) - full base-to-duckboard cap framed
    cam: { dx: 1.45, dy: 1.26, dz: 3.45, tdx: 0, tdy: 0.68, tdz: 0.82, fov: 36 }
  },
  SHOTS[5],  // 06 Wire T1 (Concertina)
  SHOTS[7],  // 08 Platform T2 (Gun Emplacement)
  {
    ...SHOTS[11], // 12 Lure T2 (Tesla Beacon) - full base-to-top-torus framed
    cam: { dx: 1.38, dy: 1.36, dz: 2.62, tdx: 0, tdy: 0.96, tdz: 0, fov: 37 }
  },
  SHOTS[12], // 13 Barrel (Fuel Drum)
  {
    slug: '16-skeletal-marine-full',
    title: 'Skeletal Marine (Seated Full Rig)',
    id: 'person.skeletal-marine',
    variant: null,
    groundAtZero: true,
    cam: { dx: 0.95, dy: 0.95, dz: 2.75, tdx: 0, tdy: 0.84, tdz: 0, fov: 37 }
  }
];

// Tight studio-lit macro close-ups of fixed joints across all 11 model families
const CLOSEUP_SHOTS = [
  {
    slug: 'closeup-01-wall-t1-straps',
    title: 'Wall T1: Z-Layered Diagonal Iron Straps & Bolts',
    id: 'build.wall',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 0.62, dy: 1.12, dz: 2.05, tdx: 0, tdy: 0.98, tdz: 0.92, fov: 26 }
  },
  {
    slug: 'closeup-02-floor-t2-junction',
    title: 'Floor T2: Flush Center Cover Plate & Angle Rivets',
    id: 'build.floor',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 0.65, dy: 0.58, dz: 0.82, tdx: 0, tdy: 0.14, tdz: 0, fov: 28 }
  },
  {
    slug: 'closeup-03-barricade-t1-braces',
    title: 'Barricade T1: Z-Separated Rear Diagonal X-Braces',
    id: 'build.barricade',
    variant: '1',
    groundAtZero: true,
    cam: { dx: -0.75, dy: 0.72, dz: -0.55, tdx: 0, tdy: 0.55, tdz: 0.72, fov: 28 }
  },
  {
    slug: 'closeup-04-barricade-t2-gusset',
    title: 'Barricade T2: Czech Hedgehog Central Gusset & Flange',
    id: 'build.barricade',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 0.68, dy: 0.66, dz: 1.88, tdx: 0, tdy: 0.48, tdz: 0.90, fov: 27 }
  },
  {
    slug: 'closeup-05-sandbag-t1-cleats',
    title: 'Sandbag T1: Duckboard Planks Seated on Cross-Cleats',
    id: 'build.sandbag',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 0.76, dy: 1.58, dz: 1.88, tdx: 0.08, tdy: 1.26, tdz: 0.86, fov: 26 }
  },
  {
    slug: 'closeup-06-wire-t1-coils',
    title: 'Wire T1: Concertina Coils Seated on T-Posts & Clips',
    id: 'build.wire',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 0.68, dy: 0.72, dz: 1.85, tdx: 0.10, tdy: 0.54, tdz: 0.90, fov: 26 }
  },
  {
    slug: 'closeup-07-railing-t1-mesh',
    title: 'Railing T1: Layered Wire Mesh & Diagonal Stiffeners',
    id: 'build.railing',
    variant: '1',
    groundAtZero: true,
    cam: { dx: 0.65, dy: 0.68, dz: 1.92, tdx: 0.15, tdy: 0.48, tdz: 0.92, fov: 26 }
  },
  {
    slug: 'closeup-08-platform-t2-ring',
    title: 'Platform T2: Corner L-Plates, Sandbag Parapet & Ring',
    id: 'build.platform',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.05, dy: 0.76, dz: 1.22, tdx: 0.25, tdy: 0.34, tdz: 0.25, fov: 28 }
  },
  {
    slug: 'closeup-09-pillar-stairs',
    title: 'Stairs T2: Retractable Hinge, Treads & Gas-Strut Clevis',
    id: 'build.stairs',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 1.05, dy: 0.72, dz: 1.25, tdx: 0.22, tdy: 0.42, tdz: 0.35, fov: 28 }
  },
  {
    slug: 'closeup-10-spikes-t2-grid',
    title: 'Spikes T2: Murder-Grate Cross-Grid & Sprung Collars',
    id: 'build.spikes',
    variant: '2',
    groundAtZero: true,
    sprungSpikes: true,
    cam: { dx: 0.78, dy: 0.58, dz: 0.92, tdx: 0.15, tdy: 0.10, tdz: 0.15, fov: 27 }
  },
  {
    slug: 'closeup-11-lure-t2-spokes',
    title: 'Lure T2: Radial Torus Spokes Outside Center Pylon',
    id: 'build.lure',
    variant: '2',
    groundAtZero: true,
    cam: { dx: 0.52, dy: 1.68, dz: 0.72, tdx: 0, tdy: 1.56, tdz: 0, fov: 26 }
  },
  {
    slug: 'closeup-12-skeletal-boots',
    title: 'Skeletal Marine: Seated Right Boot Sole (y=0) & Left Foot',
    id: 'person.skeletal-marine',
    variant: null,
    groundAtZero: true,
    cam: { dx: 0.48, dy: 0.34, dz: 0.82, tdx: 0, tdy: 0.16, tdz: 0.04, fov: 28 }
  }
];

const LIGHTS = ['noon', 'overcast', 'dusk', 'night'];

function saveDataUrl(filePath, dataUrl) {
  const idx = dataUrl.indexOf(',');
  const buf = Buffer.from(dataUrl.slice(idx + 1), 'base64');
  writeRetry(filePath, buf);
  return buf.length;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Exact matched render for BEFORE/AFTER 16-shot comparison (identical studio + noon setup as before-*.png)
async function renderMatched(page, spec) {
  return page.evaluate(`(async () => {
    const spec = ${JSON.stringify(spec)};
    const I = window.DWInspect;
    const ix = I._ix;
    await I.still(false);
    I.backdrop('studio');
    I.light('noon');
    I.overlay('grid', true);
    I.overlay('bounds', false);
    I.overlay('axes', false);
    I.overlay('stick', false);
    await I.show(spec.id, spec.variant != null ? { variant: spec.variant, instant: true } : { instant: true });
    I.pause();
    const s = ix.subject;
    const C = ix.stage.center;
    if (spec.groundAtZero && s && s.root) {
      s.root.position.y = 0.002;
      s.holder.updateMatrixWorld(true);
    }
    if (spec.sprungSpikes && s && s.root && s.root.userData && s.root.userData.spikes) {
      s.root.userData.spikes.visible = true;
      s.root.userData.spikes.position.y = 0;
      s.holder.updateMatrixWorld(true);
    }
    I.camera({
      x: C.x + spec.cam.dx,
      y: C.y + spec.cam.dy,
      z: C.z + spec.cam.dz,
      tx: C.x + spec.cam.tdx,
      ty: C.y + spec.cam.tdy,
      tz: C.z + spec.cam.tdz,
      fov: spec.cam.fov
    });
    await I.stepAsync(2);
    return await I.shot({ type: 'image/png' });
  })()`);
}

// Distinct, well-exposed 4-light render (noon, overcast, dusk, night) + macro studio close-up render
async function renderLit(page, spec, lightKey) {
  return page.evaluate(`(async () => {
    const spec = ${JSON.stringify(spec)};
    const lightKey = ${JSON.stringify(lightKey)};
    const I = window.DWInspect;
    const ix = I._ix;
    const T = window.TT;
    const THREE = ix.THREE;
    await I.still(false);

    // Set world clock & stage backdrop to reinforce distinct sky/floor bounce per time-of-day
    const worldTimes = { noon: 0.50, overcast: 0.44, dusk: 0.74, night: 0.02, studio: 0.50 };
    if (T && T.setWorldTime && worldTimes[lightKey] != null) T.setWorldTime(worldTimes[lightKey]);

    const bd = lightKey === 'noon' || lightKey === 'studio' ? 'light' : (lightKey === 'night' ? 'dark' : 'studio');
    I.backdrop(bd);
    I.light(lightKey);

    // Tint the inspector sky dome with distinct sky palettes so noon, overcast, dusk, and night read unmistakably
    const dome = ix.stage.group.getObjectByName('inspector-backdrop');
    const domePalettes = {
      noon:     { top: 0x6ea6dc, mid: 0xcbe0f5, low: 0xb8bcc2 },
      overcast: { top: 0x77808b, mid: 0x9fa7b0, low: 0x80858c },
      dusk:     { top: 0x2e2b4a, mid: 0xc97444, low: 0x614436 },
      night:    { top: 0x070b14, mid: 0x131d33, low: 0x161a24 },
      studio:   { top: 0x9aa2ab, mid: 0xcbd0d6, low: 0xb4b8bc }
    };
    const dpal = domePalettes[lightKey];
    if (dome && dpal && dome.geometry?.attributes?.position && dome.geometry?.attributes?.color) {
      const P = dome.geometry.attributes.position, col = dome.geometry.attributes.color.array;
      const top = new THREE.Color(dpal.top), mid = new THREE.Color(dpal.mid), low = new THREE.Color(dpal.low), c = new THREE.Color();
      for (let i = 0; i < P.count; i++) {
        const h = P.getY(i) / 46;
        if (h >= 0) c.copy(mid).lerp(top, Math.pow(Math.min(1, h), 0.68));
        else c.copy(mid).lerp(low, Math.min(1, -h * 6));
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      dome.geometry.attributes.color.needsUpdate = true;
    }

    I.overlay('grid', true);
    I.overlay('bounds', false);
    I.overlay('axes', false);
    I.overlay('stick', false);

    await I.show(spec.id, spec.variant != null ? { variant: spec.variant, instant: true } : { instant: true });
    I.pause();
    const s = ix.subject;
    const C = ix.stage.center;
    if (spec.groundAtZero && s && s.root) {
      s.root.position.y = 0.002;
      s.holder.updateMatrixWorld(true);
    }
    if (spec.sprungSpikes && s && s.root && s.root.userData && s.root.userData.spikes) {
      s.root.userData.spikes.visible = true;
      s.root.userData.spikes.position.y = 0;
      s.holder.updateMatrixWorld(true);
    }

    const origStageFrame = ix.stage.frame;
    try {
      ix.stage.frame = (dt, focus) => {
        const res = origStageFrame(dt, focus);
        const { sun, hemi, ambientFill, moon } = ix.host;
        if (lightKey === 'noon') {
          // Bright warm high front-right sun + crisp rear ground shadow + bright blue-sky bounce
          sun.position.set(C.x + 36, C.y + 70, C.z + 54);
          sun.target.position.set(C.x, C.y, C.z);
          sun.target.updateMatrixWorld();
          sun.intensity = 3.7;
          sun.color.setHex(0xfff5dc);
          if (hemi) { hemi.intensity = 1.65; hemi.color.setHex(0xd8ebff); hemi.groundColor.setHex(0x9e907a); }
          if (ambientFill) ambientFill.intensity = 0.40;
        } else if (lightKey === 'overcast') {
          // Cool neutral diffuse overcast cloud layer: soft shadows, high sky wrap-around fill
          sun.position.set(C.x - 16, C.y + 78, C.z + 44);
          sun.target.position.set(C.x, C.y, C.z);
          sun.target.updateMatrixWorld();
          sun.intensity = 0.65;
          sun.color.setHex(0xdce4f2);
          if (hemi) { hemi.intensity = 2.35; hemi.color.setHex(0xd4deec); hemi.groundColor.setHex(0x80868e); }
          if (ambientFill) ambientFill.intensity = 0.56;
        } else if (lightKey === 'dusk') {
          // Low warm orange-amber sunset grazing from front-left across joints + twilight fill
          sun.position.set(C.x - 68, C.y + 22, C.z + 48);
          sun.target.position.set(C.x, C.y, C.z);
          sun.target.updateMatrixWorld();
          sun.intensity = 2.85;
          sun.color.setHex(0xff8c42);
          if (hemi) { hemi.intensity = 1.05; hemi.color.setHex(0xdc9a88); hemi.groundColor.setHex(0x52382c); }
          if (ambientFill) ambientFill.intensity = 0.30;
        } else if (lightKey === 'night') {
          // Cool blue moonlight rim + warm local inspection lamp beside camera aimed straight at the joints
          sun.position.set(C.x - 42, C.y + 62, C.z - 22);
          sun.target.position.set(C.x, C.y, C.z);
          sun.target.updateMatrixWorld();
          sun.intensity = 0.68;
          sun.color.setHex(0x7aa2f0);
          if (hemi) { hemi.intensity = 0.56; hemi.color.setHex(0x506cb0); hemi.groundColor.setHex(0x1c222e); }
          if (ambientFill) ambientFill.intensity = 0.22;
          if (moon) {
            moon.color.setHex(0xffd296);
            moon.position.set(C.x + spec.cam.dx * 0.85 + 0.9, C.y + spec.cam.dy + 0.65, C.z + spec.cam.dz * 0.85 + 0.65);
            moon.target.position.set(C.x + spec.cam.tdx, C.y + spec.cam.tdy, C.z + spec.cam.tdz);
            moon.target.updateMatrixWorld();
            moon.intensity = 2.75;
          }
        } else if (lightKey === 'studio') {
          // Macro close-up key aligned with camera quadrant (front or rear) + strong fill so every seam reads sharply
          const cdx = spec.cam.dx - spec.cam.tdx, cdz = spec.cam.dz - spec.cam.tdz;
          sun.position.set(C.x + cdx * 22 + 10, C.y + 52, C.z + cdz * 22 + 8);
          sun.target.position.set(C.x + spec.cam.tdx, C.y + spec.cam.tdy, C.z + spec.cam.tdz);
          sun.target.updateMatrixWorld();
          sun.intensity = 3.35;
          sun.color.setHex(0xfff6e5);
          if (hemi) { hemi.intensity = 1.75; hemi.color.setHex(0xe4eeff); hemi.groundColor.setHex(0x8c8e92); }
          if (ambientFill) ambientFill.intensity = 0.44;
        }
        return res;
      };

      I.camera({
        x: C.x + spec.cam.dx,
        y: C.y + spec.cam.dy,
        z: C.z + spec.cam.dz,
        tx: C.x + spec.cam.tdx,
        ty: C.y + spec.cam.tdy,
        tz: C.z + spec.cam.tdz,
        fov: spec.cam.fov
      });
      await I.stepAsync(2);
      return await I.shot({ type: 'image/png' });
    } finally {
      ix.stage.frame = origStageFrame;
      if (ix.host && ix.host.moon) ix.host.moon.intensity = 0;
      I.backdrop('studio');
    }
  })()`);
}

async function main() {
  console.log(`[AG-284] Launching off-screen RTX 5080 Inspector (${mode.toUpperCase()})...`);
  const server = await serve(ROOT, 0);
  const url = `${server.origin}/index.html?inspect`;
  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1280,960',
      '--disable-features=CalculateNativeWinOcclusion'
    ]
  });

  try {
    const page = await browser.newPage({ width: 1280, height: 960 });
    try {
      const { windowId } = await page.send('Browser.getWindowForTarget', {});
      await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000, width: 1280, height: 960 } });
    } catch { /* ignore */ }

    await page.goto(url, { timeout: 180000 });
    if (!(await page.waitFor('!!(window.DWInspect && window.DWInspect.ready)', { timeout: 180000 }))) {
      const err = await page.evaluate('window.DWInspectError || ""');
      throw new Error('DWInspect failed to ready: ' + err + ' ' + (page.errors[0] || ''));
    }
    await wait(600);
    const gpuInfo = await page.evaluate(`(() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return {
        rendererType: window.DWInspect._ix.host.renderer?.constructor?.name || 'unknown',
        gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown'
      };
    })()`);
    console.log('[AG-284] Renderer:', JSON.stringify(gpuInfo));

    // 1. 16 matched shots (exact camera & lighting parity between BEFORE and AFTER)
    for (const spec of SHOTS) {
      const dataUrl = await renderMatched(page, spec);
      const fn = `${mode}-${spec.slug}.png`;
      const pQa = path.join(OUT_QA, fn);
      const bytes = saveDataUrl(pQa, dataUrl);
      writeRetry(path.join(OUT_REV, fn), fs.readFileSync(pQa));
      console.log(`[AG-284] Saved ${fn} (${bytes} B)`);
    }

    if (mode === 'after') {
      // 2. Four distinct well-exposed lights (noon, overcast, dusk, night)
      for (const spec of FOUR_LIGHT_SHOTS) {
        for (const lightKey of LIGHTS) {
          const dataUrl = await renderLit(page, spec, lightKey);
          const fn = `light-${spec.slug}-${lightKey}.png`;
          const pQa = path.join(OUT_QA, fn);
          const bytes = saveDataUrl(pQa, dataUrl);
          writeRetry(path.join(OUT_REV, fn), fs.readFileSync(pQa));
          console.log(`[AG-284] Saved ${fn} (${bytes} B)`);
        }
      }

      // 3. 12 tight studio-lit macro close-ups of fixed joints & seated skeletal marine
      for (const spec of CLOSEUP_SHOTS) {
        const dataUrl = await renderLit(page, spec, 'studio');
        const fn = `${spec.slug}.png`;
        const pQa = path.join(OUT_QA, fn);
        const bytes = saveDataUrl(pQa, dataUrl);
        writeRetry(path.join(OUT_REV, fn), fs.readFileSync(pQa));
        console.log(`[AG-284] Saved ${fn} (${bytes} B)`);
      }
    }

    const errs = await page.evaluate('window.DWInspect.errors()');
    writeRetry(
      path.join(OUT_QA, `${mode}-capture-meta.json`),
      JSON.stringify({ mode, gpuInfo, shotCount: SHOTS.length, fourLightCount: FOUR_LIGHT_SHOTS.length * 4, closeupCount: CLOSEUP_SHOTS.length, errors: errs }, null, 2)
    );
    console.log(`[AG-284] ${mode.toUpperCase()} capture complete (${errs.length} inspector errors).`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('[AG-284] Capture failed:', err);
  process.exit(1);
});
