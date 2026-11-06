import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Use the shared game-test slot (crew.mjs slot run)');
}

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.join(ROOT, 'qa/2026-11-06-AG-240');
const REVIEW_DIR = path.join(ROOT, 'review/AG-240');
const LIB_JS_PATH = path.join(ROOT, 'tools/tests/lib.js');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(REVIEW_DIR, { recursive: true });

async function captureFile(page, filename) {
  const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
  const params = {
    format: isJpg ? 'jpeg' : 'png',
    captureBeyondViewport: false,
  };
  if (isJpg) params.quality = 92;
  const shot = await page.send('Page.captureScreenshot', params);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  console.log(`[AG-240] Saved screenshot: ${filename}`);
  return outPath;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function classifySound(entry) {
  const text = `${entry.kind || ''} ${entry.name || ''} ${entry.file || ''}`.toLowerCase();
  const flags = [];
  if (/chain/i.test(text)) flags.push('CHAIN');
  if (/jingle/i.test(text)) flags.push('JINGLE');
  if (/glass/i.test(text)) flags.push('GLASS');
  if (/metal|clink/i.test(text)) flags.push('METAL_CLINK');
  if (/rattle/i.test(text)) flags.push('RATTLE');
  if (/gravel/i.test(text)) flags.push('GRAVEL');
  if (/grass/i.test(text)) flags.push('GRASS');
  return flags.length ? flags.join('|') : 'NONE';
}

function summarizeList(list, durationS) {
  const map = new Map();
  for (const item of list) {
    const key = `${item.kind}:${item.name || '?'}:${item.file || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        kind: item.kind,
        name: item.name,
        file: item.file,
        v: item.v,
        count: 0,
        classification: classifySound(item),
        bus: (item.name && item.name.startsWith('world/')) ? 'amb' : (item.name && item.name.startsWith('music')) ? 'music' : 'fx',
      });
    }
    map.get(key).count += 1;
  }
  const items = [...map.values()].map((entry) => ({
    ...entry,
    ratePerSec: +(entry.count / (durationS || 20)).toFixed(2),
  })).sort((a, b) => b.count - a.count);
  return items;
}

// Injected before page loads: intercepts WebAudio destination and captures master stream
const AUDIO_HOOK_SCRIPT = `
  window.__audioRecorder = {
    ctx: null,
    streamDest: null,
    scriptProc: null,
    masterNode: null,
    mediaRecorder: null,
    chunks: [],
    pcmL: [],
    pcmR: [],
    isRecording: false,
    sampleRate: 48000,
  };

  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC) {
    window.AudioContext = class extends OrigAC {
      constructor(...args) {
        super(...args);
        window.__audioRecorder.ctx = this;
        window.__audioRecorder.sampleRate = this.sampleRate;
        try {
          window.__audioRecorder.streamDest = this.createMediaStreamDestination();
        } catch (e) {
          console.error('Failed createMediaStreamDestination:', e);
        }
      }
    };
    window.webkitAudioContext = window.AudioContext;
  }

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(dest, ...rest) {
    if (dest && this.context && dest === this.context.destination) {
      if (!window.__audioRecorder.masterNode) {
        window.__audioRecorder.masterNode = this;
      }
      if (window.__audioRecorder.streamDest) {
        try {
          origConnect.call(this, window.__audioRecorder.streamDest);
        } catch (_) {}
      }
      if (!window.__audioRecorder.scriptProc) {
        try {
          const sp = this.context.createScriptProcessor(4096, 2, 2);
          window.__audioRecorder.scriptProc = sp;
          sp.onaudioprocess = (e) => {
            if (window.__audioRecorder.isRecording) {
              const inL = e.inputBuffer.getChannelData(0);
              const inR = e.inputBuffer.getChannelData(1);
              window.__audioRecorder.pcmL.push(new Float32Array(inL));
              window.__audioRecorder.pcmR.push(new Float32Array(inR));
            }
          };
          origConnect.call(this, sp);
          const silent = this.context.createGain();
          silent.gain.value = 0;
          origConnect.call(sp, silent);
          origConnect.call(silent, this.context.destination);
        } catch (_) {}
      }
    }
    return origConnect.call(this, dest, ...rest);
  };
`;

const INJECTED_HELPERS = `
  window.__ag240 = {
    setupKeys() {
      this.key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    },

    startAudioRec() {
      const rec = window.__audioRecorder;
      rec.chunks = [];
      rec.pcmL = [];
      rec.pcmR = [];
      rec.isRecording = true;

      if (rec.streamDest && typeof MediaRecorder !== 'undefined') {
        try {
          const mr = new MediaRecorder(rec.streamDest.stream);
          rec.mediaRecorder = mr;
          mr.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) rec.chunks.push(e.data);
          };
          mr.start(100);
        } catch (e) {
          console.warn('MediaRecorder error:', e);
        }
      }
    },

    async stopAudioRec() {
      const rec = window.__audioRecorder;
      rec.isRecording = false;

      let mrBlob = null;
      if (rec.mediaRecorder && rec.mediaRecorder.state !== 'inactive') {
        await new Promise((res) => {
          rec.mediaRecorder.onstop = () => res();
          rec.mediaRecorder.stop();
        });
        mrBlob = new Blob(rec.chunks, { type: rec.mediaRecorder.mimeType });
      }

      const ctx = rec.ctx;
      const sr = ctx ? ctx.sampleRate : rec.sampleRate || 48000;

      let audioBuf = null;
      if (mrBlob && mrBlob.size > 0 && ctx) {
        try {
          const ab = await mrBlob.arrayBuffer();
          audioBuf = await ctx.decodeAudioData(ab);
        } catch (e) {
          console.warn('decodeAudioData fallback:', e);
        }
      }

      let flatL, flatR;
      if (audioBuf) {
        flatL = audioBuf.getChannelData(0);
        flatR = audioBuf.numberOfChannels > 1 ? audioBuf.getChannelData(1) : flatL;
      } else {
        const total = rec.pcmL.reduce((sum, c) => sum + c.length, 0);
        flatL = new Float32Array(total);
        flatR = new Float32Array(total);
        let off = 0;
        for (let i = 0; i < rec.pcmL.length; i++) {
          flatL.set(rec.pcmL[i], off);
          flatR.set(rec.pcmR[i], off);
          off += rec.pcmL[i].length;
        }
      }

      const numChannels = 2;
      const totalSamples = flatL.length;
      const bytesPerSample = 2;
      const blockAlign = numChannels * bytesPerSample;
      const byteRate = sr * blockAlign;
      const dataSize = totalSamples * blockAlign;
      const buf = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buf);

      function writeStr(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }

      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sr, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, dataSize, true);

      let offset = 44;
      for (let i = 0; i < totalSamples; i++) {
        let sL = Math.max(-1, Math.min(1, flatL[i]));
        let sR = Math.max(-1, Math.min(1, flatR[i]));
        view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7FFF, true);
        view.setInt16(offset + 2, sR < 0 ? sR * 0x8000 : sR * 0x7FFF, true);
        offset += 4;
      }

      const u8 = new Uint8Array(buf);
      let bin = '';
      const chunkSz = 0x8000;
      for (let i = 0; i < u8.length; i += chunkSz) {
        bin += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSz));
      }

      return {
        base64: btoa(bin),
        durationS: +(totalSamples / sr).toFixed(2),
        sampleRate: sr,
        totalSamples,
        method: audioBuf ? 'MediaRecorder+decodeAudioData' : 'ScriptProcessorDirectPCM',
      };
    },

    async startLeg(isRun) {
      const T = window.TT;
      const A = T.AudioSys;
      if (T.setViewFirstDbg) T.setViewFirstDbg(true);
      if (A.unlock) A.unlock();
      if (A.setMuted) A.setMuted(false);
      if (A.takesInit) await A.takesInit();

      // Waypoints along trail outside FOB Threshold
      const p0 = { x: 38, z: -19 };
      const p1 = { x: 6, z: -8 };
      const tyawFwd = Math.atan2(p1.x - p0.x, p1.z - p0.z);
      const tyawRev = tyawFwd + Math.PI;
      const gy = T.sampleHeight(22, -13.5);
      T.player.position.set(22, gy, -13.5);

      this.state = {
        isRun,
        dir: 1,
        p0,
        p1,
        tyawFwd,
        tyawRev,
        curYaw: tyawFwd,
        reversals: 0,
        totalDist: 0,
        lastPos: { x: T.player.position.x, y: T.player.position.y, z: T.player.position.z },
        t0: performance.now(),
      };

      T.player.rotation.y = tyawFwd;
      T.setAimYawDbg(tyawFwd);
      T.setOtsAimDbg(tyawFwd, 0);
      T.setVelDbg(0, 0);

      A.traceDbg(true);
      this.key('keydown', 'KeyW');
      if (isRun) this.key('keydown', 'ShiftLeft');
    },

    async stepLeg(durationMs) {
      const T = window.TT;
      const st = this.state;
      const tEnd = performance.now() + durationMs;
      while (performance.now() < tEnd) {
        await new Promise((r) => setTimeout(r, 40));
        const px = T.player.position.x, pz = T.player.position.z;
        const dStep = Math.hypot(px - st.lastPos.x, pz - st.lastPos.z);
        st.totalDist += dStep;
        st.lastPos = { x: px, y: T.player.position.y, z: pz };

        const dToP1 = Math.hypot(px - st.p1.x, pz - st.p1.z);
        const dToP0 = Math.hypot(px - st.p0.x, pz - st.p0.z);
        if (st.dir > 0 && dToP1 < 3.5) {
          st.dir = -1;
          st.curYaw = st.tyawRev;
          st.reversals++;
        } else if (st.dir < 0 && dToP0 < 3.5) {
          st.dir = 1;
          st.curYaw = st.tyawFwd;
          st.reversals++;
        }
        T.player.rotation.y = st.curYaw;
        T.setAimYawDbg(st.curYaw);
        T.setOtsAimDbg(st.curYaw, 0);
      }
    },

    stopLeg() {
      const T = window.TT;
      const A = T.AudioSys;
      const st = this.state;
      this.key('keyup', 'KeyW');
      if (st.isRun) this.key('keyup', 'ShiftLeft');
      T.setVelDbg(0, 0);

      const traceList = A.traceDbg(false);
      const elapsedS = +((performance.now() - st.t0) / 1000).toFixed(3);

      let distPath = null;
      let groundType = null;
      try {
        if (T.rabbitDbg && T.rabbitDbg.distToPath) {
          distPath = +T.rabbitDbg.distToPath(T.player.position.x, T.player.position.z).toFixed(3);
        }
        if (T.stepGround) groundType = T.stepGround();
      } catch (_) {}

      return {
        traceList,
        elapsedS,
        totalDist: +st.totalDist.toFixed(2),
        avgSpeed: +(st.totalDist / elapsedS).toFixed(2),
        reversals: st.reversals,
        finalPos: [+T.player.position.x.toFixed(2), +T.player.position.y.toFixed(2), +T.player.position.z.toFixed(2)],
        distToPath: distPath,
        groundType,
        isTraining: !!(T.trainingDbg && T.trainingDbg.state().active),
        viewFirst: !!(T.fpDbg && T.fpDbg().first),
      };
    },

    testSurfaces() {
      const T = window.TT;
      const A = T.AudioSys;
      const results = {};
      const surfaces = [
        { label: 'stone_walk', wet: false, run: false, ground: 'stone' },
        { label: 'stone_run', wet: false, run: true, ground: 'stone' },
        { label: 'metal_walk', wet: false, run: false, ground: 'metal' },
        { label: 'metal_run', wet: false, run: true, ground: 'metal' },
        { label: 'leaves_walk', wet: false, run: false, ground: 'leaves' },
        { label: 'leaves_run', wet: false, run: true, ground: 'leaves' },
        { label: 'water_walk', wet: true, run: false, ground: null },
        { label: 'water_run', wet: true, run: true, ground: null },
        { label: 'dirt_walk', wet: false, run: false, ground: null },
        { label: 'dirt_run', wet: false, run: true, ground: null },
      ];

      for (const s of surfaces) {
        A.traceDbg(true);
        A.footstep(s.wet, s.run, s.ground);
        const list = A.traceDbg(false);
        results[s.label] = list;
      }
      return results;
    }
  };
