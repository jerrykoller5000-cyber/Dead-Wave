// CU-193: GP-19987's ui/objectives.browser.mjs, run without Playwright.
// The assertions are the ones in that file. This drives the same fixture page through
// tools/cdp.mjs (Chrome or Edge, already on the machine). Run it through the game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../../tools/cdp.mjs';
import { serve } from '../../tools/serve.mjs';

const fails = [];
const check = (cond, message) => { if (cond) console.log('PASS ' + message); else { fails.push(message); console.log('FAIL ' + message); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shots = path.join(root, 'qa/2026-10-31-CU-193/shots');
fs.mkdirSync(shots, { recursive: true });
const server = await serve(root, 0);
let browser;
const q = (s) => JSON.stringify(s);

async function press(page, key) {
  // Playwright's Enter on a focused button activates it. A CDP key event does not, so do the click.
  if (key === 'Enter') {
    const clicked = await page.evaluate(`(() => { const el = document.activeElement; if (el && el.tagName === 'BUTTON') { el.click(); return true; } return false; })()`);
    if (clicked) return;
  }
  const code = key === 'Enter' ? 13 : key === 'ArrowDown' ? 40 : 0;
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
}
async function focus(page, sel) {
  const ok = await page.evaluate(`(() => { const el = document.querySelector(${q(sel)}); if (!el) return false; el.focus(); return document.activeElement === el; })()`);
  check(ok === true, 'focused ' + sel);
  return ok;
}
async function click(page, sel) {
  const ok = await page.evaluate(`(() => { const el = document.querySelector(${q(sel)}); if (!el) return false; el.click(); return true; })()`);
  check(ok === true, 'clicked ' + sel);
  return ok;
}
async function count(page, sel) {
  return page.evaluate(`document.querySelectorAll(${q(sel)}).length`);
}
async function hidden(page, sel) {
  return page.evaluate(`(() => { const el = document.querySelector(${q(sel)}); if (!el) return true; const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden') return true; const r = el.getBoundingClientRect(); return r.width === 0 && r.height === 0; })()`);
}
async function text(page, sel) {
  return page.evaluate(`(document.querySelector(${q(sel)}) || {}).textContent`);
}
async function attr(page, sel, name) {
  return page.evaluate(`document.querySelector(${q(sel)}).getAttribute(${q(name)})`);
}

try {
  browser = await launch({ headless: true });
  const page = await browser.newPage({ width: 1150, height: 780 });
  await page.goto(server.origin + '/ui/objectives.fixture.html');
  check(await page.waitFor('window.objectiveFixture', { timeout: 20000 }), true === 'fixture loaded', "fixture loaded");
  const shot = (name) => page.screenshot(path.join(shots, name + '.png'));

  check(await count(page, '.objective-marker') === 7, "await count(page, '.objective-marker') === 7");
  check(await hidden(page, '.objective-tracker') === true, "await hidden(page, '.objective-tracker') === true");
  await shot('before');

  await focus(page, '[data-site="objective:radio-repair"]');
  await press(page, 'Enter');
  check(await text(page, '.objective-tracker h2') === 'Restore the radio mast', "Restore the radio mast");
  check(await attr(page, '[data-site="objective:radio-repair"]', 'aria-pressed') === 'true', "true");
  await page.evaluate('objectiveFixture.tick()');
  check(await page.evaluate(`document.activeElement === document.querySelector('[data-site="objective:radio-repair"]')`), true === 'marker retains keyboard focus on updates', "marker retains keyboard focus on updates");
  await shot('tracked');

  await click(page, '[data-site="objective:medical-convoy"]');
  check(await count(page, '.objective-marker[aria-pressed="true"]') === 1, "await count(page, '.objective-marker[aria-pressed=\"true\"]') === 1");
  check(await text(page, '.objective-tracker h2') === "Open Threshold's medical case", "Open Threshold's medical case");
  await click(page, '.objective-tracker button');
  check(await hidden(page, '.objective-tracker') === true, "await hidden(page, '.objective-tracker') === true");

  for (const state of ['available', 'active', 'interrupted', 'full', 'partial', 'claimed', 'unavailable', 'hidden']) {
    await page.evaluate(`objectiveFixture.scenario(${q(state)})`);
    if (state === 'active') check(await attr(page, 'progress', 'value') === '0.55', "0.55");
    if (state === 'interrupted') check(await text(page, '.objective-status') === 'Repair interrupted', "Repair interrupted");
    if (state === 'full') check(await text(page, '.objective-status') === 'Inventory full — supplies remain', "Inventory full — supplies remain");
    if (state === 'partial') { const got = await text(page, '.objective-tracker'); check(/Supplies remaining: \+18 rounds/.test(got || ''), 'partial remaining text: ' + got); }
    if (state === 'claimed' || state === 'unavailable') check(await hidden(page, '.objective-tracker') === true, "await hidden(page, '.objective-tracker') === true");
    if (state === 'hidden') check(await count(page, '.objective-marker') === 1, "await count(page, '.objective-marker') === 1");
    await shot(state);
  }

  await page.evaluate(`objectiveFixture.scenario('active')`);
  await page.setViewport(390, 844);
  await shot('mobile');
  const box = await page.evaluate(`(() => { const r = document.querySelector('.objective-tracker').getBoundingClientRect(); return { x: r.x, width: r.width }; })()`);
  check(box && box.x >= 0 && box.x + box.width <= 390, 'tracker inside 390 (' + (box && box.x) + ', ' + (box && box.width) + ')');
  check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), true === 'no horizontal overflow', "no horizontal overflow");
  await focus(page, '.objective-tracker button');
  await press(page, 'Enter');
  check(await hidden(page, '.objective-tracker') === true, "await hidden(page, '.objective-tracker') === true");

  await page.evaluate(`(() => {
    objectiveFixture.scenario('available'); const s = objectiveFixture.snapshot(), r = s.sites[0];
    r.choices = [{ id: '556', reward: { key: 'objectives.packChoice', params: { calibre: '5.56', pack: '60 rounds' } } },
      { id: '9mm', reward: { key: 'objectives.packChoice', params: { calibre: '9mm', pack: '90 rounds' } } }];
    r.choiceId = '556'; s.sequence++; objectiveFixture.app.update(s);
  })()`);
  check(await hidden(page, '.objective-choice select') === false, "await hidden(page, '.objective-choice select') === false");
  await focus(page, '.objective-choice select');
  await press(page, 'ArrowDown');
  check(await page.evaluate(`document.activeElement === document.querySelector('.objective-choice select')`), true === 'choice keeps focus', "choice keeps focus");
  await page.evaluate(`(() => { const el = document.querySelector('.objective-choice select'); el.value = '9mm'; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  check(await page.evaluate(`document.querySelector('.objective-choice select').value`) === '9mm', "9mm");
  await shot('choices');
  await page.evaluate(`(() => { const s = objectiveFixture.snapshot(); s.sites[0].choiceId = '9mm'; s.sites[0].choiceLocked = true; s.sequence++; objectiveFixture.app.update(s); })()`);
  check(await page.evaluate(`document.querySelector('.objective-choice select').disabled`) === true, "await page.evaluate(`document.querySelector('.objective-choice select').disabled`) === true");
  check(await page.evaluate(`document.querySelector('.objective-choice select').value`) === '9mm', "9mm");
  await page.evaluate(`(() => { const s = objectiveFixture.snapshot(); s.sequence++; s.active = false; objectiveFixture.app.update(s); })()`);
  check(await hidden(page, '.objective-markers') === true, "await hidden(page, '.objective-markers') === true");

  await page.evaluate(`(() => {
    objectiveFixture.scenario('available');
    const dialog = document.createElement('dialog'); dialog.id = 'hqBriefing'; dialog.dataset.panel = 'alarm';
    const report = document.createElement('div'); report.id = 'briefing-report'; dialog.append(report); document.body.append(dialog);
    dialog.showModal(); dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'briefing-open' } }));
    const s = objectiveFixture.snapshot(); s.sequence++; s.active = false; objectiveFixture.app.update(s);
  })()`);
  check(await count(page, '#briefing-report > .objective-tracker') === 1, "await count(page, '#briefing-report > .objective-tracker') === 1");
  check(await hidden(page, '#briefing-report > .objective-tracker') === false, "await hidden(page, '#briefing-report > .objective-tracker') === false");
  check(await text(page, '#briefing-report .objective-prompt') === '', "");
  await page.evaluate(`(() => { document.getElementById('hqBriefing').close(); dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'briefing-closed' } })); })()`);
  check(await count(page, '#hud > .objective-tracker') === 1, "await count(page, '#hud > .objective-tracker') === 1");
  check(await hidden(page, '#hud > .objective-tracker') === true, "await hidden(page, '#hud > .objective-tracker') === true");
  check(page.errors.length === 0, "no page errors (" + page.errors.slice(0, 2).join(" | ") + ")");
  if (fails.length) {
    console.log('FAIL ' + fails.length + ' check(s). The script ui/objectives.browser.mjs was not run: playwright is not installed.');
    process.exitCode = 1;
  } else {
    console.log('PASS objectives fixture via CDP.');
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
