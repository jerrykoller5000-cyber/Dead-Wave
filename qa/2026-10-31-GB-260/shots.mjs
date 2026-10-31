// shots.mjs - GB-260: the pistol's and the Uzi's magazines before and after, in both views.
//   node qa/2026-10-31-GB-260/shots.mjs before|after      (run inside the game-test slot; the camera queues itself)
// Third person: the gun in his hand, from his right side and over his shoulder. The model alone, big, for the
// silhouette and the well. First person: the hip hold, then two beats of the reload (the well as the magazine
// leaves it, and the seat).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before';
const O = 'qa/2026-10-31-GB-260/' + PH;
fs.mkdirSync(O, { recursive: true });
const A = ['--agent', 'grokbot', '--task', 'GB-260'];
const cam = (...a) => { try { const s = execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 300000 });
    console.log('ok   ' + a.join(' ').slice(0, 150)); return s; }
  catch (e) { console.log('ERR  ' + a.join(' ').slice(0, 150) + ' :: ' + String(e.stderr || e.message).slice(0, 300)); return ''; } };
const ev = (code, tag) => { const s = cam('eval', code); console.log('     ' + (tag || '') + ' -> ' + String(s.split('\n').find((l) => l.includes('->')) || s).trim().slice(0, 200)); return s; };
cam('start', '--match', '--idle', '12');
ev("{const T=TT; T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); T.addCash(99999); for (const w of ['pistol','uzi']) { try { T.buyExtMag(w); } catch (e) {} } return 1}", 'setup');
const take = (w, ext) => `{const T=TT; try { T.armoryDbg.fit('${w}','ext',${ext}); } catch (e) {}
  if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
  for (let i=0;i<24&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,200));}
  await new Promise(r=>setTimeout(r,2400)); T.marineIdleDbg().reset(); T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,400));
  return T.getCurrentWeapon() + ' ext=' + JSON.stringify(T.weaponMods('${w}')) + ' vis=' + T.weaponMeshes['${w}'].visible}`;
for (const w of ['pistol', 'uzi']) for (const ext of [false, true]) {
  const tag = w + (ext ? '-ext' : '');
  ev(take(w, ext), tag);
  cam('shot', 'player', '--yaw', '90', '--out', `${O}/tp-${tag}-side.png`);
  cam('shot', 'player', '--yaw', '135', '--out', `${O}/tp-${tag}-shoulder.png`);
  cam('shot', `weapon:${w}`, '--view', 'side', '--out', `${O}/model-${tag}-side.png`);
  cam('shot', `weapon:${w}`, '--view', 'back', '--out', `${O}/model-${tag}-back.png`);
  ev("{const T=TT; T.marineIdleDbg().reset(); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,900)); T.marineIdleDbg().reset(); return T.getCurrentWeapon()}", 'fp on');
  cam('shot', '--live', '--out', `${O}/fp-${tag}-hip.png`);
  ev(`{const T=TT; T.setAmmoDbg(T.getCurrentWeapon(), 1); T.startReload(); await new Promise(r=>setTimeout(r,150)); if (T.reloadClipDbg) T.reloadClipDbg.hold(0.42); await new Promise(r=>setTimeout(r,800)); return 1}`, 'reload 0.42');
  cam('shot', '--live', '--out', `${O}/fp-${tag}-reload-42.png`);
  ev("{const T=TT; if (T.reloadClipDbg) T.reloadClipDbg.hold(0.62); await new Promise(r=>setTimeout(r,900)); return 1}", 'reload 0.62');
  cam('shot', '--live', '--out', `${O}/fp-${tag}-reload-62.png`);
  ev("{const T=TT; if (T.reloadClipDbg) T.reloadClipDbg.hold(null); await new Promise(r=>setTimeout(r,700)); T.setViewFirstDbg(false); return 1}", 'reload off');
}
ev("{const T=TT; T.setViewFirstDbg(false); return 1}");
cam('stop');
console.log('DONE ' + PH);