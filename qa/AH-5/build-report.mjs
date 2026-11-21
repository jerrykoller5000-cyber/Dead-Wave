import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gpu = JSON.parse(fs.readFileSync(path.join(root, 'qa/AH-5/bench-webgpu.json'), 'utf8'));
const gl = JSON.parse(fs.readFileSync(path.join(root, 'qa/AH-5/bench-webgl.json'), 'utf8'));

function stats(rows) {
  const fpsList = rows.map((r) => r.fps).sort((a, b) => a - b);
  const msList = rows.map((r) => r.frameMs).sort((a, b) => a - b);
  const drawsList = rows.map((r) => r.draws).sort((a, b) => a - b);
  const trisList = rows.map((r) => r.triangles).sort((a, b) => a - b);
  const worstMsMax = Math.max(...rows.map((r) => r.worstMs));
  const sub60 = rows.filter((r) => r.fps < 60).length;
  const med = (arr) => arr[Math.floor(arr.length / 2)];
  return {
    count: rows.length,
    fpsMin: fpsList[0],
    fpsMed: med(fpsList),
    fpsMax: fpsList[fpsList.length - 1],
    sub60,
    msMin: msList[0].toFixed(2),
    msMed: med(msList).toFixed(2),
    msMax: msList[msList.length - 1].toFixed(2),
    worstMsMax: worstMsMax.toFixed(1),
    drawsMin: drawsList[0],
    drawsMed: med(drawsList),
    drawsMax: drawsList[drawsList.length - 1],
    trisMinK: Math.round(trisList[0] / 1000),
    trisMedK: Math.round(med(trisList) / 1000),
    trisMaxK: Math.round(trisList[trisList.length - 1] / 1000),
  };
}

const condIds = ['lights-on', 'lights-off', 'zombies-10'];
const condShort = {
  'lights-on': 'Lights ON (0 zombs)',
  'lights-off': 'Lights OFF (0 zombs)',
  'zombies-10': '10 Zombies (Lights ON)',
};

const spotOrder = [];
for (const r of gpu.rows) {
  if (!spotOrder.find((s) => s.id === r.spotId)) {
    spotOrder.push({ id: r.spotId, label: r.spotLabel, lx: r.lx, lz: r.lz });
  }
}

const gpuWorstNotes = [
  'One-time `361.5 ms` lazy shader compile hitch on first `lights-off` look toward dark Range/doorway materials (`249 draws, 180k tris`); locked `60 fps / 17ms worst` on revisit screenshot.',
  'Standing at HQ Panel facing N across Build Room with 10 shamblers (`265 draws, 566k tris`); steady `60 fps` (`16.74 ms` avg, `32.6 ms` worst spike; revisit `60 fps, 639k tris`).',
  'Highest draw count in Training (`442 draws, 986k tris`): facing E at solid Build Room dividing wall still submits entire Firing Range + stations behind the wall alongside Build Room zombies (`60 fps`).',
  'Highest triangle count in Training (`1,003k tris, 435 draws`): downrange at Backstop facing S toward Firing Line also includes Build Room + 10 zombies through the west wall (`60 fps` initial; `55 fps / low 31 / worst 32ms` on revisit screenshot).',
  'Highest zero-zombie draw count (`422 draws, 263k tris`): Build Room Centre facing E toward Firing Range dividing wall with Lights ON (`60 fps` initial; `59 fps` on revisit screenshot).',
];

const glWorstNotes = [
  'One-time `934.2 ms` WebGL shader compile stall (`5 fps / 200.22 ms` avg) on first look W in Infirmary with Lights OFF (`131 draws, 153k tris`); locked `60 fps / 17ms worst` on revisit screenshot.',
  'Standing `1.6m` west of the **closed black security doorway shutter** (`lx=-9.6, lz=-8.0`) facing E: screen shows only the closed dark shutter, yet `347 draws / 594k tris` (`42 fps / 24.08 ms`) render the entire Firing Range behind it (`51 fps / 339 draws` on revisit).',
  'Doorway (`lx=-9.6, lz=-8.0`) facing S along Build Room wall with 10 shamblers active (`44 fps / 22.80 ms`, `270 draws, 577k tris`; revisit `54 fps, 265 draws, 396k tris`).',
  'Armory (`lx=4.8, lz=-3.0`) facing W across Firing Range toward Build Room + 10 shamblers behind the dividing wall (`44 fps / 22.55 ms`, `397 draws, 967k tris`; revisit `42 fps, 387 draws, 678k tris`).',
  'Armory facing N with Lights OFF (`45 fps / 22.00 ms`, `223.9 ms` shader hitch, `209 draws, 141k tris`; revisit `50 fps, 222 draws`).',
];

