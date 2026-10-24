// GB-225 scratch: build t188 variants that log the state at each hand read.
import fs from 'node:fs';
const src = fs.readFileSync('tools/tests/t188.js', 'utf8');
const must = (s, a) => { if (!s.includes(a)) throw new Error('missing: ' + a); };
const LOG = "      out.push('LOG ' + w + ' ' + JSON.stringify({ cur: T.getCurrentWeapon(), sim: T.getSimTime(), swap: T.getSwapDbg && T.getSwapDbg(), draw: T.drawDbg && T.drawDbg(), carry: T.carryDbg && T.carryDbg(), fp: T.fpDbg && T.fpDbg(), idle: T.idleDbg && T.idleDbg(), unarmed: T.isUnarmed && T.isUnarmed(), H: { sh: H.sh, level: H.level, fore: Array.isArray(H.fore) ? 'arr' : H.fore }, r: handR.distanceTo(gun.localToWorld(V(...H.grip))), l: Array.isArray(H.fore) ? handL.distanceTo(gun.localToWorld(V(...H.fore))) : null, aim: T.aimTarget, pos: T.player.position }, (k, v) => (v && v.isVector3 ? v.toArray().map((x) => +x.toFixed(3)) : v && (v.isObject3D || v.isQuaternion || v.isMatrix4) ? '[obj]' : typeof v === 'number' ? +v.toFixed(3) : v)).slice(0, 1600));\n";
const anchor = "      handOk(handR.distanceTo(";
must(src, anchor); must(src, "startMatch(T, 'Sizes')"); must(src, 'setInterval(pin, 5)'); must(src, "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13'"); must(src, 's0 < 2.2 &&');
const base = src.replace(anchor, LOG + anchor);
const V = {
  v0: (s) => s,
  v1nof13: (s) => s.replace("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13'", "0 && window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13'"),
  v2aim30: (s) => s.replace('setInterval(pin, 5)', 'setInterval(pin, 30)'),
  v3wait6: (s) => s.replace('s0 < 2.2 &&', 's0 < 6 &&'),
  v4probe: (s) => s.replace("startMatch(T, 'Sizes')", "startMatch(T, 'Probe')"),
};
for (const [k, f] of Object.entries(V)) fs.writeFileSync(`qa/2026-10-24-GB-225/t188-${k}.js`, f(base));
console.log('ok');