const fs = require("fs");
const files=["index.html","game/viewmodel.js","studio/weapon-sidearms.js","studio/weapon-heavy.js","studio/weapon-longarms.js"];
const keys=["reloadShell","ammoBox","fuelCan","speedloader","fuelCap","reloadParts","baseFuelCan","baseFuelCap","baseEmpties","baseSpeedloader","baseReloadShellRot","drumLatch","drumHinge","drumRounds","drumWinder"];
for (const f of files) {
  if (!fs.existsSync(f)) { console.log(f,"MISSING"); continue; }
  const t=fs.readFileSync(f,"utf8");
  const o={}; for (const k of keys) o[k]=(t.split(k).length-1);
  console.log(f, JSON.stringify(o));
}
// Exact launcher branch equality current vs cl306
const m4Mark = "      } else if (currentWeapon === 'm4' || currentWeapon === 'ak' || currentWeapon === 'aa12') {";
const launchMark = "      } else if (currentWeapon === 'launcher') {";
function launchBranch(t) {
  const a = t.indexOf(launchMark);
  const end = t.indexOf("\n      else if (currentWeapon === 'flamer')", a);
  const before = t.slice(a, end);
  const lastClose = before.lastIndexOf("\n      }");
  return t.slice(a, a + lastClose + "\n      }".length);
}
function spanOf(t) {
  const a = t.indexOf(m4Mark), b = t.indexOf(launchMark);
  return t.slice(a,b);
}
const cur = fs.readFileSync("index.html","utf8").replace(/\r\n/g,"\n");
const cl306 = fs.readFileSync("Claude outputs/cl303/index.before-cl306.html","utf8").replace(/\r\n/g,"\n");
const Lcur = launchBranch(cur), L306 = launchBranch(cl306);
console.log("launcher identical cur==cl306?", Lcur === L306, "lens", Lcur.length, L306.length);
if (Lcur !== L306) {
  // show first differing line
  const a=Lcur.split("\n"), b=L306.split("\n");
  for (let i=0;i<Math.max(a.length,b.length);i++) {
    if (a[i]!==b[i]) { console.log("diff at", i, "\nCUR:", a[i], "\n306:", b[i]); break; }
  }
}
// GB-302 index hooks: search context around reloadParts / cancel restore
for (const needle of ["reloadParts","baseFuelCanPos","baseFuelCapPos","baseSpeedloaderPos","baseEmpties","baseReloadShellRot","gun.ammoBox","gun.fuelCan","gun.speedloader","gun.fuelCap","gun.empties"]) {
  const i = cur.indexOf(needle);
  console.log("index", needle, i>=0 ? ("at "+i) : "MISSING");
}
// Open-drum cannot fire
const fireNeedles = ["drumHinge","openAmt","reloading && currentWeapon === 'launcher'","launcher.*open","drum.*open","!reloading","cylinder open"];
for (const n of ["userData.drumHinge","drumHinge.rotation","reloading &&","currentWeapon === 'launcher' &&","Math.abs(gun.userData.drumHinge","open drum","cylinder open","drum open"]) {
  let idx=0, c=0; const hits=[];
  while ((idx = cur.indexOf(n, idx)) >= 0 && c < 5) { hits.push(idx); idx += n.length; c++; }
  console.log("firecheck", JSON.stringify(n), "count", hits.length);
}
// Find can-fire gate near launcher
const gateRe = /function\s+\w*[Cc]an[Ff]ire\w*|function\s+tryFire|function\s+fireWeapon|if\s*\([^)]*drumHinge[^)]*\)|if\s*\([^)]*reloading[^)]*launcher[^)]*\)/g;
let m; const gates=[];
while ((m = gateRe.exec(cur))) gates.push({at:m.index, s:cur.slice(m.index, m.index+120).replace(/\n/g," ")});
console.log("gates", JSON.stringify(gates.slice(0,15),null,0));
