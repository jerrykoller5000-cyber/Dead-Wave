import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate(`(()=>{
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true}));
    window.dispatchEvent(new KeyboardEvent('keyup',{code:'F13',key:'F13',bubbles:true}));
  })()`);
  assert.deepEqual(page.errors, [], 'window-target key events must not throw');
  console.log('PASS GP-20103 window-target F13 down/up: 0 page errors');
} finally { await browser.close(); await server.close(); }