`;

async function runSession(page, conditionKey, conditionUrl, libCode) {
  console.log(`\n========================================================================`);
  console.log(`=== RUNNING CONDITION: ${conditionKey.toUpperCase()} (${conditionUrl}) ===`);
  console.log(`========================================================================`);

  console.log(`[AG-240] Navigating to ${conditionUrl}...`);
  await page.goto(conditionUrl, { timeout: 180000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 180000 }))) {
    throw new Error('window.TT never appeared: ' + (page.errors[0] || ''));
  }

  // Dismiss opening cine
  await page.evaluate(`(() => {
    if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting();
    else if (window.DWOpening && typeof DWOpening.skip === 'function') DWOpening.skip();
  })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });

  await page.evaluate(libCode);
  await page.evaluate(INJECTED_HELPERS);
  await page.evaluate(`window.__ag240.setupKeys()`);

  console.log(`[AG-240] Starting match as JERRY for ${conditionKey}...`);
  await page.evaluate(`(async () => {
    await startMatch(window.TT, 'JERRY');
  })()`, 120000);

  // Stabilize match
  await page.evaluate(`(() => {
    const T = window.TT;
    if (T.clearZombies) T.clearZombies();
    T.setHp(1e5);
    if (T.setWorldTime) T.setWorldTime(12);
  })()`);
  await wait(1500);

  // Leg 1: Walk 20 s
  console.log(`\n>>> [${conditionKey}] Leg 1: Walk (20 s) on trail outside Threshold (First Person)...`);
  await page.evaluate(`window.__ag240.startLeg(false)`);
  // Warm up stride for 5s
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  console.log(`  [${conditionKey}] Starting 10s audio recording during walk...`);
  await page.evaluate(`window.__ag240.startAudioRec()`);
  // Step 5s while recording
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  // Capture screenshot at t=10s
  const walkShotFile = `trail-fp-walk-${conditionKey}.jpg`;
  await captureFile(page, walkShotFile);
  // Step 5s more while recording
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  console.log(`  [${conditionKey}] Stopping 10s audio recording during walk...`);
  const walkAudioRes = await page.evaluate(`window.__ag240.stopAudioRec()`);
  // Step final 5s
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  const walkLegRes = await page.evaluate(`window.__ag240.stopLeg()`);

  // Save WAV
  const walkWavFilename = `trail-walk-${conditionKey}.wav`;
  const walkWavPath = path.join(REVIEW_DIR, walkWavFilename);
  fs.writeFileSync(walkWavPath, Buffer.from(walkAudioRes.base64, 'base64'));
  console.log(`  [${conditionKey}] Saved audio: ${walkWavFilename} (${walkAudioRes.durationS} s, ${walkAudioRes.sampleRate} Hz, method=${walkAudioRes.method})`);

  console.log(`  [${conditionKey} Walk Done] Moved ${walkLegRes.totalDist} m in ${walkLegRes.elapsedS} s (${walkLegRes.avgSpeed} m/s, ${walkLegRes.reversals} reversals, distToPath=${walkLegRes.distToPath} m), ${walkLegRes.traceList.length} sound events`);

  await wait(1500);

  // Leg 2: Run 20 s
  console.log(`\n>>> [${conditionKey}] Leg 2: Run (20 s) on trail outside Threshold (First Person)...`);
  await page.evaluate(`window.__ag240.startLeg(true)`);
  // Warm up sprint for 5s
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  console.log(`  [${conditionKey}] Starting 10s audio recording during run...`);
  await page.evaluate(`window.__ag240.startAudioRec()`);
  // Step 5s while recording
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  // Capture screenshot at t=10s
  const runShotFile = `trail-fp-run-${conditionKey}.jpg`;
  await captureFile(page, runShotFile);
  // Step 5s more while recording
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  console.log(`  [${conditionKey}] Stopping 10s audio recording during run...`);
  const runAudioRes = await page.evaluate(`window.__ag240.stopAudioRec()`);
  // Step final 5s
  await page.evaluate(`window.__ag240.stepLeg(5000)`);
  const runLegRes = await page.evaluate(`window.__ag240.stopLeg()`);

  // Save WAV
  const runWavFilename = `trail-run-${conditionKey}.wav`;
  const runWavPath = path.join(REVIEW_DIR, runWavFilename);
  fs.writeFileSync(runWavPath, Buffer.from(runAudioRes.base64, 'base64'));
  console.log(`  [${conditionKey}] Saved audio: ${runWavFilename} (${runAudioRes.durationS} s, ${runAudioRes.sampleRate} Hz, method=${runAudioRes.method})`);

  console.log(`  [${conditionKey} Run Done] Moved ${runLegRes.totalDist} m in ${runLegRes.elapsedS} s (${runLegRes.avgSpeed} m/s, ${runLegRes.reversals} reversals, distToPath=${runLegRes.distToPath} m), ${runLegRes.traceList.length} sound events`);

  await wait(1000);

  // Surface tests
  console.log(`\n>>> [${conditionKey}] Running surface checks (stone, metal, leaves, water, dirt)...`);
  const surfaceResults = await page.evaluate(`window.__ag240.testSurfaces()`);
  console.log(`  [${conditionKey}] Surface test completed for 10 variants.`);

  return {
    walk: walkLegRes,
    run: runLegRes,
    walkAudio: {
      file: walkWavFilename,
      durationS: walkAudioRes.durationS,
      sampleRate: walkAudioRes.sampleRate,
      method: walkAudioRes.method,
    },
    runAudio: {
      file: runWavFilename,
      durationS: runAudioRes.durationS,
      sampleRate: runAudioRes.sampleRate,
      method: runAudioRes.method,
    },
    walkSummary: summarizeList(walkLegRes.traceList, walkLegRes.elapsedS),
    runSummary: summarizeList(runLegRes.traceList, runLegRes.elapsedS),
    surfaces: surfaceResults,
  };
}

