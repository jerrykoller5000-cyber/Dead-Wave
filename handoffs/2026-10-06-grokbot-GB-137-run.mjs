import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "../tools/serve.mjs";
import { launch } from "../tools/cdp.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HERE = path.join(ROOT, "tools", "tests");
const names = process.argv.slice(2).map((a) => a.replace(/\.js$/, ""));
if (!names.length) { console.error("usage: node ...-run.mjs t214"); process.exit(2); }

const PAGE = `test-gb137-${process.pid}.html`;
function build() {
  const src = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  if (!map) throw new Error("no import map");
  const fake = `<script type="importmap">
  { "imports": { "three": "./fakethree.mjs", "three/webgpu": "./fakethree.mjs", "three/tsl": "./faketsl.mjs", "three/addons/": "./addons/" } }
  </script>`;
  let out = src.replace(map[0], fake);
  out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, "$1/");
  out = out.replace(/from (['"])\.\//g, "from $1/");
  out = out.replace(/import (['"])\.\//g, "import $1/");
  fs.writeFileSync(path.join(HERE, PAGE), out);
}
build();
const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
let failed = 0;
try {
  for (const name of names) {
    const page = await browser.newPage({ width: 1280, height: 720 });
    try {
      await page.goto(`${server.origin}/tools/tests/${PAGE}?debug=1&raf=timer`, { timeout: 120000 });
      const ready = await page.waitFor("!!window.TT", { timeout: 120000 });
      if (!ready) throw new Error("TT never appeared: " + (page.errors[0] || "no error"));
      try { await page.send("Page.bringToFront", {}); } catch {}
      await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === "function") DWOpening.dismissForTesting(); })()`);
      await page.waitFor("!window.DWOpening || window.DWOpening.active === false", { timeout: 30000 });
      await page.evaluate(fs.readFileSync(path.join(HERE, "lib.js"), "utf8"));
      const out = await page.evaluate(fs.readFileSync(path.join(HERE, name + ".js"), "utf8"), 200000);
      const lines = String(out).split("\n").filter(Boolean);
      const pass = lines.filter((l) => l.startsWith("PASS ")).length;
      const fail = lines.filter((l) => l.startsWith("FAIL ")).length;
      console.log(`${name}: ${pass} pass, ${fail} fail`);
      for (const l of lines.filter((l) => l.startsWith("FAIL "))) console.log("  " + l);
      if (fail) failed++;
    } finally { await page.close().catch(() => {}); }
  }
} catch (e) { console.error(e); failed++; }
finally {
  await browser.close(); await server.close();
  try { fs.unlinkSync(path.join(HERE, PAGE)); } catch {}
}
process.exit(failed ? 1 : 0);
