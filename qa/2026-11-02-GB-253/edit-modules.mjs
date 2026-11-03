import fs from 'fs';
const edits = [
  ['game/screamer-behavior.js', 'delete z.sonicOpenT;delete z._sonicScreaming;delete z.sonicHitT;', 'z.sonicOpenT=undefined;z._sonicScreaming=undefined;z.sonicHitT=undefined;'],
  ['game/spitter-motion.js', 'rotation.set(0,0,0);delete z.spitterShot;}', 'rotation.set(0,0,0);z.spitterShot=undefined;}'],
  ['game/zombie-ability-runtime.js', 'z.abilityBusy=false;delete z.rangedAbility;', 'z.abilityBusy=false;z.rangedAbility=undefined;'],
];
for (const [f, a, b] of edits) {
  const t = fs.readFileSync(f, 'utf8'); if (t.charCodeAt(0) === 0xFEFF) throw new Error('BOM ' + f);
  const n = t.split(a).length - 1; if (n !== 1) throw new Error(f + ' anchor x' + n);
  fs.copyFileSync(f, 'qa/2026-11-02-GB-253/' + f.replace('game/', '') + '.before');
  fs.writeFileSync(f, t.replace(a, b)); console.log('ok', f, t.includes('\r\n') ? 'crlf' : 'lf');
}
