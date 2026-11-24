import fs from 'node:fs';

const CONT = '\u0080-\u00BF\u0152\u0153\u0160\u0161\u0178\u017D\u017E\u0192\u02C6\u02DC\u2013\u2014\u2018-\u201E\u2020-\u2022\u2026\u2030\u2039\u203A\u20AC\u2122';
const MOJI = new RegExp('[\u00C2-\u00DF][' + CONT + ']|[\u00E0-\u00EF][' + CONT + ']{2}', 'g');

const files = [
  'world/training-textures.js',
  'world/training-textures.test.mjs',
  'world/training.js',
  'world/training-firing-line.js',
  'world/training-wear.js',
  'world/training-build-wear.js',
  'world/training-props.js',
  'world/training-tunnel.js',
  'world/training-dummy.js',
  'world/training-emergency.js',
  'game/training-ceiling.js',
  'game/training-perimeter.js',
  'game/training-infirmary-fence.js',
  'game/training-containment.js',
  'ui/cif-exterior.js',
  'ui/range-control-model.js',
  'ui/range-monitor.js',
  'index.html',
];

let badTotal = 0;
for (const f of files) {
  const buf = fs.readFileSync(f);
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    console.error(`FAIL BOM in ${f}`);
    badTotal++;
  }
  const text = buf.toString('utf8');
  const hits = [...text.matchAll(MOJI)];
  if (hits.length) {
    console.error(`FAIL MOJI in ${f}: ${hits.length} hits (first: ${JSON.stringify(text.slice(Math.max(0, hits[0].index - 12), hits[0].index + 12))})`);
    badTotal += hits.length;
  }
}
console.log(badTotal === 0 ? `PASS UTF-8 / no BOM / no mojibake across all ${files.length} files` : `FAIL ${badTotal} issues`);
process.exit(badTotal === 0 ? 0 : 1);
