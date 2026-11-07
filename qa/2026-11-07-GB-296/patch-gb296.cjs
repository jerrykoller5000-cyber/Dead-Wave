const fs = require('fs');
const path = require('path');
const ROOT = process.argv[2] || process.cwd();

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function write(rel, t) { fs.writeFileSync(path.join(ROOT, rel), t); console.log('wrote', rel); }

// 1) viewmodel.js
{
  let t = read('game/viewmodel.js');
  const old = "if (gun.stock) gun.stock.visible = gun.key !== 'launcher' && (st.ads || 0) < 0.35;";
  const neu = [
    "// GB-296 (J9): hide the stock as soon as ADS starts (was 0.35), so it never sweeps into the",
    "    // sight picture on the way up. Launcher stock stays off always (GP-20037).",
    "    if (gun.stock) gun.stock.visible = gun.key !== 'launcher' && (st.ads || 0) < 0.08;",
  ].join('\n');
  if (!t.includes(old)) { console.error('viewmodel stock line missing'); process.exit(1); }
  t = t.replace(old, neu);
  write('game/viewmodel.js', t);
}

// 2) tcl281.js
{
  let t = read('tools/tests/tcl281.js');
  const count = (t.match(/adsNow < 0\.35/g) || []).length;
  if (count !== 2) { console.error('expected 2 hip threshold sites, got', count); process.exit(1); }
  t = t.replace(/adsNow < 0\.35/g, 'adsNow < 0.08');

  const s2needle = "ok(eA2 < 0.01 && eB2 < 0.01, label + ': down the sights the wrists are on their sockets (' + (eA2 * 100).toFixed(2) + ', ' + (eB2 * 100).toFixed(2) + ' cm)');\n      T.setZoomHeldDbg(false);";
  const s2add = [
    "ok(eA2 < 0.01 && eB2 < 0.01, label + ': down the sights the wrists are on their sockets (' + (eA2 * 100).toFixed(2) + ', ' + (eB2 * 100).toFixed(2) + ' cm)');",
    "      if (key !== 'uzi') {",
    "        // GB-296 (J9): no stock in frame in ADS",
    "        let adsStock = null;",
    "        if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') adsStock = o; });",
    "        ok(!!adsStock && adsStock.visible === false, label + ': down the sights the stock is put away (shown ' + !!(adsStock && adsStock.visible) + ')');",
    "      }",
    "      T.setZoomHeldDbg(false);",
  ].join('\n');
  if (!t.includes(s2needle)) { console.error('stage2 ADS insert site missing'); process.exit(1); }
  t = t.replace(s2needle, s2add);

  const s3needle = "      }\n      T.setZoomHeldDbg(false);\n      await until(() => (T.fpDbg().ads || 0) < 0.05, 9000);";
  const s3add = [
    "      }",
    "      if (stock) {",
    "        // GB-296 (J9): no stock in frame in ADS (sniper view gun is already hidden at full ADS)",
    "        let adsStock = null;",
    "        if (vm.gun && vm.gun.root) vm.gun.root.traverse((o) => { if (o.name === 'fp-stock') adsStock = o; });",
    "        ok(!!adsStock && (key === 'sniper' || adsStock.visible === false), label + ': down the sights the stock is put away (shown ' + !!(adsStock && adsStock.visible) + ')');",
    "      }",
    "      T.setZoomHeldDbg(false);",
    "      await until(() => (T.fpDbg().ads || 0) < 0.05, 9000);",
  ].join('\n');
  if (!t.includes(s3needle)) { console.error('stage3 ADS insert site missing'); process.exit(1); }
  t = t.replace(s3needle, s3add);

  write('tools/tests/tcl281.js', t);
}

// 3) shotgun wrist into fpStock
{
  let t = read('studio/weapon-longarms.js');
  const needle = "K.slab(gunBand([[-0.251, -0.044], [-0.204, -0.017], [-0.167, -0.019], [-0.105, -0.062]], 0.02), 0.07, gunPoly, { bevel: 0.008, segs: 3 });";
  const neu = "K.slab(gunBand([[-0.251, -0.044], [-0.204, -0.017], [-0.167, -0.019], [-0.105, -0.062]], 0.02), 0.07, gunPoly, { bevel: 0.008, segs: 3, parent: stock });   // GB-296: stock wrist with fp-stock";
  if (!t.includes(needle)) { console.error('shotgun wrist band missing'); process.exit(1); }
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const n = (t.match(re) || []).length;
  if (n !== 1) { console.error('shotgun wrist band not unique', n); process.exit(1); }
  t = t.replace(needle, neu);
  write('studio/weapon-longarms.js', t);
}

console.log('OK');
