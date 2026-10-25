// t289 - CL-260 (Jerry's N17): "In first person you can't see the information you usually do in third person. For instance,
// if you grab something out of an airdrop you have no idea what you just collected." In first person his head is the
// camera, so a prompt that floated over it was above the view. Now:
//  - in first person a prompt that floats over his head (or would be off the screen) sits under the crosshair;
//  - what the HUD's corner says about a supply drop (inbound, landed, what he got) is said again under the crosshair;
//  - in third person nothing is said under the crosshair (the prompt's third-person placing is unchanged).
// CL-260 part 2: first person's way in gets 20 s (the gun now in view at the hip is more for the 2-core box's
// software renderer to draw; it came in at w 0.93 at 12 s).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const centreOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, top: r.top, bottom: r.bottom, w: r.width, h: r.height }; };
  try {
    await startMatch(T, 'First-person info');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const D = T.relayDbg, F = () => T.fpDbg(), P = T.player.position;
    const prompt = document.getElementById('kioskPrompt');
    await until(() => !!D.note(), 6000);

    // Third person: the note's prompt floats over his head, as before.
    T.runDevCommand('relay note'); await wait(400);
    ok(prompt.classList.contains('on') && /read/i.test(prompt.textContent), 'third person, by the note: "' + prompt.textContent + '"');
    // (Where it floats in third person is unchanged code; the test page's follow camera is too slow after the jump to
    // measure it here.)

    // First person: under the crosshair.
    T.setViewFirstDbg(true);
    ok(await until(() => F().w > 0.95, 20000), 'first person');
    T.runDevCommand('relay note'); await wait(400);
    for (const pitch of [0, -0.5, 0.45]) {   // looking ahead, down at the paper, up at the trees
      { const p0 = T.otsDbg().pitch; T.otsLook(0, 10); const k = Math.abs(p0 - T.otsDbg().pitch) > 1e-5 ? (p0 - T.otsDbg().pitch) / 10 : 0.002;
        T.otsLook(0, (T.otsDbg().pitch - pitch) / k); await wait(300); }
      const c = centreOf(prompt), cx = innerWidth / 2, cy = innerHeight / 2;
      ok(prompt.classList.contains('on') && !prompt.classList.contains('offscreen') && Math.abs(c.x - cx) < 40 && c.top > cy + 30 && c.bottom < cy + 170,
        'pitch ' + T.otsDbg().pitch.toFixed(2) + ': the prompt is under the crosshair (' + c.x.toFixed(0) + ', ' + c.top.toFixed(0) + '-' + c.bottom.toFixed(0) + '; centre ' + cx + ', ' + cy + ')');
    }

    // A supply drop: what he got is said under the crosshair too.
    T.spawnSupplyDrop();
    let s = null;
    ok(await until(() => { s = T.supplyDrops[T.supplyDrops.length - 1]; return !!s && s.state === 'landed'; }, 90000), 'a supply drop lands');
    if (s && s.state === 'landed') {
      const note = () => document.getElementById('fpNote');
      P.set(s.x + 0.5, T.sampleHeight(s.x, s.z), s.z);
      ok(await until(() => s.state === 'open', 8000), 'walked up: the crate opens');
      const sn = document.getElementById('supplyNotice');
      ok(await until(() => sn && !sn.hidden && /supply/i.test(sn.textContent), 3000), 'the HUD corner says it: "' + (sn ? sn.textContent : '') + '"');
      ok(await until(() => note() && note().style.opacity === '1' && note().textContent === sn.textContent, 3000), 'and so does the line under the crosshair: "' + (note() ? note().textContent : '') + '"');
      if (note()) {
        const c = centreOf(note()), cx = innerWidth / 2, cy = innerHeight / 2;
        ok(Math.abs(c.x - cx) < 40 && c.top > cy + 60 && c.top < cy + 220 && c.w > 60, 'centred under the crosshair (' + c.x.toFixed(0) + ', top ' + c.top.toFixed(0) + ', ' + c.w.toFixed(0) + ' px wide)');
      }
      ok(await until(() => note() && note().style.opacity === '0', 8000), 'it goes after a few seconds');
      // Third person: no line under the crosshair.
      T.setViewFirstDbg(false); await until(() => F().w < 0.05, 12000);
      T.spawnSupplyDrop();
      let s2 = null;
      if (await until(() => { s2 = T.supplyDrops[T.supplyDrops.length - 1]; return !!s2 && s2 !== s && s2.state === 'landed'; }, 90000)) {
        P.set(s2.x + 0.5, T.sampleHeight(s2.x, s2.z), s2.z);
        await until(() => s2.state === 'open', 8000); await wait(400);
        ok(!note() || note().style.opacity === '0', 'third person: only the HUD corner says it');
      }
    }
    T.setViewFirstDbg(false);
    T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
