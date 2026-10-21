// desktop/smoke.mjs — CU-57's check of the built desktop game (the .exe, on this PC's WebView2 and GPU):
//   node desktop/smoke.mjs [--exe <path>]
// It starts the exe with a scratch profile folder, attaches to its webview over the DevTools port, and checks:
//  1. the title comes up from the dw: protocol, WebGPU is the renderer, the version is on the title, no page errors;
//  2. a match starts and runs a few seconds (the game's own files, sounds and video come through the protocol);
//  3. the profile: a key set in localStorage lands in profile.json, survives a restart, and a removal is written too;
//  4. Quit (window.close()) ends the program.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { attach } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const xi = argv.indexOf('--exe');
const EXE = path.resolve(xi >= 0 ? argv[xi + 1] : path.join(ROOT, 'desktop', 'src-tauri', 'target', 'release', 'dead-wave.exe'));
const PORT = 9334;
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-profile-'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = 0, current = null;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failed++; };

function start() {
  const proc = spawn(EXE, [], {
    stdio: 'ignore',
    env: { ...process.env, DW_DEBUG: '1', DW_PROFILE_DIR: PROFILE, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`, WEBVIEW2_USER_DATA_FOLDER: path.join(PROFILE, 'webview') }
  });
  let exited = false; proc.on('exit', () => { exited = true; });
  current = proc;
  return { proc, exited: () => exited };
}
const kill = (p) => { try { spawn('taskkill', ['/F', '/T', '/PID', String(p.pid)], { stdio: 'ignore' }); } catch { /* gone */ } };
const profileFile = () => { try { return JSON.parse(fs.readFileSync(path.join(PROFILE, 'profile.json'), 'utf8')); } catch { return null; } };

if (!fs.existsSync(EXE)) { console.error('no exe at ' + EXE + ' (npm run build:exe in desktop/)'); process.exit(2); }
try {
  // --- run 1
  let app = start();
  let { page, close } = await attach(PORT, 'dw.localhost');
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); else { const b = document.getElementById('openingSkip'); if (b) b.click(); } })()`);
    await wait(300);
  }
  ok(await page.waitFor('!!window.TT', { timeout: 300000 }), 'the title comes up from the dw: protocol (window.TT)');
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  ok(await page.evaluate('window.__DW_DESKTOP__ === true'), 'the desktop shell\'s script ran first');
  const kind = await page.evaluate('TT.renderer && TT.renderer.constructor ? TT.renderer.constructor.name : "?"');
  ok(/WebGPU/i.test(kind), 'the renderer is WebGPU (' + kind + ')');
  const ver = await page.evaluate(`(document.getElementById('gameVersion') || {}).textContent || ''`);
  const want = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  ok(ver === 'v' + want, 'the version is on the title (' + JSON.stringify(ver) + ')');
  ok(await page.evaluate('outerWidth >= screen.width - 2 && outerHeight >= screen.height - 2'), 'the window is fullscreen (' + (await page.evaluate('outerWidth + "x" + outerHeight + " of " + screen.width + "x" + screen.height')) + ')');

  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Desktop'; document.getElementById('modeHunt').click(); })()`);
  ok(await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 60000 }), 'a match starts');
  ok(await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 120000 }), 'the insertion plays out (video and sounds through the protocol)');
  await wait(5000);
  const urls = await page.evaluate(`performance.getEntriesByType('resource').filter((e) => e.responseStatus >= 400).map((e) => e.responseStatus + ' ' + e.name)`);
  ok(urls.length === 0, 'no file the game asked for was missing' + (urls.length ? ': ' + urls.slice(0, 4).join(', ') : ''));

  // The profile.
  await page.evaluate(`localStorage.setItem('tt_smoke', 'one'); localStorage.setItem('tt_smoke2', 'two');`);
  await wait(2500);
  ok(profileFile() && profileFile().tt_smoke === 'one' && profileFile().tt_smoke2 === 'two', 'a key set in localStorage is in profile.json (' + JSON.stringify(profileFile() && Object.keys(profileFile()).filter((k) => k.startsWith('tt_smoke'))) + ')');
  ok(page.errors.length === 0, 'no page errors' + (page.errors.length ? ': ' + page.errors.slice(0, 3).map((e) => e.split('\n')[0]).join(' | ') : ''));
  close(); kill(app.proc); await wait(2500);

  // --- run 2: the profile comes back from the file, not from the webview's own copy.
  fs.rmSync(path.join(PROFILE, 'webview'), { recursive: true, force: true });
  app = start();
  ({ page, close } = await attach(PORT, 'dw.localhost'));
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  ok(await page.evaluate(`localStorage.getItem('tt_smoke') === 'one' && localStorage.getItem('tt_smoke2') === 'two'`), 'after a restart (and the webview\'s own data wiped) the keys come back from the file');
  await page.evaluate(`localStorage.removeItem('tt_smoke2')`);
  await wait(2500);
  ok(profileFile() && profileFile().tt_smoke === 'one' && !('tt_smoke2' in profileFile()), 'a removal is written too');
  // Quit.
  await page.evaluate('window.close()');
  let gone = false;
  for (let i = 0; i < 20 && !gone; i++) { await wait(250); gone = app.exited(); }
  ok(gone, 'window.close() (the menu\'s Quit) ends the program');
  close(); if (!gone) kill(app.proc);
} catch (e) {
  ok(false, 'threw ' + (e && e.message || e));
} finally {
  if (current) kill(current);
  await wait(3000);
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch { /* a webview process still letting go: the temp folder can wait */ }
}
console.log(failed ? `desktop smoke: ${failed} FAILED` : 'desktop smoke: all passed');
process.exit(failed ? 1 : 0);
