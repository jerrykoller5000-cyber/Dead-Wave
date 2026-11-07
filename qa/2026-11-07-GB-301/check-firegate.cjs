const fs = require("fs");
const cur = fs.readFileSync("index.html","utf8");
// Extract tryFire and nearby can-fire / open checks for launcher
const tf = cur.indexOf("function tryFire");
console.log("==== tryFire excerpt ====");
console.log(cur.slice(tf, tf+2500).replace(/\r\n/g,"\n"));
console.log("==== open drum / latch fire blocks ====");
for (const n of ["open drum","cylinder open","drumHinge","drumLatch","launcherOpen","hingeOpen","carrier open"]) {
  let idx = 0, c = 0;
  while ((idx = cur.indexOf(n, idx)) >= 0 && c < 8) {
    const lineStart = cur.lastIndexOf("\n", idx);
    const lineEnd = cur.indexOf("\n", idx);
    const ctx = cur.slice(Math.max(0, idx-180), Math.min(cur.length, idx+220)).replace(/\r\n/g,"\n").replace(/\n/g," | ");
    console.log("---", n, "at", idx);
    console.log(ctx);
    idx += n.length; c++;
  }
}
