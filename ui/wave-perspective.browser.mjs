// Run through crew.mjs slot run. An optional baseline HTML path records the old views.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { IdleProofCamera } from '../review/GP-20218/proof-camera.mjs';
import { enableReviewPhotos } from '../review/GU-9/held-photo.mjs';

assert(process.env.DW_GAME_TEST_TOKEN, 'A game-test lease is required');
async function exercise() {
  const T = window.TT, p = T.player.position, A = T.AudioSys;
  const training = T.trainingDbg.state().active;
  T.flightHold(true);
  T.setWorldTime(.5);
  T.setPrepTimer(999);
  T.clearZombies();
  A.setMuted(false);
  A.unlock();
  const step = (n = 1) => { for (let i = 0; i < n; i++) T.stepFrame(.05); };
  const select = first => {
    T.setViewFirstDbg(first);
    step(12);
    T.setOtsAimDbg(0, -.02);
    step(14);
    for (let i = 0; i < 40 && T.fpDbg().w !== Number(first); i++) step();
  };
  const sample = () => {
    const fp = T.fpDbg(), camera = T.camera.position;
    return { selected: fp.first, weight: fp.w, headHidden: fp.headHidden,
      eyeGap: fp.eye && camera.distanceTo(fp.eye), ads: fp.ads,
      playerGap: camera.distanceTo(p), camera: camera.toArray(), weapon: T.vmStateDbg().want };
  };
  const rows = {};
  if (!training) {
    const land = p.clone();
    const h = T.LAKE_HOLE, x = h.x + h.grabR + 6.5, z = h.z;
    const surface = T.sampleHeight(x,z) + T.waterDepthAt(x,z);
    select(true);
    T.setZoomHeldDbg(true);
    step(12);
    p.set(x,surface-1.25,z);
    T.setVelDbg(0,0);
    step();
    rows.entry = sample();
    step(25);
    rows.swimFirst = { ...sample(), surfaceGap: T.camera.position.y - surface };
    await window.guCapture('swim-first');
    const heading = T.camera.getWorldDirection(new T.THREE.Vector3());
    T.otsLook(80,-12);
    step();
    rows.swimFirst.lookTurn = heading.angleTo(T.camera.getWorldDirection(new T.THREE.Vector3()));
    const start = p.clone();
    document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
    step(6);
    document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));
    rows.stroke = { ...sample(), distance: p.distanceTo(start), depth: T.waterDepthAt(p.x,p.z) };
    T.setZoomHeldDbg(false);
    select(false);
    rows.swimThird = sample();
    await window.guCapture('swim-third');
    select(true);
    rows.toggleInWater = sample();
    p.copy(land);
    T.setVelDbg(0,0);
    step(20);
    rows.shore = sample();
  }
  let clearEvents = 0, practiceCues = 0;
  const tracks = [];
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function(...args) {
    if (this.src) tracks.push(new URL(this.src,location.href).pathname);
    return play.apply(this,args);
  };
  const onEvent = e => { if (e.detail?.type === 'wave-last-kill') clearEvents++; };
  const originalCue = A.trainingCue;
  const pitches = [];
  const start = AudioScheduledSourceNode.prototype.start;
  A.trainingCue = function(kind, ...rest) {
    if (kind !== 'wave-clear') return originalCue.call(this, kind, ...rest);
    practiceCues++;
    AudioScheduledSourceNode.prototype.start = function(...times) {
      if (this instanceof OscillatorNode) pitches.push(this.frequency.value);
      return start.apply(this,times);
    };
    try { return originalCue.call(this, kind, ...rest); }
    finally { AudioScheduledSourceNode.prototype.start = start; }
  };
  window.addEventListener('dw-game', onEvent);
  try {
    for (const first of [true, false]) {
      if (!training) { T.beginWave(); T.drainWavePlanDbg(); }
      T.clearZombies();
      if (training) T.trainingDbg.deployNow('shambler',2);
      else {
        for (const dx of [5,7]) T.spawnZombie(p.x+dx,p.z+12,'shambler',true,true);
      }
      select(first);
      const anchor = T.camera.position.clone();
      const [one, last] = T.zombies.filter(z => z.alive);
      const kill = z => T.killZombie(z,true,{kind:'bullet',dir:{x:1,z:0}});
      const eventsBefore = clearEvents, cuesBefore = practiceCues;
      kill(one);
      const early = !!T.getWaveFinisher() || clearEvents !== eventsBefore || practiceCues !== cuesBefore;
      tracks.length = 0;
      pitches.length = 0;
      kill(last);
      const finisher = T.getWaveFinisher();
      if (!finisher) throw Error('Final kill did not start the finisher: '+JSON.stringify({
        first, training, phase: T.getPhase(), living: T.zombies.filter(z=>z.alive).length,
        practiceTarget: !!last.trainingZ
      }));
      const flash = document.getElementById('waveFinisherFlash');
      const animation = flash.getAnimations()[0];
      animation.pause();
      animation.currentTime = animation.effect.getTiming().duration * .12;
      for (let i = 0; i < 15; i++) {
        finisher.t0 = performance.now() - (100 + i * 50);
        step();
      }
      const key = first ? 'finalFirst' : 'finalThird';
      rows[key] = { ...sample(), early, cameraTravel: anchor.distanceTo(T.camera.position),
        clearEvents: clearEvents-eventsBefore, practiceCues: practiceCues-cuesBefore,
        trainingChime: A.trainingState().cues?.['wave-clear'] != null,
        pitches: [...pitches], musicSting: A.musicState().sting, tracks: [...tracks],
        gradient: getComputedStyle(flash).backgroundImage };
      await window.guCapture((training ? 'training' : 'hunt') + (first ? '-final-first' : '-final-third'));
      animation.cancel();
      finisher.t0 = performance.now() - 4000;
      step(3);
      rows[key].ended = !T.getWaveFinisher();
      rows[key].after = sample();
    }
  } finally {
    HTMLMediaElement.prototype.play = play;
    A.trainingCue = originalCue;
    window.removeEventListener('dw-game',onEvent);
    T.flightHold(false);
  }
  return rows;
}

