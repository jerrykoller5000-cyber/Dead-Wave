import fs from 'node:fs';
const f = 'index.html'; const t0 = fs.readFileSync(f, 'utf8'); const crlf = t0.split('\r\n').length - 1, lfs = t0.split('\n').length - 1;
if (crlf !== lfs) throw new Error('mixed endings');
let t = t0.split('\r\n').join('\n');
function rep(a, b, name) { if (t.split(a).length !== 2) throw new Error('anchor ' + name + ' x' + (t.split(a).length - 1)); t = t.replace(a, () => b); }
// tryFire's overheat, now one shared helper (same steps, same order)
rep(`        if (sawHeat >= 1) {
          sawOverheat = true;
          AudioSys.chainsawStop();
          AudioSys.chainsawDryPull();
          if (gun.userData.heatMat) gun.userData.heatMat.emissiveIntensity = 1.2;
          showBanner('SAW OVERHEATED', 'Let it cool a moment', 1.2, '#ffb347');
          sawHudRunning = false;
          updateAmmoHud();
          return;
        }
`, `        if (sawHeat >= 1) { sawOverheatStop(gun); return; }   // GB-265: shared with sawCutTick
`, 'tryFire overheat');
rep(`      if (sawHeat >= 1) {
        sawOverheat = true; sawCutHoldT = 0;
        AudioSys.chainsawStop();
        AudioSys.chainsawDryPull();
        if (gun.userData.heatMat) gun.userData.heatMat.emissiveIntensity = 1.2;
        showBanner('SAW OVERHEATED', 'Let it cool a moment', 1.2, '#ffb347');
        sawHudRunning = false;
        updateAmmoHud();
        return false;
      }
`, `      if (sawHeat >= 1) { sawCutHoldT = 0; sawOverheatStop(gun); return false; }
`, 'helper overheat');
rep(`      if (!sawHudRunning) { sawHudRunning = true; updateAmmoHud(); }
      return true;
    }
`, `      if (!sawHudRunning) { sawHudRunning = true; updateAmmoHud(); }
      return true;
    }
    // GB-52 / GB-265: the saw overheats (on the trigger or in a held cut): it stops and won't start until it has cooled.
    function sawOverheatStop(gun) {
      sawOverheat = true;
      AudioSys.chainsawStop();
      AudioSys.chainsawDryPull();
      if (gun.userData.heatMat) gun.userData.heatMat.emissiveIntensity = 1.2;
      showBanner('SAW OVERHEATED', 'Let it cool a moment', 1.2, '#ffb347');
      sawHudRunning = false;
      updateAmmoHud();
    }
`, 'helper fn');
t = t.split('\n').join('\r\n');
if (fs.readFileSync(f, 'utf8') !== t0) throw new Error('changed underneath');
fs.writeFileSync(f, t); console.log('edited 2: ' + (t.split('\n').length - t0.split('\n').length) + ' lines');