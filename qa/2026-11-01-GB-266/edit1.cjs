// GB-266 edit: exact-line insertions anchored by content, CRLF kept, no BOM, aborts if anything is off.
const fs = require('fs'), crypto = require('crypto');
const P = 'index.html';
const raw = fs.readFileSync(P, 'utf8');
const st0 = fs.statSync(P).mtimeMs;
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(EOL);
const hash0 = crypto.createHash('sha1').update(raw).digest('hex');
function find(pred, label) {
  const hits = []; L.forEach((l, i) => { if (pred(l)) hits.push(i); });
  if (hits.length !== 1) { console.error('anchor', label, 'hits', hits.length, hits.slice(0, 5).map((h) => h + 1)); process.exit(2); }
  return hits[0];
}
if (raw.includes('GB-266')) { console.error('already has GB-266'); process.exit(3); }
const ops = [];   // [index, 'after'|'before'|'replace', lines]
// 1. import
ops.push([find((l) => l === "    import { blendZombieJoins, refreshZombieJoinLoss } from './combat/zombie-joins.js';", 'import'), 'after',
  ["    import { ringGapSpots, shortcutSpot, ironPush, ironBlockCircles, nearestSpot, createIronGaps } from './combat/iron-gaps.js';   // GB-266"]]);
// 2. prompt text (after utilHose's prompt line, CU-201's)
ops.push([find((l) => l.startsWith("        else if (a === 'utilHose') text = utilitySay('utility.hosePrompt'"), 'prompt'), 'after',
  ["        else if (a === 'iron') text = ironPromptText();   // GB-266"]]);
// 3. actionTarget (before the kiosk line, after runePistol)
ops.push([find((l) => l === "      if (!placeMode && !buildMode && runePistolInReach()) return 'runePistol';   // GB-119", 'actionTarget'), 'after',
  ["      if (!placeMode && !buildMode && ironTarget(px, pz)) return 'iron';   // GB-266"]]);
// 4. doAction (after utilHose's)
ops.push([find((l) => l === "      else if (a === 'utilHose') utilityHose();", 'doAction'), 'after',
  ["      else if (a === 'iron') ironUseE();   // GB-266"]]);
// 5. the iron section, before storyClosedSite's comment
const SECTION = fs.readFileSync('qa/2026-11-01-GB-266/section.js', 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
ops.push([find((l) => l === "    // Is this site's lead closed (so the site is hidden and locked while the gate is on)?", 'section'), 'before', SECTION]);
// 6. valley sig: block positions
ops.push([find((l) => l === "      let s = wallBands.length * 131 + valleyBlocks.length * 17;", 'sig'), 'after',
  ["      for (const b of valleyBlocks) s = (Math.imul(s, 31) + ((b.x * 4) | 0) + ((b.z * 4) | 0) * 8191) | 0;   // GB-266: a block moved"]]);
// 7. valleyBlock with a tag, and valleyUnblock
ops.push([find((l) => l === "    function valleyBlock(x, z, r) { valleyBlocks.push({ x, z, r }); }", 'valleyBlock'), 'replace',
  ["    function valleyBlock(x, z, r, tag) { valleyBlocks.push({ x, z, r, tag }); }   // GB-266: a tag to take it out again",
   "    function valleyUnblock(tag) { for (let i = valleyBlocks.length - 1; i >= 0; i--) if (valleyBlocks[i].tag === tag) valleyBlocks.splice(i, 1); }   // GB-266"]]);
// 8. player field: tagged blocks (hung iron) after the worldSolids loop
{
  const i = find((l) => l === "        // Same height test resolveStaticProps uses: a bridge rail overhead or a post", 'ffws');
  // the loop closes 6 lines later at "      }"
  let j = i; while (L[j] !== '      }') j++;
  if (j - i > 8) { console.error('ff loop end not found'); process.exit(2); }
  ops.push([j, 'after', ["      for (const s of valleyBlocks) if (s.tag && inGrid(s.x, s.z, s.r + 1)) ffMarkCircle(F, s.x, s.z, s.r);   // GB-266: hung iron closes it here too"]]);
}
// 9. updateZombies: the dead pushed off hung iron, after resolveStaticProps
{
  const i = find((l) => l === "        slid = resolveStaticProps(mx, mz, z.radius, z.mesh.position.y);", 'zres');
  if (L[i + 1] !== '        mx = slid.x; mz = slid.z;') { console.error('zres next line'); process.exit(2); }
  ops.push([i + 1, 'after', ["        if (ironHungN) { const ip = ironPushDead(mx, mz, z.radius, zx, zz); mx = ip.x; mz = ip.z; }   // GB-266: hung iron, the dead only"]]);
}
// 10. TT hook
ops.push([find((l) => l.startsWith("        window.TT.utilityDbg = { on: (v) =>"), 'tt'), 'after',
  ["        window.TT.ironDbg = ironDbg();   // GB-266"]]);
ops.sort((a, b) => b[0] - a[0]);
for (const [i, how, lines] of ops) {
  if (how === 'after') L.splice(i + 1, 0, ...lines);
  else if (how === 'before') L.splice(i, 0, ...lines);
  else L.splice(i, 1, ...lines);
}
const out = L.join(EOL);
// re-check the file did not change underneath
const now = fs.readFileSync(P, 'utf8');
if (crypto.createHash('sha1').update(now).digest('hex') !== hash0 || fs.statSync(P).mtimeMs !== st0) { console.error('index.html changed underneath; abort'); process.exit(4); }
fs.writeFileSync(P, out, 'utf8');
const crlf = (out.match(/\r\n/g) || []).length, lf = (out.match(/\n/g) || []).length;
console.log('ok ops', ops.length, 'lines', L.length, 'crlf', crlf, 'lf', lf, 'bom', out.charCodeAt(0) === 0xFEFF);