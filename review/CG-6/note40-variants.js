// shared: variants for note 40
const VAR = {
  C0: `try { localStorage.removeItem('tt_brightness'); localStorage.removeItem('tt_vibrancy'); } catch (e) {} T.applyPictureSettings();
       const h = window.__hemi; if (h && window.__hemiOrig) { h.color.copy(__hemiOrig.c); h.groundColor.copy(__hemiOrig.g); } T.scene.onBeforeRender = window.__obr0 || (() => {});`,
  C1: `try { localStorage.removeItem('tt_brightness'); localStorage.removeItem('tt_vibrancy'); } catch (e) {} T.applyPictureSettings();
       const h = window.__hemi; if (h) { h.color.setHex(0xf3f1ea); h.groundColor.setHex(0x8c877c); } const base = window.__obr0 || (() => {});
       T.scene.onBeforeRender = function (...a) { base.apply(this, a); if (T.trainingDbg.state().active && !T.trainingDbg.state().lightsOff && h) h.intensity = Math.max(h.intensity, 1.15); };`,
  C2: `try { localStorage.setItem('tt_brightness', '1.05'); localStorage.setItem('tt_vibrancy', '1.15'); } catch (e) {} T.applyPictureSettings();
       const h = window.__hemi; if (h) { h.color.setHex(0xf3f1ea); h.groundColor.setHex(0x8c877c); } const base = window.__obr0 || (() => {});
       T.scene.onBeforeRender = function (...a) { base.apply(this, a); if (T.trainingDbg.state().active && !T.trainingDbg.state().lightsOff && h) h.intensity = Math.max(h.intensity, 1.15); };`
};
const initVar = `let h = null; T.scene.traverse((o) => { if (o.isHemisphereLight && !h) h = o; }); window.__hemi = h; window.__hemiOrig = { c: h.color.clone(), g: h.groundColor.clone() }; window.__obr0 = T.scene.onBeforeRender; document.querySelectorAll('body > *:not(canvas)').forEach(e => { if (e.tagName !== 'SCRIPT') e.style.visibility = 'hidden'; }); return 1;`;