let md = `# AH-5 — Training Area Speed Baseline for D-218 Pass 3 (WebGPU & WebGL)

- **Date:** 2026-11-21 (\`04:10Z–04:26Z\`)
- **Agent:** Antigravity 2 (\`antigravity2\`, \`Gemini 4 Carbon (High)\`)
- **Hardware & Display:** Native NVIDIA GeForce RTX 5080 · 24 CPU threads · 32 GB RAM · \`1920x1080 @1.00x\` · Graphics preset \`high\` · \`FPS & HARDWARE: ON\` (\`#perf.on\`)
- **Slot Runs:** Two \`--exclusive\` game-test slot runs (\`bench-training.mjs webgpu\` & \`bench-training.mjs webgl\`), \`0\` page/console errors on both backends
- **Raw Data:** \`qa/AH-5/bench-webgpu.json\` (\`120\` views + 3P spawn ref) · \`qa/AH-5/bench-webgl.json\` (\`120\` views + 3P spawn ref) · Harness \`qa/AH-5/bench-training.mjs\`

---

## 1. Executive Summary & Pass-3 Optimization Takeaways

### Headline Comparison (\`10 spots × 4 directions = 40 views\` per condition, \`60°\` 1P camera)

| Backend | Condition | FPS (min / med / max) | Views < 60 FPS | Frame ms (min / med / max) | Max Single Frame | Draws (min / med / max) | Triangles (min / med / max) |
| --- | --- | --- | --- | --- | --- | --- | --- |
`;

for (const [bName, data] of [['WebGPU (default)', gpu], ['WebGL2 (`?renderer=webgl`)', gl]]) {
  for (const cid of condIds) {
    const s = stats(data.rows.filter((r) => r.condition === cid));
    md += `| ${bName} | ${condShort[cid]} | **${s.fpsMin}** / ${s.fpsMed} / ${s.fpsMax} | ${s.sub60} / ${s.count} | ${s.msMin} / ${s.msMed} / **${s.msMax}** | ${s.worstMsMax} ms | ${s.drawsMin} / ${s.drawsMed} / **${s.drawsMax}** | ${s.trisMinK}k / ${s.trisMedK}k / **${s.trisMaxK}k** |\n`;
  }
}

