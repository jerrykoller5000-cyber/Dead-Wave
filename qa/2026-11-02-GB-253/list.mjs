import fs from 'fs';
const probe = JSON.parse(fs.readFileSync('qa/2026-11-02-GB-253/before-keys.json','utf8').replace(/^\uFEFF/,'')).keys.map(k=>{const [n,t]=k.split(':');return [n,t];});
const src = fs.readFileSync('index.html','utf8').split('\n');
const litKeys = 'mesh x z typeKey hp maxHp speed baseSpeed radius damage baseDamage armor attackCd attackWindup alive brute reward cashDrop tactics bob walkPhase gaitMul scale riseT riseDur swingT swingSide hitH meleeMult fireResist armored aquatic spider partsLost crawling flankSide flankPhase sprintT rushT strafeDir hitReact hitDirX hitDirZ staggerVX staggerVZ flashT dying deathKind deathT deathDirX deathDirZ'.split(' ');
console.log('literal', litKeys.length, litKeys.join(' '));
const lit = new Set(litKeys);
const late = []; const type = {};
for (const [n,t] of probe) if (!lit.has(n)) { late.push(n); type[n]=t; }
const staticExtra = `slowT _defenseKill bleedT bleedPart bleedPulse hopping limbless shredAcc relayCalled burnT windowClimb headshotMul fogHidden _detonated objectiveId objectiveRole fromWave guardianProgressT guardianStuckRepath guardianBestDist guardianRetreat bossRig burnDefense flameHitAt _fireSet _fireAge _shotLast _shotN _shotDmg _shotRaw _shotY _shotDX _shotDZ knockDur knockT knockCd knockSign _shotHead sonicHitT _osSid _osFull hitSide hitPart hitPartT _shotId _shotDefense _militaryRound _bruteRound _headRound threatT threatB defProgB defProgD defProgT defGiveUpT below belowSleeper sleeping _belowGone getUpT belowFallV belowRiseT belowNest belowSet barrowKing heartCalled poiGuard smashT smashTarget poiLungeT buffT lineSawBlock spitWind spitterShot spitSnap screamCd screamT dripT burnTouchT trainingZ trainingIntro trainingEntry ttSpawn sonicOpenT _sonicScreaming huntPlayer poiAwake poiWake heartGuardian`.split(/\s+/);
for (const n of staticExtra) if (!lit.has(n) && !late.includes(n)) { late.push(n); type[n]='static'; }
fs.writeFileSync('qa/2026-11-02-GB-253/late-fields.json', JSON.stringify({ litKeys, late, type }, null, 1));
console.log('late', late.length, 'total', litKeys.length + late.length);

