// Probe: pressing F should actually show the character holding the knife and
// swinging it (a real windup/strike/recover arc on the blade, plus some of that
// motion showing in the right arm), not just a static instant pose that pops in
// and out. Also checks the melee hit still lands and the attack cooldown still
// gates re-swinging, since those must not regress while the visual is reworked.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { installDOM, dispatch, pumpFrame } from './dom-mock.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2];
let a = 24601;
Math.random = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const html = fs.readFileSync(htmlPath, 'utf8');
const m = html.match(/<script\s+type\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/);
let body = m[1];
const mockUrl = pathToFileURL(path.join(HARNESS_DIR, 'mock-three.mjs')).href;
body = body.replace(/import\s*\*\s*as\s+THREE\s+from\s+['"]three['"]\s*;?/, `import THREE from '${mockUrl}';`);
// The game also pulls in three/tsl for the sky's node graph; point it at the stub.
const tslUrl = pathToFileURL(path.join(HARNESS_DIR, 'mock-tsl.mjs')).href;
body = body.replace(/import\s*\*\s*as\s+TSL\s+from\s+['"]three\/tsl['"]\s*;?/, `import * as TSL from '${tslUrl}';`);
body = body.replace(/import\(\s*['"]three\/addons\/tsl\/display\/BloomNode\.js['"]\s*\)/g, `import('${pathToFileURL(path.join(HARNESS_DIR, 'mock-bloom.mjs')).href}')`);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gear-probe-'));
const tmpFile = path.join(tmpDir, 'game-module.mjs');
fs.writeFileSync(tmpFile, body);
installDOM({ width: 1280, height: 720, search: '?debug=1', initialHtml: html });
const { setCanvasFactory } = await import(mockUrl);
setCanvasFactory(() => { const c = document.createElement('canvas'); c.width = 1280; c.height = 720; return c; });
await import(pathToFileURL(tmpFile).href);
await new Promise((r) => setImmediate(r));


const errs = [];
function click(id) { for (const e of dispatch(document.getElementById(id), 'click', { button: 0 })) errs.push(e); }
function key(type, code) { for (const e of dispatch(globalThis, type, { code, key: code, repeat: false, shiftKey: false })) errs.push(e); }
function frame() { for (const e of pumpFrame(1000 / 60)) errs.push(e); }
const fails = [];
function check(label, ok, detail) { console.log((ok ? 'ok   ' : 'FAIL ') + label + (detail !== undefined ? ' — ' + detail : '')); if (!ok) fails.push(label); }
const visibleCount = (list) => list.filter((m) => m.visible).length;

click('modeHunt');
for (let i = 0; i < 10; i++) frame();
const TT = globalThis.TT;
TT.skipGrace();
const gp = TT.marine.userData.gearParts;
check('marine registers helmet/vest/pads/nvg parts', !!gp && gp.helmet.length >= 5 && gp.vest.length >= 10 && gp.pads.length === 4 && gp.nvg.length === 1,
  gp && [gp.helmet.length, gp.vest.length, gp.pads.length, gp.nvg.length].join('/'));
check('nothing worn at the start', visibleCount(gp.helmet) + visibleCount(gp.vest) + visibleCount(gp.pads) + visibleCount(gp.nvg) === 0);
check('armor bar hidden with no armour', document.getElementById('armorBarWrap').style.display === 'none');
check('knife model shown, machete hidden', TT.knife.userData.knifeModel.visible && !TT.knife.userData.macheteModel.visible);

const G = Object.fromEntries(TT.GEAR.map((g) => [g.key, g]));
TT.addCash(1000);
const cash0 = TT.getCash ? TT.getCash() : null;
TT.buyGear(G.nvg);
check('NVG refuses before the helmet', !TT.getGearOwned().nvg && visibleCount(gp.nvg) === 0);
TT.buyGear(G.helmet);
check('helmet bought → helmet parts visible, +25 armor', TT.getGearOwned().helmet && visibleCount(gp.helmet) === gp.helmet.length && TT.getArmor() === 25 && TT.armorMax() === 25);
check('armor bar shown now', document.getElementById('armorBarWrap').style.display !== 'none' && document.getElementById('armorNum').textContent === '25 / 25');
TT.buyGear(G.nvg);
check('NVG allowed after the helmet', TT.getGearOwned().nvg && visibleCount(gp.nvg) === 1);
TT.buyGear(G.vest); TT.buyGear(G.pads);
check('vest + pads visible, armor pool 90', visibleCount(gp.vest) === gp.vest.length && visibleCount(gp.pads) === 4 && TT.armorMax() === 90 && TT.getArmor() === 90);

// Damage soak: 40 damage → armor takes 26, health takes 14.
TT.setHp(100);
TT.damagePlayer(40);
check('armour soaks 65% of a hit', Math.abs(TT.getArmor() - 64) < 0.01 && Math.abs(TT.getHp() - 86) < 0.01, TT.getArmor() + ' / ' + TT.getHp());
TT.setArmor(5);
TT.damagePlayer(40);
check('last few points soak, remainder hits health', TT.getArmor() === 0 && Math.abs(TT.getHp() - 51) < 0.01, TT.getArmor() + ' / ' + TT.getHp());
TT.repairArmor();
check('kiosk repair refills the pool', TT.getArmor() === 90);

// Machete: reach + damage + wider arc.
const P = TT.player.position;
for (const t of TT.trees) t.alive = false; for (const r of TT.rocks) r.alive = false;
const bs0 = TT.bladeStats();
TT.buyMachete();
const bs1 = TT.bladeStats();
check('machete bought: model swapped', TT.isMacheteOwned() && !TT.knife.userData.knifeModel.visible && TT.knife.userData.macheteModel.visible);
check('machete out-reaches and out-damages the knife', bs1.reach > bs0.reach + 0.5 && bs1.dmg > bs0.dmg * 1.8, JSON.stringify([bs0, bs1]));
const z = TT.spawnZombie(P.x, P.z + 2.4, 'shambler'); // beyond knife reach (1.8 + r), inside machete reach
for (let i = 0; i < 3; i++) frame();
z.mesh.position.set(P.x, z.mesh.position.y, P.z + 2.4);
TT.aimTarget.set(P.x, z.mesh.position.y + 0.8, P.z + 2.4);
frame();
const hp0 = z.hp;
key('keydown', 'KeyF'); key('keyup', 'KeyF'); frame();
check('machete lands on a zombie the knife could not reach', z.hp < hp0 || !z.alive, hp0 + ' -> ' + z.hp);
check('swing cooldown uses the machete value', Math.abs(TT.getKnifeCd() - (bs1.cd - 1 / 60)) < 0.02, TT.getKnifeCd().toFixed(3));

// grantAllWeapons / reset round-trip
TT.resetGame ? TT.resetGame() : null;
console.log('errors:', errs.length, errs.slice(0, 3));
console.log(fails.length ? 'FAIL ' + fails.join(' | ') : 'PASS');
console.log('DONE');
process.exit(errs.length || fails.length ? 1 : 0);
