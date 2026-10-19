import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { cameraSessionFiles } from '../../tools/camera.mjs';

const OUT_DIR = path.resolve('qa/2026-10-18-AG-81/shots');
fs.mkdirSync(OUT_DIR, { recursive: true });

function postJob(port, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/job',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
        timeout: 120000,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON from camera server: ' + data.slice(0, 300)));
          }
        });
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Camera request timeout'));
    });
    req.end(payload);
  });
}

function saveDataUrl(filePath, dataUrl) {
  const idx = dataUrl.indexOf(',');
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
}

async function main() {
  console.log('[AG-81] Starting camera in --inspect mode...');
  execFileSync(
    process.execPath,
    ['tools/camera.mjs', 'start', '--inspect', '--agent', 'antigravity', '--task', 'AG-81'],
    { stdio: 'inherit' }
  );

  try {
    const { session } = cameraSessionFiles();
    const sess = JSON.parse(fs.readFileSync(session, 'utf8'));
    console.log('[AG-81] Connected to camera daemon on port', sess.port, 'renderer:', sess.renderer);

    const inPageCode = `
      const DEG = Math.PI / 180;
      await DWInspect.show('marine', { instant: true });
      DWInspect.backdrop('studio');
      DWInspect.light('studio');
      DWInspect.marine.weapon('m4');

      const kits = [
        { key: 'issue', label: 'Issue', preset: 'issue' },
        { key: 'hot', label: 'Hot weather', preset: 'hot' },
        { key: 'full', label: 'Full kit', preset: 'full' },
      ];

      const moves = [
        { key: 'crouch', label: 'Crouch', yaw: 38, pitch: 8, dist: 1.55 },
        { key: 'run', label: 'Run', yaw: 42, pitch: 8, dist: 1.72 },
        { key: 'reload', label: 'Reload', yaw: 34, pitch: 8, dist: 1.65 },
        { key: 'aim', label: 'Aim', yaw: 34, pitch: 8, dist: 1.68 },
        { key: 'grenade', label: 'Grenade', yaw: 38, pitch: 8, dist: 1.72 },
        { key: 'dive', label: 'Dive', yaw: 72, pitch: 12, dist: 1.85 },
      ];

      const results = [];
      const shots = {};

      async function applyMove(mKey) {
        DWInspect.marine.stop();
        DWInspect.marine.home();
        DWInspect.marine.weapon('m4');
        DWInspect.play();
        await DWInspect.stepAsync(2);
        if (mKey === 'run') {
          DWInspect.marine.hold('run', 0.25);
          await DWInspect.stepAsync(2);
        } else if (mKey === 'reload') {
          DWInspect.marine.hold('reload', 0.45);
          await DWInspect.stepAsync(2);
        } else if (mKey === 'grenade') {
          DWInspect.marine.hold('grenade', ['cocked', 0.25]);
          await DWInspect.stepAsync(2);
        } else if (mKey === 'crouch') {
          await DWInspect.marine.play('crouch', { loop: true });
          await DWInspect.stepAsync(16);
        } else if (mKey === 'aim') {
          await DWInspect.marine.play('aim', { loop: true });
          await DWInspect.stepAsync(12);
        } else if (mKey === 'dive') {
          await DWInspect.marine.play('dive-forward', { loop: false });
          await DWInspect.stepAsync(14);
        }
        DWInspect.pause();
      }

      for (const kit of kits) {
        if (kit.preset === 'full') DWInspect.marine.preset('issue');
        DWInspect.marine.preset(kit.preset);
        for (const mv of moves) {
          await applyMove(mv.key);
          DWInspect.view({ yaw: mv.yaw, pitch: mv.pitch, dist: mv.dist, fov: 35 }, { instant: true });
          DWInspect.camera(DWInspect.camera());
          const fname = kit.key + '-' + mv.key + '.png';
          const dataUrl = await DWInspect.shot({ type: 'image/png' });
          shots[fname] = { dataUrl, label: kit.label + ' · ' + mv.label };
          const cur = DWInspect.current();
          results.push({
            file: fname,
            kit: kit.key,
            move: mv.key,
            tris: cur?.info?.tris || 0,
            meshes: cur?.info?.meshes || 0,
            size: cur?.size || null,
          });
        }
      }

      // 19. Gloves & cuffs close-up in aim pose (Issue preset)
      DWInspect.marine.preset('issue');
      await applyMove('aim');
      DWInspect.view('hands', { instant: true });
      {
        const c = DWInspect.camera();
        const dx = (c.x - c.tx) * 0.72, dy = (c.y - c.ty) * 0.72, dz = (c.z - c.tz) * 0.72;
        DWInspect.camera({ x: c.tx + dx, y: c.ty + dy, z: c.tz + dz, tx: c.tx, ty: c.ty, tz: c.tz, fov: 35 });
      }
      shots['gloves-and-cuffs-closeup.png'] = {
        dataUrl: await DWInspect.shot({ type: 'image/png' }),
        label: 'Gloves & Cuffs (Aim)',
      };

      // 20-24. Four hats at rest (cover, boonie, ballcap, ballcapBack front + rear)
      DWInspect.marine.preset('issue');
      DWInspect.marine.stop();
      DWInspect.marine.home();
      DWInspect.play();
      await DWInspect.stepAsync(4);
      DWInspect.pause();

      const hatSpecs = [
        { file: 'hat-cover.png', hat: 'cover', label: 'Hat · 8-point cover', yaw: 24, pitch: 7, dist: 0.52 },
        { file: 'hat-boonie.png', hat: 'boonie', label: 'Hat · Boonie', yaw: 24, pitch: 7, dist: 0.55 },
        { file: 'hat-ballcap.png', hat: 'ballcap', label: 'Hat · Ball cap', yaw: 24, pitch: 7, dist: 0.52 },
        { file: 'hat-ballcap-back-front.png', hat: 'ballcapBack', label: 'Hat · Backwards cap (front)', yaw: 24, pitch: 7, dist: 0.52 },
        { file: 'hat-ballcap-back-rear.png', hat: 'ballcapBack', label: 'Hat · Backwards cap (rear)', yaw: 156, pitch: 8, dist: 0.52 },
      ];

      for (const hs of hatSpecs) {
        DWInspect.marine.item('cap', { style: hs.hat });
        DWInspect.play();
        await DWInspect.stepAsync(1);
        DWInspect.pause();
        // Use the built-in head bookmark so tx,ty,tz centers on headG ([0, 0.22, 0.04])
        DWInspect.view('head', { instant: true });
        const hc = DWInspect.camera();
        const az = hs.yaw * DEG;
        const el = hs.pitch * DEG;
        const ce = Math.cos(el);
        DWInspect.camera({
          tx: hc.tx,
          ty: hc.ty,
          tz: hc.tz,
          x: hc.tx + Math.sin(az) * ce * hs.dist,
          y: hc.ty + Math.sin(el) * hs.dist,
          z: hc.tz + Math.cos(az) * ce * hs.dist,
          fov: 35,
        });
        shots[hs.file] = {
          dataUrl: await DWInspect.shot({ type: 'image/png' }),
          label: hs.label,
        };
        const cur = DWInspect.current();
        results.push({
          file: hs.file,
          hat: hs.hat,
          tris: cur?.info?.tris || 0,
          meshes: cur?.info?.meshes || 0,
        });
      }

      // Build 6x4 contact sheet
      const order = [
        'issue-crouch.png', 'issue-run.png', 'issue-reload.png', 'issue-aim.png', 'issue-grenade.png', 'issue-dive.png',
        'hot-crouch.png', 'hot-run.png', 'hot-reload.png', 'hot-aim.png', 'hot-grenade.png', 'hot-dive.png',
        'full-crouch.png', 'full-run.png', 'full-reload.png', 'full-aim.png', 'full-grenade.png', 'full-dive.png',
        'gloves-and-cuffs-closeup.png', 'hat-cover.png', 'hat-boonie.png', 'hat-ballcap.png', 'hat-ballcap-back-front.png', 'hat-ballcap-back-rear.png'
      ];
      const cols = 6, rows = 4, tw = 400, th = 250, headerH = 42;
      const canvas = document.createElement('canvas');
      canvas.width = cols * tw;
      canvas.height = rows * th + headerH;
      const g = canvas.getContext('2d');
      g.fillStyle = '#0e1116';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#f2c418';
      g.font = '600 20px Arial';
      g.fillText('AG-81 · Marine Fabric & Hats (CL-198) — Issue, Hot Weather, Full Kit × 6 Moves + Gloves & 4 Hats', 14, 28);

      for (let i = 0; i < order.length; i++) {
        const key = order[i];
        const item = shots[key];
        const im = await new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = item.dataUrl;
        });
        const x = (i % cols) * tw;
        const y = headerH + Math.floor(i / cols) * th;
        g.drawImage(im, x, y, tw, th);
        g.fillStyle = 'rgba(0,0,0,0.68)';
        g.fillRect(x, y + th - 26, tw, 26);
        g.fillStyle = '#f4ecd0';
        g.font = '600 13px Arial';
        g.fillText(item.label, x + 8, y + th - 8);
      }

      const sheetDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      return { results, shots, sheetDataUrl, errors: DWInspect.errors ? DWInspect.errors() : [] };
    `;

    const res = await postJob(sess.port, { cmd: 'eval', code: inPageCode });
    if (!res.ok) {
      throw new Error('In-page eval failed: ' + JSON.stringify(res));
    }

    const { results, shots, sheetDataUrl, errors } = res.value;
    for (const [fname, item] of Object.entries(shots)) {
      saveDataUrl(path.join(OUT_DIR, fname), item.dataUrl);
    }
    saveDataUrl(path.join(OUT_DIR, 'sheet.jpg'), sheetDataUrl);
    fs.writeFileSync(
      path.join(OUT_DIR, 'summary.json'),
      JSON.stringify({ renderer: sess.renderer, results, errors }, null, 2)
    );
    console.log('[AG-81] Saved', Object.keys(shots).length, 'PNGs + sheet.jpg + summary.json');
  } finally {
    console.log('[AG-81] Stopping camera...');
    execFileSync(process.execPath, ['tools/camera.mjs', 'stop'], { stdio: 'inherit' });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
