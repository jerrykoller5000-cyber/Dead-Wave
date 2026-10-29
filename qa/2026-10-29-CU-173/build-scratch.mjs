// CU-173: scratch-only PROF marks inside updateZombies, the same edit in both trees. Nothing here touches the repo.
//   node build-scratch.mjs check   print every anchor's line, indent and the line before it, in both trees
//   node build-scratch.mjs apply   insert the marks
// A mark names the interval BEFORE it (PROF.mark charges the time since the last mark). Inside the per-zombie loop each
// mark runs once per zombie, so a stage's time is summed over the zombies of the frame.
import fs from 'node:fs';
const base = 'C:/Users/Zero/Desktop/dw-cu173';
const trees = ['old', 'new'];

// [name of the stage that ENDS at the anchor, regex of the anchor line (trimmed), nth match in the function (default 0), levelUp:
//  'for' = move the insertion up to the nearest 6-space `for (const z of zombies) {` above the anchor]
const A = [
  ['zu:pre-flowfield', /^hordeFrame\(dt\);/],
  ['zu:horde+smother', /^zombiesRemaining = Math\.max\(0, waveTotal - waveSpawned\) \+ zombies\.length;/],
  ['zu:pre-rest', /^for \(const z of zombies\) \{$/],
  // in the loop
  ['zu:restore+tick', /^\/\/ GB-43: a POI guard holds its post until woken\./],
  ['zu:guard+target', /^\/\/ Per-type targeting$/],
  ['zu:type-targeting', /^if \(z\.poiGuard && !z\.poiAwake && z\.poiGuard\.wanderer\) \{ const wt = wandererTarget/],
  ['zu:lure+route+hz', /^\/\/ Feral flank: offset sideways then sprint when close/],
  ['zu:flank+weave+pace', /^\/\/ Steer around ground they cannot climb\./],
  ['zu:terrain+flow+neighbours', /^\/\/ Climbing costs pace, wading\/swimming costs speed\./],
  ['zu:swim', /^\/\/ Leaper: closes to mid range on all fours/],
  ['zu:leap+charge', /^\/\/ Spitter: artillery\. Holds a firing line/],
  ['zu:spit', /^\/\/ Spitter: walks in like anything else/],
  ['zu:creep+bomb+scream', /^\/\/ Colossus: wind up and flatten everything in a circle\./],
  ['zu:boss', /^\/\/ D-13: guardian stuck failsafe/],
  ['zu:guardian', /^\/\/ Knockback is already handled downstream by the stagger impulse\./],
  ['zu:knocked+stuck+turns', /^if \(z\.typeKey === 'brute'\) \{$/],
  ['zu:brute+military+drowned', /^if \(z\.abilityBusy\) spd = 0;/],
  ['zu:river+stagger', /^\/\/ GB-50: the contact ring\./],
  ['zu:contact-ring', /^\/\/ Soft barricades/],
  ['zu:barricades+house', /^\/\/ Stumps pump: a pulse every fifth of a second/],
  ['zu:bleed+drips+douse+burn', /^if \(rr > landRadius - 1\.2 && !training\.active\) \{/],
  ['zu:edge', /^if \(z\.staggerVX \|\| z\.staggerVZ\) \{/],
  ['zu:stagger-swim-leap-rise', /^\/\/ Walk cycle — skip missing limbs\./],
  ['zu:walkcycle-setup', /^\/\/ Face the way they are actually travelling/],
  ['zu:facing+cadence', /^\/\/ Heavy things you hear coming: a footfall every half stride\./],
  ['zu:footfall', /^if \(!z\.farLod && ud\.crawlLimbs\) \{/],
  ['zu:crawlLimbs+legs+arms+reach+hips+feral', /^\/\/ CL-129: the twitch and the lurch\./],
  ['zu:twitch+lurch', /^\/\/ Groans: each body on its own timer/],
  ['zu:groans+shadowLOD+voices', /^\/\/ GB-51: standing with nothing in reach/],
  ['zu:idle-state', /^\/\/ CL-137: its eyes are on him\./],
  ['zu:head-look', /^\/\/ Standing still they still breathe and sway/],
  ['zu:breathe+hips', /^\/\/ CL-129 \(Jerry's playthrough 1, D-77/],
  ['zu:crawl-hop-pose', /^\/\/ Slam tell: both arms high overhead/],
  ['zu:slam-tell', /^\/\/ Attack: cock both arms overhead/],
  ['zu:attack-windup', /^if \(z\.hitReact > 0\) \{$/],
  ['zu:hit-react', /^\/\/ CL-137: the hit lands somewhere\./],
  ['zu:hit-part', /^if \(false\) \{\} else if \(ud\.torso && rest/],
  ['zu:torso-lean', /^\/\/ Clawing up out of the ground: arms reach for the sky/],
  ['zu:rising-pose', /^\/\/ CL-136: the spitter's wind-up/],
  ['zu:spitter-windup', /^if \(poseWork && kind === 'spider'\) applySpiderMotion/],
  ['zu:type-poses+feet+lean', /^if \(z\.flashT > 0\) \{$/],
  ['zu:flash-glow', /^if \(\(!zombieGraceActive\(\) \|\| \(z\.poiGuard && z\.poiAwake\)\) && !spiderWander && !shamblerRecovering/],
  // after the loop
  ['zu:attack+melee', /^for \(const z of zombies\) if \(z\.alive && z\.windowClimb\) updateZombieWindowClimb/, 0, 'after-loop'],
  ['zu:window+dot+bomb', /^\/\/ GB-142: where each stood before the separation pass/],
  ['zu:presep', /^\/\/ Keep the horde from collapsing into one overlapping stack\./],
  ['zu:separation', /^\/\/ Claude 2026-09-28: backstop\./, 0, 'for'],
  ['zu:reseat', /^updateWaveHud\(\);$/],
];

const rd = (f) => fs.readFileSync(f, 'utf8');
const mode = process.argv[2] || 'check';

function locate(lines) {
  const s = lines.findIndex((l) => /^    function updateZombies\(dt\) \{/.test(l));
  if (s < 0) throw new Error('updateZombies not found');
  let e = s + 1;
  while (e < lines.length && !/^    \}\s*$/.test(lines[e])) e++;
  const out = [];
  let from = s;
  for (const [name, re, nth = 0, mode2] of A) {
    // anchors are in order: search forward from the previous one
    let i = -1;
    for (let k = from; k < e; k++) if (re.test(lines[k].trim())) { i = k; break; }
    if (i < 0) { out.push({ name, line: -1 }); continue; }
    let at = i;
    if (mode2 === 'for') { while (at > from && !/^      for \(const z of zombies\) \{/.test(lines[at])) at--; }
    out.push({ name, line: at, anchor: i, indent: lines[at].match(/^ */)[0].length, prev: lines[at - 1].trim().slice(-70) });
    from = i;
  }
  return { s, e, out };
}

for (const t of trees) {
  const file = `${base}/${t}/index.html`;
  const text = rd(file);
  const lines = text.split('\n');
  const { s, e, out } = locate(lines);
  console.log(`--- ${t}: updateZombies ${s + 1}..${e + 1}, ${out.filter((x) => x.line >= 0).length}/${A.length} anchors`);
  if (mode === 'check') {
    for (const x of out) console.log(`${x.name.padEnd(30)} ${String(x.line + 1).padStart(6)} indent ${x.indent}  prev: ${x.prev}`);
    continue;
  }
  const missing = out.filter((x) => x.line < 0);
  if (missing.length) throw new Error(`${t}: anchors missing: ${missing.map((m) => m.name).join(', ')}`);
  // insert from the bottom so earlier line numbers stay valid
  for (const x of [...out].sort((a, b) => b.line - a.line)) {
    const pad = ' '.repeat(x.indent);
    const eol = lines[x.line].endsWith('\r') ? '\r' : '';
    lines.splice(x.line, 0, `${pad}PROF.mark('${x.name}');${eol}`);
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`${t}: ${out.length} marks inserted`);
}

// CU-171's split of the call site, so the stage marks sum into z:update, and the abilities and feral calls stay apart
if (mode === 'apply') {
  const reA = /(updateZombies\(dt\);)(\r?\n)(\s*)(enemyAbilities\.update\(dt\);)([^\r\n]*)(\r?\n)(\s*)(feralMotion\.update\(dt\);[^\r\n]*)(\r?\n)(\s*)PROF\.mark\('zombies'\);/;
  for (const t of trees) {
    const file = `${base}/${t}/index.html`;
    const text = rd(file);
    if (!reA.test(text)) throw new Error('call-site anchor missing in ' + t);
    fs.writeFileSync(file, text.replace(reA, (m, u, e1, i1, ab, abc, e2, i2, fe, e3, i3) =>
      `${u} PROF.mark('z:update');${e1}${i1}${ab} PROF.mark('z:abilities');${abc}${e2}${i2}${fe}${e3}${i3}PROF.mark('z:feral');`), 'utf8');
  }
  // a syntax check of each tree's module script
  for (const t of trees) {
    const m = [...rd(`${base}/${t}/index.html`).matchAll(/<script type="module">([\s\S]*?)<\/script>/g)][0][1];
    fs.writeFileSync(`${base}/chk-${t}.mjs`, m, 'utf8');
  }
  console.log('call-site marks inserted; chk-old.mjs and chk-new.mjs written for node --check');
}
