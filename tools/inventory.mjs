// tools/inventory.mjs — what is in index.html's module script, and what refers to what.
//
//   node tools/inventory.mjs              summary by owner
//   node tools/inventory.mjs --json out.json   full data
//   node tools/inventory.mjs --edges world     cross-area references into/out of an area
//
// This is the map the module split needs. The split itself is mechanical — move code, add
// exports and imports, change no behaviour — but "mechanical" only holds if you know, before
// cutting, which top-level names each area owns and which names cross a boundary. Every name
// that crosses becomes an export in docs/contracts.md.
//
// It is a deliberately shallow parser: it finds top-level declarations by scanning at brace
// depth zero inside the module script, then counts identifier hits elsewhere. That is enough
// to size the areas and find the seams. It is not a JS parser and does not pretend to be.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)\n\s*<\/script>/);
if (!m) { console.error('no module script found'); process.exit(1); }
const src = m[1];
const scriptStartLine = html.slice(0, m.index).split('\n').length;
const lines = src.split('\n');

// --- find top-level declarations -------------------------------------------------
// Depth is tracked crudely but carefully enough: strings, template literals, regexes and
// comments are skipped so their braces do not shift the count.
function topLevelDecls() {
  const decls = [];
  let depth = 0, i = 0;
  let line = 1;
  const push = (kind, name, ln) => { if (name) decls.push({ kind, name, line: ln }); };
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') { line++; i++; continue; }
    // comments
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const seg = src.slice(i, e < 0 ? src.length : e); line += (seg.match(/\n/g) || []).length; i = e < 0 ? src.length : e + 2; continue; }
    // strings and templates
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch; i++;
      while (i < src.length) {
        if (src[i] === '\\') { i += 2; continue; }
        if (src[i] === '\n') line++;
        if (src[i] === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '[') { depth++; i++; continue; }
    if (ch === '}' || ch === ')' || ch === ']') { depth--; i++; continue; }
    if (depth === 0) {
      const rest = src.slice(i, i + 200);
      let mm;
      if ((mm = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/.exec(rest))) { push('function', mm[1], line); i += mm[0].length; continue; }
      if ((mm = /^class\s+([A-Za-z_$][\w$]*)/.exec(rest))) { push('class', mm[1], line); i += mm[0].length; continue; }
      if ((mm = /^(const|let|var)\s+([A-Za-z_$][\w$]*)/.exec(rest))) { push(mm[1], mm[2], line); i += mm[0].length; continue; }
      // destructured declarations: const { a, b } = ...
      if ((mm = /^(const|let|var)\s*[{[]([^}\]]*)[}\]]/.exec(rest))) {
        for (const n of mm[2].split(',')) {
          const nm = n.split(':').pop().trim().replace(/^\.\.\./, '');
          if (/^[A-Za-z_$][\w$]*$/.test(nm)) push(mm[1], nm, line);
        }
        i += mm[0].length; continue;
      }
    }
    i++;
  }
  return decls;
}

