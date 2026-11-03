// tcl295b - CL-295, in the Training Ground (where Jerry heard it, J53). tcl295's walk and run there.
// tcl295 - CL-295 (Jerry's J53, 2026-11-02: "There is still that weird chain sound when the player is moving around"; J36
// before it). What he hears when he walks and runs, by name: AudioSys.traceDbg records every take (and its file), clip and
// synth tone or noise while he walks 4 s and runs 4 s, in the Training Ground, third and first person. INFO lists them
// by count; the check: nothing on a walk or a run outside a step's own sounds plays more than once a second (a sound that
// keeps time with him and isn't a step is the suspect), and no metal, glass or chain file plays on its floor.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const A = T.AudioSys;
    if (!A || !A.traceDbg) { ok(false, 'AudioSys.traceDbg is there'); return out.join('\n'); }
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
    if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'Trainee';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg && T.trainingDbg.state().active, 20000), 'the Training Ground is up');
    await wait(1500);
    if (A.setMuted) A.setMuted(false);
    if (A.unlock) A.unlock();
    const P = T.player.position;
    if (A.takesInit) { await A.takesInit(); const L = A.takesState().listed || {}; info('his takes on this page: ' + JSON.stringify(L) + (L.source === 'none' ? ' (the test page lists none, so every step is the synth: run it on the real page, node tools/realtest.mjs ' + ('tcl295b') + ')' : '')); }
    { const D = T.trainingDbg, g = D.tg && D.tg(), bd = g && g.build;   // the build room's open floor (the spawn faces a railing)
      if (bd) { const x = ((bd.minGX + bd.maxGX) / 2) * bd.grid + bd.offset, z = ((bd.minGZ + bd.maxGZ) / 2) * bd.grid + bd.offset; P.set(x, g.floorY, z); await wait(600); info('in the build room at ' + x.toFixed(1) + ', ' + z.toFixed(1)); } }
    const runFor = async (ms, shift) => {
      A.traceDbg(true); const x0 = P.x, z0 = P.z;
      key('keydown', 'KeyW'); if (shift) key('keydown', 'ShiftLeft');
      await wait(ms);
      key('keyup', 'KeyW'); if (shift) key('keyup', 'ShiftLeft');
      const list = A.traceDbg(false);
      return { list, moved: Math.hypot(P.x - x0, P.z - z0), s: ms / 1000 };
    };
    const STEP = /^(player\/footstep|footstep|footstepWood)/;
    const summary = (label, r) => {
      const by = new Map();
      for (const e of r.list) { const k = e.kind + ' ' + e.name + (e.file ? ' <' + e.file.split('/').pop() + '>' : ''); by.set(k, (by.get(k) || 0) + 1); }
      info(label + ': ' + r.moved.toFixed(1) + ' m in ' + r.s + ' s, ' + r.list.length + ' sounds');
      for (const [k, n] of [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)) info('  ' + n + ' x ' + k);
      const notStep = new Map();
      for (const e of r.list) if (!STEP.test(e.name)) notStep.set(e.name, (notStep.get(e.name) || 0) + 1);
      const keeping = [...notStep.entries()].filter(([, n]) => n / r.s > 1).map(([k, n]) => k + ' ' + n);
      ok(keeping.length === 0, label + ': nothing but his steps keeps time with him (' + (keeping.join(', ') || 'none') + ')');
      const metal = r.list.filter((e) => e.file && /metal|glass|chain|clink|jingle/i.test(e.file)).map((e) => e.file.split('/').pop());
      ok(metal.length === 0, label + ': no metal, glass or chain file on the floor (' + ([...new Set(metal)].join(', ') || 'none') + ')');
    };
    summary('walk, third person', await runFor(4000, false)); await wait(600);
    summary('run, third person', await runFor(4000, true)); await wait(600);
    if (T.setViewFirstDbg) { T.setViewFirstDbg(true); await wait(1500);
      summary('walk, first person', await runFor(4000, false)); await wait(600);
      summary('run, first person', await runFor(4000, true)); T.setViewFirstDbg(false); }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
