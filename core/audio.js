// Web Audio engine: music and sound effects. No game state.
// CU-4 slice. Callers keep using AudioSys from the page module.
export const AudioSys = (() => {
  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let musicGain = null;
  let muted = false;
  let unlocked = false;
  let musicPlaying = false;
  let musicStepTimer = null;
  let musicOscs = [];
  let musicStep = 0;
  let lastSpinWasUp = false;
  let emptyClickCd = 0;
  let leafSfxCd = 0;
  let trunkBumpCd = 0;
  let brassTinkCd = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = window.DWOpening?.active ? 0 : 1;
    masterGain.connect(ctx.destination);
    // The mix. Everything used to share one SFX bus, so a rain bed, the wind and
    // the river sat at the same level as — and in the same 2-4 kHz band as — the
    // crack of a rifle, and nothing gave way when you fired. Now:
    //   weapons  guns, impacts, reloads, blades, explosions — lifted, and they duck
    //            the other two for a moment every time they fire (see duckForShot);
    //   fx       zombies, the marine, UI;
    //   ambience wind, rain, river, crickets, birds, thunder — pulled right down.
    // All three meet at the user's SFX fader, then a gentle compressor glues them
    // and keeps a grenade in a crowd from clipping.
    glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -16; glue.knee.value = 10; glue.ratio.value = 3.5;
    glue.attack.value = 0.004; glue.release.value = 0.2;
    glue.connect(masterGain);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5 * userSfx;
    sfxGain.connect(glue);
    weapBus = ctx.createGain(); weapBus.gain.value = BUS_WEAP; weapBus.connect(sfxGain);
    fxBus = ctx.createGain(); fxBus.gain.value = BUS_FX; fxBus.connect(sfxGain);
    ambBus = ctx.createGain(); ambBus.gain.value = BUS_AMB; ambBus.connect(sfxGain);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.14;
    musicGain.connect(masterGain);
    // Outdoor reverb send for the SFX: a short synthetic impulse (decaying noise,
    // darkened over time) so shots and explosions get a tail off the treeline
    // instead of stopping dead. Sources opt in with a `rev` amount.
    try {
      reverbNode = ctx.createConvolver();
      reverbNode.buffer = makeImpulse(1.6, 2.4);
      reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.42;
      reverbNode.connect(reverbGain);
      reverbGain.connect(sfxGain);
    } catch (_) { reverbNode = null; }
    applyMuteGains();
    return ctx;
  }
  let reverbNode = null, reverbGain = null;
  let glue = null, weapBus = null, fxBus = null, ambBus = null;
  const BUS_WEAP = 1.35, BUS_FX = 0.8, BUS_AMB = 0.5;
  // Which bus the next playTone/playNoise lands on; set by onBus() around a voice.
  let routeBus = null;
  function outBus() { return routeBus || fxBus || sfxGain; }
  // Momentary ducking when something fires: ambience dips hard and fast, the music
  // (an <audio> element, see updateMusic) by musicDuck, both easing back after.
  let musicShotDuck = 1;
  function duckForShot(ambDepth, musicDepth, hold = 0.06) {
    if (!ctx || !ambBus) return;
    const t = ctx.currentTime;
    try {
      ambBus.gain.cancelScheduledValues(t);
      ambBus.gain.setValueAtTime(Math.max(0.0001, ambBus.gain.value), t);
      ambBus.gain.linearRampToValueAtTime(BUS_AMB * ambDepth, t + 0.012);
      ambBus.gain.setTargetAtTime(BUS_AMB, t + 0.012 + hold, 0.35);
    } catch (_) {}
    musicShotDuck = Math.min(musicShotDuck, musicDepth);
  }
  function onBus(bus, fn, duck) {
    return function (...args) {
      const prev = routeBus;
      routeBus = bus === 'weap' ? weapBus : (bus === 'amb' ? ambBus : fxBus);
      try { return fn.apply(null, args); }
      finally {
        routeBus = prev;
        if (duck) { const d = typeof duck === 'function' ? duck(...args) : duck; if (d) duckForShot(d[0], d[1], d[2]); }
      }
    };
  }
  // User volume settings (pause > settings sliders), remembered per browser.
  let userSfx = 0.8, userMusic = 0.3;
  try {
    const sv = localStorage.getItem('tt_vol_sfx'), mv = localStorage.getItem('tt_vol_music');
    if (sv != null && isFinite(+sv)) userSfx = Math.max(0, Math.min(1, +sv));
    if (mv != null && isFinite(+mv)) userMusic = Math.max(0, Math.min(1, +mv));
  } catch (_) {}
  function setSfxVolume(v) {
    userSfx = Math.max(0, Math.min(1, +v || 0));
    try { localStorage.setItem('tt_vol_sfx', String(userSfx)); } catch (_) {}
    if (sfxGain && ctx) { try { sfxGain.gain.setTargetAtTime(0.5 * userSfx, ctx.currentTime, 0.03); } catch (_) {} }
  }
  function setMusicVolume(v) {
    userMusic = Math.max(0, Math.min(1, +v || 0));
    try { localStorage.setItem('tt_vol_music', String(userMusic)); } catch (_) {}
  }
  function getVolumes() { return { sfx: userSfx, music: userMusic }; }
  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // progressively darker: one-pole lowpass whose coefficient tightens with time
        const k = 0.35 + 0.6 * t;
        lp += ((Math.random() * 2 - 1) - lp) * (1 - k);
        d[i] = lp * Math.pow(1 - t, decay) * (i < 400 ? i / 400 : 1);
      }
    }
    return buf;
  }
  function sendToReverb(node, amount) {
    if (!reverbNode || !(amount > 0)) return;
    const g = ctx.createGain();
    g.gain.value = amount;
    node.connect(g);
    g.connect(reverbNode);
  }

  function applyMuteGains() {
    if (!masterGain || !ctx) return;
    const t = ctx.currentTime;
    masterGain.gain.cancelScheduledValues(t);
    masterGain.gain.setTargetAtTime(muted || window.DWOpening?.active ? 0 : 1, t, 0.03);
  }

  function setMuted(m) {
    muted = !!m;
    applyMuteGains();
    if (muted) { stopMusic(); chainsawStop(); rainStop(); stopFlames(); }
    else if (unlocked) startMusic();
  }

  function toggleMute() { setMuted(!muted); }
  function isMuted() { return muted; }

  function unlock() {
    if (window.DWOpening?.active) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    if (!unlocked) {
      unlocked = true;
      if (!muted) startMusic();
    }
  }

  function noiseBuffer(duration) {
    const c = ensure();
    if (!c) return null;
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function playTone({ freq = 440, type = 'square', dur = 0.08, vol = 0.2, slideTo = null, when = 0, rev = 0, attack = 0.01, pan = 0 }) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    const out = pan ? panNode(g, pan) : g;
    out.connect(outBus());
    sendToReverb(out, rev);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function playNoise({ dur = 0.06, vol = 0.15, filterFreq = 1800, filterType = 'bandpass', when = 0, rev = 0, attack = 0.005, q = null, pan = 0 }) {
    const c = ensure();
    if (!c || muted) return;
    const buf = noiseBuffer(dur + 0.02);
    if (!buf) return;
    const t0 = c.currentTime + when;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = filterFreq;
    if (q != null) filt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt); filt.connect(g);
    const out = pan ? panNode(g, pan) : g;
    out.connect(outBus());
    sendToReverb(out, rev);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }
  function panNode(from, pan) {
    try {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      from.connect(p);
      return p;
    } catch (_) { return from; }
  }

  function fire() {
    // Generic fallback crack (prefer fireWeapon)
    playNoise({ dur: 0.04, vol: 0.12, filterFreq: 2200, filterType: 'bandpass' });
    playTone({ freq: 180, type: 'sawtooth', dur: 0.05, vol: 0.08, slideTo: 90 });
  }
  function fireWeapon(id) {
    switch (id) {
      case 'pistol':
        // Sharp crack, small body, a short slap off the trees.
        playNoise({ dur: 0.028, vol: 0.15, filterFreq: 3200, filterType: 'bandpass', rev: 0.35 });
        playTone({ freq: 420, type: 'square', dur: 0.035, vol: 0.09, slideTo: 140, rev: 0.2 });
        playTone({ freq: 90, type: 'sine', dur: 0.05, vol: 0.06, slideTo: 50 });
        playNoise({ dur: 0.09, vol: 0.035, filterFreq: 700, filterType: 'lowpass', when: 0.012 });
        break;
      case 'revolver':
        // Deep heavy boom with a long tail.
        playNoise({ dur: 0.07, vol: 0.2, filterFreq: 900, filterType: 'lowpass', rev: 0.55 });
        playTone({ freq: 120, type: 'sawtooth', dur: 0.1, vol: 0.14, slideTo: 45, rev: 0.3 });
        playTone({ freq: 70, type: 'sine', dur: 0.16, vol: 0.12, slideTo: 33 });
        playNoise({ dur: 0.04, vol: 0.07, filterFreq: 2400, filterType: 'bandpass', when: 0.02, rev: 0.4 });
        playNoise({ dur: 0.22, vol: 0.04, filterFreq: 500, filterType: 'lowpass', when: 0.03 });
        break;
      case 'm4':
        // Supersonic rifle crack: bright snap, mid body, tail.
        playNoise({ dur: 0.038, vol: 0.14, filterFreq: 2100, filterType: 'bandpass', rev: 0.4 });
        playNoise({ dur: 0.02, vol: 0.07, filterFreq: 5200, filterType: 'bandpass' });
        playTone({ freq: 240, type: 'sawtooth', dur: 0.055, vol: 0.1, slideTo: 95, rev: 0.25 });
        playTone({ freq: 160, type: 'square', dur: 0.03, vol: 0.05 });
        playNoise({ dur: 0.12, vol: 0.035, filterFreq: 600, filterType: 'lowpass', when: 0.015 });
        break;
      case 'ak':
        // 7.62: lower and fatter than the M4's snap, with more push behind it.
        playNoise({ dur: 0.045, vol: 0.16, filterFreq: 1700, filterType: 'bandpass', rev: 0.45 });
        playNoise({ dur: 0.02, vol: 0.06, filterFreq: 4200, filterType: 'bandpass' });
        playTone({ freq: 190, type: 'sawtooth', dur: 0.07, vol: 0.12, slideTo: 70, rev: 0.28 });
        playTone({ freq: 75, type: 'sine', dur: 0.09, vol: 0.09, slideTo: 42 });
        playNoise({ dur: 0.16, vol: 0.045, filterFreq: 520, filterType: 'lowpass', when: 0.015 });
        break;
      case 'aa12':
        // Auto shotgun: the pump gun's boom, shorter and tighter so a burst stays a
        // string of blasts instead of one long roar.
        playNoise({ dur: 0.08, vol: 0.2, filterFreq: 600, filterType: 'lowpass', rev: 0.45 });
        playTone({ freq: 95, type: 'sawtooth', dur: 0.1, vol: 0.13, slideTo: 38, rev: 0.25 });
        playNoise({ dur: 0.045, vol: 0.09, filterFreq: 1900, filterType: 'bandpass', when: 0.01, rev: 0.35 });
        playTone({ freq: 52, type: 'sine', dur: 0.14, vol: 0.09, slideTo: 30 });
        break;
      case 'uzi':
        // Light rapid smack.
        playNoise({ dur: 0.022, vol: 0.1, filterFreq: 2800, filterType: 'bandpass', rev: 0.25 });
        playTone({ freq: 380, type: 'square', dur: 0.025, vol: 0.07, slideTo: 160 });
        playNoise({ dur: 0.06, vol: 0.025, filterFreq: 800, filterType: 'lowpass', when: 0.01 });
        break;
      case 'minigun':
        // Buzzier short burp / lower thud.
        playNoise({ dur: 0.03, vol: 0.11, filterFreq: 1600, filterType: 'bandpass', rev: 0.2 });
        playTone({ freq: 95, type: 'sawtooth', dur: 0.045, vol: 0.08, slideTo: 55 });
        playTone({ freq: 55, type: 'sine', dur: 0.05, vol: 0.06 });
        break;
      case 'shotgun':
        // Loud boom, low body, a wide splash of noise off the trees.
        playNoise({ dur: 0.12, vol: 0.24, filterFreq: 550, filterType: 'lowpass', rev: 0.6 });
        playTone({ freq: 85, type: 'sawtooth', dur: 0.16, vol: 0.16, slideTo: 32, rev: 0.3 });
        playNoise({ dur: 0.06, vol: 0.11, filterFreq: 1800, filterType: 'bandpass', when: 0.015, rev: 0.5 });
        playTone({ freq: 48, type: 'sine', dur: 0.22, vol: 0.11, slideTo: 28 });
        playNoise({ dur: 0.3, vol: 0.05, filterFreq: 420, filterType: 'lowpass', when: 0.04 });
        break;
      case 'sniper':
        // Huge crack and a rolling echo.
        playNoise({ dur: 0.05, vol: 0.2, filterFreq: 2600, filterType: 'bandpass', rev: 0.7 });
        playTone({ freq: 320, type: 'square', dur: 0.06, vol: 0.14, slideTo: 90, rev: 0.4 });
        playTone({ freq: 110, type: 'sawtooth', dur: 0.12, vol: 0.09, slideTo: 50 });
        playTone({ freq: 220, type: 'triangle', dur: 0.22, vol: 0.05, when: 0.08, slideTo: 80, rev: 0.6 });
        playNoise({ dur: 0.18, vol: 0.06, filterFreq: 900, filterType: 'bandpass', when: 0.1, rev: 0.6 });
        playNoise({ dur: 0.5, vol: 0.05, filterFreq: 380, filterType: 'lowpass', when: 0.05 });
        break;
      case 'launcher':
        // Hollow thunk / whoosh (boom on explode).
        playTone({ freq: 140, type: 'sine', dur: 0.08, vol: 0.1, slideTo: 70, rev: 0.3 });
        playNoise({ dur: 0.1, vol: 0.1, filterFreq: 700, filterType: 'lowpass', rev: 0.4 });
        playTone({ freq: 60, type: 'triangle', dur: 0.14, vol: 0.08, slideTo: 35 });
        playNoise({ dur: 0.12, vol: 0.07, filterFreq: 1400, filterType: 'bandpass', when: 0.04 });
        break;
      default:
        fire();
    }
  }
  function shotgunPump() {
    // Mechanical back-forward scrape
    playNoise({ dur: 0.07, vol: 0.09, filterFreq: 1400, filterType: 'bandpass' });
    playTone({ freq: 260, type: 'triangle', dur: 0.06, vol: 0.08, slideTo: 140 });
    playTone({ freq: 180, type: 'square', dur: 0.04, vol: 0.06, when: 0.055 });
    playNoise({ dur: 0.035, vol: 0.05, filterFreq: 900, filterType: 'lowpass', when: 0.05 });
  }
  function revolverCylinder() {
    // Open/close click
    playTone({ freq: 480 + Math.random() * 80, type: 'square', dur: 0.03, vol: 0.07 });
    playNoise({ dur: 0.03, vol: 0.045, filterFreq: 2200, filterType: 'bandpass' });
    playTone({ freq: 220, type: 'triangle', dur: 0.04, vol: 0.05, when: 0.02, slideTo: 160 });
  }
  function revolverSpin() {
    playTone({ freq: 340, type: 'triangle', dur: 0.05, vol: 0.055, slideTo: 520 });
    playNoise({ dur: 0.04, vol: 0.035, filterFreq: 1800, filterType: 'bandpass' });
  }
  function launcherDrum() {
    // Heavier drum open/close
    playTone({ freq: 140, type: 'sine', dur: 0.07, vol: 0.08, slideTo: 90 });
    playNoise({ dur: 0.06, vol: 0.07, filterFreq: 500, filterType: 'lowpass' });
    playTone({ freq: 90, type: 'triangle', dur: 0.05, vol: 0.05, when: 0.03 });
  }
  function launcherShellInsert() {
    playTone({ freq: 160, type: 'sine', dur: 0.05, vol: 0.07, slideTo: 70 });
    playNoise({ dur: 0.045, vol: 0.055, filterFreq: 650, filterType: 'lowpass' });
    playTone({ freq: 110, type: 'triangle', dur: 0.04, vol: 0.045, when: 0.025 });
  }
  function emptyClick() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < emptyClickCd) return;
    emptyClickCd = c.currentTime + 0.18;
    playTone({ freq: 120, type: 'square', dur: 0.04, vol: 0.08 });
  }
  function spinUp() {
    playTone({ freq: 90, type: 'sawtooth', dur: 0.25, vol: 0.06, slideTo: 220 });
  }
  function spinDown() {
    playTone({ freq: 200, type: 'sawtooth', dur: 0.3, vol: 0.05, slideTo: 70 });
  }
  function slideRack() {
    playTone({ freq: 320, type: 'triangle', dur: 0.05, vol: 0.09, slideTo: 160 });
    playNoise({ dur: 0.045, vol: 0.06, filterFreq: 2200, filterType: 'bandpass' });
    playTone({ freq: 480, type: 'square', dur: 0.035, vol: 0.07, when: 0.06 });
  }
  function jump() { playTone({ freq: 300, type: 'triangle', dur: 0.08, vol: 0.08, slideTo: 420 }); }
  function nvgClick() {
    playTone({ freq: 520, type: 'square', dur: 0.03, vol: 0.07 });
    playNoise({ dur: 0.04, vol: 0.05, filterFreq: 2400, filterType: 'bandpass', when: 0.01 });
  }
  function coin() {
    playTone({ freq: 880, type: 'square', dur: 0.06, vol: 0.1 });
    playTone({ freq: 1175, type: 'square', dur: 0.08, vol: 0.08, when: 0.05 });
  }
  function leafHit() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < leafSfxCd) return;
    leafSfxCd = c.currentTime + 0.08;
    playNoise({ dur: 0.05, vol: 0.06, filterFreq: 1400, filterType: 'bandpass' });
  }
  function treeFell() {
    // The trunk giving way: a crack, a groan of splitting wood, a second crack as the
    // hinge tears. The thump is treeThud, played when it actually lands — a tall
    // tree takes longer to come down than a sapling.
    playNoise({ dur: 0.07, vol: 0.16, filterFreq: 1500, filterType: 'bandpass', when: 0.02, rev: 0.5 });
    playTone({ freq: 128, type: 'sawtooth', dur: 0.75, vol: 0.05, slideTo: 82, attack: 0.25, rev: 0.4 });
    playTone({ freq: 193, type: 'triangle', dur: 0.5, vol: 0.022, slideTo: 150, attack: 0.2, when: 0.12, rev: 0.4 });
    playNoise({ dur: 0.05, vol: 0.1, filterFreq: 2600, filterType: 'bandpass', when: 0.34, rev: 0.4 });
  }
  function treeThud(volume = 1, pan = 0, size = 1) {
    if (volume < 0.02) return;
    playNoise({ dur: 0.42, vol: 0.22 * volume, filterFreq: 240, filterType: 'lowpass', rev: 0.6, pan });
    playTone({ freq: 70 / Math.sqrt(Math.max(0.5, size)), type: 'sawtooth', dur: 0.35, vol: 0.11 * volume, slideTo: 38, pan });
    playNoise({ dur: 0.06, vol: 0.09 * volume, filterFreq: 1800, filterType: 'bandpass', when: 0.02, pan }); // branches snapping
    playNoise({ dur: 0.75, vol: 0.07 * volume, filterFreq: 2400, filterType: 'bandpass', when: 0.04, attack: 0.08, pan }); // leaves
  }
  // A crown going up: a low roar that swells in.
  function crownFire(volume = 1, pan = 0) {
    if (volume < 0.02) return;
    playNoise({ dur: 1.7, vol: 0.14 * volume, filterFreq: 420, filterType: 'lowpass', attack: 0.55, rev: 0.4, pan });
    playNoise({ dur: 1.0, vol: 0.05 * volume, filterFreq: 1800, filterType: 'bandpass', attack: 0.3, when: 0.15, pan });
  }
  function trunkBump() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < trunkBumpCd) return;
    trunkBumpCd = c.currentTime + 0.2;
    playTone({ freq: 90, type: 'triangle', dur: 0.06, vol: 0.08 });
  }
  function win() {
    [523, 659, 784, 1047].forEach((f, i) => playTone({ freq: f, type: 'square', dur: 0.12, vol: 0.1, when: i * 0.1 }));
  }
  function resetBlip() {
    playTone({ freq: 360, type: 'square', dur: 0.06, vol: 0.1 });
    playTone({ freq: 480, type: 'square', dur: 0.07, vol: 0.09, when: 0.05 });
  }
  function place() {
    playTone({ freq: 520, type: 'square', dur: 0.06, vol: 0.12 });
    playTone({ freq: 780, type: 'square', dur: 0.08, vol: 0.1, when: 0.04 });
    playNoise({ dur: 0.05, vol: 0.06, filterFreq: 1600, filterType: 'bandpass' });
  }
  function invalid() {
    playTone({ freq: 160, type: 'square', dur: 0.1, vol: 0.1 });
    playTone({ freq: 120, type: 'square', dur: 0.12, vol: 0.08, when: 0.08 });
  }
  function turretShot() {
    playNoise({ dur: 0.035, vol: 0.09, filterFreq: 1800, filterType: 'bandpass' });
    playTone({ freq: 240, type: 'square', dur: 0.04, vol: 0.06 });
  }
  // Flesh hit: a thump you feel, a wet slap, and a little grit. It fires for every
  // pellet and every flame tick, so it is rate-limited, and it scales and pans with
  // where the body is. Heavier kinds hit heavier.
  let fleshCd = 0;
  function zombieHit(v = 1, pan = 0, heavy = false) {
    const c = ensure();
    if (!c || muted || v < 0.03) return;
    if (c.currentTime < fleshCd) return;
    fleshCd = c.currentTime + 0.028;
    const k = heavy ? 1.35 : 1;
    playTone({ freq: (heavy ? 95 : 120) + Math.random() * 20, type: 'sine', dur: 0.07, vol: 0.13 * v * k, slideTo: 48, pan });
    playNoise({ dur: 0.05, vol: 0.12 * v * k, filterFreq: 950 + Math.random() * 300, filterType: 'bandpass', q: 1.3, pan });
    playNoise({ dur: 0.07, vol: 0.05 * v, filterFreq: 420, filterType: 'lowpass', when: 0.012, pan });
    playTone({ freq: 150, type: 'sawtooth', dur: 0.05, vol: 0.04 * v, slideTo: 70, pan });
  }
  // Bullet meeting the world. `surface`: dirt, wood, rock, metal, water, sand.
  let impactCd = 0;
  function bulletImpact(surface, v = 1, pan = 0) {
    const c = ensure();
    if (!c || muted || v < 0.03) return;
    if (c.currentTime < impactCd) return;
    impactCd = c.currentTime + 0.022;
    const p = 0.9 + Math.random() * 0.25;
    if (surface === 'rock' || surface === 'metal') {
      const metal = surface === 'metal';
      playNoise({ dur: 0.025, vol: 0.13 * v, filterFreq: (metal ? 4200 : 3200) * p, filterType: 'bandpass', q: 2, pan });
      playTone({ freq: (metal ? 2400 : 1500) * p, type: 'triangle', dur: metal ? 0.18 : 0.05, vol: (metal ? 0.07 : 0.05) * v, slideTo: (metal ? 1900 : 900) * p, pan, rev: 0.3 });
      // The odd ricochet whine off stone and steel.
      if (Math.random() < (metal ? 0.35 : 0.22)) playTone({ freq: 2600 * p, type: 'sine', dur: 0.28, vol: 0.045 * v, slideTo: 900 * p, when: 0.015, pan, rev: 0.45 });
    } else if (surface === 'wood') {
      playTone({ freq: 210 * p, type: 'triangle', dur: 0.06, vol: 0.12 * v, slideTo: 120 * p, pan });
      playNoise({ dur: 0.04, vol: 0.09 * v, filterFreq: 1100 * p, filterType: 'bandpass', q: 1.5, pan });
      playNoise({ dur: 0.06, vol: 0.035 * v, filterFreq: 2600 * p, filterType: 'bandpass', when: 0.01, pan });
    } else if (surface === 'water') {
      playNoise({ dur: 0.07, vol: 0.08 * v, filterFreq: 1300 * p, filterType: 'bandpass', pan });
      playTone({ freq: 600 * p, type: 'sine', dur: 0.06, vol: 0.05 * v, slideTo: 1400 * p, when: 0.01, pan });
    } else if (surface === 'sand') {
      playNoise({ dur: 0.08, vol: 0.1 * v, filterFreq: 700 * p, filterType: 'lowpass', pan });
      playNoise({ dur: 0.05, vol: 0.04 * v, filterFreq: 2400 * p, filterType: 'bandpass', when: 0.01, pan });
    } else {
      // dirt: a dull thud and the patter of what it kicked up
      playTone({ freq: 90 * p, type: 'sine', dur: 0.06, vol: 0.1 * v, slideTo: 45, pan });
      playNoise({ dur: 0.05, vol: 0.09 * v, filterFreq: 520 * p, filterType: 'lowpass', pan });
      playNoise({ dur: 0.09, vol: 0.035 * v, filterFreq: 1900 * p, filterType: 'bandpass', when: 0.02, pan });
    }
  }
  // A blade that lands: the zip of the edge and a wet chunk.
  function knifeHit() {
    playNoise({ dur: 0.05, vol: 0.14, filterFreq: 800, filterType: 'bandpass', q: 1.4, when: 0.03 });
    playTone({ freq: 190, type: 'sawtooth', dur: 0.06, vol: 0.07, slideTo: 80, when: 0.03 });
    playNoise({ dur: 0.08, vol: 0.05, filterFreq: 380, filterType: 'lowpass', when: 0.05 });
  }
  // Gore: a limb or head coming away (small) or a body bursting (big).
  let goreCd = 0;
  function gore(v = 1, pan = 0, big = false) {
    const c = ensure();
    if (!c || muted || v < 0.04) return;
    if (c.currentTime < goreCd) return;
    goreCd = c.currentTime + (big ? 0.05 : 0.035);
    const k = big ? 1.4 : 1;
    playNoise({ dur: big ? 0.22 : 0.12, vol: 0.14 * v * k, filterFreq: 650 + Math.random() * 250, filterType: 'bandpass', q: 0.9, pan });
    playTone({ freq: big ? 70 : 110, type: 'sine', dur: big ? 0.2 : 0.1, vol: 0.11 * v * k, slideTo: 38, pan });
    playNoise({ dur: 0.06, vol: 0.06 * v, filterFreq: 1800, filterType: 'bandpass', when: 0.02, pan });
    // spatter landing
    const n = big ? 5 : 2;
    for (let i = 0; i < n; i++) playNoise({ dur: 0.025, vol: (0.02 + Math.random() * 0.025) * v, filterFreq: 900 + Math.random() * 1400, filterType: 'bandpass', when: 0.12 + Math.random() * 0.35, pan: Math.max(-1, Math.min(1, pan + (Math.random() - 0.5) * 0.6)) });
  }
  function grenadeThrow() {
    playTone({ freq: 1500, type: 'square', dur: 0.02, vol: 0.05 });                       // pin
    playNoise({ dur: 0.18, vol: 0.09, filterFreq: 1300, filterType: 'bandpass', when: 0.05 }); // throw whoosh
    playTone({ freq: 900, type: 'triangle', dur: 0.03, vol: 0.04, when: 0.06 });          // spoon flying off
  }
  let bounceCd = 0;
  function grenadeBounce(v = 1, pan = 0) {
    const c = ensure();
    if (!c || muted || v < 0.04) return;
    if (c.currentTime < bounceCd) return;
    bounceCd = c.currentTime + 0.08;
    playTone({ freq: 700 + Math.random() * 200, type: 'triangle', dur: 0.05, vol: 0.06 * v, slideTo: 450, pan });
    playNoise({ dur: 0.04, vol: 0.05 * v, filterFreq: 500, filterType: 'lowpass', pan });
  }
  // Footfall of something heavy: brute, demon, colossus.
  let stompCd = 0;
  function heavyStep(v = 1, pan = 0, huge = false) {
    const c = ensure();
    if (!c || muted || v < 0.05) return;
    if (c.currentTime < stompCd) return;
    stompCd = c.currentTime + 0.06;
    playTone({ freq: huge ? 42 : 58, type: 'sine', dur: huge ? 0.3 : 0.16, vol: (huge ? 0.2 : 0.12) * v, slideTo: huge ? 26 : 34, pan });
    playNoise({ dur: huge ? 0.2 : 0.1, vol: (huge ? 0.1 : 0.06) * v, filterFreq: 240, filterType: 'lowpass', pan, rev: huge ? 0.3 : 0 });
  }
  // A zombie clawing up out of the ground nearby: earth tearing and a rasp.
  let emergeCd = 0;
  function emerge(v = 1, pan = 0) {
    const c = ensure();
    if (!c || muted || v < 0.05) return;
    if (c.currentTime < emergeCd) return;
    emergeCd = c.currentTime + 0.25;
    playNoise({ dur: 0.5, vol: 0.08 * v, filterFreq: 330, filterType: 'lowpass', attack: 0.08, pan });
    for (let i = 0; i < 3; i++) playNoise({ dur: 0.04, vol: 0.04 * v, filterFreq: 1200 + Math.random() * 900, filterType: 'bandpass', when: 0.1 + i * 0.12 + Math.random() * 0.05, pan });
    playTone({ freq: 85 + Math.random() * 25, type: 'sawtooth', dur: 0.45, vol: 0.05 * v, slideTo: 60, when: 0.25, attack: 0.08, pan, rev: 0.3 });
  }
  // The kiosk hatch: a roll-up shutter going up (open) or down (close).
  function shutter(open) {
    for (let i = 0; i < 6; i++) playNoise({ dur: 0.025, vol: 0.05, filterFreq: 1700 + i * (open ? 120 : -90), filterType: 'bandpass', when: i * 0.04 });
    playTone({ freq: open ? 180 : 140, type: 'square', dur: 0.05, vol: 0.05, when: 0.25, slideTo: open ? 120 : 90 });
  }
  // Burial: the back of a shovel patting loose earth down.
  function gravePat(v = 1, pan = 0) {
    playNoise({ dur: 0.09, vol: 0.16 * v, filterFreq: 260, filterType: 'lowpass', pan, rev: 0.25 });
    playTone({ freq: 95, type: 'triangle', dur: 0.1, vol: 0.08 * v, slideTo: 60, pan });
    playNoise({ dur: 0.14, vol: 0.04 * v, filterFreq: 2400, filterType: 'bandpass', when: 0.02, pan });
  }
  // A letter cut into the stone.
  function chisel() {
    playTone({ freq: 2600 + Math.random() * 600, type: 'square', dur: 0.03, vol: 0.05, rev: 0.3 });
    playNoise({ dur: 0.05, vol: 0.05, filterFreq: 4200, filterType: 'bandpass' });
  }
  // Two men swinging a weight between them: a grunt and a whump of canvas.
  function heave(v = 1) {
    playTone({ freq: 118 + Math.random() * 20, type: 'sawtooth', dur: 0.22, vol: 0.035 * v, slideTo: 92, attack: 0.04, rev: 0.2 });
    playNoise({ dur: 0.25, vol: 0.05 * v, filterFreq: 700, filterType: 'bandpass', attack: 0.06 });
  }
  function bigSplash(v = 1, pan = 0) {
    playNoise({ dur: 0.5, vol: 0.2 * v, filterFreq: 900, filterType: 'lowpass', pan, rev: 0.5 });
    playNoise({ dur: 0.9, vol: 0.08 * v, filterFreq: 3000, filterType: 'bandpass', when: 0.08, attack: 0.1, pan, rev: 0.5 });
    playTone({ freq: 70, type: 'sine', dur: 0.4, vol: 0.12 * v, slideTo: 40, pan });
    for (let i = 0; i < 6; i++) playTone({ freq: 500 + Math.random() * 700, type: 'sine', dur: 0.05, vol: 0.025 * v, when: 0.5 + i * 0.18 + Math.random() * 0.1, slideTo: 1200, pan });
  }
  // The graveyard: no tune. A low drone that beats against itself, wind moving
  // through, a few glassy notes hanging in the dark, and one far-off bell.
  function graveAmbience(dur = 16) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime + 0.05, end = t0 + dur;
    const env = (g, peak, a, r) => { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.setValueAtTime(peak, end - r); g.gain.exponentialRampToValueAtTime(0.0001, end); };
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const dg = c.createGain(); env(dg, 0.06, 3.5, 5);
    lp.connect(dg); dg.connect(outBus()); sendToReverb(dg, 0.7);
    for (const [f, ty, v] of [[55, 'sine', 1], [55.7, 'sine', 0.9], [82.4, 'triangle', 0.35], [116.5, 'sine', 0.18]]) {
      const o = c.createOscillator(); o.type = ty; o.frequency.value = f;
      o.frequency.linearRampToValueAtTime(f * 0.985, end);
      const og = c.createGain(); og.gain.value = v;
      o.connect(og); og.connect(lp); o.start(t0); o.stop(end + 0.1);
    }
    // Wind: noise through a band that slowly drifts.
    const buf = noiseBuffer(dur + 0.2);
    if (buf) {
      const src = c.createBufferSource(); src.buffer = buf;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
      bp.frequency.setValueAtTime(380, t0);
      for (let k = 1; k <= 6; k++) bp.frequency.linearRampToValueAtTime(300 + Math.random() * 900, t0 + dur * k / 6);
      const wg = c.createGain(); env(wg, 0.05, 4, 4);
      src.connect(bp); bp.connect(wg); wg.connect(outBus()); sendToReverb(wg, 0.5);
      src.start(t0); src.stop(end + 0.1);
    }
    // Glass: sparse high notes, a minor second apart, slow to bloom.
    for (const [f, w] of [[880, 2.2], [932.3, 5.1], [1318.5, 8.4], [1244.5, 11.6]]) {
      playTone({ freq: f, type: 'sine', dur: 3.2, vol: 0.018, when: w, attack: 0.9, rev: 0.9 });
      playTone({ freq: f * 2.01, type: 'sine', dur: 2.4, vol: 0.006, when: w + 0.05, attack: 1.0, rev: 0.9 });
    }
    // A bell, a long way off.
    for (const w of [6.5, 13.5]) for (const [f, v] of [[110, 0.05], [264, 0.025], [349, 0.018], [521, 0.01]]) playTone({ freq: f, type: 'sine', dur: 4.5, vol: v, when: w, attack: 0.01, rev: 0.9 });
  }
  // Coming up out of the water: bubbles breaking, a pour of runoff.
  function surface() {
    for (let i = 0; i < 9; i++) playTone({ freq: 380 + Math.random() * 600, type: 'sine', dur: 0.06, vol: 0.03, when: i * 0.09 + Math.random() * 0.05, slideTo: 1100, rev: 0.4 });
    playNoise({ dur: 1.2, vol: 0.07, filterFreq: 1400, filterType: 'bandpass', when: 0.5, attack: 0.15, rev: 0.5 });
    playNoise({ dur: 0.35, vol: 0.09, filterFreq: 500, filterType: 'lowpass', when: 0.45, rev: 0.5 });
  }
  // MedPen: cap flicked off, the spring-loaded jab (thump + click), a pneumatic hiss, a breath out.
  function medPen() {
    playTone({ freq: 2400, type: 'square', dur: 0.025, vol: 0.05 });                               // cap pop
    playNoise({ dur: 0.04, vol: 0.05, filterFreq: 3200, filterType: 'bandpass', when: 0.01 });
    playNoise({ dur: 0.08, vol: 0.16, filterFreq: 180, filterType: 'lowpass', when: 0.34 });        // jab into the thigh
    playTone({ freq: 1800, type: 'square', dur: 0.03, vol: 0.09, when: 0.34, slideTo: 1200 });      // spring click
    playNoise({ dur: 0.32, vol: 0.07, filterFreq: 6000, filterType: 'highpass', when: 0.36, attack: 0.02 }); // hiss
    playTone({ freq: 520, type: 'sine', dur: 0.14, vol: 0.04, when: 0.62, slideTo: 780 });           // done blip
    playNoise({ dur: 0.45, vol: 0.05, filterFreq: 900, filterType: 'bandpass', when: 0.7, attack: 0.12 }); // exhale
  }
  // A four-engine cargo plane crossing overhead: rising drone, a Doppler droop as it
  // passes, then away. Built on its own nodes so the envelope can run for seconds.
  function planeFlyover(dur = 8) {
    const c = ensure();
    if (!c || muted) return;
    const t0 = c.currentTime, mid = t0 + dur * 0.5, end = t0 + dur;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(260, t0);
    lp.frequency.linearRampToValueAtTime(700, mid); lp.frequency.linearRampToValueAtTime(220, end);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.09, mid - dur * 0.05);
    g.gain.exponentialRampToValueAtTime(0.11, mid);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    lp.connect(g); g.connect(outBus()); sendToReverb(g, 0.4);
    for (const [f, ty] of [[62, 'sawtooth'], [64.5, 'sawtooth'], [93, 'square'], [124, 'triangle']]) {
      const o = c.createOscillator(); o.type = ty;
      o.frequency.setValueAtTime(f * 1.06, t0);
      o.frequency.linearRampToValueAtTime(f * 1.04, mid - 0.4);
      o.frequency.linearRampToValueAtTime(f * 0.93, mid + 0.6);   // Doppler as it passes
      o.frequency.linearRampToValueAtTime(f * 0.92, end);
      const og = c.createGain(); og.gain.value = ty === 'sawtooth' ? 0.5 : 0.3;
      o.connect(og); og.connect(lp); o.start(t0); o.stop(end + 0.05);
    }
    playNoise({ dur, vol: 0.03, filterFreq: 400, filterType: 'lowpass', attack: dur * 0.45 });  // prop wash
  }
  // The chute cracks open: a canvas snap, the whoomph of the canopy filling, lines creaking taut.
  function chuteOpen() {
    playNoise({ dur: 0.06, vol: 0.14, filterFreq: 1500, filterType: 'bandpass', rev: 0.3 });
    playNoise({ dur: 0.45, vol: 0.12, filterFreq: 240, filterType: 'lowpass', when: 0.04, attack: 0.08, rev: 0.4 });
    playTone({ freq: 70, type: 'triangle', dur: 0.35, vol: 0.08, when: 0.05, slideTo: 45 });
    playNoise({ dur: 0.2, vol: 0.03, filterFreq: 700, filterType: 'bandpass', when: 0.35, q: 8 });
  }
  function medkit() {
    playNoise({ dur: 0.12, vol: 0.08, filterFreq: 2800, filterType: 'bandpass' });            // velcro
    playNoise({ dur: 0.35, vol: 0.05, filterFreq: 5000, filterType: 'highpass', when: 0.15, attack: 0.05 }); // spray / hiss
    playTone({ freq: 640, type: 'sine', dur: 0.12, vol: 0.05, when: 0.5, slideTo: 880 });
  }
  // Idle horde groans: a low sawtooth wobble with a breathy noise tail, pitched
  // per body so a crowd doesn't chorus.
  function groan(vol = 1, deep = false) {
    const base = (deep ? 48 : 70) + Math.random() * (deep ? 30 : 60);
    const dur = 0.5 + Math.random() * 0.45;
    const pan = (Math.random() * 2 - 1) * 0.6;
    playTone({ freq: base, type: 'sawtooth', dur, vol: 0.055 * vol, slideTo: base * (0.7 + Math.random() * 0.5), rev: 0.35, attack: 0.06, pan });
    playTone({ freq: base * 2.01, type: 'triangle', dur: dur * 0.8, vol: 0.028 * vol, slideTo: base * 1.5, when: 0.05, rev: 0.3, attack: 0.05, pan });
    playNoise({ dur: 0.35, vol: 0.035 * vol, filterFreq: 450 + Math.random() * 500, filterType: 'bandpass', when: dur * 0.3, rev: 0.3, pan });
  }
  function headshot() {
    playNoise({ dur: 0.09, vol: 0.2, filterFreq: 950, filterType: 'bandpass', rev: 0.3 });
    playTone({ freq: 1500, type: 'square', dur: 0.07, vol: 0.06, slideTo: 320 });
    playNoise({ dur: 0.14, vol: 0.06, filterFreq: 400, filterType: 'lowpass', when: 0.03 });
  }
  function heartbeat(vol = 1) {
    playTone({ freq: 62, type: 'sine', dur: 0.12, vol: 0.14 * vol, slideTo: 40 });
    playTone({ freq: 58, type: 'sine', dur: 0.1, vol: 0.1 * vol, slideTo: 36, when: 0.16 });
  }
  function footstep(wet, running) {
    const p = 0.85 + Math.random() * 0.3;
    if (wet) {
      playNoise({ dur: 0.07, vol: running ? 0.07 : 0.05, filterFreq: 1700 * p, filterType: 'bandpass' });
    } else {
      playNoise({ dur: 0.045, vol: running ? 0.065 : 0.04, filterFreq: 380 * p, filterType: 'lowpass' });
      playNoise({ dur: 0.02, vol: 0.02, filterFreq: 2600 * p, filterType: 'bandpass' });
    }
  }
  function dodgeRoll() {
    playNoise({ dur: 0.2, vol: 0.1, filterFreq: 520, filterType: 'lowpass' });
    playNoise({ dur: 0.08, vol: 0.06, filterFreq: 2400, filterType: 'bandpass', when: 0.16 });
  }
  function streak(level) {
    const f = 480 + level * 110;
    playTone({ freq: f, type: 'triangle', dur: 0.12, vol: 0.1, slideTo: f * 1.5 });
    playTone({ freq: f * 1.5, type: 'triangle', dur: 0.2, vol: 0.09, when: 0.1 });
    playTone({ freq: f * 2, type: 'square', dur: 0.14, vol: 0.04, when: 0.2 });
  }
  // Death: the last rattle, then the body hitting the ground.
  let deathCd = 0;
  function zombieDeath(v = 1, pan = 0, heavy = false) {
    const c = ensure();
    if (!c || muted || v < 0.03) return;
    if (c.currentTime < deathCd) return;
    deathCd = c.currentTime + 0.03;
    playNoise({ dur: 0.15, vol: 0.13 * v, filterFreq: 400, filterType: 'lowpass', pan });
    playTone({ freq: 100, type: 'sawtooth', dur: 0.18, vol: 0.08 * v, slideTo: 45, pan });
    const fall = heavy ? 0.42 : 0.3;
    playTone({ freq: heavy ? 55 : 72, type: 'sine', dur: heavy ? 0.22 : 0.12, vol: (heavy ? 0.16 : 0.1) * v, slideTo: 32, when: fall, pan });
    playNoise({ dur: 0.1, vol: 0.07 * v, filterFreq: 300, filterType: 'lowpass', when: fall, pan });
  }
  function waveStart(boss) {
    // A long horn over a deep hit; the boss version drops a fifth and doubles up.
    playTone({ freq: boss ? 73 : 110, type: 'sawtooth', dur: 1.1, vol: 0.11, slideTo: boss ? 65 : 100, attack: 0.08, rev: 0.7 });
    playTone({ freq: boss ? 110 : 165, type: 'sawtooth', dur: 0.9, vol: 0.07, slideTo: boss ? 98 : 150, attack: 0.1, when: 0.05, rev: 0.7 });
    playNoise({ dur: 0.5, vol: 0.16, filterFreq: 160, filterType: 'lowpass', rev: 0.8 });
    playTone({ freq: 48, type: 'sine', dur: 0.7, vol: 0.14, slideTo: 28 });
    if (boss) { playNoise({ dur: 0.5, vol: 0.14, filterFreq: 140, filterType: 'lowpass', when: 0.55, rev: 0.8 }); playTone({ freq: 44, type: 'sine', dur: 0.7, vol: 0.12, slideTo: 26, when: 0.55 }); }
  }
  function expand() {
    playTone({ freq: 300, type: 'triangle', dur: 0.1, vol: 0.1 });
    playTone({ freq: 450, type: 'triangle', dur: 0.12, vol: 0.09, when: 0.08 });
    playTone({ freq: 600, type: 'triangle', dur: 0.14, vol: 0.08, when: 0.16 });
  }
  function gameOver() {
    playTone({ freq: 200, type: 'sawtooth', dur: 0.25, vol: 0.12, slideTo: 60 });
    playTone({ freq: 150, type: 'sawtooth', dur: 0.35, vol: 0.1, slideTo: 40, when: 0.2 });
  }
  function playerHurt() {
    playNoise({ dur: 0.1, vol: 0.14, filterFreq: 500, filterType: 'bandpass' });
    playTone({ freq: 180, type: 'sawtooth', dur: 0.12, vol: 0.1, slideTo: 80 });
  }
  function grenadeBoom() {
    playNoise({ dur: 0.35, vol: 0.24, filterFreq: 180, filterType: 'lowpass', rev: 0.8 });
    playNoise({ dur: 0.08, vol: 0.12, filterFreq: 1800, filterType: 'bandpass', rev: 0.6 });
    playTone({ freq: 70, type: 'sawtooth', dur: 0.4, vol: 0.14, slideTo: 30, rev: 0.4 });
    playTone({ freq: 40, type: 'sine', dur: 0.7, vol: 0.12, slideTo: 24 });
    // debris patter after the blast
    for (let i = 0; i < 5; i++) playNoise({ dur: 0.03, vol: 0.02 + Math.random() * 0.02, filterFreq: 1200 + Math.random() * 2000, filterType: 'bandpass', when: 0.25 + Math.random() * 0.6, pan: Math.random() * 2 - 1 });
  }
  function knifeSwing() {
    playNoise({ dur: 0.06, vol: 0.1, filterFreq: 2500, filterType: 'bandpass' });
    playTone({ freq: 420, type: 'triangle', dur: 0.05, vol: 0.07, slideTo: 200 });
  }
  // Machete: a longer, lower whoosh — more air moved — and a wet chop on contact.
  function macheteSwing() {
    playNoise({ dur: 0.16, vol: 0.13, filterFreq: 1100, filterType: 'bandpass' });
    playNoise({ dur: 0.1, vol: 0.06, filterFreq: 2600, filterType: 'bandpass', when: 0.03 });
    playTone({ freq: 300, type: 'triangle', dur: 0.12, vol: 0.06, slideTo: 120 });
  }
  function macheteChop() {
    playNoise({ dur: 0.08, vol: 0.16, filterFreq: 520, filterType: 'bandpass', when: 0.04 });
    playTone({ freq: 160, type: 'sawtooth', dur: 0.09, vol: 0.09, slideTo: 60, when: 0.04 });
    playTone({ freq: 1900, type: 'triangle', dur: 0.03, vol: 0.04, slideTo: 900, when: 0.04 });
  }
  // Armour: a strap-and-buckle rustle when a piece goes on, a plate ring when it takes a hit.
  function armorDon() {
    playNoise({ dur: 0.12, vol: 0.07, filterFreq: 1400, filterType: 'bandpass' });
    playTone({ freq: 640, type: 'square', dur: 0.03, vol: 0.05, when: 0.08 });
    playTone({ freq: 420, type: 'square', dur: 0.04, vol: 0.05, when: 0.14 });
    playNoise({ dur: 0.08, vol: 0.05, filterFreq: 900, filterType: 'bandpass', when: 0.16 });
  }
  function armorHit(fullSoak) {
    playTone({ freq: 1100 + Math.random() * 300, type: 'triangle', dur: 0.12, vol: fullSoak ? 0.09 : 0.06, slideTo: 500 });
    playNoise({ dur: 0.05, vol: 0.08, filterFreq: 2200, filterType: 'bandpass' });
    playTone({ freq: 240, type: 'square', dur: 0.05, vol: 0.05, slideTo: 120 });
  }
  function rockBreak() {
    playNoise({ dur: 0.2, vol: 0.16, filterFreq: 500, filterType: 'bandpass' });
    playTone({ freq: 90, type: 'square', dur: 0.12, vol: 0.08, slideTo: 40 });
  }
  function brassTink() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < brassTinkCd) return;
    brassTinkCd = c.currentTime + 0.07;
    playTone({ freq: 1400 + Math.random() * 500, type: 'triangle', dur: 0.025, vol: 0.018 });
    playNoise({ dur: 0.02, vol: 0.012, filterFreq: 3200, filterType: 'bandpass' });
  }
  let magThudCd = 0;
  function magThud() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < magThudCd) return;
    magThudCd = c.currentTime + 0.18;
    playTone({ freq: 110 + Math.random() * 40, type: 'sine', dur: 0.05, vol: 0.035, slideTo: 55 });
    playNoise({ dur: 0.04, vol: 0.02, filterFreq: 420, filterType: 'lowpass' });
  }

  // --- Music director ---
  // The soundtrack lives in assets/soundtrack (rendered by tools/compose.py) as
  // mood pools. The director picks a pool from the game state — menu, day prep,
  // night prep, fight, blood moon / colossus, and the two endings — and crossfades
  // between two decks whenever the mood changes, so a wave starting is a real
  // musical cue rather than whatever track happened to be next.
  const SOUNDTRACK = 'assets/soundtrack/';
  // The pools are the score's vocabulary; picking between them is the direction.
  //
  // The quiet half of the soundtrack is unchanged and it is what the game sounds like
  // most of the time — the calm pools were also split in two, because a first-light
  // prep and the last prep before a blood moon should not draw from the same drawer.
  // The fight side is new: the same keys and the same patient pads with guitars
  // carrying the riff, in three weights, so a wave escalates musically as it
  // escalates on the ground rather than playing one intensity for six minutes.
  //
  //   skirmish  the old fight tracks — early waves, a handful of bodies
  //   assault   the metal pool — a real wave, the line under pressure
  //   overrun   the fastest and heaviest — you are losing, or nearly
  //   siege     metal at boss weight — blood moon, colossus
  //   aftermath one short track for the minute after a wave breaks
  const MUSIC_POOLS = {
    menu:     ['menu_treeline'],
    dawnprep: ['day_morning_watch', 'day_long_grass'],
    day:      ['day_riverside', 'day_open_ground', 'day_long_grass', 'day_morning_watch'],
    dusk:     ['night_lanterns', 'night_long_watch'],
    night:    ['night_embers', 'night_lanterns', 'night_long_watch'],
    skirmish: ['fight_breach', 'fight_wire', 'fight_ash_wind'],
    assault:  ['metal_breach_the_line', 'metal_siege_engine', 'metal_the_horde', 'fight_run_the_line', 'fight_teeth'],
    overrun:  ['metal_rip_and_tear', 'metal_the_horde', 'metal_last_stand'],
    siege:    ['metal_blood_moon', 'metal_titan', 'boss_red_sky', 'boss_colossus'],
    aftermath:['aftermath_hold'],
    fallen:   ['end_fallen'],
    dawn:     ['end_dawn']
  };
  // The heavy pools are mixed a touch lower than they were written: guitars occupy the
  // same band as the guns, and the guns have to win.
  const MOOD_GAIN = {
    menu: 0.75, dawnprep: 0.7, day: 0.7, dusk: 0.7, night: 0.7,
    skirmish: 0.76, assault: 0.72, overrun: 0.74, siege: 0.8,
    aftermath: 0.72, fallen: 0.85, dawn: 0.85
  };
  // Pools that are a fight. Used for gapless playback, faster crossfades and to
  // decide whether a mood change is urgent enough to interrupt.
  const HOT_MOODS = { skirmish: 1, assault: 1, overrun: 1, siege: 1 };
  const deckBase = [0, 0];      // per-deck volume before the momentary shot duck
  const MUSIC_VOL = 0.3;
  const decks = [null, null];   // two <audio> elements
  let deckIdx = 0;              // which deck is "front"
  let mood = null;              // current pool name
  let moodT = 0;                // seconds since the mood was set
  let lastTrack = {};           // pool -> last file played (no immediate repeats)
  let gapT = 0;                 // silence left before the next calm track
  let duck = 1;                 // 0..1 external ducking (low health, pause)
  let fadeSpeed = 0.45;         // gain units per second
  const wantGain = [0, 0];      // per-deck target gains

  function makeDeck() {
    const el = new Audio();
    el.preload = 'auto';
    el.volume = 0;
    el.addEventListener('ended', () => { onDeckEnded(el); });
    el.addEventListener('error', () => { onDeckEnded(el, true); });
    return el;
  }
  function pickTrack(pool) {
    const list = MUSIC_POOLS[pool] || MUSIC_POOLS.menu;
    let choice = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && choice === lastTrack[pool]) choice = list[(list.indexOf(choice) + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length];
    lastTrack[pool] = choice;
    return SOUNDTRACK + choice + '.mp3';
  }
  function playOnDeck(i, src, startGain) {
    if (!decks[i]) decks[i] = makeDeck();
    const el = decks[i];
    el.src = src;
    el.loop = false;
    el.volume = Math.min(1, startGain);
    deckBase[i] = el.volume;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }
  function onDeckEnded(el, failed) {
    if (!musicPlaying || muted) return;
    const i = decks.indexOf(el);
    if (i !== deckIdx || !mood) return;      // the back deck finishing is just a fade tail
    if (mood === 'fallen' || mood === 'dawn') return; // endings play once
    // Calm pools breathe between tracks; fights run straight on.
    gapT = failed ? 1.5 : (HOT_MOODS[mood] ? 0.25 : 2.5 + Math.random() * 4);
  }
  function setMood(next, fast) {
    if (next === mood) return;
    mood = next;
    moodT = 0;
    gapT = 0;
    if (!musicPlaying || muted) return;
    // swap decks: the old front fades out, the new one fades in
    wantGain[deckIdx] = 0;
    deckIdx = 1 - deckIdx;
    fadeSpeed = fast ? 1.2 : 0.4;
    playOnDeck(deckIdx, pickTrack(mood), 0.0001);
    wantGain[deckIdx] = 1;
  }
  // Called every frame by the game loop with the current state.
  //
  // The mood used to be a straight read of the phase: wave means fight, otherwise day
  // or night. That gave the same music to three shamblers on day one and to forty
  // bodies plus a colossus on day nine. It now scores the situation and picks a weight
  // from it — how many are up, how close the nearest is, how hurt you are, what day it
  // is — and lets go of a fight gradually once the wave is broken, so the last shot of
  // a wave is not followed by an instant cut back to birdsong.
  let heat = 0;          // 0..1 smoothed combat intensity
  let peace = 0;         // seconds since the last fight ended
  let hadFight = false;  // has there been a fight to be the aftermath OF
  function updateMusic(dt, state) {
    if (!musicPlaying || muted) return;
    moodT += dt;
    // --- how bad is it right now ---
    const live = state.threat || 0;                 // zombies alive
    const near = state.nearest == null ? 999 : state.nearest;
    let target = 0;
    if (state.phase === 'wave') {
      target = 0.34
        + Math.min(0.3, live / 26)                  // weight of numbers
        + (near < 14 ? 0.18 : (near < 30 ? 0.08 : 0))
        + Math.min(0.12, Math.max(0, (state.day - 2)) * 0.02)
        + (state.lowHp ? 0.2 : 0);
      if (state.boss) target = Math.max(target, 0.95);
    }
    // Heat climbs quickly and falls slowly: a lull mid-wave should not drop the score
    // out from under you, but a wave ending should be allowed to release it.
    const rate = target > heat ? 2.6 : 0.45;
    heat += (target - heat) * Math.min(1, dt * rate);
    if (state.phase === 'wave' && live > 0) { peace = 0; hadFight = true; } else peace += dt;
    if (!state.started) { hadFight = false; heat = 0; peace = 999; }

    let want = 'menu';
    if (!state.started) want = 'menu';
    else if (state.over && !state.won) want = 'fallen';
    else if (state.won) want = 'dawn';
    else if (state.boss) want = 'siege';
    else if (state.phase === 'wave' && (live > 0 || heat > 0.3)) {
      want = heat > 0.82 ? 'overrun' : (heat > 0.5 ? 'assault' : 'skirmish');
    } else if (hadFight && peace < 24 && state.started && !state.shop) {
      // The minute after the wave breaks gets its own track rather than snapping
      // straight back to the calm pool.
      want = 'aftermath';
    } else if (state.night) {
      want = state.dusk ? 'dusk' : 'night';
    } else {
      want = state.dawn ? 'dawnprep' : 'day';
    }
    const hot = !!HOT_MOODS[want], wasHot = !!HOT_MOODS[mood];
    const urgent = hot || wasHot || want === 'fallen' || want === 'dawn' || want === 'menu' || mood === 'menu';
    // Escalating inside a fight waits a bar or two: without this, heat hovering on a
    // threshold would flip between two metal tracks every few seconds.
    const hold = (hot && wasHot) ? 18 : (urgent ? 0 : 6);
    if (want !== mood && moodT > hold) setMood(want, hot || wasHot);
    // gap between calm tracks
    if (gapT > 0) {
      gapT -= dt;
      if (gapT <= 0 && mood) playOnDeck(deckIdx, pickTrack(mood), 0.0001), wantGain[deckIdx] = 1;
    }
    const targetDuck = (state.paused ? 0.45 : 1) * (state.lowHp ? 0.6 : 1) * (state.shop ? 0.8 : 1);
    duck += (targetDuck - duck) * Math.min(1, dt * 2.5);
    // Shot duck: set instantly by duckForShot, eased back here (~0.6 s). Applied
    // after the crossfade slew, which is far too slow to follow a gunshot.
    musicShotDuck += (1 - musicShotDuck) * Math.min(1, dt * 1.8);
    for (let i = 0; i < 2; i++) {
      const el = decks[i];
      if (!el) continue;
      const goal = wantGain[i] * MUSIC_VOL * userMusic * (MOOD_GAIN[mood] || 0.8) * duck;
      const cur = deckBase[i];
      let v = cur + Math.sign(goal - cur) * Math.min(Math.abs(goal - cur), fadeSpeed * MUSIC_VOL * dt);
      v = Math.max(0, Math.min(1, v));
      deckBase[i] = v;
      const out = Math.max(0, Math.min(1, v * musicShotDuck));
      if (Math.abs(out - el.volume) > 0.0005) el.volume = out;
      if (i !== deckIdx && v <= 0.0006 && !el.paused) { try { el.pause(); } catch (_) {} }
    }
  }

  function clearMusicNodes() {
    for (const n of musicOscs) {
      try { n.stop(); } catch (_) {}
      try { n.disconnect(); } catch (_) {}
    }
    musicOscs = [];
    if (musicStepTimer != null) {
      clearTimeout(musicStepTimer);
      musicStepTimer = null;
    }
  }
  function startMusic() {
    if (window.DWOpening?.active) return;
    ensure(); // unlock AudioContext for SFX
    if (muted || musicPlaying) return;
    musicPlaying = true;
    clearMusicNodes(); // kill any leftover synth nodes
    // (Re)start whatever the current mood is on the front deck.
    const m = mood || 'menu';
    mood = null;
    setMood(m, false);
  }
  function stopMusic() {
    musicPlaying = false;
    clearMusicNodes();
    for (const el of decks) { if (el) { try { el.pause(); } catch (_) {} } }
  }
  function musicState() { return { mood, front: decks[deckIdx] ? decks[deckIdx].src : null, playing: musicPlaying, volume: decks[deckIdx] ? decks[deckIdx].volume : 0 }; }
  function noteSpin(spinningUp) {
    if (spinningUp && !lastSpinWasUp) { lastSpinWasUp = true; spinUp(); }
    else if (!spinningUp && lastSpinWasUp) { lastSpinWasUp = false; spinDown(); }
  }

  // Continuous chainsaw idle/rev loop (sustained oscillators; stop cleanly)
  let sawLoop = null; // { osc, osc2, noise, filt, gain, rev }
  let sawGritCd = 0;

  function chainsawGrit() {
    const c = ensure();
    if (!c || muted) return;
    if (c.currentTime < sawGritCd) return;
    sawGritCd = c.currentTime + 0.09;
    playNoise({ dur: 0.07, vol: 0.13, filterFreq: 650, filterType: 'bandpass' });
    playTone({ freq: 85, type: 'sawtooth', dur: 0.05, vol: 0.07, slideTo: 48 });
  }

  // --- New-world SFX ---
  function spit() {
    playNoise({ dur: 0.12, vol: 0.12, filterFreq: 700, filterType: 'bandpass' });
    playTone({ freq: 220, type: 'sawtooth', dur: 0.14, vol: 0.07, slideTo: 90 });
  }
  function acidHit() {
    playNoise({ dur: 0.2, vol: 0.14, filterFreq: 1200, filterType: 'bandpass' });
    playTone({ freq: 340, type: 'triangle', dur: 0.18, vol: 0.07, slideTo: 120 });
  }
  function scream() {
    playTone({ freq: 620, type: 'sawtooth', dur: 0.55, vol: 0.16, slideTo: 1450 });
    playTone({ freq: 880, type: 'square', dur: 0.4, vol: 0.07, slideTo: 1800, when: 0.08 });
    playNoise({ dur: 0.4, vol: 0.08, filterFreq: 2600, filterType: 'bandpass', when: 0.05 });
  }
  function bossSlam() {
    playNoise({ dur: 0.4, vol: 0.26, filterFreq: 140, filterType: 'lowpass', rev: 0.7 });
    playTone({ freq: 55, type: 'sine', dur: 0.5, vol: 0.22, slideTo: 26 });
    playNoise({ dur: 0.1, vol: 0.1, filterFreq: 900, filterType: 'bandpass', rev: 0.5 });
  }
  function bossRoar() {
    playTone({ freq: 90, type: 'sawtooth', dur: 0.9, vol: 0.2, slideTo: 45, rev: 0.6 });
    playTone({ freq: 140, type: 'square', dur: 0.7, vol: 0.1, slideTo: 60, when: 0.1, rev: 0.5 });
    playNoise({ dur: 0.7, vol: 0.12, filterFreq: 320, filterType: 'lowpass', when: 0.05, rev: 0.6 });
  }
  function spikeSnap() {
    playTone({ freq: 900, type: 'square', dur: 0.03, vol: 0.09 });
    playNoise({ dur: 0.04, vol: 0.09, filterFreq: 3200, filterType: 'highpass' });
  }
  // Refreshed envelopes on a persistent noise voice: a pressure jet, not a
  // succession of impact sounds. Four nearby emitters share the voice budget.
  const flameVoices = new Map();
  let flameNoise = null;
  function stopFlames() {
    for (const v of flameVoices.values()) {
      try { v.src.stop(); } catch (_) {}
      v.src.disconnect(); v.low.disconnect(); v.body.disconnect(); v.gain.disconnect(); v.pan.disconnect();
    }
    flameVoices.clear();
  }
  function flameBurst(key = 'player', volume = 1, pan = 0, hold = 0.28) {
    const c = ensure();
    if (!c || muted || volume < 0.025) return;
    const now = c.currentTime;
    for (const [id, v] of flameVoices) {
      if (now < v.until + 0.3) continue;
      try { v.src.stop(); } catch (_) {}
      v.src.disconnect(); v.low.disconnect(); v.body.disconnect(); v.gain.disconnect(); v.pan.disconnect();
      flameVoices.delete(id);
    }
    let v = flameVoices.get(key);
    if (!v) {
      if (flameVoices.size >= 4) return;
      if (!flameNoise) {
        flameNoise = noiseBuffer(2.7);
        const a = flameNoise.getChannelData(0);
        let low = 0;
        for (let i = 0; i < a.length; i++) {
          low += (a[i] - low) * 0.12;
          a[i] = (a[i] * 0.32 + low * 2.2) * (0.82 + 0.12 * Math.sin(i * 0.0017) + 0.06 * Math.sin(i * 0.00053));
        }
      }
      const src = c.createBufferSource(), low = c.createBiquadFilter(), body = c.createBiquadFilter();
      const gain = c.createGain(), p = c.createStereoPanner();
      src.buffer = flameNoise; src.loop = true;
      low.type = 'lowpass'; low.frequency.value = 2400; low.Q.value = 0.45;
      body.type = 'highpass'; body.frequency.value = 65;
      gain.gain.value = 0;
      src.connect(low); low.connect(body); body.connect(gain); gain.connect(p); p.connect(weapBus);
      src.start(0, Math.random() * 2);
      v = { src, low, body, gain, pan: p, until: now }; flameVoices.set(key, v);
    }
    v.until = now + Math.min(0.6, hold);
    v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), now, 0.04);
    v.low.frequency.setTargetAtTime(1900 + Math.random() * 650, now, 0.08);
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setTargetAtTime(0.48 * Math.min(1, volume), now, 0.035);
    v.gain.gain.setTargetAtTime(0, v.until, 0.075);
  }
  function fireHiss(volume = 1, pan = 0) {
    if (volume < 0.025) return;
    if (ctx && ctx.currentTime < (fireHiss.next || 0)) return;
    fireHiss.next = (ctx ? ctx.currentTime : 0) + 0.22;
    playNoise({ dur: 0.35, vol: 0.11 * volume, filterFreq: 3600, filterType: 'highpass', attack: 0.025, pan });
  }
  function fireCrackle(volume = 1, pan = 0) {
    if (volume < 0.025) return;
    if (ctx && ctx.currentTime < (fireCrackle.next || 0)) return;
    fireCrackle.next = (ctx ? ctx.currentTime : 0) + 0.13;
    playNoise({ dur: 0.045, vol: 0.12 * volume, filterFreq: 1600, filterType: 'bandpass', pan });
    playNoise({ dur: 0.3, vol: 0.07 * volume, filterFreq: 550, filterType: 'lowpass', attack: 0.045, pan });
  }
  function crateLand() {
    playNoise({ dur: 0.18, vol: 0.18, filterFreq: 220, filterType: 'lowpass', rev: 0.5 });
    playTone({ freq: 120, type: 'triangle', dur: 0.16, vol: 0.12, slideTo: 60 });
    playNoise({ dur: 0.05, vol: 0.06, filterFreq: 1200, filterType: 'bandpass', when: 0.02, rev: 0.4 });
  }
  function pickup() {
    [520, 700, 1040].forEach((f, i) => playTone({ freq: f, type: 'square', dur: 0.07, vol: 0.09, when: i * 0.06 }));
  }
  function repairClank() {
    playTone({ freq: 620, type: 'square', dur: 0.05, vol: 0.1 });
    playTone({ freq: 480, type: 'square', dur: 0.06, vol: 0.08, when: 0.07 });
    playNoise({ dur: 0.05, vol: 0.06, filterFreq: 2600, filterType: 'bandpass', when: 0.02 });
  }
  function sellChime() {
    playTone({ freq: 700, type: 'triangle', dur: 0.08, vol: 0.1 });
    playTone({ freq: 520, type: 'triangle', dur: 0.1, vol: 0.09, when: 0.07 });
  }

  // Rain ambience: a filtered noise loop whose volume/brightness tracks the
  // weather system's 0..1 intensity, the same shape as the chainsaw loop above.
  let rainLoop = null;
  function rainStart() {
    const c = ensure();
    if (!c || rainLoop) return;
    const t0 = c.currentTime;
    const buf = noiseBuffer(2.5);
    const noise = c.createBufferSource();
    if (buf) { noise.buffer = buf; noise.loop = true; }
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(3000, t0);
    filt.Q.value = 0.5;
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    if (buf) noise.connect(filt);
    filt.connect(gain);
    gain.connect(ambBus || sfxGain);
    if (buf) noise.start(t0);
    rainLoop = { noise, filt, gain };
  }
  function rainSetIntensity(amount) {
    amount = Math.max(0, Math.min(1, +amount || 0));
    if (!rainLoop || !ctx) return;
    const t = ctx.currentTime;
    // Was 0.018 + 0.08: a heavy shower was a wall of 3 kHz noise right where a
    // gunshot's crack lives. It sits under the fight now (and on the ducked bus).
    const vol = muted ? 0.0001 : 0.012 + amount * 0.048;
    try {
      rainLoop.gain.gain.setTargetAtTime(vol, t, 0.45);
      rainLoop.filt.frequency.setTargetAtTime(2400 + amount * 1600, t, 0.6);
    } catch (_) {}
  }
  function rainStop() {
    if (!rainLoop || !ctx) return;
    const t = ctx.currentTime;
    try { rainLoop.gain.gain.setTargetAtTime(0.0001, t, 0.5); } catch (_) {}
    const nodes = rainLoop;
    rainLoop = null;
    setTimeout(() => { try { nodes.noise.stop(); } catch (_) {} }, 900);
  }
  function isRainRunning() { return !!rainLoop; }

  // --- Ambience bed ---
  // Wind through the trees (two filtered noise layers with a slow wander), the
  // river when you are near it, and crickets after dark. All continuous nodes;
  // the game feeds levels in through updateAmbience() and the one-shots (birds,
  // owls, thunder, far groans) are cued from there too.
  let amb = null;
  function ambienceStart() {
    const c = ensure();
    if (!c || amb) return;
    const t0 = c.currentTime;
    const mkNoise = (filterType, freq, q, vol) => {
      const buf = noiseBuffer(3.1);
      const src = c.createBufferSource();
      if (buf) { src.buffer = buf; src.loop = true; }
      const filt = c.createBiquadFilter();
      filt.type = filterType; filt.frequency.value = freq; filt.Q.value = q;
      const g = c.createGain(); g.gain.value = 0.0001;
      src.connect(filt); filt.connect(g); g.connect(ambBus || sfxGain);
      if (buf) src.start(t0);
      return { src, filt, g, vol };
    };
    const windLow = mkNoise('lowpass', 260, 0.7, 0.05);
    const windLeaves = mkNoise('bandpass', 1400, 0.6, 0.02);
    const water = mkNoise('bandpass', 1700, 0.5, 0.06);
    const waterLow = mkNoise('lowpass', 500, 0.8, 0.04);
    // crickets: two trilled carriers
    const crickets = [];
    for (const [f, rate] of [[4300, 27], [3900, 22]]) {
      const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const trill = c.createOscillator(); trill.type = 'square'; trill.frequency.value = rate;
      const tg = c.createGain(); tg.gain.value = 0.5;
      const am = c.createGain(); am.gain.value = 0.5;
      trill.connect(tg); tg.connect(am.gain);
      const g = c.createGain(); g.gain.value = 0.0001;
      osc.connect(am); am.connect(g); g.connect(ambBus || sfxGain);
      osc.start(t0); trill.start(t0);
      crickets.push({ osc, trill, g, vol: 0.012, on: false, timer: Math.random() * 3 });
    }
    amb = { windLow, windLeaves, water, waterLow, crickets, wander: 0, birdT: 2 + Math.random() * 4, owlT: 6 + Math.random() * 10, thunderT: 4 + Math.random() * 8, groanT: 8 + Math.random() * 10 };
  }
  function setG(node, vol, tc) {
    try { node.g.gain.setTargetAtTime(muted ? 0.0001 : Math.max(0.0001, vol), ctx.currentTime, tc); } catch (_) {}
  }
  // state: { dt, wind (0..1), water (0..1), night (bool), rain (0..1), started, forest (0..1) }
  function updateAmbience(st) {
    if (!amb || !ctx) return;
    const dt = st.dt;
    amb.wander += dt * (0.25 + Math.random() * 0.1);
    const gust = 0.72 + 0.28 * Math.sin(amb.wander) * Math.sin(amb.wander * 0.37 + 1.3);
    const w = Math.max(0, Math.min(1, st.wind)) * gust;
    setG(amb.windLow, amb.windLow.vol * (0.25 + w), 0.8);
    setG(amb.windLeaves, amb.windLeaves.vol * w * (0.4 + 0.6 * st.forest) * (st.night ? 0.6 : 1), 0.6);
    try { amb.windLow.filt.frequency.setTargetAtTime(200 + 260 * w, ctx.currentTime, 1.2); } catch (_) {}
    const wl = Math.max(0, Math.min(1, st.water));
    setG(amb.water, amb.water.vol * wl, 0.5);
    setG(amb.waterLow, amb.waterLow.vol * wl, 0.5);
    // crickets: only after dark, each voice chirping in irregular bursts
    for (const cr of amb.crickets) {
      cr.timer -= dt;
      if (cr.timer <= 0) { cr.on = !cr.on; cr.timer = cr.on ? 1.5 + Math.random() * 4 : 0.6 + Math.random() * 2.5; }
      setG(cr, (st.night && st.rain < 0.4 && cr.on) ? cr.vol * (1 - st.rain) : 0.0001, 0.25);
    }
    if (muted) return;
    // one-shots, all on the ambience bus
    const prevBus = routeBus; routeBus = ambBus;
    try { ambienceOneShots(st, dt); } finally { routeBus = prevBus; }
  }
  function ambienceOneShots(st, dt) {
    if (!st.night && st.rain < 0.5) {
      amb.birdT -= dt;
      if (amb.birdT <= 0) { birdChirp(); amb.birdT = 3 + Math.random() * 9; }
    } else {
      amb.owlT -= dt;
      if (st.night && amb.owlT <= 0) { owlHoot(); amb.owlT = 14 + Math.random() * 22; }
    }
    if (st.rain > 0.5) {
      amb.thunderT -= dt;
      if (amb.thunderT <= 0) { thunder(); amb.thunderT = 12 + Math.random() * 24; }
    }
    if (st.night && st.started) {
      amb.groanT -= dt;
      if (amb.groanT <= 0) { distantGroan(); amb.groanT = 10 + Math.random() * 18; }
    }
  }
  function birdChirp() {
    const base = 2200 + Math.random() * 1400;
    const n = 2 + Math.floor(Math.random() * 3);
    const pan = Math.random() * 2 - 1;
    const vol = 0.014 + Math.random() * 0.012;
    for (let i = 0; i < n; i++) {
      const up = Math.random() < 0.6;
      playTone({ freq: base * (up ? 0.85 : 1.15), type: 'sine', dur: 0.07 + Math.random() * 0.05, vol, slideTo: base * (up ? 1.25 : 0.8), when: i * (0.11 + Math.random() * 0.06), attack: 0.012, pan, rev: 0.5 });
    }
  }
  function owlHoot() {
    const pan = Math.random() * 2 - 1;
    playTone({ freq: 390, type: 'sine', dur: 0.32, vol: 0.03, slideTo: 340, attack: 0.09, pan, rev: 0.7 });
    playTone({ freq: 370, type: 'sine', dur: 0.5, vol: 0.028, slideTo: 300, attack: 0.1, when: 0.5, pan, rev: 0.7 });
  }
  function thunder() {
    const far = Math.random() < 0.6;
    const vol = far ? 0.08 : 0.16;
    const when = far ? 0.6 : 0.1;
    playNoise({ dur: 1.4 + Math.random(), vol, filterFreq: far ? 160 : 260, filterType: 'lowpass', when, attack: far ? 0.5 : 0.05, rev: 0.9 });
    playTone({ freq: 40, type: 'sine', dur: 1.2, vol: vol * 0.6, slideTo: 24, when: when + 0.05, attack: far ? 0.4 : 0.03 });
    if (!far) playNoise({ dur: 0.25, vol: 0.08, filterFreq: 900, filterType: 'bandpass', when: 0.02, rev: 0.8 });
  }
  function distantGroan() {
    groan(0.22 + Math.random() * 0.15, Math.random() < 0.3);
  }
  // Day cleared: a four-note brass-ish call with a soft swell under it.
  function dayCleared() {
    const seq = [392, 523, 659, 784];
    seq.forEach((f, i) => {
      playTone({ freq: f, type: 'sawtooth', dur: i === 3 ? 0.9 : 0.28, vol: 0.06, when: i * 0.22, attack: 0.03, rev: 0.6 });
      playTone({ freq: f / 2, type: 'triangle', dur: i === 3 ? 0.9 : 0.28, vol: 0.05, when: i * 0.22, attack: 0.03, rev: 0.5 });
    });
    playNoise({ dur: 1.2, vol: 0.03, filterFreq: 600, filterType: 'lowpass', attack: 0.5, rev: 0.8 });
  }

  // ================================================================
  // Sound pass: engine, reloads, turrets, mines, builds, zombies, NVG,
  // kiosk, doors, floors. All synthesised like the rest of the mix.
  // ================================================================
  const rr = (a, b) => a + Math.random() * (b - a);

  // --- Chainsaw engine: pull-start on equip, idle rumble, rev to cut, shut off.
  // The engine runs whenever the saw is in hand with gas in it; cutting only revs
  // it. chainsawStop() (called whenever the trigger is let go) drops it back to
  // idle while the engine is on, and kills it outright otherwise.
  let sawEngineOn = false, sawQuietOff = false;
  const SAW_IDLE = { f: 44, f2: 22, filt: 380, vol: 0.036, lfo: 11, depth: 0.42 };
  const SAW_FULL = { f: 126, f2: 62, filt: 1530, vol: 0.13, lfo: 36, depth: 0.08 };
  const sawMix = (a, k) => SAW_IDLE[k] + (SAW_FULL[k] - SAW_IDLE[k]) * a;
  function ensureSawLoop(delay = 0) {
    const c = ensure();
    if (!c || muted) return null;
    if (c.state === 'suspended') c.resume().catch(() => {});
    if (sawLoop) return sawLoop;
    const t0 = c.currentTime;
    const osc = c.createOscillator(); osc.type = 'sawtooth';
    const osc2 = c.createOscillator(); osc2.type = 'square';
    osc.frequency.setValueAtTime(SAW_IDLE.f, t0);
    osc2.frequency.setValueAtTime(SAW_IDLE.f2, t0);
    const buf = noiseBuffer(2.0);
    const noise = c.createBufferSource();
    if (buf) { noise.buffer = buf; noise.loop = true; }
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass'; filt.Q.value = 0.9;
    filt.frequency.setValueAtTime(SAW_IDLE.filt, t0);
    // The two-stroke putter: the whole engine voice is amplitude-modulated at the
    // firing rate, deep and slow at idle, shallow and fast flat out.
    const am = c.createGain(); am.gain.value = 1 - SAW_IDLE.depth;
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.setValueAtTime(SAW_IDLE.lfo, t0);
    const lfoAmt = c.createGain(); lfoAmt.gain.setValueAtTime(SAW_IDLE.depth, t0);
    lfo.connect(lfoAmt); lfoAmt.connect(am.gain);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.setValueAtTime(0.0001, t0 + delay);
    gain.gain.exponentialRampToValueAtTime(SAW_IDLE.vol, t0 + delay + 0.06);
    osc.connect(filt); osc2.connect(filt); if (buf) noise.connect(filt);
    filt.connect(am); am.connect(gain);
    gain.connect(weapBus || sfxGain);
    osc.start(t0); osc2.start(t0); lfo.start(t0); if (buf) noise.start(t0);
    sawLoop = { osc, osc2, noise, filt, gain, am, lfo, lfoAmt, rev: 0 };
    return sawLoop;
  }
  function killSawLoop(slow) {
    if (!sawLoop) return;
    const n = sawLoop; sawLoop = null;
    const c = ctx; if (!c) return;
    const t = c.currentTime, tail = slow ? 0.75 : 0.12;
    try {
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setTargetAtTime(0.0001, t, slow ? 0.17 : 0.04);
      if (slow) {
        n.osc.frequency.cancelScheduledValues(t); n.osc.frequency.setTargetAtTime(18, t, 0.22);
        n.osc2.frequency.cancelScheduledValues(t); n.osc2.frequency.setTargetAtTime(9, t, 0.22);
        n.lfo.frequency.cancelScheduledValues(t); n.lfo.frequency.setTargetAtTime(3, t, 0.2);
        n.lfoAmt.gain.setTargetAtTime(0.7, t, 0.1);
      }
    } catch (_) {}
    for (const o of [n.osc, n.osc2, n.noise, n.lfo]) { try { o.stop(t + tail); } catch (_) {} }
    setTimeout(() => { for (const o of [n.osc, n.osc2, n.noise, n.lfo, n.lfoAmt, n.filt, n.am, n.gain]) { try { o.disconnect(); } catch (_) {} } }, tail * 1000 + 120);
  }
  function chainsawStop() {
    if (sawEngineOn && sawLoop) { chainsawSetRev(0); return; }
    if (!sawEngineOn) killSawLoop(false);
  }
  function chainsawStart() { ensureSawLoop(0); }
  function chainsawSetRev(amount) {
    amount = Math.max(0, Math.min(1, +amount || 0));
    if (!sawLoop || !ctx) return;
    const t = ctx.currentTime;
    sawLoop.rev = amount;
    try {
      sawLoop.osc.frequency.setTargetAtTime(sawMix(amount, 'f'), t, 0.07);
      sawLoop.osc2.frequency.setTargetAtTime(sawMix(amount, 'f2'), t, 0.07);
      sawLoop.filt.frequency.setTargetAtTime(sawMix(amount, 'filt'), t, 0.09);
      sawLoop.lfo.frequency.setTargetAtTime(sawMix(amount, 'lfo'), t, 0.08);
      sawLoop.lfoAmt.gain.setTargetAtTime(sawMix(amount, 'depth'), t, 0.08);
      sawLoop.am.gain.setTargetAtTime(1 - sawMix(amount, 'depth'), t, 0.08);
      sawLoop.gain.gain.cancelScheduledValues(t);
      sawLoop.gain.gain.setTargetAtTime(muted ? 0.0001 : sawMix(amount, 'vol'), t, 0.06);
    } catch (_) {}
  }
  // The cord: a zip of rope with the recoil ratchet under it, then the engine
  // coughs. `catches` false is a dry tank — it coughs once and dies.
  function sawPullCord(catches) {
    playNoise({ dur: 0.3, vol: 0.09, filterFreq: 1300, filterType: 'bandpass', q: 1.8, attack: 0.06 });
    playNoise({ dur: 0.22, vol: 0.05, filterFreq: 2600, filterType: 'bandpass', q: 2.5, when: 0.05, attack: 0.05 });
    for (let i = 0; i < 8; i++) playTone({ freq: rr(1500, 2200), type: 'square', dur: 0.01, vol: 0.028, when: 0.03 + i * 0.032 });
    playTone({ freq: 58, type: 'square', dur: 0.07, vol: 0.08, when: 0.3, slideTo: 40 });
    playNoise({ dur: 0.07, vol: 0.06, filterFreq: 520, filterType: 'lowpass', when: 0.3 });
    if (!catches) {
      playTone({ freq: 50, type: 'sawtooth', dur: 0.12, vol: 0.05, when: 0.44, slideTo: 30 });
      playNoise({ dur: 0.1, vol: 0.04, filterFreq: 400, filterType: 'lowpass', when: 0.44 });
      return;
    }
    for (let i = 0; i < 3; i++) {
      playTone({ freq: 46 + i * 7, type: 'sawtooth', dur: 0.075, vol: 0.085, when: 0.4 + i * 0.085, slideTo: 36 });
      playNoise({ dur: 0.05, vol: 0.05, filterFreq: 620, filterType: 'lowpass', when: 0.4 + i * 0.085 });
    }
  }
  function sawShutdown() {
    playTone({ freq: 62, type: 'sawtooth', dur: 0.65, vol: 0.05, slideTo: 20, attack: 0.02 });
    for (const [w, v] of [[0.14, 0.07], [0.3, 0.055], [0.48, 0.04], [0.62, 0.03]]) {
      playTone({ freq: rr(40, 52), type: 'square', dur: 0.05, vol: v, when: w, slideTo: 30 });
      playNoise({ dur: 0.04, vol: v * 0.7, filterFreq: 480, filterType: 'lowpass', when: w });
    }
    playTone({ freq: 900, type: 'square', dur: 0.015, vol: 0.02, when: 0.72 }); // kill-switch tick
  }
  // Called every frame with whether the engine should be running. `quiet` is for
  // a pause or the kiosk: it cuts out with no shutdown, and comes straight back
  // to idle (no pull) when play resumes.
  function chainsawEngine(on, quiet = false) {
    if (on) {
      if (!sawEngineOn) {
        sawEngineOn = true;
        if (sawQuietOff) { sawQuietOff = false; if (ensureSawLoop(0)) chainsawSetRev(0); }
        else if (!muted && ensure()) {
          sawPullCord(true);
          if (ensureSawLoop(0.62) && ctx) {
            // It catches with a blip of revs and settles to idle.
            const t = ctx.currentTime + 0.62;
            try {
              sawLoop.osc.frequency.setTargetAtTime(90, t, 0.05); sawLoop.osc.frequency.setTargetAtTime(SAW_IDLE.f, t + 0.28, 0.14);
              sawLoop.osc2.frequency.setTargetAtTime(45, t, 0.05); sawLoop.osc2.frequency.setTargetAtTime(SAW_IDLE.f2, t + 0.28, 0.14);
            } catch (_) {}
          }
        }
      } else if (!sawLoop && !muted) { if (ensureSawLoop(0)) chainsawSetRev(0); }
    } else if (sawEngineOn) {
      sawEngineOn = false;
      if (quiet) { sawQuietOff = true; killSawLoop(false); }
      else { if (sawLoop && !muted) sawShutdown(); killSawLoop(true); }
    } else if (!quiet) sawQuietOff = false;
  }
  function chainsawDryPull() {
    const c = ensure(); if (!c || muted) return;
    if (c.currentTime < (chainsawDryPull._cd || 0)) return;
    chainsawDryPull._cd = c.currentTime + 0.7;
    sawPullCord(false);
  }
  function isChainsawRunning() { return !!sawLoop; }

  // --- Reloads: every weapon's own mechanics, cued off its reload animation.
  function reloadCue(name, heft = 1) {
    const h = heft, lo = 1 / Math.sqrt(h);   // heavier kit, lower and louder
    switch (name) {
      case 'magRelease':
        playTone({ freq: 1900 * lo, type: 'square', dur: 0.012, vol: 0.05 });
        playNoise({ dur: 0.018, vol: 0.04, filterFreq: 4200, filterType: 'highpass' });
        break;
      case 'magOut':
        playNoise({ dur: 0.07, vol: 0.06 * h, filterFreq: 1500 * lo, filterType: 'bandpass', q: 1.4, attack: 0.02 });
        playTone({ freq: 420 * lo, type: 'triangle', dur: 0.05, vol: 0.04, slideTo: 300 * lo, when: 0.03 });
        break;
      case 'magIn':
        playNoise({ dur: 0.05, vol: 0.05 * h, filterFreq: 1200 * lo, filterType: 'bandpass', q: 1.4, attack: 0.02 });
        playTone({ freq: 950 * lo, type: 'square', dur: 0.018, vol: 0.06, when: 0.05 });
        break;
      case 'magSlap':
        playTone({ freq: 190 * lo, type: 'sine', dur: 0.06, vol: 0.09 * h, slideTo: 90 * lo });
        playNoise({ dur: 0.04, vol: 0.06 * h, filterFreq: 1600, filterType: 'lowpass' });
        playTone({ freq: 2300 * lo, type: 'square', dur: 0.012, vol: 0.05, when: 0.008 });
        break;
      case 'slideBack':
        playNoise({ dur: 0.055, vol: 0.06, filterFreq: 2600, filterType: 'bandpass', q: 1.2, attack: 0.02 });
        playTone({ freq: 720 * lo, type: 'triangle', dur: 0.05, vol: 0.045, slideTo: 520 * lo });
        break;
      case 'slideFwd':
        playTone({ freq: 1150 * lo, type: 'square', dur: 0.02, vol: 0.08 });
        playNoise({ dur: 0.03, vol: 0.07, filterFreq: 3200, filterType: 'highpass' });
        playTone({ freq: 300 * lo, type: 'triangle', dur: 0.05, vol: 0.05, when: 0.005, slideTo: 200 * lo });
        break;
      case 'charge':      // charging handle / cocking lever: back, then slam home
        reloadCue('slideBack', h); setTimeout(() => reloadCue('slideFwd', h), 120);
        break;
      case 'akRockOut':   // mag rocked forward out of the well
        playTone({ freq: 640, type: 'square', dur: 0.02, vol: 0.06 });
        playNoise({ dur: 0.09, vol: 0.07, filterFreq: 1100, filterType: 'bandpass', q: 1.1, when: 0.015, attack: 0.03 });
        break;
      case 'akRockIn':
        playNoise({ dur: 0.08, vol: 0.07, filterFreq: 1000, filterType: 'bandpass', q: 1.1, attack: 0.03 });
        playTone({ freq: 520, type: 'square', dur: 0.025, vol: 0.08, when: 0.08 });
        playTone({ freq: 150, type: 'sine', dur: 0.05, vol: 0.06, when: 0.08, slideTo: 90 });
        break;
      case 'drumOut':
        playTone({ freq: 360, type: 'square', dur: 0.02, vol: 0.05 });
        playNoise({ dur: 0.1, vol: 0.08, filterFreq: 700, filterType: 'bandpass', q: 1, when: 0.02, attack: 0.03 });
        playTone({ freq: 120, type: 'triangle', dur: 0.08, vol: 0.05, when: 0.06, slideTo: 80 });
        break;
      case 'drumIn':
        playNoise({ dur: 0.08, vol: 0.07, filterFreq: 650, filterType: 'bandpass', q: 1, attack: 0.03 });
        playTone({ freq: 110, type: 'sine', dur: 0.09, vol: 0.1, when: 0.07, slideTo: 60 });
        playTone({ freq: 700, type: 'square', dur: 0.02, vol: 0.06, when: 0.07 });
        break;
      case 'boltUp':
        playTone({ freq: 880, type: 'square', dur: 0.018, vol: 0.06 });
        playNoise({ dur: 0.025, vol: 0.04, filterFreq: 3000, filterType: 'bandpass' });
        break;
      case 'boltBack':
        playNoise({ dur: 0.09, vol: 0.06, filterFreq: 2200, filterType: 'bandpass', q: 1.5, attack: 0.03 });
        playTone({ freq: 600, type: 'triangle', dur: 0.08, vol: 0.035, slideTo: 420 });
        break;
      case 'boltFwd':
        playNoise({ dur: 0.08, vol: 0.06, filterFreq: 2000, filterType: 'bandpass', q: 1.5, attack: 0.03 });
        playTone({ freq: 460, type: 'triangle', dur: 0.07, vol: 0.035, slideTo: 640 });
        break;
      case 'boltDown':
        playTone({ freq: 1250, type: 'square', dur: 0.018, vol: 0.07 });
        playTone({ freq: 260, type: 'triangle', dur: 0.04, vol: 0.05, when: 0.01, slideTo: 180 });
        break;
      case 'boxLatch':
        playTone({ freq: 760, type: 'square', dur: 0.022, vol: 0.06 });
        playTone({ freq: 380, type: 'square', dur: 0.03, vol: 0.05, when: 0.03 });
        break;
      case 'belt':        // a belt of rounds rattling link by link
        for (let i = 0; i < 9; i++) playTone({ freq: rr(1800, 2800), type: 'triangle', dur: 0.02, vol: 0.035, when: i * 0.028 + rr(0, 0.01) });
        playNoise({ dur: 0.26, vol: 0.03, filterFreq: 3500, filterType: 'bandpass', attack: 0.04 });
        break;
      case 'boxSeat':
        playTone({ freq: 95, type: 'sine', dur: 0.1, vol: 0.11, slideTo: 55 });
        playNoise({ dur: 0.06, vol: 0.06, filterFreq: 700, filterType: 'lowpass' });
        break;
      case 'motorBlip':
        playTone({ freq: 110, type: 'sawtooth', dur: 0.28, vol: 0.05, slideTo: 260 });
        playTone({ freq: 260, type: 'sawtooth', dur: 0.2, vol: 0.035, when: 0.26, slideTo: 90 });
        break;
      case 'valveShut':
        playTone({ freq: 1400, type: 'sine', dur: 0.09, vol: 0.03, slideTo: 900 });
        playNoise({ dur: 0.22, vol: 0.05, filterFreq: 5000, filterType: 'highpass', attack: 0.01 });
        break;
      case 'tankOff':
        playTone({ freq: 700, type: 'square', dur: 0.02, vol: 0.05 });
        playTone({ freq: 160, type: 'sine', dur: 0.12, vol: 0.07, when: 0.05, slideTo: 110 });
        playNoise({ dur: 0.1, vol: 0.05, filterFreq: 600, filterType: 'lowpass', when: 0.05 });
        break;
      case 'tankOn':
        playTone({ freq: 140, type: 'sine', dur: 0.14, vol: 0.1, slideTo: 85 });
        playNoise({ dur: 0.08, vol: 0.06, filterFreq: 800, filterType: 'lowpass' });
        playTone({ freq: 680, type: 'square', dur: 0.02, vol: 0.06, when: 0.1 });
        break;
      case 'valveOpen':
        playNoise({ dur: 0.35, vol: 0.05, filterFreq: 5200, filterType: 'highpass', attack: 0.05 });
        playTone({ freq: 900, type: 'sine', dur: 0.1, vol: 0.025, slideTo: 1500 });
        break;
      case 'igniter':
        playTone({ freq: 2600, type: 'square', dur: 0.01, vol: 0.05 });
        playTone({ freq: 2600, type: 'square', dur: 0.01, vol: 0.05, when: 0.06 });
        playNoise({ dur: 0.2, vol: 0.06, filterFreq: 700, filterType: 'lowpass', when: 0.08, attack: 0.04 });
        break;
      case 'shell':       // a shotgun shell thumbed into the tube
        playNoise({ dur: 0.04, vol: 0.06, filterFreq: 1700, filterType: 'bandpass', q: 1.3, attack: 0.012 });
        playTone({ freq: 520, type: 'triangle', dur: 0.04, vol: 0.05, when: 0.03, slideTo: 300 });
        playTone({ freq: 1500, type: 'square', dur: 0.01, vol: 0.035, when: 0.05 });
        break;
      case 'brass':       // spent cases tumbling out onto the ground
        for (let i = 0; i < 6; i++) {
          playTone({ freq: rr(1700, 3200), type: 'triangle', dur: 0.03, vol: 0.03, when: 0.05 + i * rr(0.04, 0.07) });
          playNoise({ dur: 0.015, vol: 0.015, filterFreq: 3800, filterType: 'bandpass', when: 0.05 + i * 0.05 });
        }
        break;
      case 'bigBrass':    // fat launcher cases, fewer and duller
        for (let i = 0; i < 4; i++) playTone({ freq: rr(500, 900), type: 'triangle', dur: 0.06, vol: 0.05, when: 0.06 + i * rr(0.07, 0.11), slideTo: 380 });
        break;
      case 'grab':        // hand to the pouch
        playNoise({ dur: 0.08, vol: 0.03, filterFreq: 2400, filterType: 'bandpass', q: 0.8, attack: 0.03 });
        break;
    }
  }
  // Reload finished: a tiny settle instead of the old two-note UI beep.
  function reloadDone() {
    playNoise({ dur: 0.03, vol: 0.025, filterFreq: 1800, filterType: 'bandpass' });
  }
  function reloadStart() { reloadCue('grab'); }

  // --- Turret servos: a low motor per turret, up to four at once — the nearest
  // and fastest-turning. Each gun has its own pitch, so a bank of them sounds like
  // a bank of them rather than one buzz.
  const servoVoices = [];
  function makeServoVoice(c) {
    const t0 = c.currentTime;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 40;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 80;
    const whine = c.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 240;
    const wg = c.createGain(); wg.gain.value = 0.12;                 // a hint of gear whine
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.8;
    // Cogging: the motor beats a few times a revolution.
    const am = c.createGain(); am.gain.value = 0.82;
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 17;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 0.18;
    lfo.connect(lfoAmt); lfoAmt.connect(am.gain);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    o1.connect(lp); o2.connect(lp); whine.connect(wg); wg.connect(lp);
    lp.connect(am); am.connect(g);
    if (pan) { g.connect(pan); pan.connect(fxBus || sfxGain); } else g.connect(fxBus || sfxGain);
    o1.start(t0); o2.start(t0); whine.start(t0); lfo.start(t0);
    return { o1, o2, whine, lp, am, lfo, g, pan, key: null };
  }
  // `list`: up to four { key, level, freq, pan }, loudest first.
  function turretServos(list) {
    const c = ctx;
    if (!c || muted) {
      for (const v of servoVoices) { try { v.g.gain.setTargetAtTime(0.0001, c ? c.currentTime : 0, 0.05); } catch (_) {} }
      return;
    }
    const t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      const want = list && list[i];
      if (!want && !servoVoices[i]) continue;
      if (!servoVoices[i]) {
        if (!want || want.level < 0.004) continue;
        servoVoices[i] = makeServoVoice(c);
      }
      const v = servoVoices[i];
      const lvl = want ? Math.min(0.05, want.level * 0.055) : 0;
      const f = want ? want.freq : 40;
      try {
        // A voice that has changed turret jumps rather than slides to the new pitch.
        const jump = want && v.key !== want.key;
        if (jump) { v.key = want.key; v.o1.frequency.setValueAtTime(f, t); v.o2.frequency.setValueAtTime(f * 2, t); v.whine.frequency.setValueAtTime(f * 6, t); }
        else {
          v.o1.frequency.setTargetAtTime(f, t, 0.08);
          v.o2.frequency.setTargetAtTime(f * 2, t, 0.08);
          v.whine.frequency.setTargetAtTime(f * 6, t, 0.08);
        }
        v.lfo.frequency.setTargetAtTime(f * 0.42, t, 0.1);
        v.lp.frequency.setTargetAtTime(220 + f * 3.4, t, 0.1);
        v.g.gain.setTargetAtTime(Math.max(0.0001, lvl), t, 0.06);
        if (v.pan && want) v.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, want.pan || 0)), t, 0.08);
      } catch (_) {}
    }
  }

  // --- Landmine: the click-beep of a pressure plate taking weight.
  function mineBeep(v = 1, pan = 0) {
    if (v < 0.03) return;
    playTone({ freq: 1400, type: 'square', dur: 0.015, vol: 0.06 * v, pan });
    playTone({ freq: 2350, type: 'square', dur: 0.11, vol: 0.09 * v, when: 0.03, pan, attack: 0.005 });
    playTone({ freq: 2350, type: 'sine', dur: 0.11, vol: 0.05 * v, when: 0.03, pan });
  }

  // --- Builds under attack, and coming apart. `mat`: wood, metal, steel, sand,
  // wire, turret.
  const buildHitCd = {};
  function buildHit(mat, v = 1, pan = 0) {
    const c = ensure();
    if (!c || muted || v < 0.04) return;
    if (c.currentTime < (buildHitCd[mat] || 0)) return;
    buildHitCd[mat] = c.currentTime + 0.07;
    if (mat === 'wood') {
      playTone({ freq: rr(120, 160), type: 'sine', dur: 0.09, vol: 0.12 * v, slideTo: 70, pan });
      playNoise({ dur: 0.07, vol: 0.08 * v, filterFreq: rr(600, 900), filterType: 'bandpass', q: 1.2, pan });
      if (Math.random() < 0.35) playNoise({ dur: 0.05, vol: 0.05 * v, filterFreq: 2600, filterType: 'bandpass', q: 2, when: 0.03, pan }); // splinter
    } else if (mat === 'stone') {
      playTone({ freq: rr(90, 120), type: 'sine', dur: 0.08, vol: 0.12 * v, slideTo: 55, pan });
      playNoise({ dur: 0.06, vol: 0.09 * v, filterFreq: rr(1800, 2600), filterType: 'bandpass', q: 1.5, pan });   // chip
      if (Math.random() < 0.4) for (let i = 0; i < 3; i++) playTone({ freq: rr(900, 1600), type: 'triangle', dur: 0.025, vol: 0.02 * v, when: 0.05 + i * 0.04, pan }); // grit falling
    } else if (mat === 'sand') {
      playNoise({ dur: 0.1, vol: 0.1 * v, filterFreq: 320, filterType: 'lowpass', pan });
      playNoise({ dur: 0.12, vol: 0.025 * v, filterFreq: 4200, filterType: 'highpass', when: 0.03, attack: 0.03, pan }); // grit trickle
    } else if (mat === 'wire') {
      for (let i = 0; i < 4; i++) playTone({ freq: rr(2200, 3400), type: 'triangle', dur: 0.05, vol: 0.03 * v, when: i * 0.03, pan });
      playTone({ freq: rr(500, 700), type: 'sawtooth', dur: 0.12, vol: 0.03 * v, slideTo: 380, pan });
    } else {
      // metal / steel / turret: a clang with a ring to it
      const f = mat === 'turret' ? rr(520, 700) : rr(700, 1000);
      playTone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.07 * v, pan });
      playTone({ freq: f * 2.76, type: 'sine', dur: 0.12, vol: 0.03 * v, pan });
      playNoise({ dur: 0.04, vol: 0.07 * v, filterFreq: 3000, filterType: 'bandpass', pan });
      playTone({ freq: 110, type: 'sine', dur: 0.06, vol: 0.06 * v, slideTo: 60, pan });
    }
  }
  function buildBreak(mat, v = 1, pan = 0) {
    if (muted || v < 0.03) return;
    if (mat === 'wood') {
      playNoise({ dur: 0.12, vol: 0.18 * v, filterFreq: 1800, filterType: 'bandpass', q: 0.9, pan });         // crack
      playTone({ freq: 90, type: 'sine', dur: 0.25, vol: 0.14 * v, slideTo: 40, pan });
      playTone({ freq: 240, type: 'sawtooth', dur: 0.3, vol: 0.04 * v, slideTo: 150, when: 0.04, pan });    // creak
      for (let i = 0; i < 5; i++) playTone({ freq: rr(130, 260), type: 'triangle', dur: 0.07, vol: 0.06 * v, when: 0.15 + i * rr(0.06, 0.1), slideTo: 90, pan }); // planks landing
      playNoise({ dur: 0.35, vol: 0.05 * v, filterFreq: 500, filterType: 'lowpass', when: 0.1, pan, rev: 0.3 });
    } else if (mat === 'stone') {
      playTone({ freq: 55, type: 'sine', dur: 0.4, vol: 0.16 * v, slideTo: 30, pan, rev: 0.3 });              // the fall
      playNoise({ dur: 0.6, vol: 0.12 * v, filterFreq: 700, filterType: 'lowpass', attack: 0.02, pan, rev: 0.4 }); // rubble
      for (let i = 0; i < 7; i++) playTone({ freq: rr(140, 320), type: 'triangle', dur: 0.06, vol: 0.05 * v, when: 0.1 + i * rr(0.05, 0.1), slideTo: 90, pan }); // blocks landing
    } else if (mat === 'sand') {
      playNoise({ dur: 0.1, vol: 0.12 * v, filterFreq: 3000, filterType: 'bandpass', q: 1.5, pan });          // burlap tearing
      playNoise({ dur: 0.9, vol: 0.08 * v, filterFreq: 900, filterType: 'lowpass', when: 0.05, attack: 0.1, pan }); // sand pouring out
      playTone({ freq: 70, type: 'sine', dur: 0.2, vol: 0.1 * v, slideTo: 40, pan });
    } else if (mat === 'wire') {
      playTone({ freq: 1400, type: 'sawtooth', dur: 0.18, vol: 0.06 * v, slideTo: 180, pan });               // snap-twang
      playTone({ freq: 1100, type: 'sawtooth', dur: 0.2, vol: 0.05 * v, slideTo: 150, when: 0.08, pan });
      for (let i = 0; i < 6; i++) playTone({ freq: rr(2400, 3800), type: 'triangle', dur: 0.04, vol: 0.025 * v, when: 0.1 + i * 0.04, pan });
    } else if (mat === 'turret') {
      playNoise({ dur: 0.2, vol: 0.16 * v, filterFreq: 1400, filterType: 'bandpass', pan, rev: 0.3 });
      playTone({ freq: 480, type: 'triangle', dur: 0.5, vol: 0.08 * v, slideTo: 300, pan });
      playTone({ freq: 1600, type: 'sine', dur: 0.8, vol: 0.04 * v, slideTo: 90, when: 0.05, pan });        // power dying
      for (let i = 0; i < 5; i++) playNoise({ dur: 0.02, vol: 0.05 * v, filterFreq: 6000, filterType: 'highpass', when: 0.05 + i * rr(0.04, 0.09), pan }); // sparks
      playTone({ freq: 80, type: 'sine', dur: 0.3, vol: 0.12 * v, slideTo: 40, when: 0.2, pan });           // hits the deck
    } else {
      // metal / steel: a crash and a grind
      playNoise({ dur: 0.25, vol: 0.14 * v, filterFreq: 2200, filterType: 'bandpass', q: 0.8, pan, rev: 0.3 });
      playTone({ freq: rr(300, 420), type: 'triangle', dur: 0.5, vol: 0.07 * v, pan });
      playTone({ freq: 160, type: 'sawtooth', dur: 0.35, vol: 0.04 * v, slideTo: 80, when: 0.08, pan });
      playTone({ freq: 90, type: 'sine', dur: 0.2, vol: 0.1 * v, slideTo: 45, when: 0.15, pan });
    }
  }

  // --- Putting things up. Every kind of piece has its own work sound.
  function buildSound(kind) {
    const knock = (w, f = 1) => {
      playTone({ freq: rr(200, 250) * f, type: 'sine', dur: 0.06, vol: 0.1, when: w, slideTo: 120 * f });
      playNoise({ dur: 0.035, vol: 0.08, filterFreq: 1900 * f, filterType: 'bandpass', q: 1.3, when: w });
    };
    const clank = (w, f = 1) => {
      playTone({ freq: rr(650, 850) * f, type: 'triangle', dur: 0.12, vol: 0.06, when: w });
      playNoise({ dur: 0.03, vol: 0.06, filterFreq: 3200 * f, filterType: 'bandpass', when: w });
    };
    const thump = (w, v = 1) => {
      playTone({ freq: 75, type: 'sine', dur: 0.12, vol: 0.13 * v, when: w, slideTo: 45 });
      playNoise({ dur: 0.08, vol: 0.07 * v, filterFreq: 350, filterType: 'lowpass', when: w });
    };
    const dig = (w) => {
      playNoise({ dur: 0.12, vol: 0.09, filterFreq: 600, filterType: 'bandpass', q: 0.7, when: w, attack: 0.02 });
      playNoise({ dur: 0.18, vol: 0.05, filterFreq: 300, filterType: 'lowpass', when: w + 0.08 });
    };
    switch (kind) {
      case 'wall': case 'floor': case 'platform': case 'stairs': case 'pillar':
        thump(0, 0.8); knock(0.1); knock(0.21); knock(0.3, 1.05); break;
      case 'window':
        playTone({ freq: 380, type: 'sawtooth', dur: 0.22, vol: 0.04, slideTo: 250 });   // boards prised off
        playNoise({ dur: 0.1, vol: 0.07, filterFreq: 2000, filterType: 'bandpass', when: 0.18 });
        knock(0.32); break;
      case 'door':
        knock(0); knock(0.1);
        playTone({ freq: 520, type: 'sawtooth', dur: 0.2, vol: 0.025, when: 0.2, slideTo: 700 }); // hinge
        playTone({ freq: 900, type: 'square', dur: 0.02, vol: 0.05, when: 0.42 });              // latch
        break;
      case 'sandbag': thump(0); thump(0.16, 0.9); playNoise({ dur: 0.18, vol: 0.03, filterFreq: 4000, filterType: 'highpass', when: 0.05 }); break;
      case 'barricade': clank(0); clank(0.12, 0.9); playNoise({ dur: 0.2, vol: 0.04, filterFreq: 1200, filterType: 'bandpass', when: 0.2 }); break;
      case 'railing': clank(0, 1.2); clank(0.1, 1.25); break;
      case 'wire':
        playNoise({ dur: 0.3, vol: 0.05, filterFreq: 2600, filterType: 'bandpass', q: 2, attack: 0.1 }); // unspooling
        playTone({ freq: 900, type: 'sawtooth', dur: 0.2, vol: 0.035, when: 0.28, slideTo: 1200 });       // pulled taut
        break;
      case 'spikes': dig(0); dig(0.18); playTone({ freq: 1200, type: 'square', dur: 0.02, vol: 0.04, when: 0.4 }); break;
      case 'mine':
        dig(0);
        playTone({ freq: 1500, type: 'square', dur: 0.04, vol: 0.05, when: 0.3 });
        playTone({ freq: 1500, type: 'square', dur: 0.04, vol: 0.05, when: 0.4 });
        playTone({ freq: 2000, type: 'square', dur: 0.08, vol: 0.05, when: 0.5 });              // armed
        break;
      case 'barrel':
        playTone({ freq: 140, type: 'triangle', dur: 0.2, vol: 0.09, slideTo: 100 });
        playNoise({ dur: 0.25, vol: 0.04, filterFreq: 500, filterType: 'lowpass', when: 0.08, attack: 0.05 }); // slosh
        break;
      case 'lure':
        clank(0, 1.3);
        [900, 1200, 1500].forEach((f, i) => playTone({ freq: f, type: 'square', dur: 0.05, vol: 0.04, when: 0.15 + i * 0.07 }));
        break;
      case 'light': case 'heavy': case 'flame': case 'mortar': {
        const deep = kind === 'heavy' || kind === 'mortar' ? 0.7 : 1;
        thump(0, 1.1);
        for (let i = 0; i < 6; i++) playTone({ freq: 1500 * deep, type: 'square', dur: 0.008, vol: 0.035, when: 0.12 + i * 0.03 }); // ratchet
        clank(0.32, deep);
        if (kind === 'flame') playNoise({ dur: 0.3, vol: 0.06, filterFreq: 700, filterType: 'lowpass', when: 0.45, attack: 0.05 }); // pilot lights
        else if (kind !== 'mortar') playTone({ freq: 300 * deep, type: 'sine', dur: 0.45, vol: 0.03, when: 0.42, slideTo: 1200 * deep }); // powers up
        break;
      }
      case 'shovel': dig(0); dig(0.15); break;
      default: knock(0); knock(0.12);
    }
  }

  // --- Zombie voices: what they sound like depends on what they are and what they
  // are doing — shuffling about, hunting you down, or swinging.
  let voiceCd = 0;
  function zombieVoice(type, state, v = 1, pan = 0) {
    const c = ensure();
    if (!c || muted || v < 0.04) return;
    if (c.currentTime < voiceCd) return;
    voiceCd = c.currentTime + (state === 'attack' ? 0.09 : 0.28);
    const rv = 0.3;
    const growl = (f0, f1, dur, vol, type = 'sawtooth', w = 0) => playTone({ freq: f0, type, dur, vol: vol * v, slideTo: f1, rev: rv, attack: 0.04, pan, when: w });
    const breath = (freq, dur, vol, w = 0) => playNoise({ dur, vol: vol * v, filterFreq: freq, filterType: 'bandpass', q: 0.9, rev: rv, attack: dur * 0.3, pan, when: w });
    switch (type) {
      case 'feral':
        if (state === 'attack') { growl(rr(260, 320), 140, 0.2, 0.08); breath(1800, 0.15, 0.08); }
        else if (state === 'chase') { for (let i = 0; i < 3; i++) breath(rr(1400, 2000), 0.09, 0.05, i * 0.16); growl(rr(200, 240), 170, 0.3, 0.04, 'sawtooth', 0.05); }
        else { growl(rr(150, 190), 120, 0.5, 0.04); breath(1200, 0.3, 0.03, 0.1); }
        break;
      case 'leaper':
        if (state === 'attack' || state === 'leap') { growl(700, 1500, 0.32, 0.08); breath(3000, 0.3, 0.07); }
        else if (state === 'chase') { breath(2600, 0.25, 0.05); growl(rr(420, 520), 300, 0.2, 0.03, 'square'); }
        else breath(2200, 0.4, 0.035);                                              // hiss
        break;
      case 'spider': {
        const n = state === 'attack' ? 10 : (state === 'chase' ? 7 : 4);            // chitter
        for (let i = 0; i < n; i++) playTone({ freq: rr(2600, 4200), type: 'square', dur: 0.008, vol: 0.04 * v, when: i * rr(0.025, 0.045), pan });
        if (state !== 'idle') breath(4500, 0.25, 0.04, 0.05);
        break;
      }
      case 'drowned':
        growl(rr(70, 95), 55, 0.7, 0.05);
        for (let i = 0; i < (state === 'idle' ? 4 : 7); i++) playTone({ freq: rr(300, 700), type: 'sine', dur: 0.04, vol: 0.035 * v, slideTo: rr(700, 1100), when: 0.05 + i * rr(0.05, 0.1), pan }); // bubbles
        if (state === 'attack') breath(700, 0.2, 0.08);
        break;
      case 'military':
        // Breathing through a gas mask, and the odd burst from a dead radio.
        breath(900, 0.45, 0.05); breath(700, 0.5, 0.045, 0.55);
        if (state !== 'idle' || Math.random() < 0.4) playNoise({ dur: 0.25, vol: 0.03 * v, filterFreq: 2400, filterType: 'bandpass', q: 3, when: 0.2, pan });
        if (state === 'attack') growl(160, 90, 0.2, 0.08);
        break;
      case 'brute':
        if (state === 'attack') { growl(95, 55, 0.35, 0.12); playNoise({ dur: 0.2, vol: 0.08 * v, filterFreq: 300, filterType: 'lowpass', pan }); }
        else if (state === 'chase') { growl(70, 50, 0.6, 0.09); growl(141, 100, 0.5, 0.04, 'triangle'); }
        else growl(rr(55, 70), 45, 0.8, 0.07);
        break;
      case 'spitter':
        if (state === 'attack') breath(900, 0.2, 0.08);
        else { growl(rr(110, 140), 90, 0.5, 0.04); for (let i = 0; i < 5; i++) playNoise({ dur: 0.03, vol: 0.04 * v, filterFreq: rr(500, 900), filterType: 'bandpass', when: 0.1 + i * 0.06, pan }); } // phlegm rattle
        break;
      case 'screamer':
        if (state === 'attack') growl(900, 1300, 0.25, 0.06);
        else if (state === 'chase') { growl(rr(500, 600), 750, 0.5, 0.045, 'triangle'); breath(2400, 0.4, 0.03); }
        else growl(rr(380, 440), 300, 0.9, 0.035, 'triangle');                    // a thin moan
        break;
      case 'bomber':
        // The charge it carries fizzes and bubbles; faster the closer it gets.
        playNoise({ dur: state === 'idle' ? 0.5 : 0.7, vol: 0.05 * v, filterFreq: 5500, filterType: 'highpass', attack: 0.05, pan });
        for (let i = 0; i < (state === 'idle' ? 2 : 5); i++) playTone({ freq: 2000, type: 'square', dur: 0.02, vol: 0.03 * v, when: i * (state === 'idle' ? 0.35 : 0.14), pan }); // ticking
        growl(rr(90, 120), 70, 0.4, 0.035);
        break;
      case 'demon':
        growl(rr(60, 75), 40, 0.7, 0.09); growl(rr(122, 150), 80, 0.6, 0.05, 'square', 0.03);
        playNoise({ dur: 0.5, vol: 0.05 * v, filterFreq: 220, filterType: 'lowpass', rev: 0.5, pan });
        if (state === 'attack') breath(1200, 0.2, 0.06);
        break;
      case 'colossus':
        growl(rr(38, 46), 28, 1.1, 0.13); growl(rr(78, 90), 50, 0.9, 0.05, 'triangle', 0.05);
        break;
      default:            // shambler and anything new: the plain groan, meaner up close
        if (state === 'attack') { growl(rr(150, 190), 90, 0.25, 0.08); breath(1100, 0.15, 0.06); }
        else if (state === 'chase') { growl(rr(90, 120), 70, 0.6, 0.06); breath(700, 0.4, 0.03, 0.15); }
        else groan(v * 0.9, false);
    }
  }

  // --- Night vision: the tube whines up when the goggles come down, a faint
  // low hum while they are on, and whines away when they go up.
  let nvgHumNode = null;
  function nvgToggle(on) {
    playTone({ freq: on ? 420 : 520, type: 'square', dur: 0.03, vol: 0.07 });                   // mount clicks
    playNoise({ dur: 0.05, vol: 0.05, filterFreq: 2400, filterType: 'bandpass', when: 0.01 });
    if (on) playTone({ freq: 700, type: 'sine', dur: 0.7, vol: 0.035, slideTo: 7200, when: 0.05, attack: 0.1 });
    else playTone({ freq: 6800, type: 'sine', dur: 0.5, vol: 0.03, slideTo: 500, when: 0.03 });
  }
  function nvgHum(on) {
    const c = ctx;
    if (!c) return;
    if (on && !muted) {
      if (nvgHumNode) return;
      const t0 = c.currentTime;
      // (Only the low hum stays on; the tube's whine is just the flip up and down.)
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 7200;
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = 120;
      const g = c.createGain(); g.gain.setValueAtTime(0, t0);
      const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t0); g2.gain.setTargetAtTime(0.006, t0 + 0.6, 0.2);
      o.connect(g); o2.connect(g2); g.connect(fxBus || sfxGain); g2.connect(fxBus || sfxGain);
      o.start(t0); o2.start(t0);
      nvgHumNode = { o, o2, g, g2 };
    } else if (nvgHumNode) {
      const n = nvgHumNode; nvgHumNode = null;
      const t = c.currentTime;
      try { n.g.gain.setTargetAtTime(0.0001, t, 0.06); n.g2.gain.setTargetAtTime(0.0001, t, 0.06); n.o.stop(t + 0.4); n.o2.stop(t + 0.4); } catch (_) {}
    }
  }

  // --- Kiosk: the register when you buy, a thunk as it drops in the tray, and a
  // button click as you flip between the tabs.
  function kioskBuy() {
    const c = ensure(); if (!c || muted) return;
    if (c.currentTime < (kioskBuy._cd || 0)) return;
    kioskBuy._cd = c.currentTime + 0.12;
    playTone({ freq: 700, type: 'square', dur: 0.02, vol: 0.05 });                                   // key
    playNoise({ dur: 0.1, vol: 0.06, filterFreq: 1500, filterType: 'bandpass', when: 0.04 });        // drawer
    playTone({ freq: 2093, type: 'sine', dur: 0.5, vol: 0.06, when: 0.08, rev: 0.2 });               // bell
    playTone({ freq: 2637, type: 'sine', dur: 0.4, vol: 0.035, when: 0.08 });
    for (let i = 0; i < 3; i++) playTone({ freq: rr(3000, 4200), type: 'triangle', dur: 0.03, vol: 0.025, when: 0.16 + i * 0.05 }); // coins
    playTone({ freq: 120, type: 'sine', dur: 0.12, vol: 0.08, when: 0.32, slideTo: 70 });            // into the tray
    playNoise({ dur: 0.06, vol: 0.05, filterFreq: 600, filterType: 'lowpass', when: 0.32 });
  }
  function kioskTab() {
    playTone({ freq: 1200, type: 'square', dur: 0.012, vol: 0.04 });
    playTone({ freq: 800, type: 'square', dur: 0.015, vol: 0.03, when: 0.03 });
  }

  // --- Doors: the latch, the hinge, and the leaf meeting the frame.
  function doorSound(open, v = 1, pan = 0) {
    if (open) {
      playTone({ freq: 850, type: 'square', dur: 0.02, vol: 0.06 * v, pan });                        // latch
      playTone({ freq: rr(300, 360), type: 'sawtooth', dur: 0.45, vol: 0.025 * v, when: 0.05, slideTo: rr(520, 640), attack: 0.08, pan }); // creak
      playNoise({ dur: 0.3, vol: 0.02 * v, filterFreq: 1400, filterType: 'bandpass', when: 0.08, attack: 0.1, pan });
    } else {
      playTone({ freq: rr(560, 620), type: 'sawtooth', dur: 0.3, vol: 0.022 * v, slideTo: 380, attack: 0.06, pan });
      playTone({ freq: 110, type: 'sine', dur: 0.12, vol: 0.12 * v, when: 0.3, slideTo: 60, pan });   // thud into the frame
      playNoise({ dur: 0.06, vol: 0.07 * v, filterFreq: 700, filterType: 'lowpass', when: 0.3, pan });
      playTone({ freq: 950, type: 'square', dur: 0.02, vol: 0.05 * v, when: 0.33, pan });            // latch catches
    }
  }

  // --- Boots on boards: a hollow knock instead of the grass scuff.
  function footstepWood(running) {
    const p = 0.9 + Math.random() * 0.2;
    playTone({ freq: 150 * p, type: 'sine', dur: 0.06, vol: running ? 0.08 : 0.055, slideTo: 95 * p });
    playNoise({ dur: 0.035, vol: running ? 0.06 : 0.04, filterFreq: 1100 * p, filterType: 'bandpass', q: 1.4 });
    if (Math.random() < 0.15) playTone({ freq: rr(280, 340), type: 'sawtooth', dur: 0.12, vol: 0.012, when: 0.04, slideTo: 250 }); // a board creaks
  }

  // --- HQ sounds ---------------------------------------------------------------
  // The klaxon: three long, loud two-tone blasts, the air-raid kind.
  // The alarm: three long blasts two octaves down — a detuned growl with a tritone
  // over it, a sub underneath, and a rasp of air through the horn.
  function klaxon() {
    for (let i = 0; i < 3; i++) {
      const w = i * 1.1;
      playTone({ freq: 105, type: 'sawtooth', dur: 0.9, vol: 0.2, when: w, slideTo: 92, attack: 0.05, rev: 0.7 });
      playTone({ freq: 109, type: 'sawtooth', dur: 0.9, vol: 0.14, when: w, slideTo: 95, attack: 0.05, rev: 0.6 });
      playTone({ freq: 148, type: 'square', dur: 0.9, vol: 0.07, when: w, slideTo: 131, attack: 0.05, rev: 0.6 });
      playTone({ freq: 52, type: 'sine', dur: 0.95, vol: 0.2, when: w, slideTo: 44, attack: 0.04, rev: 0.4 });
      playNoise({ dur: 0.9, vol: 0.07, filterFreq: 320, filterType: 'bandpass', q: 2.5, when: w, attack: 0.06, rev: 0.6 });
      playNoise({ dur: 0.12, vol: 0.06, filterFreq: 180, filterType: 'lowpass', when: w, rev: 0.3 });
    }
  }
  // A flare going up: the thump of the launch and a falling whistle.
  function flareWhistle() {
    const c = ensure(); if (!c || muted) return;
    playNoise({ dur: 0.08, vol: 0.12, filterFreq: 400, filterType: 'lowpass' });
    playTone({ freq: rr(2200, 2800), type: 'sine', dur: 1.8, vol: 0.05, slideTo: rr(900, 1300), attack: 0.08, rev: 0.4 });
    playNoise({ dur: 1.4, vol: 0.02, filterFreq: 3500, filterType: 'bandpass', q: 4, attack: 0.1 });
  }
  function flareBurst(v = 1, pan = 0) {
    playNoise({ dur: 0.35, vol: 0.2 * v, filterFreq: 1500, filterType: 'bandpass', q: 0.7, pan, rev: 0.8 });
    playTone({ freq: 80, type: 'sine', dur: 0.4, vol: 0.12 * v, slideTo: 40, pan, rev: 0.6 });
    for (let i = 0; i < 6; i++) playNoise({ dur: 0.03, vol: 0.05 * v, filterFreq: 5000, filterType: 'highpass', when: 0.2 + i * rr(0.06, 0.14), pan, rev: 0.5 }); // crackle
  }
  // Inside the HQ: gears winding up, a hopper clanking, a press — then a bell.
  function hqMachine(dur = 3.4) {
    playTone({ freq: 60, type: 'sawtooth', dur: dur, vol: 0.05, slideTo: 140, attack: 0.4, rev: 0.3 });
    playTone({ freq: 120, type: 'square', dur: dur * 0.9, vol: 0.02, slideTo: 260, attack: 0.5 });
    playNoise({ dur: dur, vol: 0.03, filterFreq: 600, filterType: 'bandpass', q: 1, attack: 0.5 });
    for (let t = 0.3; t < dur - 0.2; t += rr(0.25, 0.5)) {
      playTone({ freq: rr(500, 900), type: 'square', dur: 0.04, vol: 0.05, when: t });
      playNoise({ dur: 0.05, vol: 0.05, filterFreq: 2400, filterType: 'bandpass', when: t });
    }
    for (const t of [dur * 0.5, dur * 0.8]) { playTone({ freq: 70, type: 'sine', dur: 0.2, vol: 0.12, when: t, slideTo: 40 }); playNoise({ dur: 0.18, vol: 0.08, filterFreq: 300, filterType: 'lowpass', when: t }); }
    playNoise({ dur: 0.5, vol: 0.05, filterFreq: 5000, filterType: 'highpass', when: dur * 0.85, attack: 0.05 });   // steam
  }
  function hqDing() {
    playTone({ freq: 1568, type: 'sine', dur: 1.4, vol: 0.12, rev: 0.4 });
    playTone({ freq: 2093, type: 'sine', dur: 1.1, vol: 0.06, when: 0.02, rev: 0.4 });
    playTone({ freq: 3136, type: 'sine', dur: 0.6, vol: 0.025, when: 0.02 });
  }
  function bagThrow() {
    playNoise({ dur: 0.25, vol: 0.06, filterFreq: 900, filterType: 'bandpass', q: 0.8, attack: 0.08 });   // whoosh
    for (let i = 0; i < 4; i++) playTone({ freq: rr(700, 1100), type: 'triangle', dur: 0.03, vol: 0.03, when: i * 0.05 });   // bones rattling in it
  }
  function skullPickup() {
    playTone({ freq: rr(500, 650), type: 'triangle', dur: 0.05, vol: 0.07 });
    playTone({ freq: rr(800, 1000), type: 'triangle', dur: 0.04, vol: 0.05, when: 0.04 });
    playNoise({ dur: 0.05, vol: 0.04, filterFreq: 1800, filterType: 'bandpass', when: 0.01 });
  }

  // Duck depths [ambience, music, hold s] per shot: bigger guns push the rest of the
  // mix further down. Explosions hardest of all.
  const SHOT_DUCK = {
    pistol: [0.5, 0.78], uzi: [0.55, 0.8], revolver: [0.35, 0.62], m4: [0.45, 0.7], ak: [0.4, 0.66],
    minigun: [0.5, 0.72], shotgun: [0.3, 0.58, 0.08], aa12: [0.35, 0.62], sniper: [0.25, 0.52, 0.12],
    launcher: [0.45, 0.7]
  };
  const BIG = [0.18, 0.42, 0.25];
  const W = (fn, duck) => onBus('weap', fn, duck);
  const A = (fn) => onBus('amb', fn);
  return {
    unlock, toggleMute, isMuted, setMuted,
    fire: W(fire, [0.5, 0.75]), fireWeapon: W(fireWeapon, (id) => SHOT_DUCK[id] || [0.45, 0.7]),
    emptyClick: W(emptyClick), reloadStart: W(reloadStart), reloadDone: W(reloadDone), slideRack: W(slideRack),
    shotgunPump: W(shotgunPump), revolverCylinder: W(revolverCylinder), revolverSpin: W(revolverSpin),
    launcherDrum: W(launcherDrum), launcherShellInsert: W(launcherShellInsert),
    jump, nvgClick, coin, leafHit: W(leafHit), treeFell, treeThud, crownFire, trunkBump,
    win, resetBlip, noteSpin, startMusic, stopMusic,
    place, invalid, turretShot: W(turretShot, [0.7, 0.88]), zombieHit: W(zombieHit), zombieDeath: W(zombieDeath),
    groan, headshot: W(headshot), dodgeRoll, streak, footstep, heartbeat,
    waveStart, expand, gameOver, playerHurt, grenadeBoom: W(grenadeBoom, BIG), knifeSwing: W(knifeSwing),
    macheteSwing: W(macheteSwing), macheteChop: W(macheteChop), armorDon, armorHit, rockBreak: W(rockBreak),
    brassTink: W(brassTink), magThud: W(magThud),
    chainsawStart, chainsawStop, chainsawSetRev, chainsawGrit: W(chainsawGrit), isChainsawRunning,
    chainsawEngine: W(chainsawEngine), chainsawDryPull: W(chainsawDryPull), reloadCue: W(reloadCue),
    turretServos, mineBeep: W(mineBeep), buildHit: W(buildHit), buildBreak: W(buildBreak), buildSound,
    zombieVoice, nvgToggle, nvgHum, klaxon: W(klaxon, [0.3, 0.6, 0.3]), flareWhistle, flareBurst, hqMachine, hqDing, bagThrow, skullPickup, kioskBuy, kioskTab, doorSound, footstepWood,
    spit, acidHit, scream, bossSlam: W(bossSlam, BIG), bossRoar, spikeSnap, flameBurst: W(flameBurst, [0.6, 0.82]), stopFlames, fireHiss, fireCrackle,
    crateLand, pickup, repairClank, sellChime,
    bulletImpact: W(bulletImpact), knifeHit: W(knifeHit), gore: W(gore), grenadeThrow: W(grenadeThrow),
    grenadeBounce: W(grenadeBounce), heavyStep, emerge, shutter, medkit, medPen, planeFlyover, chuteOpen, gravePat, chisel, heave, bigSplash, graveAmbience, surface,
    // Read-only view of the mix, for tests and the perf overlay.
    mixState: () => ({ ctx: ctx ? ctx.state : 'none', weap: weapBus ? weapBus.gain.value : null, fx: fxBus ? fxBus.gain.value : null, amb: ambBus ? ambBus.gain.value : null, musicDuck: musicShotDuck, rain: rainLoop ? rainLoop.gain.gain.value : null }),
    rainStart, rainStop, rainSetIntensity, isRainRunning,
    updateMusic, musicState, setMood, setSfxVolume, setMusicVolume, getVolumes,
    ambienceStart, updateAmbience, birdChirp: A(birdChirp), owlHoot: A(owlHoot), thunder: A(thunder), dayCleared,
    distantGroan: A(distantGroan)
  };
})();
