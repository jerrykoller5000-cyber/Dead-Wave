import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cameraSessionFiles } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-10-18-AG-85');
const SHOTS_DIR = path.join(OUT_DIR, 'shots');
const AG81_SHOTS_DIR = path.join(ROOT, 'qa/2026-10-18-AG-81/shots');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

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

function readAsDataUrl(filePath) {
  const buf = fs.readFileSync(filePath);
  return 'data:image/png;base64,' + buf.toString('base64');
}

async function captureFixedHats() {
  console.log('[AG-85] Starting camera in --inspect mode...');
  execFileSync(
    process.execPath,
    ['tools/camera.mjs', 'start', '--inspect', '--agent', 'antigravity', '--task', 'AG-85'],
    { cwd: ROOT, stdio: 'inherit' }
  );

  try {
    const { session } = cameraSessionFiles();
    const sess = JSON.parse(fs.readFileSync(session, 'utf8'));
    console.log('[AG-85] Connected to camera daemon on port', sess.port, 'renderer:', sess.renderer);

    const inPageCode = `
      const DEG = Math.PI / 180;

      await DWInspect.show('marine', { instant: true });
      DWInspect.backdrop('studio');
      DWInspect.light('studio');
      DWInspect.marine.weapon('m4');
      DWInspect.marine.preset('issue');
      DWInspect.marine.stop();
      DWInspect.marine.home();
      DWInspect.play();
      await DWInspect.stepAsync(4);
      DWInspect.pause();

      // Measure post-CL-210 kit mesh/tri counts
      const kitCounts = {};
      for (const preset of ['issue', 'hot', 'full']) {
        if (preset === 'full') DWInspect.marine.preset('issue');
        DWInspect.marine.preset(preset);
        DWInspect.play();
        await DWInspect.stepAsync(1);
        DWInspect.pause();
        const cur = DWInspect.current();
        kitCounts[preset] = {
          tris: cur?.info?.tris || 0,
          meshes: cur?.info?.meshes || 0,
        };
      }

      // Reset to issue preset at rest for hat close-ups
      DWInspect.marine.preset('issue');
      DWInspect.marine.stop();
      DWInspect.marine.home();
      DWInspect.play();
      await DWInspect.stepAsync(2);
      DWInspect.pause();

      const hatSpecs = [
        // 5 matched views from AG-81
        { file: 'hat-cover.png', hat: 'cover', label: '8-point cover (3/4 front)', yaw: 24, pitch: 7, dist: 0.52, dy: 0 },
        { file: 'hat-boonie.png', hat: 'boonie', label: 'Boonie (3/4 front · grommets fixed)', yaw: 24, pitch: 7, dist: 0.55, dy: 0 },
        { file: 'hat-ballcap.png', hat: 'ballcap', label: 'Ball cap (3/4 front · seams fixed)', yaw: 24, pitch: 7, dist: 0.52, dy: 0 },
        { file: 'hat-ballcap-back-front.png', hat: 'ballcapBack', label: 'Backwards cap (front · seams fixed)', yaw: 24, pitch: 7, dist: 0.52, dy: 0 },
        { file: 'hat-ballcap-back-rear.png', hat: 'ballcapBack', label: 'Backwards cap (rear · curved strap)', yaw: 156, pitch: 8, dist: 0.52, dy: 0 },
        // 3 macro detail views of the specific fixes
        { file: 'hat-boonie-grommets-macro.png', hat: 'boonie', label: 'Macro · Boonie side grommets (flush at z=±0.05)', yaw: 68, pitch: 6, dist: 0.36, dy: 0.04 },
        { file: 'hat-ballcap-seams-macro.png', hat: 'ballcap', label: 'Macro · Ballcap 6-panel seams (flush on dome)', yaw: 36, pitch: 18, dist: 0.36, dy: 0.04 },
        { file: 'hat-ballcap-strap-macro.png', hat: 'ballcapBack', label: 'Macro · Backwards cap curved strap & buckle', yaw: 168, pitch: 6, dist: 0.36, dy: 0.02 },
      ];

      const shots = {};
      const results = [];

      for (const hs of hatSpecs) {
        DWInspect.marine.item('cap', { style: hs.hat });
        DWInspect.play();
        await DWInspect.stepAsync(1);
        DWInspect.pause();
        DWInspect.view('head', { instant: true });
        const hc = DWInspect.camera();
        const az = hs.yaw * DEG;
        const el = hs.pitch * DEG;
        const ce = Math.cos(el);
        const ty = hc.ty + (hs.dy || 0);
        DWInspect.camera({
          tx: hc.tx,
          ty,
          tz: hc.tz,
          x: hc.tx + Math.sin(az) * ce * hs.dist,
          y: ty + Math.sin(el) * hs.dist,
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
          label: hs.label,
          tris: cur?.info?.tris || 0,
          meshes: cur?.info?.meshes || 0,
        });
      }

      async function loadImg(src) {
        return new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      }

      // Sheet 1: 4x2 grid of all 8 fresh AG-85 close-ups
      const order8 = hatSpecs.map(h => h.file);
      const cols1 = 4, rows1 = 2, tw1 = 560, th1 = 350, headerH1 = 46;
      const c1 = document.createElement('canvas');
      c1.width = cols1 * tw1;
      c1.height = rows1 * th1 + headerH1;
      const g1 = c1.getContext('2d');
      g1.fillStyle = '#0e1116';
      g1.fillRect(0, 0, c1.width, c1.height);
      g1.fillStyle = '#f2c418';
      g1.font = '600 22px Arial';
      g1.fillText('AG-85 · Fresh Hat Close-Ups & Macro Verification (Boonie Grommets, Ballcap Seams, Curved Back Strap)', 16, 31);

      for (let i = 0; i < order8.length; i++) {
        const item = shots[order8[i]];
        const im = await loadImg(item.dataUrl);
        const x = (i % cols1) * tw1;
        const y = headerH1 + Math.floor(i / cols1) * th1;
        g1.drawImage(im, x, y, tw1, th1);
        g1.fillStyle = 'rgba(0,0,0,0.72)';
        g1.fillRect(x, y + th1 - 30, tw1, 30);
        g1.fillStyle = '#f4ecd0';
        g1.font = '600 15px Arial';
        g1.fillText(item.label, x + 10, y + th1 - 9);
      }
      const closeupSheetDataUrl = c1.toDataURL('image/jpeg', 0.92);

      // Sheet 2: 5x2 Before (AG-81) vs After (AG-85) comparison sheet
      const order5 = [
        'hat-cover.png',
        'hat-boonie.png',
        'hat-ballcap.png',
        'hat-ballcap-back-front.png',
        'hat-ballcap-back-rear.png',
      ];
      const cols2 = 5, rows2 = 2, tw2 = 460, th2 = 288, headerH2 = 46;
      const c2 = document.createElement('canvas');
      c2.width = cols2 * tw2;
      c2.height = rows2 * th2 + headerH2;
      const g2 = c2.getContext('2d');
      g2.fillStyle = '#0e1116';
      g2.fillRect(0, 0, c2.width, c2.height);
      g2.fillStyle = '#f2c418';
      g2.font = '600 21px Arial';
      g2.fillText('AG-85 · Hats Before (AG-81, Top Row) vs After Fixes (AG-85, Bottom Row)', 16, 30);

      for (let i = 0; i < order5.length; i++) {
        const fname = order5[i];
        const x = i * tw2;
        try {
          const imBefore = await loadImg('/qa/2026-10-18-AG-81/shots/' + fname);
          const y0 = headerH2;
          g2.drawImage(imBefore, x, y0, tw2, th2);
          g2.fillStyle = 'rgba(0,0,0,0.72)';
          g2.fillRect(x, y0 + th2 - 28, tw2, 28);
          g2.fillStyle = '#ff9e7d';
          g2.font = '600 14px Arial';
          g2.fillText('BEFORE (AG-81) · ' + fname.replace('.png', ''), x + 8, y0 + th2 - 9);
        } catch (_e) {}
        const imAfter = await loadImg(shots[fname].dataUrl);
        const y1 = headerH2 + th2;
        g2.drawImage(imAfter, x, y1, tw2, th2);
        g2.fillStyle = 'rgba(0,0,0,0.72)';
        g2.fillRect(x, y1 + th2 - 28, tw2, 28);
        g2.fillStyle = '#8ef5a2';
        g2.font = '600 14px Arial';
        g2.fillText('AFTER (AG-85) · ' + shots[fname].label, x + 8, y1 + th2 - 9);
      }
      const beforeAfterSheetDataUrl = c2.toDataURL('image/jpeg', 0.92);

      return {
        kitCounts,
        results,
        shots,
        closeupSheetDataUrl,
        beforeAfterSheetDataUrl,
        errors: DWInspect.errors ? DWInspect.errors() : [],
      };
    `;

    const res = await postJob(sess.port, { cmd: 'eval', code: inPageCode });
    if (!res.ok) {
      throw new Error('In-page eval failed: ' + JSON.stringify(res));
    }

    const { kitCounts, results, shots, closeupSheetDataUrl, beforeAfterSheetDataUrl, errors } = res.value;
    for (const [fname, item] of Object.entries(shots)) {
      saveDataUrl(path.join(SHOTS_DIR, fname), item.dataUrl);
    }
    saveDataUrl(path.join(SHOTS_DIR, 'hats-closeup-sheet.jpg'), closeupSheetDataUrl);
    saveDataUrl(path.join(SHOTS_DIR, 'hats-before-after-sheet.jpg'), beforeAfterSheetDataUrl);
    fs.writeFileSync(
      path.join(OUT_DIR, 'hats-summary.json'),
      JSON.stringify({ renderer: sess.renderer, kitCounts, results, errors }, null, 2)
    );
    console.log('[AG-85] Saved 8 hat PNGs + 2 comparison sheets + hats-summary.json');
  } finally {
    console.log('[AG-85] Stopping camera...');
    execFileSync(process.execPath, ['tools/camera.mjs', 'stop'], { cwd: ROOT, stdio: 'inherit' });
  }
}

