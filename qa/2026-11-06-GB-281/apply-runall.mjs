import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const runPath = path.join(ROOT, 'tools', 'tests', 'run-all.mjs');
let run = fs.readFileSync(runPath, 'utf8');
run = run.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const oldLaunch = `const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const results = [];`;

const newLaunch = `const server = await serve(ROOT, 0);
// GB-281: one browser for the batch, but a FAIL/ERROR can leave Chrome unable to
// Page.navigate for later checks — relaunch (keep the server) when that happens.
let browser = await launch({ headless: true });
const results = [];`;

if (!run.includes(oldLaunch)) throw new Error('launch block not found');
run = run.replace(oldLaunch, newLaunch);

const oldClose = `  try { await page.send('Page.close', {}); } catch { /* target already gone */ }
}`;

const newClose = `  // GB-281: Target.closeTarget (via page.close) so the window actually goes away.
  try { await page.close(); } catch { /* target already gone */ }
  // A red or a navigate/timeout ERROR can still wedge Chrome (orphaned renderers,
  // audio). Relaunch before the next check so one red cannot take the rest.
  if (fail || note) {
    const why = note || (fail + ' fail');
    console.log(\`           recovering browser after \${name}: \${why}\`);
    try { await browser.close(); } catch { /* already gone */ }
    browser = await launch({ headless: true });
  }
}`;

if (!run.includes(oldClose)) throw new Error('close block not found: ' + JSON.stringify(run.slice(run.indexOf('Page.close') - 40, run.indexOf('Page.close') + 90)));
run = run.replace(oldClose, newClose);

fs.writeFileSync(runPath, run, 'utf8');
console.log('patched', runPath);
console.log('has recovering', run.includes('recovering browser'));
console.log('has let browser', run.includes('let browser = await launch'));
console.log('has page.close()', run.includes('await page.close()'));
