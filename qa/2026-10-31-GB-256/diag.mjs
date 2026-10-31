// diag.mjs: GB-256, what state the Training Ground camera's marine is in before the probe measures him.
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-256'];
const call = (args) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...args, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).trim(); } catch (e) { return 'ERR ' + String((e && (e.stdout || e.stderr)) || e.message).slice(0, 800); } };
const ev = (c) => call(['eval', c]);
const D = 'qa/2026-10-31-GB-256/diag/';
console.log(call(['start', '--training']));
const STATE = `const g = Object.keys(T).find((k) => T[k] && typeof T[k] === 'object' && typeof T[k].gunShown === 'function');
const tr = T.trainingDbg.state();
return JSON.stringify({ wake: !!tr.wake, active: tr.active, gun: T.getCurrentWeapon(), shown: g ? T[g].gunShown() : 'n/a', idle: T.marineIdleDbg().state.phase,
  first: T.fpDbg().first, kind: T.aimKindDbg(), yaw: T.aimSafetyDbg(), sh: (() => { const s = T.getShoulderDbg(); return { w: s.w, ads: s.ads, raw: s.rawAds }; })(),
  zoom: T.aimZoomDbg(), P: T.player.position, C: T.camera.position, fov: T.camera.fov });`;
console.log('0 ' + ev(STATE));
console.log(call(['shot', '--live', '--ui', '--out', D + '0-arrival.png']));
console.log('1 ' + ev(`T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.setViewFirstDbg(false); T.setWeapon(T.WEAPON_ORDER.indexOf('m4')); await wait(1500); T.marineIdleDbg().reset();
const cv = T.renderer.domElement, r = cv.getBoundingClientRect(); const o = { clientX: r.left + r.width / 2 + 60, clientY: r.top + r.height / 2 + 140, bubbles: true };
cv.dispatchEvent(new PointerEvent('pointerenter', o)); cv.dispatchEvent(new PointerEvent('pointermove', o)); await wait(800); ${STATE}`));
console.log(call(['shot', '--live', '--ui', '--out', D + '1-m4.png']));
console.log('2 ' + ev(`T.setZoomHeldDbg(true); await wait(1500); ${STATE}`));
console.log(call(['shot', '--live', '--ui', '--out', D + '2-m4-zoom.png']));
console.log('3 ' + ev(`T.setZoomHeldDbg(false); await wait(1000); ${STATE}`));
console.log(call(['stop']));
