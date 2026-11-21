import fs from 'node:fs';

const idx = fs.readFileSync('index.html', 'utf8');
const lines = idx.split(/\r?\n/);

console.log('=== LOCALSTORAGE KEYS ===');
lines.forEach((l, i) => {
  if (/localStorage\.(getItem|setItem)/.test(l)) console.log(`index.html:${i + 1}: ${l.trim().slice(0, 140)}`);
});

console.log('\n=== WEAPON SWITCHING (cycleWeapon / wheel / mousewheel) ===');
lines.forEach((l, i) => {
  if (/function cycleWeapon|addEventListener\(['"]wheel['"]/.test(l)) {
    for (let j = i; j < Math.min(lines.length, i + 16); j++) console.log(`index.html:${j + 1}: ${lines[j].slice(0, 140)}`);
    console.log('---');
  }
});

console.log('\n=== SKULL RECALL AT DAWN ===');
lines.forEach((l, i) => {
  if (/skullRecallUntil\s*=/.test(l)) {
    for (let j = Math.max(0, i - 2); j < Math.min(lines.length, i + 8); j++) console.log(`index.html:${j + 1}: ${lines[j].slice(0, 140)}`);
    console.log('---');
  }
});

const arm = fs.readFileSync('ui/armory.js', 'utf8').split(/\r?\n/);
console.log('\n=== ui/armory.js BUY / EQUIP / RESTOCK SELECTORS ===');
arm.forEach((l, i) => {
  if (/(buy|restock|equip|slot|data-|className)/i.test(l)) console.log(`ui/armory.js:${i + 1}: ${l.trim().slice(0, 140)}`);
});
