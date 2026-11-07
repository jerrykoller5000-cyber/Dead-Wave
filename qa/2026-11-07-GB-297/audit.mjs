// GB-297: build every gun pre-merge and list floating small parts.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(pathToFileURL(path.join(ROOT, 'tools/serve.mjs')).href);
const { launch } = await import(pathToFileURL(path.join(ROOT, 'tools/cdp.mjs')).href);
const outDir = path.join(ROOT, 'qa/2026-11-07-GB-297');
fs.mkdirSync(outDir, { recursive: true });
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 400, height: 300 });
  await page.goto(srv.origin + '/qa/2026-11-07-GB-297/audit.html', { timeout: 120000 });
  await page.waitFor('window.DONE === true', { timeout: 180000 });
  const err = await page.evaluate('window.ERR || ""');
  if (err) { console.error('ERR', err.slice(0, 800)); process.exitCode = 2; }
  const summary = await page.evaluate('window.SUMMARY');
  const report = await page.evaluate('window.REPORT');
  fs.writeFileSync(path.join(outDir, 'audit-summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(outDir, 'audit-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  let floats = 0;
  for (const [k, v] of Object.entries(report || {})) {
    if (v && v.floaterCount) {
      floats += v.floaterCount;
      console.log('---', k, 'floaters', v.floaterCount);
      for (const f of v.floaters.slice(0, 15)) console.log(' ', JSON.stringify(f));
      if (v.floaters.length > 15) console.log('  ...', v.floaters.length - 15, 'more');
    }
    if (v && v.sunkCount) {
      console.log('---', k, 'sunk', v.sunkCount);
      for (const f of v.sunk.slice(0, 8)) console.log(' ', JSON.stringify(f));
    }
  }
  console.log('TOTAL_FLOATERS', floats);
} finally {
  await browser.close();
  srv.close && srv.close();
}