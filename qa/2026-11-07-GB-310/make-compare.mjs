// Side-by-side before|after PNGs
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ps = `
Add-Type -AssemblyName System.Drawing
$views = @('side','top','tq','blade','grip')
$whichs = @('knife','machete')
$here = '${HERE.replace(/\\/g, '\\\\')}'
foreach ($w in $whichs) {
  foreach ($v in $views) {
    $a = [System.Drawing.Image]::FromFile((Join-Path $here "before\\$w-$v.png"))
    $b = [System.Drawing.Image]::FromFile((Join-Path $here "after\\$w-$v.png"))
    $ww = $a.Width + $b.Width; $h = [Math]::Max($a.Height, $b.Height)
    $bmp = New-Object System.Drawing.Bitmap $ww, $h
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(18,20,24))
    $g.DrawImage($a, 0, 0)
    $g.DrawImage($b, $a.Width, 0)
    $g.Dispose(); $a.Dispose(); $b.Dispose()
    $out = Join-Path $here "compare\\$w-$v.png"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "compare $w $v"
  }
}
`
const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
process.exit(r.status == null ? 1 : r.status);
