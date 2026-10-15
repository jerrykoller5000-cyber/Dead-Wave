# GB-177: everything that needs the game, in one granted slot: one instance, --jobs 1, then stop and release.
$ErrorActionPreference = 'Continue'; Set-Location "C:\Users\Zero\Desktop\Tiny Trek"; $o = 'review/gb176'; $h = 'handoffs/2026-10-15-grokbot-GB-177'
New-Item -ItemType Directory -Force "$o/after" | Out-Null
"start $(Get-Date -Format o)" | Set-Content "$o/slot.log"
node $h/gen.mjs *>> "$o/slot.log"
node tools/camera.mjs start --inspect *>> "$o/slot.log"
node tools/camera.mjs batch "$o/shots.json" --out "$o/after/" --sheet *>> "$o/slot.log"
node tools/camera.mjs reload --match *>> "$o/slot.log"
node tools/camera.mjs eval (Get-Content "$h/diag218.js" -Raw) *> "$o/diag218.txt"
node tools/camera.mjs eval (Get-Content "$h/hands.js" -Raw) *> "$o/hands.txt"
node tools/camera.mjs stop *>> "$o/slot.log"
foreach ($t in 't185','t215','t218','t221','t224','t229','t240','t242','t252') {
  node tools/tests/run-all.mjs $t --no-retry --all-fails --jobs 1 2>&1 | Select-String '^(ok|FAIL)\s|FAIL |PASS extended|where|at u ' | ForEach-Object { $_.Line } | Add-Content "$o/tests.txt"
}
"end $(Get-Date -Format o)" | Add-Content "$o/slot.log"
