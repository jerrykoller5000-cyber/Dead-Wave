// GB-155 (Grokbot): Dead-Wave -> Grave Shift in display and doc text. One read-modify-write per file:
// read bytes, check they round-trip as UTF-8 (else skip), mask the protected identifiers, replace, compare the
// expected count, re-read the file and check it is byte-identical to what was read, then write.
//   node rename.cjs            dry run (counts)
//   node rename.cjs --write    write
//   node rename.cjs --write --only <file>
const fs = require('fs');
const WRITE = process.argv.includes('--write');
const FORMS = [['DEAD-WAVE', 'GRAVE SHIFT'], ['DEAD WAVE', 'GRAVE SHIFT'], ['Dead-Wave', 'Grave Shift'], ['Dead Wave', 'Grave Shift']];
// identifiers that keep the old name: file names, the repo, the desktop profile folder, build paths, history
const PROTECT = ['Play Dead-Wave.bat', 'dead-wave-key-art', 'cyber/Dead-Wave', 'Documents\\Dead-Wave', 'join("Dead-Wave")', 'dist/dead-wave', 'dead-wave.exe', 'the Dead-Wave/prep panel'];
// file: { all: replace every form (minus PROTECT), pairs: exact extra [old, new], n: expected total }
const PLAN = {
  'index.html': { all: true, pairs: [['<div class="dw-wordmark">Dead <span>Wave</span></div>', '<div class="dw-wordmark">Grave <span>Shift</span></div>']], n: 40 },
  'ui/strings.js': { all: true, pairs: [['"menu.titleFirst": "Dead",', '"menu.titleFirst": "Grave",'], ['"menu.titleSecond": "Wave",', '"menu.titleSecond": "Shift",']], n: 7 },
  'core/loader.js': { all: true, n: 3 },
  'README.md': { all: true, n: 2 },
  'AGENTS.md': { all: true, n: 1 },
  'crew/BOARD.md': { pairs: [['# Dead-Wave crew board', '# Grave Shift crew board']], n: 1 },
  'crew/crew.mjs': { all: true, n: 2 },
  'crew/panel.html': { all: true, n: 2 },
  'crew/PROMPTS.md': { all: true, n: 7 },
  'crew/Open Crew Panel.bat': { all: true, n: 3 },
  'Open Motion Lab.bat': { all: true, n: 1 },
  'Play Dead-Wave.bat': { all: true, n: 2 },
  'package.json': { pairs: [['"name": "dead-wave",', '"name": "grave-shift",'], ['"description": "Dead-Wave', '"description": "Grave Shift']], n: 2 },
  'desktop/README.md': { all: true, pairs: [['nsis/Dead-Wave_<version>_x64-setup.exe', 'nsis/Grave Shift_<version>_x64-setup.exe']], n: 2 },
  'desktop/src-tauri/boot/index.html': { all: true, n: 2 },
  'desktop/src-tauri/Cargo.toml': { pairs: [['description = "Dead-Wave"', 'description = "Grave Shift"'], ['authors = ["Dead-Wave crew"]', 'authors = ["Grave Shift crew"]']], n: 2 },
  'desktop/src-tauri/tauri.conf.json': { pairs: [['"productName": "Dead-Wave",', '"productName": "Grave Shift",']], n: 1 },
  'desktop/src-tauri/src/main.rs': { all: true, n: 3 },
  'docs/audio/cue-sheet.md': { all: true, n: 1 }, 'docs/decisions.md': { all: true, n: 1 }, 'docs/plan.md': { all: true, n: 1 },
  'docs/roadmap.md': { all: true, n: 1 }, 'docs/specs/ui-phase1.md': { all: true, n: 1 }, 'docs/graphics-and-rendering.md': { all: true, n: 1 },
  'qa/README.md': { all: true, n: 1 },
  'studio/motion-lab.html': { all: true, n: 1 },
  'tools/blank.html': { pairs: [['<title>dead-wave tools</title>', '<title>grave-shift tools</title>']], n: 1 },
  'tools/serve.py': { pairs: [["print('Dead-Wave on http", "print('Grave Shift on http"]], n: 1 },
  ...Object.fromEntries(['calm', 'chip', 'compose', 'day1', 'fog', 'heart', 'hordes', 'nights', 'stingers'].map((k) => ['tools/' + k + '.py', { all: true, n: 1 }])),
  'ui/player-fidelity.browser.mjs': { all: true, n: 1 }, 'ui/zombie-concepts.browser.mjs': { all: true, n: 1 }, 'ui/zombie-fidelity.browser.mjs': { all: true, n: 2 },
};
// review galleries: titles/eyebrows in the generators and the pages they made (not the before/baseline snapshots or logs)
for (const f of ['armory/display/build-gallery.cjs', 'armory/display/index.html', 'armory/height/index.html', 'armory/mesh/build-gallery.cjs', 'armory/mesh/index.html',
  'coldwater/gallery.mjs', 'coldwater/index.html', 'coldwater/layout/build-gallery.cjs', 'coldwater/layout/index.html', 'cordon/gallery.mjs', 'cordon/index.html', 'dock/gallery.mjs', 'dock/index.html',
  'equipment-night/index.html', 'hikers/gallery.mjs', 'hikers/index.html', 'hikers/v2/gallery.mjs', 'hikers/v2/index.html', 'marine-base/anatomy/build-gallery.cjs', 'marine-base/index.html',
  'marine-base/shoulders/build-gallery.cjs', 'marine-base/shoulders/index.html', 'marine-gear/index.html', 'marine-reference/build-gallery.cjs', 'marine-reference/index.html',
  'medical-wreck/gallery.mjs', 'medical-wreck/index.html', 'mine/arch/gallery.mjs', 'mine/arch/index.html', 'mine/gallery.mjs', 'mine/index.html', 'ranger-camp/index.html', 'relay/gallery.mjs', 'relay/index.html',
  'survivor-fit/build-gallery.cjs', 'survivor-fit/index.html', 'tower/gallery.mjs', 'tower/index.html', 'tower/sightline/gallery.mjs', 'tower/sightline/index.html', 'trapper/gallery.mjs', 'trapper/index.html',
  'weapon-fidelity/build-gallery.cjs', 'weapon-fidelity/index.html', 'world-story/build-review.mjs', 'zombie-audio/render.mjs', 'zombie-audio/index.html']) PLAN['review/' + f] = { all: true, n: null };
