# GB-180: weapon close-ups + t215 t218 t221 t242 t252. One instance, --jobs 1, no retries. Run only under game-test-slot.mjs after a grant.
$ErrorActionPreference = 'Continue'; Set-Location "C:\Users\Zero\Desktop\Tiny Trek"; $o = 'review/gb180b'; $h = 'handoffs/2026-10-15-grokbot-GB-180'
New-Item -ItemType Directory -Force $o | Out-Null
"start $(Get-Date -Format o)" | Set-Content "$o/slot.log"
node tools/camera.mjs start --inspect *>> "$o/slot.log"
node tools/camera.mjs batch "$h/shots180b.json" --out "$o/" --sheet *>> "$o/slot.log"
node tools/camera.mjs stop *>> "$o/slot.log"
# wait until the camera's browser has fully exited (debug-port Chrome/Edge), up to 90 s, before any test starts
for ($i = 0; $i -lt 90; $i++) {
  $left = Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'remote-debugging-port' }
  if (-not $left) { break }; Start-Sleep 1
}
"browser gone after $i s (left: $(@($left).Count))" | Add-Content "$o/slot.log"; Start-Sleep 3
foreach ($t in 't242','t218') {
  "== $t $(Get-Date -Format o)" | Add-Content "$o/tests.txt"
  node tools/tests/run-all.mjs $t --no-retry --all-fails --jobs 1 2>&1 | Out-File -Append -Encoding utf8 "$o/tests.txt"
  for ($i = 0; $i -lt 60; $i++) { if (-not (Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'remote-debugging-port' })) { break }; Start-Sleep 1 }
}
"end $(Get-Date -Format o)" | Add-Content "$o/slot.log"