async function main() {
  console.log('======================================================================================');
  console.log('=== [AG-240] The footstep A/B, his way (CL-295)                                    ===');
  console.log('======================================================================================\n');

  const telemetry = {
    timestamp: new Date().toISOString(),
    agent: 'antigravity',
    task: 'AG-240',
    conditions: {},
    comparison: {},
  };

  const server = await serve(ROOT, 0);
  const urlAsIs = `${server.origin}/index.html?solid=1&debug=1&raf=timer`;
  const urlGrass = `${server.origin}/index.html?solid=1&debug=1&raf=timer&steps=grass`;

  console.log('[AG-240] Server running at:', server.origin);
  console.log('[AG-240] Condition A (As-Is):', urlAsIs);
  console.log('[AG-240] Condition B (?steps=grass):', urlGrass);

  const browser = await launch({
    headless: false,
    args: [
      '--window-position=-2400,-2400',
      '--window-size=1920,1080',
      '--disable-features=CalculateNativeWinOcclusion',
    ],
  });

  try {
    // Session 1: As-Is (Default Gravel)
    console.log('\n--- CREATING PAGE FOR CONDITION A (AS-IS) ---');
    const pageA = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await pageA.send('Browser.getWindowForTarget', {});
      await pageA.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }
    await pageA.send('Page.addScriptToEvaluateOnNewDocument', { source: AUDIO_HOOK_SCRIPT });

    const libCode = fs.readFileSync(LIB_JS_PATH, 'utf8');
    telemetry.conditions.asis = await runSession(pageA, 'asis', urlAsIs, libCode);

    // Save interim telemetry
    const telemetryPath = path.join(OUT_DIR, 'telemetry.json');
    fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');

    // Close pageA cleanly
    console.log('[AG-240] Closing Condition A page...');
    await pageA.close().catch(() => {});
    await wait(2000);

    // Session 2: ?steps=grass (Soft Grass on Dirt)
    console.log('\n--- CREATING PAGE FOR CONDITION B (?STEPS=GRASS) ---');
    const pageB = await browser.newPage({ width: 1920, height: 1080 });
    try {
      const { windowId } = await pageB.send('Browser.getWindowForTarget', {});
      await pageB.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } });
    } catch { /* keep existing bounds */ }
    await pageB.send('Page.addScriptToEvaluateOnNewDocument', { source: AUDIO_HOOK_SCRIPT });

    telemetry.conditions.grass = await runSession(pageB, 'grass', urlGrass, libCode);

    console.log('[AG-240] Closing Condition B page...');
    await pageB.close().catch(() => {});

    // Build unified comparison tables
    function buildComparisonTable(walkAsIs, walkGrass, runAsIs, runGrass) {
      const combined = new Map();
      const add = (list, colName) => {
        for (const it of list) {
          const key = `${it.kind}|${it.name || '?'}|${it.file || ''}`;
          if (!combined.has(key)) {
            combined.set(key, {
              kind: it.kind,
              name: it.name,
              file: it.file,
              bus: (it.name && it.name.startsWith('world/')) ? 'amb' : (it.name && it.name.startsWith('music')) ? 'music' : 'fx',
              classification: classifySound(it),
              walkAsIs: 0,
              runAsIs: 0,
              walkGrass: 0,
              runGrass: 0,
            });
          }
          combined.get(key)[colName] += 1;
        }
      };

      add(walkAsIs, 'walkAsIs');
      add(runAsIs, 'runAsIs');
      add(walkGrass, 'walkGrass');
      add(runGrass, 'runGrass');

      return [...combined.values()].sort((a, b) => {
        const totA = a.walkAsIs + a.runAsIs + a.walkGrass + a.runGrass;
        const totB = b.walkAsIs + b.runAsIs + b.walkGrass + b.runGrass;
        return totB - totA;
      });
    }

    telemetry.comparison.footsteps = buildComparisonTable(
      telemetry.conditions.asis.walk.traceList,
      telemetry.conditions.grass.walk.traceList,
      telemetry.conditions.asis.run.traceList,
      telemetry.conditions.grass.run.traceList
    );

    // Save final telemetry JSON
    fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2), 'utf8');
    console.log(`\n[AG-240] Wrote full telemetry to: ${telemetryPath}`);

    // Create side-by-side WAV files for convenience
    try {
      const parseWav = (buf) => {
        const numChannels = buf.readUInt16LE(22);
        const sampleRate = buf.readUInt32LE(24);
        const data = buf.subarray(44);
        return { numChannels, sampleRate, data };
      };

      const wAsIs = parseWav(fs.readFileSync(path.join(REVIEW_DIR, 'trail-walk-asis.wav')));
      const wGrass = parseWav(fs.readFileSync(path.join(REVIEW_DIR, 'trail-walk-grass.wav')));
      const rAsIs = parseWav(fs.readFileSync(path.join(REVIEW_DIR, 'trail-run-asis.wav')));
      const rGrass = parseWav(fs.readFileSync(path.join(REVIEW_DIR, 'trail-run-grass.wav')));

      function concatWav(wav1, wav2, pauseSec = 0.6) {
        const sr = wav1.sampleRate;
        const pauseBytes = Math.floor(sr * pauseSec) * 4;
        const pauseBuf = Buffer.alloc(pauseBytes);

        const takeBytes1 = Math.min(wav1.data.length, sr * 5 * 4);
        const takeBytes2 = Math.min(wav2.data.length, sr * 5 * 4);

        const data1 = wav1.data.subarray(0, takeBytes1);
        const data2 = wav2.data.subarray(0, takeBytes2);

        const combinedData = Buffer.concat([data1, pauseBuf, data2]);
        const dataSize = combinedData.length;

        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + dataSize, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20); // PCM
        header.writeUInt16LE(2, 22); // stereo
        header.writeUInt32LE(sr, 24);
        header.writeUInt32LE(sr * 4, 28);
        header.writeUInt16LE(4, 32);
        header.writeUInt16LE(16, 34);
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);

        return Buffer.concat([header, combinedData]);
      }

      fs.writeFileSync(path.join(REVIEW_DIR, 'side-by-side-walk.wav'), concatWav(wAsIs, wGrass, 0.6));
      console.log('[AG-240] Created side-by-side comparison: review/AG-240/side-by-side-walk.wav');
      fs.writeFileSync(path.join(REVIEW_DIR, 'side-by-side-run.wav'), concatWav(rAsIs, rGrass, 0.6));
      console.log('[AG-240] Created side-by-side comparison: review/AG-240/side-by-side-run.wav');
    } catch (e) {
      console.warn('[AG-240] Could not create combined comparison WAVs:', e);
    }

    console.log('\n[AG-240] Running build-sheets.py to render composite sheet...');
    const pythonProc = spawn('python', [path.join(OUT_DIR, 'build-sheets.py')], { stdio: 'inherit' });
    await new Promise((res) => pythonProc.on('close', res));

    console.log('\n[AG-240] All 4 runs, audio captures, telemetry, and contact sheet completed successfully.');
  } finally {
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error('[AG-240] Fatal error:', err);
  process.exit(1);
});