const count = (s, a) => s.split(a).length - 1;
let total = 0, bad = 0;
const oi = process.argv.indexOf('--only'), ONLY = oi >= 0 ? process.argv[oi + 1] : null;   // re-run one file (the rest are done)
for (const [file, p] of Object.entries(PLAN)) {
  if (ONLY && file !== ONLY) continue;
  let buf;
  try { buf = fs.readFileSync(file); } catch { console.log('MISSING ' + file); bad++; continue; }
  let s = buf.toString('utf8');
  if (!Buffer.from(s, 'utf8').equals(buf)) { console.log('NOT UTF-8, skipped ' + file); bad++; continue; }
  let n = 0;
  for (const [a, b] of p.pairs || []) { const c = count(s, a); if (c !== 1) { console.log(`PAIR x${c} in ${file}: ${a}`); bad++; } n += c; s = s.split(a).join(b); }
  if (p.all) {
    const keep = [];
    for (const t of PROTECT) s = s.split(t).join('\u0000' + (keep.push(t) - 1) + '\u0000');
    for (const [a, b] of FORMS) { n += count(s, a); s = s.split(a).join(b); }
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
  }
  if (p.n != null && n !== p.n) { console.log(`COUNT ${file}: ${n} (expected ${p.n})`); bad++; continue; }
  total += n;
  if (WRITE && n) {
    const now = fs.readFileSync(file);
    if (!now.equals(buf)) { console.log('CHANGED UNDER US, skipped ' + file); bad++; continue; }
    fs.writeFileSync(file, Buffer.from(s, 'utf8'));
  }
  console.log(`${String(n).padStart(3)}  ${file}`);
}
console.log(`${WRITE ? 'wrote' : 'dry run'}: ${total} replacements, ${bad} problem(s)`);
