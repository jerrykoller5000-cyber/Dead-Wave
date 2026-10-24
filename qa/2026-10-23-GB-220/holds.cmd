@echo off
set A=--agent grokbot --task GB-220
set O=qa\2026-10-23-GB-220\%1
node tools/camera.mjs start --match %A%
node tools/camera.mjs eval %A% "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); return 'ok'"
for %%W in (launcher flamer m4 pistol chainsaw revolver) do (
  node tools/camera.mjs eval %A% "for (let i = 0; i < 16 && T.getCurrentWeapon() !== '%%W'; i++) T.setWeapon(i); await new Promise(r=>setTimeout(r,2500)); return T.getCurrentWeapon()"
  node tools/camera.mjs shot player %A% --yaw 60 --pitch 10 --zoom 4 --out %O%\hold-%%W-left.png
  node tools/camera.mjs shot player %A% --yaw -40 --pitch 25 --zoom 4 --out %O%\hold-%%W-right.png
)
node tools/camera.mjs stop %A%
