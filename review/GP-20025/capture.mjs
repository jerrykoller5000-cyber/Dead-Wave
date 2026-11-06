// GP-20025 preview-only capture. Run through the crew game-test slot.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const outputArg = process.argv.find(arg => arg.startsWith('--output-dir='))?.slice('--output-dir='.length);
const output = outputArg ? path.resolve(root, outputArg) : path.dirname(fileURLToPath(import.meta.url));
const server = await serve(root, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
const jobs = [];
for (const kind of ['mini-reflex', 'reflex', 'holo'])
  for (const view of ['front', 'side', 'three']) jobs.push({ kind, view, light: 'noon' });
for (const gun of ['pistol', 'revolver', 'uzi', 'shotgun', 'aa12', 'm4', 'ak'])
  jobs.push({ gun, view: 'three', light: 'noon' });
for (const gun of ['pistol', 'revolver', 'uzi', 'shotgun', 'aa12', 'm4', 'ak'])
  jobs.push({ gun, view: 'three', light: 'noon', close: '1' });
for (const light of ['overcast', 'dusk', 'night'])
  for (const kind of ['mini-reflex', 'reflex', 'holo']) jobs.push({ kind, view: 'three', light });
try {
  for (const job of jobs) {
    const onlyGun = process.argv.find(arg => arg.startsWith('--only-gun='))?.slice('--only-gun='.length);
    if (onlyGun && job.gun !== onlyGun) continue;
    if (process.argv.includes('--only-holo') && job.kind !== 'holo' && !['m4', 'ak'].includes(job.gun)) continue;
    const refreshReflex = process.argv.includes('--refresh-reflex');
    if (refreshReflex && job.kind !== 'reflex' && !['uzi', 'shotgun', 'aa12'].includes(job.gun)) continue;
    const query = new URLSearchParams({ ...job, pass: outputArg ? 'GP-20026' : 'GP-20025' }).toString();
    const name = Object.values(job).join('-');
    if (existsSync(path.join(output, `${name}.png`)) && !(process.argv.includes('--refresh-guns') && job.gun) && !refreshReflex) continue;
    await page.goto(`${server.origin}/review/GP-20025/preview.html?${query}`);
    if (!(await page.waitFor('window.__ready === true', { timeout: 30000 })))
      throw new Error(`${name}: not ready; ${page.errors.slice(0, 3).join(' | ')}`);
    await page.screenshot(path.join(output, `${name}.png`));
    const counts = await page.evaluate('({optic:window.__triangles,gun:window.__gunTriangles})');
    console.log(`${name}: ${counts.optic} optic triangles${job.gun ? ` / ${counts.gun} gun triangles` : ''}`);
  }
  if (page.errors.length) throw new Error(page.errors.slice(0, 5).join('\n'));
} finally {
  await browser.close();
  await server.close();
}
