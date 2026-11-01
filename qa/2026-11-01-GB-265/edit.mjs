import fs from 'node:fs';
const f = 'index.html'; const t0 = fs.readFileSync(f, 'utf8'); const crlf = t0.split('\r\n').length - 1, lfs = t0.split('\n').length - 1;
if (crlf !== lfs) throw new Error('mixed endings: ' + crlf + ' CRLF of ' + lfs);   // the file is all CRLF today (since ~10:50Z); keep it so
let t = t0.split('\r\n').join('\n');
function rep(a, b, name) { if (t.split(a).length !== 2) throw new Error('anchor ' + name + ' x' + (t.split(a).length - 1)); t = t.replace(a, () => b); }
// A: the saw's entry in the hearing table
rep(`    const SHOT_HEARING = { pistol: 35, revolver: 50, uzi: 35, m4: 45, ak: 50, shotgun: 45, aa12: 50, sniper: 70, minigun: 55, launcher: 45 };\n`,
`    // GB-265 (GP-20007): the saw is heard to 40 m while it cuts (no can fits it, so it is never suppressed). Only sawCutTick
    // calls heardShot('chainsaw') today; the trigger-held saw on bodies and trees stays as it was.
    const SHOT_HEARING = { pistol: 35, revolver: 50, uzi: 35, m4: 45, ak: 50, shotgun: 45, aa12: 50, sniper: 70, minigun: 55, launcher: 45, chainsaw: 40 };\n`, 'A');
// B: the E-held cut helper, after heardShot
rep(`      if (woke) shotsHeard++;\n      return woke;\n    }\n`,
`      if (woke) shotsHeard++;
      return woke;
    }
    // GB-265 (GP-20007): the saw at work on something that is not a body, such as a deadfall cut held on E. Call it each
    // frame the cut holds. It runs the saw as the trigger does while the chain bites: gas at the bite rate, heat up to an
    // overheat, the chain, the glow and the sound, and the 40 m hearing (heardShot('chainsaw')) on the first bite and then
    // every SAW_CUT_HEAR_S, so the caller makes no hearing call of its own. It returns true when the saw bit this frame
    // (advance the cut) and false when it can't (saw not in hand or not started, dry, overheated, or the run is over).
    const SAW_CUT_HEAR_S = 0.5;
    let sawCutHoldT = 0, sawCutHearT = 0;
    function sawCutTick(dt) {
      if (currentWeapon !== 'chainsaw' || unarmed || !gameStarted || gameOver || won) return false;
      if (sawStart.phase !== 'ready' || sawOverheat || sawFuel <= 0) return false;
      if (sawCutHoldT <= 0) sawCutHearT = 0;   // a new hold is heard at once
      sawCutHoldT = 0.2;   // tryFire's idle saw leaves the motor to this while the hold lasts
      sawCutHearT -= dt;
      if (sawCutHearT <= 0) { sawCutHearT = SAW_CUT_HEAR_S; heardShot('chainsaw'); }
      if (fireHeld) return true;   // the trigger is running the saw this frame already
      const gun = getActiveGun();
      sawCutting = true; sawBiteT = 0.3;
      sawFuel = Math.max(0, sawFuel - dt * (1 + SAW_BITE_FUEL));
      sawHeat = Math.min(1, sawHeat + dt * SAW_HEAT_BITE);
      if (sawHeat >= 1) {
        sawOverheat = true; sawCutHoldT = 0;
        AudioSys.chainsawStop();
        AudioSys.chainsawDryPull();
        if (gun.userData.heatMat) gun.userData.heatMat.emissiveIntensity = 1.2;
        showBanner('SAW OVERHEATED', 'Let it cool a moment', 1.2, '#ffb347');
        sawHudRunning = false;
        updateAmmoHud();
        return false;
      }
      AudioSys.chainsawStart();
      AudioSys.chainsawSetRev(1);
      if (gun.userData.heatMat) gun.userData.heatMat.emissiveIntensity = 0.22 + sawHeat * 0.9 + Math.sin(performance.now() * 0.02) * 0.06;
      advanceChainsawChain(gun, dt * 28);
      if (!sawHudRunning) { sawHudRunning = true; updateAmmoHud(); }
      return true;
    }
`, 'B');
// C: tryFire's idle saw leaves the motor to a held cut
rep(`        if (sawStart.phase !== 'ready') fireHeld = false;   // GP-188: hands back before the chain can bite.\n`,
`        if (sawStart.phase !== 'ready') fireHeld = false;   // GP-188: hands back before the chain can bite.
        if (!fireHeld && sawCutHoldT > 0) { sawCutHoldT = Math.max(0, sawCutHoldT - dt); return; }   // GB-265: a held cut (sawCutTick) runs it
`, 'C');
// D: test hooks
rep(`heardShotDbg: () => ({ shotsHeard, lastShotNoise }), `,
`heardShotDbg: () => ({ shotsHeard, lastShotNoise }), sawCutTick, sawCutDbg: () => ({ holdT: sawCutHoldT, hearT: sawCutHearT, fuel: sawFuel, heat: sawHeat, overheat: sawOverheat, biteT: sawBiteT }), `, 'D');
t = t.split('\n').join('\r\n');
if (t.split('\r\n').length - 1 !== t.split('\n').length - 1) throw new Error('endings');
if (fs.readFileSync(f, 'utf8') !== t0) throw new Error('changed underneath');
fs.writeFileSync(f, t); console.log('edited: ' + (t.split('\n').length - t0.split('\n').length) + ' lines added');