Add-Type -AssemblyName System.Drawing
$dir = Join-Path $PSScriptRoot 'walk-final'
$kinds = @('shambler','feral','brute','military','spitter','bomber','screamer','drowned','leaper','spider','colossus','demon','guardian','caveguard')
$status = Get-Content -LiteralPath (Join-Path $dir 'captures.json') -Encoding UTF8 | ConvertFrom-Json
if (@($status | Where-Object { -not $_.valid }).Count) { throw 'Blank captures remain' }
$sheet = [Drawing.Bitmap]::new(1680, 550)
$g = [Drawing.Graphics]::FromImage($sheet)
$font = [Drawing.Font]::new('Arial', 14)
$brush = [Drawing.Brushes]::White
try {
  foreach ($view in @('profile', 'gameplay', 'gameplay-overcast', 'gameplay-dusk', 'gameplay-night')) {
    $g.Clear([Drawing.Color]::FromArgb(22, 24, 27))
    for ($i = 0; $i -lt $kinds.Count; $i++) {
      $x = ($i % 7) * 240
      $y = [Math]::Floor($i / 7) * 275
      $g.DrawString($kinds[$i], $font, $brush, $x + 8, $y + 4)
      $p = Join-Path $dir ($kinds[$i] + '-walk-' + $view + '.png')
      $im = [Drawing.Bitmap]::FromFile($p)
      try { $g.DrawImage($im, [Drawing.Rectangle]::new($x, $y + 25, 240, 240)) }
      finally { $im.Dispose() }
    }
    $name = if ($view -eq 'profile') { 'sheet.jpg' } else { 'sheet-' + $view + '.jpg' }
    $sheet.Save((Join-Path $dir $name), [Drawing.Imaging.ImageFormat]::Jpeg)
  }
}
finally { $font.Dispose(); $g.Dispose(); $sheet.Dispose() }