const g3 = gpu.spawn3PReference;
const l3 = gl.spawn3PReference;
md += `
- **3rd-Person Spawn Reference (Lights ON, 0 zombies, default OTS camera at \`lx=0, lz=-3\`):**
  - **WebGPU:** \`${g3.fps} fps\` (\`${g3.frameMs} ms\`, low \`${Math.round(g3.lowFps)}\`, worst \`${g3.worstMs} ms\`), **\`${g3.draws} draws\`**, **\`${g3.trisK}k tris\`** (\`${g3.triangles.toLocaleString()}\`).
  - **WebGL2 fallback:** \`${l3.fps} fps\` (\`${l3.frameMs} ms\`, low \`${Math.round(l3.lowFps)}\`, worst \`${l3.worstMs} ms\`), **\`${l3.draws} draws\`**, **\`${l3.trisK}k tris\`** (\`${l3.triangles.toLocaleString()}\`).

### Top 3 Findings for Pass 3 (\`claude2\`)

1. **Zero Cross-Room Occlusion Between Firing Range & Build Room (\`up to 442 draws / 1,003k tris\`):**
   - \`sceneCull()\` is skipped while \`training.active\` (\`index.html:2535\`), and the solid dividing wall (\`x = -8\`) + closed security doorway shutter do not occlude the other room.
   - Facing East at \`05-build-centre\` toward the solid dividing wall submits the entire Firing Range behind it (**\`422 draws\`** with 0 zombies; **\`442 draws / 986k tris\`** with 10 zombies).
   - Facing South at \`04-backstop\` or West at \`08-armory\` submits the Build Room + all 10 shamblers through the wall (**\`435 draws / 1,003k tris\`** at Backstop S, dipping to \`55 fps\` on WebGPU revisit and \`44 fps\` on WebGL at Armory W).
   - Even standing \`1.6m\` directly in front of the **closed** doorway shutter (\`10-doorway E\`, \`lx=-9.6, lz=-8.0\`) renders \`347 draws / 594k tris\` (\`42 fps\` WebGL) behind the opaque black door.
   - **Pass-3 win:** Zone-gating Firing Range props/stations vs Build Room props/zombies across \`x = -8\` (especially when the doorway shutter is closed or outside the doorway portal cone) will cut worst-case draws and triangles roughly in half.
2. **\`Lights OFF\` First-Look Lazy Shader Compile Hitch (\`361.5 ms\` WebGPU · \`934.2 ms\` WebGL):**
   - WebGPU held a locked \`60 fps\` on \`119 / 120\` views; the **single** sub-60 reading (\`08-armory W\` Lights OFF: \`40 fps / 25.06 ms avg / 361.5 ms worst\`) was a one-time shader compile hitch when dark/unlit indoor material variants first entered the frustum. Once compiled, the exact same view ran at \`60 fps / 17 ms worst\`.
   - WebGL hit the same lazy compile stall even harder (\`934.2 ms\` / \`5 fps\` at \`07-infirmary W\` Lights OFF, plus \`223.9 ms\` at \`08-armory N\` Lights OFF), then locked \`60 fps\` on revisit.
   - **Pass-3 win:** Warm 1 \`lights-off\` frame during Training entry warm-up so toggling room lights never stalls mid-play.
3. **Ceiling Light Fixture Draw Overhead (\`~115–140 draws\` delta between Lights ON and Lights OFF):**
   - Turning Lights OFF drops draw calls across every spot by \`115–140\` (e.g., \`05-build-centre E\`: \`422 → 298\` draws, \`-124\`; \`01-spawn W\`: \`341 → 212\`, \`-129\`; \`07-infirmary W\`: \`208 → 93\`, \`-115\`).
   - Batching or instancing static ceiling tube/high-bay fixture meshes in Training will directly lift WebGL out of its \`42–50 fps\` draw-bound ceiling and trim WebGPU CPU submission cost.

---

## 2. Five Worst Views — WebGPU (Default)

| Rank | Condition | Spot & Dir | Initial FPS | Avg Frame ms | Worst Frame | Draws | Triangles | Revisit Overlay (\`#perf\`) | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;

gpu.worst5.forEach((w, idx) => {
  const so = w.screenshotOverlay || {};
  md += `| #${idx + 1} | ${condShort[w.condition]} | \`${w.spotId}\` **${w.dir}** (\`${w.lx}, ${w.lz}\`) | **${w.fps}** (\`low ${Math.round(w.lowFps)}\`) | **${w.frameMs.toFixed(2)} ms** | ${w.worstMs.toFixed(1)} ms | **${w.draws}** | **${w.trisK}k** (\`${w.triangles.toLocaleString()}\`) | \`fps ${so.fps} · low ${so.low} · worst ${so.worst} · draws ${so.draws} · tris ${so.tris}\` | \`${w.screenshot}\` |\n`;
});

md += `\n`;
gpu.worst5.forEach((w, idx) => {
  md += `- **WebGPU Worst #${idx + 1} (\`${w.screenshot}\`):** ${gpuWorstNotes[idx]}\n`;
});

md += `
---

## 3. Five Worst Views — WebGL2 Fallback (\`?renderer=webgl\`)

| Rank | Condition | Spot & Dir | Initial FPS | Avg Frame ms | Worst Frame | Draws | Triangles | Revisit Overlay (\`#perf\`) | Screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
`;

