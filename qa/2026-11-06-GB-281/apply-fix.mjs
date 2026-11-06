// Apply GB-281 fixes to tools/cdp.mjs and tools/tests/run-all.mjs (UTF-8, LF, no BOM).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || process.cwd();
const cdpPath = path.join(ROOT, 'tools', 'cdp.mjs');
const runPath = path.join(ROOT, 'tools', 'tests', 'run-all.mjs');

function mustInclude(hay, needle, label) {
  if (!hay.includes(needle)) throw new Error(`missing expected text in ${label}: ${JSON.stringify(needle).slice(0, 80)}`);
}

// --- cdp.mjs ---
let cdp = fs.readFileSync(cdpPath, 'utf8');
mustInclude(cdp, 'class Page {\n  constructor(conn, sessionId) {', 'cdp Page ctor');
mustInclude(cdp, "const page = new Page(conn, sessionId);\n  await page.send('Page.enable', {});", 'cdp attach Page');
mustInclude(cdp, "const page = new Page(conn, sessionId);\n      await page.send('Page.enable', {});", 'cdp newPage Page');

const oldCtor = `class Page {
  constructor(conn, sessionId) {
    this.conn = conn;
    this.sessionId = sessionId;
    this.errors = [];
    this.console = [];
    this._loaded = false;`;

const newCtor = `class Page {
  constructor(conn, sessionId, targetId = null) {
    this.conn = conn;
    this.sessionId = sessionId;
    this.targetId = targetId;
    this.errors = [];
    this.console = [];
    this._loaded = false;`;

if ((cdp.match(/class Page \{/g) || []).length !== 1) throw new Error('unexpected Page class count');
cdp = cdp.replace(oldCtor, newCtor);

// Add close() method after send() line on Page
const oldSend = `  send(method, params, timeoutMs) { return this.conn.send(method, params, this.sessionId, timeoutMs); }
  async setViewport(width, height, dsf = 1) {`;

const newSend = `  send(method, params, timeoutMs) { return this.conn.send(method, params, this.sessionId, timeoutMs); }
  // GB-281: Page.close on a newWindow target often ACKs but leaves the target alive, so
  // orphaned game pages pile up and later Page.navigate to the game never gets a CDP reply.
  // Target.closeTarget actually destroys the window.
  async close(timeoutMs = 8000) {
    if (this.targetId) {
      try {
        await this.conn.send('Target.closeTarget', { targetId: this.targetId }, undefined, timeoutMs);
        return;
      } catch { /* fall through to Page.close */ }
    }
    try { await this.send('Page.close', {}, timeoutMs); } catch { /* target already gone */ }
  }
  async setViewport(width, height, dsf = 1) {`;

mustInclude(cdp, oldSend, 'cdp send+setViewport');
cdp = cdp.replace(oldSend, newSend);

// attach(): pass targetId
const oldAttachPage = `  const { sessionId } = await conn.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const page = new Page(conn, sessionId);`;
const newAttachPage = `  const { sessionId } = await conn.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const page = new Page(conn, sessionId, target.targetId);`;
mustInclude(cdp, oldAttachPage, 'cdp attach new Page');
cdp = cdp.replace(oldAttachPage, newAttachPage);

// newPage(): pass targetId
const oldNewPage = `      const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
      const page = new Page(conn, sessionId);`;
const newNewPage = `      const { sessionId } = await conn.send('Target.attachToTarget', { targetId, flatten: true });
      const page = new Page(conn, sessionId, targetId);`;
mustInclude(cdp, oldNewPage, 'cdp newPage new Page');
cdp = cdp.replace(oldNewPage, newNewPage);

if (cdp.includes('\\r\\n') || cdp.includes('\r')) {
  // keep LF only
  cdp = cdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
fs.writeFileSync(cdpPath, cdp, 'utf8');
console.log('patched', cdpPath);

// --- run-all.mjs ---
let run = fs.readFileSync(runPath, 'utf8');
mustInclude(run, 'const browser = await launch({ headless: true });', 'run-all launch');
mustInclude(run, "try { await page.send('Page.close', {}); } catch { /* target already gone */ }", 'run-all Page.close');

const oldLaunch = `const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const results = [];`;

const newLaunch = `const server = await serve(ROOT, 0);
// GB-281: one browser for the batch, but a FAIL/ERROR can leave Chrome unable to
// Page.navigate for later checks — relaunch (keep the server) when that happens.
let browser = await launch({ headless: true });
const results = [];`;

mustInclude(run, oldLaunch, 'run-all server+browser');
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

mustInclude(run, oldClose, 'run-all close block');
run = run.replace(oldClose, newClose);

run = run.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
fs.writeFileSync(runPath, run, 'utf8');
console.log('patched', runPath);
console.log('OK');
