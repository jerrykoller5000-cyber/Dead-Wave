// t288 — CU-159: brightness, vibrancy, and the first-person field of view.
// Brightness is the renderer's exposure (1 = today). Vibrancy is saturation at the
// end of the frame (1 = today, and the composite is not graded). The field of view
// is only the first-person camera. All three are saved, and applyPictureSettings is
// the read a reload runs.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) { if (fn()) return true; await wait(40); }
    return !!fn();
  };
  const setRange = (id, value) => {
    const el = document.getElementById(id);
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const near = (a, b) => Math.abs(+a - b) < 0.001;
  try {
    const view = document.getElementById('pauseSettingsView');
    const label = (key) => { const el = view.querySelector('[data-dw-text="' + key + '"]'); return el && el.textContent; };
    ok(!!view.querySelector('#brightSet') && !!view.querySelector('#vibrancySet') && !!view.querySelector('#fpFovSet'), 'the three sliders are in the settings menu');
    ok(label('settings.brightness') === 'Brightness' && label('settings.vibrancy') === 'Vibrancy' && label('settings.fpFov') === 'First-person FOV', 'the labels are the CU-159 words');
    document.getElementById('menuSettingsBtn').click();
    ok(view.classList.contains('on'), 'settings opens from the title');
    const start = T.pictureDbg();
    ok(start.brightness === 1 && start.vibrancy === 1 && start.fpFov === 60 && start.exposure === 1 && start.graded === false, 'today is exposure 1, vibrancy 1, first-person 60, and the frame is not graded');
    setRange('brightSet', 1.35);
    setRange('vibrancySet', 1.6);
    ok(await until(() => { const p = T.pictureDbg(); return near(p.exposure, 1.35) && near(p.vibrancy, 1.6) && p.graded; }, 3000), 'brightness and vibrancy change the exposure and grade the frame (' + JSON.stringify(T.pictureDbg()) + ')');
    ok(near(localStorage.getItem('tt_brightness'), 1.35) && near(localStorage.getItem('tt_vibrancy'), 1.6), 'both are saved');
    await startMatch(T, 'Picture');
    ok(await until(() => Math.abs(T.camera.fov - 60) < 1.5, 2500), 'in the run, third person is 60 (' + T.camera.fov.toFixed(1) + ')');
    ok(T.setFirstPersonFov() === 60, 'TT.setFirstPersonFov() with no argument reads the degrees');
    T.setFirstPersonFov(100);
    ok(T.setFirstPersonFov() === 100 && localStorage.getItem('tt_fp_fov') === '100', 'TT.setFirstPersonFov(100) saves it');
    await wait(700);
    ok(Math.abs(T.camera.fov - 60) < 1.5, 'third person stays at 60 while the slider is 100 (' + T.camera.fov.toFixed(1) + ')');
    T.setViewFirstDbg(true);
    ok(await until(() => Math.abs(T.camera.fov - 100) < 1.5, 8000), 'first person uses the slider (' + T.camera.fov.toFixed(1) + ')');
    T.setViewFirstDbg(false);
    ok(await until(() => Math.abs(T.camera.fov - 60) < 1.5, 8000), 'leaving first person returns to 60 (' + T.camera.fov.toFixed(1) + ')');
    localStorage.setItem('tt_brightness', '0.7');
    localStorage.setItem('tt_vibrancy', '0.5');
    localStorage.setItem('tt_fp_fov', '75');
    const again = T.applyPictureSettings();
    ok(near(again.brightness, 0.7) && near(again.vibrancy, 0.5) && again.fpFov === 75, 'a reload reads the saved three (' + again.brightness + ', ' + again.vibrancy + ', ' + again.fpFov + ')');
    ok(await until(() => near(T.renderer.toneMappingExposure, 0.7) && T.pictureDbg().graded, 3000), 'the reloaded brightness is the renderer exposure and the grade stays on');
    ok(near(document.getElementById('brightSet').value, 0.7) && +document.getElementById('fpFovSet').value === 75, 'the sliders show the reloaded values');
    T.setViewFirstDbg(true);
    ok(await until(() => Math.abs(T.camera.fov - 75) < 1.5, 8000), 'the reloaded first-person field of view is in the camera (' + T.camera.fov.toFixed(1) + ')');
    localStorage.setItem('tt_brightness', '1');
    localStorage.setItem('tt_vibrancy', '1');
    localStorage.setItem('tt_fp_fov', '60');
    T.applyPictureSettings();
    T.setViewFirstDbg(false);
    ok(await until(() => { const p = T.pictureDbg(); return !p.graded && near(p.exposure, 1) && Math.abs(T.camera.fov - 60) < 1.5; }, 8000), 'back at 1 the grade is gone and the view is 60 (' + T.camera.fov.toFixed(1) + ', graded ' + T.pictureDbg().graded + ')');
    ok(T.setFirstPersonFov(200) === 110 && T.setFirstPersonFov(10) === 50, 'the field of view clamps to 50-110');
  } catch (e) {
    ok(false, 'threw ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})();