// --- owner map --------------------------------------------------------------------
// Name patterns, in order; first match wins. Built from the ownership table in AGENTS.md.
// Anything unmatched lands in "unsorted" and is exactly the list that needs a human call
// before the split — that number is the honest measure of how ready the split is.
const AREAS = [
  ['world', /^(terrain|ground|height|heightField|sample|carve|river|stream|lake|water|Water|LAKE|RIVER|WM_|cave|Cave|CAVE|rock|Rock|ROCK|stone|Stone|STONE|pebble|slick|sky|Sky|SKY|cloud|sun|moon|hemi|star|weather|Weather|wind|Wind|fog|snow|rain|dayNight|worldTime|DAY_|NIGHT_|isNight|bake|POI|landmark|Landmark|wall|Wall|WALL|LAND_|path|Path|PATH|yard|grid|foliage|Foliage|MAX_GRASS|MAX_BUSH|MAX_FERN|MAX_FLOWER|MAX_MUSHROOM|MAX_CLUTTER|tree|Tree|TREE|bark|leaf|Leaf|canopy|trunk|camo|ravine|beach|shore|silt|sand|reed|lily|cliff|hill|mound|turf|moss|erratic)/],
  ['life', /^(bird|Bird|BIRD|rabbit|Rabbit|RABBIT|frog|Frog|FROG|squirrel|Squirrel|turtle|Turtle|fish|Fish|FISH|bug|Bug|butterfly|wild|Wild|WILD|burrow|Burrow|nest|Nest|critter|REM|rem[A-Z])/],
  ['combat', /^(zombie|Zombie|ZOMBIE|horde|wave|Wave|WAVE|spawnWave|director|weapon|Weapon|WEAPON|gun|Gun|ammo|Ammo|AMMO|reload|fire|Fire|shoot|bullet|Bullet|tracer|recoil|grenade|Grenade|knife|Knife|machete|chainsaw|flame|Flame|mortar|Mortar|turret|Turret|mine|Mine|barricade|sandbag|spike|drum|decoy|build|Build|BUILD|emplacement|platform|pillar|upgrade|Upgrade|UPGRADE|blueprint|corpse|Corpse|gib|Gib|blood|Blood|damage|Damage|kill|Kill|hit|Hit|dismember|scriptedKill|guardian|Guardian|tentacle|Tentacle|aimTentacle|swayTentacle|skeletal|boneRaft|poseRemains|makeCaveGuardian|DEATH_WAYS|drowned|demon|brute|colossus|feral|leaper|spider|spitter|bomber|shambler)/],
  ['ui', /^(hud|HUD|hudEl|menu|Menu|MENU|shop|Shop|SHOP|kiosk|Kiosk|KIOSK|banner|Banner|toast|reticle|Reticle|minimap|Minimap|map|Map|fullMap|wheel|Wheel|WHEEL|settings|Settings|slider|button|Btn|btn|El$|Element|panel|Panel|overlay|Overlay|prompt|Prompt|tip|Tips|strings|text|Text|label|Label|scope|Scope|nvg|Nvg|NVG|crosshair|deathScreen|cine|Cine|CINE|opening|title|Title|callsign|badge|perf|showPerf|dev|Dev|DEV|console)/],
  ['game', /^(session|Session|match|Match|phase|Phase|prep|Prep|PREP|day$|day[A-Z]|bank|Bank|cash|Cash|CASH|skull|Skull|SKULL|economy|price|cost|reward|objective|Objective|save|Save|load|Load|stats|Stats|score|streak|Streak|gameStarted|gameOver|won|gameMode|endGame|resetGame|startGame|player|Player|PLAYER|marine|Marine|hp|Hp|HP|stance|crouch|sprint|roll|swim|climb|tower|Tower|mount|inventory|gear|Gear|perk|Perk)/],
  ['core', /^(scene|camera|renderer|render|Render|RENDER|post|bloom|composer|THREE|TSL|clock|tick|frame|Frame|loop|dt$|AudioSys|audio|Audio|AUDIO|sound|Sound|music|Music|MUSIC|listener|collide|collider|Collide|solid|Solid|worldSolids|segmentHits|raycast|ray|Ray|mulberry32|hash|noise|fbm|smoothstep|smoothBand|lerp|clamp|distPointToSeg|AXIS_|_v[0-9]|_tmp|pool|Pool|acquire|release|dispose|mergeParts|rbox|rmesh|addCast|boxProjectUV|CAMO|shot|Shot|applyShotView|setShotView|loadMark|urlParams|storage|localStorage)/]
];
// Suffix rules, tested separately: the alternatives above all sit inside an anchored group,
// so a pattern like /El$/ written in there would only ever match the name "El".
const SUFFIX = [
  ['ui', /(El|Els|Btn|Wrap|Fill|Bar|Card|View|Screen|Overlay|Panel|Label|Hud|Menu|Dialog|Row|Icon|Badge)$/],
  ['world', /(Mat|Geo|Geom|Tex|Texture)$/],   // shared materials and geometry live with the world kit
  ['core', /(Pool|Cache|Buf|Buffer)$/]
];
const areaOf = (name) => (AREAS.find(([, re]) => re.test(name))
  || SUFFIX.find(([, re]) => re.test(name))
  || ['unsorted'])[0];

