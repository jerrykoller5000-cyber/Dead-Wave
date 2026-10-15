import fs from 'node:fs';
import crypto from 'node:crypto';
const dir='review/training-perimeter-GP19897',hash=s=>crypto.createHash('sha256').update(s).digest('hex'),proof=[];
function edit(path,changes){const original=fs.readFileSync(path,'utf8');let s=original;const crlf=s.includes('\r\n');for(let [a,b] of changes){if(crlf){a=a.replaceAll('\n','\r\n');b=b.replaceAll('\n','\r\n');}if(s.split(a).length!==2)throw Error('Anchor not unique: '+path+' '+a.slice(0,100));s=s.replace(a,b);}if(fs.readFileSync(path,'utf8')!==original)throw Error('Changed underneath: '+path);fs.writeFileSync(dir+'/'+path.replaceAll('/','-')+'.before',original,'utf8');fs.writeFileSync(path,s,'utf8');proof.push({path,before:hash(original),after:hash(s),replacements:changes.length});}
edit('index.html',[
 ["    import { createTrainingInfirmary } from './game/training-infirmary.js';", "    import { trainingBuildBlocked } from './ui/training-build-policy.js';\n    import { createTrainingPerimeter, isTrainingBorderCell } from './game/training-perimeter.js';\n    import { createTrainingInfirmary } from './game/training-infirmary.js';"],
 ["    function setPlaceMode(mode) {",`    function trainingBuildBlockReason() {
      return trainingBuildBlocked({active:training.active,build:training.tg?.build,position:localPlayer.position,floorY:training.tg?.floorY,pending:training.deployment?.read(),alive:training.active?trainingAlive():0,recovering:!!training.wake});
    }
    function refuseTrainingBuild() {
      const reason=trainingBuildBlockReason();if(!reason)return false;
      AudioSys.invalid();showBanner(sayText('training.build.'+reason), '', 1.6, '#ffb347');return true;
    }
    function closeTrainingBuild() {
      if(wheelKind==='build')closeWheel(false);
      if(buildMode||placeMode)cancelPlaceMode();
    }
    function setPlaceMode(mode) {`],
 ["      if (mode && paused) return;", "      if (mode && paused) return;\n      if (mode && refuseTrainingBuild()) return;"],
 ["      if (kind === 'build' && nightLockdown())", "      if (kind === 'build' && refuseTrainingBuild()) return true;\n      if (kind === 'build' && nightLockdown())"],
 ["        const tb = training.tg && training.tg.build;", "        const blocked = trainingBuildBlockReason();\n        if (blocked) return sayText('training.build.' + blocked);\n        const tb = training.tg && training.tg.build;"],
 ["        if (why) return trainingBuildReason(why);", "        if (why) return why === 'outside' && isTrainingBorderCell(tb, gx != null ? gx : gridIndex(x), gz != null ? gz : gridIndex(z)) ? sayText('training.build.perimeter') : trainingBuildReason(why);"],
 ["      training.infirmaryFence.reset();", "      training.infirmaryFence.reset();\n      if (!training.perimeter) training.perimeter = createTrainingPerimeter(THREE, training.tg);\n      training.perimeter.reset();"],
 ["if (accepted) { training.release.begin(); trainingKeepPlayer(); AudioSys.trainingAlarm(); }", "if (accepted) { closeTrainingBuild(); training.release.begin(); trainingKeepPlayer(); AudioSys.trainingAlarm(); }"],
 ["      training.infirmaryFence?.keepZombie(z);", "      training.infirmaryFence?.keepZombie(z);\n      training.perimeter?.keepZombie(z);"],
 ["      const c = clampToRects(tg.walk, p.x, p.z);", "      const perimeter = !training.wake && training.perimeter?.constrain(p, playerFrameStart, PLAYER_RADIUS);\n      if (perimeter?.moved) { p.x = perimeter.x; p.z = perimeter.z; if (perimeter.blockX) velX = 0; if (perimeter.blockZ) velZ = 0; }\n      const c = clampToRects(tg.walk, p.x, p.z);"],
 ["      const tg = training.tg;\n      if (!paused && !shopOpen && !cifOpen && (!training.wake || training.wake.purge))", "      const tg = training.tg;\n      if ((buildMode || placeMode || wheelKind === 'build') && trainingBuildBlockReason()) closeTrainingBuild();\n      if (!paused && !shopOpen && !cifOpen && (!training.wake || training.wake.purge))"],
 ["      tg.cutaway?.update(camera.position, localPlayer.position, dt);", "      tg.cutaway?.update(camera.position, localPlayer.position, dt);\n      training.perimeter?.update(camera.position, localPlayer.position, dt);"]
]);
edit('world/training.js',[
 ["import { dressTrainingProps }", "import { isTrainingBorderCell } from '../game/training-perimeter.js';\nimport { dressTrainingProps }"],
 ["    // Wall-adjacent cells fit; occupied support-column cells do not.", "    // Jerry GP-19897: reserve one whole cell along every wall, including access openings."],
 ["    if (inLocalRect(gx, gz, BAY.minX, BAY.maxX, BAY.minZ, BAY.maxZ)) return 'infirmary';\n    return null;", "    if (inLocalRect(gx, gz, BAY.minX, BAY.maxX, BAY.minZ, BAY.maxZ)) return 'infirmary';\n    if (isTrainingBorderCell({minGX,maxGX,minGZ,maxGZ}, gx, gz)) return 'outside';\n    return null;"],
 ["  // The paint: one mesh of squares", `  const paintCells = gateCells.slice(), painted = new Set(gateCells.map(([x,z])=>x+','+z));
  for(let gx=minGX;gx<=maxGX;gx++)for(let gz=minGZ;gz<=maxGZ;gz++) {
    if(!isTrainingBorderCell({minGX,maxGX,minGZ,maxGZ},gx,gz)||inLocalRect(gx,gz,BAY.minX,BAY.maxX,BAY.minZ,BAY.maxZ)||painted.has(gx+','+gz))continue;
    paintCells.push([gx,gz]);
  }
  // The paint: one mesh of squares`],
 ["  if (gateCells.length) {", "  if (paintCells.length) {"],
 ["    const inZone = new Set(gateCells.map(([a, b]) => a + ',' + b));", "    const inZone = new Set(paintCells.map(([a, b]) => a + ',' + b));"],
 ["    for (const [gx, gz] of gateCells) {\n      const x0", "    for (const [gx, gz] of paintCells) {\n      const x0"],
 ["    for (const [gx, gz] of gateCells) {\n      const cx", "    for (const [gx, gz] of paintCells) {\n      const cx"]
]);
edit('ui/strings.js',[
 ['  "training.build.column": "Keep the support columns clear",','  "training.build.range": "Build mode is only available in the build room.",\n  "training.build.encounter": "Clear the zombies before building.",\n  "training.build.perimeter": "Keep the perimeter clear",\n  "training.build.column": "Keep the support columns clear",']
]);
fs.writeFileSync(dir+'/scope-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
