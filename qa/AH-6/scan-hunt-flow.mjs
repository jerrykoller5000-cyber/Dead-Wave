import fs from 'node:fs';

const src = fs.readFileSync('index.html', 'utf8');
const lines = src.split(/\r?\n/);

function showAround(re, before = 4, after = 24, maxHits = 6) {
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      count++;
      console.log(`\n--- HIT ${count} at line ${i + 1} ---`);
      for (let j = Math.max(0, i - before); j <= Math.min(lines.length - 1, i + after); j++) {
        console.log(`${j + 1}: ${lines[j]}`);
      }
      if (count >= maxHits) break;
    }
  }
}

console.log('=== #modeHunt / firstRunPlay ===');
showAround(/getElementById\(['"]modeHunt['"]\)|modeHunt\.addEventListener|firstRunPlay/, 4, 28, 4);

console.log('\n=== #again (death restart) ===');
showAround(/getElementById\(['"]again['"]\)|againBtn/, 4, 28, 3);

console.log('\n=== Main game warm-up / compileAsync ===');
showAround(/compileAsync/, 4, 20, 5);