// --- references -------------------------------------------------------------------
const decls = topLevelDecls();
const byName = new Map();
for (const d of decls) if (!byName.has(d.name)) byName.set(d.name, { ...d, area: areaOf(d.name), refs: 0, refAreas: new Map() });

// Count where each name is used, attributing the use to the area of the enclosing
// declaration (the nearest top-level declaration above that line).
const sorted = [...byName.values()].sort((a, b) => a.line - b.line);
function ownerAtLine(ln) {
  let lo = 0, hi = sorted.length - 1, best = null;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (sorted[mid].line <= ln) { best = sorted[mid]; lo = mid + 1; } else hi = mid - 1; }
  return best;
}
const idRe = /[A-Za-z_$][\w$]*/g;
for (let ln = 0; ln < lines.length; ln++) {
  const text = lines[ln].replace(/\/\/.*$/, '');
  let mm;
  while ((mm = idRe.exec(text))) {
    const hit = byName.get(mm[0]);
    if (!hit) continue;
    const from = ownerAtLine(ln + 1);
    if (!from || from.name === hit.name) continue;
    hit.refs++;
    hit.refAreas.set(from.area, (hit.refAreas.get(from.area) || 0) + 1);
  }
}

// --- pull the leftovers in by where they are used --------------------------------
// A name the patterns do not recognise is still placeable if almost everything that touches
// it lives in one area. Three passes, because each pass gives the next one more signal.
// Anything still unsorted after that genuinely needs a human call.
for (let pass = 0; pass < 3; pass++) {
  for (const d of byName.values()) {
    if (d.area !== 'unsorted') continue;
    const known = [...d.refAreas.entries()].filter(([a]) => a !== 'unsorted');
    const total = known.reduce((n, [, c]) => n + c, 0);
    if (total < 2) continue;
    const [top, n] = known.sort((x, y) => y[1] - x[1])[0];
    if (n / total >= 0.6) d.area = top;
  }
  // Re-attribute references now that more owners are known.
  for (const d of byName.values()) d.refAreas = new Map();
  for (let ln = 0; ln < lines.length; ln++) {
    const text = lines[ln].replace(/\/\/.*$/, '');
    let mm2;
    const re = /[A-Za-z_$][\w$]*/g;
    while ((mm2 = re.exec(text))) {
      const hit = byName.get(mm2[0]);
      if (!hit) continue;
      const from = ownerAtLine(ln + 1);
      if (!from || from.name === hit.name) continue;
      hit.refAreas.set(from.area, (hit.refAreas.get(from.area) || 0) + 1);
    }
  }
}

// --- report -----------------------------------------------------------------------
const areaNames = ['core', 'world', 'life', 'combat', 'ui', 'game', 'unsorted'];
const totals = new Map(areaNames.map((a) => [a, { decls: 0, lines: 0 }]));
for (let i = 0; i < sorted.length; i++) {
  const d = sorted[i];
  const span = (sorted[i + 1] ? sorted[i + 1].line : lines.length) - d.line;
  const t = totals.get(d.area) || totals.get('unsorted');
  t.decls++; t.lines += Math.max(0, span);
}

console.log(`index.html module script: ${lines.length} lines, ${decls.length} top-level declarations`);
console.log(`(script starts at index.html line ${scriptStartLine})\n`);
console.log('area      decls   ~lines   share');
for (const a of areaNames) {
  const t = totals.get(a);
  if (!t.decls) continue;
  console.log(`${a.padEnd(9)} ${String(t.decls).padStart(5)} ${String(t.lines).padStart(8)}   ${(100 * t.lines / lines.length).toFixed(1)}%`);
}

