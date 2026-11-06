const fs = require('fs');
const p = 'ui/hud-layout.css';
let s = fs.readFileSync(p, 'utf8');
const a = [
  '#noticeRail > #bigBanner.center,',
  '#noticeRail > #bigBanner.center.show {',
  '  position: fixed; top: 30%; left: 50%; right: auto; width: max-content; max-width: min(92vw, 820px);',
  '  transform: translate(-50%, -50%); text-align: center; background: transparent; border: 0; box-shadow: none;',
  '  padding: 0; animation: none; overflow: visible; border-radius: 0;',
  '}',
  '#noticeRail > #bigBanner.center .t {',
  '  font-family: var(--font-display); font-size: 44px; font-weight: 400; line-height: 1;',
  '  letter-spacing: 0.2em; padding-left: 0.2em; text-align: center; text-transform: uppercase; white-space: nowrap;',
  '  text-shadow: 0 2px 16px rgba(0,0,0,.9);',
  '}'
].join('\n');
const b = [
  '#noticeRail > #bigBanner.center,',
  '#noticeRail > #bigBanner.center.show {',
  '  position: fixed; top: 30%; left: 50%; right: auto; width: min(92vw, 1100px); max-width: min(92vw, 1100px);',
  '  box-sizing: border-box; padding: 0 4vw;',
  '  transform: translate(-50%, -50%); text-align: center; background: transparent; border: 0; box-shadow: none;',
  '  animation: none; overflow: visible; border-radius: 0;',
  '}',
  '#noticeRail > #bigBanner.center .t {',
  '  font-family: var(--font-display); font-size: clamp(17px, 2.1vw + 12px, 44px); font-weight: 400; line-height: 1.28;',
  '  letter-spacing: 0.2em; padding-left: 0.2em; text-align: center; text-transform: uppercase;',
  '  white-space: normal; overflow-wrap: anywhere;',
  '  text-shadow: 0 2px 16px rgba(0,0,0,.9);',
  '}'
].join('\n');
if (!s.includes(a)) { console.error('MISS'); process.exit(1); }
if ((s.split(a).length - 1) !== 1) { console.error('dup'); process.exit(1); }
fs.writeFileSync(p, s.replace(a, b));
console.log('patched');
