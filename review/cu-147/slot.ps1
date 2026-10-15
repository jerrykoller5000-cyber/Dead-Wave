$ErrorActionPreference = 'Stop'
Set-Location "C:\Users\Zero\Desktop\Tiny Trek"
node tools/tests/run-all.mjs t255 --no-retry --all-fails --jobs 1
$testExit = $LASTEXITCODE

$cameraStarted = $false
try {
  node tools/camera.mjs start --inspect --agent cursor --task CU-147
  if ($LASTEXITCODE -ne 0) { throw "camera start failed ($LASTEXITCODE)" }
  $cameraStarted = $true
  node tools/camera.mjs eval "await DWInspect.show('marine'); await DWInspect.marine.play('smoke', { loop: false }); await new Promise(r => setTimeout(r, 5200)); DWInspect.pause(); await DWInspect.stepAsync(1); return DWInspect.marine.state()"
  if ($LASTEXITCODE -ne 0) { throw "smoking move setup failed ($LASTEXITCODE)" }
  node tools/camera.mjs eval "const I=T.marineIdleDbg(),c=I.props.cig,M=c.parent.parent,w=M.userData.elbowRG.userData.wrist,h=w.userData.hand,P=n=>{const p=c.position.clone();h.point(n,p);p.sub(w.position);return w.localToWorld(p)},m=c.position.clone().fromArray(c.userData.mouth),p=P('indexTip').add(P('middleTip')).multiplyScalar(.5),a=P('palm'),l=c.position.clone().set(0,0,0),e=c.position.clone().set(0,0,c.children[2].position.z),f=c.position.clone().set(0,0,1).applyQuaternion(M.userData.headG.getWorldQuaternion(c.quaternion.clone()));c.localToWorld(l);c.localToWorld(e);const q={phase:I.state.phase,lit:I.state.lit,lipErrorCm:l.distanceTo(m)*100,emberDistanceCm:e.distanceTo(m)*100,emberForwardCm:e.clone().sub(m).dot(f)*100,pinchDistanceCm:p.distanceTo(m)*100,palmClearanceCm:a.distanceTo(m)*100};if(q.phase!=='smoking'||!q.lit||q.lipErrorCm>.4||q.emberForwardCm<5.5||q.pinchDistanceCm<1.2||q.pinchDistanceCm>3.5||q.palmClearanceCm<9)throw Error('bad smoking geometry '+JSON.stringify(q));return q"
  if ($LASTEXITCODE -ne 0) { throw "smoking geometry check failed ($LASTEXITCODE)" }
  node tools/camera.mjs shot marine --yaw 20 --pitch 5.7 --dist 0.72 --lookY 0.55 --out review/cu-147/after-head-close.png --caption "CU-147 smoking pose — head"
  if ($LASTEXITCODE -ne 0) { throw "head shot failed ($LASTEXITCODE)" }
  node tools/camera.mjs shot marine --yaw 31.5 --pitch 6.9 --dist 0.85 --lookY 0.38 --out review/cu-147/after-hands.png --caption "CU-147 smoking pose — hands"
  if ($LASTEXITCODE -ne 0) { throw "hands shot failed ($LASTEXITCODE)" }
} finally {
  if ($cameraStarted) { node tools/camera.mjs stop }
}
if ($testExit -ne 0) { throw "t255 failed ($testExit)" }
