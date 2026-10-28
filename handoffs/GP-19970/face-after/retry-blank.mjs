import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../../..');
const shots = [];
for (const name of ['job.json', 'overcast-job.json']) {
  const job = JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
  shots.push(...job.shots);
}
const retry = shots.filter((shot) => {
  try { return fs.statSync(path.join(root, shot.out)).size < 15000; }
  catch { return false; }
});
fs.writeFileSync(new URL('retry-job.json', import.meta.url), JSON.stringify({ shots: retry }, null, 2) + '\n');
console.log(`Retry ${retry.length} blank captures`);
