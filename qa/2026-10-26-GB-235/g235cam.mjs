// GB-235 / GB-234 shots: the Uzi and the machete in the inspector and from his eyes (the Uzi aimed), and the mortar build.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-235'], O = 'qa/2026-10-26-GB-235/' + (process.argv[2] || 'after');
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { console.log('ERR ' + a.join(' ') + ' ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
cam('start', '--inspect');
for (const t of ['weapon:uzi', 'weapon:machete', 'weapon:knife', 'build:mortar', 'build:mortar:1', 'build:mortar:2']) cam('shot', t, '--view', 'three', '--out', `${O}/model-${t.replace(/:/g, '-')}.png`);
cam('shot', 'weapon:machete', '--view', 'side', '--out', `${O}/model-machete-side.png`);
cam('shot', 'weapon:uzi', '--view', 'side', '--out', `${O}/model-uzi-side.png`);
cam('reload', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
cam('eval', "{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='uzi';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('uzi')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1500)); T.marineIdleDbg().reset(); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,900)); T.setZoomHeldDbg(true); const t0=Date.now(); while (T.fpDbg().ads < 0.99 && Date.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,400)); T.marineIdleDbg().reset(); return 1}");
cam('shot', '--live', '--out', `${O}/fp-ads-uzi.png`);
cam('eval', "{TT.setZoomHeldDbg(false); TT.setViewFirstDbg(false); return 1}");
cam('stop');
