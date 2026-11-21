import fs from 'node:fs';

const src = fs.readFileSync('index.html', 'utf8');
const lines = src.split(/\r?\n/);

function grepLines(re, limit = 60) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      out.push(`${i + 1}: ${lines[i].trim().slice(0, 150)}`);
      if (out.length >= limit) break;
    }
  }
  return out;
}

console.log('=== TITLE / START BUTTONS ===');
console.log(grepLines(/id="(start|play|mode|newRun|continue|resume|retry|restart|death|gameOver|gameover|dead)/i, 60).join('\n'));

console.log('\n=== START GAME / NEW RUN / RESET ===');
console.log(grepLines(/function (startGame|beginGame|newRun|restartRun|resetRun|triggerGameOver|showGameOver|playerDie|onDeath)/i, 50).join('\n'));

console.log('\n=== WARMUP / POSTPROCESSING.RENDER ===');
console.log(grepLines(/postProcessing\.render\s*=|Stage 1|Stage 2|startWarmup|warmupDone/i, 40).join('\n'));

console.log('\n=== DAY / NIGHT / CALL ZOMBIES / HQ STATIONS ===');
console.log(grepLines(/(callNight|startNight|skipPrep|readyForNight|HQ_WINDOW|CIF|SKULL|SUPPLY|ARMORY|openArmory|openShop|openCif|bankSkulls)/i, 60).join('\n'));

console.log('\n=== TT EXPOSURE ===');
console.log(grepLines(/window\.TT\s*=/, 10).join('\n'));
