import fs from 'node:fs';
import crypto from 'node:crypto';
const file = 'studio/inspector/marine.js';
const before = fs.readFileSync(file, 'utf8'); const hash = s => crypto.createHash('sha256').update(s).digest('hex'); let s = before;
const replace = (a, b) => { if (s.split(a).length !== 2) throw new Error('Expected one: ' + a.slice(0, 80)); s = s.replace(a, b); };
const start = s.indexOf('  function clearProps() {'); const end = s.indexOf('  function prop(', start);
if (start < 0 || end < 0) throw new Error('Missing cleanup');
s = s.slice(0, start) + `  function clearProps() {
    if (host.state().mortar) {
      if (typeof T.dismountMortar !== 'function') throw new Error('the game has no dismountMortar');
      T.dismountMortar();
    }
    if (host.state().carried) {
      const hook = typeof T.setDownMortar === 'function' ? T.setDownMortar : T.m240VisDbg && T.m240VisDbg().setDown;
      if (typeof hook !== 'function') throw new Error('the game has no crew-served set-down hook');
      const existing = new Set(T.builds || []), p = T.player.position;
      hook(p.x, p.z + 1.2, true);
      // Shouldering removes the old piece; setting it down builds a new one. This one is ours too.
      for (const b of T.builds || []) if (!existing.has(b)) { b._dwi = true; st.props.push(b); }
      if (host.state().mortar && T.dismountMortar) T.dismountMortar();
    }
    const owned = new Set([...st.props, ...(T.builds || []).filter((b) => b && b._dwi)]);
    for (const b of owned) if ((T.builds || []).includes(b)) T.removeBuild(b, true);
    st.props.length = 0;
    if (T.updateGhostPreview) T.updateGhostPreview();
    if (host.state().carried || host.state().mortar) throw new Error('crew-served cleanup did not release the marine');
  }
` + s.slice(end);
replace("    T.mountMortar(b);\n    return b;", "    T.mountMortar(b);\n    if (host.state().mortar !== kind || host.state().carried) throw new Error('the game did not mount the ' + kind);\n    return b;");
replace("  async function carry(kind) { await mount(kind); await wait(0.6); T.shoulderMortar(); }", "  async function carry(kind) {\n    await mount(kind); await wait(0.6); T.shoulderMortar();\n    const carried = T.getMortarCarried ? T.getMortarCarried() : null;\n    if (!host.state().carried || host.state().mortar || carried && carried.kind !== kind) throw new Error('the game did not shoulder the ' + kind);\n  }");
replace("    st.ko = { backdrop: ix.stage.backdrop() };", `    const ud = T.marine && T.marine.userData || {};
    const nodes = [T.player, host.rollPivot, T.marine, ud.weaponMount, ud.offhandMount].filter((node) => node && node.position && node.quaternion && node.scale);
    st.ko = { backdrop: ix.stage.backdrop(), rig: nodes.map((node) => ({ node, position: node.position.clone(), quaternion: node.quaternion.clone(), scale: node.scale.clone(), visible: node.visible })) };`);
replace("    if (st.ko) { ix.stage.backdrop(st.ko.backdrop === 'off' ? 'studio' : st.ko.backdrop); st.ko = null; }\n    if (tr.wake) tr.wake = null;\n    home();", `    const prior = st.ko;
    if (prior) {
      ix.stage.backdrop(prior.backdrop === 'off' ? 'studio' : prior.backdrop);
      for (const saved of prior.rig || []) { saved.node.position.copy(saved.position); saved.node.quaternion.copy(saved.quaternion); saved.node.scale.copy(saved.scale); saved.node.visible = saved.visible; }
      st.ko = null;
    }
    if (tr.wake) { tr.wake = null; if (host.audio && host.audio.knockoutEnd) host.audio.knockoutEnd(0.3); }
    if (tr.blackout) tr.blackout.classList.remove('on');
    home();`);
replace("if (m && m.stop) { try { m.stop(desk); } catch (e) { console.warn('[inspector] stopping', m.id, e); } }", "if (m && m.stop) { try { m.stop(desk); } catch (e) { reportMoveError(m, e); } }");
if (hash(fs.readFileSync(file, 'utf8')) !== hash(before)) throw new Error('Fresh source changed');
fs.writeFileSync(file, s, 'utf8'); console.log(file + ' updated ' + hash(s));
