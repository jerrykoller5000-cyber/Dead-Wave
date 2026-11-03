import fs from 'fs';
const P = process.argv[2] || 'index.html';
const raw = fs.readFileSync(P, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const crlf = raw.includes('\r\n'); const EOL = crlf ? '\r\n' : '\n';
const L = raw.split(EOL);
const { litKeys, late: late0 } = JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/late-fields.json', 'utf8'));
const late = [...late0, 'guardianPlanned', 'siegeFrom', 'lineBlockN', 'lineClearN', 'lineHad', 'lineLostT'].filter((k, i, a) => a.indexOf(k) === i && !litKeys.includes(k) && k !== 'userData');
const ZERO = new Set('roleArmorAdd roleFireAdd _tickAcc paceMul paceNight paceU hzRecoilT hzRecoilCd hzRecoilSide hzStaggerCd stuckT _hzReach _rim unstickSide fogKeepT ringHeld lineGo lineBlockN lineClearN lineLostT guardianProgressT _shotN buffT'.split(' '));
// 1. the literal in spawnZombie
const a = L.findIndex((l, i) => l === '      const zom = {' && L[i - 1].includes('const hp = Math.max(8, Math.round(def.hp * hpVar));'));
const b = L.findIndex((l, i) => i > a && l === '      };' && L[i + 1].includes('mesh.userData.partsLost = zom.partsLost;'));
if (a < 0 || b < 0 || b - a !== 38) throw new Error('literal anchors ' + a + ' ' + b);
const fnAt = L.findIndex((l) => l === '    function spawnZombie(x, z, typeKey = null, overCap = false, noRise = false) {');
if (fnAt < 0 || fnAt > a) throw new Error('spawnZombie anchor');
const lit = L.slice(a + 1, b).join('\n');
for (const k of litKeys) if (!new RegExp('\\b' + k + '\\b').test(lit)) throw new Error('literal lacks ' + k);
const S = '      ';
const ctor = [
  '    // GB-253 (CU-187): a zombie is made with every field it will ever carry, in one order, so its shape (V8\'s map) never',
  '    // changes in the walk and updateZombies and zombieLateStep stop deoptimizing on it. First the fields spawnZombie\'s',
  '    // literal had, the same values in the same order (the same Math.random calls); then the ones the walk, the hits and',
  '    // the modules add later. Those start undefined, exactly what reading a missing field gave (the code tests many with',
  '    // == null or === undefined), except the few it only reads as a number (|| 0, > 0, || 1), which start 0. More than',
  '    // 127 fields would make an object literal a slow dictionary, so a constructor makes them. A new zombie field belongs',
  '    // here too; and clear one with = undefined, never delete (a delete turns the zombie into a slow dictionary).',
  '    function ZombieShape(mesh, x, z, tk, def, vr, hp, riseDur) {',
  S + 'this.mesh = mesh; this.x = x; this.z = z; this.typeKey = tk;',
  S + 'this.hp = hp; this.maxHp = hp;',
  S + 'this.speed = def.speed * ZOMBIE_PACE; this.baseSpeed = def.speed * ZOMBIE_PACE;',
  S + 'this.radius = def.radius;',
  S + 'this.damage = def.damage; this.baseDamage = def.damage;',
  S + 'this.armor = def.armor || 0;',
  S + 'this.attackCd = 0; this.attackWindup = 0; this.alive = true;',
  S + "this.brute = tk === 'brute';",
  S + 'this.reward = def.cashDrop != null ? def.cashDrop : def.reward;',
  S + 'this.cashDrop = def.cashDrop != null ? def.cashDrop : def.reward;',
  S + "this.tactics = def.tactics || 'direct';",
  S + 'this.bob = Math.random() * Math.PI * 2;',
  S + 'this.walkPhase = vr.phase || Math.random() * Math.PI * 2;',
  S + 'this.gaitMul = vr.gait || 1;',
  S + 'this.scale = def.scale * vr.height;',
  S + 'this.riseT = riseDur; this.riseDur = riseDur;',
  S + 'this.swingT = 0; this.swingSide = 1;',
  S + 'this.hitH = mesh.userData.hitH || 1.45;',
  S + "this.meleeMult = tk === 'brute' ? 1.7 : (tk === 'demon' ? 1.5 : 1);",
  S + 'this.fireResist = def.fireResist || 0;',
  S + 'this.armored = !!def.armored;   // GB-75: plates (the brute)',
  S + 'this.aquatic = !!def.aquatic; this.spider = !!def.spider;',
  S + 'this.partsLost = emptyPartsLost();',
  S + 'this.crawling = false;',
  S + 'this.flankSide = Math.random() < 0.5 ? -1 : 1;',
  S + 'this.flankPhase = Math.random() * Math.PI * 2;',
  S + 'this.sprintT = 0;',
  S + 'this.rushT = 0;',
  S + 'this.strafeDir = Math.random() < 0.5 ? -1 : 1;',
  S + 'this.hitReact = 0;',
  S + 'this.hitDirX = 0; this.hitDirZ = 0;',
  S + 'this.staggerVX = 0; this.staggerVZ = 0;',
  S + 'this.flashT = 0;',
  S + 'this.dying = false;',
  S + 'this.deathKind = null;',
  S + 'this.deathT = 0;',
  S + 'this.deathDirX = 0; this.deathDirZ = 0;',
  S + '// the later fields (' + late.length + ')',
];
let line = S;
for (const k of late) { const s = 'this.' + k + ' = ' + (ZERO.has(k) ? '0' : 'undefined') + ';'; if (line.length + s.length > 150) { ctor.push(line.trimEnd()); line = S; } line += s + ' '; }
if (line.trim()) ctor.push(line.trimEnd());
ctor.push('    }', '');
// check that the constructor's literal part names every literal key exactly once
const body = ctor.join('\n');
for (const k of litKeys) { const n = (body.match(new RegExp('this\\.' + k.replace(/\$/g, '\\$') + ' = ', 'g')) || []).length; if (n !== 1) throw new Error('ctor ' + k + ' x' + n); }
for (const k of late) { const n = (body.match(new RegExp('this\\.' + k.replace(/\$/g, '\\$') + ' = ', 'g')) || []).length; if (n !== 1) throw new Error('ctor late ' + k + ' x' + n); }
// 2. the deletes in index.html
const del = [
  ['if (z.spitterShot) { const shot=z.spitterShot; delete z.spitterShot;', 'if (z.spitterShot) { const shot=z.spitterShot; z.spitterShot = undefined;'],
  ['{ delete z.trainingEntry; z.mesh.visible = true; }', '{ z.trainingEntry = undefined; z.mesh.visible = true; }'],
];
const out = L.slice();
for (const [f, t] of del) { const hits = out.map((l, i) => l.includes(f) ? i : -1).filter((i) => i >= 0); if (hits.length !== 1) throw new Error('delete anchor ' + f + ' ' + hits.length); out[hits[0]] = out[hits[0]].replace(f, t); }
out.splice(a, b - a + 1, '      const zom = new ZombieShape(mesh, x, z, tk, def, vr, hp, riseDur);   // GB-253: every field it will carry, made here (ZombieShape)');
out.splice(fnAt, 0, ...ctor);
fs.writeFileSync(P, out.join(EOL));
console.log('edited: crlf', crlf, 'literal', a + 1, '-', b + 1, 'ctor at', fnAt + 1, 'lines', ctor.length, 'late fields', late.length, 'zero', [...ZERO].filter(k => late.includes(k)).length);
