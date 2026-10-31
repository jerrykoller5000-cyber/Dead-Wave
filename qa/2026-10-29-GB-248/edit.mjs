// GB-248: exact-line edits to index.html (LF kept, no BOM). Each original line is asserted before it is replaced.
import fs from 'node:fs';
const F = 'index.html';
const src = fs.readFileSync(F, 'utf8');
if (src.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const L = src.split('\n');
const at = (n, starts) => { const s = L[n - 1].trim(); if (!s.startsWith(starts)) throw new Error(`line ${n} mismatch: ${s.slice(0, 120)}`); };
const edits = [];   // [line, count, newLines] applied bottom-up
const I8 = '        ', I10 = '          ', I12 = '            ', I14 = '              ';

// E) the walk's torso/head pass leaves the colossus's slam follow-through alone
at(57238, "if (false) {} else if (ud.torso && rest && z.attackWindup <= 0 && !(z.swingT > 0) && !(z.slamWind > 0)) {");
edits.push([57238, 1, [L[57237].replace("!(z.slamWind > 0)) {", "!(z.slamWind > 0) && !(z.slamFollowT > 0 && z.typeKey === 'colossus')) {")]]);

// D) the feral's lunge pose and the colossus's staged slam
at(57170, '// Slam tell: both arms high overhead while the colossus winds up.');
at(57171, 'if (z.slamWind > 0) {');
at(57172, 'if (ud.armLG && !parts.armL) ud.armLG.rotation.x = -2.5;');
at(57173, 'if (ud.armRG && !parts.armR) ud.armRG.rotation.x = -2.5;');
at(57174, 'if (ud.torso) ud.torso.rotation.x = -0.2;');
at(57175, '}');
edits.push([57170, 6, [
I8 + "// GB-248 (D-89, GP-19970): the feral's horde lunge has a tell. The coil (hzCoilT, 0.18 s): it drops into its knees,",
I8 + "// the torso folds forward, both arms draw back and the head stays up on him. The spring (hzLungeT): it snaps out long",
I8 + "// along the line of the lunge, both arms thrown forward at him, nearly straight. The recovery (hzLungeRec, 0.24 s)",
I8 + "// eases it back into its run. Weighted over the run's own pose, so it starts and ends where the run is.",
I8 + "if (z.typeKey === 'feral' && !z.farLod && !z.crawling && !z.hopping && !rising && z.attackWindup <= 0 && !(z.swingT > 0) && (z.hzCoilT > 0 || z.hzLungeT > 0 || z.hzLungeRec > 0)) {",
I10 + "const sm = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };",
I10 + "let w, m;   // w: weight over the run; m: 0 = the coil's pose, 1 = the spring's",
I10 + "if (z.hzCoilT > 0) { w = sm(1 - z.hzCoilT / 0.18); m = 0; }",
I10 + "else if (z.hzLungeT > 0) { w = 1; m = 1 - Math.pow(1 - Math.min(1, (1 - z.hzLungeT / HORDE.LUNGE_S) / 0.3), 2); }   // out fast (ease-out), then held",
I10 + "else { w = 1 - sm(1 - z.hzLungeRec / 0.24); m = 1; }",
I10 + "const armOff = 0.55 + (-1.5 - 0.55) * m, elb = -0.95 + 0.8 * m, lean = 0.45 + 0.17 * m, sink = 0.12 - 0.07 * m, knee = 0.55 - 0.35 * m, look = -0.4 - 0.12 * m;",
I10 + "if (ud.armLG && !parts.armL) { ud.armLG.rotation.x += (armBaseL + armOff - ud.armLG.rotation.x) * w; ud.armLG.rotation.z += ((rest.armLRZ || 0) + 0.18 * (1 - m) - ud.armLG.rotation.z) * w; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x += (elb - ud.armLG.userData.elbowG.rotation.x) * w; }",
I10 + "if (ud.armRG && !parts.armR) { ud.armRG.rotation.x += (armBaseR + armOff - ud.armRG.rotation.x) * w; ud.armRG.rotation.z += ((rest.armRRZ || 0) - 0.18 * (1 - m) - ud.armRG.rotation.z) * w; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x += (elb - ud.armRG.userData.elbowG.rotation.x) * w; }",
I10 + "gaitLean += (lean - gaitLean) * w; gaitSway *= 1 - 0.7 * w; gaitTwist *= 1 - 0.7 * w; headBob += (look - headBob) * w;",
I10 + "if (ud.hips) ud.hips.position.y -= sink * w;",
I10 + "if (ud.legLG && !parts.legL && ud.legLG.userData.shinG) ud.legLG.userData.shinG.rotation.x += knee * w;",
I10 + "if (ud.legRG && !parts.legR && ud.legRG.userData.shinG) ud.legRG.userData.shinG.rotation.x += knee * w;",
I8 + "}",
I8 + "// GB-248 (D-89, GP-19970): the colossus's slam, staged instead of snapped. The wind-up (slamWind, 0.75 s): it sinks",
I8 + "// into its legs and heaves both arms up and back from wherever the walk had them (slow in, to 0.6), shoulders out and",
I8 + "// the torso arched, holds them high, and from 0.82 brings them down before the hit. The follow-through (slamFollowT,",
I8 + "// 0.5 s): the fists drive on into the ground, the torso folds over them and the knees take it, a held beat, then it",
I8 + "// settles back into its walk (slow out).",
I8 + "if (z.slamWind > 0 && !rising) {",
I10 + "const sm = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };",
I10 + "const k = 1 - Math.max(0, z.slamWind) / 0.75, rise = sm(k / 0.6), drop = Math.max(0, (k - 0.82) / 0.18), d2 = drop * drop;",
I10 + "const ax = -2.8 + 1.2 * d2, elb = -0.8 * rise * (1 - drop);",
I10 + "if (ud.armLG && !parts.armL) { ud.armLG.rotation.x += (ax - ud.armLG.rotation.x) * rise; ud.armLG.rotation.z = (rest.armLRZ || 0) + 0.28 * rise * (1 - d2); if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x += (elb - ud.armLG.userData.elbowG.rotation.x) * rise; }",
I10 + "if (ud.armRG && !parts.armR) { ud.armRG.rotation.x += (ax - ud.armRG.rotation.x) * rise; ud.armRG.rotation.z = (rest.armRRZ || 0) - 0.28 * rise * (1 - d2); if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x += (elb - ud.armRG.userData.elbowG.rotation.x) * rise; }",
I10 + "if (ud.torso) { ud.torso.rotation.x = (rest.torsoRX || 0) + gaitLean * (1 - rise) - 0.28 * rise + 0.55 * d2; ud.torso.rotation.z = (rest.torsoRZ || 0) + gaitSway * (1 - rise); ud.torso.rotation.y = (rest.torsoRY || 0) + gaitTwist * (1 - rise); }",
I10 + "if (ud.head && !parts.head) ud.head.rotation.x = (rest.headRX || 0) - 0.18 * rise + 0.1 * d2;",
I10 + "if (ud.hips) ud.hips.position.y -= 0.12 * rise;",
I10 + "for (const [lg, lost] of [[ud.legLG, parts.legL], [ud.legRG, parts.legR]]) if (lg && !lost && lg.userData.shinG) lg.userData.shinG.rotation.x += 0.3 * rise;",
I8 + "} else if (z.slamFollowT > 0 && z.typeKey === 'colossus' && !rising) {",
I10 + "const sm = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };",
I10 + "const f = 1 - z.slamFollowT / 0.5, s = 1 - Math.pow(1 - Math.min(1, f / 0.16), 2), w = f < 0.4 ? 1 : 1 - sm((f - 0.4) / 0.6);",
I10 + "const ax = -1.6 + 0.85 * s, tx = 0.27 + 0.28 * s, sink = 0.12 + 0.08 * s;",
I10 + "if (ud.armLG && !parts.armL) { ud.armLG.rotation.x += (ax - ud.armLG.rotation.x) * w; ud.armLG.rotation.z += ((rest.armLRZ || 0) - ud.armLG.rotation.z) * w; if (ud.armLG.userData.elbowG) ud.armLG.userData.elbowG.rotation.x *= 1 - w; }",
I10 + "if (ud.armRG && !parts.armR) { ud.armRG.rotation.x += (ax - ud.armRG.rotation.x) * w; ud.armRG.rotation.z += ((rest.armRRZ || 0) - ud.armRG.rotation.z) * w; if (ud.armRG.userData.elbowG) ud.armRG.userData.elbowG.rotation.x *= 1 - w; }",
I10 + "if (ud.torso) { ud.torso.rotation.x = (rest.torsoRX || 0) + gaitLean * (1 - w) + tx * w; ud.torso.rotation.z = (rest.torsoRZ || 0) + gaitSway * (1 - w); ud.torso.rotation.y = (rest.torsoRY || 0) + gaitTwist * (1 - w); }",
I10 + "if (ud.head && !parts.head) ud.head.rotation.x = (rest.headRX || 0) + headBob * (1 - w) - 0.2 * w;   // the head comes up to find him",
I10 + "if (ud.hips) ud.hips.position.y -= sink * w;",
I10 + "for (const [lg, lost] of [[ud.legLG, parts.legL], [ud.legRG, parts.legR]]) if (lg && !lost && lg.userData.shinG) lg.userData.shinG.rotation.x += (0.3 + 0.2 * s) * w;",
I8 + "}",
]]);

// C) the slam's AI: no arm snap from here (the pose above owns the arms), and the follow-through's clock
at(56470, '// Colossus: wind up and flatten everything in a circle.');
at(56471, "if (tactics === 'boss' && !z.abilityBusy && !graceFreeze) {");
at(56475, 'if (z.mesh.userData.armLG) z.mesh.userData.armLG.rotation.x = -2.4;');
at(56476, 'if (z.mesh.userData.armRG) z.mesh.userData.armRG.rotation.x = -2.4;');
at(56477, 'if (z.slamWind <= 0) {');
at(56478, 'AudioSys.bossSlam();');
edits.push([56478, 1, [L[56477], I14 + 'z.slamFollowT = 0.5;   // GB-248: the follow-through (the fists into the ground, then the settle)']]);
edits.push([56475, 2, []]);
edits.push([56471, 0, [I8 + "if (z.slamFollowT > 0) { z.slamFollowT -= dt; if (z.typeKey === 'colossus' && !graceFreeze) spd *= 0.25; }   // GB-248: planted through the follow-through"]]);

// B) the feral's lunge: a coil first, a recovery after (its speed and reach unchanged)
at(56161, 'if (z.hzLungeT > 0) { z.hzLungeT -= dt;');
at(56162, 'else if (hzChase && z.hzLungeCd <= 0 && z.attackWindup <= 0 && hzPd >= HORDE.LUNGE_IN && hzPd <= HORDE.LUNGE_OUT) {');
at(56163, 'z.hzLungeT = HORDE.LUNGE_S;');
edits.push([56163, 1, [I14 + "if (z.typeKey === 'feral') z.hzCoilT = 0.18; else z.hzLungeT = HORDE.LUNGE_S;   // GB-248: the feral coils before it springs"]]);
edits.push([56161, 0, [
I12 + "if (z.hzLungeRec > 0) z.hzLungeRec -= dt;   // GB-248: the feral's recovery pose (no speed change)",
I12 + "if (z.hzCoilT > 0) { z.hzCoilT -= dt; spd *= 0.35; if (z.hzCoilT <= 0) { z.hzCoilT = 0; z.hzLungeT = HORDE.LUNGE_S; } }   // GB-248: the coil, the lunge's tell",
I12 + "else",
]]);
edits.push([56161, 1, [L[56160].replace('z.hzLungeT -= dt; ', "z.hzLungeT -= dt; if (z.hzLungeT <= 0 && z.typeKey === 'feral') z.hzLungeRec = 0.24; ")]]);

// A) the timers start clean, and a stagger cancels a coil
at(55885, 'z.hzStagX = dx || 0; z.hzStagZ = dz || 0; z.hzLungeT = 0;');
edits.push([55885, 1, [L[55884] + ' z.hzCoilT = 0;']]);
at(55827, 'z.hzLungeT = 0; z.hzLungeCd');
edits.push([55827, 1, [L[55826].replace('z.hzLungeT = 0; ', 'z.hzLungeT = 0; z.hzCoilT = 0; z.hzLungeRec = 0; ')]]);

// apply bottom-up; same-line inserts (count 0) go after the replacement of that line is queued in order
edits.sort((a, b) => b[0] - a[0] || b[1] - a[1]);   // same line: the replacement first, then the insert before it
for (const [n, c, nl] of edits) L.splice(n - 1, c, ...nl);
const out = L.join('\n');
if (out.includes('\r\n') && !src.includes('\r\n')) throw new Error('CRLF crept in');
fs.writeFileSync(F, out, 'utf8');
console.log('applied', edits.length, 'edits; lines', src.split('\n').length, '->', L.length);
