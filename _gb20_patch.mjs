import fs from 'fs';

const path = 'index.html';
const before = fs.statSync(path).mtimeMs;
let s = fs.readFileSync(path, 'utf8');
function must(cond, msg) { if (!cond) { console.error(msg); process.exit(1); } }

// Detect death-log loader name
const loadName = s.includes('function loadDeathLog(') ? 'loadDeathLog'
  : s.includes('function loadDeathLog(') ? 'loadDeathLog'
  : (s.includes('function loadDeathLog') ? 'loadDeathLog' : null);
must(loadName, 'loadDeathLog not found');
console.log('load fn', loadName);

// Detect publish helper
const pubName = s.includes('function publishUI(') ? 'publishUI'
  : s.includes('function emitDwGame(') ? 'emitDwGame'
  : null;
must(pubName, 'publish helper not found');
console.log('publish fn', pubName);

// Detect sample height / fade el / weapon mount from finish block
const fadeName = s.includes('cineFadeEl') ? 'cineFadeEl' : (s.includes('cineFadeEl') ? 'cineFadeEl' : 'cineFadeEl');
const sampleName = s.includes('sampleHeight(') ? 'sampleHeight' : 'sampleHeight';
const weaponName = s.includes('weaponMount.visible') ? 'weaponMount' : 'weaponMount';
console.log({ fadeName, sampleName, weaponName });

const beginHead = 'function beginScriptedKill(kind, cave) {\r\n      if (scriptedKill || cine || gameOver || won || !gameStarted) return;';
must(s.includes(beginHead), 'begin head not found');
s = s.replace(beginHead, 'function beginScriptedKill(kind, cave, opts) {\r\n      const replay = !!(opts && opts.replay);\r\n      if (scriptedKill || cine) return;\r\n      if (!replay && (gameOver || won || !gameStarted)) return;');

const causeAssign = "      lastDeathCause = kind === 'cave' ? 'caveguard' : 'tentacles';\r\n      lastDeathPlace = kind === 'cave' ? cave.name : 'Underwater Pit';";
must(s.includes(causeAssign), 'cause assign not found');
s = s.replace(causeAssign, '      if (!replay) {\r\n' + causeAssign + '\r\n      }');

const assign = 'scriptedKill = sk;\r\n      updateScriptedKillRig(0);';
must(s.includes(assign), 'assign not found');
s = s.replace(assign, `if (replay) {\r\n        sk.replay = true;\r\n        sk.replayId = (opts && opts.replayId) || (kind === 'cave' ? 'cave' : 'tentacle');\r\n        sk.restore = snapshotScriptedDeathReplay();\r\n        for (const z of zombies) {\r\n          if (z.mesh) { sk.restore.zombieVis.push({ z, vis: !!z.mesh.visible }); z.mesh.visible = false; }\r\n        }\r\n      }\r\n      scriptedKill = sk;\r\n      updateScriptedKillRig(0);`);

