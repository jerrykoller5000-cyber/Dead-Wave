import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { cameraSessionFiles } from '../../tools/camera.mjs';

const OUT_DIR = path.resolve('qa/2026-10-18-AG-84');
const BEFORE_DIR = path.join(OUT_DIR, 'before');
const AFTER_DIR = path.join(OUT_DIR, 'after');
fs.mkdirSync(BEFORE_DIR, { recursive: true });
fs.mkdirSync(AFTER_DIR, { recursive: true });

// Copy the 6,216-tri / 248-part before shot from AG-79
const prevShot = path.resolve('qa/2026-10-15-AG-79/after/build-sandbag-2-three.png');
if (fs.existsSync(prevShot)) {
  fs.copyFileSync(prevShot, path.join(BEFORE_DIR, 'build-sandbag-2-three.png'));
}

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
  console.log('[AG-84] Starting camera in --inspect mode...');
  execFileSync(
    process.execPath,
    ['tools/camera.mjs', 'start', '--inspect', '--agent', 'antigravity', '--task', 'AG-84'],
    { stdio: 'inherit' }
  );

  try {
    const { session } = cameraSessionFiles();
    const sess = JSON.parse(fs.readFileSync(session, 'utf8'));
    console.log('[AG-84] Connected to camera daemon on port', sess.port, 'renderer:', sess.renderer);

    const inPageCode = `
      const shown = await DWInspect.show('build.sandbag', { variant: '2', instant: true });
      DWInspect.view('three', { instant: true });
      DWInspect.camera(DWInspect.camera());
      const threeUrl = await DWInspect.shot({ type: 'image/png' });

      // Exact 5 m view
      DWInspect.view({ yaw: 40, pitch: 24, dist: 5.0, fov: 35 }, { instant: true });
      DWInspect.camera(DWInspect.camera());
      const fiveMUrl = await DWInspect.shot({ type: 'image/png' });

      const sheet = await DWInspect.contactSheet({ only: 'build.sandbag', cols: 3, tile: 420, variants: true });
      return {
        shown,
        threeUrl,
        fiveMUrl,
        sheetData: sheet.data,
        sheetResults: sheet.results,
        errors: DWInspect.errors ? DWInspect.errors() : []
      };
    `;

    const res = await postJob(sess.port, { cmd: 'eval', code: inPageCode });
    if (!res.ok) throw new Error('In-page eval failed: ' + JSON.stringify(res));

    const { shown, threeUrl, fiveMUrl, sheetData, sheetResults, errors } = res.value;
    saveDataUrl(path.join(AFTER_DIR, 'build-sandbag-2-three.png'), threeUrl);
    saveDataUrl(path.join(AFTER_DIR, 'build-sandbag-2-5m.png'), fiveMUrl);
    saveDataUrl(path.join(AFTER_DIR, 'sheet.jpg'), sheetData);
    fs.writeFileSync(
      path.join(AFTER_DIR, 'check.json'),
      JSON.stringify(
        {
          renderer: sess.renderer,
          before: { meshes: 248, tris: 6216 },
          after: shown,
          sheetResults,
          errors,
        },
        null,
        2
      )
    );
    console.log('[AG-84] DWInspect.show("build.sandbag", { variant: "2" }).info ->', JSON.stringify(shown.info));
  } finally {
    console.log('[AG-84] Stopping camera...');
    execFileSync(process.execPath, ['tools/camera.mjs', 'stop'], { stdio: 'inherit' });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