// Names used from another area: these are the contracts.
const crossing = [...byName.values()]
  .filter((d) => [...d.refAreas.keys()].some((a) => a !== d.area))
  .map((d) => ({
    name: d.name, area: d.area, kind: d.kind, line: d.line,
    from: [...d.refAreas.entries()].filter(([a]) => a !== d.area).sort((x, y) => y[1] - x[1])
  }))
  .sort((a, b) => b.from.reduce((n, [, c]) => n + c, 0) - a.from.reduce((n, [, c]) => n + c, 0));

console.log(`\n${crossing.length} names are used outside the area that declares them.`);
console.log('These become the exports in docs/contracts.md. The 25 busiest:\n');
for (const c of crossing.slice(0, 25)) {
  const tot = c.from.reduce((n, [, k]) => n + k, 0);
  console.log(`  ${c.name.padEnd(26)} ${c.area.padEnd(8)} ${String(tot).padStart(5)} uses from ${c.from.map(([a, n]) => a + ':' + n).join(' ')}`);
}

// --- sections ---------------------------------------------------------------------
// The identifier classifier above is useful for finding the seams, but it cannot carve the
// file: most of the bulk sits in long stretches whose own owner is unknown, so the leftovers
// dominate. The file itself is a better guide — it is banner-commented throughout
// ("// === Tree kit ===", "// --- Rocks ---") — and a banner with a line range is exactly what
// "move this code into that module" needs. This is the table to assign owners in.
if (argv_index('--sections') >= 0) {
  const banners = [];
  for (let i = 0; i < lines.length; i++) {
    const mm3 = /^\s*\/\/\s*(={2,}|-{2,})\s*(.+?)\s*(?:={2,}|-{2,})?\s*$/.exec(lines[i]);
    if (mm3 && mm3[2].length > 2 && !/^[-=]+$/.test(mm3[2])) {
      banners.push({ line: i + 1, level: mm3[1][0] === '=' ? 1 : 2, title: mm3[2].replace(/[-=]+$/, '').trim() });
    }
  }
  console.log(`\n${banners.length} section banners in the module script\n`);
  console.log('lines    size   lvl  section');
  let big = 0;
  for (let i = 0; i < banners.length; i++) {
    const b = banners[i];
    const end = banners[i + 1] ? banners[i + 1].line : lines.length;
    const size = end - b.line;
    if (size >= 40) big++;
    console.log(`${String(b.line).padStart(6)} ${String(size).padStart(6)}   ${b.level === 1 ? '=' : '-'}   ${b.title.slice(0, 80)}`);
  }
  console.log(`\n${big} sections are 40+ lines; those are the ones worth moving as units.`);
  process.exit(0);
}

const edgeIdx = argv_index('--edges');
if (edgeIdx >= 0) {
  const area = process.argv[edgeIdx + 1];
  console.log(`\n--- names ${area} exposes to other areas ---`);
  for (const c of crossing.filter((c) => c.area === area)) {
    console.log(`  ${c.name.padEnd(28)} ${c.from.map(([a, n]) => a + ':' + n).join(' ')}`);
  }
  const needs = crossing.filter((c) => c.from.some(([a]) => a === area) && c.area !== area);
  console.log(`\n--- names ${area} needs from elsewhere (${needs.length}) ---`);
  for (const c of needs) console.log(`  ${c.name.padEnd(28)} from ${c.area}`);
}

const jsonIdx = argv_index('--json');
if (jsonIdx >= 0) {
  const out = process.argv[jsonIdx + 1] || 'inventory.json';
  fs.writeFileSync(out, JSON.stringify({
    lines: lines.length, scriptStartLine,
    areas: Object.fromEntries([...totals]),
    decls: sorted.map((d) => ({ name: d.name, kind: d.kind, line: d.line, area: d.area, refs: d.refs })),
    crossing
  }, null, 1));
  console.log(`\nwrote ${out}`);
}

const unsorted = sorted.filter((d) => d.area === 'unsorted');
if (unsorted.length) {
  console.log(`\n${unsorted.length} declarations did not match any area and need a call before the split.`);
  console.log('first 30: ' + unsorted.slice(0, 30).map((d) => d.name).join(' '));
}

function argv_index(flag) { return process.argv.indexOf(flag); }