const finishRe = /function finishScriptedKill\(\) \{\r\n[\s\S]*?\r\n    function abortScriptedKill\(\) \{\r\n[\s\S]*?\r\n    \}/;
must(finishRe.test(s), 'finish/abort block not found');
s = s.replace(finishRe, `function finishScriptedKill() {\r\n      const sk = cleanupScriptedKill();\r\n      if (!sk) return;\r\n      if (sk.replay) {\r\n        applyScriptedDeathReplayRestore(sk.restore);\r\n        ${pubName}('scripted-death-replay', { id: sk.replayId, phase: 'end' });\r\n        return;\r\n      }\r\n      // For the cave: leave the body where it was thrown. For the lake it stays afloat\r\n      // over the hole; the burial scene parks the (hidden) player somewhere sensible.\r\n      if (sk.kind === 'cave' && sk.landAt) { player.position.copy(sk.landAt); player.position.y = ${sampleName}(sk.landAt.x, sk.landAt.z); }\r\n      playerHp = 0;\r\n      updateHpHud();\r\n      endGame(false);\r\n      // Hand off already faded: the burial cine starts at its own black and fades in\r\n      // on the grave, so the cut is black-to-black.\r\n      if (cine) { cine.t = Math.max(cine.t, CINE.black - 0.01); if (${fadeName}) ${fadeName}.style.opacity = '1'; }\r\n    }\r\n    function abortScriptedKill() {\r\n      const sk = scriptedKill;\r\n      const wasReplay = !!(sk && sk.replay);\r\n      const restore = sk && sk.restore;\r\n      const replayId = sk && sk.replayId;\r\n      // resetGame / mode change while the scene ran: put everything back, no death.\r\n      if (cleanupScriptedKill() && !cine) {\r\n        document.body.classList.remove('cine', 'cinebars');\r\n        if (${fadeName}) ${fadeName}.style.opacity = '0';\r\n      }\r\n      if (wasReplay && restore) {\r\n        applyScriptedDeathReplayRestore(restore);\r\n        ${pubName}('scripted-death-replay', { id: replayId, phase: 'abort' });\r\n      }\r\n    }`);

must(!s.includes('function listScriptedDeathReplays'), 'API already present');
const checkMark = 'function checkScriptedKillTriggers(dt) {';
must(s.includes(checkMark), 'check triggers not found');

const api = `
    // === GB-20 / D-18: scripted-death replays (combat side) ==================
    // ChatGPT owns Watch-again chrome (GP-13). Combat owns cine + state freeze.
    const SCRIPTED_DEATH_REPLAYS = [
      { id: 'cave', causeKey: 'caveguard', labelKey: 'replay.cave.title', descriptionKey: 'replay.cave.blurb' },
      { id: 'tentacle', causeKey: 'tentacles', labelKey: 'replay.tentacle.title', descriptionKey: 'replay.tentacle.blurb' }
    ];
    function snapshotScriptedDeathReplay() {
      return {
        playerPos: player.position.clone(),
        camPos: camera.position.clone(),
        look: camLook.clone(),
        bodyCine: document.body.classList.contains('cine'),
        bodyBars: document.body.classList.contains('cinebars'),
        weaponVis: ${weaponName}.visible,
        marineVis: marine.visible,
        fade: ${fadeName} ? String(${fadeName}.style.opacity || '0') : '0',
        lastDeathCause,
        lastDeathPlace,
        playerHp,
        zombieVis: []
      };
    }
    function applyScriptedDeathReplayRestore(r) {
      if (!r) return;
      player.position.copy(r.playerPos);
      camera.position.copy(r.camPos);
      camLook.copy(r.look);
      document.body.classList.toggle('cine', !!r.bodyCine);
      document.body.classList.toggle('cinebars', !!r.bodyBars);
      ${weaponName}.visible = !!r.weaponVis;
      marine.visible = !!r.marineVis;
      if (${fadeName}) ${fadeName}.style.opacity = r.fade;
      lastDeathCause = r.lastDeathCause;
      lastDeathPlace = r.lastDeathPlace;
      playerHp = r.playerHp;
      updateHpHud();
      for (const row of r.zombieVis || []) {
        if (row.z && row.z.mesh) row.z.mesh.visible = !!row.vis;
      }
      velX = velZ = 0; vy = 0;
    }
    function listScriptedDeathReplays() {
      const seen = ${loadName}();
      return SCRIPTED_DEATH_REPLAYS.map((r) => ({
        id: r.id,
        causeKey: r.causeKey,
        unlocked: seen.indexOf(r.causeKey) >= 0,
        labelKey: r.labelKey,
        descriptionKey: r.descriptionKey
      }));
    }
    function isScriptedDeathReplay() {
      return !!(scriptedKill && scriptedKill.replay);
    }
    function canReplayScriptedDeath(id) {
      const meta = SCRIPTED_DEATH_REPLAYS.find((r) => r.id === id);
      if (!meta) return false;
      if (${loadName}().indexOf(meta.causeKey) < 0) return false;
      if (scriptedKill || cine) return false;
      if (won) return false;
      if (gameStarted && !gameOver) return false;
      return true;
    }
    function pickScriptedDeathReplayCave(opts) {
      if (opts && opts.caveIndex != null && POI.caves[opts.caveIndex]) return POI.caves[opts.caveIndex];
      if (lastDeathPlace) {
        const byName = POI.caves.find((c) => c && c.name === lastDeathPlace);
        if (byName) return byName;
      }
      return POI.caves.find((c) => c && c.theme === 'chalk') || POI.caves[0] || null;
    }
    function beginScriptedDeathReplay(id, opts) {
      if (id !== 'cave' && id !== 'tentacle') return { ok: false, reason: 'unknown' };
      if (scriptedKill || cine) return { ok: false, reason: 'busy' };
      if (won || (gameStarted && !gameOver)) return { ok: false, reason: 'alive' };
      const meta = SCRIPTED_DEATH_REPLAYS.find((r) => r.id === id);
      if (!meta || ${loadName}().indexOf(meta.causeKey) < 0) return { ok: false, reason: 'locked' };
      const kind = id === 'cave' ? 'cave' : 'tentacle';
      const cave = kind === 'cave' ? pickScriptedDeathReplayCave(opts || {}) : null;
      if (kind === 'cave' && !cave) return { ok: false, reason: 'unknown' };
      beginScriptedKill(kind, cave, { replay: true, replayId: id });
      if (!scriptedKill || !scriptedKill.replay) return { ok: false, reason: 'busy' };
      ${pubName}('scripted-death-replay', { id, phase: 'start' });
      return { ok: true };
    }

`.replace(/\n/g, '\r\n');

s = s.replace(checkMark, api + checkMark);

const expOld = 'beginScriptedKill, finishScriptedKill, getScriptedKill: () => scriptedKill, getDeathCause: () => lastDeathCause, loadDeathLog, nearCave,';
must(s.includes(expOld), 'export list not found');
s = s.replace(expOld, 'beginScriptedKill, finishScriptedKill, abortScriptedKill, listScriptedDeathReplays, canReplayScriptedDeath, beginScriptedDeathReplay, isScriptedDeathReplay, getScriptedKill: () => scriptedKill, getDeathCause: () => lastDeathCause, loadDeathLog, nearCave,');

const after = fs.statSync(path).mtimeMs;
must(after === before, 'file changed under us');
fs.writeFileSync(path, s);
console.log('patched index.html ok');
