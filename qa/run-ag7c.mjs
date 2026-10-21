// qa/run-ag7c.mjs -- AG-7c: GP-7 prep checklist, third attempt.
// Root cause from ChatGPT: player name was blank, Play listener returned immediately.
// Fix: set #playerName.value + dispatch input event before clicking modeHunt.
// Also: li.dataset.state === 'done' (not .done class) for goal completion.
// Also: goals appear at most THREE at a time; fresh run usually just alarm (Prep 0/1).
//
// Entry sequence from ChatGPT handoffs/2026-09-24-chatgpt-AG-7b-entry.md:
//   1. Wait for DWLoad.snapshot().state === 'ready'
//   2. Skip opening
//   3. Set playerName, dispatch input, click modeHunt
//   4. Wait for TT.getPhase()==='prep' && !body.deploying
//   5. Wait for !#prepChecklist.hidden
//
// Shots: qa/shots/2026-09-24-AG-7c/   Report: qa/2026-09-24-AG-7b.md (updated)

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/cdp.mjs';
import { serve } from '../tools/serve.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const WIDTH = 1280, HEIGHT = 720;
const OUT_DIR = path.join(ROOT, 'qa', 'shots', '2026-09-24-AG-7c');
await fs.promises.mkdir(OUT_DIR, { recursive: true });

function kbOf(f) { return (fs.statSync(f).size / 1024).toFixed(0); }
async function shot(page, name) {
  const file = path.join(OUT_DIR, name + '.png');
  await page.screenshot(file);
  console.log('  [shot] ' + name + '.png (' + kbOf(file) + ' KB)');
  return file;
}

const obs = [];
function note(label, value) {
  obs.push({ label, value });
  console.log('  [obs] ' + label + ': ' + JSON.stringify(value));
}

const CHECK_GOALS =
  '(() => {' +
  '  const el = document.getElementById("prepChecklist");' +
  '  if (!el) return { found: false };' +
  '  const goals = [...el.querySelectorAll("li")].map(li => ({' +
  '    type: li.dataset.goal || li.className,' +
  '    state: li.dataset.state,' +
  '    text: li.textContent.trim().substring(0, 80),' +
  '    done: li.dataset.state === "done"' +
  '  }));' +
  '  const summary = el.querySelector("summary");' +
  '  return { found: true, hidden: el.hidden, summary: summary ? summary.textContent.trim() : null, goals };' +
  '})()';

let server = null;
let origin = 'http://127.0.0.1:8971';
try {
  const res = await fetch(origin + '/index.html', { signal: AbortSignal.timeout(2000) });
  if (!res.ok) throw new Error('not ok');
  console.log('[AG-7c] Reusing server at', origin);
} catch {
  server = await serve(ROOT, 8971);
  origin = server.origin;
  console.log('[AG-7c] Started server at', origin);
}

const url = origin + '/index.html?debug=1&raf=timer';
const browser = await launch({ headless: false });
const page = await browser.newPage({ width: WIDTH, height: HEIGHT });

