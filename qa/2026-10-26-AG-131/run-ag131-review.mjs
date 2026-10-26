import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';

const outDir = 'qa/2026-10-26-AG-131';
fs.mkdirSync(outDir, { recursive: true });

const engine = new Engine({ training: true, warm: 'none', size: [1280, 720] });
const t0 = Date.now();

try {
  await engine.open();
  const loadMs = Date.now() - t0;

  const result = await engine.page.evaluate(`(async () => {
    const T = window.TT;
    const H = T.inspectHost();
    const THREE = H.THREE;
    const C = await import('/studio/zombie-concepts.js');

    const tg = T.trainingDbg.tg();
    const r = tg.zombieRoom;
    const cx = (r.minX + r.maxX) * 0.5;
    const cz = (r.minZ + r.maxZ) * 0.5;
    const floorY = tg.floorY;

    T.runDevCommand('godmode');
    T.skipGrace();
    T.clearZombies();
    T.flightHold(true);
    T.setShotView(null);
    for (const code of ['Digit4', 'Digit2']) {
      document.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.at(-1), bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { code, key: code.at(-1), bubbles: true }));
    }

    const readEyes = (mesh) => {
      const mats = mesh.userData.eyeMats || (mesh.userData.eyes ? mesh.userData.eyes.map((e) => e.material) : []);
      return mats.map((m) => ({
        color: m.color ? m.color.getHexString() : null,
        emissive: m.emissive ? m.emissive.getHexString() : null,
        intensity: Number((m.emissiveIntensity ?? 0).toFixed(3)),
        baseEmissive: m.userData ? m.userData.baseEmissive : undefined,
      }));
    };

    const forceAuthoredBaseline = (mesh) => {
      const mats = mesh.userData.eyeMats || (mesh.userData.eyes ? mesh.userData.eyes.map((e) => e.material) : []);
      for (const m of mats) {
        if (m.userData && typeof m.userData.baseEmissive === 'number') {
          m.emissiveIntensity = m.userData.baseEmissive;
        }
      }
    };

    // 1. Audit all 14 concept builders + Wet/Iron Cave Guardians + Bluebell
    const conceptAudit = [];
    for (const kind of C.CONCEPT_TYPES) {
      const freshMesh = H.builders.zombie(kind);
      conceptAudit.push({
        kind,
        eyes: readEyes(freshMesh),
      });
    }
    const bluebellMesh = H.builders.zombie('spitter');
    C.prepareConvoySleeperAppearance(THREE, bluebellMesh);
    conceptAudit.push({
      kind: 'bluebell (convoy sleeper)',
      eyes: readEyes(bluebellMesh),
    });

    // 2. Probe live pool reuse after Cursor's CU-162 repair
    T.clearZombies();
    const zFirst = T.spawnZombie(cx, cz, 'shambler', true, true);
    const firstUuid = zFirst.mesh.uuid;
    const firstEyes = readEyes(zFirst.mesh);
    for (const m of zFirst.mesh.userData.eyeMats || []) m.emissiveIntensity = 0;
    T.clearZombies();
    const zReused = T.spawnZombie(cx, cz, 'shambler', true, true);
    const reusedEyes = readEyes(zReused.mesh);

    T.clearZombies();
    const sFirst = T.spawnZombie(cx, cz, 'screamer', true, true);
    const sUuid = sFirst.mesh.uuid;
    for (const m of sFirst.mesh.userData.eyeMats || []) m.emissiveIntensity = 0;
    T.clearZombies();
    const sReused = T.spawnZombie(cx, cz, 'screamer', true, true);
    const screamerReusedEyes = readEyes(sReused.mesh);

    const poolProbe = {
      sameBody: zReused.mesh.uuid === firstUuid,
      screamerSameBody: sReused.mesh.uuid === sUuid,
      firstEyes,
      reusedEyes,
      screamerReusedEyes,
      reusedRestoredTo0_9:
        reusedEyes.every((e) => Math.abs(e.intensity - 0.9) < 0.01) &&
        screamerReusedEyes.every((e) => Math.abs(e.intensity - 0.9) < 0.01),
      reusedOverriddenTo1_7: reusedEyes.some((e) => Math.abs(e.intensity - 1.7) < 0.01),
    };
    T.clearZombies();

    const snap = async (label) => {
      T.stepFrame(0);
      const src = T.renderer.domElement;
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);

      const th = document.createElement('canvas');
      th.width = 480;
      th.height = 270;
      const g = th.getContext('2d');
      g.drawImage(c, 0, 0, th.width, th.height);
      g.fillStyle = 'rgba(0,0,0,0.75)';
      g.fillRect(0, th.height - 28, th.width, 28);
      g.fillStyle = '#e8f5ee';
      g.font = 'bold 13px Consolas, monospace';
      g.fillText(label, 8, th.height - 9);
      return {
        label,
        png: c.toDataURL('image/png').split(',')[1],
        thumb: th.toDataURL('image/jpeg', 0.92).split(',')[1],
        render: {
          calls: T.renderer.info.render.calls,
          triangles: T.renderer.info.render.triangles,
        },
      };
    };

    const setEnv = async (lightsOn, flashlightOn, firstPerson, px, pz, yaw = 0, frames = 90) => {
      if (T.trainingDbg.lights().on !== lightsOn) T.trainingDbg.toggleLights();
      T.getGearOwned().flashlight = flashlightOn;
      T.applyGearVisibility();
      T.setViewFirstDbg(firstPerson);
      T.setShotView(null);
      T.player.position.set(px, floorY, pz);
      T.player.rotation.y = yaw;
      for (let i = 0; i < frames; i++) {
        for (const z of T.zombies) {
          if (!z.alive) continue;
          z.speed = z.baseSpeed = 0;
          z.riseT = 0;
          if (z.typeKey === 'screamer') z.screamCd = 999;
        }
        T.stepFrame(1 / 60);
        if (i % 8 === 0) await new Promise((r) => setTimeout(r, 0));
      }
    };

    const spawnLineup = (specs, zLine, spacing = 1.35) => {
      T.clearZombies();
      const spawned = [];
      const startX = cx - ((specs.length - 1) * spacing) * 0.5;
      for (let i = 0; i < specs.length; i++) {
        const spec = typeof specs[i] === 'string' ? { kind: specs[i] } : specs[i];
        const zx = startX + i * spacing;
        const z = T.spawnZombie(zx, zLine, spec.kind, true, true);
        z.trainingZ = true;
        z.riseT = 0;
        z.speed = z.baseSpeed = 0;
        z.hp = z.maxHp = 100000;
        if (spec.kind === 'screamer') z.screamCd = 999;
        z.mesh.position.set(zx, floorY, zLine);
        z.mesh.rotation.y = Math.PI; // face -Z toward player at cz - dist
        if (spec.bluebell) {
          C.prepareConvoySleeperAppearance(THREE, z.mesh);
        }
        if (spec.forceIntensity != null) {
          for (const m of z.mesh.userData.eyeMats || []) m.emissiveIntensity = spec.forceIntensity;
        }
        z.mesh.updateMatrixWorld(true);
        spawned.push({
          kind: spec.label || spec.kind,
          eyes: readEyes(z.mesh),
        });
      }
      return spawned;
    };

    const shots = [];

    // Shot 1: Third-person gameplay distance (Lit room, 5.5m): 7 archetypes at authored 0.9 pale-green
    const lineup1 = spawnLineup(
      ['shambler', 'feral', 'spider', 'military', 'brute', 'spitter', 'demon'],
      cz + 1.5,
      1.35
    );
    await setEnv(true, false, false, cx, cz - 4.0, 0, 95);
    shots.push({
      id: 'tp-lit-lineup',
      ...(await snap('1. 3P Lit (5.5m): 7 archetypes @ 0.9 pale-green')),
      lineup: lineup1,
    });

    // Shot 2: Third-person Dark room (Flashlight OFF, 5.5m): 0.9 pale-green eye points + warning glows
    await setEnv(false, false, false, cx, cz - 4.0, 0, 45);
    shots.push({
      id: 'tp-dark-noflash',
      ...(await snap('2. 3P Dark (No Flashlight, 5.5m): 0.9 eyes + warning glows')),
    });

    // Shot 3: Third-person Dark room (Flashlight ON, 5.5m): 0.9 pale-green eyes under player flashlight
    await setEnv(false, true, false, cx, cz - 4.0, 0, 45);
    shots.push({
      id: 'tp-dark-flash',
      ...(await snap('3. 3P Dark (Flashlight ON, 5.5m): 0.9 eyes + flashlight beam')),
    });

    // Shot 4: First-person Dark room (Flashlight OFF, 4.4m): 7 archetypes in darkness (0.9 eyes + bomber fuse / spitter acid / demon fire / colossus furnace)
    const lineup2 = spawnLineup(
      ['shambler', 'drowned', 'spider', 'brute', 'spitter', 'bomber', 'demon'],
      cz + 0.8,
      1.15
    );
    await setEnv(false, false, true, cx, cz - 3.6, 0, 60);
    shots.push({
      id: 'fp-dark-noflash',
      ...(await snap('4. 1P Dark (No Flashlight, 4.4m): 0.9 eye points vs warnings')),
      lineup: lineup2,
    });

    // Shot 5: First-person Dark room (Flashlight ON, 3.6m): ordinary Spitter (0.9 green) vs Bluebell (1.8 blue) + Shambler + Spider + Brute
    const lineup3 = spawnLineup(
      [
        { kind: 'shambler', label: 'shambler (0.9)' },
        { kind: 'spider', label: 'spider (0.9)' },
        { kind: 'spitter', label: 'spitter (0.9 green)' },
        { kind: 'spitter', label: 'bluebell (1.8 blue)', bluebell: true },
        { kind: 'brute', label: 'brute (0.9)' },
      ],
      cz + 0.4,
      1.05
    );
    await setEnv(false, true, true, cx, cz - 3.2, 0, 60);
    shots.push({
      id: 'fp-dark-flash-bluebell',
      ...(await snap('5. 1P Night Flashlight (3.6m): 0.9 green vs Bluebell 1.8 blue')),
      lineup: lineup3,
    });

    // Shot 6: First-person Dark room (Flashlight ON, 3.2m): Pooled Reused 0.9 (CU-162 fixed) vs Legacy 1.7 Reference
    const lineup4 = spawnLineup(
      [
        { kind: 'shambler', label: 'shambler (reused 0.9 CU-162)' },
        { kind: 'shambler', label: 'shambler (old 1.7 ref)', forceIntensity: 1.7 },
        { kind: 'military', label: 'military (reused 0.9 CU-162)' },
        { kind: 'military', label: 'military (old 1.7 ref)', forceIntensity: 1.7 },
      ],
      cz + 0.2,
      1.05
    );
    await setEnv(false, true, true, cx, cz - 3.0, 0, 60);
    shots.push({
      id: 'fp-dark-09-vs-17',
      ...(await snap('6. 1P Night (3.2m): Reused 0.9 (CU-162) vs Old 1.7 Ref')),
      lineup: lineup4,
    });

    // Build 2x3 contact sheet
    const cols = 2;
    const rows = 3;
    const tileW = 480;
    const tileH = 270;
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = cols * tileW;
    sheetCanvas.height = rows * tileH;
    const sg = sheetCanvas.getContext('2d');
    for (let i = 0; i < shots.length; i++) {
      const im = new Image();
      im.src = 'data:image/jpeg;base64,' + shots[i].thumb;
      await im.decode();
      const col = i % cols;
      const row = Math.floor(i / cols);
      sg.drawImage(im, col * tileW, row * tileH, tileW, tileH);
    }
    const sheetJpg = sheetCanvas.toDataURL('image/jpeg', 0.92).split(',')[1];

    T.clearZombies();
    T.setViewFirstDbg(false);

    return {
      conceptAudit,
      poolProbe,
      shots,
      sheetJpg,
    };
  })()`);

  for (const s of result.shots) {
    fs.writeFileSync(path.join(outDir, `${s.id}.png`), Buffer.from(s.png, 'base64'));
  }
  fs.writeFileSync(
    path.join(outDir, 'ag131-eyes-gameplay-sheet.jpg'),
    Buffer.from(result.sheetJpg, 'base64')
  );

  const telemetry = {
    loadMs,
    pageErrors: engine.page.errors,
    conceptAudit: result.conceptAudit,
    poolProbe: result.poolProbe,
    shots: result.shots.map((s) => ({
      id: s.id,
      label: s.label,
      render: s.render,
      lineup: s.lineup,
    })),
  };
  fs.writeFileSync(path.join(outDir, 'ag131-telemetry.json'), JSON.stringify(telemetry, null, 2));
  console.log(
    JSON.stringify({
      loadMs,
      pageErrors: engine.page.errors.length,
      poolProbe: result.poolProbe,
      shots: result.shots.length,
    })
  );
} finally {
  await engine.close();
}
