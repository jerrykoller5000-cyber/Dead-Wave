// GB-167: selector click (gunsynth + audio) and thumb flick hooks (index.html). EOL-preserving, unchanged-file check.
import fs from 'node:fs';
const edit = (f, fn) => {
  const before = fs.readFileSync(f, 'utf8'), nl = before.includes('\r\n') ? '\r\n' : '\n';
  let s = before;
  const once = (a, b) => { a = a.replace(/\n/g, nl); b = b.replace(/\n/g, nl); const n = s.split(a).length - 1; if (n !== 1) throw Error(f + ': anchor x' + n + ': ' + a.slice(0, 80)); s = s.replace(a, b); };
  if (s.includes('GB-167')) { console.log(f, 'already patched'); return; }
  fn(once);
  if (fs.readFileSync(f, 'utf8') !== before) throw Error(f + ' changed under us');
  fs.writeFileSync(f, s, 'utf8'); console.log('patched', f);
};
edit('core/gunsynth.js', (once) => {
  once("tau: 0.4, n: 18, click: 0.15, ex: 0.9, body: 0.6, bodyF: 800, g: 0.35 }] }\n};",
    "tau: 0.4, n: 18, click: 0.15, ex: 0.9, body: 0.6, bodyF: 800, g: 0.35 }] },\n" +
    "  // GB-167: the fire selector's detent, a small crisp steel click (audio.js plays it twice, the lever leaving one notch\n" +
    "  // and dropping into the next). Full auto sits a touch higher and firmer than semi.\n" +
    "  selectorSemi: { level: 0.028, dryLen: 0.05, variants: 3, layers: [{ k: 'knock', f: 1400, d: 9, q: 1.6, g: 1 }, { k: 'clank', f: [1500, 5200], tau: 0.25, n: 12, click: 0.35, ex: 0.9, body: 0.5, bodyF: 1400, g: 0.5 }] },\n" +
    "  selectorAuto: { level: 0.032, dryLen: 0.05, variants: 3, layers: [{ k: 'knock', f: 1750, d: 10, q: 1.8, g: 1 }, { k: 'clank', f: [1800, 6000], tau: 0.22, n: 12, click: 0.45, ex: 0.9, body: 0.5, bodyF: 1700, g: 0.55 }] }\n};");
});
edit('core/audio.js', (once) => {
  once("  const WARM_ORDER = ['hit', 'pistol', 'm4', 'impactDirt', 'impactWood', 'weaponSwitch', 'wheelTick',",
    "  const WARM_ORDER = ['hit', 'pistol', 'm4', 'impactDirt', 'impactWood', 'weaponSwitch', 'wheelTick', 'selectorSemi', 'selectorAuto',   // GB-167\n   ");
  once("\n  let magThudCd = 0;",
    "\n  // GB-167: the fire selector (X): two quick detent clicks, the second softer; full auto a touch brighter.\n" +
    "  let selectorLast = { mode: null, at: -1 };\n" +
    "  function selectorClick(mode) {\n" +
    "    const c = ensure(); if (!c || muted) return;\n" +
    "    const name = mode === 'auto' ? 'selectorAuto' : 'selectorSemi', r = 0.97 + Math.random() * 0.06;\n" +
    "    foley(name, 1, 0, 0, r); foley(name, 0.5, 0, 0.026, r * 1.12);\n" +
    "    selectorLast = { mode: mode === 'auto' ? 'auto' : 'semi', at: c.currentTime };\n" +
    "  }\n\n  let magThudCd = 0;");
  once("weaponSwitch: W(weaponSwitch), wheelTick: W(wheelTick),", "weaponSwitch: W(weaponSwitch), wheelTick: W(wheelTick), selectorClick: W(selectorClick), selectorLast: () => selectorLast,   // GB-167\n   ");
});
edit('index.html', (once) => {
  once("import { HAND_POSES, lerpPose } from './studio/marine-hand.js';   // GB-152",
    "import { HAND_POSES, lerpPose } from './studio/marine-hand.js';   // GB-152\n    import { createSelectorFlick } from './game/selector-flick.js';   // GB-167: the thumb on the fire selector");
  once("      fireMode[w] = weaponIsAuto(w) ? 'semi' : 'auto';\n      updateAmmoHud();",
    "      fireMode[w] = weaponIsAuto(w) ? 'semi' : 'auto';\n      AudioSys.selectorClick?.(fireMode[w]); selectorFlick.start(w, true, fireMode[w]);   // GB-167: click + thumb (only dual-mode guns get here)\n      updateAmmoHud();");
  once("    const _hp = { r: null, l: null, rest: null };", "    const _hp = { r: null, l: null, rest: null };\n    const selectorFlick = createSelectorFlick();   // GB-167");
  once("      if (rr) { _hp.r = lerpPose(rest, HAND_POSES.fist, _clamp01(Math.max(wR, climbGrip)), _hp.r); rr.set(_hp.r).update(); }",
    "      if (rr) { _hp.r = lerpPose(rest, HAND_POSES.fist, _clamp01(Math.max(wR, climbGrip)), _hp.r); selectorFlick.apply(_hp.r, currentWeapon); rr.set(_hp.r).update(); }   // GB-167: the thumb flick rides on top");
  once("slowMoDbg, triggerSlowMo,", "slowMoDbg, triggerSlowMo, selectorFlick,   /* GB-167 */");
});