async function run(mode, baseline) {
  const dir = resolve('review/GP-20316', baseline ? 'before' : 'after');
  mkdirSync(dir, { recursive: true });
  const camera = new IdleProofCamera({
    size: '960x600', training: mode === 'training',
    files: baseline ? { '/index.html': resolve(baseline) } : null
  });
  try {
    await camera.open();
    const page = camera.page;
    if (mode === 'hunt') {
      await page.evaluate(readFileSync('tools/tests/lib.js','utf8'));
      await page.evaluate("startMatch(TT, 'Camera check')");
    }
    const finishPhotos = await enableReviewPhotos(page,dir);
    const rows = await page.evaluate('(' + exercise.toString() + ')()',180000);
    await finishPhotos();
    writeFileSync(dir+'/'+mode+'.json',JSON.stringify(rows,null,2)+'\n');
    if (!baseline) {
      const atEye = r => r.selected && r.weight === 1 && r.headHidden && r.eyeGap < .18;
      const inThird = r => !r.selected && r.weight === 0 && !r.headHidden && r.playerGap > 2;
      if (mode === 'hunt') {
        assert(atEye(rows.swimFirst) && rows.swimFirst.surfaceGap >= .10);
        assert(rows.entry.ads === 0 && rows.entry.selected);
        assert(!rows.swimFirst.weapon && rows.swimFirst.ads === 0 && rows.swimFirst.lookTurn > .02);
        assert(atEye(rows.stroke) && rows.stroke.distance > .1 && rows.stroke.depth > 1.3);
        assert(inThird(rows.swimThird) && atEye(rows.toggleInWater) && atEye(rows.shore));
      }
      for (const [key, correctView] of [['finalFirst',atEye],['finalThird',inThird]]) {
        const row = rows[key];
        assert(!row.early && row.ended && correctView(row) && correctView(row.after),key);
        assert(row.cameraTravel < .5,key+' camera moved '+row.cameraTravel+' m');
        assert.match(row.gradient,/255, 190, 65/);
        assert.equal(row.clearEvents, mode === 'hunt' ? 1 : 0);
        if (mode === 'training') {
          assert(row.practiceCues === 1 && row.trainingChime);
          assert.deepEqual(row.pitches.map(Math.round),[523,659,784]);
        }
        else {
          assert.equal(row.musicSting,'clear');
          assert(row.tracks.some(path=>/\/(gh-cue-last-kill\.ogg|sting_clear\.mp3)$/.test(path)));
        }
      }
    }
    console.log((baseline ? 'Captured baseline' : 'PASS')+' '+mode+' perspective and wave-clear feedback');
  } finally {
    await camera.close();
  }
}

const [mode = 'all', baseline] = process.argv.slice(2);
assert(['all', 'hunt', 'training'].includes(mode));
for (const scene of (mode === 'all' ? ['hunt','training'] : [mode])) {
  if (baseline) await run(scene,baseline);
  await run(scene);
}
