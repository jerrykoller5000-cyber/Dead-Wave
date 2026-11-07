const fs = require("fs");
const m4Mark = "      } else if (currentWeapon === 'm4' || currentWeapon === 'ak' || currentWeapon === 'aa12') {";
const launchMark = "      } else if (currentWeapon === 'launcher') {";
function spanOf(t) {
  const a = t.indexOf(m4Mark), b = t.indexOf(launchMark);
  return (a>=0 && b>a) ? t.slice(a,b) : null;
}
function launchBranch(t) {
  const a = t.indexOf(launchMark);
  if (a < 0) return null;
  const endMarks = [
    "\n      else if (currentWeapon === 'flamer')",
    "\n      } else if (currentWeapon === 'flamer')",
    "\r\n      else if (currentWeapon === 'flamer')",
    "\r\n      } else if (currentWeapon === 'flamer')",
  ];
  let end = -1;
  for (const m of endMarks) {
    const i = t.indexOf(m, a);
    if (i > a && (end < 0 || i < end)) end = i;
  }
  if (end < 0) end = a + 5000;
  let sliceEnd = end;
  const before = t.slice(a, end);
  const lastClose = Math.max(before.lastIndexOf("\n      }"), before.lastIndexOf("\r\n      }"));
  if (lastClose > 0) sliceEnd = a + lastClose + (before.includes("\r\n      }") ? "\r\n      }".length : "\n      }".length);
  return t.slice(a, sliceEnd);
}
function eol(buf) {
  let crlf=0, lf=0;
  for (let i=0;i<buf.length;i++) {
    if (buf[i]===0x0A) {
      if (i>0 && buf[i-1]===0x0D) crlf++; else lf++;
    }
  }
  return { bom: buf[0]===0xEF && buf[1]===0xBB, crlf, lf, size: buf.length };
}
const files = {
  current: "index.html",
  cl306: "Claude outputs/cl303/index.before-cl306.html",
  cl305: "Claude outputs/cl303/index.before-cl305.html",
};
const keys = [
  "pistol","shotgun","revolver","sniper","poseRevolverCylinder","pairCylLocal",
  "const boltHand","GB-301","GB-300","reloadShell","ammoBox","fuelCan","speedloader",
  "fuelCap","drumLatch","drumHinge","drumRounds","rotation.z = -Math.PI","canFire",
  "drumOpen","GP-20037","GP-20039","latch"
];
for (const [name,f] of Object.entries(files)) {
  const buf = fs.readFileSync(f);
  const t = buf.toString("utf8");
  const e = eol(buf);
  const span = spanOf(t);
  const launch = launchBranch(t);
  console.log("====", name, JSON.stringify(e));
  console.log("spanLen", span&&span.length, "launchLen", launch&&launch.length);
  const hit = (s) => {
    const o={}; for (const k of keys) o[k]=(s||"").split(k).length-1; return o;
  };
  console.log("span", JSON.stringify(hit(span)));
  console.log("launch", JSON.stringify(hit(launch)));
}
const cur = fs.readFileSync("index.html","utf8");
const old = fs.readFileSync("Claude outputs/cl303/index.before-cl306.html","utf8");
const sCur = spanOf(cur), sOld = spanOf(old);
const n = (s) => s.replace(/\r\n/g,"\n");
const A = n(sCur).split("\n"), B = n(sOld).split("\n");
const setB = new Map(); B.forEach((l)=>setB.set(l,(setB.get(l)||0)+1));
const setA = new Map(); A.forEach((l)=>setA.set(l,(setA.get(l)||0)+1));
const onlyCur=[], onlyOld=[];
for (const [l,c] of setA) { const d=c-(setB.get(l)||0); for(let i=0;i<d;i++) onlyCur.push(l); }
for (const [l,c] of setB) { const d=c-(setA.get(l)||0); for(let i=0;i<d;i++) onlyOld.push(l); }
console.log("==== SPAN LINE DIFF cur vs cl306 ====");
console.log("onlyInCurrent", onlyCur.length, "onlyInCl306", onlyOld.length);
console.log("-- only current --");
onlyCur.forEach(l=>console.log("+"+l));
console.log("-- only cl306 --");
onlyOld.forEach(l=>console.log("-"+l));
// Also dump launcher branch lengths and a few critical lines from each
for (const [name,f] of Object.entries(files)) {
  const t = fs.readFileSync(f,"utf8");
  const L = launchBranch(t);
  console.log("==== LAUNCH SNIP", name, "====");
  const lines = n(L).split("\n");
  for (const line of lines) {
    if (/drum|latch|hinge|shell|round|openAmt|rotation\.z|canFire|GP-/.test(line)) console.log(line);
  }
}
