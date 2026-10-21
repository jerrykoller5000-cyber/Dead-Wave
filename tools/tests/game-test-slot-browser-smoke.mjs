// One real-browser lifecycle check for the queue itself. Run only through the
// game-test slot; this intentionally loads tools/blank.html, not the game.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../cdp.mjs';
import { defaultGameTestSlot } from '../game-test-slot.mjs';
import { serve } from '../serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const server = await serve(ROOT, 0);
let browser;
try {
  browser = await launch({ headless: true });
  const during = await defaultGameTestSlot.status();
  const browserProcesses = during.holder?.processes.filter(process =>
    /browser|chrome|edge/i.test(process.role),
  ) || [];
  assert.equal(during.holder?.task, process.env.DW_GAME_TEST_TASK);
  assert.equal(browserProcesses.length, 1, 'exactly one browser PID must be registered');

  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/tools/blank.html`);
  assert.equal(await page.evaluate('document.readyState'), 'complete');
  await page.goto(`${server.origin}/crew/panel.html`);
  assert.equal(
    await page.waitFor(
      `document.querySelector('#slot')?.textContent.includes('Cursor') &&
       document.querySelector('#slot')?.textContent.includes('CU-146')`,
      { timeout: 15_000 },
    ),
    true,
    'Crew Panel must render the live queue holder',
  );
  await page.screenshot(path.join(ROOT, 'review', 'cu-146', 'game-test-slot-panel.png'));

  await browser.close();
  browser = null;
  const afterClose = await defaultGameTestSlot.status();
  assert.equal(
    afterClose.holder?.processes.some(process => /browser|chrome|edge/i.test(process.role)),
    false,
    'browser PID must be removed before the command releases its lease',
  );
  console.log(
    'PASS one browser registered; Crew Panel rendered holder; browser closed and unregistered before release',
  );
} finally {
  if (browser) await browser.close();
  await server.close();
}
