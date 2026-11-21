import fs from 'node:fs';

const src = fs.readFileSync('index.html', 'utf8');
const lines = src.split(/\r?\n/);

function showAround(re, before = 3, after = 18, maxHits = 4) {
  let c = 0;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      c++;
      console.log(`\n--- HIT ${c} line ${i + 1} ---`);
      for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
      if (c >= maxHits) break;
    }
  }
}

console.log('=== KeyE armory handler ===');
showAround(/===\s*['"]armory['"]/, 3, 16, 4);

console.log('\n=== toggleViewFirst keybind ===');
showAround(/toggleViewFirst\(/, 4, 10, 5);

console.log('\n=== knifeAttack keybind ===');
showAround(/knifeAttack\(/, 4, 10, 4);

console.log('\n=== toggleNvg keybind ===');
showAround(/toggleNvg\(/, 4, 10, 4);
