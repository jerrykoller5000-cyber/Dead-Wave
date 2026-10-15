import fs from 'node:fs';
import crypto from 'node:crypto';
const hash = s => crypto.createHash('sha256').update(s).digest('hex');
for (const [file, patches] of [
  ['tools/camera.mjs', [
    ['  async open() {\n    const o = this.opt;', '  async open() {\n    try {\n    const o = this.opt;'],
    ['    await this.load();\n    return this;\n  }', '    await this.load();\n    return this;\n    } catch (e) { await this.close(); throw e; }\n  }'],
    ['  async close() { try { await this.browser.close(); } catch { /* gone */ } try { await this.server.close(); } catch { /* gone */ } }', '  async close() {\n    const browser = this.browser, server = this.server;\n    this.browser = null; this.server = null; this.page = null;\n    try { await browser?.close(); } catch { /* gone */ }\n    try { await server?.close(); } catch { /* gone */ }\n  }']
  ]],
  ['studio/inspector/inspector.js', [
    ['let booting = null;', "// Only a failed boot owns this marker. A healthy live inspector is never removed on retry.\nexport function clearFailedBootState(doc = document, page = window) {\n  if (page.DWInspect?.ready) return false;\n  const failed = doc.getElementById('dwi');\n  if (failed?.getAttribute?.('data-dwi-startup-error') === 'true') failed.remove();\n  delete page.DWInspectError;\n  return true;\n}\n\nlet booting = null;"],
    ["    const panel = document.createElement('div'); panel.className = 'dwi-help'; panel.setAttribute('role', 'alert');", "    root.setAttribute('data-dwi-startup-error', 'true');\n    const panel = document.createElement('div'); panel.className = 'dwi-help'; panel.setAttribute('role', 'alert');"],
    ["    throw new Error('Inspector needs game host version 1 with its builders and lifecycle hooks; reload the game');\n  const say", "    throw new Error('Inspector needs game host version 1 with its builders and lifecycle hooks; reload the game');\n  clearFailedBootState();\n  const say"]
  ]]
]) {
  const before = fs.readFileSync(file, 'utf8'); let after = before;
  for (const [old, next] of patches) { if (after.split(old).length !== 2) throw new Error('Expected one: ' + old.slice(0, 90)); after = after.replace(old, next); }
  if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed: ' + file);
  fs.writeFileSync(file, after, 'utf8'); console.log(file + ' updated ' + hash(after));
}
