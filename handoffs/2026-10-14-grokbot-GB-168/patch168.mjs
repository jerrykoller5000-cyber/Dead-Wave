// GB-168: training camo gate hooks in index.html (CRLF, unchanged-file check).
import fs from 'node:fs';
const f = 'index.html', before = fs.readFileSync(f, 'utf8'); let s = before;
const once = (a, b) => { a = a.replace(/\n/g, '\r\n'); b = b.replace(/\n/g, '\r\n'); const n = s.split(a).length - 1; if (n !== 1) throw Error('anchor x' + n + ': ' + a.slice(0, 90)); s = s.replace(a, b); };
if (s.includes('trainingCamoGate')) { console.log('already patched'); process.exit(0); }
once("import { FREE_CAMOS, createUnlocks, UNLOCKS_KEY, camoUnlockHint, camoUnlockToast } from './ui/unlocks.js';",
  "import { FREE_CAMOS, createUnlocks, UNLOCKS_KEY, camoUnlockHint, camoUnlockToast } from './ui/unlocks.js';\n    import { trainingCamoGate } from './ui/training-camo.js';   // GB-168: every camo open at the CIF in training");
once("const camoUnlocks = createUnlocks({ load: () => localStorage.getItem(UNLOCKS_KEY), save: value => localStorage.setItem(UNLOCKS_KEY, value) });",
  "const camoUnlocks = trainingCamoGate(createUnlocks({ load: () => localStorage.getItem(UNLOCKS_KEY), save: value => localStorage.setItem(UNLOCKS_KEY, value) }), () => training.active);   // GB-168");
once("    function writeWardrobe() {\n      try {", "    function writeWardrobe() {\n      if (training.active) return;   // GB-168: training's dressing is not saved\n      try {");
once("      if (save) { try { localStorage.setItem(CAMO_STORE, key); }", "      if (save && !training.active) { try { localStorage.setItem(CAMO_STORE, key); }");
once("      if (!training.active) return;\n      clearTrainingHazards();",
  "      if (!training.active) return;\n      { let c = CAMO_DEFAULT; try { c = localStorage.getItem(CAMO_STORE) || CAMO_DEFAULT; } catch (_) {} setCamo(c, false); wardrobeState = readWardrobe(); dressWorld(); }   // GB-168: back to his saved kit\n      clearTrainingHazards();");
if (fs.readFileSync(f, 'utf8') !== before) throw Error('changed under us');
fs.writeFileSync(f, s, 'utf8'); console.log('patched index.html');
