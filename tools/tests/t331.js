// t331 — GP-20029: the pause menu's three volume sliders are live, independent,
// and saved with the profile. A fresh module import simulates the audio settings
// read performed by a page reload without opening a second game instance.
(async () => {
  const out = [], ok = (yes, what) => out.push((yes ? 'PASS ' : 'FAIL ') + what);
  const keys = ['tt_vol_sfx', 'tt_vol_music', 'tt_vol_ambience'];
  const saved = keys.map((k) => localStorage.getItem(k));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const near = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.02;
  let A;
  try {
    for (const k of keys) localStorage.removeItem(k);
    const fresh = (await import('/core/audio.js?gp20029-default=' + Date.now())).AudioSys;
    ok(fresh.getVolumes().master === 1 && fresh.getVolumes().music === 1 && fresh.getVolumes().ambience === 1, 'fresh profile defaults to 100% on all three controls');

    A = (await import('/core/audio.js')).AudioSys;
    A.setMuted(true);
    A.unlock();
    const sliders = [['volMaster', 'volMasterNum', 'master', 'masterVolume', 40], ['volMusic', 'volMusicNum', 'music', 'musicVolume', 25], ['volAmbience', 'volAmbienceNum', 'ambience', 'ambienceVolume', 60]];
    ok(sliders.every(([id, num]) => document.getElementById(id) && document.getElementById(num)), 'Master, Music and Ambience controls are in the settings menu');
    for (const [id, num, key, bus, value] of sliders) {
      const el = document.getElementById(id);
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(180);
      ok(near(A.getVolumes()[key], value / 100) && near(A.mixState()[bus], value / 100), key + ' control sets its live bus gain to ' + value + '%');
      ok(document.getElementById(num).textContent === value + '%', key + ' shows its percentage');
    }
    ok(near(A.mixState().weap, 1.35) && near(A.mixState().fx, 0.8), 'weapon and zombie effect gains stay on their original mix buses');
    ok(localStorage.getItem('tt_vol_sfx') === '0.4' && localStorage.getItem('tt_vol_music') === '0.25' && localStorage.getItem('tt_vol_ambience') === '0.6', 'the profile saved all three values');

    const reloaded = (await import('/core/audio.js?gp20029-reload=' + Date.now())).AudioSys.getVolumes();
    ok(near(reloaded.master, 0.4) && near(reloaded.music, 0.25) && near(reloaded.ambience, 0.6), 'a reloaded audio module restores the saved values');
  } catch (e) { ok(false, 't331 threw: ' + String((e && e.stack) || e).slice(0, 400)); }
  finally {
    if (A) { A.setMasterVolume(saved[0] === null ? 1 : +saved[0]); A.setMusicVolume(saved[1] === null ? 1 : +saved[1]); A.setAmbienceVolume(saved[2] === null ? 1 : +saved[2]); }
    keys.forEach((k, i) => { if (saved[i] === null) localStorage.removeItem(k); else localStorage.setItem(k, saved[i]); });
  }
  return out.join('\n');
})()
