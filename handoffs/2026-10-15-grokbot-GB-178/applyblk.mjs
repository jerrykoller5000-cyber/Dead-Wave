// GB-178: exact contiguous-block replacements (each must match once), re-read before write; keeps EOL, no BOM.
import fs from 'node:fs';
const spec = JSON.parse(fs.readFileSync(new URL(process.argv[2], import.meta.url), 'utf8'));
const by = {}; for (const s of spec) (by[s.file] ||= []).push(s);
for (const [file, list] of Object.entries(by)) {
  const before = fs.readFileSync(file, 'utf8'); if (before.charCodeAt(0) === 0xfeff) throw new Error('BOM ' + file);
  const crlf = before.split('\r\n').length - 1, eol = crlf * 2 > before.split('\n').length - 1 ? '\r\n' : '\n'; const lines = before.split(eol);
  for (const s of list) {
    const hits = []; for (let i = 0; i + s.oldBlock.length <= lines.length; i++) if (s.oldBlock.every((l, k) => lines[i + k] === l)) hits.push(i);
    if (hits.length !== 1) { console.error(file, 'block x' + hits.length, s.oldBlock[0].slice(0, 80)); process.exit(1); }
    lines.splice(hits[0], s.oldBlock.length, ...s.new);
  }
  if (fs.readFileSync(file, 'utf8') !== before) { console.error(file, 'changed under us'); process.exit(1); }
  fs.writeFileSync(file, lines.join(eol), 'utf8'); console.log('patched', file);
}
