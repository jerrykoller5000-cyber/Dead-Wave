// CU-63: game logic reads the players list, not player.position.
// Allowed functions are the local view and the marine's own actions (docs/coop.md §3).
// A new function that reads player.position fails here until it is named in the same handoff.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Kind 1 (the local view), kind 3 (what he does) and the debug/warm-up helpers.
const ALLOWED = new Set(`
tick updateWater updateAmbientLife updateAudioDirection updateWindSway updateRoofCutaway ease
warmEffectPools finishEffectWarmup updateCaveEyes destroyLandmark campsiteMapName drawMinimap
toFull updateCampfires updateRainDroplets updatePuddles cullFoliageByDistance updateTreeBatchesInner
updatePitBubbles updateWorldVoices flushShotHits sndAt damageZombie updateTreeFade updateShadowLOD
resolveTreeCollisions updateTowerClimb updateSlopeSlide tryRoll inLot sendMarineToSpawn resetGame
startMode tipAt smooth updateMarineBody marineBody marineHit damagePlayer updateMouseAim
raycastTerrain triggerMuzzleFlash knifeAttack chainsawTick updateFlameStream throwGrenade meleeBugs
meleeWildlife updateMedPenUse cycleWeapon getPlacePoint updateGhostPreview cancelPlaceMode
buildReachable pickBuildOnRay upgradeTarget scrapTarget nearestOnMyStorey storeyBand playerUpstairs
ok nearestDoor toggleDoor nearestFoldStairs canReachMortar nearestMortar mountMortar updateMortar
onBoards nearestGrave nearHQWindow nearHQPanel nearCIF nearKiosk updateKioskPrompt actionTarget
objectiveReach beginScriptedKill updateCaveKill setupCaveDrag toScene updateGrabScene updateCaveDrag
finishScriptedKill snd beginMarineInsertion makeKnife updateTentacleKill kickFree startGrabScene
drawFullMap updateMarineIdle loopCineCamera resolveTarget
devBaseBuild hordeReport devSwarm pulseGuardianFailsafeForTest cineSetup getCaveChase
stepSetA maybePreRollFromLoop stepLivePreRoll preRollFight stampDebugHooks
`.split(/\s+/).filter(Boolean));

export function scan(src) {
  const lines = src.split(/\n/);
  const stack = [];
  let depth = 0;
  const reads = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    const fn = /function\s+([A-Za-z0-9_]+)\s*\(/.exec(line);
    if (fn) stack.push({ name: fn[1], depth });
    if (line.includes('player.position')) {
      const name = stack.length ? stack[stack.length - 1].name : '(top)';
      reads.push({ line: i + 1, name, text: line.trim().slice(0, 140) });
    }
    depth += opens - closes;
    while (stack.length && depth < stack[stack.length - 1].depth) stack.pop();
  }
  return reads;
}

export function violations(reads) {
  return reads.filter((r) => !ALLOWED.has(r.name));
}

function report(file, reads) {
  const bad = violations(reads);
  if (!bad.length) {
    console.log(`check-players: ${reads.length} player.position reads, all in the allowed places`);
    return 0;
  }
  console.log('check-players: game logic reads the players list: nearestPlayer, playersNear or players (docs/coop.md).');
  for (const r of bad) console.log(`  ${file}:${r.line}  ${r.name}  ${r.text}`);
  console.log(`${bad.length} read(s) in ${new Set(bad.map((r) => r.name)).size} function(s)`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const planted = violations(scan('function planted(){ return player.position.x }'));
  if (planted.length !== 1) { console.log('check-players: the planted-read check did not fail'); process.exit(1); }
  const src = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  process.exit(report('index.html', scan(src)));
}
