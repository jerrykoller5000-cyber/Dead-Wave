// GB-297 close-ups of rivets/screws/bolts. Usage: node qa/2026-11-07-GB-297/close-shots.mjs before|after
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);
const tag = process.argv[2] || 'after';
const out = path.join(ROOT, 'qa/2026-11-07-GB-297', tag);
fs.mkdirSync(out, { recursive: true });
// Cameras aimed at the hardware Jerry would notice (gun space: +z muzzle, +y up, +x gun-left)
const SHOTS = [
  // every gun: a 3/4 close that shows receiver/body hardware
  ['pistol',   '0.22,0.08,0.05, 0,0.02,0.05, 32', 'parts'],
  ['revolver', '0.28,0.06,-0.02, 0,0.03,-0.04, 30', 'parts'],
  ['uzi',      '0.28,0.08,0.12, 0,0.04,0.12, 32', 'parts'],
  ['m4',       '0.28,0.12,0.05, 0,0.06,0.05, 30', 'parts'],
  ['ak',       '0.22,-0.08,-0.05, 0,-0.14,-0.10, 26', 'grip-screws'],
  ['aa12',     '0.35,0.08,0.0, 0,0.02,0.0, 30', 'parts'],
  ['shotgun',  '0.30,0.08,0.10, 0,0.03,0.10, 30', 'parts'],
  ['sniper',   '0.32,0.06,-0.20, 0,0.0,-0.20, 28', 'parts'],
  ['minigun',  '0.40,0.10,0.0, 0.05,0.0,0.0, 32', 'parts'],
  ['launcher', '0.28,0.10,-0.15, 0.07,0.08,-0.10, 26', 'side-bolts'],
  ['flamer',   '0.22,0.05,0.05, 0.06,0.02,0.08, 28', 'side-bolts'],
  ['chainsaw', '0.35,0.08,-0.05, 0.14,0.05,-0.05, 28', 'side-bolts'],
  ['m240',     '0.35,0.90,0.05, 0,0.86,0.0, 32', 'parts'],
  ['mortar',   '0.50,0.40,0.20, 0,0.25,0.0, 36', 'parts'],
  ['optic-holo','0.10,0.04,-0.02, 0.03,0.026,-0.027, 22', 'brightness-dial']
];
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  for (const [w, c, label] of SHOTS) {
    const page = await browser.newPage({ width: 900, height: 675 });
    await page.goto(`${srv.origin}/qa/2026-11-07-GB-297/close.html?w=${w}&c=${c.replace(/ /g, '')}`, { timeout: 90000 });
    await page.waitFor('window.DONE === true', { timeout: 120000 });
    const err = await page.evaluate('window.ERR || ""');
    if (err) console.log(w, 'ERR', err.slice(0, 240));
    const file = path.join(out, `${w}-${label}.png`);
    await page.screenshot(file);
    console.log(tag, w, label, 'ok');
    await page.close();
  }
} finally {
  await browser.close();
  srv.close && srv.close();
}