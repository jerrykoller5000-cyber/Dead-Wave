param($L,$kind,$n,$shots)
$q="qa/2026-10-27-GB-233-r7"; $o="$q/pass2-$L"; New-Item -ItemType Directory -Force $o | Out-Null
"window.__r7layout='$L';`n" + (Get-Content "$q/p2setup.js" -Raw) | Set-Content -Encoding ascii "$o/setup.js"
node "$q/job.cjs" "p2s$L$(Get-Random)" "$o/setup.js" | Out-File "$o/setup.txt"
Set-Content -Encoding ascii "$o/spawn.js" "const D=T.trainingDbg;const r=D.spawn('$kind',$n);const t0=Date.now();while(D.alive()===0&&Date.now()-t0<60000)await new Promise(r=>setTimeout(r,200));return {r,a:D.alive(),ms:Date.now()-t0};"
node "$q/job.cjs" "p2z$L$(Get-Random)" "$o/spawn.js" | Out-File "$o/spawn.txt"
Set-Content -Encoding ascii "$o/state.js" "return {a:T.trainingDbg.alive(),zs:T.zombies.filter(z=>z.alive).map(z=>[z.typeKey,Math.round(z.hp),+z.mesh.position.z.toFixed(1)])};"
for($i=1;$i -le $shots;$i++){ node tools/camera.mjs shot --agent grokbot --task GB-233 --cam "-25,-196.3,-644" --look "-25,-199.3,-623" --fov 45 --caption "r7 $L $kind $i" --out "$o/f$('{0:d2}' -f $i).png" 2>&1 | Out-Null; if($i % 4 -eq 0){ node "$q/job.cjs" "p2st$L$i$(Get-Random)" "$o/state.js" | Out-File -Append "$o/state.txt" } ; Start-Sleep -Milliseconds 500 }
