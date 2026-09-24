// qa/run-ag7b.mjs -- AG-7b: GP-7 prep checklist re-run.
// Previous run (AG-7) used modeHunt click which skips the insertion cycle,
// so publishPrepState was never called and goals stayed empty.
// This run: click Play (modeHunt), wait for body.deploying to clear (insertion done),
// then verify the four goals tick: bank, ammo, repair, alarm.
//
// Shots: qa/shots/2026-09-24-AG-7b/   Report: qa/2026-09-24-AG-7b.md

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-7b');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
async function shot(page, name) {
  const file = path.join(OUT_DIR, name + '.png');
  await page.screenshot(file);
  console.log('  [shot] ' + name + '.png (' + kbOf(file) + ' KB)');
  return file;
}

const observations = [];
function obs(label, value) {
  observations.push({ label, value });
  console.log('  [obs] ' + label + ': ' + JSON.stringify(value));
}

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(origin + '/index.html', { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('not ok');
  console.log('[AG-7b] Reusing server at', origin);
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
  console.log('[AG-7b] Started server at', origin);
}

const url = origin + '/index.html?debug=1&raf=timer';
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

try {
  // Boot to title
  await page.goto(url, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 3; i++) {
    await page.evaluate('(() => { const b = document.getElementById("openingSkip"); if (b) b.click(); })()');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.waitFor('window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  console.log('[AG-7b] Title screen ready.');
  await shot(page, 'title');

  // Click Play (modeHunt) -- same as before, but now we wait for the FULL insertion
  await page.evaluate('(() => { document.getElementById("modeHunt").click(); })()');
  console.log('[AG-7b] Clicked modeHunt. Waiting for body.deploying to clear...');

  // Wait for deploying class to appear first (insertion start)
  const deployingAppeared = await page.waitFor(
    'document.body.classList.contains("deploying")',
    { timeout: 20000 }
  );
  console.log('[AG-7b] body.deploying appeared:', deployingAppeared);

  // Then wait for it to clear (insertion done -- full cycle complete)
  const deployingCleared = await page.waitFor(
    '!document.body.classList.contains("deploying")',
    { timeout: 60000 }
  );
  console.log('[AG-7b] body.deploying cleared (insertion done):', deployingCleared);
  await page.evaluate('new Promise(r => setTimeout(r, 1500))');

  // Check phase
  const phase = await page.evaluate('window.TT.getPhase ? window.TT.getPhase() : "unknown"');
  obs('phase after insertion', phase);
  await shot(page, 'after-insertion');

  // Check prep checklist
  const checklist0 = await page.evaluate(
    '(() => {' +
    '  const el = document.getElementById("prepChecklist") || document.querySelector(".prep-checklist");' +
    '  if (!el) return { found: false };' +
    '  const goals = [...el.querySelectorAll("li")].map(li => ({ text: li.textContent.trim().substring(0, 60), done: li.classList.contains("done") || li.dataset.done === "true" }));' +
    '  const summary = el.querySelector("summary");' +
    '  return { found: true, hidden: el.hidden, summaryText: summary ? summary.textContent.trim() : null, goals };' +
    '})()'
  );
  obs('checklist at prep start', checklist0);
  await shot(page, 'prep-start');

  // GOAL: BANK -- deposit at HQ window
  console.log('[AG-7b] Attempting bank deposit...');
  const bankResult = await page.evaluate(
    '(() => {' +
    '  if (typeof TT.nearHQWindow === "function" && TT.nearHQWindow()) {' +
    '    const btn = document.querySelector(".bank-btn, #bankBtn, [data-action=bank], button");' +
    '    if (btn) { btn.click(); return "clicked:" + btn.textContent.trim(); }' +
    '    return "near-hq-no-btn";' +
    '  }' +
    '  if (typeof TT.depositSkulls === "function") { TT.depositSkulls(); return "depositSkulls"; }' +
    '  return "no-api";' +
    '})()'
  );
  obs('bank attempt', bankResult);
  await page.evaluate('new Promise(r => setTimeout(r, 800))');

  const checklistBank = await page.evaluate(
    '(() => {' +
    '  const el = document.getElementById("prepChecklist") || document.querySelector(".prep-checklist");' +
    '  if (!el) return { found: false };' +
    '  const goals = [...el.querySelectorAll("li")].map(li => ({ text: li.textContent.trim().substring(0, 60), done: li.classList.contains("done") || li.dataset.done === "true" }));' +
    '  return { hidden: el.hidden, goals };' +
    '})()'
  );
  obs('checklist after bank', checklistBank);
  await shot(page, 'after-bank');

  // GOAL: ALARM -- sound the alarm
  console.log('[AG-7b] Sounding alarm...');
  const alarmResult = await page.evaluate(
    '(() => {' +
    '  if (typeof TT.soundAlarm === "function") { TT.soundAlarm(); return "TT.soundAlarm"; }' +
    '  const btn = document.querySelector("[data-action=alarm], .alarm-btn, #alarmBtn");' +
    '  if (btn) { btn.click(); return "btn:" + btn.textContent.trim(); }' +
    '  return "no-api";' +
    '})()'
  );
  obs('alarm attempt', alarmResult);
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');

  const checklistAlarm = await page.evaluate(
    '(() => {' +
    '  const el = document.getElementById("prepChecklist") || document.querySelector(".prep-checklist");' +
    '  if (!el) return { found: false };' +
    '  const goals = [...el.querySelectorAll("li")].map(li => ({ text: li.textContent.trim().substring(0, 60), done: li.classList.contains("done") || li.dataset.done === "true" }));' +
    '  const phase = window.TT.getPhase ? window.TT.getPhase() : "?";' +
    '  return { hidden: el.hidden, goals, phase };' +
    '})()'
  );
  obs('checklist after alarm', checklistAlarm);
  await shot(page, 'after-alarm');

  // Final state
  const finalPhase = await page.evaluate('window.TT.getPhase ? window.TT.getPhase() : "?"');
  obs('final phase', finalPhase);
  await shot(page, 'final');

} finally {
  await browser.close();
}

// Write report
const _now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const shots = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));

const reportLines = [
  '# Antigravity -- AG-7b GP-7 Prep Checklist Re-run -- ' + _now.slice(0, 10),
  '',
  '> Re-run of AG-7. Previous run used modeHunt click without waiting for insertion to complete.',
  '> This run waits for body.deploying to clear before checking the checklist.',
  '',
  '## Observations',
  '',
];

for (const { label, value } of observations) {
  reportLines.push('**' + label + ':** ' + JSON.stringify(value));
  reportLines.push('');
}

reportLines.push('## Screenshots');
reportLines.push('');
for (const s of shots) {
  reportLines.push('!['  + s.replace('.png','') + '](qa/shots/2026-09-24-AG-7b/' + s + ')');
  reportLines.push('');
}

const reportPath = path.join(ROOT, 'qa', '2026-09-24-AG-7b.md');
await fs.promises.writeFile(reportPath, reportLines.join('\\n'), 'utf8');
console.log('\\n[AG-7b] Report:', reportPath);
console.log('[AG-7b] Done.');
if (server) await server.close();
