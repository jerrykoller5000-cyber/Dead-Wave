// CU-187: one-off patch of tools/cdp.mjs: CHROME_JS_FLAGS (one --js-flags value, spaces kept) and CHROME_STDOUT_FILE
// (the browser's stdout to a file: where V8's --trace-opt writes). Run once; it says 'already' after.
import fs from 'node:fs';
const f = 'tools/cdp.mjs';
let t = fs.readFileSync(f, 'utf8');
if (t.includes('CHROME_JS_FLAGS')) { console.log('already'); process.exit(0); }
const nl = t.includes('\r\n') ? '\r\n' : '\n';
const a = "    ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(/\\s+/).filter(Boolean) : []),";
if (!t.includes(a)) { console.error('anchor1'); process.exit(2); }
t = t.replace(a, a + nl
  + "    // CU-187: CHROME_JS_FLAGS is one --js-flags value, spaces kept (CHROME_ARGS splits on them): V8's own switches, e.g. '--trace-opt --trace-deopt'." + nl
  + "    ...(process.env.CHROME_JS_FLAGS ? ['--js-flags=' + process.env.CHROME_JS_FLAGS] : [])," );
const b = "    proc = spawn(exe, flags, { stdio: ['ignore', 'ignore', 'pipe'] });";
if (!t.includes(b)) { console.error('anchor2'); process.exit(2); }
t = t.replace(b,
  "    // CU-187: CHROME_STDOUT_FILE sends the browser's (and, with --no-sandbox, its renderers') stdout to a file: where V8's --trace-opt writes." + nl
  + "    const outFd = process.env.CHROME_STDOUT_FILE ? fs.openSync(process.env.CHROME_STDOUT_FILE, 'w') : 'ignore';" + nl
  + "    proc = spawn(exe, flags, { stdio: ['ignore', outFd, 'pipe'] });");
fs.writeFileSync(f, t, 'utf8');
console.log('ok');
