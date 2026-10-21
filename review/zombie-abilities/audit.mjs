// Read-only final syntax and production-hook audit; never reapplies the preview.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const source = fs.readFileSync('index.html', 'utf8');
const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(([, attrs]) => !/\bsrc\s*=/.test(attrs) && !/type=["']importmap["']/.test(attrs));
assert.equal(scripts.length, 2);
for (const [, , script] of scripts) {
  execFileSync(process.execPath, ['--check', '--input-type=module'], { input: script });
}
const modules = [
  'game/zombie-abilities.js', 'game/zombie-ability-collision.js',
  'game/zombie-ability-runtime.js', 'game/zombie-ability-visuals.js'
];
for (const path of modules) execFileSync(process.execPath, ['--check', path]);

const hooks = [
  "import { createZombieAbilityRuntime } from './game/zombie-ability-runtime.js'",
  'import { attachZombieAbilityVisuals, resetZombieAbilityVisuals, updateZombieAbilityVisuals }',
  'const enemyAbilities = createZombieAbilityRuntime({',
  'attachZombieAbilityVisuals(THREE, g, typeKey, s);',
  'resetZombieAbilityVisuals(mesh);',
  "if (tactics === 'charge' && !z.abilityBusy && !graceFreeze",
  "if (tactics === 'boss' && !z.abilityBusy && !graceFreeze)",
  'if (z.abilityBusy) spd = 0;',
  "&& !rising && !z.abilityBusy && tactics !== 'bomb')",
  'const sp = (z.abilityBusy ? 0 : (z.speed || 2)) * (belowTheme',
  '} else if (d <= reach && !z.abilityBusy) {',
  '} else if (!z.abilityBusy) {',
  'if (z.abilityBusy || z.attackWindup > 0 || z.swingT > 0',
  'const far = !z.abilityBusy && Math.hypot(',
  'enemyAbilities.update(dt);',
  'updateZombieAbilityVisuals(z, simTime, {});',
  'enemyAbilitiesDbg: enemyAbilities,',
  "line: dwText('death.demon.description')",
  "line: dwText('death.acid.description')"
];
for (const hook of hooks) assert.equal(source.split(hook).length - 1, 1, hook);
for (const fn of ['clearZombies', 'stopBelowFight', 'leaveTraining', 'trainingBlackout']) {
  assert.match(source, new RegExp('function ' + fn + '\\(\\) \\{\\s+enemyAbilities\\.clear\\(\\);'));
}
assert.match(source, /createZombieAbilityRuntime\(\{\s+THREE, TSL, scene,/);
assert.equal(fs.readFileSync('index.html', 'utf8'), source, 'Source changed during audit; rerun.');
const paths = ['index.html', ...modules, 'ui/strings.js'];
const hashes = Object.fromEntries(paths.map(path => [path,
  createHash('sha256').update(fs.readFileSync(path)).digest('hex')]));
for (const path of paths) assert.notEqual(fs.readFileSync(path).subarray(0, 3).toString('hex'), 'efbbbf', path + ' BOM');
const proof = { at: new Date().toISOString(), inlineScripts: scripts.length,
  moduleFiles: modules.length, syntax: 'PASS', hooks: 'PASS', utf8NoBom: 'PASS', hashes };
fs.writeFileSync('review/zombie-abilities/source-proof.json', JSON.stringify(proof, null, 2) + '\n', 'utf8');
console.log('PASS: two inline scripts, four ability modules, all production hooks and UTF-8 without BOM.');
