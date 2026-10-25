// game/relay-puzzle.js — CL-183: the radio relay's supplies are earned (Claude's).
//
// Jerry: "I do not think you should just get the supplies by powering up the relay. I think there is an opportunity
// for extra gameplay by having players complete puzzles or mini-games to unlock supplies ... Let us start with idea 1
// the radio tower." Idea 1, as pitched: the cabinet's breakers are off (Sato's tag on the relay, "Tone on all channels
// 02:14", is the order: 2, 1, 4); then the radio is tuned by ear until the static clears into a number station that
// reads out the supply locker's code; then the relay is rebooted (hold E at the cabinet) while its tone pulls the dead
// in; then the code opens the locker.
//
// Pure state, no DOM, no THREE: index.html draws it (ui/relay-panel.js), sounds it (AudioSys.relay*) and wires the
// reboot into the objectives' existing six-second repair (the reboot's share is reported as the hold's seconds).
//
//   RELAY                       the numbers
//   createRelayPuzzle(rand)     one run's puzzle: { state, flip(n), tune(dMHz), setDial(f), clarity(), step(dt),
//                               pullLever(), startBoot(s), boot(dt), bootFrac(), enter(digit), unlock(), reset(rand) }
//   stationPlan(code)           the number station's beeps: [{ t, long, digit, last }] over one full reading
//   bootHoldSeconds(frac)       the reboot's share as the objectives' six-second hold
//   relayDayPlan(day)           CL-184: how long the reboot runs and how hard the dead come, by the day it is done
//
// CL-257 (Jerry, 2026-10-24, N4): "After you get the frequency right, you should have to pull a lever to reboot the
// relay. After the alarm for the reboot is done the morse code should play on loop regardless of if the player has the
// panel menu open or not." The order is now: breakers, tuning (the station locked in), 'lever' (pullLever), the
// reboot ('boot', startBoot), then 'locker': the relay is up and its mast plays the station's code on a loop for
// everyone near it (index.html), and the vault's keypad takes it. heardCode() is kept for old callers: it does nothing.
//
// CL-184 (Jerry, 2026-10-12): "Make the player have to figure out about the beeps ... The beeps should play on loop
// pause for a bit and then repeat the loop" (a longer pause between readings); "When rebooting you should just press e
// and be able to fight enemies. It will count down on it's own" (startBoot, then boot(dt) runs by itself); "The enemies
// fighting you gets harder each day and so and the reboot takes longer and longer" (relayDayPlan).

export const RELAY = Object.freeze({
  ORDER: Object.freeze([2, 1, 4]),   // Sato's 02:14, the leading zero dropped: breakers 2, 1, 4 (3 stays off)
  BREAKERS: 4,
  LOCKOUT_S: 1.6,          // a wrong breaker trips the lot, and the panel is too hot to touch for a moment
  BAND: Object.freeze([88, 108]),
  STEP_MHZ: 0.1,           // one press of A/D or a notch of the wheel
  CLEAR_MHZ: 0.25,         // within this of the station the static is gone
  FADE_MHZ: 3.5,           // ... and it starts to come through from this far
  LOCK_S: 1.4,             // held clear this long and the station is locked in
  CODE_LEN: 3,
  BEEP_S: 0.26, LONG_S: 0.62, DIGIT_GAP_S: 1.0, ROUND_GAP_S: 4.2,   // CL-184: a real pause before it starts over
  BOOT_S: 20,              // the reboot on day 1 (CL-184: one press of E starts it, it runs by itself); see relayDayPlan
  BOOT_PER_DAY_S: 3.5,     // ... and this much longer for every day after (day 20: 86.5 s)
  FINAL_DAY: 20,           // the extraction night's day
  HOLD_S: 6                // what the objectives count as a repair
});

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function bootHoldSeconds(frac) { return clamp(frac, 0, 1) * RELAY.HOLD_S; }

// CL-184: the day decides the reboot. bootS its length; first the pack its siren calls at once; then one more every
// `every` seconds while it runs, up to `cap` in all; mixDay is the day whose mix of kinds they are drawn from (a day
// ahead of the calendar: the relay calls the worse ones).
export function relayDayPlan(day) {
  const d = clamp(Math.floor(Number(day) || 1), 1, RELAY.FINAL_DAY);
  const bootS = RELAY.BOOT_S + (d - 1) * RELAY.BOOT_PER_DAY_S;
  const first = 3 + d;
  const every = Math.max(2, 6 - (d - 1) * 0.22);
  const cap = Math.min(48, first + Math.floor(bootS / every));
  return { day: d, bootS, first, every, cap, mixDay: Math.min(RELAY.FINAL_DAY, d + 1) };
}

// One reading: each digit is that many short beeps (0 is one long tone), a pause between digits, a longer one after.
export function stationPlan(code) {
  const out = [];
  let t = 0;
  code.forEach((d, i) => {
    if (d === 0) { out.push({ t, long: true, digit: i, last: true }); t += RELAY.LONG_S; }
    else for (let k = 0; k < d; k++) { out.push({ t, long: false, digit: i, last: k === d - 1 }); t += RELAY.BEEP_S; }
    t += RELAY.DIGIT_GAP_S;
  });
  return { beeps: out, length: t - RELAY.DIGIT_GAP_S + RELAY.ROUND_GAP_S };
}