gl.worst5.forEach((w, idx) => {
  const so = w.screenshotOverlay || {};
  md += `| #${idx + 1} | ${condShort[w.condition]} | \`${w.spotId}\` **${w.dir}** (\`${w.lx}, ${w.lz}\`) | **${w.fps}** (\`low ${Math.round(w.lowFps)}\`) | **${w.frameMs.toFixed(2)} ms** | ${w.worstMs.toFixed(1)} ms | **${w.draws}** | **${w.trisK}k** (\`${w.triangles.toLocaleString()}\`) | \`fps ${so.fps} · low ${so.low} · worst ${so.worst} · draws ${so.draws} · tris ${so.tris}\` | \`${w.screenshot}\` |\n`;
});

md += `\n`;
gl.worst5.forEach((w, idx) => {
  md += `- **WebGL Worst #${idx + 1} (\`${w.screenshot}\`):** ${glWorstNotes[idx]}\n`;
});

md += `
---

## 4. Spot-by-Spot Summary Across All 10 Spots (4-Way Range per Spot)

Format per cell: \`FPS [N,E,S,W] · maxDraws · maxTris\`. Note: downrange spots \`03-mid-range\` and \`04-backstop\` place the 60°-FOV camera at \`lz=14.0\` and \`lz=27.5\` via \`TT.setShotView\` while keeping the player body behind the firing bench; during \`10 Zombies\`, \`10-doorway\` stands at \`lx=-9.6, lz=-8.0\` (Build Room side of the auto-closed security doorway shutter).

| Spot (\`lx, lz\`) | WebGPU · Lights ON | WebGPU · Lights OFF | WebGPU · 10 Zombies | WebGL · Lights ON | WebGL · Lights OFF | WebGL · 10 Zombies |
| --- | --- | --- | --- | --- | --- | --- |
`;

for (const sp of spotOrder) {
  const cell = (data, cid) => {
    const rs = data.rows.filter((r) => r.condition === cid && r.spotId === sp.id);
    const fpsArr = rs.map((r) => r.fps).join('/');
    const maxD = Math.max(...rs.map((r) => r.draws));
    const maxT = Math.max(...rs.map((r) => r.trisK));
    return `\`${fpsArr}\` · ${maxD}d · ${maxT}k`;
  };
  md += `| **${sp.label}** (\`${sp.lx}, ${sp.lz}\`) | ${cell(gpu, 'lights-on')} | ${cell(gpu, 'lights-off')} | ${cell(gpu, 'zombies-10')} | ${cell(gl, 'lights-on')} | ${cell(gl, 'lights-off')} | ${cell(gl, 'zombies-10')} |\n`;
}

function renderFullTable(title, data) {
  let out = `\n---\n\n## ${title}\n\n`;
  for (const cid of condIds) {
    out += `### ${data.backend.toUpperCase()} — ${condShort[cid]}\n\n`;
    out += `| Spot | Local \`(lx, lz)\` | Dir | FPS | Frame ms | Low FPS | Worst ms | Draws | Triangles | Zombies |\n`;
    out += `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
    const rs = data.rows.filter((r) => r.condition === cid);
    for (const r of rs) {
      out += `| \`${r.spotId}\` (${r.spotLabel}) | \`(${r.lx}, ${r.lz})\` | **${r.dir}** (\`${r.yawDeg}°\`) | ${r.fps} | ${r.frameMs.toFixed(2)} | ${Math.round(r.lowFps)} | ${r.worstMs.toFixed(1)} | ${r.draws} | ${r.triangles.toLocaleString()} (\`${r.trisK}k\`) | ${r.zombies} |\n`;
    }
    out += `\n`;
  }
  return out;
}

md += renderFullTable('5. Complete 120-View Baseline Table — WebGPU (Default)', gpu);
md += renderFullTable('6. Complete 120-View Baseline Table — WebGL2 Fallback (`?renderer=webgl`)', gl);

const outPath = path.join(root, 'qa/2026-11-21-AH-5.md');
fs.writeFileSync(outPath, md, 'utf8');
console.log('Wrote', outPath, 'bytes:', fs.statSync(outPath).size);
