// t219 - CU-94 (Jerry): a switch in the Training Ground that turns the lights off. It is on the range side of the
// doorway to the build room, beside the frame at hand height. E there puts the room in the night's light (the strips
// out, the night's sun and sky, the goggles live) and E again brings noon back. Every visit starts lit, and leaving in
// the dark does not take the night out to the title.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const D = T.trainingDbg;
  try {
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl && !nameEl.value) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    await until(() => D.state().active, 5000);
    const tg = D.tg(), TR = D.TRAINING, O = tg.origin;
    const sw = tg.stations.lightSwitch;
    ok(!!sw && typeof D.lights === 'function', 'the Training Ground has a light switch');
    // --- where it is
    const door = TR.DOOR;
    ok(Math.abs(sw.x - (O.x + TR.RANGE.minX)) < 0.1 && sw.front.x > sw.x, 'on the range side of the build room wall, facing in (x ' + (sw.x - O.x).toFixed(2) + ')');
    const fromFrame = (sw.z - O.z) - door.maxZ;
    ok(fromFrame > 0.2 && fromFrame < 1.0, 'right beside the doorway, downrange of its frame (' + fromFrame.toFixed(2) + ' m)');
    const lever = tg.group.getObjectByName('training-light-switch-lever');
    const lp = lever ? lever.getWorldPosition(new T.THREE.Vector3()) : null;
    ok(lp && lp.y - tg.floorY > 1.1 && lp.y - tg.floorY < 1.6, 'at hand height (' + (lp ? (lp.y - tg.floorY).toFixed(2) : '?') + ' m)');
    const p = T.localPlayer ? T.localPlayer.position : T.player.position;
    p.set(sw.front.x, tg.floorY, sw.front.z); await wait(200);
    ok(Math.abs(p.x - sw.front.x) < 0.05 && Math.abs(p.z - sw.front.z) < 0.05, 'he can stand at it (the rooms do not push him off)');
    ok(D.action() === 'trainingLights', 'at it, E is the lights (' + D.action() + ')');
    for (const k of ['cif', 'kiosk', 'armory', 'hqPanel', 'skullWindow']) {
      const f = tg.stations[k].front;
      if (Math.hypot(f.x - sw.front.x, f.z - sw.front.z) < 3.4) ok(false, 'too near the ' + k + ': their E reaches overlap');
    }
    const s = tg.spawn, toSpawn = Math.hypot(sw.front.x - s.x, sw.front.z - s.z);
    ok(toSpawn < 10, 'a few steps from where he starts (' + toSpawn.toFixed(1) + ' m)');
    const promptEl = document.getElementById('kioskPrompt');
    await until(() => /lights off/i.test(promptEl.textContent), 1500);
    ok(/lights off/i.test(promptEl.textContent), 'the prompt says so (' + promptEl.textContent + ')');
    // --- lit to start with
    let L = D.lights();
    ok(L.on && !L.night && L.room === true && Math.abs(T.getWorldTime() - 0.5) < 1e-6, 'it starts lit: noon (' + JSON.stringify(L) + ', ' + T.getWorldTime() + ')');
    const sunLit = T.sun.intensity, hemiLit = T.hemi.intensity;
    // --- E: lights off
    const seen = []; const onEv = (e) => { if (e.detail && e.detail.type === 'training-lights') seen.push(e.detail.on); };
    addEventListener('dw-game', onEv);
    T.doAction();
    L = D.lights();
    ok(!L.on && L.night && L.room === false && T.getWorldTime() === 0, 'E puts the lights out: the night (' + JSON.stringify(L) + ', ' + T.getWorldTime() + ')');
    ok(T.sun.intensity < sunLit * 0.2 && T.hemi.intensity < hemiLit * 0.6, 'the light really drops (sun ' + sunLit.toFixed(2) + ' -> ' + T.sun.intensity.toFixed(2) + ', sky ' + hemiLit.toFixed(2) + ' -> ' + T.hemi.intensity.toFixed(2) + ')');
    ok(lever.rotation.x > 0.3, 'the lever drops (' + lever.rotation.x.toFixed(2) + ')');
    let strips = null; tg.group.traverse((m) => { if (!strips && m.isMesh && m.material && m.material.emissive && m.material.emissive.getHex() === 0xf4fbff) strips = m.material; });
    ok(strips && strips.emissiveIntensity === 0 && strips.color.getHex() !== 0xffffff, 'the lamp strips go out (glow ' + (strips && strips.emissiveIntensity) + ', tube ' + (strips && strips.color.getHexString()) + ')');
    ok(seen[0] === false, 'the UI hears it (training-lights, on: false)');
    await wait(600);
    L = D.lights();
    ok(!L.on && L.night && T.getWorldTime() === 0, 'and it stays dark frame after frame');
    await until(() => /lights on/i.test(promptEl.textContent), 1500);
    ok(/lights on/i.test(promptEl.textContent), 'the prompt turns round (' + promptEl.textContent + ')');
    T.setGearDbg('nvg'); T.toggleNvgDbg(); await wait(100);
    ok(T.renderer.domElement.classList.contains('nvg-phosphor'), 'in the dark the goggles work as they do at night');
    // --- E again (goggles still down): lights on
    T.doAction();
    L = D.lights();
    ok(L.on && !L.night && L.room === true && Math.abs(T.getWorldTime() - 0.5) < 1e-6 && lever.rotation.x < -0.3, 'E again: noon, and the lever is up (' + JSON.stringify(L) + ')');
    ok(Math.abs(T.sun.intensity - sunLit) < 1e-6 && strips.emissiveIntensity > 0.5 && strips.color.getHex() === 0xffffff, 'the light is what it was, the strips lit again');
    ok(!T.renderer.domElement.classList.contains('nvg-phosphor'), 'the goggles stop glaring green once the lights are on');
    T.toggleNvgDbg(); await wait(100);
    // --- leaving in the dark
    T.doAction();
    ok(!D.lights().on, 'off again');
    removeEventListener('dw-game', onEv);
    D.leave();
    L = D.lights();
    ok(L.on && !L.night && T.getWorldTime() !== 0, 'leaving in the dark: the next visit starts lit and the night stays in the room (' + JSON.stringify(L) + ', ' + T.getWorldTime() + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})()