try {
  await page.goto(url, { waitUntil: 'none' });

  // Step 1: Wait for DWLoad.snapshot().state === 'ready' (per ChatGPT instructions)
  console.log('[AG-7c] Waiting for DWLoad ready...');
  const dwReady = await page.waitFor(
    'window.TT && window.DWLoad && window.DWLoad.snapshot().state === "ready"',
    { timeout: 300000 }
  );
  note('DWLoad ready', dwReady);

  // Step 2: Skip opening
  console.log('[AG-7c] Skipping opening...');
  for (let i = 0; i < 3; i++) {
    await page.evaluate('(() => { const b = document.getElementById("openingSkip"); if (b) b.click(); })()');
    await page.evaluate('new Promise(r => setTimeout(r, 300))');
  }
  const openingHidden = await page.waitFor('document.getElementById("opening").hidden', { timeout: 120000 });
  note('opening hidden', openingHidden);
  await shot(page, 'title');

  // Step 3: Set player name + dispatch input event + click Play
  console.log('[AG-7c] Setting player name and clicking Play...');
  await page.evaluate(
    '(() => {' +
    '  const n = document.getElementById("playerName");' +
    '  n.value = "QA Marine";' +
    '  n.dispatchEvent(new Event("input", { bubbles: true }));' +
    '  document.getElementById("modeHunt").click();' +
    '})()'
  );

  // Step 4: Wait for prep phase AND deploying cleared
  console.log('[AG-7c] Waiting for prep phase (with deploying cycle)...');
  const inPrep = await page.waitFor(
    'window.TT && TT.getPhase() === "prep" && !document.body.classList.contains("deploying")',
    { timeout: 120000 }
  );
  note('reached prep', inPrep);
  await page.evaluate('new Promise(r => setTimeout(r, 1500))');
  await shot(page, 'after-landing');

  // Check body/phase
  const phaseCheck = await page.evaluate(
    '({ phase: TT.getPhase(), deploying: document.body.classList.contains("deploying") })'
  );
  note('phase+deploying', phaseCheck);

  // Step 5: Wait for checklist to become visible
  console.log('[AG-7c] Waiting for checklist to show...');
  const checklistVisible = await page.waitFor(
    '!document.getElementById("prepChecklist").hidden',
    { timeout: 30000 }
  );
  note('checklist visible', checklistVisible);

  // Read goals at prep start
  const goals0 = await page.evaluate(CHECK_GOALS);
  note('goals at prep start', goals0);
  await shot(page, 'prep-start');

  // ALARM goal: teleport to HQ panel front, wait for actionTarget, doAction, click Sound alarm
  console.log('[AG-7c] Going to HQ panel...');
  const hqTeleport = await page.evaluate(
    '(() => {' +
    '  if (!TT.HQ_PANEL_FRONT) return { err: "no HQ_PANEL_FRONT" };' +
    '  const q = TT.HQ_PANEL_FRONT;' +
    '  TT.player.position.set(q.x, TT.sampleHeight(q.x, q.z), q.z);' +
    '  return { ok: true, x: q.x.toFixed(1), z: q.z.toFixed(1) };' +
    '})()'
  );
  note('HQ teleport', hqTeleport);
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');

  // Wait for actionTarget hqPanel
  const atTarget = await page.waitFor(
    'TT.actionTarget && TT.actionTarget() === "hqPanel"',
    { timeout: 10000 }
  );
  note('actionTarget hqPanel', atTarget);

  // Open HQ briefing (E / doAction)
  const doActionResult = await page.evaluate(
    '(() => { if (typeof TT.doAction === "function") { TT.doAction(); return "doAction"; } return "no-api"; })()'
  );
  note('doAction result', doActionResult);
  await page.evaluate('new Promise(r => setTimeout(r, 800))');
  await shot(page, 'hq-briefing-open');

  // Click Sound alarm button
  const alarmResult = await page.evaluate(
    '(() => {' +
    '  const buttons = [...document.querySelectorAll("#hqBriefing button")];' +
    '  const alarmBtn = buttons.find(b => b.textContent.toLowerCase().includes("sound alarm") || b.textContent.toLowerCase().includes("alarm"));' +
    '  if (alarmBtn) { alarmBtn.click(); return "clicked: " + alarmBtn.textContent.trim(); }' +
    '  return "no alarm button found. buttons: " + buttons.map(b => b.textContent.trim()).join(", ");' +
    '})()'
  );
  note('alarm button', alarmResult);
  await page.evaluate('new Promise(r => setTimeout(r, 1000))');
  await shot(page, 'after-alarm');

  // Final goal state
  const goalsFinal = await page.evaluate(CHECK_GOALS);
  note('goals after alarm', goalsFinal);

  // Final phase
  const finalPhase = await page.evaluate('TT.getPhase ? TT.getPhase() : "?"');
  note('final phase', finalPhase);
  await shot(page, 'final');

} finally {
  await browser.close();
}

// Write report
const _now = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const shotFiles = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.png'));

const reportLines = [
  '# Antigravity -- AG-7c GP-7 Prep Checklist (final) -- ' + _now.slice(0, 10),
  '',
  '> Third run. Root cause from ChatGPT: player name was blank, Play returned immediately.',
  '> Fix: set playerName + dispatch input event before modeHunt click.',
  '> Also: goal completion is li.dataset.state === done (not .done class).',
  '',
  '## Observations',
  '',
];

for (const { label, value } of obs) {
  reportLines.push('**' + label + ':** ' + JSON.stringify(value));
  reportLines.push('');
}

reportLines.push('## Screenshots');
reportLines.push('');
for (const s of shotFiles) {
  reportLines.push('![' + s.replace('.png','') + '](qa/shots/2026-09-24-AG-7c/' + s + ')');
  reportLines.push('');
}

const reportPath = path.join(ROOT, 'qa', '2026-09-24-AG-7c.md');
await fs.promises.writeFile(reportPath, reportLines.join('\\n'), 'utf8');
console.log('[AG-7c] Report:', reportPath);
console.log('[AG-7c] Done.');
if (server) await server.close();
