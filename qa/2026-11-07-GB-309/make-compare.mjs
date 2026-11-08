// Side-by-side before|after PNGs using pure Node (no deps): read IHDR, blit raw via child PowerShell System.Drawing
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const views = ['side', 'top', 'tq', 'recv', 'grip'];
const ps = `
Add-Type -AssemblyName System.Drawing
$views = @('side','top','tq','recv','grip')
$here = '${HERE.replace(/\\/g, '\\\\')}'
foreach ($v in $views) {
  $a = [System.Drawing.Image]::FromFile((Join-Path $here "before\\studio-$v.png"))
  $b = [System.Drawing.Image]::FromFile((Join-Path $here "after\\studio-$v.png"))
  $w = $a.Width + $b.Width; $h = [Math]::Max($a.Height, $b.Height)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(18,20,24))
  $g.DrawImage($a, 0, 0)
  $g.DrawImage($b, $a.Width, 0)
  $g.Dispose(); $a.Dispose(); $b.Dispose()
  $out = Join-Path $here "compare\\$v.png"
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "compare $v"
}
`
const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status == null ? 1 : r.status);