// GB-171 close-ups: node handoffs/2026-10-14-grokbot-GB-171/shots.mjs <old|new> <view...>
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const [m, ...views] = process.argv.slice(2), out = path.join(ROOT, 'handoffs/2026-10-14-grokbot-GB-171/shots'); fs.mkdirSync(out, { recursive: true });
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  for (const v of views) {
    const page = await browser.newPage({ width: 640, height: 640 });
    await page.goto(`${srv.origin}/handoffs/2026-10-14-grokbot-GB-171/preview.html?m=${m}&v=${v}`, { timeout: 60000 });
    await page.waitFor('window.DONE === true', { timeout: 60000 });
    await page.screenshot(path.join(out, `grenade-${m}-${v}.png`)); console.log(m, v);
  }
} finally { await browser.close(); srv.close && srv.close(); }