function runBenchOne(args) {
  console.log('\n[AG-85] Running: node tools/bench.mjs', args.join(' '));
  const out = execFileSync(process.execPath, ['tools/bench.mjs', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  process.stdout.write(out);
  const lines = out
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('{') && l.endsWith('}'));
  if (!lines.length) throw new Error('No JSON line found in bench output');
  return JSON.parse(lines.at(-1));
}

async function main() {
  await captureFixedHats();

  const results = [];
  const nights = [5, 10, 14, 18, 20];

  // High preset (--gfx high) across all 5 budget nights + megaswarm 48
  for (const n of nights) {
    results.push(runBenchOne(['--night', String(n), '--gfx', 'high', '--seconds', '10']));
  }
  results.push(runBenchOne(['--scenario', 'megaswarm', '--count', '48', '--gfx', 'high', '--seconds', '10']));

  // Default Max preset (no --gfx flag -> 'max') across all 5 budget nights + megaswarm 48
  for (const n of nights) {
    results.push(runBenchOne(['--night', String(n), '--seconds', '10']));
  }
  results.push(runBenchOne(['--scenario', 'megaswarm', '--count', '48', '--seconds', '10']));

  fs.writeFileSync(path.join(OUT_DIR, 'bench-results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, 'bench-lines.jsonl'),
    results.map((r) => JSON.stringify(r)).join('\n') + '\n'
  );
  console.log('[AG-85] Saved all 12 post-CL-210 benchmark JSON lines to qa/2026-10-18-AG-85/bench-lines.jsonl');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
