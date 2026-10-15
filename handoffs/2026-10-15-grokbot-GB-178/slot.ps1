# GB-178: grip shots (M4/AK/shotgun) + t215 t218 t242, one instance, --jobs 1. Run only under game-test-slot.mjs.
$ErrorActionPreference = 'Continue'; Set-Location "C:\Users\Zero\Desktop\Tiny Trek"; $o = 'review/gb178'; $h = 'handoffs/2026-10-15-grokbot-GB-178'
New-Item -ItemType Directory -Force $o | Out-Null
"start $(Get-Date -Format o)" | Set-Content "$o/slot.log"
node tools/camera.mjs start --inspect *>> "$o/slot.log"
node tools/camera.mjs batch "$h/shots.json" --out "$o/" --sheet *>> "$o/slot.log"
node tools/camera.mjs stop *>> "$o/slot.log"
foreach ($t in 't215','t218','t242') {
  "== $t" | Add-Content "$o/tests.txt"
  node tools/tests/run-all.mjs $t --no-retry --all-fails --jobs 1 *>> "$o/tests.txt"
}
"end $(Get-Date -Format o)" | Add-Content "$o/slot.log"
