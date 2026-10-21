// qa/2026-10-15-AG-80/capture-inpage.mjs
// Single slot-batch capture for AG-80 (24 buildable variants), AG-79 (16 buildable/remains variants),
// and AG-81 (CL-198 marine fabric & 4 hats in inspector), using DWInspect.contactSheet() and DWInspect.shot()
// so every image is captured directly from the inspector's held canvas with zero off-screen swapchain drops.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const normalized = process.platform === 'win32' ? path.resolve(ROOT).toLowerCase() : path.resolve(ROOT);
const key = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
const SESSION_FILE = path.join(os.tmpdir(), 'dead-wave-camera-' + key + '.json');

function runCli(args) {
  console.log(`\n>>> node ${args.join(' ')}`);
  const res = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env, shell: false });
  if (res.status !== 0) throw new Error(`Command failed (${res.status}): node ${args.join(' ')}`);
}

function postEval(port, code, timeout = 300000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ cmd: 'eval', code, timeout });
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/job',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
          host: `127.0.0.1:${port}`,
        },
        timeout,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (!parsed.ok) reject(new Error(parsed.error || 'eval failed'));
            else resolve(parsed.value);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function saveDataUrl(filePath, dataUrl) {
  const abs = path.resolve(ROOT, filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  fs.writeFileSync(abs, Buffer.from(base64, 'base64'));
  console.log(`Saved ${filePath}`);
}

try {
  // 1. Start inspector camera
  runCli(['tools/camera.mjs', 'start', '--inspect', '--agent', 'antigravity', '--task', 'AG-80']);
  const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  const port = session.port;
  console.log(`Connected to camera daemon on port ${port} (${session.renderer})`);

  // 2. AG-80: Contact sheet + individual PNGs for all 24 tier variants of the 8 buildables
  console.log('\n--- Capturing AG-80 (8 buildables, 24 tier variants) ---');
  const ag80 = await postEval(
    port,
    `
    const sheet = await DWInspect.contactSheet({
      only: /^build\\.(wire|railing|platform|pillar|stairs|spikes|mine|lure)$/,
      cols: 3,
      tile: 480
    });
    const shots = [];
    const kinds = ['wire', 'railing', 'platform', 'pillar', 'stairs', 'spikes', 'mine', 'lure'];
    for (const k of kinds) {
      for (let t = 0; t < 3; t++) {
        const s = await DWInspect.show('build.' + k, { variant: String(t), instant: true });
        DWInspect.play();
        await DWInspect.stepAsync(2);
        DWInspect.pause();
        const png = await DWInspect.shot({ type: 'image/png' });
        shots.push({
          file: 'build-' + k + (t ? '-' + t : '') + '-three.png',
          id: 'build.' + k,
          variant: String(t),
          info: s.info,
          size: s.size,
          png
        });
      }
    }
    return { sheet: sheet.data, results: sheet.results, shots };
    `
  );
  saveDataUrl('qa/2026-10-15-AG-80/after/sheet.jpg', ag80.sheet);
  fs.writeFileSync(
    path.resolve(ROOT, 'qa/2026-10-15-AG-80/after/check.json'),
    JSON.stringify({ at: new Date().toISOString(), renderer: session.renderer, results: ag80.results }, null, 2)
  );
  for (const s of ag80.shots) {
    saveDataUrl(`qa/2026-10-15-AG-80/after/${s.file}`, s.png);
  }

  // 3. AG-79: Contact sheet + individual PNGs for Skeletal Marine, Bone Raft, Wall (0-4), Floor (0-2), Barricade (0-2), Sandbag (0-2)
  console.log('\n--- Capturing AG-79 (Skeletal Marine, Bone Raft, Wall, Floor, Barricade, Sandbag: 16 variants) ---');
  const ag79 = await postEval(
    port,
    `
    const sheet = await DWInspect.contactSheet({
      only: /^(person\\.skeletal-marine|prop\\.bone-raft|build\\.(wall|floor|barricade|sandbag))$/,
      cols: 4,
      tile: 480
    });
    const targets = [
      ['person.skeletal-marine', null, 'person-skeletal-marine-three.png'],
      ['prop.bone-raft', null, 'prop-bone-raft-three.png'],
      ['build.wall', '0', 'build-wall-three.png'],
      ['build.wall', '1', 'build-wall-1-three.png'],
      ['build.wall', '2', 'build-wall-2-three.png'],
      ['build.wall', '3', 'build-wall-3-three.png'],
      ['build.wall', '4', 'build-wall-4-three.png'],
      ['build.floor', '0', 'build-floor-three.png'],
      ['build.floor', '1', 'build-floor-1-three.png'],
      ['build.floor', '2', 'build-floor-2-three.png'],
      ['build.barricade', '0', 'build-barricade-three.png'],
      ['build.barricade', '1', 'build-barricade-1-three.png'],
      ['build.barricade', '2', 'build-barricade-2-three.png'],
      ['build.sandbag', '0', 'build-sandbag-three.png'],
      ['build.sandbag', '1', 'build-sandbag-1-three.png'],
      ['build.sandbag', '2', 'build-sandbag-2-three.png']
    ];
    const shots = [];
    for (const [id, variant, file] of targets) {
      const s = await DWInspect.show(id, { variant, instant: true });
      DWInspect.play();
      await DWInspect.stepAsync(2);
      DWInspect.pause();
      const png = await DWInspect.shot({ type: 'image/png' });
      shots.push({ file, id, variant, info: s.info, size: s.size, png });
    }
    return { sheet: sheet.data, results: sheet.results, shots };
    `
  );
  saveDataUrl('qa/2026-10-15-AG-79/after/sheet.jpg', ag79.sheet);
  fs.writeFileSync(
    path.resolve(ROOT, 'qa/2026-10-15-AG-79/after/check.json'),
    JSON.stringify({ at: new Date().toISOString(), renderer: session.renderer, results: ag79.results }, null, 2)
  );
  for (const s of ag79.shots) {
    saveDataUrl(`qa/2026-10-15-AG-79/after/${s.file}`, s.png);
  }

  // 4. AG-81: Eyes on CL-198 (the marine's fabric) in the inspector:
  // crouch, run, reload, aim, grenade, dive in issue, hot-weather and full kit; the four hats.
  console.log('\n--- Capturing AG-81 (CL-198 marine fabric: 3 presets x 6 moves + 4 hats) ---');
  const ag81 = await postEval(
    port,
    `
    await DWInspect.show('marine', { instant: true });
    const presets = [
      { key: 'issue', label: 'Issue' },
      { key: 'hot', label: 'Hot weather' },
      { key: 'full', label: 'Full kit' }
    ];
    const moves = [
      {
        key: 'crouch',
        label: 'Crouch',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('m4');
          await DWInspect.marine.play('crouch');
          await DWInspect.stepAsync(18);
          DWInspect.pause();
          DWInspect.view({ yaw: 38, pitch: 14 }, { instant: true });
        }
      },
      {
        key: 'run',
        label: 'Run',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('m4');
          await DWInspect.marine.play('run');
          DWInspect.marine.hold('run', 0.25);
          await DWInspect.stepAsync(6);
          DWInspect.pause();
          DWInspect.view({ yaw: 42, pitch: 12 }, { instant: true });
        }
      },
      {
        key: 'reload',
        label: 'Reload',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('m4');
          DWInspect.marine.hold('reload', 0.45);
          await DWInspect.stepAsync(6);
          DWInspect.pause();
          DWInspect.view({ yaw: 35, pitch: 12 }, { instant: true });
        }
      },
      {
        key: 'aim',
        label: 'Aim',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('m4');
          await DWInspect.marine.play('aim');
          await DWInspect.stepAsync(16);
          DWInspect.pause();
          DWInspect.view({ yaw: 35, pitch: 12 }, { instant: true });
        }
      },
      {
        key: 'grenade',
        label: 'Grenade',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('m4');
          DWInspect.marine.hold('grenade', ['cocked', 0.2]);
          await DWInspect.stepAsync(6);
          DWInspect.pause();
          DWInspect.view({ yaw: 35, pitch: 12 }, { instant: true });
        }
      },
      {
        key: 'dive',
        label: 'Dive',
        setup: async () => {
          DWInspect.play();
          DWInspect.marine.stop();
          DWInspect.marine.weapon('pistol');
          await DWInspect.marine.play('dive-forward', { loop: false });
          DWInspect.pause();
          DWInspect.view({ yaw: 75, pitch: 10 }, { instant: true });
        }
      }
    ];

    const items = [];
    for (const p of presets) {
      for (const m of moves) {
        DWInspect.play();
        DWInspect.marine.stop();
        DWInspect.marine.preset(p.key);
        await m.setup();
        const png = await DWInspect.shot({ type: 'image/png' });
        const info = DWInspect.current()?.info || null;
        items.push({
          file: p.key + '-' + m.key + '.png',
          label: p.label + ' · ' + m.label,
          info,
          png
        });
      }
    }

    // Now capture the 4 hats close-up (cover, boonie, ballcap, ballcapBack front-3/4 and rear-3/4)
    const hats = [
      { style: 'cover', file: 'hat-cover.png', label: 'Hat · 8-point cover', yaw: 30, pitch: 10 },
      { style: 'boonie', file: 'hat-boonie.png', label: 'Hat · Boonie', yaw: 30, pitch: 10 },
      { style: 'ballcap', file: 'hat-ballcap.png', label: 'Hat · Ballcap (fwd)', yaw: 30, pitch: 10 },
      { style: 'ballcapBack', file: 'hat-ballcap-back-front.png', label: 'Hat · Ballcap (back, front view)', yaw: 30, pitch: 10 },
      { style: 'ballcapBack', file: 'hat-ballcap-back-rear.png', label: 'Hat · Ballcap (back, rear strap/bill)', yaw: 145, pitch: 12 },
      { style: 'cover', file: 'gloves-and-cuffs-closeup.png', label: 'Gloves & blouse cuffs (aim)', yaw: 48, pitch: 8, aimHold: true }
    ];

    for (const h of hats) {
      DWInspect.play();
      DWInspect.marine.stop();
      DWInspect.marine.preset('issue');
      DWInspect.marine.gear('helmet', false);
      DWInspect.marine.item('cap', { style: h.style });
      if (h.aimHold) {
        DWInspect.marine.weapon('m4');
        await DWInspect.marine.play('aim');
        await DWInspect.stepAsync(15);
      } else {
        DWInspect.marine.weapon('none');
        await DWInspect.stepAsync(6);
      }
      DWInspect.pause();
      const cur = DWInspect.current();
      const cx = cur.center.x, cy = cur.center.y + (h.aimHold ? 0.32 : 0.62), cz = cur.center.z;
      const dist = h.aimHold ? 0.85 : 0.62;
      const az = h.yaw * Math.PI / 180, el = h.pitch * Math.PI / 180;
      DWInspect.camera({
        x: cx + Math.sin(az) * Math.cos(el) * dist,
        y: cy + Math.sin(el) * dist,
        z: cz + Math.cos(az) * Math.cos(el) * dist,
        tx: cx,
        ty: cy,
        tz: cz,
        fov: 32
      });
      const png = await DWInspect.shot({ type: 'image/png' });
      items.push({
        file: h.file,
        label: h.label,
        info: cur?.info || null,
        png
      });
    }

    // Build contact sheet (6 columns x 4 rows = 24 tiles)
    const loadImg = (src) => new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
    const imgs = await Promise.all(items.map((it) => loadImg(it.png)));
    const cols = 6, tw = 420, th = Math.round(tw * imgs[0].height / imgs[0].width);
    const rows = Math.ceil(items.length / cols);
    const canvas = document.createElement('canvas');
    canvas.width = cols * tw;
    canvas.height = rows * th + 36;
    const g = canvas.getContext('2d');
    g.fillStyle = '#111';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#f2c418';
    g.font = '600 18px Arial';
    g.fillText('AG-81 · CL-198 Marine fabric & hats (Issue, Hot weather, Full kit × 6 moves + 4 hats)', 12, 24);
    items.forEach((it, idx) => {
      const c = idx % cols, r = Math.floor(idx / cols);
      const x = c * tw, y = 36 + r * th;
      g.drawImage(imgs[idx], x, y, tw, th);
      g.fillStyle = '#000c';
      g.fillRect(x, y + th - 26, tw, 26);
      g.fillStyle = '#f4ecd0';
      g.font = '600 13px Arial';
      g.fillText(it.label, x + 8, y + th - 8, tw - 16);
      g.strokeStyle = '#000';
      g.lineWidth = 2;
      g.strokeRect(x, y, tw, th);
    });
    const sheet = canvas.toDataURL('image/jpeg', 0.88);
    return { sheet, items: items.map(({ png, ...rest }) => rest), pngs: items.map((it) => ({ file: it.file, png: it.png })) };
    `
  );
  saveDataUrl('qa/2026-10-18-AG-81/shots/sheet.jpg', ag81.sheet);
  fs.writeFileSync(
    path.resolve(ROOT, 'qa/2026-10-18-AG-81/shots/summary.json'),
    JSON.stringify({ at: new Date().toISOString(), renderer: session.renderer, items: ag81.items }, null, 2)
  );
  for (const p of ag81.pngs) {
    saveDataUrl(`qa/2026-10-18-AG-81/shots/${p.file}`, p.png);
  }
} finally {
  spawnSync(process.execPath, ['tools/camera.mjs', 'stop', '--agent', 'antigravity', '--task', 'AG-80'], {
    stdio: 'inherit',
    env: process.env,
    shell: false,
  });
}
