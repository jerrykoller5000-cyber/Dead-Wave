import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(HERE, 'compare');
fs.mkdirSync(out, { recursive: true });
const pairs = ['fp-aa12-hip','fp-aa12-ads','fp-uzi-hip','fp-uzi-ads','studio-uzi-grip'];
for (const p of pairs) {
  const a = path.join(HERE, 'before', p + '.png');
  const b = path.join(HERE, 'after', p + '.png');
  if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log('skip', p); continue; }
  // Prefer powershell .NET bitmap stitch
  const ps = `
Add-Type -AssemblyName System.Drawing
$left = [System.Drawing.Image]::FromFile('${a.replace(/\\/g,'/')}')
$right = [System.Drawing.Image]::FromFile('${b.replace(/\\/g,'/')}')
$bmp = New-Object System.Drawing.Bitmap (($left.Width + $right.Width), [Math]::Max($left.Height,$right.Height))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.DrawImage($left, 0, 0)
$g.DrawImage($right, $left.Width, 0)
$bmp.Save('${path.join(out, p + '.png').replace(/\\/g,'/')}')
$g.Dispose(); $bmp.Dispose(); $left.Dispose(); $right.Dispose()
Write-Host 'ok ${p}'
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  console.log(p, r.stdout.trim(), r.stderr && r.stderr.slice(0,200));
}