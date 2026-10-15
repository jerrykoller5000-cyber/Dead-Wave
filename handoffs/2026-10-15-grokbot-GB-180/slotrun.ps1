# GB-180: shots with a blank-frame check and up to 3 retries, then optional tests. One instance, --jobs 1.
param([string]$Out, [string]$Shots, [string]$Tests = '')
$ErrorActionPreference = 'Continue'; Set-Location "C:\Users\Zero\Desktop\Tiny Trek"; $o = "review/$Out"
New-Item -ItemType Directory -Force $o | Out-Null
Add-Type -AssemblyName System.Drawing
function IsBlank($p) {
  if (-not (Test-Path $p)) { return $true }
  try { $b = [System.Drawing.Bitmap]::FromFile((Resolve-Path $p)); $mx = 0
    for ($x = 5; $x -lt $b.Width; $x += [int]($b.Width / 12)) { for ($y = 5; $y -lt $b.Height; $y += [int]($b.Height / 9)) { $c = $b.GetPixel($x, $y); $mx = [Math]::Max($mx, $c.R + $c.G + $c.B) } }
    $b.Dispose(); return ($mx -lt 12) } catch { return $true }
}
"start $(Get-Date -Format o)" | Set-Content "$o/slot.log"
node tools/camera.mjs start --inspect *>> "$o/slot.log"
$list = Get-Content $Shots -Raw | ConvertFrom-Json
$todo = @($list)
for ($try = 0; $try -lt 4 -and $todo.Count; $try++) {
  if ($try) { foreach ($s in $todo) { $s.settle = 1500 + 1500 * $try }; Start-Sleep 2 }
  $f = "$o/retry$try.json"; [IO.File]::WriteAllText("$PWD/$f", (ConvertTo-Json @($todo) -Depth 6), (New-Object Text.UTF8Encoding $false))
  node tools/camera.mjs batch $f --out "$o/" *>> "$o/slot.log"
  $todo = @($todo | Where-Object { IsBlank $_.out })
  "try $try : blank left $($todo.Count)" | Add-Content "$o/slot.log"
}
"blank after retries: $(@($todo | % out) -join ', ')" | Add-Content "$o/slot.log"
node tools/camera.mjs stop *>> "$o/slot.log"
for ($i = 0; $i -lt 90; $i++) { if (-not (Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'remote-debugging-port' })) { break }; Start-Sleep 1 }
Start-Sleep 3
foreach ($t in ($Tests -split ',' | Where-Object { $_ })) {
  "== $t $(Get-Date -Format o)" | Add-Content "$o/tests.txt"
  node tools/tests/run-all.mjs $t --no-retry --all-fails --jobs 1 2>&1 | Out-File -Append -Encoding utf8 "$o/tests.txt"
  for ($i = 0; $i -lt 60; $i++) { if (-not (Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'remote-debugging-port' })) { break }; Start-Sleep 1 }
}
"end $(Get-Date -Format o)" | Add-Content "$o/slot.log"
