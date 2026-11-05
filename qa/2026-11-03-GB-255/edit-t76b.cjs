const fs = require('fs'); const f = 'tools/tests/t76.js'; let t = fs.readFileSync(f, 'utf8');
const rep = (a, b) => { const i = t.indexOf(a); if (i < 0 || t.indexOf(a, i + 1) >= 0) throw new Error('anchor not unique/missing: ' + a.slice(0, 60)); t = t.slice(0, i) + b + t.slice(i + a.length); };
rep("  const wait = (ms) => new Promise((r) => setTimeout(r, ms));\n",
    "  const wait = (ms) => new Promise((r) => setTimeout(r, ms));\n  // GB-255 (rule 13): a wait counted in game time, with a wall-clock cap so a stuck game still ends the check. The camera and the\n  // far-LOD flag move on game time, so a slow page that waited 0.5 s of wall clock had not yet drawn the guards close up.\n  const gwait = async (secs) => { const g0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - g0 < secs && Date.now() - w0 < 30000) await wait(20); };\n");
rep("    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);\n    await wait(500);", "    T.player.position.set(hqx, T.sampleHeight(hqx, hqz), hqz);\n    await gwait(0.5);");
rep("    await wait(300);\n    // (1) Four seconds", "    await gwait(0.3);\n    // (1) Four seconds");
fs.writeFileSync(f, t); console.log('ok');