import fs from 'node:fs';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const srv = await serve(process.cwd());
const b = await launch({ headless: true });
try {
  const p = await b.newPage({ width: 800, height: 600 });
  await p.goto(srv.origin + '/qa/2026-11-07-GB-307/pistol-float.html?t=' + Date.now(), { timeout: 90000 });
  await p.waitFor('window.DONE === true', { timeout: 120000 });
  const err = await p.evaluate('window.ERR || ""');
  const o = await p.evaluate('window.OUT');
  if (err) console.log('ERR', err.slice(0, 500));
  fs.writeFileSync('qa/2026-11-07-GB-307/pistol-float.json', JSON.stringify(o || { err }, null, 2));
  console.log(JSON.stringify(o || { err }, null, 2));
  if (!o || o.float > 0) process.exitCode = 2;
} finally {
  await b.close();
  srv.close && srv.close();
}