export function createRelayPuzzle(rand = Math.random) {
  let s = null;
  function fresh(r) {
    const [lo, hi] = RELAY.BAND;
    // The station is somewhere in the band, never right where the dial starts (the bottom of it).
    const freq = Math.round((lo + 4 + r() * (hi - lo - 6)) * 10) / 10;
    const code = Array.from({ length: RELAY.CODE_LEN }, () => 1 + Math.floor(r() * 9));   // 1-9: every digit is beeps
    s = { stage: 'breakers', on: Array(RELAY.BREAKERS).fill(false), step: 0, lockout: 0, trips: 0,
      freq, dial: lo, lockT: 0, code, heard: false, lever: false, bootT: 0, bootS: RELAY.BOOT_S, booting: false, entry: [], unlocked: false, wrongCodes: 0 };
  }
  fresh(rand);
  const api = {
    get state() { return s; },
    reset(r = rand) { fresh(r); },
    // A breaker, 1-based. 'ok' for the next one in Sato's order, 'done' for the last, 'wrong' trips them all.
    flip(n) {
      if (s.stage !== 'breakers') return 'ignored';
      if (s.lockout > 0) return 'hot';
      const i = n - 1;
      if (i < 0 || i >= RELAY.BREAKERS || s.on[i]) return 'ignored';
      if (n !== RELAY.ORDER[s.step]) { s.on.fill(false); s.step = 0; s.lockout = RELAY.LOCKOUT_S; s.trips++; return 'wrong'; }
      s.on[i] = true; s.step++;
      if (s.step >= RELAY.ORDER.length) { s.stage = 'tuning'; return 'done'; }
      return 'ok';
    },
    tune(d) { return api.setDial(s.dial + d); },
    setDial(f) {
      const [lo, hi] = RELAY.BAND;
      s.dial = Math.round(clamp(f, lo, hi) * 100) / 100;
      return s.dial;
    },
    // 0 = only static .. 1 = the station clear.
    clarity() {
      const d = Math.abs(s.dial - s.freq);
      if (d <= RELAY.CLEAR_MHZ) return 1;
      return clamp(1 - (d - RELAY.CLEAR_MHZ) / (RELAY.FADE_MHZ - RELAY.CLEAR_MHZ), 0, 1) ** 2;
    },
    step(dt) {
      if (s.lockout > 0) s.lockout = Math.max(0, s.lockout - dt);
      if (s.stage === 'tuning') {
        s.lockT = api.clarity() >= 1 ? s.lockT + dt : Math.max(0, s.lockT - dt * 2);
        if (s.lockT >= RELAY.LOCK_S) { s.stage = 'lever'; s.lockT = RELAY.LOCK_S; return 'locked'; }   // CL-257
      }
      return null;
    },
    // CL-257: the station locked in, the lever on the cabinet's side reboots the relay (then startBoot runs it).
    pullLever() { if (s.stage !== 'lever') return false; s.lever = true; s.stage = 'boot'; return true; },
    // CL-257: the code is heard after the reboot now, from the mast; this is kept for old callers and does nothing.
    heardCode() { return false; },
    // CL-184: one press starts the reboot (its length set by the day); from then on it runs by itself.
    startBoot(seconds = RELAY.BOOT_S) {
      if (s.stage !== 'boot' || s.booting) return false;
      s.bootS = Math.max(1, Number(seconds) || RELAY.BOOT_S); s.booting = true;
      return true;
    },
    boot(dt, running = s.booting) {
      if (s.stage !== 'boot' || !running) return false;
      s.bootT = Math.min(s.bootS, s.bootT + dt);
      if (s.bootT >= s.bootS) { s.stage = 'locker'; s.booting = false; return true; }
      return false;
    },
    bootLeft() { return s.stage === 'boot' ? Math.max(0, s.bootS - s.bootT) : 0; },
    bootFrac() { return s.stage === 'locker' || s.stage === 'done' ? 1 : s.bootT / s.bootS; },
    // A keypad press at the locker: 'more', 'open' (the code, all digits) or 'wrong' (cleared for another go).
    enter(d) {
      if (s.stage !== 'locker' || s.unlocked) return 'ignored';
      s.entry.push(d);
      if (s.entry.length < RELAY.CODE_LEN) return 'more';
      const ok = s.entry.every((v, i) => v === s.code[i]);
      s.entry = [];
      if (ok) { s.unlocked = true; s.stage = 'done'; return 'open'; }
      s.wrongCodes++;
      return 'wrong';
    },
    // A run restored with the radio already up (or a debug skip): straight to the end.
    unlock() { s.on.fill(true); s.on[2] = false; s.step = RELAY.ORDER.length; s.heard = true; s.lever = true; s.bootT = s.bootS; s.booting = false; s.unlocked = true; s.stage = 'done'; }
  };
  return api;
}
