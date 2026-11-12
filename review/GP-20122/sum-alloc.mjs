import fs from 'node:fs';
for (const label of process.argv.slice(2)) {
  const data = JSON.parse(fs.readFileSync(new URL(`./${label}.json`, import.meta.url), 'utf8'));
  const byFile = new Map();
  function walk(node) {
    const url = node.callFrame?.url || '';
    const file = url ? new URL(url).pathname.replace(/^\//, '') : '(native)';
    byFile.set(file, (byFile.get(file) || 0) + (node.selfSize || 0));
    for (const child of node.children || []) walk(child);
  }
  walk(data.profile.head);
  console.log(label, data.frames.frames, data.totalSampledMB, [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([file, bytes]) => `${file}: ${(bytes / 1e6).toFixed(1)} MB`).join(' | '));
}
